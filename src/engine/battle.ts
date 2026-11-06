import { advanceFrames, dispatch } from './game.ts'
import { collides } from './board.ts'
import type { GameAction, GameEvent, GameState, Transition } from './types.ts'

export const penaltyRows = (cleared: number): number => [0, 0, 1, 2, 4][cleared] ?? 0

/** Separate, stateless randomness: consuming a penalty never consumes a piece. */
export function garbageHole(seed: number, sender: 'host' | 'guest', ordinal: number): number {
  let value = (seed ^ (sender === 'host' ? 0xa341316c : 0xc8013ea4) ^ Math.imul(ordinal, 0x9e3779b9)) >>> 0
  value = Math.imul(value ^ value >>> 16, 0x21f0aaad)
  value = Math.imul(value ^ value >>> 15, 0x735a2d97)
  return ((value ^ value >>> 15) >>> 0) % 10
}

export function addGarbage(game: GameState, count: number, hole: (index: number) => number): Transition {
  if (!Number.isSafeInteger(count) || count < 0) throw new RangeError('Invalid garbage count')
  if (!count || game.status !== 'playing') return { state: game, events: [] }
  const n = Math.min(count, 20)
  const overflow = count > 20 || game.board.slice(0, n).some(row => row.some(cell => cell !== null))
  const rows = Array.from({ length: n }, (_, i) => {
    const gap = hole(count - n + i)
    if (!Number.isInteger(gap) || gap < 0 || gap > 9) throw new RangeError('Invalid garbage hole')
    return Array.from({ length: 10 }, (_, x) => x === gap ? null : 'G' as const)
  })
  const board = [...game.board.slice(n), ...rows]
  if (overflow || (game.active && collides(board, game.active))) return { state: { ...game, board, active: null, status: 'gameOver' }, events: [{ type: 'gameOver' }] }
  return { state: { ...game, board }, events: [] }
}

/** One local Battle session. Incoming row IDs are match/sender/ordinal, represented
 * by a cumulative prefix; duplicate or skipped network snapshots cannot replay rows. */
export class BattleGame {
  game: GameState
  readonly seed: number
  readonly opponentRole: 'host' | 'guest'
  received = 0
  applied = 0
  cancelled = 0
  produced = 0
  frame = 0
  endedFrame: number | null = null
  opponentEnded = false

  constructor(game: GameState, seed: number, opponentRole: 'host' | 'guest') {
    this.game = game; this.seed = seed; this.opponentRole = opponentRole
  }
  get pending() { return this.received - this.applied - this.cancelled }
  receive(total: number) {
    if (!Number.isSafeInteger(total) || total < 0 || total > 1000000) throw new RangeError('Invalid attack prefix')
    if (this.game.status === 'playing') this.received = Math.max(this.received, total)
  }
  private accept(transition: Transition): Transition {
    const events: GameEvent[] = [...transition.events]
    this.game = transition.state
    if (events.some(event => event.type === 'locked')) {
      const cleared = events.find(event => event.type === 'linesCleared')
      const outgoing = penaltyRows(cleared?.type === 'linesCleared' ? cleared.count : 0)
      const cancelled = Math.min(outgoing, this.pending)
      this.cancelled += cancelled
      if (!this.opponentEnded) this.produced += outgoing - cancelled
      const pending = this.pending
      if (pending && this.game.status === 'playing') {
        const first = this.applied + this.cancelled + 1
        const raised = addGarbage(this.game, pending, i => garbageHole(this.seed, this.opponentRole, first + i))
        this.game = raised.state
        this.applied += pending
        events.push(...raised.events)
      }
    }
    if (this.game.status === 'gameOver' && this.endedFrame === null) this.endedFrame = this.frame
    return { state: this.game, events }
  }
  action(action: GameAction): Transition { return this.accept(dispatch(this.game, action)) }
  advanceTo(target: number): Transition {
    if (!Number.isSafeInteger(target) || target < 0) throw new RangeError('Invalid match frame')
    const events: GameEvent[] = []
    while (this.frame < target && this.game.status === 'playing') {
      this.frame++
      events.push(...this.accept(advanceFrames(this.game, 1)).events)
    }
    return { state: this.game, events }
  }
}

export function battleOutcome(ownFrame: number | null, opponentFrame: number | null) {
  if (ownFrame === null || opponentFrame === null) return null
  return ownFrame > opponentFrame ? 'win' : ownFrame < opponentFrame ? 'loss' : 'draw'
}
