import { clearRows, dropPosition, lockPiece } from '../engine/board.ts'
import type { Board, GameState } from '../engine/types.ts'

/**
 * Visual description of a line clear, derived from two engine states (F-022).
 * The engine stays unaware of animation: the UI recomputes which rows were full and
 * how far each remaining row fell, and only animates when that matches the new board.
 */
export interface ClearEffect {
  readonly id: number
  /** Rows (0 = top) that were full just before the clear. */
  readonly rows: readonly number[]
  /** Board with the locked piece, before the full rows were removed. */
  readonly before: Board
  /** For each row of the new board, how many rows its blocks fell. */
  readonly shifts: readonly number[]
}

const same = (a: Board, b: Board) => a.length === b.length && a.every((row, y) => row.every((cell, x) => cell === b[y][x]))

export function lineClearEffect(previous: Pick<GameState, 'board' | 'active'>, next: Pick<GameState, 'board'>, id: number): ClearEffect | null {
  if (!previous.active) return null
  // The piece locked either where it was (gravity) or at its drop position (hard drop).
  for (const piece of [previous.active, dropPosition(previous.board, previous.active)]) {
    const before = lockPiece(previous.board, piece)
    const result = clearRows(before)
    if (!result.cleared || !same(result.board, next.board)) continue
    const rows = before.flatMap((row, y) => row.every((cell) => cell !== null) ? [y] : [])
    const remaining = before.flatMap((_, y) => rows.includes(y) ? [] : [y])
    const shifts = Array.from({ length: before.length }, () => 0)
    remaining.forEach((original, index) => { shifts[rows.length + index] = rows.length + index - original })
    return { id, rows, before, shifts }
  }
  return null
}
