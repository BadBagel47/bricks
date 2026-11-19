import { PIECE_TYPES } from '../engine/types.ts'
import type { PieceType } from '../engine/types.ts'

/**
 * F-028: what Bricks players send each other through a network-kit room, and the checks the
 * receiving browser makes before using it (the Firebase rules used to make the same format
 * checks on the server). Nothing here proves a player is honest; it only keeps broken or
 * nonsensical data off the screen and out of the results.
 */
export type NetMode = 'score-duel' | 'battle'
export interface NetSettings { readonly revision: number; readonly mode: NetMode; readonly startLevel: number; readonly hold: boolean; readonly requireApproval: boolean }
export const DEFAULT_NET_SETTINGS: NetSettings = { revision: 0, mode: 'score-duel', startLevel: 0, hold: false, requireApproval: false }

/** Shared room data, set by the host: settings, the guest's approval and the round's players. */
export interface RoomData {
  readonly v: 1
  readonly settings: NetSettings
  /** Settings revision the guest approved (0: none). */
  readonly approved: number
}

export interface BoardMessage {
  readonly t: 'board'
  readonly round: number
  readonly seq: number
  readonly board: string
  readonly next: PieceType
  readonly held: PieceType | '-'
  readonly status: 'playing' | 'gameOver'
  readonly score: number
  readonly level: number
  readonly lines: number
}
export interface AttackMessage { readonly t: 'attack'; readonly round: number; readonly total: number }
export interface FinishMessage { readonly t: 'finish'; readonly round: number; readonly frame: number; readonly sent: number; readonly received: number; readonly applied: number; readonly cancelled: number }
/** Who a participant is across rooms (for local results), sent on joining and coming back. */
export interface HelloMessage { readonly t: 'hello'; readonly player: string }
export interface ApproveMessage { readonly t: 'approve'; readonly revision: number }
/** "I am in the lobby, ready for round `round` + 1." */
export interface LobbyMessage { readonly t: 'lobby'; readonly round: number }
/** The sender left the running round (or reloaded and lost its game). */
export interface QuitMessage { readonly t: 'quit'; readonly round: number }
export type NetMessage = BoardMessage | AttackMessage | FinishMessage | HelloMessage | ApproveMessage | LobbyMessage | QuitMessage

const MAX = 1_000_000_000
const count = (value: unknown, max = MAX): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max
const piece = (value: unknown): value is PieceType => typeof value === 'string' && (PIECE_TYPES as readonly string[]).includes(value)
const exactKeys = (value: object, keys: readonly string[]) => Object.keys(value).length === keys.length && keys.every(key => key in value)

export function parseSettings(value: unknown): NetSettings | null {
  const s = value as NetSettings
  if (!s || typeof s !== 'object' || !exactKeys(s, ['revision', 'mode', 'startLevel', 'hold', 'requireApproval'])) return null
  if (!count(s.revision) || (s.mode !== 'score-duel' && s.mode !== 'battle') || !count(s.startLevel, 19) || typeof s.hold !== 'boolean' || typeof s.requireApproval !== 'boolean') return null
  return s
}

export function parseRoomData(value: unknown): RoomData {
  const d = value as RoomData
  const settings = d && typeof d === 'object' && d.v === 1 ? parseSettings(d.settings) : null
  if (!settings || !count(d.approved)) return { v: 1, settings: DEFAULT_NET_SETTINGS, approved: 0 }
  return { v: 1, settings, approved: d.approved }
}

export function parseMessage(value: unknown): NetMessage | null {
  const m = value as NetMessage
  if (!m || typeof m !== 'object' || typeof m.t !== 'string') return null
  switch (m.t) {
    case 'board':
      return exactKeys(m, ['t', 'round', 'seq', 'board', 'next', 'held', 'status', 'score', 'level', 'lines'])
        && count(m.round) && m.round >= 1 && count(m.seq) && m.seq >= 1 && typeof m.board === 'string' && /^[0-8]{200}$/.test(m.board)
        && piece(m.next) && (m.held === '-' || piece(m.held)) && (m.status === 'playing' || m.status === 'gameOver')
        && count(m.score) && count(m.level, 255) && count(m.lines, 100_000) ? m : null
    case 'attack':
      return exactKeys(m, ['t', 'round', 'total']) && count(m.round) && m.round >= 1 && count(m.total, 100_000) ? m : null
    case 'finish':
      return exactKeys(m, ['t', 'round', 'frame', 'sent', 'received', 'applied', 'cancelled']) && count(m.round) && m.round >= 1
        && count(m.frame, 60 * 60 * 60 * 24) && count(m.sent, 100_000) && count(m.received, 100_000) && count(m.applied, 100_000) && count(m.cancelled, 100_000)
        && m.applied + m.cancelled <= m.received ? m : null
    case 'hello':
      return exactKeys(m, ['t', 'player']) && typeof m.player === 'string' && /^[a-f0-9]{16}$/.test(m.player) ? m : null
    case 'approve':
      return exactKeys(m, ['t', 'revision']) && count(m.revision) && m.revision >= 1 ? m : null
    case 'lobby':
    case 'quit':
      return exactKeys(m, ['t', 'round']) && count(m.round) ? m : null
    default:
      return null
  }
}

/**
 * The opponent's stream within one round: sequence numbers only go up, a finished game
 * never comes back, and attack totals and the final result never go down or change.
 */
export class OpponentStream {
  private seq = 0
  private finished = false
  private attacks = 0
  private finish: FinishMessage | null = null
  readonly round: number
  constructor(round: number) { this.round = round }
  board(message: BoardMessage): boolean {
    if (message.round !== this.round || message.seq <= this.seq || this.finished) return false
    this.seq = message.seq
    if (message.status === 'gameOver') this.finished = true
    return true
  }
  attack(message: AttackMessage): boolean {
    if (message.round !== this.round || message.total < this.attacks) return false
    this.attacks = message.total
    return true
  }
  /** F-038: continue a stream known before a page reload. */
  restore(last: BoardMessage | null, attacks: number, finish: FinishMessage | null) {
    if (last && last.round === this.round) { this.seq = last.seq; this.finished = last.status === 'gameOver' }
    this.attacks = attacks
    if (finish && finish.round === this.round) this.finish = finish
  }
  get attackTotal() { return this.attacks }
  final(message: FinishMessage): boolean {
    if (message.round !== this.round || this.finish) return false
    this.finish = message
    return true
  }
}

/** A stable 32-hex match id both players derive alike (the local results need one). */
export function matchId(code: string, round: number, seed: number): string {
  let out = ''
  for (let part = 0; part < 4; part++) {
    let hash = 0x811c9dc5 ^ part
    for (const char of `${code}:${round}:${seed}:${part}`) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 0x01000193) >>> 0 }
    out += hash.toString(16).padStart(8, '0')
  }
  return out
}

export const PLAYER_ID_KEY = 'bricks.player-id.v1'
/** This device's player id for local results across rooms (network-kit ids are per room). */
export function localPlayerId(storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage, random: () => number = Math.random): string {
  try {
    const saved = storage.getItem(PLAYER_ID_KEY)
    if (saved && /^[a-f0-9]{16}$/.test(saved)) return saved
  } catch { /* A fresh id still works for this visit. */ }
  const id = Array.from({ length: 16 }, () => Math.floor(random() * 16).toString(16)).join('')
  try { storage.setItem(PLAYER_ID_KEY, id) } catch { /* Not remembered on this device. */ }
  return id
}
