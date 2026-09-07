import type { WorldId } from './experience-controller'

// Retain the existing key so people who watched this version are not reset.
export const INTRO_SEEN_KEY = 'omarchy-intro-seen-v2'
export const LAST_WORLD_KEY = 'omarchy-last-world-v1'
export const CRAWLER_PATTERN = /bot\b|crawler|spider|slurp|facebookexternalhit|bingpreview|google-inspectiontool|chatgpt-user|claude-user|perplexity-user|whatsapp|telegram|embedly|pinterest|vkshare|w3c_validator/i

function read(key: string): string | null {
  if (typeof window === 'undefined') return null
  for (const storage of ['localStorage', 'sessionStorage'] as const) {
    try {
      const value = window[storage].getItem(key)
      if (value !== null) return value
    } catch { /* Storage can be unavailable in private or restricted contexts. */ }
  }
  return null
}

function write(key: string, value: string) {
  if (typeof window === 'undefined') return
  for (const storage of ['localStorage', 'sessionStorage'] as const) {
    try { window[storage].setItem(key, value) } catch { /* The page remains usable without persistence. */ }
  }
}

export function readExperiencePreferences(): { introSeen: boolean; world: WorldId } {
  const introSeen = read(INTRO_SEEN_KEY) === '1'
  const savedWorld = read(LAST_WORLD_KEY)
  // Migrate the previous session-only flag to persistent storage when possible.
  if (introSeen) write(INTRO_SEEN_KEY, '1')
  return { introSeen, world: savedWorld === 'quattro' ? 'quattro' : 'bleak' }
}

export function markIntroSeen() { write(INTRO_SEEN_KEY, '1') }
export function rememberWorld(world: WorldId) { write(LAST_WORLD_KEY, world) }

/** Presentation optimization only: every visitor receives the same page content. */
export function isCrawler(userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent) {
  return CRAWLER_PATTERN.test(userAgent)
}
