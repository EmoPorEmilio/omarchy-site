import {
  ACESFilmicToneMapping, AdditiveBlending, Box3, CanvasTexture, CatmullRomCurve3, Color,
  DirectionalLight, FogExp2, Group, HemisphereLight, Mesh, MeshBasicNodeMaterial,
  PCFShadowMap, PerspectiveCamera, PlaneGeometry, PointLight, RenderPipeline, Scene,
  SRGBColorSpace, Vector3, WebGPURenderer, type Object3D,
} from 'three/webgpu'
import { mix, mrt, normalView, output, pass, saturation, uniform, vec4 } from 'three/tsl'
import { bloom } from 'three/addons/tsl/display/BloomNode.js'
import { ao } from 'three/addons/tsl/display/GTAONode.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { EXPERIENCE_TIMING, ExperienceController, type ExperienceSnapshot, type WorldId } from './experience-controller'
import { markIntroSeen, readExperiencePreferences, rememberWorld } from './experience-preferences'
import { sampleWorldPresentation } from './world-presentation'
import { createQualityPolicy } from './quality-policy'
import { createVoxelBatch } from './voxel-batch'
import {
  createWorldMaterials, STRUCTURE_PALETTE, BEACON_PALETTE,
} from './world-materials'
import { createBleakWorldSources, createPortalSource, PORTAL_CENTER, WORLD_VOXEL_SIZE } from './world-layout'
import {
  createQuattroMaterials, createQuattroCarMaterials, QUATTRO_TERRAIN_PALETTE,
  QUATTRO_HORIZON_PALETTE, QUATTRO_CLOUD_PALETTE, QUATTRO_VEGETATION_PALETTE,
  QUATTRO_LANDMARK_PALETTE, QUATTRO_SIGNAL_PALETTE, QUATTRO_CAR_BODY_PALETTE,
  QUATTRO_CAR_GLASS_PALETTE, QUATTRO_CAR_TRIM_PALETTE, QUATTRO_CAR_TIRE_PALETTE,
  QUATTRO_CAR_LAMP_PALETTE,
} from './quattro-materials'
import { createQuattroWorldSources, getQuattroLandingCameraForViewport, QUATTRO_VOXEL_SIZE, QUATTRO_ROAD_SURFACE_Y } from './quattro-world'
import { createQuattroCarSources, QUATTRO_CAR_VOXEL_SIZE } from './quattro-car'
import { createPortalEffects } from './portal-effects'
import { createBeaconFloorEffects } from './beacon-effects'

export interface PortalProjection {
  /** Center and dimensions, normalized to the canvas host. */
  x: number
  y: number
  width: number
  height: number
  visible: boolean
}
interface MountWorldOptions {
  signal?: AbortSignal
  onStateChange?: (state: ExperienceSnapshot) => void
  onPortalProjectionChange?: (projection: PortalProjection) => void
}
type Pose = { position: Vector3; target: Vector3; fov: number }
const PORTAL = new Vector3(-5.3, 0.1, -11.5)
const smooth = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x) }
const v = (x: number, y: number, z: number) => new Vector3(x, y, z)
function blendPose(a: Pose, b: Pose, t: number): Pose {
  return { position: a.position.clone().lerp(b.position, t), target: a.target.clone().lerp(b.target, t), fov: a.fov + (b.fov - a.fov) * t }
}
function disposeObject(root: Object3D) {
  root.traverse((object) => {
    if (object instanceof Mesh) {
      object.geometry.dispose()
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose()
    }
  })
  root.removeFromParent()
}

