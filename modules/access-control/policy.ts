export type AccessPolicy =
  | { readonly mode: 'off' | 'on' | 'rooms'; readonly expiresAt: null }
  | { readonly mode: 'until'; readonly expiresAt: number }
export interface RoomGrant { readonly expiresAt: number | null }

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
