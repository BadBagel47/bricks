import { get, ref, runTransaction, serverTimestamp } from 'firebase/database'
import type { Database } from 'firebase/database'
import type { JoinedRoom } from './room-model.ts'

export interface RecoverySession { readonly matchId: string; readonly phase: 'paused' | 'abandoned'; readonly interruptedAt: number }
export const recoverySessionPath = (joined: JoinedRoom) => `recoverySessions/${joined.code}/${joined.room.epoch}`

export function parseRecoverySession(value: unknown): RecoverySession | null {
  if (value === null) return null
  const session = value as RecoverySession
  if (!session || typeof session !== 'object' || Object.keys(session).length !== 3 || !/^[a-f0-9]{32}$/.test(session.matchId) || !['paused', 'abandoned'].includes(session.phase) || !Number.isSafeInteger(session.interruptedAt) || session.interruptedAt < 0) throw new Error('Invalid recovery session')
  return session
}

/** A fixed server timestamp prevents repeated observations extending the grace period. */
export async function beginRecovery(database: Database, joined: JoinedRoom, matchId: string): Promise<RecoverySession | null> {
  const location = ref(database, recoverySessionPath(joined))
  const baseline = parseRecoverySession((await get(location)).val())
  if (baseline?.matchId === matchId) return baseline
  const result = await runTransaction(location, value => {
    const current = parseRecoverySession(value ?? baseline)
    return current?.matchId === matchId ? undefined : { matchId, phase: 'paused', interruptedAt: serverTimestamp() }
  }, { applyLocally: false })
  return parseRecoverySession(result.snapshot.val())
}

export async function abandonRecovery(database: Database, joined: JoinedRoom, matchId: string): Promise<void> {
  const location = ref(database, recoverySessionPath(joined))
  const baseline = parseRecoverySession((await get(location)).val())
  if (baseline?.matchId !== matchId || baseline.phase === 'abandoned') return
  await runTransaction(location, value => {
    const current = parseRecoverySession(value ?? baseline)
    return current?.matchId === matchId && current.phase === 'paused' ? { ...current, phase: 'abandoned' } : undefined
  }, { applyLocally: false })
}
