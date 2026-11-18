import type { Board } from '../engine/types.ts'

/**
 * Danger music, as in NES Tetris (F-037): fast music while a locked block is in the
 * top six rows (the stack is 15 rows or higher), normal music as soon as it is not.
 * The NES checks the sixth row from the top when a piece locks; a block above that
 * row with the sixth row empty is practically impossible, so the top six rows are checked.
 */
export const DANGER_ROW = 6

function highestFilledRow(board: Board): number {
  const index = board.findIndex((row) => row.some((cell) => cell !== null))
  return index === -1 ? board.length : index
}

export function isDangerStack(board: Board): boolean {
  return highestFilledRow(board) < DANGER_ROW
}

/** Next danger state. No margin before switching back, as in the NES (F-037 replaced the earlier hysteresis). */
export function nextDangerState(board: Board, _current: boolean): boolean {
  return isDangerStack(board)
}
