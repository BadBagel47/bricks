import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_NET_SETTINGS, localPlayerId, matchId, OpponentStream, parseMessage, parseRoomData } from '../src/net/protocol.ts'
import type { BoardMessage } from '../src/net/protocol.ts'

const board = (over: Partial<BoardMessage> = {}): BoardMessage => ({ t: 'board', round: 1, seq: 1, board: '0'.repeat(200), next: 'T', held: '-', status: 'playing', score: 0, level: 0, lines: 0, ...over })

test('board messages are checked like the Firebase rules checked snapshots', () => {
  assert.deepEqual(parseMessage(board()), board())
  assert.equal(parseMessage({ ...board(), board: '9'.repeat(200) }), null)
  assert.equal(parseMessage({ ...board(), board: '0'.repeat(199) }), null)
  assert.equal(parseMessage({ ...board(), next: 'X' }), null)
  assert.equal(parseMessage({ ...board(), held: 'Q' }), null)
  assert.equal(parseMessage({ ...board(), status: 'won' }), null)
  assert.equal(parseMessage({ ...board(), score: -1 }), null)
  assert.equal(parseMessage({ ...board(), score: 1.5 }), null)
  assert.equal(parseMessage({ ...board(), extra: true }), null)
  assert.equal(parseMessage({ ...board(), seq: 0 }), null)
  assert.equal(parseMessage(null), null)
  assert.equal(parseMessage('board'), null)
})

test('battle, lobby and identity messages are checked', () => {
  assert.ok(parseMessage({ t: 'attack', round: 2, total: 4 }))
  assert.equal(parseMessage({ t: 'attack', round: 2, total: -4 }), null)
  assert.ok(parseMessage({ t: 'finish', round: 1, frame: 600, sent: 3, received: 4, applied: 2, cancelled: 2 }))
  assert.equal(parseMessage({ t: 'finish', round: 1, frame: 600, sent: 3, received: 1, applied: 2, cancelled: 0 }), null)
  assert.ok(parseMessage({ t: 'hello', player: '0123456789abcdef' }))
  assert.equal(parseMessage({ t: 'hello', player: 'someone' }), null)
  assert.ok(parseMessage({ t: 'approve', revision: 3 }))
  assert.ok(parseMessage({ t: 'lobby', round: 0 }))
  assert.ok(parseMessage({ t: 'quit', round: 1 }))
  assert.equal(parseMessage({ t: 'shout', round: 1 }), null)
})

test('room data falls back to defaults when it is missing or broken', () => {
  assert.deepEqual(parseRoomData(null), { v: 1, settings: DEFAULT_NET_SETTINGS, approved: 0 })
  const settings = { revision: 2, mode: 'battle', startLevel: 5, hold: true, requireApproval: true }
  assert.deepEqual(parseRoomData({ v: 1, settings, approved: 2 }), { v: 1, settings, approved: 2 })
  assert.equal(parseRoomData({ v: 1, settings: { ...settings, startLevel: 30 }, approved: 0 }).settings, DEFAULT_NET_SETTINGS)
})

test('the opponent stream ignores old, replayed and revived data', () => {
  const stream = new OpponentStream(1)
  assert.equal(stream.board(board({ seq: 2 })), true)
  assert.equal(stream.board(board({ seq: 2 })), false, 'same sequence')
  assert.equal(stream.board(board({ seq: 1 })), false, 'older sequence')
  assert.equal(stream.board(board({ seq: 3, round: 2 })), false, 'another round')
  assert.equal(stream.board(board({ seq: 4, status: 'gameOver' })), true)
  assert.equal(stream.board(board({ seq: 5 })), false, 'a finished game never comes back')
  assert.equal(stream.attack({ t: 'attack', round: 1, total: 3 }), true)
  assert.equal(stream.attack({ t: 'attack', round: 1, total: 2 }), false, 'totals never go down')
  const finish = { t: 'finish', round: 1, frame: 10, sent: 0, received: 0, applied: 0, cancelled: 0 } as const
  assert.equal(stream.final(finish), true)
  assert.equal(stream.final(finish), false, 'the result is final')
})

test('both players derive the same match id and a stable local player id', () => {
  assert.match(matchId('ABCDEF', 1, 42), /^[a-f0-9]{32}$/)
  assert.equal(matchId('ABCDEF', 1, 42), matchId('ABCDEF', 1, 42))
  assert.notEqual(matchId('ABCDEF', 1, 42), matchId('ABCDEF', 2, 42))
  const values = new Map<string, string>()
  const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v) } }
  const id = localPlayerId(storage, () => 0.5)
  assert.match(id, /^[a-f0-9]{16}$/)
  assert.equal(localPlayerId(storage, () => 0.1), id)
})
