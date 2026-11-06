import type { GameSnapshot } from './game-snapshot.ts'

type PublishedScore = Pick<GameSnapshot, 'status' | 'score'>
export interface DuelOutcome {
  readonly result: 'win' | 'loss' | 'draw'
  readonly difference: number
}

/** Only server-acknowledged final snapshots may settle a duel. Survival is irrelevant. */
export function scoreDuelOutcome(own: PublishedScore | null, opponent: PublishedScore | null): DuelOutcome | null {
  if (own?.status !== 'gameOver' || opponent?.status !== 'gameOver') return null
  const difference = own.score - opponent.score
  return { result: difference > 0 ? 'win' : difference < 0 ? 'loss' : 'draw', difference }
}
