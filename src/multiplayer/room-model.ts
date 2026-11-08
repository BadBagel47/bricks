import { MultiplayerError } from './errors.ts'

export interface RoomPlayer { readonly uid: string; readonly name: string }
export interface Room {
  readonly roleRevision?: number
  readonly version: 1
  readonly ownerUid: string
  readonly hostUid: string
  readonly epoch: number
  readonly status: 'waiting' | 'closed'
  readonly createdAt: number
  readonly players: { readonly host: RoomPlayer; readonly guest?: RoomPlayer }
}
export interface JoinedRoom { readonly code: string; readonly room: Room; readonly uid: string; readonly private?: boolean }
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const PREVIOUS_ROOM_KEY = 'bricks.previous-room.v1'

export function previousRoomCode(): string | null {
  try { const code = localStorage.getItem(PREVIOUS_ROOM_KEY); return code ? normalizeRoomCode(code) : null } catch { return null }
}

export function normalizeRoomCode(value: string): string {
  const code = value.trim().toUpperCase()
  if (!/^[A-HJ-NP-Z2-9]{4,8}$/.test(code)) throw new MultiplayerError('invalid-code')
  return code
}

export function randomRoomCode(): string {
  // The 32-character alphabet divides the byte range exactly, without modulo bias.
  const bytes = crypto.getRandomValues(new Uint8Array(4))
  return [...bytes].map(value => CODE_ALPHABET[value % CODE_ALPHABET.length]).join('')
}

export function inviteURL(code: string, currentURL: string, token?: string): string {
  const url = new URL(currentURL)
  url.searchParams.set('room', normalizeRoomCode(code))
  url.hash = token && /^[a-f0-9]{64}$/.test(token) ? `invite=${token}` : ''
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
  if (!object(value) || value.version !== 1 || typeof value.ownerUid !== 'string' || !value.ownerUid || value.ownerUid.length > 128 || typeof value.hostUid !== 'string' ||
      !Number.isSafeInteger(value.epoch) || (value.epoch as number) < 1 || (value.epoch as number) > 1_000_000_000 ||
      !Number.isSafeInteger(value.createdAt) || (value.createdAt as number) < 0 ||
      (value.status !== 'waiting' && value.status !== 'closed') || !object(value.players) || !player(value.players.host) ||
      value.players.host.uid !== value.hostUid || (Object.keys(value).length !== (value.roleRevision === undefined ? 7 : 8) || (value.roleRevision !== undefined && (!Number.isSafeInteger(value.roleRevision) || (value.roleRevision as number) < 0 || (value.roleRevision as number) > 1000000000))) ||
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

/** Host authority moves; the immutable reservation owner does not. */
export function transferHost(room: Room, uid: string): Room {
  if (room.status !== 'waiting' || room.hostUid !== uid) throw new MultiplayerError('permission')
  if (!room.players.guest) throw new MultiplayerError('room-not-found')
  return { ...room, roleRevision: (room.roleRevision ?? 0) + 1, hostUid: room.players.guest.uid, players: { host: room.players.guest, guest: room.players.host } }
}

export function leaveRoom(room: Room, uid: string): Room {
  if (room.status !== 'waiting') return room
  if (room.hostUid === uid) {
    if (room.players.guest) {
      const next = transferHost(room, uid)
      return { ...next, players: { host: next.players.host } }
    }
    return { ...room, status: 'closed' }
  }
  if (room.players.guest?.uid !== uid) throw new MultiplayerError('session-expired')
  return { ...room, players: { host: room.players.host } }
}
