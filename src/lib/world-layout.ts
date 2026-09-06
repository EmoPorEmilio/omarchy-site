import {
  OMARCHY_LOGO_CELLS,
  OMARCHY_LOGO_GRID,
} from '../generated/omarchy-logo-voxels'
import type { VoxelBatchSource } from './voxel-batch'

export const WORLD_VOXEL_SIZE = 0.28
export const WORLD_VOXEL_SPACING = 0.3
export const WORLD_SEED = 0x0a4c4f59
export const PORTAL_CENTER = { x: 3.65, y: 1.28, z: 0.15 } as const

export interface CameraPose {
  fov: number
  position: { x: number; y: number; z: number }
  target: { x: number; y: number; z: number }
}

export const LANDING_CAMERA: CameraPose = {
  position: { x: 14.5, y: 9.8, z: 25.7 },
  target: { x: -1.85, y: -2.6, z: 0.1 },
  fov: 33,
}

export const TABLET_LANDING_CAMERA: CameraPose = {
  position: { x: 13.6, y: 10.8, z: 31.5 },
  target: { x: 1.55, y: 2.25, z: 0.1 },
  fov: 39,
}

export const MOBILE_LANDING_CAMERA: CameraPose = {
  position: { x: 12.8, y: 11.6, z: 30 },
  target: { x: 2.65, y: 4.15, z: 0.1 },
  fov: 41,
}

export const COMPACT_LANDING_CAMERA: CameraPose = {
  position: { x: 14.4, y: 12.8, z: 33 },
  target: { x: 2.7, y: 5.9, z: 0.1 },
  fov: 44,
}

export const LANDSCAPE_LANDING_CAMERA: CameraPose = {
  position: { x: 14.5, y: 8.8, z: 25.7 },
  target: { x: -3, y: -0.7, z: 0.1 },
  fov: 33,
}

export const BEACON_SITES = [
  [-0.25, 8.2],
  [0.55, 3.65],
  [8.45, 5.75],
  [8.4, -1.4],
] as const

export const REVERSE_BEACON_SITES = [
  [-0.25, -10.05],
  [-0.15, -4.95],
  [7.55, -10.05],
  [7.45, -4.95],
] as const

export const ALL_BEACON_SITES = [
  ...BEACON_SITES,
  ...REVERSE_BEACON_SITES,
] as const

export function getLandingCameraForViewport(width: number, height: number) {
  if (height <= 600 && width / height >= 1.45) {
    return LANDSCAPE_LANDING_CAMERA
  }
  if (width < 360) return COMPACT_LANDING_CAMERA
  if (width < 600) return MOBILE_LANDING_CAMERA
  if (width < 1024) return TABLET_LANDING_CAMERA
  return LANDING_CAMERA
}

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

function finalizeSource(
  source: MutableVoxelSource,
  withMaterialIds = true,
): VoxelBatchSource {
  return {
    materialIds: withMaterialIds
      ? new Uint8Array(source.materialIds)
      : undefined,
    positions: new Float32Array(source.positions),
    scales: new Float32Array(source.scales),
  }
}

function createSeededRandom(seed: number) {
  let value = seed >>> 0

  return () => {
    value += 0x6d2b79f5
    let result = value
    result = Math.imul(result ^ (result >>> 15), result | 1)
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61)
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

function getMaterialId(random: () => number, topBias = 0) {
  const value = random() + topBias
  if (value > 1.02) return 3
  if (value > 0.88) return 2
  if (value > 0.42) return 1
  return 0
}

function addSlab(
  source: MutableVoxelSource,
  centerX: number,
  centerZ: number,
  y: number,
  columns: number,
  rows: number,
  random: () => number,
  edgeWear = 0,
) {
  const xOrigin = centerX - ((columns - 1) * WORLD_VOXEL_SPACING) / 2
  const zOrigin = centerZ - ((rows - 1) * WORLD_VOXEL_SPACING) / 2

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const edgeDistance = Math.min(
        column,
        row,
        columns - 1 - column,
        rows - 1 - row,
      )
      if (edgeDistance === 0 && random() < edgeWear) continue

      const isTopEdge = edgeDistance <= 1
      addVoxel(
        source,
        xOrigin + column * WORLD_VOXEL_SPACING,
        y,
        zOrigin + row * WORLD_VOXEL_SPACING,
        0.94,
        1.24,
        0.94,
        getMaterialId(random, isTopEdge ? 0.08 : 0),
      )
    }
  }
}

