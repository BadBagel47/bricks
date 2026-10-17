import { clearRows, collides, createBoard, lockPiece } from './board.ts'
import { FRAME_MS, framesPerFall, levelForLines, validateStartLevel } from './levels.ts'
import { rotatedPiece, spawnPiece } from './pieces.ts'
import { createRandomizer, drawPiece } from './rng.ts'
import { lineClearPoints } from './scoring.ts'
import type { GameAction, GameEvent, GameOptions, GameState, PieceType, Transition } from './types.ts'

export function createGame(options: GameOptions = {}): GameState {
  const startLevel = options.startLevel ?? 0
  validateStartLevel(startLevel)
  // Explicit seeds are deterministic. New games without one get a fresh seed.
  const seed = options.seed ?? globalThis.crypto.getRandomValues(new Uint32Array(1))[0]
  const first = drawPiece(createRandomizer(seed))
  const next = drawPiece(first.randomizer)
  return {
    version: 1,
    board: createBoard(),
    active: spawnPiece(first.piece),
    next: next.piece,
    held: null,
    holdUsed: false,
    randomizer: next.randomizer,
    startLevel,
    level: startLevel,
    score: 0,
    lines: 0,
    holdEnabled: options.holdEnabled ?? false,
    hardDropEnabled: options.hardDropEnabled ?? true,
    status: 'playing',
    gravityFrames: 0,
    remainderMs: 0,
  }
}

function activate(state: GameState, type: PieceType, events: GameEvent[]): GameState {
  const active = spawnPiece(type)
  if (collides(state.board, active)) {
    events.push({ type: 'gameOver' })
    return { ...state, active: null, status: 'gameOver', gravityFrames: 0, remainderMs: 0 }
  }
  events.push({ type: 'spawned', piece: type })
  return { ...state, active, gravityFrames: 0 }
}

function spawnNext(state: GameState, events: GameEvent[]): GameState {
  const drawn = drawPiece(state.randomizer)
  return activate({ ...state, next: drawn.piece, randomizer: drawn.randomizer }, state.next, events)
}

function lockActive(state: GameState, events: GameEvent[]): GameState {
  if (!state.active) return state
  const cleared = clearRows(lockPiece(state.board, state.active))
  const points = lineClearPoints(cleared.cleared, state.level)
  const lines = state.lines + cleared.cleared
  const level = levelForLines(state.startLevel, lines)
  events.push({ type: 'locked', piece: state.active.type })
  if (cleared.cleared) events.push({ type: 'linesCleared', count: cleared.cleared, points })
  if (level !== state.level) events.push({ type: 'levelChanged', from: state.level, to: level })
  return spawnNext({ ...state, board: cleared.board, score: state.score + points, lines, level, holdUsed: false }, events)
}

function fall(state: GameState, softDrop: boolean, events: GameEvent[]): GameState {
  if (!state.active) return state
  const active = { ...state.active, y: state.active.y + 1 }
  if (collides(state.board, active)) return lockActive(state, events)
  events.push({ type: 'moved', dx: 0, dy: 1 })
  return { ...state, active, gravityFrames: 0, score: state.score + (softDrop ? 1 : 0) }
}

export function dispatch(state: GameState, action: GameAction): Transition {
  const events: GameEvent[] = []
  if (state.status === 'gameOver') return { state, events }
  if (action === 'resume') {
    return state.status === 'paused'
      ? { state: { ...state, status: 'playing' }, events: [{ type: 'resumed' }] }
      : { state, events }
  }
  if (state.status === 'paused') return { state, events }
  if (action === 'pause') return { state: { ...state, status: 'paused' }, events: [{ type: 'paused' }] }
  if (!state.active) return { state, events }

  switch (action) {
    case 'moveLeft':
    case 'moveRight': {
      const dx = action === 'moveLeft' ? -1 : 1
      const active = { ...state.active, x: state.active.x + dx }
      if (collides(state.board, active)) return { state, events }
      return { state: { ...state, active }, events: [{ type: 'moved', dx, dy: 0 }] }
    }
    case 'rotateClockwise':
    case 'rotateCounterclockwise': {
      const direction = action === 'rotateClockwise' ? 'clockwise' : 'counterclockwise'
      const active = rotatedPiece(state.active, direction)
      if (collides(state.board, active) || active.rotation === state.active.rotation) return { state, events }
      return { state: { ...state, active }, events: [{ type: 'rotated', direction }] }
    }
    case 'softDrop':
      return { state: fall(state, true, events), events }
    case 'hardDrop': {
      if (!state.hardDropEnabled) return { state, events }
      let active = state.active
      let distance = 0
      while (!collides(state.board, { ...active, y: active.y + 1 })) {
        active = { ...active, y: active.y + 1 }
        distance++
      }
      events.push({ type: 'hardDropped', distance })
      return { state: lockActive({ ...state, active }, events), events }
    }
    case 'hold': {
      if (!state.holdEnabled || state.holdUsed) return { state, events }
      const nextState = { ...state, held: state.active.type, holdUsed: true }
      events.push({ type: 'held', piece: state.active.type })
      return {
        state: state.held ? activate(nextState, state.held, events) : spawnNext(nextState, events),
        events,
      }
    }
  }
}

/** Exact fixed-frame simulation, useful for replays and deterministic tests. */
export function advanceFrames(state: GameState, frames: number): Transition {
  if (!Number.isSafeInteger(frames) || frames < 0) throw new RangeError('Frames must be a nonnegative integer')
  const events: GameEvent[] = []
  let current = state
  for (let frame = 0; frame < frames && current.status === 'playing'; frame++) {
    const gravityFrames = current.gravityFrames + 1
    current = gravityFrames >= framesPerFall(current.level)
      ? fall(current, false, events)
      : { ...current, gravityFrames }
  }
  return { state: current, events }
}

/** Rendering may call this at any cadence; incomplete simulation frames are retained. */
export function advanceGame(state: GameState, elapsedMs: number): Transition {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new RangeError('Elapsed time must be finite and nonnegative')
  if (state.status !== 'playing' || elapsedMs === 0) return { state, events: [] }
  const accumulated = state.remainderMs + elapsedMs
  // Tolerate floating-point noise at exact 60 Hz boundaries, not real elapsed time.
  const frames = Math.floor(accumulated / FRAME_MS + 1e-9)
  const remainder = accumulated - frames * FRAME_MS
  const remainderMs = Math.abs(remainder) < 1e-7 ? 0 : remainder
  return advanceFrames({ ...state, remainderMs }, frames)
}
