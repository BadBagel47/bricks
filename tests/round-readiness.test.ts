import assert from 'node:assert/strict'
import { test } from 'node:test'
import { approvalRoundId, bothReady, freshSeed, parseReadiness, previousRoundId, readyForRound } from '../src/multiplayer/round-readiness.ts'
import { isApproved, DEFAULT_MATCH_SETTINGS } from '../src/multiplayer/match-settings.ts'
import { initialMatchState, parseMatchStart } from '../src/multiplayer/match-start.ts'
import type { MatchStart } from '../src/multiplayer/match-start.ts'

const hc = 'b'.repeat(32), gc = 'c'.repeat(32)
const previousId = 'd'.repeat(32)
const start: MatchStart = { id: 'a'.repeat(32), roundVersion: 1, previousId, status: 'countdown', seed: 47, countdownAt: 10000, settings: DEFAULT_MATCH_SETTINGS, roleRevision: 2, hostUid: 'host', guestUid: 'guest', hostConnection: hc, guestConnection: gc }
const readiness = { host: { uid: 'host', connection: hc, previousId, roleRevision: 2 }, guest: { uid: 'guest', connection: gc, previousId, roleRevision: 2 } }
const connections = { host: { [hc]: true }, guest: { [gc]: true } }
test('both participants need consent for this previous match, role generation and exact live connection', () => {
  assert.equal(bothReady(start, readiness, connections), true)
  assert.equal(bothReady(start, { host: readiness.host }, connections), false)
  assert.equal(bothReady(start, { ...readiness, guest: { ...readiness.guest, previousId: '-' } }, connections), false)
  assert.equal(bothReady({ ...start, roleRevision: 3 }, readiness, connections), false)
  assert.equal(bothReady(start, readiness, { ...connections, guest: {} }), false)
  assert.equal(readyForRound(readiness.host, 'host', previousId, 2, connections, gc), false)
})
test('approval is consumed per attempted round, stays bound during countdown, and cannot survive rematch cancellation', () => {
  assert.equal(previousRoundId(null), '-')
  assert.equal(approvalRoundId(start), previousId)
  assert.equal(approvalRoundId({ ...start, status: 'cancelled' }), start.id)
  const approval = { revision: 0, roleRevision: 2, hostUid: 'host', guestUid: 'guest', roundId: previousId }
  assert.equal(isApproved(DEFAULT_MATCH_SETTINGS, approval, 'host', 'guest', 2, previousId), true)
  assert.equal(isApproved(DEFAULT_MATCH_SETTINGS, approval, 'host', 'guest', 2, start.id), false)
  assert.equal(isApproved(DEFAULT_MATCH_SETTINGS, { ...approval, roundId: undefined }, 'host', 'guest', 2, previousId), false)
})
test('new shared seeds differ even on repeated random output, including uint32 wrap', () => {
  assert.equal(freshSeed(47, 47), 48)
  assert.equal(freshSeed(47, 123), 123)
  assert.equal(freshSeed(0xffffffff, 0xffffffff), 0)
  assert.equal(freshSeed(undefined, 47), 47)
})
test('new round metadata parses strictly, legacy starts remain cancellable, and new engines reset all play state', () => {
  assert.deepEqual(parseMatchStart(start), start)
  const { roundVersion: _version, previousId: _previous, ...legacy } = start
  assert.deepEqual(parseMatchStart(legacy), legacy)
  for (const bad of [{ ...start, previousId: 'bad' }, { ...start, roundVersion: 2 }, { ...start, previousId: undefined }, { ...legacy, previousId }]) assert.throws(() => parseMatchStart(bad))
  assert.deepEqual(parseReadiness(readiness), readiness)
  assert.throws(() => parseReadiness({ ...readiness, unknown: readiness.host }))
  assert.throws(() => parseReadiness({ host: { ...readiness.host, extra: true } }))
  const game = initialMatchState({ ...start, seed: freshSeed(start.seed, start.seed) })
  assert.equal(game.score, 0); assert.equal(game.lines, 0); assert.equal(game.status, 'playing')
  assert.equal(game.held, null); assert.equal(game.holdUsed, false)
  assert.equal(game.board.flat().filter(Boolean).length, 0)
})
