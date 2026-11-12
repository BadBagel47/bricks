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
  assert.throws(() => decodeBoard('9'.repeat(200)))
})

test('snapshots omit physics counters, throttle rapid input, suppress unchanged writes and send final state once', () => {
  const gate = new SnapshotGate()
  let game = createGame({ seed: 47 })
  assert.equal(gate.next(game, 0)?.seq, 1)
  game = advanceGame(game, 10).state
  assert.equal(gate.next(game, 200), null)
  game = dispatch(game, 'moveLeft').state
  assert.equal(gate.next(game, 199), null)
  assert.equal(gate.next(game, 200)?.seq, 2)
  assert.equal(gate.next({ ...game, status: 'gameOver' }, 399), null)
  assert.equal(gate.next({ ...game, status: 'gameOver' }, 400)?.status, 'gameOver')
  assert.equal(gate.next({ ...game, status: 'gameOver' }, 5000), null)
})

test('bounded display payload rejects malformed data and stays under 600 bytes', () => {
  const payload = { ...snapshotContent(createGame()), matchId: 'a'.repeat(32), connection: 'b'.repeat(32), seq: 1, updatedAt: 1000000 }
  assert.deepEqual(parseGameSnapshot(payload), payload)
  assert.ok(Buffer.byteLength(JSON.stringify(payload)) < 600)
  for (const bad of [{ ...payload, extra: true }, { ...payload, status: 'paused' }, { ...payload, seq: 0 }, { ...payload, score: -1 }, { ...payload, board: [] }, { ...payload, next: 'X' }, { ...payload, held: null }, { ...payload, level: 1.5 }]) assert.throws(() => parseGameSnapshot(bad))
})

test('a restored publisher continues after its acknowledged sequence and keeps the rate limit', () => {
  const game = createGame({ seed: 47 })
  const previous = { ...snapshotContent(game), matchId: 'a'.repeat(32), connection: 'b'.repeat(32), seq: 8, updatedAt: 1234 }
  const gate = new SnapshotGate(previous, 1000)
  assert.equal(gate.next(game, 1200), null)
  const moved = dispatch(game, 'moveLeft').state
  assert.equal(gate.next(moved, 1199), null)
  assert.equal(gate.next(moved, 1200)?.seq, 9)
  assert.throws(() => new SnapshotGate({ ...previous, seq: 0 }, 0))
})

test('a rolled-back snapshot is offered again with the same sequence once the spacing has passed', () => {
  const game = createGame({ seed: 4 })
  const gate = new SnapshotGate(undefined, 0, 250)
  assert.equal(gate.next(game, 0)?.seq, 1)
  const moved = { ...game, score: 10 }
  assert.equal(gate.next(moved, 249), null)
  assert.equal(gate.next(moved, 250)?.seq, 2)
  gate.rollback()
  assert.equal(gate.next(moved, 400), null, 'spacing counts from the failed attempt')
  assert.equal(gate.next(moved, 500)?.seq, 2)
  gate.rollback(); gate.rollback()
  assert.equal(gate.next(game, 750), null, 'rolled back to the first snapshot, so the original board is unchanged')
  assert.equal(gate.next(moved, 750)?.seq, 2)
})
