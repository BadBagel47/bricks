import assert from 'node:assert/strict'
import test from 'node:test'
import { createGame, dispatch } from '../src/engine/index.ts'
import { BattleGame } from '../src/engine/battle.ts'
import { clearNetCheckpoint, readNetCheckpoint, restoreBattle, restoreCatchUp, saveNetCheckpoint } from '../src/net/checkpoint.ts'
import type { NetCheckpoint } from '../src/net/checkpoint.ts'

function memory() {
  const values = new Map<string, string>()
  return { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v) }, removeItem: (k: string) => { values.delete(k) } }
}
const expected = { code: 'ABCDEF', round: 2, seed: 77, startLevel: 0, hold: false, battle: false }

function checkpoint(over: Partial<NetCheckpoint> = {}): NetCheckpoint {
  const game = dispatch(createGame({ seed: 77 }), 'hardDrop').state
  return { v: 1, code: 'ABCDEF', round: 2, seed: 77, savedAt: 1000, game, battle: null, seq: 5, sentAttacks: 0, sentFinal: false, ownFinish: null, opponent: null, otherAttacks: 0, otherFinish: null, otherUid: 'nk:0123456789abcdef', ...over }
}

test('a saved Cloudflare game comes back for the same round only', () => {
  const storage = memory()
  assert.equal(readNetCheckpoint(expected, storage), null)
  saveNetCheckpoint(checkpoint(), storage)
  const restored = readNetCheckpoint(expected, storage)!
  assert.equal(restored.seq, 5)
  assert.deepEqual(restored.game.board, checkpoint().game.board)
  assert.equal(readNetCheckpoint({ ...expected, round: 3 }, storage), null, 'another round')
  assert.equal(readNetCheckpoint({ ...expected, code: 'ZZZZZZ' }, storage), null, 'another room')
  assert.equal(readNetCheckpoint({ ...expected, battle: true }, storage), null, 'another mode')
  clearNetCheckpoint(storage)
  assert.equal(readNetCheckpoint(expected, storage), null)
})

test('broken or tampered saves are not used', () => {
  const storage = memory()
  storage.setItem('bricks.net-match.v1', '{not json')
  assert.equal(readNetCheckpoint(expected, storage), null)
  saveNetCheckpoint({ ...checkpoint(), seq: -1 }, storage)
  assert.equal(readNetCheckpoint(expected, storage), null)
  saveNetCheckpoint({ ...checkpoint(), opponent: { t: 'board', round: 2, seq: 1, board: 'x', next: 'T', held: '-', status: 'playing', score: 0, level: 0, lines: 0 } }, storage)
  assert.equal(readNetCheckpoint(expected, storage), null)
})

test('a Battle game is rebuilt with its counters and the reload catch-up is capped', () => {
  const game = createGame({ seed: 77 })
  const battle = new BattleGame(game, 77, 'guest')
  battle.receive(3)
  const saved = checkpoint({ game: battle.game, battle: { received: 3, applied: 0, cancelled: 0, produced: 2, frame: 120, endedFrame: null, opponentEnded: false } })
  const restored = restoreBattle(saved, 'guest')!
  assert.equal(restored.received, 3)
  assert.equal(restored.produced, 2)
  assert.equal(restored.frame, 120)
  assert.equal(restoreBattle(checkpoint(), 'guest'), null)
  assert.equal(restoreCatchUp(1000, 1800), 800)
  assert.equal(restoreCatchUp(1000, 60_000), 3000)
  assert.equal(restoreCatchUp(1000, 500), 0)
})
