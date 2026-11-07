import { restoreBattleCheckpoint } from './battle-checkpoint.ts'
import { validateCheckpoint } from './checkpoint.ts'
import { decodeBoard, snapshotContent } from './game-snapshot.ts'
import type { GameSnapshot } from './game-snapshot.ts'
import type { MatchStart } from './match-start.ts'
import type { JoinedRoom } from './room-model.ts'

/** Validate the last acknowledged pair before using it as a recovery candidate.
 * This verifies consistency, not fair play or permission to take over a session. */
export function restoreCheckpoint(value: unknown, snapshot: GameSnapshot, start: MatchStart, joined: JoinedRoom, streams: { own: number; opponent: number }) {
  const fail = (): never => { throw new Error('Invalid recovery checkpoint') }
  const record = value as { matchId: string; connection: string; seq: number; payload: string; updatedAt: number }
  const connection = joined.uid === start.hostUid ? start.hostConnection : joined.uid === start.guestUid ? start.guestConnection : null
  if (!record || typeof record !== 'object' || Object.keys(record).length !== 5 || !connection || record.matchId !== start.id || record.matchId !== snapshot.matchId || record.connection !== connection || record.connection !== snapshot.connection || record.seq !== snapshot.seq || record.updatedAt !== snapshot.updatedAt || typeof record.payload !== 'string' || record.payload.length === 0 || record.payload.length > 8192) return fail()
  let payload: { version: number; game: unknown; battle: unknown }
  try { payload = JSON.parse(record.payload) } catch { return fail() }
  if (!payload || typeof payload !== 'object' || Object.keys(payload).length !== 3 || payload.version !== 1) return fail()
  const battle = start.settings.mode === 'battle'
  if (!payload.game || typeof payload.game !== 'object' || typeof (payload.game as { board?: unknown }).board !== 'string') return fail()
  let board
  try { board = decodeBoard((payload.game as { board: string }).board) } catch { return fail() }
  const game = validateCheckpoint({ ...payload.game, board }, { seed: start.seed, startLevel: start.settings.startLevel, holdEnabled: start.settings.hold, battle })
  const visible = snapshotContent(game)
  if (Object.entries(visible).some(([key, field]) => snapshot[key as keyof typeof visible] !== field)) return fail()
  if (!battle) {
    if (payload.battle !== null) return fail()
    return { game, battle: null }
  }
  if (!payload.battle || typeof payload.battle !== 'object' || 'game' in payload.battle) return fail()
  const restored = restoreBattleCheckpoint({ ...payload.battle, game }, { matchId: start.id, uid: joined.uid, epoch: joined.room.epoch, seed: start.seed, startLevel: start.settings.startLevel, holdEnabled: start.settings.hold, opponentRole: joined.uid === start.hostUid ? 'guest' : 'host', ownStreamTotal: streams.own, opponentStreamTotal: streams.opponent })
  return { game, battle: restored }
}
