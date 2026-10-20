import { MultiplayerError } from './errors.ts'

export interface RoomPlayer { readonly uid: string; readonly name: string }
export interface Room {
  readonly version: 1
  readonly ownerUid: string
  readonly hostUid: string
  readonly epoch: number
  readonly status: 'waiting' | 'closed'
  readonly createdAt: number
  readonly players: { readonly host: RoomPlayer; readonly guest?: RoomPlayer }
}
export interface JoinedRoom { readonly code: string; readonly room: Room; readonly uid: string }
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const PREVIOUS_ROOM_KEY = 'bricks.previous-room.v1'

export function previousRoomCode(): string | null {
  try { const code = localStorage.getItem(PREVIOUS_ROOM_KEY); return code ? normalizeRoomCode(code) : null } catch { return null }
}

export function normalizeRoomCode(value: string): string {
  const code = value.trim().toUpperCase()
  if (!/^[A-HJ-NP-Z2-9]{6,8}$/.test(code)) throw new MultiplayerError('invalid-code')
  return code
}

export function randomRoomCode(): string {
  // The 32-character alphabet divides the byte range exactly, without modulo bias.
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return [...bytes].map(value => CODE_ALPHABET[value % CODE_ALPHABET.length]).join('')
}

export function inviteURL(code: string, currentURL: string): string {
  const url = new URL(currentURL)
  url.searchParams.set('room', normalizeRoomCode(code))
  url.hash = ''
  return url.href
}

function object(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}
function player(value: unknown): value is RoomPlayer {
  return object(value) && typeof value.uid === 'string' && value.uid.length > 0 && value.uid.length <= 128 &&
    typeof value.name === 'string' && value.name.trim() === value.name && value.name.length >= 2 && value.name.length <= 16 && !/[\r\n\t]/.test(value.name) && Object.keys(value).length === 2
}

export function parseRoom(value: unknown): Room {
  if (!object(value) || value.version !== 1 || typeof value.ownerUid !== 'string' || value.hostUid !== value.ownerUid ||
      !Number.isSafeInteger(value.epoch) || (value.epoch as number) < 1 || (value.epoch as number) > 1_000_000_000 ||
      !Number.isSafeInteger(value.createdAt) || (value.createdAt as number) < 0 ||
      (value.status !== 'waiting' && value.status !== 'closed') || !object(value.players) || !player(value.players.host) ||
      value.players.host.uid !== value.hostUid || Object.keys(value).length !== 7 ||
      Object.keys(value.players).some(key => key !== 'host' && key !== 'guest') ||
      (value.players.guest !== undefined && (!player(value.players.guest) || value.players.guest.uid === value.hostUid || value.status !== 'waiting'))) {
    throw new MultiplayerError('session-expired')
  }
  return value as unknown as Room
}

export function roomPlayer(uid: string, name: string): RoomPlayer {
  const result = { uid, name: name.trim() }
  if (!player(result)) throw new MultiplayerError('permission')
  return result
}

export function claimGuest(room: Room, who: RoomPlayer): Room {
  if (room.status === 'closed') throw new MultiplayerError('room-closed')
  if (room.hostUid === who.uid || room.players.guest?.uid === who.uid) return room
  if (room.players.guest) throw new MultiplayerError('room-full')
  return { ...room, players: { ...room.players, guest: who } }
}
