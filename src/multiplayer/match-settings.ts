import { MultiplayerError } from './errors.ts'

export interface MatchSettings {
  readonly revision: number
  readonly mode: 'score-duel' | 'battle'
  readonly startLevel: number
  readonly hold: boolean
  readonly requireApproval: boolean
}
export interface Approval { readonly roleRevision: number; readonly revision: number; readonly hostUid: string; readonly guestUid: string }
export const DEFAULT_MATCH_SETTINGS: MatchSettings = { revision: 0, mode: 'score-duel', startLevel: 0, hold: false, requireApproval: false }
export function parseSettings(value: unknown): MatchSettings {
  if (value === null) return DEFAULT_MATCH_SETTINGS
  const s = value as MatchSettings
  if (!s || typeof s !== 'object' || Object.keys(s).length !== 5 || !Number.isSafeInteger(s.revision) || s.revision < 1 || s.revision > 1000000000 || !['score-duel', 'battle'].includes(s.mode) || !Number.isInteger(s.startLevel) || s.startLevel < 0 || s.startLevel > 19 || typeof s.hold !== 'boolean' || typeof s.requireApproval !== 'boolean') throw new MultiplayerError('session-expired')
  return s
}
export function sameSettings(a: MatchSettings, b: MatchSettings): boolean {
  return a.mode === b.mode && a.startLevel === b.startLevel && a.hold === b.hold && a.requireApproval === b.requireApproval
}
export function isApproved(settings: MatchSettings, approval: Approval | null, hostUid: string, guestUid?: string, roleRevision = 0): boolean {
  return Boolean(guestUid && approval && approval.roleRevision === roleRevision && approval.revision === settings.revision && approval.hostUid === hostUid && approval.guestUid === guestUid)
}
