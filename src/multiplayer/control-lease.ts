import { get, ref, runTransaction } from 'firebase/database'
import type { Database } from 'firebase/database'
import type { JoinedRoom } from './room-model.ts'
import type { MatchStart } from './match-start.ts'

export interface ControlLease { readonly matchId: string; readonly connection: string; readonly revision: number }
export const leasePath = (joined: JoinedRoom) => `controlLeases/${joined.code}/${joined.room.epoch}/${joined.uid}`

export function parseControlLease(value: unknown): ControlLease | null {
  if (value === null) return null
  const lease = value as ControlLease
  if (!lease || typeof lease !== 'object' || Object.keys(lease).length !== 3 || !/^[a-f0-9]{32}$/.test(lease.matchId) || !/^[a-f0-9]{32}$/.test(lease.connection) || !Number.isSafeInteger(lease.revision) || lease.revision < 1 || lease.revision > 1000000000) throw new Error('Invalid control lease')
  return lease
}

/** Rules enforce membership, presence and that a prior controller has gone away. */
export async function claimControlLease(database: Database, joined: JoinedRoom, start: MatchStart, connection: string): Promise<ControlLease> {
  if (joined.uid !== start.hostUid && joined.uid !== start.guestUid) throw new Error('Not a match participant')
  if (!/^[a-f0-9]{32}$/.test(connection)) throw new Error('Invalid connection')
  const location = ref(database, leasePath(joined))
  const baseline = parseControlLease((await get(location)).val())
  if (baseline?.matchId === start.id && baseline.connection === connection) return baseline
  const result = await runTransaction(location, value => {
    const current = parseControlLease(value ?? baseline)
    if (current?.matchId === start.id && current.connection === connection) return undefined
    return { matchId: start.id, connection, revision: current?.matchId === start.id ? current.revision + 1 : 1 }
  }, { applyLocally: false })
  const lease = parseControlLease(result.snapshot.val())
  if (!lease || lease.matchId !== start.id || lease.connection !== connection) throw new Error('Control is held by another connection')
  return lease
}
