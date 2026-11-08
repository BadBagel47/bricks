export type AccessPolicy =
  | { readonly mode: 'off' | 'on' | 'rooms'; readonly expiresAt: null }
  | { readonly mode: 'until'; readonly expiresAt: number }
export interface RoomGrant { readonly expiresAt: number | null }
export interface MatchAdmission { readonly matchId: string; readonly admittedAt: number }

/** Use trusted server time and server-loaded policy/grants for authorization. */
export function accessAllowed(policy: AccessPolicy, room: RoomGrant | null, now: number): boolean {
  if (!Number.isSafeInteger(now) || now < 0 || !policy || typeof policy !== 'object' || Object.keys(policy).length !== 2) return false
  if (!['off', 'on', 'until', 'rooms'].includes(policy.mode)) return false
  if (policy.mode === 'until' ? !Number.isSafeInteger(policy.expiresAt) || policy.expiresAt < 0 : policy.expiresAt !== null) return false
  if (policy.mode === 'off') return false
  if (room && (Object.keys(room).length !== 1 || (room.expiresAt !== null && (!Number.isSafeInteger(room.expiresAt) || room.expiresAt < 0 || now >= room.expiresAt)))) return false
  if (policy.mode === 'until' && now >= policy.expiresAt) return false
  if (policy.mode === 'rooms') return Boolean(room && room.expiresAt !== null)
  return true
}

/** Persist this server-side, atomically with the transition into an active match. */
export function admitMatch(policy: AccessPolicy, room: RoomGrant | null, matchId: string, now: number): MatchAdmission | null {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(matchId) || !accessAllowed(policy, room, now)) return null
  return { matchId, admittedAt: now }
}

/**
 * Closure drains already admitted games. Load the admission from trusted storage,
 * never from a client payload. Delete/archive it at match completion; rematches
 * require a fresh ID and a new admitMatch check. Existing participant, connection,
 * recovery-deadline and write validation still apply in the application's rules.
 */
export function mayFinishMatch(admission: MatchAdmission | null, matchId: string, now: number): boolean {
  return Boolean(admission && admission.matchId === matchId && Number.isSafeInteger(now) && now >= 0 &&
    Number.isSafeInteger(admission.admittedAt) && admission.admittedAt >= 0 && admission.admittedAt <= now)
}
