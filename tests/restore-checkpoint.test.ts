import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BattleGame } from '../src/engine/battle.ts'
import { createGame } from '../src/engine/game.ts'
import { captureBattleCheckpoint } from '../src/multiplayer/battle-checkpoint.ts'
import { encodeCheckpoint } from '../src/multiplayer/checkpoint-repository.ts'
import { snapshotContent } from '../src/multiplayer/game-snapshot.ts'
import { restoreCheckpoint } from '../src/multiplayer/restore-checkpoint.ts'
import type { MatchStart } from '../src/multiplayer/match-start.ts'
import type { JoinedRoom } from '../src/multiplayer/room-model.ts'

const start: MatchStart = { id: 'a'.repeat(32), status: 'ready', seed: 47, countdownAt: 10000, settings: { revision: 0, mode: 'score-duel', startLevel: 0, hold: false, requireApproval: false }, roleRevision: 0, hostUid: 'host', guestUid: 'guest', hostConnection: 'b'.repeat(32), guestConnection: 'c'.repeat(32) }
const joined: JoinedRoom = { code: 'BRKS', uid: 'host', room: { version: 1, ownerUid: 'host', hostUid: 'host', epoch: 1, createdAt: 1, status: 'waiting', players: { host: { uid: 'host', name: 'Host' }, guest: { uid: 'guest', name: 'Guest' } } } }
const game = createGame({ seed: 47 })
const snapshot = { ...snapshotContent(game), matchId: start.id, connection: start.hostConnection, seq: 1, updatedAt: 100 }
const record = { matchId: start.id, connection: start.hostConnection, seq: 1, payload: encodeCheckpoint(game, null), updatedAt: 100 }
const streams = { own: 0, opponent: 0 }

test('only a matching acknowledged snapshot and checkpoint can restore the game', () => {
  assert.deepEqual(restoreCheckpoint(record, snapshot, start, joined, streams).game, game)
  for (const bad of [{ ...record, seq: 2 }, { ...record, updatedAt: 101 }, { ...record, matchId: 'd'.repeat(32) }, { ...record, connection: start.guestConnection }, { ...record, payload: '{' }, { ...record, payload: encodeCheckpoint({ ...game, score: 100 }, null) }]) assert.throws(() => restoreCheckpoint(bad, snapshot, start, joined, streams))
  assert.throws(() => restoreCheckpoint(record, { ...snapshot, score: 20 }, start, joined, streams))
})

test('Battle recovery checks the saved game and confirmed attack prefixes', () => {
  const battleStart: MatchStart = { ...start, battleVersion: 1, settings: { ...start.settings, mode: 'battle', revision: 1 } }
  const battle = new BattleGame(createGame({ seed: 47 }), 47, 'guest')
  battle.receive(3); battle.advanceTo(20)
  const saved = captureBattleCheckpoint(battle, { matchId: start.id, uid: joined.uid, epoch: 1 }, { acknowledgedProduced: 0, committedSent: 0 })
  const battleSnapshot = { ...snapshot, ...snapshotContent(battle.game) }
  const battleRecord = { ...record, payload: encodeCheckpoint(battle.game, saved) }
  assert.equal(restoreCheckpoint(battleRecord, battleSnapshot, battleStart, joined, { own: 0, opponent: 3 }).battle?.battle.pending, 3)
  assert.throws(() => restoreCheckpoint(battleRecord, battleSnapshot, battleStart, joined, { own: 1, opponent: 3 }))
  assert.throws(() => restoreCheckpoint(battleRecord, battleSnapshot, battleStart, joined, { own: 0, opponent: 2 }))
  const tampered = JSON.parse(battleRecord.payload); tampered.battle.game = battle.game
  assert.throws(() => restoreCheckpoint({ ...battleRecord, payload: JSON.stringify(tampered) }, battleSnapshot, battleStart, joined, { own: 0, opponent: 3 }))
  assert.ok(battleRecord.payload.length < 1000)
})
