import assert from 'node:assert/strict'
import { test } from 'node:test'
import { advanceGame, createGame, dispatch } from '../src/engine/index.ts'
import { decodeBoard, parseGameSnapshot, snapshotContent, SnapshotGate, visibleBoard } from '../src/multiplayer/game-snapshot.ts'

test('compact visible boards round trip all cells and include the falling piece without mutating the engine', () => {
  const game = createGame({ seed: 47 })
  const before = JSON.stringify(game)
  const encoded = visibleBoard(game)
  assert.equal(encoded.length, 200)
  assert.equal(encoded.replaceAll('0', '').length, 4)
  assert.equal(decodeBoard(encoded).flat().filter(Boolean).length, 4)
  assert.equal(JSON.stringify(game), before)
  assert.throws(() => decodeBoard('0'.repeat(199)))
  assert.throws(() => decodeBoard('8'.repeat(200)))
})

test('snapshots omit physics counters, throttle rapid input, suppress unchanged writes and send final state once', () => {
  const gate = new SnapshotGate()
  let game = createGame({ seed: 47 })
  assert.equal(gate.next(game, 0)?.seq, 1)
  game = advanceGame(game, 10).state
  assert.equal(gate.next(game, 500), null)
  game = dispatch(game, 'moveLeft').state
  assert.equal(gate.next(game, 499), null)
  assert.equal(gate.next(game, 500)?.seq, 2)
  assert.equal(gate.next({ ...game, status: 'gameOver' }, 999), null)
  assert.equal(gate.next({ ...game, status: 'gameOver' }, 1000)?.status, 'gameOver')
  assert.equal(gate.next({ ...game, status: 'gameOver' }, 5000), null)
})

test('bounded display payload rejects malformed data and stays under 600 bytes', () => {
  const payload = { ...snapshotContent(createGame()), matchId: 'a'.repeat(32), connection: 'b'.repeat(32), seq: 1, updatedAt: 1000000 }
  assert.deepEqual(parseGameSnapshot(payload), payload)
  assert.ok(Buffer.byteLength(JSON.stringify(payload)) < 600)
  for (const bad of [{ ...payload, extra: true }, { ...payload, status: 'paused' }, { ...payload, seq: 0 }, { ...payload, score: -1 }, { ...payload, board: [] }, { ...payload, next: 'X' }, { ...payload, held: null }, { ...payload, level: 1.5 }]) assert.throws(() => parseGameSnapshot(bad))
})
