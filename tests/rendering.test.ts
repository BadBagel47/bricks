import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PIECE_TYPES } from '../src/engine/types.ts'
import { previewCells } from '../src/ui/piece-preview.ts'
import { colorForPiece } from '../src/ui/level-palettes.ts'

test('all seven previews show exactly four distinct cells within the 4 × 4 frame', () => {
  for (const type of PIECE_TYPES) {
    const cells = previewCells(type)
    assert.equal(cells.size, 4, type)
    assert.ok([...cells].every((cell) => cell >= 0 && cell < 16), type)
  }
})

test('the level palette changes on every level transition', () => {
  for (let level = 0; level < 30; level++) {
    assert.notEqual(colorForPiece('T', level), colorForPiece('T', level + 1))
  }
})
