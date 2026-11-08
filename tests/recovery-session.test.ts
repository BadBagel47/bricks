import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseRecoverySession } from '../src/multiplayer/recovery-session.ts'

test('server recovery state rejects malformed or client-only phases', () => {
  const session = { matchId: 'a'.repeat(32), phase: 'paused', interruptedAt: 100 }
  assert.deepEqual(parseRecoverySession(session), session)
  assert.equal(parseRecoverySession(null), null)
  for (const bad of [{ ...session, phase: 'playing' }, { ...session, matchId: 'x' }, { ...session, interruptedAt: -1 }, { ...session, interruptedAt: 1.5 }, { ...session, extra: true }, {}]) assert.throws(() => parseRecoverySession(bad))
  const resumed = { ...session, phase: 'resumed', resumedAt: 110, hostConnection: 'b'.repeat(32), guestConnection: 'c'.repeat(32), battleFrame: 0 }
  assert.deepEqual(parseRecoverySession(resumed), resumed)
  for (const bad of [{ ...resumed, resumedAt: 99 }, { ...resumed, hostConnection: '' }, { ...resumed, battleFrame: -1 }, { ...resumed, extra: true }]) assert.throws(() => parseRecoverySession(bad))
})
