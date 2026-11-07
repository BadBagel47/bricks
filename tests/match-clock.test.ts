import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MatchClock } from '../src/multiplayer/match-clock.ts'

test('paused match time excludes the interruption and repeated pause/resume does not change it', () => {
  const clock = new MatchClock(500, 1000)
  assert.equal(clock.frame(1500), 60)
  clock.pause(1500); clock.pause(2000)
  assert.equal(clock.frame(31000), 60)
  clock.resume(31000); clock.resume(31500)
  assert.equal(clock.frame(32000), 120)
  assert.throws(() => clock.frame(30999))
})

test('match time is clamped until countdown ends and retains fractions across pauses', () => {
  const clock = new MatchClock(-500, 1000)
  assert.equal(clock.frame(1200), 0)
  clock.pause(1400); clock.resume(2000)
  assert.equal(clock.frame(2200), 6)
  assert.throws(() => new MatchClock(NaN, 0))
})
