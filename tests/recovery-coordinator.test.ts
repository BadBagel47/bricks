import assert from 'node:assert/strict'
import { test } from 'node:test'
import { coordinateRecovery } from '../src/multiplayer/recovery-coordinator.ts'
import type { RecoverySession } from '../src/multiplayer/recovery-coordinator.ts'

const initial: RecoverySession = { matchId: 'a'.repeat(32), revision: 0, phase: 'playing', interruptedAt: null, hostCheckpoint: null, guestCheckpoint: null }
test('both connected players and both checkpoints are required to resume before the shared deadline', () => {
  const paused = coordinateRecovery(initial, 0, { type: 'interrupt', now: 1000 })!
  const host = coordinateRecovery(paused, 1, { type: 'checkpoint', role: 'host', id: 'b'.repeat(32) })!
  assert.equal(coordinateRecovery(host, 2, { type: 'resume', now: 2000, hostConnected: true, guestConnected: true }), null)
  const both = coordinateRecovery(host, 2, { type: 'checkpoint', role: 'guest', id: 'c'.repeat(32) })!
  assert.equal(coordinateRecovery(both, 3, { type: 'resume', now: 2000, hostConnected: true, guestConnected: false }), null)
  assert.equal(coordinateRecovery(both, 3, { type: 'resume', now: 30999, hostConnected: true, guestConnected: true })?.phase, 'playing')
  assert.equal(coordinateRecovery(both, 3, { type: 'resume', now: 31000, hostConnected: true, guestConnected: true })?.phase, 'abandoned')
})
test('stale revisions and repeated interruption cannot restart the grace period', () => {
  const paused = coordinateRecovery(initial, 0, { type: 'interrupt', now: 1000 })!
  assert.equal(coordinateRecovery(paused, 0, { type: 'checkpoint', role: 'host', id: 'b'.repeat(32) }), null)
  assert.equal(coordinateRecovery(paused, 1, { type: 'interrupt', now: 20000 }), null)
  assert.equal(coordinateRecovery(paused, 1, { type: 'expire', now: 30000 }), null)
  const abandoned = coordinateRecovery(paused, 1, { type: 'expire', now: 31000 })!
  assert.equal(coordinateRecovery(abandoned, 2, { type: 'resume', now: 31001, hostConnected: true, guestConnected: true }), null)
})
