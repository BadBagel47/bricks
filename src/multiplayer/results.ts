import type { MatchStart } from './match-start.ts'
import type { JoinedRoom } from './room-model.ts'
import type { GameSnapshot } from './game-snapshot.ts'
import type { BattleFinish } from './battle-repository.ts'
import { battleOutcome } from '../engine/battle.ts'

export type FinalBoard = Pick<GameSnapshot, 'status' | 'score' | 'level' | 'lines'>
export interface ResultPlayer {
  uid: string
  name: string
  score: number
  level: number
  lines: number
  outcome: 'win' | 'loss' | 'draw'
  battle?: Pick<BattleFinish, 'frame' | 'sent' | 'received' | 'applied' | 'cancelled'>
}
export interface MatchResult {
  version: 1
  id: string
  mode: 'score-duel' | 'battle'
  roomCode: string
  epoch: number
  playedAt: string
  players: [ResultPlayer, ResultPlayer]
}

/** Lives independently of the game view: a late final-write acknowledgement can
 * still complete saving after the other participant has returned to the lobby. */
export class ResultCollector {
  private own: FinalBoard | null = null
  private other: FinalBoard | null = null
  private ownBattle: ResultPlayer['battle'] | null = null
  private otherBattle: ResultPlayer['battle'] | null = null
  private emitted = false
  private opponentSequence = 0
  private readonly context: { start: MatchStart; roomCode: string; epoch: number; own: { uid: string; name: string }; other: { uid: string; name: string }; host: boolean }
  private readonly completed: (result: MatchResult) => void
  constructor(start: MatchStart, joined: JoinedRoom, completed: (result: MatchResult) => void) {
    const host = joined.uid === start.hostUid
    const players = joined.room.players
    this.context = { start, roomCode: joined.code, epoch: joined.room.epoch, own: { ...(host ? players.host : players.guest!) }, other: { ...(host ? players.guest! : players.host) }, host }
    this.completed = completed
  }
  opponent(snapshot: GameSnapshot) {
    const { start, host } = this.context
    if (snapshot.matchId !== start.id || snapshot.connection !== (host ? start.guestConnection : start.hostConnection)) return
    if (snapshot.seq <= this.opponentSequence || this.other?.status === 'gameOver') return
    this.opponentSequence = snapshot.seq
    this.other = { status: snapshot.status, score: snapshot.score, level: snapshot.level, lines: snapshot.lines }
    this.tryComplete()
  }
  opponentFinish(finish: BattleFinish) {
    const { start, host } = this.context
    if (finish.matchId !== start.id || finish.connection !== (host ? start.guestConnection : start.hostConnection)) return
    this.otherBattle = { frame: finish.frame, sent: finish.sent, received: finish.received, applied: finish.applied, cancelled: finish.cancelled }
    this.tryComplete()
  }
  acknowledgeOwn(snapshot: FinalBoard, battle: ResultPlayer['battle'] | null = null) {
    this.own = { ...snapshot }; this.ownBattle = battle && { ...battle }; this.tryComplete()
  }
  private tryComplete() {
    if (this.emitted || this.own?.status !== 'gameOver' || this.other?.status !== 'gameOver') return
    const c = this.context
    const result = c.start.settings.mode === 'battle' ? battleOutcome(this.ownBattle?.frame ?? null, this.otherBattle?.frame ?? null) : this.own.score > this.other.score ? 'win' : this.own.score < this.other.score ? 'loss' : 'draw'
    if (!result) return
    const player = (identity: { uid: string; name: string }, board: FinalBoard, outcome: ResultPlayer['outcome'], battle: ResultPlayer['battle'] | null): ResultPlayer => ({ ...identity, score: board.score, level: board.level, lines: board.lines, outcome, ...(battle ? { battle: { ...battle } } : {}) })
    const own = player(c.own, this.own, result, this.ownBattle)
    const other = player(c.other, this.other, result === 'win' ? 'loss' : result === 'loss' ? 'win' : 'draw', this.otherBattle)
    this.emitted = true
    this.completed({ version: 1, id: c.start.id, mode: c.start.settings.mode, roomCode: c.roomCode, epoch: c.epoch, playedAt: new Date(c.start.countdownAt + 5000).toISOString(), players: c.host ? [own, other] : [other, own] })
  }
}

