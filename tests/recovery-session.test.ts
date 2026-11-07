import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseRecoverySession } from '../src/multiplayer/recovery-session.ts'

test('server recovery state rejects malformed or client-only phases', () => {
  const session = { matchId: 'a'.repeat(32), phase: 'paused', interruptedAt: 100 }
  assert.deepEqual(parseRecoverySession(session), session)
  assert.equal(parseRecoverySession(null), null)
  for (const bad of [{ ...session, phase: 'playing' }, { ...session, matchId: 'x' }, { ...session, interruptedAt: -1 }, { ...session, interruptedAt: 1.5 }, { ...session, extra: true }, {}]) assert.throws(() => parseRecoverySession(bad))
})
