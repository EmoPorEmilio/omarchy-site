import type { VoxelBatchSource } from './voxel-batch'

export const QUATTRO_CAR_VOXEL_SIZE = 0.24
const CAR_GRID = 0.25

interface MutableVoxelSource {
  materialIds: number[]
  positions: number[]
  scales: number[]
}

function createMutableSource(): MutableVoxelSource {
  return { materialIds: [], positions: [], scales: [] }
}

function addVoxel(
  source: MutableVoxelSource,
  x: number,
  y: number,
  z: number,
  scaleX = 1,
  scaleY = 1,
  scaleZ = 1,
  materialId = 0,
) {
  source.positions.push(x, y, z)
  source.scales.push(scaleX, scaleY, scaleZ)
  source.materialIds.push(materialId)
}

function finalizeSource(source: MutableVoxelSource): VoxelBatchSource {
  return {
    materialIds: new Uint8Array(source.materialIds),
    positions: new Float32Array(source.positions),
    scales: new Float32Array(source.scales),
  }
}

function isWheelZone(z: number) {
  return Math.abs(Math.abs(z) - 1.82) < 0.58
}

function addBody(
  body: MutableVoxelSource,
  trim: MutableVoxelSource,
  detailed: boolean,
) {
  for (let iz = -11; iz <= 11; iz += 1) {
    const z = iz * CAR_GRID
    const taper = Math.abs(iz) > 9 ? 1 : 0
    for (let ix = -5 + taper; ix <= 5 - taper; ix += 1) {
      const x = ix * CAR_GRID
      addVoxel(
        body,
        x,
        0.58,
        z,
        0.96,
        0.94,
        0.96,
        Math.abs(ix) >= 4 ? 1 : iz > 7 ? 2 : 0,
      )

      if (Math.abs(ix) <= 4 || !isWheelZone(z)) {
        addVoxel(
          body,
          x,
          0.83,
          z,
          0.98,
          0.96,
          0.98,
          iz > 6 ? 2 : ix === 5 || ix === -5 ? 1 : 0,
        )
      }
    }
  }

  for (let iz = -10; iz <= 10; iz += 1) {
    const z = iz * CAR_GRID
    const hoodOrTrunk = iz < -3 || iz > 5
    const halfWidth = hoodOrTrunk ? 5 : 4
    for (let ix = -halfWidth; ix <= halfWidth; ix += 1) {
      addVoxel(
        body,
        ix * CAR_GRID,
        1.08,
        z,
        0.98,
        0.92,
        0.98,
        iz > 6 ? 2 : Math.abs(ix) === halfWidth ? 1 : 0,
      )
    }
  }

  for (let iz = -4; iz <= 7; iz += 1) {
    const z = iz * CAR_GRID
    const endTaper = iz < -2 || iz > 5 ? 1 : 0
    for (let ix = -4 + endTaper; ix <= 4 - endTaper; ix += 1) {
      const edge = Math.abs(ix) >= 3 - endTaper
      if (!edge) continue
      addVoxel(body, ix * CAR_GRID, 1.32, z, 0.96, 0.96, 0.96, 1)
      addVoxel(body, ix * CAR_GRID, 1.57, z, 0.94, 0.94, 0.94, 1)
    }
  }

  for (let iz = -2; iz <= 5; iz += 1) {
    const halfWidth = iz === -2 || iz === 5 ? 3 : 4
    for (let ix = -halfWidth; ix <= halfWidth; ix += 1) {
      addVoxel(
        body,
        ix * CAR_GRID,
        1.82,
        iz * CAR_GRID,
        0.96,
        0.86,
        0.96,
        Math.abs(ix) === halfWidth ? 1 : 2,
      )
    }
  }

  for (let ix = -5; ix <= 5; ix += 1) {
    addVoxel(trim, ix * CAR_GRID, 0.42, 2.92, 0.98, 0.56, 0.55, 0)
    addVoxel(trim, ix * CAR_GRID, 0.42, -2.92, 0.98, 0.56, 0.55, 0)
  }

  for (let iz = -9; iz <= 9; iz += 1) {
    const materialId = isWheelZone(iz * CAR_GRID) ? 2 : 1
    addVoxel(trim, 1.4, 0.83, iz * CAR_GRID, 0.4, 0.4, 0.96, materialId)
    addVoxel(trim, -1.4, 0.83, iz * CAR_GRID, 0.4, 0.4, 0.96, materialId)
  }

  if (detailed) {
    addVoxel(trim, 0, 1.22, 2.93, 6.8, 0.3, 0.48, 2)
    addVoxel(trim, 0, 1.47, 2.7, 7.7, 0.3, 1.35, 2)
    addVoxel(trim, 0, 1.4, -2.83, 5.6, 0.22, 0.42, 1)

    for (const x of [-1.05, -0.78, 0.78, 1.05]) {
      addVoxel(trim, x, 0.83, 2.98, 0.72, 0.42, 0.42, 3)
    }
  }
}

