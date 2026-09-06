import { OMARCHY_LOGO_CELLS, OMARCHY_LOGO_GRID } from '../generated/omarchy-logo-voxels'
import type { VoxelBatchSource } from './voxel-batch'
import type { CameraPose } from './world-layout'

export const QUATTRO_VOXEL_SIZE = 0.28
const QUATTRO_GRID = 0.56

// All wheel/contact and driving poses use this flat top surface.
export const QUATTRO_ROAD_SURFACE_Y = -2.45

export const QUATTRO_ANCHORS = {
  arrival: { x: 3.65, y: 1.7, z: -3.4 },
  hero: { x: 2.1, y: -1.35, z: -20.6 },
  horizon: { x: 0, y: 0.2, z: -48 },
} as const

export const QUATTRO_LANDMARK = { x: 11, z: -26.5 } as const

export const QUATTRO_LANDING_CAMERA: CameraPose = {
  fov: 38,
  position: { x: 18, y: 10.5, z: 12 },
  target: { x: 3.2, y: 0.05, z: -25 },
}

const QUATTRO_TABLET_CAMERA: CameraPose = {
  fov: 39,
  position: { x: 17, y: 11, z: 15 },
  target: { x: 3.2, y: 0.3, z: -25 },
}

const QUATTRO_MOBILE_CAMERA: CameraPose = {
  fov: 43,
  position: { x: 16, y: 13, z: 23 },
  target: { x: 3.2, y: 0.7, z: -25 },
}

const QUATTRO_COMPACT_CAMERA: CameraPose = {
  fov: 45,
  position: { x: 15, y: 13.5, z: 27 },
  target: { x: 3.2, y: 0.8, z: -25 },
}

const QUATTRO_LANDSCAPE_CAMERA: CameraPose = {
  fov: 36,
  position: { x: 18, y: 10.5, z: 12 },
  target: { x: 3.2, y: 0.2, z: -25 },
}

