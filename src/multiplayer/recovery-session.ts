import { get, ref, runTransaction, serverTimestamp } from 'firebase/database'
import type { Database } from 'firebase/database'
import type { JoinedRoom } from './room-model.ts'

export type RecoverySession =
  | { readonly matchId: string; readonly phase: 'paused' | 'abandoned'; readonly interruptedAt: number }
  | { readonly matchId: string; readonly phase: 'resumed'; readonly interruptedAt: number; readonly resumedAt: number; readonly hostConnection: string; readonly guestConnection: string; readonly battleFrame: number }
export const recoverySessionPath = (joined: JoinedRoom) => `recoverySessions/${joined.code}/${joined.room.epoch}`

export function parseRecoverySession(value: unknown): RecoverySession | null {
  if (value === null) return null
  const session = value as RecoverySession
  if (!session || typeof session !== 'object' || !/^[a-f0-9]{32}$/.test(session.matchId) || !Number.isSafeInteger(session.interruptedAt) || session.interruptedAt < 0) throw new Error('Invalid recovery session')
  if (session.phase === 'resumed') {
    if (Object.keys(session).length !== 7 || !Number.isSafeInteger(session.resumedAt) || session.resumedAt < session.interruptedAt || !/^[a-f0-9]{32}$/.test(session.hostConnection) || !/^[a-f0-9]{32}$/.test(session.guestConnection) || !Number.isSafeInteger(session.battleFrame) || session.battleFrame < 0 || session.battleFrame > 1000000000) throw new Error('Invalid recovery session')
  } else if (!['paused', 'abandoned'].includes(session.phase) || Object.keys(session).length !== 3) throw new Error('Invalid recovery session')
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

/** The rules check both confirmations, current leases, presence and deadline atomically. */
export async function resumeRecovery(database: Database, joined: JoinedRoom, matchId: string, hostConnection: string, guestConnection: string, battleFrame: number): Promise<void> {
  const location = ref(database, recoverySessionPath(joined))
  const baseline = parseRecoverySession((await get(location)).val())
  if (baseline?.matchId !== matchId || baseline.phase !== 'paused') return
  await runTransaction(location, value => {
    const current = parseRecoverySession(value ?? baseline)
    return current?.matchId === matchId && current.phase === 'paused' ? { ...current, phase: 'resumed', resumedAt: serverTimestamp(), hostConnection, guestConnection, battleFrame } : undefined
  }, { applyLocally: false })
}
