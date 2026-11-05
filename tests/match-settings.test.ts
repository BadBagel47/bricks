import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEFAULT_MATCH_SETTINGS, isApproved, parseSettings, sameSettings } from '../src/multiplayer/match-settings.ts'
test('settings validation rejects malformed or out-of-range values', () => {
  assert.equal(parseSettings(null), DEFAULT_MATCH_SETTINGS)
  const valid = { ...DEFAULT_MATCH_SETTINGS, revision: 1 }
  assert.deepEqual(parseSettings(valid), valid)
  for (const invalid of [{ ...valid, startLevel: 20 }, { ...valid, hold: 1 }, { ...valid, mode: 'other' }, { ...valid, extra: true }, { ...valid, revision: -1 }]) assert.throws(() => parseSettings(invalid))
})
test('approval expires on effective edits or any host handover, including transfer back', () => {
  const settings = { ...DEFAULT_MATCH_SETTINGS, revision: 1, requireApproval: true }
  const approval = { revision: 1, roleRevision: 0, hostUid: 'host', guestUid: 'guest' }
  assert.equal(isApproved(settings, approval, 'host', 'guest'), true)
  assert.equal(isApproved({ ...settings, revision: 2 }, approval, 'host', 'guest'), false)
  assert.equal(isApproved(settings, approval, 'host', 'guest', 2), false)
  assert.equal(isApproved(settings, approval, 'host', 'replacement'), false)
  assert.equal(sameSettings(settings, { ...settings, revision: 2 }), true)
})
