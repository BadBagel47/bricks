import { clearRows, collides, createBoard, lockPiece } from './board.ts'
import { FRAME_MS, framesPerFall, levelForLines, validateStartLevel } from './levels.ts'
import { kickOffsets, rotatedPiece, spawnPiece } from './pieces.ts'
import { createRandomizer, drawPiece } from './rng.ts'
import { lineClearPoints } from './scoring.ts'
import { CLASSIC_RULES } from './types.ts'
import type { ActivePiece, GameAction, GameEvent, GameOptions, GameRules, GameState, PieceType, Randomizer, Transition } from './types.ts'

/** F-053: half a second at 60 Hz, and at most 15 restarts per piece (as in modern games). */
export const LOCK_DELAY_FRAMES = 30
export const MAX_LOCK_RESETS = 15

function draw(randomizer: Randomizer, rules: GameRules) {
  return drawPiece(randomizer, rules.bag)
}

export function createGame(options: GameOptions = {}): GameState {
  const startLevel = options.startLevel ?? 0
  validateStartLevel(startLevel)
  // Explicit seeds are deterministic. New games without one get a fresh seed.
  const seed = options.seed ?? globalThis.crypto.getRandomValues(new Uint32Array(1))[0]
  const rules = options.rules ?? CLASSIC_RULES
  const first = draw(createRandomizer(seed), rules)
  const next = draw(first.randomizer, rules)
  let randomizer = next.randomizer
  const queue: PieceType[] = []
  for (let i = 1; i < rules.preview; i++) { const drawn = draw(randomizer, rules); queue.push(drawn.piece); randomizer = drawn.randomizer }
  const active = spawnPiece(first.piece)
  return {
    version: 1,
    board: createBoard(),
    active,
    next: next.piece,
    held: null,
    holdUsed: false,
    randomizer,
    startLevel,
    level: startLevel,
    score: 0,
    lines: 0,
    holdEnabled: options.holdEnabled ?? false,
    hardDropEnabled: options.hardDropEnabled ?? true,
    status: 'playing',
    gravityFrames: 0,
    remainderMs: 0,
    rules: { ...rules },
    queue,
    lockFrames: 0,
    lockResets: 0,
    lowestY: active.y,
  }
}

function activate(state: GameState, type: PieceType, events: GameEvent[]): GameState {
  const active = spawnPiece(type)
  if (collides(state.board, active)) {
    events.push({ type: 'gameOver' })
    return { ...state, active: null, status: 'gameOver', gravityFrames: 0, remainderMs: 0 }
  }
  events.push({ type: 'spawned', piece: type })
  return { ...state, active, gravityFrames: 0, lockFrames: 0, lockResets: 0, lowestY: active.y }
}

function spawnNext(state: GameState, events: GameEvent[]): GameState {
  // The queue moves up one place and a newly drawn piece joins at its end (F-054).
  const drawn = draw(state.randomizer, state.rules)
  const line = [...state.queue, drawn.piece]
  return activate({ ...state, next: line[0], queue: line.slice(1), randomizer: drawn.randomizer }, state.next, events)
}

const grounded = (state: GameState, piece: ActivePiece | null = state.active) => piece !== null && collides(state.board, { ...piece, y: piece.y + 1 })

/** F-053: a successful move or rotation while the lock wait runs restarts it, a limited number of times. */
function moved(state: GameState, active: ActivePiece): GameState {
  if (!state.rules.lockDelay || state.lockFrames === 0 || state.lockResets >= MAX_LOCK_RESETS) return { ...state, active }
  return { ...state, active, lockFrames: 0, lockResets: state.lockResets + 1 }
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

function fall(state: GameState, events: GameEvent[]): GameState {
  if (!state.active) return state
  const active = { ...state.active, y: state.active.y + 1 }
  // With lock delay a landed piece waits (advanceFrames locks it); without, it locks now.
  if (collides(state.board, active)) return state.rules.lockDelay ? state : lockActive(state, events)
  events.push({ type: 'moved', dx: 0, dy: 1 })
  // Reaching a new lowest row gives the restarts back, as in modern games.
  const lower = active.y > state.lowestY
  return { ...state, active, gravityFrames: 0, lockFrames: 0, lowestY: lower ? active.y : state.lowestY, lockResets: lower ? 0 : state.lockResets }
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
      return { state: moved(state, active), events: [{ type: 'moved', dx, dy: 0 }] }
    }
    case 'rotateClockwise':
    case 'rotateCounterclockwise': {
      const direction = action === 'rotateClockwise' ? 'clockwise' : 'counterclockwise'
      const turned = rotatedPiece(state.active, direction)
      if (turned.rotation === state.active.rotation) return { state, events }
      // F-052: with wall kicks the standard offsets are tried in order; without, only the turn itself.
      const offsets = state.rules.kicks ? kickOffsets(turned.type, state.active.rotation, turned.rotation) : [[0, 0] as const]
      const active = offsets.map(([dx, dy]) => ({ ...turned, x: turned.x + dx, y: turned.y + dy })).find(piece => !collides(state.board, piece))
      if (!active) return { state, events }
      return { state: moved(state, active), events: [{ type: 'rotated', direction }] }
    }
    case 'softDrop':
      return { state: fall(state, events), events }
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
    // F-053: a landed piece counts its wait instead of falling, and locks when it runs out.
    if (current.rules.lockDelay && grounded(current)) {
      const lockFrames = current.lockFrames + 1
      current = lockFrames >= LOCK_DELAY_FRAMES || current.lockResets >= MAX_LOCK_RESETS
        ? lockActive(current, events)
        : { ...current, lockFrames, gravityFrames: 0 }
      continue
    }
    const gravityFrames = current.gravityFrames + 1
    current = gravityFrames >= framesPerFall(current.level)
      ? fall({ ...current, lockFrames: 0 }, events)
      : { ...current, gravityFrames, lockFrames: 0 }
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
