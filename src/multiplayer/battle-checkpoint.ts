import { BattleGame } from '../engine/battle.ts'
import type { GameState } from '../engine/types.ts'
import { validateCheckpoint } from './checkpoint.ts'

export interface BattleCheckpoint {
  readonly version: 1
  readonly matchId: string
  readonly uid: string
  readonly epoch: number
  readonly game: GameState
  readonly opponentRole: 'host' | 'guest'
  readonly received: number
  readonly applied: number
  readonly cancelled: number
  readonly produced: number
  readonly acknowledgedProduced: number
  readonly committedSent: number
  readonly frame: number
  readonly endedFrame: number | null
  readonly opponentEnded: boolean
}

/** Take one immutable local snapshot; callers must still coordinate network writes. */
export function captureBattleCheckpoint(battle: BattleGame, identity: { matchId: string; uid: string; epoch: number }, counters: { acknowledgedProduced: number; committedSent: number }): BattleCheckpoint {
  const checkpoint: BattleCheckpoint = {
    version: 1, ...identity, game: structuredClone(battle.game), opponentRole: battle.opponentRole,
    received: battle.received, applied: battle.applied, cancelled: battle.cancelled,
    produced: battle.produced, acknowledgedProduced: counters.acknowledgedProduced, committedSent: counters.committedSent,
    frame: battle.frame, endedFrame: battle.endedFrame, opponentEnded: battle.opponentEnded,
  }
  restoreBattleCheckpoint(checkpoint, { ...identity, seed: battle.seed, startLevel: battle.game.startLevel, holdEnabled: battle.game.holdEnabled, opponentRole: battle.opponentRole, ownStreamTotal: counters.committedSent, opponentStreamTotal: battle.received })
  return checkpoint
}

/** Validate counters against the authoritative stream prefixes before restoring. */
export function restoreBattleCheckpoint(value: unknown, expected: { matchId: string; uid: string; epoch: number; seed: number; startLevel: number; holdEnabled: boolean; opponentRole: 'host' | 'guest'; ownStreamTotal: number; opponentStreamTotal: number }): { battle: BattleGame; acknowledgedProduced: number; committedSent: number } {
  const fail = (): never => { throw new Error('Invalid Battle checkpoint') }
  const c = value as BattleCheckpoint
  const int = (n: unknown, max = 1000000): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 && n <= max
  if (!c || typeof c !== 'object' || Object.keys(c).length !== 15 || c.version !== 1 || c.matchId !== expected.matchId || c.uid !== expected.uid || c.epoch !== expected.epoch || c.opponentRole !== expected.opponentRole || !/^[a-f0-9]{32}$/.test(c.matchId) || !c.uid || c.uid.length > 128 || !int(c.epoch, 1000000000) || c.epoch === 0) return fail()
  if (![c.received, c.applied, c.cancelled, c.produced, c.acknowledgedProduced, c.committedSent, expected.ownStreamTotal, expected.opponentStreamTotal].every(n => int(n)) || !int(c.frame, 1000000000) || typeof c.opponentEnded !== 'boolean') return fail()
  if (c.applied + c.cancelled > c.received || c.received > expected.opponentStreamTotal || c.acknowledgedProduced > c.produced || c.committedSent !== expected.ownStreamTotal || c.committedSent > c.acknowledgedProduced) return fail()
  const game = validateCheckpoint(c.game, { seed: expected.seed, startLevel: expected.startLevel, holdEnabled: expected.holdEnabled, battle: true })
  if (game.status === 'gameOver' ? !int(c.endedFrame, c.frame) || c.endedFrame !== c.frame : c.endedFrame !== null) return fail()
  const battle = new BattleGame(game, expected.seed, c.opponentRole)
  battle.received = c.received; battle.applied = c.applied; battle.cancelled = c.cancelled
  battle.produced = c.produced; battle.frame = c.frame; battle.endedFrame = c.endedFrame; battle.opponentEnded = c.opponentEnded
  return { battle, acknowledgedProduced: c.acknowledgedProduced, committedSent: c.committedSent }
}
