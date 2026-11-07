import { get, ref, set } from 'firebase/database'
import type { Database } from 'firebase/database'
import { battlePath, parseAttackStream } from './battle-repository.ts'
import { claimControlLease } from './control-lease.ts'
import { parseGameSnapshot } from './game-snapshot.ts'
import type { MatchStart } from './match-start.ts'
import type { JoinedRoom } from './room-model.ts'
import { restoreCheckpoint } from './restore-checkpoint.ts'

export interface RecoveryReadiness { readonly matchId: string; readonly connection: string; readonly leaseRevision: number; readonly checkpointSeq: number; readonly battleFrame: number }
export const recoveryReadinessPath = (joined: JoinedRoom, uid: string) => `recoveryReadiness/${joined.code}/${joined.room.epoch}/${uid}`

/** Confirm only after the saved engine and Battle prefixes agree with the server. */
export async function prepareRecovery(database: Database, joined: JoinedRoom, start: MatchStart, connection: string): Promise<RecoveryReadiness> {
  const lease = await claimControlLease(database, joined, start, connection)
  const base = `${joined.code}/${joined.room.epoch}`
  const opponent = joined.uid === start.hostUid ? start.guestUid : start.hostUid
  const [saved, displayed, ownAttack, otherAttack] = await Promise.all([
    get(ref(database, `recoveryCheckpoints/${base}/${joined.uid}`)),
    get(ref(database, `gameSnapshots/${base}/${joined.uid}`)),
    start.settings.mode === 'battle' ? get(ref(database, battlePath('battleAttacks', joined, joined.uid))) : Promise.resolve(null),
    start.settings.mode === 'battle' ? get(ref(database, battlePath('battleAttacks', joined, opponent))) : Promise.resolve(null),
  ])
  const snapshot = parseGameSnapshot(displayed.val())
  if (!snapshot) throw new Error('No acknowledged game snapshot')
  const own = parseAttackStream(ownAttack?.val() ?? null), other = parseAttackStream(otherAttack?.val() ?? null)
  const restored = restoreCheckpoint(saved.val(), snapshot, start, joined, { own: own?.matchId === start.id ? own.total : 0, opponent: other?.matchId === start.id ? other.total : 0 })
  const readiness: RecoveryReadiness = { matchId: start.id, connection, leaseRevision: lease.revision, checkpointSeq: snapshot.seq, battleFrame: restored.battle?.battle.frame ?? 0 }
  const location = ref(database, recoveryReadinessPath(joined, joined.uid))
  const current = (await get(location)).val()
  if (!current || Object.entries(readiness).some(([key, value]) => current[key] !== value)) await set(location, readiness)
  return readiness
}
