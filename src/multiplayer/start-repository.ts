import { freshSeed, parseReadiness, previousRoundId, readyForRound, readinessPath } from './round-readiness.ts'
import { get, ref, runTransaction, serverTimestamp } from 'firebase/database'
import type { Database } from 'firebase/database'
import { MultiplayerError } from './errors.ts'
import { parseMatchStart } from './match-start.ts'
import type { Connections } from './match-start.ts'
import type { JoinedRoom } from './room-model.ts'
import type { MatchSettings } from './match-settings.ts'

export function startPath(joined: JoinedRoom) { return `matchStarts/${joined.code}/${joined.room.epoch}` }
export async function createMatchStart(database: Database, joined: JoinedRoom, settings: MatchSettings, connections: Connections, localConnection: string) {
  const guestUid = joined.room.players.guest?.uid
  const before = parseMatchStart((await get(ref(database, startPath(joined)))).val())
  if (before && before.status !== 'cancelled') throw new MultiplayerError('permission')
  const previousId = previousRoundId(before)
  const roleRevision = joined.room.roleRevision ?? 0
  const readiness = parseReadiness((await get(ref(database, readinessPath(joined)))).val())
  if (!readyForRound(readiness.host, joined.uid, previousId, roleRevision, connections, localConnection) || !readyForRound(readiness.guest, guestUid, previousId, roleRevision, connections)) throw new MultiplayerError('permission')
  const guestConnection = readiness.guest?.connection
  if (joined.uid !== joined.room.hostUid || !guestUid || !guestConnection || connections[joined.uid]?.[localConnection] !== true) throw new MultiplayerError('permission')
  const proposal = { roundVersion: 1, previousId, ...(settings.mode === 'battle' ? { battleVersion: 1 } : {}), id: crypto.randomUUID().replaceAll('-', ''), status: 'countdown', seed: freshSeed(before?.seed, crypto.getRandomValues(new Uint32Array(1))[0]), countdownAt: serverTimestamp(), settings: { ...settings }, roleRevision: joined.room.roleRevision ?? 0, hostUid: joined.uid, guestUid, hostConnection: localConnection, guestConnection }
  const result = await runTransaction(ref(database, startPath(joined)), value => {
    const current = parseMatchStart(value ?? before)
    return (current?.id ?? '-') === previousId && (!current || current.status === 'cancelled') ? proposal : undefined
  }, { applyLocally: false })
  if (!result.committed) throw new MultiplayerError('permission')
}
export async function transitionMatchStart(database: Database, joined: JoinedRoom, expectedId: string, status: 'ready' | 'cancelled') {
  const location = ref(database, startPath(joined))
  const before = parseMatchStart((await get(location)).val())
  if (!before || before.id !== expectedId) return
  await runTransaction(location, value => {
    const current = parseMatchStart(value ?? before)
    if (!current || current.id !== expectedId || current.status === 'cancelled' || current.status === status) return undefined
    return { ...current, status }
  }, { applyLocally: false })
}
export async function cancelCurrentStart(database: Database, joined: JoinedRoom) {
  const current = parseMatchStart((await get(ref(database, startPath(joined)))).val())
  if (current && current.status !== 'cancelled') await transitionMatchStart(database, joined, current.id, 'cancelled')
}
