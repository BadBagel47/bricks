import { get, ref, runTransaction } from 'firebase/database'
import type { Database } from 'firebase/database'
import type { JoinedRoom } from './room-model.ts'
import type { RoundIntent } from './round-readiness.ts'
import { readinessPath } from './round-readiness.ts'

export async function publishReadiness(database: Database, joined: JoinedRoom, connection: string, previousId: string, relevant: () => boolean = () => true) {
  const role = joined.uid === joined.room.hostUid ? 'host' : 'guest'
  const location = ref(database, `${readinessPath(joined)}/${role}`)
  const baseline = (await get(location)).val() as RoundIntent | null
  if (!relevant()) return
  const next: RoundIntent = { uid: joined.uid, connection, previousId, roleRevision: joined.room.roleRevision ?? 0 }
  await runTransaction(location, value => {
    if (!relevant()) return undefined
    const current = value ?? baseline
    return current && Object.keys(next).every(key => current[key] === next[key as keyof RoundIntent]) ? undefined : next
  }, { applyLocally: false })
}
export async function withdrawReadiness(database: Database, joined: JoinedRoom, connection: string, relevant: () => boolean = () => true) {
  for (const role of ['host', 'guest']) {
    if (!relevant()) return
    const location = ref(database, `${readinessPath(joined)}/${role}`)
    const before = (await get(location)).val() as RoundIntent | null
    if (!relevant() || before?.uid !== joined.uid || before.connection !== connection) continue
    await runTransaction(location, value => {
      if (!relevant()) return undefined
      const current = value ?? before
      return current?.uid === joined.uid && current.connection === connection ? null : undefined
    }, { applyLocally: false })
  }
}
