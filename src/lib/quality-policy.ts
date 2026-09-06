export type QualityTier = 'full' | 'constrained'

export interface QualityPolicy {
  dpr: number
  environmentDensity: number
  idleMotion: boolean
  introDurationScale: number
  reducedMotion: boolean
  tier: QualityTier
}

interface NavigatorWithMemory extends Navigator {
  deviceMemory?: number
}

export function createQualityPolicy(viewportWidth: number): QualityPolicy {
  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches
  const navigatorWithMemory = navigator as NavigatorWithMemory
  const constrained =
    viewportWidth < 1024 ||
    navigator.hardwareConcurrency <= 4 ||
    (navigatorWithMemory.deviceMemory !== undefined &&
      navigatorWithMemory.deviceMemory <= 4)
  const tier: QualityTier = constrained ? 'constrained' : 'full'

  return {
    dpr: Math.min(window.devicePixelRatio, constrained ? 1 : 1.5),
    environmentDensity: constrained ? 0.58 : 1,
    idleMotion: !reducedMotion && !constrained,
    introDurationScale: constrained ? 0.78 : 1,
    reducedMotion,
    tier,
  }
}

export function shouldForceRendererFallback() {
  return (
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get('renderer') === 'fallback'
  )
}
