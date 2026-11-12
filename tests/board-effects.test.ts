import assert from 'node:assert/strict'
import test from 'node:test'
import { lineClearEffect } from '../src/ui/board-effects.ts'
import { clearRows, createBoard, lockPiece } from '../src/engine/board.ts'
import type { ActivePiece, Board } from '../src/engine/types.ts'

function boardWith(rows: Record<number, string>): Board {
  return createBoard().map((row, y) => rows[y] ? [...rows[y]].map((c) => c === '.' ? null : 'G') : row)
}

test('a line clear reports the full rows and how far the rows above fall', () => {
  const board = boardWith({ 17: 'G.........', 18: 'GGGGGGGG..', 19: 'GGGGGGGG..' })
  const piece: ActivePiece = { type: 'O', x: 7, y: 0, rotation: 0 }
  const landed = { ...piece, y: 18 }
  const next = clearRows(lockPiece(board, landed)).board
  const effect = lineClearEffect({ board, active: piece }, { board: next }, 1)
  assert.ok(effect, 'found through the drop position (hard drop)')
  assert.deepEqual(effect.rows, [18, 19])
  assert.equal(effect.shifts[19], 2, 'row 17 fell two rows')
  assert.equal(effect.shifts[0], 0)
  assert.equal(lineClearEffect({ board, active: piece }, { board }, 2), null, 'no effect when the boards do not match')
})
