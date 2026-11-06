import { pieceCells } from '../engine/index.ts'
import { PIECE_TYPES } from '../engine/types.ts'
import type { Board, GameState, PieceType } from '../engine/types.ts'

/** Display-only opponent state. Never hydrate the local engine from this payload. */
export interface GameSnapshot {
  matchId: string
  connection: string
  seq: number
  board: string
  next: PieceType
  held: PieceType | '-'
  status: 'playing' | 'gameOver'
  score: number
  level: number
  lines: number
  updatedAt: number
}

export function visibleBoard(game: Pick<GameState, 'board' | 'active'>): string {
  const cells = game.board.flatMap(row => [...row])
  if (game.active) for (const [x, y] of pieceCells(game.active)) {
    if (x >= 0 && x < 10 && y >= 0 && y < 20) cells[y * 10 + x] = game.active.type
  }
  return cells.map(cell => cell === null ? '0' : cell === 'G' ? '8' : String(PIECE_TYPES.indexOf(cell) + 1)).join('')
}

export function decodeBoard(encoded: string): Board {
  if (!/^[0-8]{200}$/.test(encoded)) throw new Error('Invalid board')
  return Array.from({ length: 20 }, (_, y) => Array.from({ length: 10 }, (_, x) => encoded[y * 10 + x] === '8' ? 'G' : PIECE_TYPES[Number(encoded[y * 10 + x]) - 1] ?? null))
}

export function parseGameSnapshot(value: unknown): GameSnapshot | null {
  if (value === null) return null
  const s = value as GameSnapshot
  if (!s || typeof s !== 'object' || Object.keys(s).length !== 11 || !/^[a-f0-9]{32}$/.test(s.matchId) || !/^[a-f0-9]{32}$/.test(s.connection) || !Number.isSafeInteger(s.seq) || s.seq < 1 || s.seq > 1000000000 || !/^[0-8]{200}$/.test(s.board) || !PIECE_TYPES.includes(s.next) || (s.held !== '-' && !PIECE_TYPES.includes(s.held)) || !['playing', 'gameOver'].includes(s.status) || ![s.score, s.lines, s.level, s.updatedAt].every(n => Number.isSafeInteger(n) && n >= 0) || s.score > 1000000000 || s.lines > 1000000 || s.level > 1000000) throw new Error('Invalid game snapshot')
  return s
}

export function snapshotContent(game: GameState) {
  return { board: visibleBoard(game), next: game.next, held: game.held ?? '-' as const, status: game.status === 'gameOver' ? 'gameOver' as const : 'playing' as const, score: game.score, level: game.level, lines: game.lines }
}

/** Call after acknowledgement; unchanged state consumes neither a sequence nor a write. */
export class SnapshotGate {
  private previous = ''
  private sentAt = -Infinity
  private sequence = 0
  next(game: GameState, now: number) {
    const content = snapshotContent(game)
    const fingerprint = JSON.stringify(content)
    if (fingerprint === this.previous || now - this.sentAt < 500) return null
    this.previous = fingerprint
    this.sentAt = now
    return { ...content, seq: ++this.sequence }
  }
}
