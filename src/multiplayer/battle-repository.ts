import { get, ref, runTransaction, serverTimestamp, set } from 'firebase/database'
import type { Database } from 'firebase/database'
import type { JoinedRoom } from './room-model.ts'
import type { MatchStart } from './match-start.ts'

export interface AttackStream { matchId: string; connection: string; seq: number; total: number; updatedAt: number }
export interface BattleFinish { matchId: string; connection: string; frame: number; sent: number; received: number; applied: number; cancelled: number; updatedAt: number }
export const battlePath = (kind: 'battleAttacks' | 'battleFinishes', joined: JoinedRoom, uid: string) => `${kind}/${joined.code}/${joined.room.epoch}/${uid}`
const id = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{32}$/.test(value)
const integer = (value: unknown, max = 1000000) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max
export function parseAttackStream(value: unknown): AttackStream | null {
  if (value === null) return null
  const s = value as AttackStream
  if (!s || Object.keys(s).length !== 5 || !id(s.matchId) || !id(s.connection) || !integer(s.seq, 1000000000) || s.seq < 1 || !integer(s.total) || s.total < 1 || !integer(s.updatedAt, Number.MAX_SAFE_INTEGER)) throw new Error('Invalid attack stream')
  return s
}
export function parseBattleFinish(value: unknown): BattleFinish | null {
  if (value === null) return null
  const s = value as BattleFinish
  if (!s || Object.keys(s).length !== 8 || !id(s.matchId) || !id(s.connection) || !integer(s.frame, 1000000000) || ![s.sent, s.received, s.applied, s.cancelled].every(n => integer(n)) || s.applied + s.cancelled > s.received || !integer(s.updatedAt, Number.MAX_SAFE_INTEGER)) throw new Error('Invalid battle finish')
  return s
}
export async function sendAttacks(database: Database, joined: JoinedRoom, start: MatchStart, rows: number): Promise<number> {
  const location = ref(database, battlePath('battleAttacks', joined, joined.uid))
  const baseline = parseAttackStream((await get(location)).val())
  const connection = joined.uid === start.hostUid ? start.hostConnection : start.guestConnection
  const opponentUid = joined.uid === start.hostUid ? start.guestUid : start.hostUid
  async function opponentFinished() {
    const snapshot = (await get(ref(database, `gameSnapshots/${joined.code}/${joined.room.epoch}/${opponentUid}`))).val()
    return snapshot?.matchId === start.id && snapshot.status === 'gameOver'
  }
  const previous = baseline?.matchId === start.id ? baseline.total : 0
  if (await opponentFinished()) return previous
  try {
    const result = await runTransaction(location, value => {
      const current = parseAttackStream(value ?? baseline)
      const same = current?.matchId === start.id
      return { matchId: start.id, connection, seq: same ? current.seq + 1 : 1, total: (same ? current.total : 0) + rows, updatedAt: serverTimestamp() }
    }, { applyLocally: false })
    if (!result.committed) throw new Error('Attack was not committed')
    return parseAttackStream(result.snapshot.val())!.total
  } catch (error) {
    // The opponent may finish between our read and the server's authorization.
    if (await opponentFinished()) return previous
    throw error
  }
}
export async function publishBattleFinish(database: Database, joined: JoinedRoom, start: MatchStart, stats: Pick<BattleFinish, 'frame' | 'sent' | 'received' | 'applied' | 'cancelled'>) {
  const connection = joined.uid === start.hostUid ? start.hostConnection : start.guestConnection
  await set(ref(database, battlePath('battleFinishes', joined, joined.uid)), { ...stats, matchId: start.id, connection, updatedAt: serverTimestamp() })
}
