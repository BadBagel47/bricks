import assert from 'node:assert/strict'
import { test } from 'node:test'
import { battleHighscores, duelHighscores, parseResults, readResults, recordResult, RESULT_STORAGE_KEY, ResultCollector, validResult } from '../src/multiplayer/results.ts'
import type { MatchResult } from '../src/multiplayer/results.ts'
import type { MatchStart } from '../src/multiplayer/match-start.ts'
import type { JoinedRoom } from '../src/multiplayer/room-model.ts'
import type { GameSnapshot } from '../src/multiplayer/game-snapshot.ts'

const start: MatchStart = { id: 'a'.repeat(32), status: 'ready', seed: 47, countdownAt: 10000, settings: { revision: 0, mode: 'score-duel', startLevel: 0, hold: false, requireApproval: false }, roleRevision: 0, hostUid: 'host', guestUid: 'guest', hostConnection: 'b'.repeat(32), guestConnection: 'c'.repeat(32) }
const joined: JoinedRoom = { code: 'BRKS', uid: 'host', room: { version: 1, ownerUid: 'host', hostUid: 'host', epoch: 1, createdAt: 1, status: 'waiting', players: { host: { uid: 'host', name: 'Original Host' }, guest: { uid: 'guest', name: 'Guest' } } } }
const own = { status: 'gameOver' as const, score: 100, level: 1, lines: 2 }
const other: GameSnapshot = { ...own, matchId: start.id, connection: start.guestConnection, seq: 1, board: '0'.repeat(200), next: 'I', held: '-', score: 40, updatedAt: 1 }
function completed(id = start.id): MatchResult {
  let result: MatchResult | null = null
  const collector = new ResultCollector({ ...start, id }, structuredClone(joined), value => { result = value })
  collector.opponent({ ...other, matchId: id }); collector.acknowledgeOwn(own)
  assert.ok(result)
  return result
}
function battle(id: string, a = 10, b = 20): MatchResult {
  const result = completed(id); result.mode = 'battle'
  result.players[0].battle = { frame: a, sent: 1, received: 0, applied: 0, cancelled: 0 }
  result.players[1].battle = { frame: b, sent: 0, received: 1, applied: 1, cancelled: 0 }
  result.players[0].outcome = a > b ? 'win' : a < b ? 'loss' : 'draw'
  result.players[1].outcome = a < b ? 'win' : a > b ? 'loss' : 'draw'
  return result
}
class MemoryStorage {
  value: string | null = null
  writes = 0
  getItem(key: string) { assert.equal(key, RESULT_STORAGE_KEY); return this.value }
  setItem(key: string, value: string) { assert.equal(key, RESULT_STORAGE_KEY); this.value = value; this.writes++ }
}

