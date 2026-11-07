import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseControlLease } from '../src/multiplayer/control-lease.ts'

test('control leases reject corrupt identities, revisions and extra fields', () => {
  const lease = { matchId: 'a'.repeat(32), connection: 'b'.repeat(32), revision: 1 }
  assert.deepEqual(parseControlLease(lease), lease)
  assert.equal(parseControlLease(null), null)
  for (const bad of [{ ...lease, matchId: 'x' }, { ...lease, connection: '' }, { ...lease, revision: 0 }, { ...lease, revision: 1.5 }, { ...lease, extra: true }, {}]) assert.throws(() => parseControlLease(bad))
})
