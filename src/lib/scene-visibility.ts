export type SceneVisibility = 'loading' | 'presenting-live' | 'presenting-fallback' | 'revealing-live' | 'revealing-fallback' | 'live' | 'fallback'
export type SceneVisibilityEvent = 'frame-ready' | 'fallback-ready' | 'presented' | 'reveal-finished' | 'fail-open'

export const SCENE_REVEAL_MS = 240
export const SCENE_TIMEOUT_MS = 30000

/** Readiness is one-way: a late renderer cannot replace a settled fallback. */
export function advanceSceneVisibility(state: SceneVisibility, event: SceneVisibilityEvent): SceneVisibility {
  if (state === 'loading') {
    if (event === 'frame-ready') return 'presenting-live'
    if (event === 'fallback-ready') return 'presenting-fallback'
    if (event === 'fail-open') return 'fallback'
  }
  if (event === 'presented') {
    if (state === 'presenting-live') return 'revealing-live'
    if (state === 'presenting-fallback') return 'revealing-fallback'
  }
  if (event === 'reveal-finished') {
    if (state === 'revealing-live') return 'live'
    if (state === 'revealing-fallback') return 'fallback'
  }
  return state
}

declare global {
  interface Window {
    __omarchySceneBoot?: { timer: number; deadline: number }
  }
}

/** Serialized into the head; keep this function independent of module scope. */
export function bootstrapSceneVisibility(crawlerPattern: string, lastWorldKey: string, timeout: number, development = false) {
  if (location.pathname !== '/' || new RegExp(crawlerPattern, 'i').test(navigator.userAgent)) return
  const root = document.documentElement
  root.dataset.sceneState = 'loading'
  if (development && new URLSearchParams(location.search).get('capture') === '1') timeout *= 2
  for (const storage of ['localStorage', 'sessionStorage'] as const) {
    try {
      const saved = window[storage].getItem(lastWorldKey)
      if (saved !== null) {
        root.dataset.world = saved === 'quattro' ? 'quattro' : 'bleak'
        break
      }
    } catch { /* Private browsing may deny storage. */ }
  }
  // Even a failed hydration bundle must eventually expose the complete SSR page.
  window.__omarchySceneBoot = {
    deadline: Date.now() + timeout,
    timer: window.setTimeout(() => {
      if (root.dataset.sceneState !== 'loading') return
      root.dataset.sceneState = 'fallback'
      window.dispatchEvent(new Event('omarchy-scene-timeout'))
    }, timeout),
  }
}
