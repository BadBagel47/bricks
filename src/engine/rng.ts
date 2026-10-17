import { PIECE_TYPES } from './types.ts'
import type { PieceType, Randomizer } from './types.ts'

export function createRandomizer(seed: number): Randomizer {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new RangeError('Seed must be an unsigned 32-bit integer')
  }
  return { seed, state: seed || 0x6d2b79f5, previous: null, index: 0 }
}

function nextUint32(state: number): number {
  let value = state
  value ^= value << 13
  value ^= value >>> 17
  value ^= value << 5
  return value >>> 0
}

function sample(state: number, size: number): { state: number; value: number } {
  // Rejection sampling avoids modulo bias when drawing from seven choices.
  const limit = Math.floor(0x100000000 / size) * size
  let next = nextUint32(state)
  while (next >= limit) next = nextUint32(next)
  return { state: next, value: next % size }
}

export function drawPiece(randomizer: Randomizer): { piece: PieceType; randomizer: Randomizer } {
  let draw = sample(randomizer.state, 8)
  // NES-inspired single reroll. The second draw is accepted even if repeated.
  if (draw.value === 7 || PIECE_TYPES[draw.value] === randomizer.previous) {
    draw = sample(draw.state, 7)
  }
  const piece = PIECE_TYPES[draw.value]
  return {
    piece,
    randomizer: { ...randomizer, state: draw.state, previous: piece, index: randomizer.index + 1 },
  }
}
