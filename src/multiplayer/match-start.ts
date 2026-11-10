import { createGame } from '../engine/game.ts'
import { MultiplayerError } from './errors.ts'
import { DEFAULT_MATCH_SETTINGS, parseSettings, sameSettings } from './match-settings.ts'
import type { MatchSettings } from './match-settings.ts'
import type { Room } from './room-model.ts'

export interface MatchStart {
  readonly roundVersion?: 1
  readonly previousId?: string
  readonly battleVersion?: 1
  readonly id: string
  readonly status: 'countdown' | 'ready' | 'cancelled'
  readonly seed: number
  readonly countdownAt: number
  readonly settings: MatchSettings
  readonly roleRevision: number
  readonly hostUid: string
  readonly guestUid: string
  readonly hostConnection: string
  readonly guestConnection: string
}
export type Connections = Readonly<Record<string, Readonly<Record<string, boolean>>>>
export function parseMatchStart(value: unknown): MatchStart | null {
  if (value === null) return null
  const s = value as MatchStart
  if (!s || typeof s !== 'object' || Object.keys(s).length !== 10 + (s.battleVersion === 1 ? 1 : 0) + (s.roundVersion === 1 ? 2 : 0) || (s.roundVersion !== undefined && (s.roundVersion !== 1 || !/^(-|[a-f0-9]{32})$/.test(s.previousId ?? ''))) || (s.roundVersion === undefined && s.previousId !== undefined) || (s.battleVersion !== undefined && (s.battleVersion !== 1 || s.settings?.mode !== 'battle')) || !/^[a-f0-9]{32}$/.test(s.id) || !['countdown','ready','cancelled'].includes(s.status) || !Number.isSafeInteger(s.seed) || s.seed < 0 || s.seed > 0xffffffff || !Number.isSafeInteger(s.countdownAt) || s.countdownAt < 0 || !Number.isSafeInteger(s.roleRevision) || s.roleRevision < 0 || s.roleRevision > 1000000000 || typeof s.hostUid !== 'string' || typeof s.guestUid !== 'string' || !s.hostUid || !s.guestUid || s.hostUid === s.guestUid || !/^[a-f0-9]{32}$/.test(s.hostConnection) || !/^[a-f0-9]{32}$/.test(s.guestConnection)) throw new MultiplayerError('session-expired')
  if (s.settings?.revision === 0) {
    if (Object.keys(s.settings).length !== 5 || !sameSettings(s.settings, DEFAULT_MATCH_SETTINGS)) throw new MultiplayerError('session-expired')
  } else parseSettings(s.settings)
  return s
}
export function startStillValid(start: MatchStart, room: Room, settings: MatchSettings, connections: Connections): boolean {
  return room.status === 'waiting' && room.hostUid === start.hostUid && room.players.guest?.uid === start.guestUid && (room.roleRevision ?? 0) === start.roleRevision && settings.revision === start.settings.revision && sameSettings(settings, start.settings) && connections[start.hostUid]?.[start.hostConnection] === true && connections[start.guestUid]?.[start.guestConnection] === true
}
/**
 * Shared match time already elapsed when a client mounts a fresh round (B-002).
 * The "ready" write reaches the two clients at different moments, so each one
 * catches up from the common start (countdown end) instead of starting gravity
 * at its own mount time. Capped so a late mount cannot drop pieces unseen.
 */
export const MAX_START_CATCH_UP_MS = 3000
export function startCatchUp(start: Pick<MatchStart, 'countdownAt'>, serverNow: number): number {
  if (!Number.isFinite(serverNow)) return 0
  return Math.min(MAX_START_CATCH_UP_MS, Math.max(0, serverNow - start.countdownAt - 5000))
}
export function countdownSeconds(start: MatchStart, now: number): number {
  return Math.max(0, Math.ceil((start.countdownAt + 5000 - now) / 1000))
}
export function initialMatchState(start: MatchStart) {
  return createGame({ seed: start.seed, startLevel: start.settings.startLevel, holdEnabled: start.settings.hold })
}
