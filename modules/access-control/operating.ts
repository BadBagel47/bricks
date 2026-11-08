import { accessAllowed } from './policy.ts'
import type { AccessPolicy } from './policy.ts'

export interface OperatingConfig {
  readonly version: 1
  readonly revision: number
  readonly single: AccessPolicy
  readonly multi: AccessPolicy
}
export const INITIAL_OPERATING: OperatingConfig = {
  version: 1, revision: 1,
  single: { mode: 'on', expiresAt: null }, multi: { mode: 'on', expiresAt: null },
}
export function parseOperating(value: unknown): OperatingConfig {
  const config = value as OperatingConfig
  if (!config || typeof config !== 'object' || Object.keys(config).length !== 4 || config.version !== 1 ||
    !Number.isSafeInteger(config.revision) || config.revision < 1) throw new Error('Invalid operating configuration')
  for (const policy of [config.single, config.multi]) {
    // RTDB represents null-valued children by omission. Normalize that storage
    // encoding explicitly; never substitute an open policy for a missing policy.
    if (!policy || typeof policy !== 'object' || Object.keys(policy).some(key => key !== 'mode' && key !== 'expiresAt') || !['on', 'off', 'until'].includes(policy.mode) ||
      (policy.mode === 'until' ? !Number.isSafeInteger(policy.expiresAt) || policy.expiresAt < 0 : policy.expiresAt != null)) throw new Error('Invalid operating policy')
  }
  return { ...config, single: { mode: config.single.mode, expiresAt: config.single.expiresAt ?? null } as AccessPolicy, multi: { mode: config.multi.mode, expiresAt: config.multi.expiresAt ?? null } as AccessPolicy }
}
export function publicAccess(config: OperatingConfig, mode: 'single' | 'multi', now: number): boolean {
  return accessAllowed(config[mode], null, now)
}
export interface PrivateRoom { readonly id: string; readonly expiresAt: number; readonly revoked: boolean }
export interface RoomMembership { readonly id: string; readonly expiresAt: number }
export function privateAccess(room: PrivateRoom | null, membership: RoomMembership | null, now: number): boolean {
  return Boolean(room && membership && !room.revoked && room.id === membership.id && room.expiresAt > now && membership.expiresAt > now)
}
