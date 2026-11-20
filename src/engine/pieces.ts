import type { ActivePiece, Direction, Offset, PieceType } from './types.ts'

function cells(...rows: string[]): readonly Offset[] {
  return rows.flatMap((row, y) => [...row].flatMap((cell, x) => cell === '#' ? [[x, y] as const] : []))
}

// Orientation tables rotate around the center of their 3x3 or 4x4 frame.
// Even symmetric pieces keep all four pivot positions to avoid snapping on
// half turns. O is invariant. Wall kicks (SRS) are optional, see kickOffsets.
const SHAPES: Record<PieceType, readonly (readonly Offset[])[]> = {
  I: [cells('....', '####', '....', '....'), cells('..#.', '..#.', '..#.', '..#.'), cells('....', '....', '####', '....'), cells('.#..', '.#..', '.#..', '.#..')],
  O: [cells('.##', '.##')],
  T: [cells('.#.', '###'), cells('.#.', '.##', '.#.'), cells('...', '###', '.#.'), cells('.#.', '##.', '.#.')],
  S: [cells('.##', '##.', '...'), cells('.#.', '.##', '..#'), cells('...', '.##', '##.'), cells('#..', '##.', '.#.')],
  Z: [cells('##.', '.##', '...'), cells('..#', '.##', '.#.'), cells('...', '##.', '.##'), cells('.#.', '##.', '#..')],
  J: [cells('#..', '###'), cells('.##', '.#.', '.#.'), cells('...', '###', '..#'), cells('.#.', '.#.', '##.')],
  L: [cells('..#', '###'), cells('.#.', '.#.', '.##'), cells('...', '###', '#..'), cells('##.', '.#.', '.#.')],
}

export function orientationCount(type: PieceType): number {
  return SHAPES[type].length
}

export function spawnPiece(type: PieceType): ActivePiece {
  return { type, rotation: 0, x: 3, y: 0 }
}

export function pieceCells(piece: ActivePiece): readonly Offset[] {
  return SHAPES[piece.type][piece.rotation].map(([x, y]) => [piece.x + x, piece.y + y] as const)
}

export function rotatedPiece(piece: ActivePiece, direction: Direction): ActivePiece {
  const count = orientationCount(piece.type)
  const delta = direction === 'clockwise' ? 1 : -1
  return { ...piece, rotation: (piece.rotation + delta + count) % count }
}

/**
 * F-052: SRS wall kicks, tried in order when a rotation does not fit. The tables are the
 * standard ones (rotation states 0, R, 2, L = 0, 1, 2, 3), with y turned to point down.
 * The orientation tables above already follow SRS, so only the offsets are added.
 */
type Kicks = Readonly<Record<string, readonly Offset[]>>
const up = (list: readonly (readonly [number, number])[]): readonly Offset[] => list.map(([x, y]) => [x, -y] as const)
const JLSTZ_KICKS: Kicks = {
  '0>1': up([[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]]),
  '1>0': up([[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]]),
  '1>2': up([[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]]),
  '2>1': up([[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]]),
  '2>3': up([[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]),
  '3>2': up([[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]]),
  '3>0': up([[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]]),
  '0>3': up([[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]),
}
const I_KICKS: Kicks = {
  '0>1': up([[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]]),
  '1>0': up([[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]]),
  '1>2': up([[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]),
  '2>1': up([[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]]),
  '2>3': up([[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]]),
  '3>2': up([[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]]),
  '3>0': up([[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]]),
  '0>3': up([[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]),
}

/** The positions a rotation from `from` to `to` may take, first the unmoved one. */
export function kickOffsets(type: PieceType, from: number, to: number): readonly Offset[] {
  if (type === 'O') return [[0, 0]]
  return (type === 'I' ? I_KICKS : JLSTZ_KICKS)[`${from}>${to}`] ?? [[0, 0]]
}
