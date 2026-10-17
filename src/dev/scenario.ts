// Development helper only: do not import from application menus or release UI.
import { BOARD_HEIGHT, BOARD_WIDTH, collides, createGame, levelForLines, orientationCount, PIECE_TYPES } from '../engine/index.ts'
import type { ActivePiece, Board, GameOptions, GameState, PieceType } from '../engine/index.ts'

interface ScenarioOptions extends GameOptions {
  readonly board?: Board
  readonly active?: ActivePiece
  readonly next?: PieceType
  readonly held?: PieceType
  readonly lines?: number
  readonly score?: number
}

/** Seeds reproduce the continuation; active/next overrides prescribe the first two pieces. */
export function createScenario(options: ScenarioOptions): GameState {
  const game = createGame(options)
  const board = options.board ?? game.board
  if (board.length !== BOARD_HEIGHT || board.some((row) => row.length !== BOARD_WIDTH || row.some((cell) => cell !== null && !PIECE_TYPES.includes(cell)))) {
    throw new RangeError('Scenario requires a 10 × 20 board containing piece types or null')
  }
  const active = options.active ?? game.active!
  if (!Number.isInteger(active.rotation) || active.rotation < 0 || active.rotation >= orientationCount(active.type)
    || !Number.isInteger(active.x) || !Number.isInteger(active.y) || collides(board, active)) {
    throw new RangeError('Scenario requires a valid, non-colliding active piece')
  }
  const lines = options.lines ?? 0
  const score = options.score ?? 0
  if (!Number.isSafeInteger(score) || score < 0) throw new RangeError('Scenario score must be a nonnegative integer')
  return {
    ...game,
    board: board.map((row) => [...row]),
    active: { ...active },
    next: options.next ?? game.next,
    held: options.held ?? null,
    lines,
    score,
    level: levelForLines(game.startLevel, lines),
  }
}
