import type { Board } from '../engine/types.ts'

export const DANGER_ROW = 5
export const ORIGINAL_MELODY = [62, 69, 74, 69, 65, 72, 77, 72, 62, 69, 76, 74, 65, 72, 79, 77] as const

export function isDangerStack(board: Board): boolean {
  return board.slice(0, DANGER_ROW).some((row) => row.some((cell) => cell !== null))
}

export function musicIntervalMs(danger: boolean): number {
  return danger ? 230 : 390
}

export function frequencyForNote(midiNote: number, danger: boolean): number {
  const note = midiNote + (danger ? 12 : 0)
  return 440 * 2 ** ((note - 69) / 12)
}
