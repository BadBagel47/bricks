import type { PieceType } from '../engine/types.ts'

const palettes: readonly Record<PieceType, string>[] = [
  { I: '#43d9e8', O: '#f5d547', T: '#b77af5', S: '#72d759', Z: '#ef5a62', J: '#5389f2', L: '#f29a45' },
  { I: '#8fd6ff', O: '#ffd46b', T: '#ff91c8', S: '#b5e86e', Z: '#ff806f', J: '#7795ff', L: '#ffb36b' },
  { I: '#76efd0', O: '#ffd36e', T: '#d6a2ff', S: '#a9e878', Z: '#ff827f', J: '#77a8ff', L: '#ffc078' },
  { I: '#59d5ff', O: '#ffdc59', T: '#ff82b2', S: '#79e9a2', Z: '#ff6d68', J: '#828cff', L: '#ffa158' },
  { I: '#94e1ff', O: '#ffe58a', T: '#e3a1ff', S: '#a8ee88', Z: '#ff9d8f', J: '#91aaff', L: '#ffd092' },
]

export function colorForPiece(type: PieceType, level: number): string {
  return palettes[Math.floor(level / 5) % palettes.length][type]
}
