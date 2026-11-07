import { collides, FRAME_MS, framesPerFall, levelForLines, orientationCount, PIECE_TYPES } from '../engine/index.ts'
import type { GameState, PieceType } from '../engine/index.ts'

/** Structural validation only. A valid checkpoint is not proof of fair play. */
export function validateCheckpoint(value: unknown, expected: { seed: number; startLevel: number; holdEnabled: boolean; battle: boolean }): GameState {
  const fail = (): never => { throw new Error('Invalid recovery checkpoint') }
  const game = value as GameState
  const int = (n: unknown, min: number, max: number): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= min && n <= max
  const piece = (p: unknown): p is PieceType => typeof p === 'string' && PIECE_TYPES.includes(p as PieceType)
  if (!game || typeof game !== 'object' || Object.keys(game).length !== 16 || game.version !== 1) return fail()
  if (!Array.isArray(game.board) || game.board.length !== 20 || game.board.some(row => !Array.isArray(row) || row.length !== 10 || row.some(cell => cell !== null && !(expected.battle && cell === 'G') && !piece(cell)))) return fail()
  if (!piece(game.next) || (game.held !== null && !piece(game.held)) || typeof game.holdUsed !== 'boolean' || typeof game.holdEnabled !== 'boolean' || typeof game.hardDropEnabled !== 'boolean') return fail()
  if (game.startLevel !== expected.startLevel || game.holdEnabled !== expected.holdEnabled || !int(game.startLevel, 0, 19) || !int(game.lines, 0, 1000000) || !int(game.score, 0, 1000000000) || game.level !== levelForLines(game.startLevel, game.lines)) return fail()
  if (!['playing', 'paused', 'gameOver'].includes(game.status) || !int(game.gravityFrames, 0, framesPerFall(game.level) - 1) || typeof game.remainderMs !== 'number' || !Number.isFinite(game.remainderMs) || game.remainderMs < 0 || game.remainderMs >= FRAME_MS) return fail()
  const rng = game.randomizer
  if (!rng || Object.keys(rng).length !== 4 || rng.seed !== expected.seed || !int(rng.seed, 0, 0xffffffff) || !int(rng.state, 1, 0xffffffff) || !int(rng.index, 2, 1000000000) || (rng.previous !== null && !piece(rng.previous))) return fail()
  if (game.status === 'gameOver') { if (game.active !== null) return fail() }
  else {
    const a = game.active
    if (!a || Object.keys(a).length !== 4 || !piece(a.type) || !int(a.rotation, 0, orientationCount(a.type) - 1) || !int(a.x, -4, 10) || !int(a.y, -4, 20) || collides(game.board, a)) return fail()
  }
  return structuredClone(game)
}
