import { get, goOffline, goOnline, onValue, ref, runTransaction, serverTimestamp } from 'firebase/database'
import type { Unsubscribe } from 'firebase/database'
import type { FirebaseClient } from './firebase-client.ts'
import { MultiplayerError, playerFacingError } from './errors.ts'
import { claimGuest, leaveRoom, transferHost, normalizeRoomCode, parseRoom, randomRoomCode, roomPlayer, PREVIOUS_ROOM_KEY } from './room-model.ts'
import type { JoinedRoom, Room } from './room-model.ts'

function remember(code: string) { try { localStorage.setItem(PREVIOUS_ROOM_KEY, code) } catch { /* Ownership is authenticated, not stored in this hint. */ } }

export class Rooms {
  private readonly client: FirebaseClient
  constructor(client: FirebaseClient) { this.client = client }

  private async identity() {
    goOnline(this.client.database)
    const uid = (await this.client.getPlayer()).uid
    await new Promise<void>((resolve, reject) => {
      let stop: Unsubscribe | undefined
      let settled = false
      const finish = (error?: unknown) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        stop?.()
        if (error) reject(playerFacingError(error)); else resolve()
      }
      const timer = setTimeout(() => finish(new MultiplayerError('connection')), 8000)
      stop = this.connection(connected => { if (connected) finish() }, finish)
      if (settled) stop()
    })
    return uid
  }

  suspend() { goOffline(this.client.database) }

  get database() { return this.client.database }

  connection(next: (connected: boolean) => void, error: (error: MultiplayerError) => void): Unsubscribe {
    return onValue(ref(this.client.database, '.info/connected'), snapshot => next(snapshot.val() === true), reason => error(playerFacingError(reason)))
  }

  private async reserve(code: string, uid: string): Promise<void> {
    const location = ref(this.client.database, `roomReservations/${code}`)
    try {
      const result = await runTransaction(location, current => current === null ? { version: 1, ownerUid: uid, createdAt: serverTimestamp() } : undefined, { applyLocally: false })
      if (result.committed || result.snapshot.val()?.ownerUid === uid) return
    } catch (error) {
      if (playerFacingError(error).code !== 'permission') throw error
    }
    const existing = await get(location)
    if (existing.val()?.ownerUid !== uid) throw new MultiplayerError('code-taken')
  }

  private async transact(code: string, change: (room: Room) => Room, epoch?: number): Promise<Room> {
    const location = ref(this.client.database, `rooms/${code}`)
    const before = await get(location)
    if (!before.exists()) throw new MultiplayerError('room-not-found')
    const initial = parseRoom(before.val())
    let rejection: unknown
    // Firebase can first call a transaction with an empty local cache. A read
    // baseline lets that first proposal reach the server's compare-and-swap.
    const result = await runTransaction(location, value => {
      rejection = undefined
      try {
        const current = value === null ? initial : parseRoom(value)
        if (epoch !== undefined && current.epoch !== epoch) throw new MultiplayerError('session-expired')
        const next = change(current)
        return next === current ? undefined : next
      } catch (error) { rejection = error; return undefined }
    }, { applyLocally: false })
    if (rejection) throw rejection
    return parseRoom(result.snapshot.exists() ? result.snapshot.val() : initial)
  }

  async create(name: string, customCode?: string): Promise<JoinedRoom> {
    try {
      const uid = await this.identity()
      const host = roomPlayer(uid, name)
      for (let attempt = 0; attempt < 8; attempt++) {
        const code = customCode ? normalizeRoomCode(customCode) : randomRoomCode()
        try { await this.reserve(code, uid) } catch (error) {
          if (!customCode && error instanceof MultiplayerError && error.code === 'code-taken') continue
          throw error
        }
        const location = ref(this.client.database, `rooms/${code}`)
        const result = await runTransaction(location, current => current === null ? {
          version: 1, ownerUid: uid, hostUid: uid, epoch: 1, status: 'waiting', createdAt: serverTimestamp(), players: { host },
        } : undefined, { applyLocally: false })
        if (!result.committed) throw new MultiplayerError('code-taken')
        remember(code)
        return { code, room: parseRoom(result.snapshot.val()), uid }
      }
      throw new MultiplayerError('unavailable')
    } catch (error) { throw playerFacingError(error) }
  }

  async join(input: string, name: string): Promise<JoinedRoom> {
    try {
      const code = normalizeRoomCode(input)
      const uid = await this.identity()
      const who = roomPlayer(uid, name)
      return { code, uid, room: await this.transact(code, room => claimGuest(room, who)) }
    } catch (error) { throw playerFacingError(error) }
  }

  async reopen(input: string, name: string): Promise<JoinedRoom> {
    try {
      const code = normalizeRoomCode(input)
      const uid = await this.identity()
      const reservation = await get(ref(this.client.database, `roomReservations/${code}`))
      if (reservation.val()?.ownerUid !== uid) throw new MultiplayerError('ownership-lost')
      const existing = await get(ref(this.client.database, `rooms/${code}`))
      if (!existing.exists()) return await this.create(name, code)
      const host = roomPlayer(uid, name)
      const room = await this.transact(code, current => {
        if (current.ownerUid !== uid) throw new MultiplayerError('ownership-lost')
        if (current.status === 'waiting' && current.hostUid !== uid && current.players.guest?.uid !== uid) throw new MultiplayerError('permission')
        return current.status === 'waiting' ? current : { ...current, epoch: current.epoch + 1, status: 'waiting', players: { host } }
      })
      remember(code)
      return { code, room, uid }
    } catch (error) { throw playerFacingError(error) }
  }

  async leave(joined: JoinedRoom, onlyIfEmpty = false): Promise<void> {
    try {
      const uid = await this.identity()
      if (uid !== joined.uid) throw new MultiplayerError('permission')
      await this.transact(joined.code, room => {
        if (onlyIfEmpty && room.players.guest) throw new MultiplayerError('room-full')
        return leaveRoom(room, uid)
      }, joined.room.epoch)
    } catch (error) { throw playerFacingError(error) }
  }

  async changeCode(joined: JoinedRoom, input: string, name: string): Promise<JoinedRoom> {
    try {
      const code = normalizeRoomCode(input)
      if (code === joined.code) return joined
      const uid = await this.identity()
      if (joined.room.ownerUid !== uid || joined.room.hostUid !== uid) throw new MultiplayerError('permission')
      await this.reserve(code, uid)
      const target = await get(ref(this.client.database, `rooms/${code}`))
      if (target.exists() && parseRoom(target.val()).status !== 'closed') throw new MultiplayerError('code-taken')
      // Close first, guarded by the live guest slot. If a guest wins the race,
      // no replacement room opens. Failed later steps leave an owned reservation.
      await this.leave(joined, true)
      return await this.reopen(code, name)
    } catch (error) { throw playerFacingError(error) }
  }

  async releaseDisconnectedGuest(joined: JoinedRoom, guestUid: string): Promise<void> {
    try {
      const uid = await this.identity()
      if (uid !== joined.uid) throw new MultiplayerError('permission')
      await this.transact(joined.code, room => {
        if (room.hostUid !== uid) throw new MultiplayerError('permission')
        if (room.players.guest?.uid !== guestUid) return room
        // Server rules check absence across every connection belonging to the guest.
        return { ...room, players: { host: room.players.host } }
      }, joined.room.epoch)
    } catch (error) { throw playerFacingError(error) }
  }

  async transfer(joined: JoinedRoom): Promise<void> {
    try {
      const uid = await this.identity()
      if (uid !== joined.uid) throw new MultiplayerError('permission')
      await this.transact(joined.code, room => transferHost(room, uid), joined.room.epoch)
    } catch (error) { throw playerFacingError(error) }
  }

  watch(joined: JoinedRoom, next: (room: Room) => void, error: (error: MultiplayerError) => void): Unsubscribe {
    let admitted = false
    // A transaction's preflight get can leave an older cached room snapshot.
    // Ignore that pre-join cache until membership is observed, with a bounded wait.
    const timer = setTimeout(() => { if (!admitted) error(new MultiplayerError('session-expired')) }, 8000)
    const stop = onValue(ref(this.client.database, `rooms/${joined.code}`), snapshot => {
      try {
        if (!snapshot.exists()) throw new MultiplayerError('room-not-found')
        const room = parseRoom(snapshot.val())
        if (room.epoch !== joined.room.epoch) throw new MultiplayerError('session-expired')
        const member = room.hostUid === joined.uid || room.players.guest?.uid === joined.uid
        if (room.status === 'waiting' && !member) {
          if (admitted) throw new MultiplayerError('session-expired')
          return
        }
        admitted = true
        clearTimeout(timer)
        next(room)
      } catch (reason) { clearTimeout(timer); error(playerFacingError(reason)) }
    }, reason => { clearTimeout(timer); error(playerFacingError(reason)) })
    return () => { clearTimeout(timer); stop() }
  }
}
