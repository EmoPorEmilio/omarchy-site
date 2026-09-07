import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sampleCompactCamera } from '../src/lib/compact-world-camera.ts'

const portal = [-5.3, .1, -11.5]
const bleak = { position: [-27, 9.1, 5], target: [-5.3, -1.25, -11.9], fov: 36 }
const quattro = { position: [14, 9.5, 16], target: [2.2, .2, -25], fov: 39.64 }
const closePose = (a, b) => {
  for (const key of ['position', 'target']) a[key].forEach((value, i) => assert.ok(Math.abs(value - b[key][i]) < 1e-10))
  assert.ok(Math.abs(a.fov - b.fov) < 1e-10)
}
for (const [direction, from, to] of [[-1, bleak, quattro], [1, quattro, bleak]]) {
  const at = (phase, phaseProgress, arrivalProgress = 0) => sampleCompactCamera({ phase, phaseProgress, arrivalProgress, direction }, from, to, portal)
  test(`direction ${direction}: settled endpoints and every phase join remain continuous`, () => {
    closePose(at('approach', 0), from)
    closePose(at('approach', 1), at('crossing', 0))
    closePose(at('crossing', 1), at('arrival', 0))
    closePose(at('arrival', 1, .6), at('settle', 0, .6))
    closePose(at('settle', 1, 1), to)
    closePose(at('settled', 1), to)
  })
  test(`direction ${direction}: physical plane crossing stays level and commits at midpoint`, () => {
    assert.ok((at('crossing', 0).position[0] - portal[0]) * direction > 0)
    assert.equal(at('crossing', .5).position[0], portal[0])
    assert.ok((at('crossing', 1).position[0] - portal[0]) * direction < 0)
    for (let i = 0; i <= 100; i++) {
      const pose = at('crossing', i / 100)
      assert.equal(pose.position[1], portal[1] + .5)
      assert.equal(pose.position[2], portal[2])
      assert.deepEqual(pose.target, at('crossing', 0).target)
      assert.equal(pose.fov, 48)
    }
  })
  test(`direction ${direction}: arrival cannot overshoot into the former lateral orbit`, () => {
    const exit = at('crossing', 1)
    for (let i = 0; i <= 100; i++) {
      const pose = at('arrival', 0, i / 100)
      for (const key of ['position', 'target']) pose[key].forEach((value, axis) => {
        assert.ok(Number.isFinite(value))
        assert.ok(value >= Math.min(exit[key][axis], to[key][axis]) - 1e-10)
        assert.ok(value <= Math.max(exit[key][axis], to[key][axis]) + 1e-10)
      })
      assert.ok(pose.fov <= 48)
    }
  })
}
