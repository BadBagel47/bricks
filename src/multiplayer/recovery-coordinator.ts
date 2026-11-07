import { RECOVERY_GRACE_MS } from './recovery.ts'

export interface RecoverySession {
  readonly matchId: string
  readonly revision: number
  readonly phase: 'playing' | 'paused' | 'abandoned'
  readonly interruptedAt: number | null
  readonly hostCheckpoint: string | null
  readonly guestCheckpoint: string | null
}
export type RecoveryEvent =
  | { readonly type: 'interrupt'; readonly now: number }
  | { readonly type: 'checkpoint'; readonly role: 'host' | 'guest'; readonly id: string }
  | { readonly type: 'resume'; readonly now: number; readonly hostConnected: boolean; readonly guestConnected: boolean }
  | { readonly type: 'expire'; readonly now: number }

/** Proposal model only: the caller must commit with server-side compare-and-swap. */
export function coordinateRecovery(state: RecoverySession, expectedRevision: number, event: RecoveryEvent): RecoverySession | null {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision !== state.revision || state.phase === 'abandoned') return null
  if (event.type === 'interrupt') {
    if (!Number.isSafeInteger(event.now) || event.now < 0 || state.phase !== 'playing') return null
    return { ...state, revision: state.revision + 1, phase: 'paused', interruptedAt: event.now, hostCheckpoint: null, guestCheckpoint: null }
  }
  if (state.phase !== 'paused' || state.interruptedAt === null) return null
  if (event.type === 'checkpoint') {
    if (!/^[a-f0-9]{32}$/.test(event.id)) return null
    const key = event.role === 'host' ? 'hostCheckpoint' : 'guestCheckpoint'
    if (state[key] === event.id) return null
    return { ...state, revision: state.revision + 1, [key]: event.id }
  }
  if (!Number.isSafeInteger(event.now) || event.now < state.interruptedAt) return null
  if (event.now >= state.interruptedAt + RECOVERY_GRACE_MS) return { ...state, revision: state.revision + 1, phase: 'abandoned' }
  if (event.type !== 'resume' || !event.hostConnected || !event.guestConnected || !state.hostCheckpoint || !state.guestCheckpoint) return null
  return { ...state, revision: state.revision + 1, phase: 'playing', interruptedAt: null, hostCheckpoint: null, guestCheckpoint: null }
}
