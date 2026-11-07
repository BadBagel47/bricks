/** Pure transition model. Server authorization and engine checkpoints are separate. */
export interface RecoveryState {
  readonly phase: 'playing' | 'reconnecting' | 'abandoned'
  readonly disconnectedAt: number | null
}

export const RECOVERY_GRACE_MS = 30_000

export function recoveryTransition(state: RecoveryState, connected: boolean, serverNow: number): RecoveryState {
  if (!Number.isSafeInteger(serverNow) || serverNow < 0) throw new RangeError('Invalid server time')
  if (state.phase === 'abandoned') return state
  if (state.phase === 'playing') return connected ? state : { phase: 'reconnecting', disconnectedAt: serverNow }
  if (state.disconnectedAt === null || !Number.isSafeInteger(state.disconnectedAt) || state.disconnectedAt < 0) throw new RangeError('Invalid disconnection time')
  if (serverNow < state.disconnectedAt) throw new RangeError('Server time precedes disconnection')
  if (serverNow >= state.disconnectedAt + RECOVERY_GRACE_MS) return { phase: 'abandoned', disconnectedAt: state.disconnectedAt }
  return connected ? { phase: 'playing', disconnectedAt: null } : state
}
