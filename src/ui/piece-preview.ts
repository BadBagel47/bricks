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

/** The spawn orientation trimmed to its bounding box, so previews can be centred exactly (B-008). */
export function previewShape(type: PieceType): { width: number; height: number; cells: Set<number> } {
  const cells = pieceCells(spawnPiece(type))
  const minX = Math.min(...cells.map(([x]) => x))
  const minY = Math.min(...cells.map(([, y]) => y))
  const width = Math.max(...cells.map(([x]) => x)) - minX + 1
  const height = Math.max(...cells.map(([, y]) => y)) - minY + 1
  return { width, height, cells: new Set(cells.map(([x, y]) => (y - minY) * width + x - minX)) }
}
