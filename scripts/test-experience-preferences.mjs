import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { INTRO_SEEN_KEY, LAST_WORLD_KEY, isCrawler, markIntroSeen, readExperiencePreferences, rememberWorld } from '../src/lib/experience-preferences.ts'

const storage = () => {
  const data = new Map()
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }
}
afterEach(() => { delete globalThis.window })

test('fresh visits start in The Barrens without browser globals', () => {
  assert.deepEqual(readExperiencePreferences(), { introSeen: false, world: 'bleak' })
  assert.doesNotThrow(() => { markIntroSeen(); rememberWorld('bleak') })
})

test('completed intro and last world survive a new browser session', () => {
  const localStorage = storage()
  globalThis.window = { localStorage, sessionStorage: storage() }
  markIntroSeen()
  rememberWorld('bleak')
  globalThis.window = { localStorage, sessionStorage: storage() }
  assert.deepEqual(readExperiencePreferences(), { introSeen: true, world: 'bleak' })
  rememberWorld('quattro')
  assert.equal(readExperiencePreferences().world, 'quattro')
})

test('existing session-only intro state migrates without replaying', () => {
  globalThis.window = { localStorage: storage(), sessionStorage: storage() }
  window.sessionStorage.setItem(INTRO_SEEN_KEY, '1')
  assert.equal(readExperiencePreferences().introSeen, true)
  assert.equal(window.localStorage.getItem(INTRO_SEEN_KEY), '1')
  window.sessionStorage = storage()
  assert.equal(readExperiencePreferences().introSeen, true)
})

test('unavailable storage and invalid saved worlds do not block the homepage', () => {
  globalThis.window = { localStorage: storage(), sessionStorage: storage() }
  window.localStorage.setItem(LAST_WORLD_KEY, 'invalid')
  assert.equal(readExperiencePreferences().world, 'bleak')
  Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('denied') } })
  markIntroSeen()
  rememberWorld('bleak')
  assert.deepEqual(readExperiencePreferences(), { introSeen: true, world: 'bleak' })
  Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('denied') } })
  assert.doesNotThrow(() => { markIntroSeen(); rememberWorld('bleak') })
  assert.deepEqual(readExperiencePreferences(), { introSeen: false, world: 'bleak' })
})

test('search and social crawlers get static presentation without classifying regular Chrome as a crawler', () => {
  for (const ua of ['Googlebot/2.1', 'bingbot/2.0', 'Twitterbot/1.0', 'facebookexternalhit/1.1', 'GPTBot/1.0', 'ChatGPT-User/1.0', 'ClaudeBot/1.0', 'PerplexityBot/1.0', 'Discordbot/2.0']) assert.equal(isCrawler(ua), true, ua)
  assert.equal(isCrawler('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/144.0.0.0 Safari/537.36'), false)
})
