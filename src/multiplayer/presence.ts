import { onDisconnect, onValue, ref, remove, set } from 'firebase/database'
import type { Database } from 'firebase/database'
import { playerFacingError } from './errors.ts'
import type { MultiplayerError } from './errors.ts'
import type { JoinedRoom } from './room-model.ts'

export type RoomPresence = Readonly<Record<string, boolean>>

/** One connection record per lobby/tab, no timer writes or heartbeats. */
export function observePresence(database: Database, joined: JoinedRoom, next: (value: RoomPresence) => void, failed: (error: MultiplayerError) => void): () => void {
  const base = `presence/${joined.code}/${joined.room.epoch}`
  const connection = ref(database, `${base}/${joined.uid}/${crypto.randomUUID().replaceAll('-', '')}`)
  const disconnect = onDisconnect(connection)
  let stopped = false
  let sequence = Promise.resolve()
  const stopRead = onValue(ref(database, base), snapshot => {
    const result: Record<string, boolean> = {}
    snapshot.forEach(child => { result[child.key!] = child.hasChildren() })
    next(result)
  }, error => failed(playerFacingError(error)))
  const stopConnection = onValue(ref(database, '.info/connected'), snapshot => {
    if (snapshot.val() !== true) return
    sequence = sequence.then(async () => {
      if (stopped) return
      // Register cleanup before publishing online, including after reconnects.
      await disconnect.remove()
      if (!stopped) await set(connection, true)
    }).catch(error => { if (!stopped) failed(playerFacingError(error)) })
  })
  return () => {
    stopped = true
    stopRead(); stopConnection()
    // Serialize against an in-flight registration/write, including StrictMode.
    void sequence.then(async () => {
      await remove(connection)
      await disconnect.cancel()
    }).catch(() => { /* The registered onDisconnect remains the fallback. */ })
  }
}
