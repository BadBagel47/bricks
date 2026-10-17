export const PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'] as const
export type PieceType = (typeof PIECE_TYPES)[number]
export type Cell = PieceType | null
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
}

export interface GameOptions {
  readonly seed?: number
  readonly startLevel?: number
  readonly holdEnabled?: boolean
  readonly hardDropEnabled?: boolean
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
  | { readonly type: 'levelChanged'; readonly from: number; readonly to: number }
  | { readonly type: 'spawned'; readonly piece: PieceType }
  | { readonly type: 'held'; readonly piece: PieceType }
  | { readonly type: 'hardDropped'; readonly distance: number }
  | { readonly type: 'gameOver' | 'paused' | 'resumed' }

export interface Transition {
  readonly state: GameState
  readonly events: readonly GameEvent[]
}
