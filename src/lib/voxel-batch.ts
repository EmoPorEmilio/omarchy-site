import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import {
  Color,
  BoxGeometry,
  InstancedMesh,
  Matrix4,
  Quaternion,
  StaticDrawUsage,
  Vector3,
  type ColorRepresentation,
  type Material,
} from 'three/webgpu'

export interface VoxelBatchSource {
  positions: Float32Array
  materialIds?: Uint8Array
  rotations?: Float32Array
  scales?: Float32Array
}

interface VoxelBatchOptions {
  material: Material
  palette?: readonly ColorRepresentation[]
  source: VoxelBatchSource
  voxelSize: number
}

function assertSourceLength(
  name: string,
  actual: number,
  expected: number,
) {
  if (actual !== expected) {
    throw new Error(`${name} must contain ${expected} values; received ${actual}.`)
  }
}

export function createVoxelBatch({
  material,
  palette,
  source,
  voxelSize,
}: VoxelBatchOptions) {
  if (source.positions.length % 3 !== 0) {
    throw new Error('Voxel positions must contain complete x/y/z triplets.')
  }

  const count = source.positions.length / 3

  if (source.materialIds) {
    assertSourceLength('Voxel materialIds', source.materialIds.length, count)
  }

  if (source.rotations) {
    assertSourceLength('Voxel rotations', source.rotations.length, count * 4)
  }

  if (source.scales) {
    assertSourceLength('Voxel scales', source.scales.length, count * 3)
  }

  if (source.materialIds && (!palette || palette.length === 0)) {
    throw new Error('A voxel palette is required when materialIds are provided.')
  }

  let geometry = new RoundedBoxGeometry(voxelSize, voxelSize, voxelSize, 1, voxelSize * 0.035)
  const mesh = new InstancedMesh(geometry, material, count)
  const matrix = new Matrix4()
  const position = new Vector3()
  const rotation = new Quaternion()
  const scale = new Vector3(1, 1, 1)
  const color = new Color()

  for (let index = 0; index < count; index += 1) {
    const positionOffset = index * 3
    position.fromArray(source.positions, positionOffset)

    if (source.rotations) {
      rotation.fromArray(source.rotations, index * 4)
    } else {
      rotation.identity()
    }

    if (source.scales) {
      scale.fromArray(source.scales, positionOffset)
    } else {
      scale.setScalar(1)
    }

    matrix.compose(position, rotation, scale)
    mesh.setMatrixAt(index, matrix)

    if (source.materialIds && palette) {
      color.set(palette[source.materialIds[index] % palette.length])
      mesh.setColorAt(index, color)
    }
  }

  mesh.instanceMatrix.setUsage(StaticDrawUsage)
  mesh.instanceMatrix.needsUpdate = true

  if (mesh.instanceColor) {
    mesh.instanceColor.setUsage(StaticDrawUsage)
    mesh.instanceColor.needsUpdate = true
  }

  mesh.computeBoundingBox()
  mesh.computeBoundingSphere()

  return {
    count,
    mesh,
    simplify() {
      geometry.dispose()
      geometry = new BoxGeometry(voxelSize, voxelSize, voxelSize)
      mesh.geometry = geometry
    },
    dispose() {
      mesh.removeFromParent()
      mesh.dispose()
      geometry.dispose()
      material.dispose()
    },
  }
}
