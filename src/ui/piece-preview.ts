import { pieceCells, spawnPiece } from '../engine/pieces.ts'
import type { PieceType } from '../engine/types.ts'

/** Center the spawn orientation in a 4 × 4 preview, independent of board position. */
export function previewCells(type: PieceType): Set<number> {
  const cells = pieceCells(spawnPiece(type))
  const minX = Math.min(...cells.map(([x]) => x))
  const maxX = Math.max(...cells.map(([x]) => x))
  const minY = Math.min(...cells.map(([, y]) => y))
  const maxY = Math.max(...cells.map(([, y]) => y))
  const offsetX = Math.floor((4 - (maxX - minX + 1)) / 2)
  const offsetY = Math.floor((4 - (maxY - minY + 1)) / 2)
  return new Set(cells.map(([x, y]) => (y - minY + offsetY) * 4 + x - minX + offsetX))
}
