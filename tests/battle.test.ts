import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BattleGame, addGarbage, battleOutcome, garbageHole, penaltyRows } from '../src/engine/battle.ts'
import { createGame, createBoard, drawPiece } from '../src/engine/index.ts'
import { createScenario } from '../src/dev/scenario.ts'
import { decodeBoard, visibleBoard } from '../src/multiplayer/game-snapshot.ts'
import { parseAttackStream, parseBattleFinish } from '../src/multiplayer/battle-repository.ts'
import { parseMatchStart } from '../src/multiplayer/match-start.ts'
import type { GameState } from '../src/engine/types.ts'

function clearScenario(count: number): GameState {
  const board = createBoard().map(row => [...row])
  for (let y = 20 - count; y < 20; y++) board[y] = Array.from({ length: 10 }, (_, x) => x === 5 ? null : 'J')
  return createScenario({ seed: 47, board, active: { type: 'I', rotation: 1, x: 3, y: 0 }, next: 'T' })
}
test('Battle sends only 0/1/2/4 rows; no combo or manual-drop bonus', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(penaltyRows), [0, 0, 1, 2, 4])
  for (let count = 1; count <= 4; count++) {
    const battle = new BattleGame(clearScenario(count), 47, 'guest')
    battle.action('hardDrop')
    assert.equal(battle.produced, penaltyRows(count))
    assert.equal(battle.game.lines, count)
  }
})
test('cumulative incoming IDs deduplicate and catch up missed updates; apply only after locking', () => {
  const battle = new BattleGame(createGame({ seed: 47 }), 47, 'host')
  battle.receive(1); battle.receive(3); battle.receive(3); battle.receive(2)
  assert.equal(battle.pending, 3)
  battle.action('moveLeft'); battle.advanceTo(10)
  assert.equal(battle.applied, 0)
  battle.action('hardDrop')
  assert.equal(battle.applied, 3)
  assert.equal(battle.pending, 0)
  assert.equal(battle.game.board.flat().filter(cell => cell === 'G').length, 27)
  battle.receive(3); battle.action('hardDrop')
  assert.equal(battle.applied, 3)
  assert.equal(battle.game.score, 0)
})
test('outgoing clears cancel oldest queued rows before applying/sending the remainder', () => {
  const a = new BattleGame(clearScenario(2), 47, 'guest')
  a.receive(3); a.action('hardDrop')
  assert.equal(a.cancelled, 1); assert.equal(a.applied, 2); assert.equal(a.produced, 0)
  assert.equal(a.game.board[18][garbageHole(47, 'guest', 2)], null)
  const b = new BattleGame(clearScenario(4), 47, 'guest')
  b.receive(3); b.action('hardDrop')
  assert.equal(b.cancelled, 3); assert.equal(b.applied, 0); assert.equal(b.produced, 1)
})
test('garbage uses independent deterministic holes and grey cells without consuming the piece stream', () => {
  const initial = createGame({ seed: 47 })
  const a = addGarbage(initial, 4, i => garbageHole(47, 'host', i + 1)).state
  const b = addGarbage(initial, 4, i => garbageHole(47, 'host', i + 1)).state
  assert.deepEqual(a, b)
  assert.deepEqual(a.randomizer, initial.randomizer)
  assert.deepEqual(drawPiece(a.randomizer), drawPiece(initial.randomizer))
  for (const row of a.board.slice(-4)) assert.equal(row.filter(cell => cell === null).length, 1)
  assert.deepEqual(decodeBoard(visibleBoard({ ...a, active: null })), a.board)
  assert.notDeepEqual(Array.from({ length: 20 }, (_, i) => garbageHole(47, 'host', i)), Array.from({ length: 20 }, (_, i) => garbageHole(47, 'guest', i)))
})
test('overflow/collision top out, giant prefixes stay bounded and eliminated participants stop processing attacks', () => {
  const battle = new BattleGame(createGame({ seed: 47 }), 47, 'guest')
  battle.receive(1000000); battle.action('hardDrop')
  assert.equal(battle.game.status, 'gameOver')
  assert.equal(battle.game.board.length, 20)
  assert.equal(battle.game.board.flat().length, 200)
  battle.receive(1000000); assert.equal(battle.applied, 1000000)
  const endedOpponent = new BattleGame(clearScenario(4), 47, 'guest')
  endedOpponent.opponentEnded = true; endedOpponent.action('hardDrop')
  assert.equal(endedOpponent.produced, 0)
  assert.throws(() => battle.receive(1000001))
})
test('survival uses shared 60 Hz frame numbers, finishes precisely during catch-up and ties ignore points', () => {
  const a = new BattleGame(createGame({ seed: 47 }), 47, 'guest')
  const b = new BattleGame(createGame({ seed: 47 }), 47, 'guest')
  a.advanceTo(100000)
  while (b.game.status === 'playing') b.advanceTo(b.frame + 1)
  assert.equal(a.endedFrame, b.endedFrame)
  assert.equal(battleOutcome(null, 2), null)
  assert.equal(battleOutcome(20, 10), 'win')
  assert.equal(battleOutcome(10, 20), 'loss')
  assert.equal(battleOutcome(20, 20), 'draw')
})
test('network Battle records reject malformed streams and inconsistent final counters', () => {
  const attack = { matchId: 'a'.repeat(32), connection: 'b'.repeat(32), seq: 1, total: 4, updatedAt: 1 }
  assert.deepEqual(parseAttackStream(attack), attack)
  for (const bad of [{ ...attack, total: 0 }, { ...attack, total: 1000001 }, { ...attack, extra: 1 }, { ...attack, seq: 1.5 }]) assert.throws(() => parseAttackStream(bad))
  const finish = { matchId: attack.matchId, connection: attack.connection, frame: 60, sent: 4, received: 2, applied: 1, cancelled: 1, updatedAt: 1 }
  assert.deepEqual(parseBattleFinish(finish), finish)
  assert.throws(() => parseBattleFinish({ ...finish, cancelled: 2 }))
  assert.throws(() => parseMatchStart({ settings: { mode: 'battle' } }))
})