export const RESULT_STORAGE_KEY = 'bricks.multiplayer-results.v1'
export const RESULTS_CHANGED = 'bricks-results-changed'
type ResultStorage = Pick<Storage, 'getItem' | 'setItem'>
const number = (n: unknown, max = 1000000000) => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 && n <= max
export function validResult(value: unknown): value is MatchResult {
  const r = value as MatchResult
  if (!r || Object.keys(r).length !== 7 || r.version !== 1 || !/^[a-f0-9]{32}$/.test(r.id) || !['score-duel', 'battle'].includes(r.mode) || !/^[A-HJ-NP-Z2-9]{4,8}$/.test(r.roomCode) || !number(r.epoch) || r.epoch < 1 || typeof r.playedAt !== 'string' || !Number.isFinite(Date.parse(r.playedAt)) || !Array.isArray(r.players) || r.players.length !== 2) return false
  for (const p of r.players) {
    if (!p || Object.keys(p).length !== (r.mode === 'battle' ? 7 : 6) || typeof p.uid !== 'string' || !p.uid || p.uid.length > 128 || typeof p.name !== 'string' || p.name.trim().length < 2 || p.name.length > 16 || ![p.score, p.level, p.lines].every(n => number(n)) || !['win', 'loss', 'draw'].includes(p.outcome)) return false
    if (r.mode === 'battle') {
      const b = p.battle
      if (!b || Object.keys(b).length !== 5 || ![b.frame, b.sent, b.received, b.applied, b.cancelled].every(n => number(n)) || b.applied + b.cancelled > b.received) return false
    } else if (p.battle !== undefined) return false
  }
  const [a, b] = r.players
  if (a.uid === b.uid) return false
  const outcome = r.mode === 'battle' ? battleOutcome(a.battle!.frame, b.battle!.frame) : a.score > b.score ? 'win' : a.score < b.score ? 'loss' : 'draw'
  return a.outcome === outcome && b.outcome === (outcome === 'win' ? 'loss' : outcome === 'loss' ? 'win' : 'draw')
}
export function parseResults(raw: string | null): MatchResult[] {
  try {
    const data = JSON.parse(raw ?? 'null')
    if (data?.version !== 1 || !Array.isArray(data.matches)) return []
    const unique = new Map<string, MatchResult>()
    for (const match of data.matches) if (validResult(match) && !unique.has(match.id)) unique.set(match.id, { ...match, playedAt: new Date(match.playedAt).toISOString() })
    return [...unique.values()]
  } catch { return [] }
}
export function readResults(storage: ResultStorage = localStorage) { return parseResults(storage.getItem(RESULT_STORAGE_KEY)) }
export async function recordResult(result: MatchResult, storage: ResultStorage = localStorage): Promise<void> {
  if (!validResult(result)) throw new Error('Invalid completed match')
  const save = () => {
    const raw = storage.getItem(RESULT_STORAGE_KEY)
    if (raw !== null) { const envelope = JSON.parse(raw); if (envelope?.version !== 1 || !Array.isArray(envelope.matches)) throw new Error('Unsupported results storage') }
    const matches = parseResults(raw)
    if (!matches.some(match => match.id === result.id)) storage.setItem(RESULT_STORAGE_KEY, JSON.stringify({ version: 1, matches: [...matches, result] }))
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(RESULTS_CHANGED))
  }
  if (typeof navigator !== 'undefined' && navigator.locks) {
    // Release the lock before surfacing storage errors (also avoids Node's lock rejection bug).
    const failure = await navigator.locks.request(RESULT_STORAGE_KEY, () => { try { save(); return null } catch (error) { return { error } } })
    if (failure) throw failure.error
  } else save()
}

export function duelHighscores(matches: readonly MatchResult[]) {
  return matches.filter(m => m.mode === 'score-duel').flatMap(m => m.players.map(p => ({ ...p, id: `${m.id}:${p.uid}`, playedAt: m.playedAt })))
    .sort((a, b) => b.score - a.score || Date.parse(a.playedAt) - Date.parse(b.playedAt) || a.id.localeCompare(b.id)).slice(0, 10)
}
export function battleHighscores(matches: readonly MatchResult[]) {
  const players = new Map<string, { uid: string; name: string; date: string; wins: number; played: number; draws: number; score: number; lines: number; sent: number }>()
  for (const match of matches.filter(m => m.mode === 'battle')) for (const p of match.players) {
    const entry = players.get(p.uid) ?? { uid: p.uid, name: p.name, date: '', wins: 0, played: 0, draws: 0, score: 0, lines: 0, sent: 0 }
    entry.wins += Number(p.outcome === 'win'); entry.draws += Number(p.outcome === 'draw'); entry.played++; entry.score += p.score; entry.lines += p.lines; entry.sent += p.battle!.sent
    if (!entry.date || Date.parse(match.playedAt) >= Date.parse(entry.date)) { entry.name = p.name; entry.date = match.playedAt }
    players.set(p.uid, entry)
  }
  return [...players.values()].sort((a, b) => b.wins - a.wins || b.wins / b.played - a.wins / a.played || b.score - a.score || a.uid.localeCompare(b.uid)).slice(0, 10)
}
