import {
  AdditiveBlending,
  Color,
  MeshBasicNodeMaterial,
  MeshStandardNodeMaterial,
  type Texture,
} from 'three/webgpu'

export const QUATTRO_PALETTE = {
  acid: '#b0e96c',
  asphalt: '#140b26',
  cloudBlue: '#5653bc',
  cloudViolet: '#972fab',
  deepNavy: '#090b22',
  indigo: '#462078',
  magenta: '#ff389e',
  orange: '#ff703e',
  red: '#ff314f',
  violet: '#7425a0',
  warmYellow: '#ffb84d',
} as const

export const QUATTRO_TERRAIN_PALETTE = [
  QUATTRO_PALETTE.deepNavy,
  QUATTRO_PALETTE.asphalt,
  QUATTRO_PALETTE.indigo,
  QUATTRO_PALETTE.violet,
] as const

export const QUATTRO_HORIZON_PALETTE = [
  '#252054',
  '#672784',
  '#a93e86',
  '#231641',
] as const

export const QUATTRO_CLOUD_PALETTE = [
  '#6962b2',
  '#9643a6',
  '#dc487d',
  '#fa835f',
] as const

export const QUATTRO_VEGETATION_PALETTE = [
  '#291537',
  '#155c65',
  '#43bca0',
  '#a0c868',
] as const

export const QUATTRO_LANDMARK_PALETTE = [
  '#101024',
  '#321948',
  '#090817',
  '#783882',
] as const

export const QUATTRO_SIGNAL_PALETTE = [
  QUATTRO_PALETTE.magenta,
  QUATTRO_PALETTE.orange,
  QUATTRO_PALETTE.warmYellow,
  QUATTRO_PALETTE.acid,
] as const

export const QUATTRO_CAR_BODY_PALETTE = [
  '#271342',
  '#4b1f75',
  '#1b1238',
] as const

export const QUATTRO_CAR_GLASS_PALETTE = ['#12152e', '#292453'] as const

export const QUATTRO_CAR_TRIM_PALETTE = [
  '#070711',
  '#161326',
  '#392247',
  '#9aa2b2',
] as const

export const QUATTRO_CAR_TIRE_PALETTE = [
  '#06060c',
  '#8b8fa0',
  '#090914',
  '#4b4c5c',
] as const

export const QUATTRO_CAR_LAMP_PALETTE = [
  QUATTRO_PALETTE.red,
  '#ff734f',
  '#f7f4d0',
] as const

export const QUATTRO_CLAY_PALETTE = [
  '#68717f',
  '#7b8594',
  '#929dab',
  '#a9b3bf',
] as const

export function createQuattroMaterials(
  surfaceTexture: Texture,
  clayReview = false,
) {
  const standard = (color: string, roughness: number, metalness = 0.02) =>
    new MeshStandardNodeMaterial({
      bumpMap: surfaceTexture,
      bumpScale: 0.001,
      color: new Color(color),
      emissive: new Color(clayReview ? '#000000' : '#180823'),
      emissiveIntensity: clayReview ? 0 : 0.045,
      metalness,
      roughness,
    })

  const signals = clayReview
    ? new MeshStandardNodeMaterial({
        color: new Color('#a9b3bf'),
        metalness: 0,
        roughness: 0.78,
      })
    : new MeshBasicNodeMaterial({
        blending: AdditiveBlending,
        color: new Color('#ffffff'),
        depthWrite: false,
        opacity: 0.92,
        transparent: true,
      })

  return {
    clouds: standard('#ffffff', 0.74),
    horizon: standard('#ffffff', 0.92),
    landmark: standard('#ffffff', 0.64, 0.08),
    signals,
    terrain: standard('#ffffff', 0.9),
    vegetation: standard('#ffffff', 0.82),
  }
}

export function createQuattroCarMaterials(
  surfaceTexture: Texture,
  clayReview = false,
) {
  const body = new MeshStandardNodeMaterial({
    bumpMap: surfaceTexture,
    bumpScale: clayReview ? 0.004 : 0.009,
    color: new Color(clayReview ? '#929dab' : '#ffffff'),
    emissive: new Color(clayReview ? '#000000' : '#1b0732'),
    emissiveIntensity: clayReview ? 0 : 0.11,
    metalness: clayReview ? 0.02 : 0.32,
    roughness: clayReview ? 0.72 : 0.42,

  })
  const glass = new MeshStandardNodeMaterial({
    color: new Color(clayReview ? '#7b8594' : '#ffffff'),
    emissive: new Color(clayReview ? '#000000' : '#15173d'),
    emissiveIntensity: clayReview ? 0 : 0.14,
    metalness: 0.12,
    roughness: clayReview ? 0.68 : 0.18,
  })
  const trim = new MeshStandardNodeMaterial({
    color: new Color(clayReview ? '#68717f' : '#ffffff'),
    metalness: clayReview ? 0.02 : 0.14,
    roughness: clayReview ? 0.78 : 0.5,
  })
  const tires = new MeshStandardNodeMaterial({
    color: new Color(clayReview ? '#59616d' : '#ffffff'),
    metalness: clayReview ? 0 : 0.08,
    roughness: clayReview ? 0.84 : 0.68,
  })
  const lamps = clayReview
    ? new MeshStandardNodeMaterial({
        color: new Color('#a9b3bf'),
        roughness: 0.66,
      })
    : new MeshBasicNodeMaterial({
        blending: AdditiveBlending,
        color: new Color('#ffffff'),
        depthWrite: false,
        opacity: 0.94,
        transparent: true,
      })

  return { body, glass, lamps, tires, trim }
}
