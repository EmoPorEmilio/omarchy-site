import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  InstancedMesh,
  Matrix4,
  MeshBasicNodeMaterial,
  PlaneGeometry,
  Quaternion,
  StaticDrawUsage,
  Vector3,
} from 'three/webgpu'

import { ALL_BEACON_SITES } from './world-layout'

export function createBeaconFloorEffects() {
  const canvas = document.createElement('canvas')
  canvas.width = 96
  canvas.height = 96
  const context = canvas.getContext('2d')

  if (context) {
    const gradient = context.createRadialGradient(48, 48, 3, 48, 48, 46)
    gradient.addColorStop(0, 'rgba(255,255,255,0.95)')
    gradient.addColorStop(0.24, 'rgba(255,255,255,0.42)')
    gradient.addColorStop(0.64, 'rgba(255,255,255,0.12)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, 96, 96)
  }

  const texture = new CanvasTexture(canvas)
  const geometry = new PlaneGeometry(2.25, 2.25)
  const material = new MeshBasicNodeMaterial({
    blending: AdditiveBlending,
    color: new Color('#9ece6a'),
    depthWrite: false,
    map: texture,
    opacity: 0,
    transparent: true,
  })
  const mesh = new InstancedMesh(geometry, material, ALL_BEACON_SITES.length)
  const matrix = new Matrix4()
  const position = new Vector3()
  const rotation = new Quaternion().setFromAxisAngle(
    new Vector3(1, 0, 0),
    -Math.PI / 2,
  )
  const scale = new Vector3(1, 1, 1)

  for (let index = 0; index < ALL_BEACON_SITES.length; index += 1) {
    const [x, z] = ALL_BEACON_SITES[index]
    position.set(x, -2.625, z)
    matrix.compose(position, rotation, scale)
    mesh.setMatrixAt(index, matrix)
  }

  mesh.instanceMatrix.setUsage(StaticDrawUsage)
  mesh.instanceMatrix.needsUpdate = true

  return {
    mesh,
    set(color: string, opacity: number) {
      material.color.set(color)
      material.opacity = opacity
    },
    dispose() {
      mesh.removeFromParent()
      mesh.dispose()
      geometry.dispose()
      material.dispose()
      texture.dispose()
    },
  }
}

export type BeaconFloorEffects = ReturnType<typeof createBeaconFloorEffects>
