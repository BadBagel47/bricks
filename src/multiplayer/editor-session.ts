import { onDisconnect, ref, remove, set } from 'firebase/database'
import type { Database } from 'firebase/database'
import type { JoinedRoom } from './room-model.ts'

/** A per-tab marker, never the draft. Old role generations cannot hold the UI. */
export function publishEditor(database: Database, joined: JoinedRoom, failed: (reason: unknown) => void): () => void {
  const location = ref(database, `matchSettings/${joined.code}/${joined.room.epoch}/editors/${joined.uid}/${crypto.randomUUID().replaceAll('-', '')}`)
  const disconnect = onDisconnect(location)
  let stopped = false
  const pending = (async () => {
    await disconnect.remove()
    if (!stopped) await set(location, { roleRevision: joined.room.roleRevision ?? 0 })
  })().catch(reason => { if (!stopped) failed(reason) })
  return () => {
    stopped = true
    void pending.then(async () => {
      await remove(location)
      await disconnect.cancel()
    }).catch(() => { /* Registered onDisconnect is the fallback. */ })
  }
}
