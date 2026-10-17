import type { ActivePiece, Direction, Offset, PieceType } from './types.ts'

function cells(...rows: string[]): readonly Offset[] {
  return rows.flatMap((row, y) => [...row].flatMap((cell, x) => cell === '#' ? [[x, y] as const] : []))
}

// Anchored orientation tables: I/S/Z have two states, O one, J/L/T four.
// Rotation changes orientation only; there are no wall or floor kicks.
const SHAPES: Record<PieceType, readonly (readonly Offset[])[]> = {
  I: [cells('....', '####'), cells('..#.', '..#.', '..#.', '..#.')],
  O: [cells('.##', '.##')],
  T: [cells('.#.', '###'), cells('.#.', '.##', '.#.'), cells('...', '###', '.#.'), cells('.#.', '##.', '.#.')],
  S: [cells('.##', '##.'), cells('.#.', '.##', '..#')],
  Z: [cells('##.', '.##'), cells('..#', '.##', '.#.')],
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
