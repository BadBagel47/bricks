import type { PieceType } from '../engine/types.ts'

export type BlockColors = 'level' | 'classic'
export interface BlockStyle { readonly fill: string; readonly ring: string | null }

/** Fixed per-piece colors, used when the player chooses Classic block colors. */
const CLASSIC: Record<PieceType, string> = { I: '#38D1E8', O: '#F5C443', T: '#A98BF5', S: '#4FD98A', Z: '#F2706D', J: '#5B9CF6', L: '#F7964A' }

/**
 * Original NES-inspired level palettes: each level has two colors. T, O and I
 * are light blocks outlined in the first color; J and S use the first color,
 * Z and L the second. Adjacent levels never share a first color.
 */
const LEVEL_PAIRS: readonly (readonly [string, string])[] = [
  ['#3C7BF0', '#5DD6F5'], ['#2FA84F', '#A6E05A'], ['#B347D1', '#F27BE6'], ['#2F6FE0', '#4FD98A'], ['#D93A73', '#4FD98A'],
  ['#2FA88F', '#7C8CF5'], ['#D9452F', '#8E97B5'], ['#7A4FE0', '#C9375A'], ['#2F6FE0', '#D9452F'], ['#D9452F', '#F2A33A'],
]
const LIGHT = '#F4F1EA'
const GARBAGE = '#4A5170'

export function blockStyle(type: PieceType | 'G', level: number, colors: BlockColors = 'level'): BlockStyle {
  if (type === 'G') return { fill: GARBAGE, ring: null }
  if (colors === 'classic') return { fill: CLASSIC[type], ring: null }
  const [first, second] = LEVEL_PAIRS[((level % LEVEL_PAIRS.length) + LEVEL_PAIRS.length) % LEVEL_PAIRS.length]
  if (type === 'T' || type === 'O' || type === 'I') return { fill: LIGHT, ring: first }
  if (type === 'J' || type === 'S') return { fill: first, ring: null }
  return { fill: second, ring: null }
}

/** The color that identifies a block: its outline when it has one, otherwise its fill. */
export function colorForPiece(type: PieceType | 'G', level: number, colors: BlockColors = 'level'): string {
  const style = blockStyle(type, level, colors)
  return style.ring ?? style.fill
}
