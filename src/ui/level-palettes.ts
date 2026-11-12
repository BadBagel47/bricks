import type { PieceType } from '../engine/types.ts'

/** Stored values: 'level' is shown as Retro, 'classic' as Modern (F-024 kept the saved names). */
export type BlockColors = 'level' | 'classic' | 'tones'
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

function toHsl(hex: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min
  if (!d) return [0, 0, l]
  const s = d / (1 - Math.abs(2 * l - 1))
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h / 6, s, l]
}
function toHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h * 6) % 2 - 1)), m = l - c / 2
  const [r, g, b] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][Math.floor(h * 6) % 6]
  return '#' + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('').toUpperCase()
}
/**
 * Tones (F-024): every piece filled in a shade of the level's two colors. Hue moves the short
 * way round the colour wheel (no grey mid-tones) and lightness alternates so pieces stay distinct.
 */
const TONE_PLAN: Record<PieceType, readonly [number, number]> = { I: [1, 0.12], O: [0.5, 0.16], T: [0, 0.1], S: [0, -0.04], Z: [1, -0.06], J: [0, -0.16], L: [0.5, -0.1] }
function tone([first, second]: readonly [string, string], type: PieceType): string {
  const [ha, sa, la] = toHsl(first), [hb, sb, lb] = toHsl(second)
  const [t, lift] = TONE_PLAN[type]
  const turn = ((hb - ha + 1.5) % 1) - 0.5
  return toHex(((ha + turn * t) % 1 + 1) % 1, Math.max(sa, sb), Math.min(0.84, Math.max(0.22, la + (lb - la) * t + lift)))
}
const GARBAGE = '#4A5170'

export function blockStyle(type: PieceType | 'G', level: number, colors: BlockColors = 'level'): BlockStyle {
  if (type === 'G') return { fill: GARBAGE, ring: null }
  if (colors === 'classic') return { fill: CLASSIC[type], ring: null }
  const pair = LEVEL_PAIRS[((level % LEVEL_PAIRS.length) + LEVEL_PAIRS.length) % LEVEL_PAIRS.length]
  if (colors === 'tones') return { fill: tone(pair, type), ring: null }
  const [first, second] = pair
  if (type === 'T' || type === 'O' || type === 'I') return { fill: LIGHT, ring: first }
  if (type === 'J' || type === 'S') return { fill: first, ring: null }
  return { fill: second, ring: null }
}

/** The color that identifies a block: its outline when it has one, otherwise its fill. */
export function colorForPiece(type: PieceType | 'G', level: number, colors: BlockColors = 'level'): string {
  const style = blockStyle(type, level, colors)
  return style.ring ?? style.fill
}
