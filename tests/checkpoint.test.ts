import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createGame, dispatch } from '../src/engine/index.ts'
import { validateCheckpoint } from '../src/multiplayer/checkpoint.ts'

test('a checkpoint restores an independent engine state with the same continuation', () => {
  const original = dispatch(createGame({ seed: 47, holdEnabled: true }), 'moveLeft').state
  const restored = validateCheckpoint(JSON.parse(JSON.stringify(original)), { seed: 47, startLevel: 0, holdEnabled: true, battle: false })
  assert.deepEqual(restored, original)
  assert.notEqual(restored.board, original.board)
  assert.deepEqual(dispatch(restored, 'hardDrop'), dispatch(original, 'hardDrop'))
})

test('checkpoint validation rejects wrong matches, collisions, corrupt timing and malformed boards', () => {
  const game = createGame({ seed: 47 })
  const expected = { seed: 47, startLevel: 0, holdEnabled: false, battle: false }
  const collision = game.board.map(row => [...row]); collision[1][3] = 'I'
  for (const invalid of [{ ...game, board: collision }, { ...game, board: [] }, { ...game, randomizer: { ...game.randomizer, seed: 48 } }, { ...game, gravityFrames: 48 }, { ...game, remainderMs: Infinity }, { ...game, active: { ...game.active!, rotation: 99 } }, { ...game, extra: true }]) assert.throws(() => validateCheckpoint(invalid, expected))
  assert.throws(() => validateCheckpoint(game, { ...expected, holdEnabled: true }))
})
