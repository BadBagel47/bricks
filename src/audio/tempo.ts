import type { Board } from '../engine/types.ts'

/** Danger music starts when locked blocks reach the top six rows. */
export const DANGER_ROW = 6
/** Hysteresis: danger ends only once the stack is below the top nine rows. */
export const SAFE_ROW = 9

function highestFilledRow(board: Board): number {
  const index = board.findIndex((row) => row.some((cell) => cell !== null))
  return index === -1 ? board.length : index
}

export function isDangerStack(board: Board): boolean {
  return highestFilledRow(board) < DANGER_ROW
}

/** Next danger state with hysteresis, so the tempo does not flicker around one row. */
export function nextDangerState(board: Board, current: boolean): boolean {
  const top = highestFilledRow(board)
  return current ? top < SAFE_ROW : top < DANGER_ROW
}
