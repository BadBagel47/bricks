import assert from 'node:assert/strict'
import { test } from 'node:test'
import { countdownSeconds, initialMatchState, MAX_START_CATCH_UP_MS, parseMatchStart, startCatchUp, startStillValid } from '../src/multiplayer/match-start.ts'
import { advanceGame, createGame } from '../src/engine/index.ts'
import type { MatchStart } from '../src/multiplayer/match-start.ts'
import { DEFAULT_MATCH_SETTINGS } from '../src/multiplayer/match-settings.ts'
import type { Room } from '../src/multiplayer/room-model.ts'
import { drawPiece } from '../src/engine/rng.ts'

const start: MatchStart = { id: 'a'.repeat(32), status: 'countdown', seed: 47, countdownAt: 10000, settings: DEFAULT_MATCH_SETTINGS, roleRevision: 0, hostUid: 'host', guestUid: 'guest', hostConnection: 'b'.repeat(32), guestConnection: 'c'.repeat(32) }
const room: Room = { version: 1, ownerUid: 'host', hostUid: 'host', epoch: 1, createdAt: 1, status: 'waiting', players: { host: { uid: 'host', name: 'Host' }, guest: { uid: 'guest', name: 'Guest' } } }
const connections = { host: { [start.hostConnection]: true }, guest: { [start.guestConnection]: true } }
test('a shared server timestamp determines countdown regardless of local clock offset', () => {
  assert.equal(countdownSeconds(start, 10000), 5)
  assert.equal(countdownSeconds(start, 14001), 1)
  assert.equal(countdownSeconds(start, 15000), 0)
  assert.equal(countdownSeconds(start, 9000 + 1000), 5)
})
test('frozen identities, roles, settings and exact connections must remain valid', () => {
  assert.equal(startStillValid(start, room, DEFAULT_MATCH_SETTINGS, connections), true)
  assert.equal(startStillValid(start, { ...room, roleRevision: 2 }, DEFAULT_MATCH_SETTINGS, connections), false)
  assert.equal(startStillValid(start, room, { ...DEFAULT_MATCH_SETTINGS, revision: 1 }, connections), false)
  assert.equal(startStillValid(start, room, DEFAULT_MATCH_SETTINGS, { ...connections, guest: { ['d'.repeat(32)]: true } }), false)
})
test('both participants derive identical initial boards and seeded continuation; malformed starts fail closed', () => {
  const a = initialMatchState(start), b = initialMatchState(start)
  assert.deepEqual(a, b)
  assert.equal(a.score, 0)
  let rngA = a.randomizer, rngB = b.randomizer
  for (let i = 0; i < 100; i++) {
    const nextA = drawPiece(rngA), nextB = drawPiece(rngB)
    assert.equal(nextA.piece, nextB.piece)
    rngA = nextA.randomizer; rngB = nextB.randomizer
  }
  assert.deepEqual(parseMatchStart(start), start)
  for (const bad of [{ ...start, seed: -1 }, { ...start, extra: true }, { ...start, guestUid: 'host' }, { ...start, settings: { ...DEFAULT_MATCH_SETTINGS, hold: true } }]) assert.throws(() => parseMatchStart(bad))
})

test('clients that mount a round at different moments share one gravity timeline (B-002)', () => {
  assert.equal(startCatchUp(start, 14000), 0, 'nothing elapses before the countdown ends')
  assert.equal(startCatchUp(start, 15100), 100)
  assert.equal(startCatchUp(start, 60000), MAX_START_CATCH_UP_MS, 'late mounts are capped')
  assert.equal(startCatchUp(start, Number.NaN), 0)
  // Host sees "ready" at 15 100 ms, guest 450 ms later; both then run for the
  // same wall-clock time until 17 000 ms of shared time.
  const fresh = () => createGame({ seed: start.seed, startLevel: 5, holdEnabled: false, hardDropEnabled: true })
  const host = advanceGame(advanceGame(fresh(), startCatchUp(start, 15100)).state, 1900).state
  const guest = advanceGame(advanceGame(fresh(), startCatchUp(start, 15550)).state, 1450).state
  assert.deepEqual(guest.active, host.active)
  // Without the catch-up the guest would trail by the delivery delay.
  const late = advanceGame(fresh(), 1450).state
  assert.notDeepEqual(late.active, host.active)
})
