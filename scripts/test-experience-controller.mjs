// Node 24 executes this TypeScript module directly; no test dependency needed.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EXPERIENCE_TIMING, ExperienceController, sampleExperience } from '../src/lib/experience-controller.ts'

test('opening crosses quickly, drives forward and reveals content once', () => {
  const controller = new ExperienceController()
  controller.startIntro()
  assert.equal(controller.state.contentVisibility, 0)
  controller.update(1275)
  assert.equal(controller.state.committedWorld, 'quattro')
  controller.update(1075)
  assert.equal(controller.state.carProgress, 0)
  controller.update(2950)
  assert.ok(controller.state.carProgress > 0 && controller.state.carProgress < 1)
  assert.ok(controller.state.contentVisibility > 0 && controller.state.contentVisibility < 1)
  controller.update(1400)
  assert.equal(controller.state.mode, 'settled')
  assert.equal(controller.state.contentVisibility, 1)
  assert.equal(controller.state.committedWorld, 'quattro')
  assert.equal(controller.state.carProgress, 1)
})

test('reveal overlaps arrival and car motion continues smoothly through the final handoff', () => {
  for (const mode of ['intro', 'travel']) {
    const timing = EXPERIENCE_TIMING[mode]
    const at = (elapsed) => sampleExperience({
      mode, from: 'bleak', to: 'quattro', progress: elapsed / timing.durationMs,
    })
    assert.equal(at(timing.revealStartMs).contentVisibility, 0)
    const overlap = at((timing.revealStartMs + timing.settleStartMs) / 2)
    assert.equal(overlap.phase, 'arrival')
    assert.ok(overlap.contentVisibility > 0 && overlap.contentVisibility < 1)
    assert.ok(overlap.carProgress > 0 && overlap.carProgress < 1)

    // The semantic arrival/settle boundary must not reset or pause either signal.
    const before = at(timing.settleStartMs - 1)
    const boundary = at(timing.settleStartMs)
    const after = at(timing.settleStartMs + 1)
    for (const signal of ['carProgress', 'contentVisibility']) {
      assert.ok(before[signal] < boundary[signal] && boundary[signal] < after[signal])
      const leftStep = boundary[signal] - before[signal]
      const rightStep = after[signal] - boundary[signal]
      assert.ok(Math.abs(leftStep - rightStep) < 0.00001)
    }

    let previous = at(timing.driveStartMs)
    for (let elapsed = timing.driveStartMs + 10; elapsed < timing.durationMs; elapsed += 10) {
      const next = at(elapsed)
      assert.ok(next.carProgress > previous.carProgress && next.carProgress < 1)
      assert.ok(next.contentVisibility >= previous.contentVisibility)
      previous = next
    }
    const nearEnd = at(timing.durationMs - 1)
    const endpoint = at(timing.durationMs)
    assert.ok(nearEnd.carProgress < 1 && nearEnd.contentVisibility < 1)
    assert.ok(1 - nearEnd.carProgress < 0.00001)
    assert.ok(1 - nearEnd.contentVisibility < 0.00001)
    assert.equal(endpoint.carProgress, 1)
    assert.equal(endpoint.contentVisibility, 1)
    assert.equal(endpoint.busy, false)
  }
})

test('both directions commit once and remain repeatable over three cycles', () => {
  const controller = new ExperienceController('quattro')
  for (let cycle = 0; cycle < 3; cycle++) {
    for (const target of ['bleak', 'quattro']) {
      assert.equal(controller.startTravel(target), true)
      let previous = controller.state.committedWorld
      let commits = 0
      let lastCar = target === 'quattro' ? 0 : 1
      while (controller.state.busy) {
        const state = controller.update(25)
        if (previous !== state.committedWorld) commits++
        previous = state.committedWorld
        assert.ok(state.carProgress >= lastCar)
        lastCar = state.carProgress
      }
      assert.equal(commits, 1)
      assert.equal(controller.state.committedWorld, target)
      assert.equal(controller.state.contentVisibility, 1)
      assert.equal(controller.state.carProgress, 1)
    }
  }
})

test('busy and same-world requests are ignored without resetting progress', () => {
  const controller = new ExperienceController('quattro')
  assert.equal(controller.startTravel('quattro'), false)
  controller.startTravel('bleak')
  controller.update(500)
  const before = controller.state
  assert.equal(controller.startTravel('bleak'), false)
  assert.equal(controller.startTravel('quattro'), false)
  assert.equal(controller.startIntro(), false)
  assert.equal(controller.state, before)
})

test('skip before or after threshold atomically settles to the requested destination', () => {
  for (const initial of ['bleak', 'quattro']) {
    const target = initial === 'bleak' ? 'quattro' : 'bleak'
    for (const elapsed of [200, 1900]) {
      const controller = new ExperienceController(initial)
      controller.startTravel(target)
      controller.update(elapsed)
      const state = controller.skip()
      assert.equal(state.committedWorld, target)
      assert.equal(state.mode, 'settled')
      assert.equal(state.busy, false)
      assert.equal(state.contentVisibility, 1)
      assert.equal(state.carProgress, 1)
      assert.deepEqual(controller.update(10000), state)
    }
  }
})

test('seek and scaled playback use the same evaluator; paused time does not advance', () => {
  const controller = new ExperienceController('quattro')
  controller.startTravel('bleak', 0.5)
  const before = controller.state
  assert.equal(controller.update(0), before)
  assert.equal(controller.update(-100), before)
  assert.equal(controller.update(Number.NaN), before)
  const actual = controller.update(900)
  const expected = sampleExperience({ mode: 'travel', from: 'quattro', to: 'bleak', progress: 0.5, durationScale: 0.5 })
  assert.deepEqual(actual, expected)
  assert.deepEqual(controller.seek(0.5), expected)
  controller.seek(1)
  assert.equal(controller.state.mode, 'settled')
  assert.deepEqual(controller.seek(0.5), expected)
})