/** A single clock owns the camera, threshold, car and page reveal in both directions. */
export async function mountStageOneWorld(host: HTMLDivElement, options: MountWorldOptions = {}) {
  options.signal?.throwIfAborted()
  const quality = createQualityPolicy(window.innerWidth)
  const query = new URLSearchParams(location.search)
  const forced = import.meta.env.DEV ? query.get('world') : null
  const forcedWorld: WorldId | undefined = forced === 'bleak' || forced === 'quattro' ? forced : undefined
  const capture = import.meta.env.DEV && query.get('capture') === '1'
  const hold = import.meta.env.DEV && query.has('progress') ? Number(query.get('progress')) : undefined
  const preferences = readExperiencePreferences()
  // Public visits always arrive settled. The long opening remains available
  // only as an explicit development preview; portal clicks own every journey.
  const playIntro = import.meta.env.DEV && query.get('intro') === 'play' && !forcedWorld && !quality.reducedMotion && !capture
  const controller = new ExperienceController(forcedWorld ?? (playIntro ? 'bleak' : preferences.world))
  let lastCommittedWorld = controller.state.committedWorld
  const scene = new Scene()
  const fog = new FogExp2('#050611', 0.006)
  scene.fog = fog
  const camera = new PerspectiveCamera(38, 1, 0.045, 160)
  const renderer = new WebGPURenderer({ alpha: true, antialias: true })
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(quality.dpr)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFShadowMap
  renderer.domElement.className = 'world-canvas'
  renderer.domElement.setAttribute('aria-hidden', 'true')
  let disposed = false
  let raf = 0
  let width = 1
  let height = 1
  let bufferWidth = 0
  let bufferHeight = 0
  let started = false
  let layout = { width: 1, height: 1, insetX: 0, insetTop: 0, insetBottom: 0, cinematic: false }
  let hostOffset = { x: 0, y: 0 }
  const hero = host.closest<HTMLElement>('.landing-hero')
  const landing = host.closest<HTMLElement>('.landing')
  const captureHost = host as HTMLDivElement & { captureWorldPng?: () => Promise<string> }
  let hovered = false
  let hoverEnergy = 0
  let lastTime = 0
  let onScreen = true
  let needsRender = true
  let needsGpuRender = true
  const batches: ReturnType<typeof createVoxelBatch>[] = []
  const worldMaterials = createWorldMaterials()
  const quattroMaterials = createQuattroMaterials(worldMaterials.surfaceTexture)
  const bleak = new Group()
  const bleakContent = new Group()
  bleak.rotation.y = -Math.PI / 2
  bleak.position.copy(PORTAL)
  bleakContent.position.set(-PORTAL_CENTER.x, -PORTAL_CENTER.y, -PORTAL_CENTER.z)
  bleak.add(bleakContent)
  scene.add(bleak)
  const quattro = new Group()
  const car = new Group()
  quattro.add(car)
  scene.add(quattro)
  const monument = new Group()
  const monumentContent = new Group()
  monument.rotation.y = -Math.PI / 2
  monument.position.copy(PORTAL)
  monumentContent.position.copy(bleakContent.position)
  monument.add(monumentContent)
  scene.add(monument)

  function batch(parent: Group, material: Parameters<typeof createVoxelBatch>[0]['material'], source: Parameters<typeof createVoxelBatch>[0]['source'], palette?: readonly string[], voxelSize = WORLD_VOXEL_SIZE) {
    const result = createVoxelBatch({ material, source, palette, voxelSize })
    result.mesh.castShadow = true
    result.mesh.receiveShadow = true
    parent.add(result.mesh)
    batches.push(result)
    return result
  }
  const bleakSources = createBleakWorldSources(0x0a4c4f59, quality.environmentDensity)
  batch(bleakContent, worldMaterials.structure, bleakSources.structure, STRUCTURE_PALETTE)
  batch(bleakContent, worldMaterials.beacons, bleakSources.beacons, BEACON_PALETTE)
  batch(bleakContent, worldMaterials.beaconHousings, bleakSources.beaconHousings)
  batch(monumentContent, worldMaterials.portal, createPortalSource())
  const portalEffects = createPortalEffects()
  monumentContent.add(portalEffects.group)
  const floorEffects = createBeaconFloorEffects()
  floorEffects.set('#9ece6a', 0.2)
  bleakContent.add(floorEffects.mesh)
  const qs = createQuattroWorldSources(0x51756174, quality.environmentDensity)
  batch(quattro, quattroMaterials.terrain, qs.terrain, QUATTRO_TERRAIN_PALETTE, QUATTRO_VOXEL_SIZE)
  batch(quattro, quattroMaterials.horizon, qs.horizon, QUATTRO_HORIZON_PALETTE, QUATTRO_VOXEL_SIZE)
  const clouds = batch(quattro, quattroMaterials.clouds, qs.clouds, QUATTRO_CLOUD_PALETTE, QUATTRO_VOXEL_SIZE)
  clouds.mesh.castShadow = false
  batch(quattro, quattroMaterials.vegetation, qs.vegetation, QUATTRO_VEGETATION_PALETTE, QUATTRO_VOXEL_SIZE)
  batch(quattro, quattroMaterials.landmark, qs.landmark, QUATTRO_LANDMARK_PALETTE, QUATTRO_VOXEL_SIZE)
  const signals = batch(quattro, quattroMaterials.signals, qs.signals, QUATTRO_SIGNAL_PALETTE, QUATTRO_VOXEL_SIZE)
  signals.mesh.castShadow = false

  // A broad contact pool grounds the car even on the constrained renderer.
  const gradientCanvas = document.createElement('canvas')
  gradientCanvas.width = gradientCanvas.height = 128
  const ctx = gradientCanvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 64)
  gradient.addColorStop(0, 'rgba(0,0,0,0.85)')
  gradient.addColorStop(0.55, 'rgba(0,0,0,0.48)')
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 128, 128)
  const contactTexture = new CanvasTexture(gradientCanvas)
  const contact = new Mesh(new PlaneGeometry(5.3, 7.5), new MeshBasicNodeMaterial({ map: contactTexture, transparent: true, depthWrite: false, opacity: 0.8 }))
  contact.rotation.x = -Math.PI / 2
  contact.position.y = 0.018
  car.add(contact)
  let carAsset: Object3D | undefined
  const wheels: Object3D[] = []
  const loader = new GLTFLoader()
  const assetAbort = new AbortController()
  const assetDeadline = setTimeout(() => assetAbort.abort(), 5000)
  const carLoaded = fetch('/art/quattro-car.glb', { signal: assetAbort.signal })
    .then((response) => {
      if (!response.ok) throw new Error(`Car asset returned ${response.status}.`)
      return response.arrayBuffer()
    })
    .then((buffer) => loader.parseAsync(buffer, '/art/'))
    .then((gltf) => {
    if (disposed) { disposeObject(gltf.scene); return }
    carAsset = gltf.scene
    carAsset.scale.setScalar(1.15)
    carAsset.traverse((object) => {
      if (object instanceof Mesh) { object.castShadow = true; object.receiveShadow = true }
      if (/^wheel_(FL|FR|RL|RR)$/.test(object.name)) wheels.push(object)
    })
    car.add(carAsset)
    host.dataset.carAsset = 'blender'
    needsRender = true
  }).catch(() => {
    if (disposed) return
    // Keep the authored silhouette available through the procedural low tier.
    const sources = createQuattroCarSources(false)
    const mats = createQuattroCarMaterials(worldMaterials.surfaceTexture)
    const model = new Group()
    car.add(model)
    batch(model, mats.body, sources.body, QUATTRO_CAR_BODY_PALETTE, QUATTRO_CAR_VOXEL_SIZE)
    batch(model, mats.glass, sources.glass, QUATTRO_CAR_GLASS_PALETTE, QUATTRO_CAR_VOXEL_SIZE)
    batch(model, mats.trim, sources.trim, QUATTRO_CAR_TRIM_PALETTE, QUATTRO_CAR_VOXEL_SIZE)
    batch(model, mats.tires, sources.tires, QUATTRO_CAR_TIRE_PALETTE, QUATTRO_CAR_VOXEL_SIZE)
    batch(model, mats.lamps, sources.lamps, QUATTRO_CAR_LAMP_PALETTE, QUATTRO_CAR_VOXEL_SIZE)
    model.position.y = -new Box3().setFromObject(model).min.y
    host.dataset.carAsset = 'procedural'
    needsRender = true
  }).finally(() => clearTimeout(assetDeadline))

  const ambient = new HemisphereLight('#a7b3f2', '#161023', 2.1)
  scene.add(ambient)
  const key = new DirectionalLight('#d7ddeb', 3.2)
  key.position.set(-12, 20, 4)
  key.target.position.set(1, -1, -21)
  key.castShadow = true
  key.shadow.mapSize.set(quality.tier === 'full' ? 2048 : 1024, quality.tier === 'full' ? 2048 : 1024)
  Object.assign(key.shadow.camera, { left: -27, right: 27, top: 30, bottom: -30, near: 1, far: 95 })
  key.shadow.normalBias = 0.07
  key.shadow.bias = -0.00015
  key.shadow.radius = 3
  scene.add(key, key.target)
  const rim = new DirectionalLight('#ff9873', 4)
  rim.position.set(2, 7, -45)
  rim.target.position.set(2, 0, -14)
  scene.add(rim, rim.target)
  const fill = new DirectionalLight('#8862ed', 2)
  fill.position.set(16, 7, -4)
  scene.add(fill)
  const portalLight = new PointLight('#a7e977', 20, 11, 2)
  portalLight.position.copy(PORTAL).add(v(1.4, -0.2, 0))
  scene.add(portalLight)
  const sunset = new PointLight('#ff682d', 90, 45, 1.8)
  sunset.position.set(0, 1.2, -43)
  scene.add(sunset)
  const roadLights: PointLight[] = []
  for (const z of [-13, -22, -31, -40]) {
    const roadLight = new PointLight('#fc218d', 6, 9, 2)
    roadLight.position.set(2.75, -1.6, z)
    scene.add(roadLight)
    roadLights.push(roadLight)
  }
  const tailLight = new PointLight('#fc2074', 6, 5, 2)
  tailLight.position.set(0, 0.5, 2.8)
  scene.add(tailLight)

  const haloCanvas = document.createElement('canvas')
  haloCanvas.width = haloCanvas.height = 128
  const haloContext = haloCanvas.getContext('2d')!
  const haloGradient = haloContext.createRadialGradient(64, 64, 1, 64, 64, 64)
  haloGradient.addColorStop(0, 'rgba(255,115,40,.6)')
  haloGradient.addColorStop(.23, 'rgba(255,79,40,.23)')
  haloGradient.addColorStop(.6, 'rgba(219,37,121,.055)')
  haloGradient.addColorStop(1, 'rgba(219,37,121,0)')
  haloContext.fillStyle = haloGradient
  haloContext.fillRect(0, 0, 128, 128)
  const haloTexture = new CanvasTexture(haloCanvas)
  const sunHalo = new Mesh(new PlaneGeometry(24, 24), new MeshBasicNodeMaterial({ map: haloTexture, transparent: true, depthWrite: false, blending: AdditiveBlending }))
  sunHalo.position.set(0, 0.4, -49)
  quattro.add(sunHalo)

  function endpoint(world: WorldId): Pose {
    if (world === 'quattro') {
      const pose = getQuattroLandingCameraForViewport(width, height)
      return { position: v(pose.position.x, pose.position.y, pose.position.z), target: v(pose.target.x, pose.target.y, pose.target.z), fov: pose.fov }
    }
    const narrow = 1 - smooth((width / height - .9) / .25)
    return { position: v(-27 - narrow * 5, 9.1 + narrow * 2.1, 5 + narrow * 2), target: v(-5.3, -1.25, -11.9), fov: 36 + narrow * 6 }
  }
  function cameraPose(state: ExperienceSnapshot): Pose {
    if (!state.busy || quality.reducedMotion) return endpoint(state.committedWorld)
    const sign = state.from === 'bleak' ? -1 : 1
    const entry: Pose = { position: PORTAL.clone().add(v(sign * 3.6, 0, 0)), target: PORTAL.clone().add(v(-sign * 8, 0, 0)), fov: 60 }
    const thresholdExit: Pose = { ...entry, position: PORTAL.clone().add(v(-sign * 3.6, 0, 0)) }
    const exit: Pose = {
      position: thresholdExit.position.clone().add(v(0, .8, 4)),
      target: state.to === 'quattro' ? v(1.5, -1, -22) : v(-20, -1.8, -10),
      fov: 58,
    }
    if (state.phase === 'approach') return blendPose(endpoint(state.from), entry, smooth(state.phaseProgress))
    if (state.phase === 'crossing') {
      const pose = blendPose(entry, thresholdExit, state.phaseProgress)
      const turn = smooth((state.phaseProgress - .5) / .5)
      pose.position.add(v(0, .8 * turn, 4 * turn))
      pose.target.lerp(exit.target, turn)
      pose.fov += (exit.fov - pose.fov) * turn
      return pose
    }
    const finish = endpoint(state.to)
    if (state.phase === 'arrival' || state.phase === 'settle') {
      const timing = EXPERIENCE_TIMING[state.mode as 'intro' | 'travel']
      const progress = (state.progress * timing.durationMs - timing.crossingEndMs) / (timing.durationMs - timing.crossingEndMs)
      // One continuous dolly through the car view and page reveal. Only the
      // final endpoint eases to rest; the intermediate camera anchor never does.
      const p = progress + progress * progress - progress * progress * progress
      const hero: Pose = state.to === 'quattro'
        ? { position: v(12, 5.2, -6), target: v(1.5, -1, -17), fov: 50 }
        : { position: v(-17, 4, -3), target: PORTAL.clone().add(v(0, -0.7, 0)), fov: 42 }
      return {
        position: new CatmullRomCurve3([exit.position, hero.position, finish.position]).getPoint(p),
        target: new CatmullRomCurve3([exit.target, hero.target, finish.target]).getPoint(p),
        fov: exit.fov + (finish.fov - exit.fov) * smooth(progress),
      }
    }
    return finish
  }
  const portalCorners = [v(-.46, -2.3, -2.3), v(.46, -2.3, -2.3), v(-.46, 2.3, -2.3), v(.46, 2.3, -2.3), v(-.46, -2.3, 2.3), v(.46, -2.3, 2.3), v(-.46, 2.3, 2.3), v(.46, 2.3, 2.3)].map((point) => point.add(PORTAL))
  function projectPortal() {
    camera.updateMatrixWorld()
    const bounds = new Box3()
    for (const corner of portalCorners) bounds.expandByPoint(corner.clone().project(camera))
    const center = PORTAL.clone().project(camera)
    const projected = { x: (bounds.min.x + bounds.max.x) / 4 + .5, y: .5 - (bounds.min.y + bounds.max.y) / 4, width: (bounds.max.x - bounds.min.x) / 2, height: (bounds.max.y - bounds.min.y) / 2, visible: !controller.state.busy && center.z > -1 && center.z < 1 && bounds.max.x > -.95 && bounds.min.x < .95 && bounds.max.y > -.9 && bounds.min.y < .9 }
    options.onPortalProjectionChange?.(projected)
  }
  const cold = new Color('#b8c5d2')
  const violet = new Color('#c7b0ff')
  const barrensFog = new Color('#080d14')
  const quattroFog = new Color('#39164c')
  const barrensSky = new Color('#a4adb9')
  const quattroSky = new Color('#ba9aff')
  const barrensGround = new Color('#10161d')
  const quattroGround = new Color('#281034')
  const barrensPortal = new Color('#424d4f')
  const quattroPortal = new Color('#364449')
  const projectedSun = new Vector3()
  const projectedPortal = new Vector3()
  function apply(state: ExperienceSnapshot, publish = true) {
    if (layout.cinematic) {
      // Match this frame's CSS reveal without waiting for ResizeObserver's
      // following layout pass. The render targets keep their allocated size.
      width = layout.width * (1 - layout.insetX * state.contentVisibility)
      height = layout.height - (layout.insetTop + layout.insetBottom) * state.contentVisibility
      camera.aspect = width / height
    }
    const presentation = sampleWorldPresentation(state)
    const q = presentation.quattroMix
    worldColorMix.value = q
    bleak.visible = state.committedWorld === 'bleak'
    quattro.visible = state.committedWorld === 'quattro'
    key.color.copy(cold).lerp(violet, q)
    key.intensity = 2.7 - q * .9
    ambient.intensity = 1.5 + q * .45
    ambient.color.copy(barrensSky).lerp(quattroSky, q)
    ambient.groundColor.copy(barrensGround).lerp(quattroGround, q)
    rim.intensity = q * .7
    fill.intensity = q * 1.3
    // Keep the light list stable. Removing lights with a hidden world changes
    // Three's shader cache key and recompiles the shared portal at each crossing.
    sunset.intensity = q * 90
    roadLights.forEach((light) => { light.intensity = q * 6 })
    tailLight.intensity = q * 6
    fog.color.copy(barrensFog).lerp(quattroFog, q)
    fog.density = .006 + (1 - q) * .011
    portalLight.intensity = 6 + hoverEnergy * 24
    worldMaterials.portal.color.copy(barrensPortal).lerp(quattroPortal, q)
    worldMaterials.portal.emissive.set('#9ece6a')
    worldMaterials.portal.emissiveIntensity = .025 + hoverEnergy * .18
    portalEffects.setState(state.phase === 'approach' ? 'ready' : state.phase === 'crossing' ? 'entering' : hovered ? 'ready' : 'connected', state.phaseProgress)
    // Brief darkness at the physical threshold conceals the world exchange.
    // Both journeys use the same aperture and neither drives the car backward.
    thresholdVeil.value = presentation.thresholdVeil
    car.position.set(1.05, QUATTRO_ROAD_SURFACE_Y, -12 - state.carProgress * 9)
    tailLight.position.copy(car.position).add(v(0, .5, 2.8))
    for (const wheel of wheels) wheel.rotation.x = -state.carProgress * 9 / .43
    const pose = cameraPose(state)
    camera.position.copy(pose.position)
    camera.lookAt(pose.target)
    camera.fov = pose.fov
    camera.updateProjectionMatrix()
    sunHalo.quaternion.copy(camera.quaternion)
    if (!publish) return
    if (state.committedWorld !== lastCommittedWorld) {
      lastCommittedWorld = state.committedWorld
      // Store only actual presentation changes, never hidden warmup states or
      // the default opening pose. A return visit resumes the last visible world.
      if (!forcedWorld && !capture && hold === undefined) rememberWorld(state.committedWorld)
    }
    projectPortal()
    // Cached hero-relative placement follows the same cinematic inset as CSS.
    const offsetX = layout.cinematic ? layout.width * layout.insetX * state.contentVisibility : hostOffset.x
    const offsetY = layout.cinematic ? layout.insetTop * state.contentVisibility : hostOffset.y
    projectedSun.copy(sunHalo.position).project(camera)
    projectedPortal.copy(PORTAL).project(camera)
    landing?.style.setProperty('--world-sun-x', `${100 * (offsetX + (projectedSun.x * .5 + .5) * width) / layout.width}%`)
    landing?.style.setProperty('--world-sun-y', `${100 * (offsetY + (.5 - projectedSun.y * .5) * height) / layout.height}%`)
    landing?.style.setProperty('--world-portal-x', `${100 * (offsetX + (projectedPortal.x * .5 + .5) * width) / layout.width}%`)
    landing?.style.setProperty('--world-portal-y', `${100 * (offsetY + (.5 - projectedPortal.y * .5) * height) / layout.height}%`)
    const sunFrustumFade = projectedSun.z > -1 && projectedSun.z < 1
      ? smooth((1 - Math.abs(projectedSun.x)) / .2) * smooth((1 - Math.abs(projectedSun.y)) / .2) : 0
    landing?.style.setProperty('--world-sun-visibility', String(q * (1 - presentation.thresholdVeil) * sunFrustumFade))
    options.onStateChange?.(state)
    host.dataset.world = state.committedWorld
    host.dataset.phase = state.phase
    host.dataset.progress = state.progress.toFixed(4)
    host.dataset.cameraPosition = camera.position.toArray().map((n) => n.toFixed(3)).join(',')
    host.dataset.carPosition = car.position.toArray().map((n) => n.toFixed(3)).join(',')
  }
  function markSeen() { markIntroSeen() }
  function resize() {
    const rect = host.getBoundingClientRect()
    width = Math.max(1, rect.width)
    height = Math.max(1, rect.height)
    camera.aspect = width / height
    const heroRect = hero?.getBoundingClientRect()
    hostOffset = { x: rect.left - (heroRect?.left ?? rect.left), y: rect.top - (heroRect?.top ?? rect.top) }
    const style = getComputedStyle(host)
    layout = {
      width: hero?.clientWidth ?? width,
      height: hero?.clientHeight ?? height,
      insetX: Number(style.getPropertyValue('--scene-inset-x')) / 100,
      insetTop: Number(style.getPropertyValue('--scene-inset-top')),
      insetBottom: Number(style.getPropertyValue('--scene-inset-bottom')),
      cinematic: window.innerWidth > 800 && Boolean(hero),
    }
    // Allocate once for the settled scene's pixel budget, then scale the same
    // canvas during travel. CSS animation must never recreate GPU attachments.
    const nextWidth = Math.max(1, Math.round(layout.cinematic ? layout.width * (1 - layout.insetX) : width))
    const nextHeight = Math.max(1, Math.round(layout.cinematic ? layout.height - layout.insetTop - layout.insetBottom : height))
    if (bufferWidth !== nextWidth || bufferHeight !== nextHeight) {
      bufferWidth = nextWidth
      bufferHeight = nextHeight
      renderer.setSize(bufferWidth, bufferHeight, false)
    }
    needsRender = true
  }
  const resizeObserver = new ResizeObserver(resize)
  const intersectionObserver = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; needsRender = true }, { rootMargin: '120px' })
  const visibilityChange = () => { lastTime = 0; needsRender = true }
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const motionChange = () => { quality.reducedMotion = reducedMotion.matches; if (quality.reducedMotion) { controller.skip(); markSeen() }; needsRender = true }
  // Restrained bloom joins emissive road/lamp edges without washing the masses.
  const pipeline = new RenderPipeline(renderer)
  const scenePass = pass(scene, camera)
  scenePass.setMRT(mrt({ output, normal: normalView }))
  const sceneColor = scenePass.getTextureNode('output')
  const worldColorMix = uniform(0)
  const darkFogColor = uniform(new Color('#060b12'))
  const thresholdVeil = uniform(0)
  const thresholdColor = uniform(new Color('#070a0b'))
  const glow = bloom(sceneColor, .26, .3, .85)
  const occlusion = ao(scenePass.getTextureNode('depth'), scenePass.getTextureNode('normal'), camera)
  occlusion.resolutionScale = .5
  occlusion.radius.value = 1.2
  occlusion.thickness.value = 1.2
  occlusion.samples.value = 8
  function composePipeline(useOcclusion: boolean) {
    const shadedColor = useOcclusion ? sceneColor.rgb.mul(occlusion.getTextureNode().r.mul(.7).add(.3)) : sceneColor.rgb
    // One warmed shader grades both worlds. Distance fog suppresses the
    // Barrens' far geometry; Quattro keeps its saturated sunset palette.
    const gradedColor = saturation(shadedColor.add(glow.rgb), mix(.34, 1.2, worldColorMix))
    const distanceFog = scenePass.getViewZNode().negate().smoothstep(10, 65)
      .mul(worldColorMix.oneMinus()).mul(.52).mul(sceneColor.a)
    const atmosphericColor = mix(gradedColor, darkFogColor, distanceFog)
    pipeline.outputNode = vec4(
      mix(atmosphericColor, thresholdColor, thresholdVeil),
      sceneColor.a.add(glow.r.add(glow.g).add(glow.b)).clamp(0, 1).max(thresholdVeil),
    )
    pipeline.needsUpdate = true
  }
  composePipeline(quality.tier === 'full')
  let rejectInitialization: (reason: unknown) => void = () => {}
  let pendingGpuWork: Promise<unknown> | undefined
  let rendererInitialized = false
  const aborted = new Promise<never>((_resolve, reject) => { rejectInitialization = reject })
  const onAbort = () => {
    dispose()
    rejectInitialization(options.signal?.reason ?? new DOMException('World initialization cancelled.', 'AbortError'))
  }
  options.signal?.addEventListener('abort', onAbort, { once: true })
  function dispose() {
    if (disposed) return
    delete captureHost.captureWorldPng
    for (const name of ['sun-x', 'sun-y', 'sun-visibility', 'portal-x', 'portal-y']) landing?.style.removeProperty(`--world-${name}`)
    disposed = true
    assetAbort.abort()
    clearTimeout(assetDeadline)
    options.signal?.removeEventListener('abort', onAbort)
    cancelAnimationFrame(raf)
    resizeObserver.disconnect()
    intersectionObserver.disconnect()
    document.removeEventListener('visibilitychange', visibilityChange)
    reducedMotion.removeEventListener('change', motionChange)
    renderer.domElement.remove()
    delete host.dataset.ready
    // Three's shader compiler yields between objects and cannot be cancelled.
    // Stop presentation now, then release its resources after that work ends.
    if (pendingGpuWork) void pendingGpuWork.then(releaseResources, releaseResources)
    else releaseResources()
  }
  function releaseResources() {
    batches.forEach((item) => item.dispose())
    portalEffects.dispose()
    floorEffects.dispose()
    worldMaterials.network.dispose()
    worldMaterials.surfaceTexture.dispose()
    if (carAsset) disposeObject(carAsset)
    contactTexture.dispose()
    contact.geometry.dispose()
    contact.material.dispose()
    haloTexture.dispose()
    sunHalo.geometry.dispose()
    sunHalo.material.dispose()
    key.shadow.dispose()
    pipeline.dispose()
    glow.dispose()
    occlusion.dispose()
    scenePass.dispose()
    if (rendererInitialized) renderer.dispose()
  }
  try {
    pendingGpuWork = renderer.init().then(() => { rendererInitialized = true })
    await Promise.race([pendingGpuWork, aborted])
    pendingGpuWork = undefined
    const gl = (renderer.backend as unknown as { gl?: WebGL2RenderingContext }).gl
    const rendererInfo = gl?.getExtension('WEBGL_debug_renderer_info')
    const softwareRenderer = rendererInfo && gl && /swiftshader|llvmpipe|software/i.test(String(gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL)))
    if (softwareRenderer && !capture) {
      // CPU rasterizers need fewer triangles and pixels. Keep the same authored
      // scene and lighting; hardware renderers retain bevels and contact AO.
      renderer.setPixelRatio(Math.min(quality.dpr, .75))
      key.shadow.mapSize.set(512, 512)
      composePipeline(false)
      host.dataset.quality = 'software'
    } else host.dataset.quality = quality.tier
    // Prepare both destinations and the real postprocessing passes while the
    // initial loader is visible. Nothing compiles for the first time at crossing.
    await Promise.race([carLoaded, aborted])
    if (disposed) throw new Error('World was disposed during initialization.')
    if (softwareRenderer && !capture) batches.forEach((item) => item.simplify())
    resize()
    if (playIntro) controller.startIntro()
    if (hold !== undefined) { controller.startIntro(); controller.seek(hold) }
    pendingGpuWork = (async () => {
      const culled = new Map<Object3D, boolean>()
      scene.traverse((object) => {
        if (object instanceof Mesh) { culled.set(object, object.frustumCulled); object.frustumCulled = false }
      })
      try {
        scenePass.renderTarget.samples = renderer.samples
        scenePass.renderTarget.texture.type = renderer.getOutputBufferType()
        scenePass.setSize(Math.floor(bufferWidth * renderer.getPixelRatio()), Math.floor(bufferHeight * renderer.getPixelRatio()))
        for (const world of ['bleak', 'quattro'] as const) {
          if (disposed) return
          apply(new ExperienceController(world).state, false)
          // Separate light sets require separate shader variants. Compile in
          // the actual MRT pass, including objects outside the landing view.
          const target = renderer.getRenderTarget()
          const previousMRT = renderer.getMRT()
          try { await scenePass.compileAsync(renderer) }
          finally { renderer.setRenderTarget(target); renderer.setMRT(previousMRT) }
          if (disposed) return
          pipeline.render()
          // A tiny asynchronous readback lets pending uploads, shadows and
          // postprocessing finish without a blocking GPU finish call.
          await renderer.readRenderTargetPixelsAsync(scenePass.renderTarget, 0, 0, 1, 1)
        }
      } finally {
        culled.forEach((value, object) => { object.frustumCulled = value })
      }
      if (disposed) return
      apply(controller.state, false)
      pipeline.render()
      await renderer.readRenderTargetPixelsAsync(scenePass.renderTarget, 0, 0, 1, 1)
    })()
    await Promise.race([pendingGpuWork, aborted])
    pendingGpuWork = undefined
    if (disposed) throw new Error('World was disposed during scene preparation.')
  } catch (error) {
    dispose()
    throw error
  }
  host.appendChild(renderer.domElement)
  host.dataset.ready = 'true'
  apply(controller.state)
  resizeObserver.observe(host)
  if (hero) resizeObserver.observe(hero)
  intersectionObserver.observe(host)
  document.addEventListener('visibilitychange', visibilityChange)
  reducedMotion.addEventListener('change', motionChange)
  function tick(now: number) {
    if (disposed) return
    raf = requestAnimationFrame(tick)
    if (document.hidden) { lastTime = 0; return }
    const delta = lastTime ? Math.max(now - lastTime, 0) : 0
    lastTime = now
    const wasBusy = controller.state.busy
    if (hold === undefined) controller.update(delta)
    if (wasBusy && !controller.state.busy) markSeen()
    const targetHover = hovered && !controller.state.busy ? 1 : 0
    const changingHover = Math.abs(hoverEnergy - targetHover) > .005
    hoverEnergy += (targetHover - hoverEnergy) * Math.min(1, delta / 120)
    if (needsRender || (hold === undefined && (controller.state.busy || wasBusy)) || changingHover) {
      apply(controller.state)
      needsGpuRender = true
      needsRender = false
    }
    if (onScreen && needsGpuRender) {
      pipeline.render()
      needsGpuRender = false
    }
  }
  if (import.meta.env.DEV) captureHost.captureWorldPng = async () => {
    if (disposed || controller.state.busy) throw new Error('Capture requires a ready, settled world.')
    apply(controller.state)
    // Read in the same task as the draw; no CSS background enters this PNG.
    pipeline.render()
    return renderer.domElement.toDataURL('image/png')
  }
  const backend = (renderer.backend as unknown as { isWebGPUBackend?: boolean }).isWebGPUBackend ? 'webgpu' : 'webgl2'
  return {
    backend,
    start() {
      if (started || disposed) return
      started = true
      lastTime = 0
      apply(controller.state)
      raf = requestAnimationFrame(tick)
    },
    skipIntro() { controller.skip(); markSeen(); needsRender = true },
    travel(to: WorldId) {
      if (controller.state.busy) return
      if (quality.reducedMotion) controller.settle(to)
      else controller.startTravel(to)
      hovered = false
      needsRender = true
    },
    setPortalHovered(value: boolean) { hovered = value; needsRender = true },
    dispose,
  }
}
