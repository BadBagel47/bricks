import type { Connections, MatchStart } from './match-start.ts'
import type { JoinedRoom } from './room-model.ts'

export interface RoundIntent { uid: string; connection: string; previousId: string; roleRevision: number }
export type RoundReadiness = Partial<Record<'host' | 'guest', RoundIntent>>
export const previousRoundId = (start: MatchStart | null): string => start?.id ?? '-'
export const approvalRoundId = (start: MatchStart | null): string => start && start.status !== 'cancelled' ? start.previousId ?? '-' : previousRoundId(start)
export function freshSeed(previous: number | undefined, candidate: number): number { return previous === candidate ? (candidate + 1) >>> 0 : candidate }
export function parseReadiness(value: unknown): RoundReadiness {
  if (value === null) return {}
  if (!value || typeof value !== 'object' || Object.keys(value).some(key => key !== 'host' && key !== 'guest')) throw new Error('Invalid round readiness')
  const result = value as RoundReadiness
  for (const entry of Object.values(result)) {
    if (!entry || Object.keys(entry).length !== 4 || typeof entry.uid !== 'string' || !entry.uid || entry.uid.length > 128 || !/^[a-f0-9]{32}$/.test(entry.connection) || !/^(-|[a-f0-9]{32})$/.test(entry.previousId) || !Number.isSafeInteger(entry.roleRevision) || entry.roleRevision < 0 || entry.roleRevision > 1000000000) throw new Error('Invalid round readiness')
  }
  return result
}
export function readyForRound(entry: RoundIntent | undefined, uid: string | undefined, previousId: string, roleRevision: number, connections: Connections, selectedConnection?: string | null): boolean {
  return Boolean(entry && uid && entry.uid === uid && entry.previousId === previousId && entry.roleRevision === roleRevision && connections[uid]?.[entry.connection] === true && (!selectedConnection || entry.connection === selectedConnection))
}
export function bothReady(start: Pick<MatchStart, 'previousId' | 'roleRevision' | 'hostUid' | 'guestUid' | 'hostConnection' | 'guestConnection'>, readiness: RoundReadiness, connections: Connections): boolean {
  return readyForRound(readiness.host, start.hostUid, start.previousId ?? '-', start.roleRevision, connections, start.hostConnection) && readyForRound(readiness.guest, start.guestUid, start.previousId ?? '-', start.roleRevision, connections, start.guestConnection)
}
export const readinessPath = (joined: JoinedRoom) => `roundReadiness/${joined.code}/${joined.room.epoch}`