function addGlass(glass: MutableVoxelSource, detailed: boolean) {
  for (let ix = -3; ix <= 3; ix += 1) {
    addVoxel(glass, ix * CAR_GRID, 1.49, -1.16, 0.92, 0.92, 0.42, 0)
    addVoxel(glass, ix * CAR_GRID, 1.49, 1.63, 0.92, 0.92, 0.42, 1)
  }

  for (let iz = -3; iz <= 5; iz += 1) {
    const z = iz * CAR_GRID
    addVoxel(glass, 1.04, 1.48, z, 0.38, 0.9, 0.92, iz < 0 ? 0 : 1)
    addVoxel(glass, -1.04, 1.48, z, 0.38, 0.9, 0.92, iz < 0 ? 0 : 1)
  }

  if (!detailed) return
  for (let ix = -2; ix <= 2; ix += 1) {
    addVoxel(glass, ix * CAR_GRID, 1.85, -0.96, 0.9, 0.3, 0.36, 0)
    addVoxel(glass, ix * CAR_GRID, 1.85, 1.43, 0.9, 0.3, 0.36, 1)
  }
}

function addWheel(
  tires: MutableVoxelSource,
  x: number,
  z: number,
  materialOffset: number,
  detailed: boolean,
) {
  const ring = [
    [-1, 0],
    [0, -1],
    [0, 0],
    [0, 1],
    [1, 0],
  ] as const

  for (const [iy, iz] of ring) {
    addVoxel(
      tires,
      x,
      0.47 + iy * 0.3,
      z + iz * 0.3,
      1.7,
      1.16,
      1.16,
      iy === 0 && iz === 0 ? 1 + materialOffset : materialOffset,
    )
  }

  if (detailed) {
    for (const [iy, iz] of [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ] as const) {
      addVoxel(
        tires,
        x,
        0.47 + iy * 0.21,
        z + iz * 0.21,
        1.62,
        0.74,
        0.74,
        materialOffset,
      )
    }
  }
}

function addWheels(tires: MutableVoxelSource, detailed: boolean) {
  for (const x of [-1.42, 1.42]) {
    addWheel(tires, x, -1.82, x > 0 ? 0 : 2, detailed)
    addWheel(tires, x, 1.82, x > 0 ? 0 : 2, detailed)
  }
}

function addLamps(lamps: MutableVoxelSource, detailed: boolean) {
  for (const x of [-0.98, -0.72, 0.72, 0.98]) {
    addVoxel(lamps, x, 0.96, 3.01, 0.72, 0.48, 0.3, 0)
    if (detailed) addVoxel(lamps, x, 1.16, 3.01, 0.72, 0.4, 0.3, 1)
  }

  for (const x of [-0.92, 0.92]) {
    addVoxel(lamps, x, 0.97, -3.01, 1.2, 0.55, 0.3, 2)
  }
}

export interface QuattroCarSources {
  body: VoxelBatchSource
  glass: VoxelBatchSource
  lamps: VoxelBatchSource
  tires: VoxelBatchSource
  trim: VoxelBatchSource
}

export function createQuattroCarSources(detailed = true): QuattroCarSources {
  const body = createMutableSource()
  const glass = createMutableSource()
  const lamps = createMutableSource()
  const tires = createMutableSource()
  const trim = createMutableSource()

  addBody(body, trim, detailed)
  addGlass(glass, detailed)
  addWheels(tires, detailed)
  addLamps(lamps, detailed)

  return {
    body: finalizeSource(body),
    glass: finalizeSource(glass),
    lamps: finalizeSource(lamps),
    tires: finalizeSource(tires),
    trim: finalizeSource(trim),
  }
}
