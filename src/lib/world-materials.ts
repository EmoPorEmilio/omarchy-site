import {
  AdditiveBlending,
  Color,
  DataTexture,
  LinearFilter,
  MeshBasicNodeMaterial,
  MeshStandardNodeMaterial,
  RepeatWrapping,
  RGBAFormat,
  UnsignedByteType,
} from 'three/webgpu'

export const BRAND_COLORS = {
  black: '#000000',
  blue: '#7aa2f7',
  cyan: '#7dcfff',
  green: '#9ece6a',
  night: '#1a1b26',
  storm: '#24283b',
  structural: '#414868',
  turquoise: '#b4f9f8',
  white: '#c0caf5',
} as const

function mix(from: string, to: string, amount: number) {
  return new Color(from).lerp(new Color(to), amount)
}

export const STRUCTURE_PALETTE = [
  '#22272e',
  '#2d343d',
  '#3d4650',
  '#343c43',
] as const

export const CLAY_STRUCTURE_PALETTE = [
  '#59616d',
  '#68717f',
  '#77818f',
  '#8993a1',
] as const

export const CLAY_BEACON_PALETTE = ['#939ca9', '#a5aeba'] as const

export const BEACON_PALETTE = [
  '#d7dfec',
  '#aab7c9',
] as const

function createSurfaceTexture() {
  const size = 32
  const data = new Uint8Array(size * size * 4)
  let seed = 0x0a4c4f59

  for (let index = 0; index < size * size; index += 1) {
    seed += 0x6d2b79f5
    let value = seed
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    const noise = ((value ^ (value >>> 14)) >>> 0) / 4294967296
    const x = index % size
    const y = Math.floor(index / size)
    const grain = Math.sin((x * 0.86 + y * 0.19) * Math.PI) * 9
    const shade = Math.max(54, Math.min(224, 138 + noise * 56 + grain))
    const offset = index * 4
    data[offset] = shade
    data[offset + 1] = shade
    data[offset + 2] = shade
    data[offset + 3] = 255
  }

  const texture = new DataTexture(
    data,
    size,
    size,
    RGBAFormat,
    UnsignedByteType,
  )
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter
  texture.needsUpdate = true
  return texture
}

export function createWorldMaterials() {
  const surfaceTexture = createSurfaceTexture()
  const beacons = new MeshStandardNodeMaterial({
    color: new Color('#899b7a'),
    emissive: new Color(BRAND_COLORS.green),
    emissiveIntensity: 1.15,
    metalness: 0.04,
    roughness: 0.38,
  })

  const beaconHousings = new MeshStandardNodeMaterial({
    color: new Color('#748079'),
    emissive: new Color(BRAND_COLORS.green),
    emissiveIntensity: 0.14,
    depthWrite: false,
    metalness: 0.02,
    opacity: 0.42,
    roughness: 0.2,
    transparent: true,
  })

  const network = new MeshBasicNodeMaterial({
    blending: AdditiveBlending,
    color: new Color(BRAND_COLORS.blue),
    depthWrite: false,
    opacity: 0,
    transparent: true,
  })

  const portal = new MeshStandardNodeMaterial({
    bumpMap: surfaceTexture,
    bumpScale: 0.001,
    color: new Color(BRAND_COLORS.white),
    emissive: new Color(BRAND_COLORS.black),
    emissiveIntensity: 0,
    metalness: 0.08,
    roughness: 0.62,

  })

  const structure = new MeshStandardNodeMaterial({
    bumpMap: surfaceTexture,
    bumpScale: 0.001,
    color: new Color('#ffffff'),
    emissive: new Color('#080c12'),
    emissiveIntensity: 0.1,
    metalness: 0.06,
    roughness: 0.88,

  })

  return {
    beaconHousings,
    beacons,
    network,
    portal,
    structure,
    surfaceTexture,
  }
}