function addFormation(
  source: MutableVoxelSource,
  centerX: number,
  centerZ: number,
  levels: number,
  random: () => number,
  direction: 1 | -1,
) {
  for (let level = 0; level < levels; level += 1) {
    const width = levels - level
    for (let x = -width; x <= width; x += 1) {
      const depth = Math.max(1, Math.ceil((width - Math.abs(x)) * 0.62))
      for (let z = -depth; z <= depth; z += 1) {
        if (random() < 0.12 + level * 0.014) continue
        addVoxel(
          source,
          centerX + x * WORLD_VOXEL_SPACING,
          -2.85 + level * WORLD_VOXEL_SPACING,
          centerZ + z * WORLD_VOXEL_SPACING * direction,
          0.93,
          0.94,
          0.93,
          getMaterialId(random),
        )
      }
    }
  }
}

function createStructureSource(
  random: () => number,
  environmentDensity: number,
) {
  const source = createMutableSource()

  // Broken floor plane. It is dense near the pedestal and falls away into black.
  for (let row = -23; row <= 30; row += 1) {
    for (let column = -34; column <= 34; column += 1) {
      const normalizedX = (column - 1) / 35
      const normalizedZ = row / 30
      const edge = normalizedX ** 2 + normalizedZ ** 2
      const composedGap =
        (column < -24 && row < -12) ||
        (column > 25 && row > 12) ||
        (column > 29 && row < -10)
      const keep =
        edge < 0.72 ||
        (edge < 1.0 && random() > 0.4) ||
        (edge < 1.18 && random() > 0.8)

      if (
        !composedGap &&
        keep &&
        random() > 0.055 &&
        random() <= environmentDensity
      ) {
        addVoxel(
          source,
          PORTAL_CENTER.x - 1.2 + column * WORLD_VOXEL_SPACING,
          -3.13 + (random() > 0.97 ? 0.04 : 0),
          row * WORLD_VOXEL_SPACING,
          0.95,
          0.62,
          0.95,
          getMaterialId(random),
        )
      }
    }
  }

  // Five deliberate pedestal terraces closely follow the reference silhouette.
  addSlab(source, PORTAL_CENTER.x, 0.15, -2.83, 35, 23, random, 0.1)
  addSlab(source, PORTAL_CENTER.x, 0.13, -2.46, 30, 20, random, 0.065)
  addSlab(source, PORTAL_CENTER.x, 0.1, -2.09, 25, 17, random, 0.04)
  addSlab(source, PORTAL_CENTER.x, 0.08, -1.72, 21, 13, random, 0.025)
  addSlab(source, PORTAL_CENTER.x, 0.05, -1.35, 17, 9, random, 0.008)

  // A lower rear shrine gives the post-threshold camera a real destination.
  // It sits on the portal axis, so the portal and front terraces conceal most
  // of it from the landing camera while the reverse view reads as one world.
  addSlab(source, PORTAL_CENTER.x, -7.35, -2.72, 27, 17, random, 0.075)
  addSlab(source, PORTAL_CENTER.x, -7.42, -2.35, 23, 14, random, 0.04)
  addSlab(source, PORTAL_CENTER.x, -7.5, -1.98, 19, 11, random, 0.025)
  addSlab(source, PORTAL_CENTER.x, -7.58, -1.61, 15, 8, random, 0.01)

  if (environmentDensity > 0.75) {
    addFormation(source, -5.8, 0.8, 9, random, 1)
    addFormation(source, 9.6, -6.3, 8, random, -1)
  } else {
    addFormation(source, -5.8, 0.8, 7, random, 1)
    addFormation(source, 9.6, -6.3, 6, random, -1)
  }

  for (const [x, z] of ALL_BEACON_SITES) {
    addSlab(source, x, z, -2.82, 3, 3, random, 0)
    addVoxel(source, x, -2.49, z, 1.3, 1, 1.3, 2)
  }

  for (let index = 0; index < Math.round(64 * environmentDensity); index += 1) {
    const angle = random() * Math.PI * 2
    const radius = 7 + random() * 4.6
    const edgeBias = random()
    addVoxel(
      source,
      PORTAL_CENTER.x - 0.8 + Math.cos(angle) * radius,
      -2.56 + Math.floor(edgeBias * 2) * WORLD_VOXEL_SPACING,
      Math.sin(angle) * radius * 0.62,
      0.58 + random() * 0.76,
      0.5 + random() * 0.68,
      0.58 + random() * 0.76,
      getMaterialId(random),
    )
  }

  return finalizeSource(source)
}

