export const PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'] as const
export type PieceType = (typeof PIECE_TYPES)[number]
export type Cell = PieceType | 'G' | null
export type Board = readonly (readonly Cell[])[]
export type Offset = readonly [x: number, y: number]
export type Direction = 'clockwise' | 'counterclockwise'

export interface ActivePiece {
  readonly type: PieceType
  readonly rotation: number
  readonly x: number
  readonly y: number
}

export interface Randomizer {
  readonly seed: number
  readonly state: number
  readonly previous: PieceType | null
  /** Number of pieces drawn, including the active piece and preview. */
  readonly index: number
  /** F-046: pieces left in the current 7-bag, in dealing order (empty with the NES-style order). */
  readonly bag: readonly PieceType[]
}

/**
 * F-046, F-052 – F-054: the gameplay rules that differ between Classic (NES) and Modern.
 * Hold is `holdEnabled`; the ghost piece is drawn by the views and is not an engine rule.
 */
export interface GameRules {
  /** Pieces come from shuffled bags of all seven instead of the NES-style roll. */
  readonly bag: boolean
  /** SRS wall kicks: a rotation that does not fit tries the standard offsets. */
  readonly kicks: boolean
  /** A landed piece waits before locking; moving or rotating restarts the wait a limited number of times. */
  readonly lockDelay: boolean
  /** How many upcoming pieces are known and shown. */
  readonly preview: 1 | 3
  /** F-057: a new piece that has no room at the top may appear in the two hidden rows above the board. */
  readonly spawnAbove: boolean
  /** F-058: modern scoring: T-spins, combos and back-to-back (1 Player, off unless chosen). */
  readonly modernScoring: boolean
}
export const CLASSIC_RULES: GameRules = { bag: false, kicks: false, lockDelay: false, preview: 1, spawnAbove: false, modernScoring: false }
export const MODERN_RULES: GameRules = { bag: true, kicks: true, lockDelay: true, preview: 3, spawnAbove: true, modernScoring: false }
/** F-057: rows above the visible board where a new piece may appear. */
export const HIDDEN_ROWS = 2

export interface GameOptions {
  readonly seed?: number
  readonly startLevel?: number
  readonly holdEnabled?: boolean
  readonly hardDropEnabled?: boolean
  /** Default: Classic. */
  readonly rules?: GameRules
}

export interface GameState {
  readonly version: 1
  readonly board: Board
  readonly active: ActivePiece | null
  readonly next: PieceType
  readonly held: PieceType | null
  readonly holdUsed: boolean
  readonly randomizer: Randomizer
  readonly startLevel: number
  readonly level: number
  readonly score: number
  readonly lines: number
  readonly holdEnabled: boolean
  readonly hardDropEnabled: boolean
  readonly status: 'playing' | 'paused' | 'gameOver'
  /** Completed frames since the previous automatic fall. */
  readonly gravityFrames: number
  /** Unprocessed fraction of a 60 Hz frame. */
  readonly remainderMs: number
  readonly rules: GameRules
  /** Upcoming pieces after `next` (preview − 1 of them). */
  readonly queue: readonly PieceType[]
  /** Lock delay: frames the active piece has rested, restarts used, and the lowest row it reached. */
  readonly lockFrames: number
  readonly lockResets: number
  readonly lowestY: number
  /** F-058: clears in a row (-1 before the first), whether the last clear was a difficult one, and whether the last successful move was a rotation. */
  readonly combo: number
  readonly backToBack: boolean
  readonly lastRotated: boolean
}

export type GameAction =
  | 'moveLeft' | 'moveRight'
  | 'rotateClockwise' | 'rotateCounterclockwise'
  | 'softDrop' | 'hardDrop' | 'hold' | 'pause' | 'resume'

export type GameEvent =
  | { readonly type: 'moved'; readonly dx: number; readonly dy: number }
  | { readonly type: 'rotated'; readonly direction: Direction }
  | { readonly type: 'locked'; readonly piece: PieceType }
  | { readonly type: 'linesCleared'; readonly count: number; readonly points: number }
  /** F-058, modern scoring only: what the lock scored besides plain lines. */
  | { readonly type: 'bonus'; readonly tSpin: boolean; readonly combo: number; readonly backToBack: boolean; readonly points: number }
  | { readonly type: 'levelChanged'; readonly from: number; readonly to: number }
  | { readonly type: 'spawned'; readonly piece: PieceType }
  | { readonly type: 'held'; readonly piece: PieceType }
  | { readonly type: 'hardDropped'; readonly distance: number }
  | { readonly type: 'gameOver' | 'paused' | 'resumed' }

export interface Transition {
  readonly state: GameState
  readonly events: readonly GameEvent[]
}
