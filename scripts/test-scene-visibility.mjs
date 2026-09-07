import assert from 'node:assert/strict'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import { advanceSceneVisibility, bootstrapSceneVisibility, SCENE_TIMEOUT_MS } from '../src/lib/scene-visibility.ts'
import { CRAWLER_PATTERN, LAST_WORLD_KEY } from '../src/lib/experience-preferences.ts'

const events = ['frame-ready', 'fallback-ready', 'presented', 'reveal-finished', 'fail-open']

test('live and fallback handoffs reveal exactly once and cannot return to loading', () => {
  for (const [ready, revealing, settled] of [
    ['frame-ready', 'revealing-live', 'live'],
    ['fallback-ready', 'revealing-fallback', 'fallback'],
  ]) {
    let state = advanceSceneVisibility('loading', ready)
    assert.equal(state, settled === 'live' ? 'presenting-live' : 'presenting-fallback')
    assert.equal(advanceSceneVisibility(state, 'reveal-finished'), state)
    state = advanceSceneVisibility(state, 'presented')
    assert.equal(state, revealing)
    state = advanceSceneVisibility(state, 'reveal-finished')
    assert.equal(state, settled)
    for (const event of events) assert.equal(advanceSceneVisibility(state, event), settled)
  }
})

test('timeout wins against a late renderer and never replaces an already visible scene', () => {
  let state = advanceSceneVisibility('loading', 'fail-open')
  assert.equal(state, 'fallback')
  for (const event of events) assert.equal(advanceSceneVisibility(state, event), 'fallback')
  assert.equal(advanceSceneVisibility('revealing-live', 'fail-open'), 'revealing-live')
})

function boot({ agent = 'Mozilla/5.0 Chrome/144.0.0.0', saved = null, denied = false, path = '/' } = {}) {
  const root = { dataset: {} }
  let timeout
  let emitted = 0
  const storage = { getItem: () => { if (denied) throw Error('denied'); return saved } }
  const window = {
    localStorage: storage, sessionStorage: storage,
    setTimeout: (callback, delay) => { timeout = { callback, delay }; return 1 },
    dispatchEvent: () => { emitted++ },
  }
  // The exact standalone script form used by SSR must work without application imports.
  runInNewContext(`(${bootstrapSceneVisibility.toString()})(${JSON.stringify(CRAWLER_PATTERN.source)},${JSON.stringify(LAST_WORLD_KEY)},${SCENE_TIMEOUT_MS});`, {
    window, document: { documentElement: root }, navigator: { userAgent: agent }, location: { pathname: path }, Event,
  })
  return { root, window, timeout, emissions: () => emitted }
}

test('bootstrap establishes loading and saved world without waiting for body or hydration', () => {
  const { root, window, timeout } = boot({ saved: 'quattro' })
  assert.equal(root.dataset.sceneState, 'loading')
  assert.equal(root.dataset.world, 'quattro')
  assert.equal(timeout.delay, SCENE_TIMEOUT_MS)
  assert.ok(window.__omarchySceneBoot.deadline >= Date.now())
})

test('failed hydration exposes SSR content, while late watchdogs leave a revealed scene alone', () => {
  const failed = boot()
  failed.timeout.callback()
  assert.equal(failed.root.dataset.sceneState, 'fallback')
  assert.equal(failed.emissions(), 1)
  const ready = boot()
  ready.root.dataset.sceneState = 'revealing-live'
  ready.timeout.callback()
  assert.equal(ready.root.dataset.sceneState, 'revealing-live')
  assert.equal(ready.emissions(), 0)
})

test('crawler, other routes, and denied storage preserve access to the page', () => {
  for (const config of [{ agent: 'Googlebot/2.1' }, { agent: 'GPTBot/1.0' }, { path: '/missing' }]) {
    const result = boot(config)
    assert.equal(result.root.dataset.sceneState, undefined)
    assert.equal(result.timeout, undefined)
  }
  assert.equal(boot({ denied: true }).root.dataset.sceneState, 'loading')
})
