import {
  ACESFilmicToneMapping,
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Group,
  InstancedMesh,
  MeshStandardNodeMaterial,
  Object3D,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  UnsignedByteType,
  WebGPURenderer,
} from 'three/webgpu'

const LOGO = [
  '###############',
  '#......#......#',
  '#.######...##.#',
  '#.#.........#.#',
  '#.#.........#.#',
  '#.#.........#.#',
  '#.#.........#.#',
  '###.........#.#',
  '#.#.........#.#',
  '#.#.........#.#',
  '#.#.........#.#',
  '#.#.........#.#',
  '#.###########.#',
  '#......#......#',
  '########.######',
] as const

const VOXELS = LOGO.flatMap((row, y) =>
  [...row].flatMap((cell, x) => (cell === '#' ? [{ x, y }] : [])),
)

export async function mountVoxelScene(host: HTMLDivElement) {
  const scene = new Scene()
  const camera = new PerspectiveCamera(29, 1, 0.1, 100)
  const group = new Group()
  const geometry = new BoxGeometry(0.62, 0.62, 0.86)
  const material = new MeshStandardNodeMaterial({
    color: new Color('#9ece6a'),
    metalness: 0.04,
    roughness: 0.48,
  })
  const mesh = new InstancedMesh(geometry, material, VOXELS.length)
  const renderer = new WebGPURenderer({
    alpha: true,
    antialias: true,
    outputBufferType: UnsignedByteType,
  })

  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.domElement.className = 'voxel-canvas'

  camera.position.set(0, 0, 35)
  scene.add(new AmbientLight(0x9aa4c8, 1.25))

  const keyLight = new DirectionalLight(0xf5f2d0, 3.6)
  keyLight.position.set(-5, 8, 12)
  scene.add(keyLight)

  const edgeLight = new DirectionalLight(0x7dcfff, 2.1)
  edgeLight.position.set(9, -4, 6)
  scene.add(edgeLight)

  const dummy = new Object3D()
  const spacing = 0.71
  const starts = VOXELS.map((voxel, index) => ({
    x: (voxel.x - 7) * spacing,
    y: (7 - voxel.y) * spacing,
    z: 8 + ((index * 37) % 23) * 0.32,
    delay: ((index * 17) % VOXELS.length) / VOXELS.length,
  }))

  for (let index = 0; index < starts.length; index += 1) {
    const voxel = starts[index]
    dummy.position.set(voxel.x, voxel.y, voxel.z)
    dummy.scale.setScalar(0.02)
    dummy.updateMatrix()
    mesh.setMatrixAt(index, dummy.matrix)
  }

  mesh.instanceMatrix.needsUpdate = true
  group.add(mesh)
  scene.add(group)
  host.appendChild(renderer.domElement)

  let width = 1
  let height = 1
  let elapsed = 0
  let previous = performance.now()
  let introComplete = false
  let inView = true
  let pageVisible = !document.hidden
  let pointerX = 0
  let pointerY = 0
  let targetX = 0
  let targetY = 0

  const resize = () => {
    const bounds = host.getBoundingClientRect()
    width = Math.max(1, Math.round(bounds.width))
    height = Math.max(1, Math.round(bounds.height))
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
  }

  const onPointerMove = (event: PointerEvent) => {
    const bounds = host.getBoundingClientRect()
    targetX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2
    targetY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2
  }

  const onPointerLeave = () => {
    targetX = 0
    targetY = 0
  }

  const onVisibilityChange = () => {
    pageVisible = !document.hidden
    if (pageVisible && inView) renderer.setAnimationLoop(render)
    else renderer.setAnimationLoop(null)
  }

  const resizeObserver = new ResizeObserver(resize)
  const visibilityObserver = new IntersectionObserver(
    ([entry]) => {
      inView = entry?.isIntersecting ?? false
      if (inView && pageVisible) {
        previous = performance.now()
        renderer.setAnimationLoop(render)
      } else {
        renderer.setAnimationLoop(null)
      }
    },
    { rootMargin: '120px' },
  )

  function render(time: number) {
    const delta = Math.min((time - previous) / 1000, 0.05)
    previous = time
    elapsed += delta

    if (!introComplete) {
      let moving = false

      for (let index = 0; index < starts.length; index += 1) {
        const voxel = starts[index]
        const progress = Math.min(
          1,
          Math.max(0, (elapsed / 1.75 - voxel.delay * 0.52) / 0.48),
        )
        const eased = 1 - Math.pow(1 - progress, 4)
        moving ||= progress < 1

        dummy.position.set(voxel.x, voxel.y, voxel.z * (1 - eased))
        dummy.scale.setScalar(0.02 + eased * 0.98)
        dummy.rotation.z = (1 - eased) * 0.5
        dummy.updateMatrix()
        mesh.setMatrixAt(index, dummy.matrix)
      }

      mesh.instanceMatrix.needsUpdate = true
      introComplete = !moving
    }

    pointerX += (targetX - pointerX) * Math.min(1, delta * 4)
    pointerY += (targetY - pointerY) * Math.min(1, delta * 4)
    group.rotation.x = -0.12 + pointerY * 0.12
    group.rotation.y = 0.34 + Math.sin(elapsed * 0.32) * 0.08 + pointerX * 0.18
    group.rotation.z = Math.sin(elapsed * 0.24) * 0.018
    group.position.y = Math.sin(elapsed * 0.68) * 0.08

    renderer.render(scene, camera)
  }

  resizeObserver.observe(host)
  visibilityObserver.observe(host)
  host.addEventListener('pointermove', onPointerMove, { passive: true })
  host.addEventListener('pointerleave', onPointerLeave)
  document.addEventListener('visibilitychange', onVisibilityChange)
  resize()
  await renderer.init()
  renderer.setAnimationLoop(render)

  const backend = 'GPU / LIVE'

  return {
    backend,
    dispose() {
      renderer.setAnimationLoop(null)
      resizeObserver.disconnect()
      visibilityObserver.disconnect()
      host.removeEventListener('pointermove', onPointerMove)
      host.removeEventListener('pointerleave', onPointerLeave)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      mesh.dispose()
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
