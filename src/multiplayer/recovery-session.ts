import { get, ref, runTransaction, serverTimestamp } from 'firebase/database'
import type { Database } from 'firebase/database'
import type { JoinedRoom } from './room-model.ts'
import type { MatchStart } from './match-start.ts'

interface RecoveryBase {
  readonly matchId: string
  readonly interruptedAt: number
  readonly cycle: number
  readonly hostConnection: string
  readonly guestConnection: string
  readonly previousHostConnection: string
  readonly previousGuestConnection: string
  readonly lastResumedAt: number
}
export type RecoverySession =
  | (RecoveryBase & { readonly phase: 'paused' | 'abandoned' })
  | (RecoveryBase & { readonly phase: 'resumed'; readonly resumedAt: number; readonly battleFrame: number })
export const recoverySessionPath = (joined: JoinedRoom) => `recoverySessions/${joined.code}/${joined.room.epoch}`

export function parseRecoverySession(value: unknown): RecoverySession | null {
  if (value === null) return null
  const session = value as RecoverySession
  const id = (v: unknown) => typeof v === 'string' && /^[a-f0-9]{32}$/.test(v)
  const integer = (v: unknown, min: number, max = Number.MAX_SAFE_INTEGER) => typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max
  if (!session || typeof session !== 'object' || !id(session.matchId) || !integer(session.interruptedAt, 0) || !integer(session.cycle, 1, 1000000000) || !id(session.hostConnection) || !id(session.guestConnection) || !id(session.previousHostConnection) || !id(session.previousGuestConnection) || !integer(session.lastResumedAt, 0) || session.lastResumedAt > session.interruptedAt) throw new Error('Invalid recovery session')
  if (session.phase === 'resumed') {
    if (Object.keys(session).length !== 11 || !integer(session.resumedAt, session.interruptedAt) || !integer(session.battleFrame, 0, 1000000000)) throw new Error('Invalid recovery session')
  } else if (!['paused', 'abandoned'].includes(session.phase) || Object.keys(session).length !== 9) throw new Error('Invalid recovery session')
  return session
}

/** Every interruption gets a new server deadline and a distinct cycle. */
export async function beginRecovery(database: Database, joined: JoinedRoom, start: MatchStart): Promise<RecoverySession | null> {
  const location = ref(database, recoverySessionPath(joined))
  const baseline = parseRecoverySession((await get(location)).val())
  if (baseline?.matchId === start.id && baseline.phase !== 'resumed') return baseline
  const result = await runTransaction(location, value => {
    const current = parseRecoverySession(value ?? baseline)
    if (current?.matchId === start.id && current.phase !== 'resumed') return undefined
    if (current?.matchId === start.id && current.phase === 'resumed') return { matchId: start.id, phase: 'paused', interruptedAt: serverTimestamp(), cycle: current.cycle + 1, hostConnection: current.hostConnection, guestConnection: current.guestConnection, previousHostConnection: current.previousHostConnection, previousGuestConnection: current.previousGuestConnection, lastResumedAt: current.resumedAt }
    return { matchId: start.id, phase: 'paused', interruptedAt: serverTimestamp(), cycle: 1, hostConnection: start.hostConnection, guestConnection: start.guestConnection, previousHostConnection: start.hostConnection, previousGuestConnection: start.guestConnection, lastResumedAt: 0 }
  }, { applyLocally: false })
  return parseRecoverySession(result.snapshot.val())
}

export async function abandonRecovery(database: Database, joined: JoinedRoom, matchId: string): Promise<void> {
  const location = ref(database, recoverySessionPath(joined))
  const baseline = parseRecoverySession((await get(location)).val())
  if (baseline?.matchId !== matchId || baseline.phase !== 'paused') return
  await runTransaction(location, value => {
    const current = parseRecoverySession(value ?? baseline)
    return current?.matchId === matchId && current.phase === 'paused' && current.cycle === baseline.cycle ? { ...current, phase: 'abandoned' } : undefined
  }, { applyLocally: false })
}

/** The rules check both confirmations, current leases, presence and deadline atomically. */
export async function resumeRecovery(database: Database, joined: JoinedRoom, matchId: string, cycle: number, hostConnection: string, guestConnection: string, battleFrame: number): Promise<void> {
  const location = ref(database, recoverySessionPath(joined))
  const baseline = parseRecoverySession((await get(location)).val())
  if (baseline?.matchId !== matchId || baseline.phase !== 'paused' || baseline.cycle !== cycle) return
  await runTransaction(location, value => {
    const current = parseRecoverySession(value ?? baseline)
    return current?.matchId === matchId && current.phase === 'paused' && current.cycle === cycle ? { ...current, phase: 'resumed', previousHostConnection: current.hostConnection, previousGuestConnection: current.guestConnection, resumedAt: serverTimestamp(), hostConnection, guestConnection, battleFrame } : undefined
  }, { applyLocally: false })
}
