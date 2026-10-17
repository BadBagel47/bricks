export interface PersonalSettings {
  readonly version: 1
  readonly hardDropEnabled: boolean
  readonly musicEnabled: boolean
  readonly musicVolume: number
  readonly effectsEnabled: boolean
  readonly effectsVolume: number
  readonly mobileControlMethod: 'dpad' | 'swipe'
  readonly touchButtonSize: number
  readonly leftHandedControls: boolean
  readonly hideTouchControlsWhenController: boolean
}

export interface SinglePlayerSettings {
  readonly version: 1
  readonly startLevel: number
  readonly holdEnabled: boolean
}

export interface HighscoreRecord {
  readonly id: string
  readonly username: string
  readonly score: number
  readonly level: number
  readonly lines: number
  readonly achievedAt: string
}

export interface HighscoreResult {
  readonly records: readonly HighscoreRecord[]
  readonly rank: number | null
  readonly isNewRecord: boolean
}

export const DEFAULT_PERSONAL_SETTINGS: PersonalSettings = {
  version: 1, hardDropEnabled: true, musicEnabled: true, musicVolume: 70, effectsEnabled: true, effectsVolume: 70,
  mobileControlMethod: 'dpad', touchButtonSize: 56, leftHandedControls: false, hideTouchControlsWhenController: true,
}
export const DEFAULT_SINGLE_PLAYER_SETTINGS: SinglePlayerSettings = { version: 1, startLevel: 0, holdEnabled: false }

function parseObject(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null
  try {
    const value: unknown = JSON.parse(raw)
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
  } catch {
    return null
  }
}

export function parsePersonalSettings(raw: string | null): PersonalSettings {
  const value = parseObject(raw)
  const volume = (key: string, fallback: number) => typeof value?.[key] === 'number' && Number.isInteger(value[key]) && (value[key] as number) >= 0 && (value[key] as number) <= 100 ? value[key] as number : fallback
  return {
    version: 1,
    hardDropEnabled: typeof value?.hardDropEnabled === 'boolean' ? value.hardDropEnabled : true,
    musicEnabled: typeof value?.musicEnabled === 'boolean' ? value.musicEnabled : true,
    musicVolume: volume('musicVolume', 70),
    effectsEnabled: typeof value?.effectsEnabled === 'boolean' ? value.effectsEnabled : true,
    effectsVolume: volume('effectsVolume', 70),
    mobileControlMethod: value?.mobileControlMethod === 'swipe' ? 'swipe' : 'dpad',
    touchButtonSize: typeof value?.touchButtonSize === 'number' && Number.isInteger(value.touchButtonSize) && value.touchButtonSize >= 44 && value.touchButtonSize <= 72 ? value.touchButtonSize : 56,
    leftHandedControls: typeof value?.leftHandedControls === 'boolean' ? value.leftHandedControls : false,
    hideTouchControlsWhenController: typeof value?.hideTouchControlsWhenController === 'boolean' ? value.hideTouchControlsWhenController : true,
  }
}

export function parseSinglePlayerSettings(raw: string | null): SinglePlayerSettings {
  const value = parseObject(raw)
  const startLevel = value?.startLevel
  return {
    version: 1,
    startLevel: typeof startLevel === 'number' && Number.isInteger(startLevel) && startLevel >= 0 && startLevel <= 19 ? startLevel : 0,
    holdEnabled: typeof value?.holdEnabled === 'boolean' ? value.holdEnabled : false,
  }
}

export function parseHighscores(raw: string | null): HighscoreRecord[] {
  const value = parseObject(raw)
  if (value?.version !== 1 || !Array.isArray(value.records)) return []
  const valid = value.records.flatMap((item): HighscoreRecord[] => {
    if (!item || typeof item !== 'object') return []
    const record = item as Record<string, unknown>
    if (typeof record.id !== 'string' || !record.id || typeof record.username !== 'string' || !record.username.trim()) return []
    if (![record.score, record.level, record.lines].every((number) => typeof number === 'number' && Number.isSafeInteger(number) && number >= 0)) return []
    if (typeof record.achievedAt !== 'string' || !Number.isFinite(Date.parse(record.achievedAt))) return []
    return [{ id: record.id, username: record.username, score: record.score as number, level: record.level as number, lines: record.lines as number, achievedAt: new Date(record.achievedAt).toISOString() }]
  })
  const unique = new Map<string, HighscoreRecord>()
  for (const record of valid) if (!unique.has(record.id)) unique.set(record.id, record)
  return rankRecords([...unique.values()]).slice(0, 10)
}

export function serializeHighscores(records: readonly HighscoreRecord[]): string {
  return JSON.stringify({ version: 1, records: rankRecords(records).slice(0, 10) })
}

export function addHighscore(records: readonly HighscoreRecord[], next: HighscoreRecord): HighscoreResult {
  const existing = records.find((record) => record.id === next.id)
  if (existing) {
    const ranked = rankRecords(records).slice(0, 10)
    return { records: ranked, rank: ranked.findIndex((record) => record.id === next.id) + 1 || null, isNewRecord: false }
  }
  const previousBest = records.reduce((best, record) => Math.max(best, record.score), -1)
  const ranked = rankRecords([...records, next]).slice(0, 10)
  const rank = ranked.findIndex((record) => record.id === next.id)
  return { records: ranked, rank: rank < 0 ? null : rank + 1, isNewRecord: next.score > previousBest && rank === 0 }
}

function rankRecords(records: readonly HighscoreRecord[]): HighscoreRecord[] {
  return [...records].sort((a, b) => b.score - a.score || Date.parse(a.achievedAt) - Date.parse(b.achievedAt) || a.id.localeCompare(b.id))
}
