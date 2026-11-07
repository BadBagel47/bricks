import assert from 'node:assert/strict'
import { test } from 'node:test'
import { recoveryTransition } from '../src/multiplayer/recovery.ts'

test('reconnection succeeds before the deadline and abandonment is final at the deadline', () => {
  const playing = { phase: 'playing' as const, disconnectedAt: null }
  const interrupted = recoveryTransition(playing, false, 1000)
  assert.deepEqual(interrupted, { phase: 'reconnecting', disconnectedAt: 1000 })
  assert.deepEqual(recoveryTransition(interrupted, true, 30999), playing)
  const abandoned = recoveryTransition(interrupted, true, 31000)
  assert.deepEqual(abandoned, { phase: 'abandoned', disconnectedAt: 1000 })
  assert.deepEqual(recoveryTransition(abandoned, true, 31001), abandoned)
})

test('a repeated disconnected observation never extends the deadline', () => {
  const state = { phase: 'reconnecting' as const, disconnectedAt: 1000 }
  assert.deepEqual(recoveryTransition(state, false, 20000), state)
  assert.equal(recoveryTransition(state, false, 31000).phase, 'abandoned')
  assert.throws(() => recoveryTransition(state, true, -1))
  assert.throws(() => recoveryTransition(state, true, 999))
})
