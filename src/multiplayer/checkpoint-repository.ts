import { ref, serverTimestamp, update } from 'firebase/database'
import type { Database } from 'firebase/database'
import type { JoinedRoom } from './room-model.ts'
import type { GameState } from '../engine/types.ts'
import type { BattleCheckpoint } from './battle-checkpoint.ts'
import type { GameSnapshot } from './game-snapshot.ts'
import { visibleBoard } from './game-snapshot.ts'

/** Encode the fixed board once, even in Battle, to limit database traffic. */
export function encodeCheckpoint(game: GameState, battle: BattleCheckpoint | null): string {
  const board = visibleBoard({ board: game.board, active: null })
  const { game: _battleGame, ...battleState } = battle ?? { game: null }
  return JSON.stringify({ version: 1, game: { ...game, board }, battle: battle ? battleState : null })
}

/** Store only the latest state for each participant, together with its display snapshot. */
export async function publishCheckpoint(database: Database, joined: JoinedRoom, snapshot: Omit<GameSnapshot, 'updatedAt'>, game: GameState, battle: BattleCheckpoint | null) {
  const payload = encodeCheckpoint(game, battle)
  if (payload.length > 8192) throw new Error('Checkpoint is too large')
  const prefix = `${joined.code}/${joined.room.epoch}/${joined.uid}`
  await update(ref(database), {
    [`gameSnapshots/${prefix}`]: { ...snapshot, updatedAt: serverTimestamp() },
    [`recoveryCheckpoints/${prefix}`]: { matchId: snapshot.matchId, connection: snapshot.connection, seq: snapshot.seq, payload, updatedAt: serverTimestamp() },
  })
}