export function getQuattroLandingCameraForViewport(width: number, height: number): CameraPose {
  // Preserve the complete diorama and the return portal on narrow art regions.
  const aspect = width / Math.max(1, height)
  const fov = 2 * Math.atan(Math.tan(38 * Math.PI / 360) * Math.max(1, 1.36 / aspect)) * 180 / Math.PI
  return {
    fov,
    position: { x: 14, y: 9.5, z: 16 },
    target: { x: 2.2, y: 0.2, z: -25 },
  }
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

function finalizeSource(source: MutableVoxelSource): VoxelBatchSource {
  return {
    materialIds: new Uint8Array(source.materialIds),
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

// Dimensions here are world units. Keeping this conversion in one place makes
// tightly joined masses independent of the instanced primitive's base size.
function block(
  source: MutableVoxelSource,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  depth: number,
  materialId = 0,
) {
  addVoxel(source, x, y, z,
    width / QUATTRO_VOXEL_SIZE,
    height / QUATTRO_VOXEL_SIZE,
    depth / QUATTRO_VOXEL_SIZE,
    materialId)
}

function addTerrain(
  source: MutableVoxelSource,
  random: () => number,
  density: number,
) {
  const step = QUATTRO_GRID
  // Dense joints and a continuous substrate give the island weight. Only the
  // outside contour breaks away; the road is a quiet, unbroken plane.
  for (let row = 0; row < 72; row += 1) {
    const z = -8.3 - row * step
    const t = row / 71
    const halfWidth = t < 0.7
      ? 10.5 + Math.sin(t * Math.PI * 1.45) * 1.2
      : 11.4 - (t - 0.7) * 19
    for (let column = -21; column <= 21; column += 1) {
      const x = 2.75 + column * step
      const edge = halfWidth - Math.abs(column * step)
      if (edge < 0 || (edge < 0.5 && random() < 0.34)) continue
      const road = Math.abs(x - 2.75) < 3.92
      const curb = !road && Math.abs(x - 2.75) < 4.5
      const top = road ? QUATTRO_ROAD_SURFACE_Y : curb ? -2.27 : -2.46 + Math.sin(column * 0.7 + row * 0.35) * 0.045
      const thickness = edge < 0.7 ? 0.56 + random() * 0.2 : 0.42
      // Large-scale patches rather than independently randomized bright tiles.
      const material = road ? 1 : curb ? 2 : Math.sin(column * 0.32 + row * 0.22) > 0.62 ? 2 : 0
      block(source, x, top - thickness / 2, z, step - 0.012, thickness, step - 0.012, material)
      if (edge < 0.65 && row < 52) {
        block(source, x - Math.sign(column) * 0.06, top - thickness - 0.16, z,
          step - 0.025, 0.35, step - 0.025, 0)
      }
      // A few deliberately quiet rubble bands, never on the drive corridor.
      if (!road && !curb && edge > 0.8 && row < 50 && random() < (density < 0.8 ? 0.018 : 0.035)) {
        block(source, x, top + 0.19, z, 0.51, 0.38, 0.51, material)
      }
    }
  }

}

function addMountain(
  source: MutableVoxelSource,
  centerX: number,
  centerZ: number,
  width: number,
  levels: number,
  materialId: number,
  step: number,
) {
  // Solid terraces recede on every axis; no front-facing fence silhouettes.
  for (let level = 0; level < levels; level += 1) {
    const halfWidth = Math.max(step * 0.5, width / 2 - level * 0.593)
    const halfDepth = Math.max(step * 0.5, width * 0.28 - level * 0.374)
    for (let ix = -Math.floor(halfWidth / step); ix <= Math.floor(halfWidth / step); ix += 1) {
      for (let iz = -Math.floor(halfDepth / step); iz <= Math.floor(halfDepth / step); iz += 1) {
        const nx = Math.abs(ix * step) / (halfWidth + step)
        const nz = Math.abs(iz * step) / (halfDepth + step)
        if (nx + nz > 1.52) continue
        block(source, centerX + ix * step + level * 0.133,
          -2.35 + level * 0.5, centerZ + iz * step,
          step - 0.009, 0.508, step - 0.009, materialId)
      }
    }
  }
}

function addHorizon(source: MutableVoxelSource, density: number) {
  const step = density < 0.8 ? 1.02 : 0.78
  // Layers flank an open sunsetward road, with silhouettes getting smaller and
  // calmer at the horizon. The central gap is preserved for the departing car.
  addMountain(source, -7.4, -36.5, 10, 8, 0, step)
  addMountain(source, 12.8, -39, 9.5, 7, 0, step)
  addMountain(source, -3.4, -43, 7, 5, 1, step)
  addMountain(source, 8.7, -46, 7, 5, 1, step)
  addMountain(source, -7.5, -49, 11, 6, 2, step)
  addMountain(source, 16, -51, 11, 7, 2, step)
  for (let row = 0; row < 6; row += 1) {
    const z = -49.5 - row * 1.1
    for (let column = -14; column <= 14; column += 1) {
      block(source, 3.2 + column * 1.1, -2.75 - row * 0.09, z,
        1.085, 0.24, 1.085, 3)
    }
  }
}

function addCloud(
  source: MutableVoxelSource,
  x: number,
  y: number,
  z: number,
  width: number,
  undersideMaterial: number,
  density: number,
) {
  const step = density < 0.8 ? 0.82 : 0.64
  const halfColumns = Math.floor(width / (2 * step))
  const depth = Math.max(1.55, width * 0.24)
  const halfRows = Math.floor(depth / (2 * step))
  // Overlapping rounded lobes produce a volumetric cloud, with distinct stepped
  // peaks. Height varies in both horizontal axes instead of making a long bar.
  for (let ix = -halfColumns; ix <= halfColumns; ix += 1) {
    const nx = ix / (halfColumns + 0.25)
    for (let iz = -halfRows; iz <= halfRows; iz += 1) {
      const nz = iz / (halfRows + 0.55)
      const primary = Math.max(0, 1 - ((nx + 0.22) / 0.7) ** 2 - (nz / 1.2) ** 2)
      const secondary = Math.max(0, 1 - ((nx - 0.42) / 0.5) ** 2 - ((nz - 0.12) / 0.98) ** 2)
      const shoulder = Math.max(0, 1 - (nx / 1.08) ** 2 - (nz / 1.4) ** 2)
      if (shoulder <= 0) continue
      const levels = 1 + Math.round(Math.max(primary * 5, secondary * 3, shoulder * 1.1))
      for (let level = 0; level < levels; level += 1) {
        block(source, x + ix * step, y + level * 0.46, z + iz * step,
          step - 0.012, 0.451, step - 0.012,
          level === 0 ? undersideMaterial : level === 1 && iz > 0 ? 1 : 0)
      }
    }
  }
}

function addClouds(source: MutableVoxelSource, density: number) {
  addCloud(source, -5.2, 5.25, -30.5, 8.9, 2, density)
  addCloud(source, 11.4, 7.2, -41, 10.4, 2, density)
  addCloud(source, 1, 7.3, -44, 4.6, 3, density)
  addCloud(source, 5.9, 3.75, -43, 3.5, 3, density)
  if (density >= 0.8) addCloud(source, -4.3, 2.15, -39.7, 3.2, 2, density)
}

function addTree(
  source: MutableVoxelSource,
  x: number,
  z: number,
  scale: number,
) {
  const base = -2.45
  // A thick trunk ends inside the crown. Leaves are touching volumes and their
  // color follows coherent face groups, avoiding the old checkerboard canopy.
  block(source, x, base + 1.55 * scale, z, 0.84 * scale, 3.1 * scale, 0.84 * scale, 0)
  const radii = [3, 3, 2, 2, 1, 1, 0]
  const step = 0.55 * scale
  radii.forEach((radius, level) => {
    for (let ix = -radius; ix <= radius; ix += 1) {
      for (let iz = -radius; iz <= radius; iz += 1) {
        if (Math.abs(ix) + Math.abs(iz) > radius + 1) continue
        block(source, x + ix * step,
          base + (1.9 + level * 0.51) * scale, z + iz * step,
          step - 0.011, 0.502 * scale, step - 0.011,
          ix === radius && iz < 1 ? 2 : 1)
      }
    }
  })
  for (const [dx, dz] of [[-0.65, 0.4], [0.6, 0.15], [0.15, -0.5]]) {
    block(source, x + dx * scale, base + 0.2, z + dz * scale,
      0.95 * scale, 0.4, 0.85 * scale, 1)
  }
}

function addVegetation(
  source: MutableVoxelSource,
  random: () => number,
  density: number,
) {
  addTree(source, -6.1, -17.5, 1.3)
  if (density >= 0.8) addTree(source, 11.6, -34.7, 0.72)
  const sites = [[-6.2, -14], [-3.7, -21], [-5.2, -28], [9.5, -14], [10.3, -20.5], [8.5, -29], [12.6, -28.5]]
  for (const [x, z] of sites) {
    for (let index = 0; index < (density < 0.8 ? 3 : 5); index += 1) {
      const dx = (index % 3 - 1) * 0.57
      const dz = Math.floor(index / 3) * 0.54
      const height = index === 1 ? 0.94 : 0.46 + random() * 0.12
      block(source, x + dx, -2.43 + height / 2, z + dz, 0.59, height, 0.59, index === 1 ? 2 : 1)
    }
  }
}

function addLandmark(source: MutableVoxelSource, _density: number) {
  const { x, z } = QUATTRO_LANDMARK
  // Frame encloses a single dark recessed face. Its two legs actually meet the
  // island and carry deep stepped feet, unlike the former floating thin panel.
  for (const side of [-1, 1]) {
    block(source, x + side * 1.9, -1.48, z, 0.86, 1.94, 0.9, 0)
    block(source, x + side * 1.9, -2.18, z + 0.18, 1.66, 0.5, 1.6, 1)
    block(source, x + side * 1.9, -1.9, z + 0.08, 1.15, 0.4, 1.2, 0)
  }
  block(source, x, 1.93, z - 0.1, 5.9, 4.3, 0.62, 0)
  block(source, x, 1.93, z + 0.26, 5.05, 3.65, 0.18, 2)
  for (let column = -5; column <= 5; column += 1) {
    for (const y of [-0.34, 4.2]) {
      block(source, x + column * 0.56, y, z + 0.1, 0.552, 0.56, 0.94, 1)
    }
  }
  for (let row = 0; row < 7; row += 1) {
    for (const side of [-1, 1]) {
      block(source, x + side * 3.08, 0.22 + row * 0.56, z + 0.1, 0.56, 0.552, 0.94, 1)
    }
  }
}

function addSignals(source: MutableVoxelSource, density: number) {
  for (let row = 0; row < 18; row += 1) {
    const z = -10 - row * 2.1
    block(source, 2.75, QUATTRO_ROAD_SURFACE_Y + 0.026, z, 0.2, 0.034, 1.03, 0)
  }
  // Short shoulder accents keep the central vanishing line dominant.
  for (let row = 0; row < 11; row += 1) {
    const z = -10.5 - row * 3.1
    for (const x of [-1.42, 6.92]) {
      block(source, x, -2.255, z, 0.09, 0.025, 0.44, 0)
    }
  }
  const radius = 1.7
  const step = density < 0.8 ? 0.51 : 0.425
  for (let row = -Math.floor(radius / step); row <= Math.floor(radius / step); row += 1) {
    const halfWidth = Math.floor(Math.sqrt(radius ** 2 - (row * step) ** 2) / step)
    // Long contiguous horizontal bands make the sun a disc, not a coin grid.
    block(source, 0, 0.35 + row * step, -48,
      (halfWidth * 2 + 1) * step, step + 0.004, 0.15,
      row < -2 ? 1 : 2)
  }
  // Canonical generated SVG occupancy; no hand-drawn substitute typography.
  const cell = 0.165
  const center = (OMARCHY_LOGO_GRID.columns - 1) / 2
  for (let index = 0; index < OMARCHY_LOGO_CELLS.length; index += 2) {
    const column = OMARCHY_LOGO_CELLS[index]
    const row = OMARCHY_LOGO_CELLS[index + 1]
    block(source, QUATTRO_LANDMARK.x + (column - center) * cell,
      2.15 + (center - row) * cell, QUATTRO_LANDMARK.z + 0.39,
      cell - 0.003, cell - 0.003, 0.035, 3)
  }
  // A quiet lower status light, not fabricated telemetry text.
  block(source, QUATTRO_LANDMARK.x, 0.48, QUATTRO_LANDMARK.z + 0.4, 0.17, 0.17, 0.04, 3)
}

export interface QuattroWorldSources {
  clouds: VoxelBatchSource
  horizon: VoxelBatchSource
  landmark: VoxelBatchSource
  signals: VoxelBatchSource
  terrain: VoxelBatchSource
  vegetation: VoxelBatchSource
}

export function createQuattroWorldSources(
  seed = 0x51756174,
  environmentDensity = 1,
): QuattroWorldSources {
  const random = createSeededRandom(seed)
  const terrain = createMutableSource()
  const horizon = createMutableSource()
  const clouds = createMutableSource()
  const vegetation = createMutableSource()
  const landmark = createMutableSource()
  const signals = createMutableSource()

  addTerrain(terrain, random, environmentDensity)
  addHorizon(horizon, environmentDensity)
  addClouds(clouds, environmentDensity)
  addVegetation(vegetation, random, environmentDensity)
  addLandmark(landmark, environmentDensity)
  addSignals(signals, environmentDensity)

  return {
    clouds: finalizeSource(clouds),
    horizon: finalizeSource(horizon),
    landmark: finalizeSource(landmark),
    signals: finalizeSource(signals),
    terrain: finalizeSource(terrain),
    vegetation: finalizeSource(vegetation),
  }
}