test('partial/abandoned matches and unacknowledged finals produce no result; stale sessions cannot finish a match', () => {
  const results: MatchResult[] = []
  const c = new ResultCollector(start, joined, result => results.push(result))
  c.opponent({ ...other, matchId: 'f'.repeat(32) }); c.acknowledgeOwn(own)
  assert.equal(results.length, 0)
  c.opponent({ ...other, connection: 'f'.repeat(32) }); assert.equal(results.length, 0)
  c.opponent({ ...other, status: 'playing' }); assert.equal(results.length, 0)
  c.opponent({ ...other, seq: 2 }); assert.equal(results.length, 1)
  c.acknowledgeOwn(own); c.opponent({ ...other, seq: 3 }); assert.equal(results.length, 1)
})
test('late final acknowledgement completes after the view leaves; names and both participant records are frozen', () => {
  const room = { ...joined, room: { ...joined.room, players: { host: { uid: 'host', name: 'Original Host' }, guest: { ...joined.room.players.guest! } } } }
  const results: MatchResult[] = []
  const c = new ResultCollector(start, room, result => results.push(result))
  c.opponent(other)
  assert.equal(results.length, 0)
  room.room.players.host = { uid: 'host', name: 'Renamed Host' }
  c.acknowledgeOwn(own)
  assert.equal(results[0].players[0].name, 'Original Host')
  assert.deepEqual(results[0].players.map(p => p.outcome), ['win', 'loss'])
  assert.equal(results[0].playedAt, '1970-01-01T00:00:15.000Z')
  assert.equal(validResult(results[0]), true)
})
test('Battle waits for both confirmed frames and uses survival, including a draw despite unequal scores', () => {
  const results: MatchResult[] = []
  const c = new ResultCollector({ ...start, battleVersion: 1, settings: { ...start.settings, mode: 'battle', revision: 1 } }, joined, result => results.push(result))
  c.opponent(other); c.acknowledgeOwn(own, { frame: 60, sent: 0, received: 0, applied: 0, cancelled: 0 })
  assert.equal(results.length, 0)
  c.opponentFinish({ matchId: start.id, connection: start.guestConnection, frame: 60, sent: 0, received: 0, applied: 0, cancelled: 0, updatedAt: 1 })
  assert.deepEqual(results[0].players.map(p => p.outcome), ['draw', 'draw'])
})
test('versioned storage saves both identities once across duplicate notifications and concurrent calls', async () => {
  const storage = new MemoryStorage(), result = completed()
  await Promise.all([recordResult(result, storage), recordResult(result, storage)])
  await recordResult(result, storage)
  assert.equal(storage.writes, 1)
  assert.equal(readResults(storage).length, 1)
  assert.equal(duelHighscores(readResults(storage)).length, 2)
  assert.deepEqual(readResults(storage)[0], result)
})
test('invalid/future storage and quota failures preserve existing data rather than discarding history', async () => {
  const storage = new MemoryStorage(); storage.value = JSON.stringify({ version: 2, matches: [] })
  await assert.rejects(recordResult(completed(), storage)); assert.equal(storage.writes, 0)
  assert.deepEqual(parseResults('bad json'), [])
  assert.deepEqual(parseResults(JSON.stringify({ version: 1, matches: [{ ...completed(), players: [] }] })), [])
  const result = completed(); result.players[0].outcome = 'loss'; assert.equal(validResult(result), false)
  const quota = { getItem: () => null, setItem: () => { throw new Error('Quota exceeded') } }
  await assert.rejects(recordResult(completed(), quota))
})
test('Score Duel top ten includes opponents, historical names and deterministic ties without altering records', () => {
  const matches = Array.from({ length: 8 }, (_, i) => completed(i.toString(16).repeat(32)))
  matches.forEach((m, i) => { m.players[0].score = i * 100 + 100; m.players[1].score = i * 100 })
  const before = JSON.stringify(matches)
  const scores = duelHighscores(matches)
  assert.equal(scores.length, 10); assert.equal(scores[0].score, 800)
  assert.ok(scores.some(p => p.uid === 'guest'))
  assert.equal(JSON.stringify(matches), before)
})
test('Battle aggregates by identity, ranks wins then rate then points, and retains names used per match', () => {
  const a = battle('a'.repeat(32)), b = battle('b'.repeat(32))
  b.playedAt = '1970-01-02T00:00:00.000Z'; b.players[1].name = 'Renamed Guest'
  const ranking = battleHighscores([a, b])
  assert.equal(ranking[0].uid, 'guest'); assert.equal(ranking[0].wins, 2); assert.equal(ranking[0].played, 2)
  assert.equal(ranking[0].name, 'Renamed Guest'); assert.equal(a.players[1].name, 'Guest')
  const sameName = battle('c'.repeat(32)); sameName.players[0].name = 'Guest'
  assert.equal(battleHighscores([sameName]).length, 2, 'equal names never merge identities')
  const tie = battle('d'.repeat(32), 60, 60)
  assert.deepEqual(battleHighscores([tie]).map(p => [p.wins, p.played, p.draws]), [[0, 1, 1], [0, 1, 1]])
})
