import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BattleGame } from '../src/engine/battle.ts'
import { createGame } from '../src/engine/game.ts'
import { captureBattleCheckpoint, restoreBattleCheckpoint } from '../src/multiplayer/battle-checkpoint.ts'

const expected = { matchId: 'a'.repeat(32), uid: 'host', epoch: 1, seed: 47, startLevel: 0, holdEnabled: false, opponentRole: 'guest' as const, ownStreamTotal: 0, opponentStreamTotal: 3 }
function checkpoint() {
  const battle = new BattleGame(createGame({ seed: 47 }), 47, 'guest')
  battle.receive(3); battle.advanceTo(20)
  return { version: 1, matchId: expected.matchId, uid: expected.uid, epoch: 1, game: battle.game, opponentRole: 'guest' as const, received: 3, applied: 0, cancelled: 0, produced: 0, acknowledgedProduced: 0, committedSent: 0, frame: 20, endedFrame: null, opponentEnded: false }
}
test('restored Battle queue applies once, with the same deterministic holes', () => {
  const source = checkpoint()
  const one = restoreBattleCheckpoint(source, expected).battle
  const two = restoreBattleCheckpoint(JSON.parse(JSON.stringify(source)), expected).battle
  assert.equal(one.pending, 3)
  assert.deepEqual(one.action('hardDrop'), two.action('hardDrop'))
  assert.equal(one.applied, 3)
  one.receive(3); one.action('hardDrop')
  assert.equal(one.applied, 3)
})
test('checkpoint rejects foreign matches, impossible queues and unconfirmed outgoing writes', () => {
  const c = checkpoint()
  for (const bad of [{ ...c, matchId: 'b'.repeat(32) }, { ...c, uid: 'guest' }, { ...c, received: 4 }, { ...c, applied: 4 }, { ...c, produced: 0, acknowledgedProduced: 1 }, { ...c, committedSent: 1 }, { ...c, endedFrame: 20 }, { ...c, extra: true }]) assert.throws(() => restoreBattleCheckpoint(bad, expected))
})

test('captured checkpoint remains unchanged when the live game continues', () => {
  const battle = new BattleGame(createGame({ seed: 47 }), 47, 'guest')
  battle.receive(3)
  const saved = captureBattleCheckpoint(battle, { matchId: expected.matchId, uid: expected.uid, epoch: 1 }, { acknowledgedProduced: 0, committedSent: 0 })
  battle.action('hardDrop')
  assert.equal(saved.applied, 0)
  assert.equal(saved.game.board.flat().filter(Boolean).length, 0)
  assert.equal(battle.applied, 3)
})
