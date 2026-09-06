import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { test } from 'node:test'
import { ExperienceController, sampleExperience } from '../src/lib/experience-controller.ts'

// Match the app's bundler resolution for this TypeScript module under Node 24.
registerHooks({ resolve(specifier, context, next) {
  return next(specifier === './experience-controller' ? './experience-controller.ts' : specifier, context)
} })
const { sampleWorldPresentation } = await import('../src/lib/world-presentation.ts')
const at = (ms, from = 'bleak', to = 'quattro') => sampleWorldPresentation(sampleExperience({
  mode: 'travel', from, to, progress: ms / 3600,
}))

test('appearance spans approach and arrival with an exact geometric midpoint', () => {
  assert.equal(at(450).quattroMix, 0)
  assert.ok(at(700).quattroMix > 0)
  assert.equal(at(1200).quattroMix, .5)
  assert.equal(at(1200).thresholdVeil, 1)
  assert.ok(at(1700).quattroMix < 1)
  assert.equal(at(1950).quattroMix, 1)
  assert.equal(at(1950).thresholdVeil, 0)
})

test('forward and reverse appearance are complementary, monotonic and bounded', () => {
  let previous = 0
  for (let ms = 0; ms <= 3600; ms += 5) {
    const forward = at(ms)
    const reverse = at(ms, 'quattro', 'bleak')
    assert.ok(forward.quattroMix >= previous && forward.quattroMix <= 1)
    assert.ok(Math.abs(forward.quattroMix + reverse.quattroMix - 1) < 1e-12)
    assert.equal(forward.thresholdVeil, reverse.thresholdVeil)
    assert.ok(forward.thresholdVeil >= 0 && forward.thresholdVeil <= 1)
    previous = forward.quattroMix
  }
})

test('skip and settlement publish exact endpoints before or after commit', () => {
  for (const target of ['bleak', 'quattro']) for (const ms of [300, 1400, 2900]) {
    const controller = new ExperienceController(target === 'bleak' ? 'quattro' : 'bleak')
    controller.startTravel(target)
    controller.update(ms)
    assert.deepEqual(sampleWorldPresentation(controller.skip()), {
      quattroMix: target === 'quattro' ? 1 : 0, thresholdVeil: 0,
    })
  }
})

test('sampling does not depend on frame increments or duration scaling', () => {
  const controller = new ExperienceController('bleak')
  controller.startTravel('quattro', .5)
  const stepped = sampleWorldPresentation(controller.update(600))
  assert.deepEqual(stepped, at(1200))
  assert.deepEqual(sampleWorldPresentation(controller.seek(1 / 3)), stepped)
  const diagnostic = sampleExperience({ mode: 'intro', from: 'bleak', to: 'quattro', progress: 1275 / 6700 })
  assert.equal(sampleWorldPresentation(diagnostic).quattroMix, .5)
})
