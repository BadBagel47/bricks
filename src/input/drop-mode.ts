import type { GameAction } from '../engine/index.ts'

/**
 * F-034: which drops a player uses, for every kind of control. 'drop' is soft drop only,
 * 'hard' is hard drop only, 'both' (default) keeps both.
 */
export type DropMode = 'drop' | 'hard' | 'both'

export const DROP_MODES: readonly DropMode[] = ['drop', 'hard', 'both']

export function softDropAllowed(mode: DropMode): boolean { return mode !== 'hard' }
export function hardDropAllowed(mode: DropMode): boolean { return mode !== 'drop' }

/** False for a drop the player has turned off; the engine also refuses hard drops when off. */
export function actionAllowed(action: GameAction, mode: DropMode): boolean {
  if (action === 'softDrop') return softDropAllowed(mode)
  if (action === 'hardDrop') return hardDropAllowed(mode)
  return true
}

/** Saved settings from before F-034 only had a hard drop switch. */
export function parseDropMode(value: unknown, legacyHardDrop: unknown): DropMode {
  if (value === 'drop' || value === 'hard' || value === 'both') return value
  return legacyHardDrop === false ? 'drop' : 'both'
}
