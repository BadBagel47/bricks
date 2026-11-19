// F-028: typed view of the vendored network-kit client (plain JavaScript, fixed version
// in vendor/network-kit; never edit the copy). Only the parts Bricks uses are typed.
import * as kit from '../../vendor/network-kit/client/index.js'

/** Bricks' room server: the `bricks` Worker on Cloudflare (EU rooms). */
export const ROOMS_SERVER: string = import.meta.env.VITE_ROOMS_ORIGIN || 'https://bricks.l8p1.workers.dev'

export interface KitPlayer { readonly id: string; readonly name: string; readonly role: string; readonly status: string }
export interface KitRoomState {
  readonly phase: 'lobby' | 'countdown' | 'playing' | 'ended'
  readonly round: number
  readonly seed: number | null
  readonly startsAt: number | null
  readonly paused: unknown
  readonly ownerId: string | null
  readonly hostId: string | null
  readonly data: unknown
  readonly players: readonly KitPlayer[]
}
export interface KitMessage { readonly from: string | null; readonly data: unknown; readonly at?: number }
export interface KitClosed { readonly code: number; readonly reason?: string; readonly text?: string }
export interface KitError { readonly code: string; readonly command?: string; readonly text?: string }
export interface KitPeer { readonly event: string; readonly id: string; readonly name?: string; readonly returning?: boolean }

export interface KitRoom {
  readonly code: string
  readonly me: string | null
  readonly room: KitRoomState | null
  readonly isHost: boolean
  readonly isOwner: boolean
  readonly players: readonly KitPlayer[]
  readonly status: string
  readonly inviteKeys: Record<string, { k: string }> | null
  readonly lobby?: { role: string; ends: number | null }
  serverNow(): number
  on(type: 'room', fn: (room: KitRoomState) => void): () => void
  on(type: 'message', fn: (message: KitMessage) => void): () => void
  on(type: 'status', fn: (status: string) => void): () => void
  on(type: 'closed', fn: (closed: KitClosed) => void): () => void
  on(type: 'error', fn: (error: KitError) => void): () => void
  on(type: 'peer', fn: (peer: KitPeer) => void): () => void
  on(type: 'welcome', fn: () => void): () => void
  send(data: unknown, options?: { to?: string | readonly string[]; reliable?: boolean; latest?: string }): boolean
  setData(data: unknown): unknown
  start(): unknown
  cancelStart(): unknown
  end(): unknown
  leave(): unknown
  disconnect(): void
}

interface Options { name: string; code?: string; key?: string | null; identity?: 'tab' | 'device'; heartbeatMs?: number }
const SHARED = { identity: 'device' as const, heartbeatMs: 2000 }

export const NetworkRoom = kit.NetworkRoom as {
  create(server: string, options: Options): Promise<KitRoom>
  join(server: string, options: Options): Promise<KitRoom>
  joinLobby(server: string, options: Options): Promise<KitRoom>
  info(server: string, code: string): Promise<{ code: string; phase: string; closed?: boolean } | null>
}
export const shareLink = kit.shareLink as (href: string, code: string, key?: string) => string
export const readShareLink = kit.readShareLink as (hash: string) => { code: string; key: string | null } | null
export const forgetShareKey = kit.forgetShareKey as () => void
export const readLobbyLink = kit.readLobbyLink as (hash?: string) => string | null
export const watchNotices = kit.watchNotices as (server: string, options?: { mode?: string }) => (() => void) | { stop?: () => void } | undefined

/** Create, join or open a lobby with Bricks' client options: one participant per device (as with the Firebase sign-in), fast notice of lost connections. */
export const createRoom = (name: string) => NetworkRoom.create(ROOMS_SERVER, { name, ...SHARED })
export const joinRoom = (name: string, code: string, key: string | null = null) => NetworkRoom.join(ROOMS_SERVER, { name, code, key, ...SHARED })
export const joinLobby = (name: string) => NetworkRoom.joinLobby(ROOMS_SERVER, { name, ...SHARED })
