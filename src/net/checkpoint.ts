import { BattleGame } from '../engine/battle.ts'
import type { GameState } from '../engine/types.ts'
import { validateCheckpoint } from '../multiplayer/checkpoint.ts'
import { parseMessage } from './protocol.ts'
import type { BoardMessage, FinishMessage } from './protocol.ts'

/**
 * F-038: a Cloudflare match survives a page reload. The room keeps the player's seat
 * (network-kit); this keeps the player's own game, kept in the tab's sessionStorage
 * because only this browser runs it.
 */
export const NET_CHECKPOINT_KEY = 'bricks.net-match.v1'

export interface BattleCounters { readonly received: number; readonly applied: number; readonly cancelled: number; readonly produced: number; readonly frame: number; readonly endedFrame: number | null; readonly opponentEnded: boolean }
type Stats = Pick<FinishMessage, 'frame' | 'sent' | 'received' | 'applied' | 'cancelled'>

export interface NetCheckpoint {
  readonly v: 1
  readonly code: string
  readonly round: number
  readonly seed: number
  /** Server time when saved. */
  readonly savedAt: number
  readonly game: GameState
  readonly battle: BattleCounters | null
  /** Own stream: last board sequence sent, attack total sent, final sent, own Battle finish. */
  readonly seq: number
  readonly sentAttacks: number
  readonly sentFinal: boolean
  readonly ownFinish: Stats | null
  /** What this page knew about the opponent. */
  readonly opponent: BoardMessage | null
  readonly otherAttacks: number
  readonly otherFinish: FinishMessage | null
  readonly otherUid: string
}

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
const count = (n: unknown, max = 1_000_000_000) => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 && n <= max

export function saveNetCheckpoint(checkpoint: NetCheckpoint, storage: Store = sessionStorage): void {
  try { storage.setItem(NET_CHECKPOINT_KEY, JSON.stringify(checkpoint)) } catch { /* A reload then ends the match, as before F-038. */ }
}
export function clearNetCheckpoint(storage: Store = sessionStorage): void {
  try { storage.removeItem(NET_CHECKPOINT_KEY) } catch { /* Nothing kept. */ }
}

/** The saved game for exactly this round, checked before use; null when missing or not usable. */
export function readNetCheckpoint(expected: { code: string; round: number; seed: number; startLevel: number; hold: boolean; battle: boolean }, storage: Store = sessionStorage): NetCheckpoint | null {
  try {
    const c = JSON.parse(storage.getItem(NET_CHECKPOINT_KEY) ?? 'null') as NetCheckpoint
    if (!c || c.v !== 1 || c.code !== expected.code || c.round !== expected.round || c.seed !== expected.seed) return null
    if (!count(c.savedAt, Number.MAX_SAFE_INTEGER) || !count(c.seq) || !count(c.sentAttacks, 100_000) || typeof c.sentFinal !== 'boolean' || !count(c.otherAttacks, 100_000) || typeof c.otherUid !== 'string' || !c.otherUid) return null
    const game = validateCheckpoint(c.game, { seed: expected.seed, startLevel: expected.startLevel, holdEnabled: expected.hold, battle: expected.battle })
    if (expected.battle !== (c.battle !== null)) return null
    if (c.battle) {
      const b = c.battle
      if (![b.received, b.applied, b.cancelled, b.produced].every(n => count(n, 100_000)) || !count(b.frame) || (b.endedFrame !== null && !count(b.endedFrame)) || typeof b.opponentEnded !== 'boolean' || b.applied + b.cancelled > b.received) return null
    }
    const opponent = c.opponent === null ? null : parseMessage(c.opponent)
    const otherFinish = c.otherFinish === null ? null : parseMessage(c.otherFinish)
    if ((c.opponent !== null && opponent?.t !== 'board') || (c.otherFinish !== null && otherFinish?.t !== 'finish')) return null
    return { ...c, game, opponent: opponent as BoardMessage | null, otherFinish: otherFinish as FinishMessage | null }
  } catch { return null }
}

export function restoreBattle(checkpoint: NetCheckpoint, opponentRole: 'host' | 'guest'): BattleGame | null {
  if (!checkpoint.battle) return null
  const battle = new BattleGame(checkpoint.game, checkpoint.seed, opponentRole)
  const b = checkpoint.battle
  battle.received = b.received; battle.applied = b.applied; battle.cancelled = b.cancelled
  battle.produced = b.produced; battle.frame = b.frame; battle.endedFrame = b.endedFrame; battle.opponentEnded = b.opponentEnded
  return battle
}

/** How far a restored game catches up for the time the reload took: at most 3 s, as at the start. */
export function restoreCatchUp(savedAt: number, serverNow: number): number {
  return Math.min(3000, Math.max(0, serverNow - savedAt))
}