export function createPortalSource() {
  const source = createMutableSource()
  const spacing = 0.3
  const xOrigin =
    PORTAL_CENTER.x - ((OMARCHY_LOGO_GRID.columns - 1) * spacing) / 2
  const yOrigin =
    PORTAL_CENTER.y + ((OMARCHY_LOGO_GRID.rows - 1) * spacing) / 2

  // Three true cube layers keep the body substantial from front, side, and reverse views.
  for (const zOffset of [-0.28, 0, 0.28]) {
    for (let index = 0; index < OMARCHY_LOGO_CELLS.length / 2; index += 1) {
      const cellOffset = index * 2
      addVoxel(
        source,
        xOrigin + OMARCHY_LOGO_CELLS[cellOffset] * spacing,
        yOrigin - OMARCHY_LOGO_CELLS[cellOffset + 1] * spacing,
        PORTAL_CENTER.z + zOffset,
        0.91,
        0.91,
        0.91,
      )
    }
  }

  return finalizeSource(source, false)
}

function createBeaconSource() {
  const source = createMutableSource()

  for (const [x, z] of ALL_BEACON_SITES) {
    for (let level = 0; level < 4; level += 1) {
      addVoxel(
        source,
        x,
        -2.2 + level * 0.27,
        z,
        0.3,
        0.84,
        0.3,
        level === 0 || level === 3 ? 1 : 0,
      )
    }
  }

  return finalizeSource(source)
}

function createBeaconHousingSource() {
  const source = createMutableSource()

  for (const [x, z] of ALL_BEACON_SITES) {
    for (const xOffset of [-0.13, 0.13]) {
      for (const zOffset of [-0.13, 0.13]) {
        addVoxel(source, x + xOffset, -1.78, z + zOffset, 0.18, 4.15, 0.18)
      }
    }

    addVoxel(source, x, -2.34, z, 1.25, 0.14, 1.25)
    addVoxel(source, x, -1.19, z, 1.25, 0.14, 1.25)
  }

  return finalizeSource(source, false)
}

function createNetworkSource() {
  const source = createMutableSource()
  const centerX = PORTAL_CENTER.x
  const centerZ = 0.1

  for (const [x, z] of BEACON_SITES) {
    const horizontalLength = Math.abs(centerX - x)
    const horizontalCenter = x + (centerX - x) / 2
    addVoxel(
      source,
      horizontalCenter,
      -3.01,
      z,
      Math.max(0.5, horizontalLength / WORLD_VOXEL_SIZE),
      0.07,
      0.075,
    )

    const verticalLength = Math.abs(centerZ - z)
    const verticalCenter = z + (centerZ - z) / 2
    addVoxel(
      source,
      centerX,
      -3.01,
      verticalCenter,
      0.075,
      0.07,
      Math.max(0.5, verticalLength / WORLD_VOXEL_SIZE),
    )
  }

  // Thin terrace-edge conductors make the stepped architecture respond as one machine.
  for (const [y, width, depth] of [
    [-2.64, 9.7, 6.25],
    [-2.27, 8.18, 5.34],
    [-1.9, 6.72, 4.43],
  ] as const) {
    for (const zOffset of [-depth / 2, depth / 2]) {
      addVoxel(
        source,
        centerX,
        y,
        centerZ + zOffset,
        width / WORLD_VOXEL_SIZE,
        0.055,
        0.06,
      )
    }
    for (const xOffset of [-width / 2, width / 2]) {
      addVoxel(
        source,
        centerX + xOffset,
        y,
        centerZ,
        0.06,
        0.055,
        depth / WORLD_VOXEL_SIZE,
      )
    }
  }

  return finalizeSource(source, false)
}

export function createBleakWorldSources(
  seed = WORLD_SEED,
  environmentDensity = 1,
) {
  const random = createSeededRandom(seed)

  return {
    beacons: createBeaconSource(),
    beaconHousings: createBeaconHousingSource(),
    network: createNetworkSource(),
    structure: createStructureSource(random, environmentDensity),
  }
}
