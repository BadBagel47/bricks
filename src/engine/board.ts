import { pieceCells } from './pieces.ts'
import type { ActivePiece, Board, Cell } from './types.ts'

export const BOARD_WIDTH = 10
export const BOARD_HEIGHT = 20

function emptyRow(): Cell[] {
  return Array<Cell>(BOARD_WIDTH).fill(null)
}

export function createBoard(): Board {
  return Array.from({ length: BOARD_HEIGHT }, emptyRow)
}

export function collides(board: Board, piece: ActivePiece): boolean {
  return pieceCells(piece).some(([x, y]) =>
    x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT || board[y][x] !== null,
  )
}

export function lockPiece(board: Board, piece: ActivePiece): Board {
  if (collides(board, piece)) throw new RangeError('Cannot lock a colliding piece')
  const result = board.map((row) => [...row])
  for (const [x, y] of pieceCells(piece)) result[y][x] = piece.type
  return result
}

export function clearRows(board: Board): { board: Board; cleared: number } {
  const remaining = board.filter((row) => row.some((cell) => cell === null))
  const cleared = BOARD_HEIGHT - remaining.length
  if (cleared === 0) return { board, cleared }
  return {
    board: [...Array.from({ length: cleared }, emptyRow), ...remaining.map((row) => [...row])],
    cleared,
  }
}
