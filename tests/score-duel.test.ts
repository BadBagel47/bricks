import assert from 'node:assert/strict'
import { test } from 'node:test'
import { scoreDuelOutcome } from '../src/multiplayer/score-duel.ts'

test('neither a live score lead nor one final score settles Score Duel', () => {
  const final = { status: 'gameOver' as const, score: 1200 }
  const playing = { status: 'playing' as const, score: 2000 }
  assert.equal(scoreDuelOutcome(null, null), null)
  assert.equal(scoreDuelOutcome(null, final), null, 'local final write must be acknowledged')
  assert.equal(scoreDuelOutcome(final, null), null)
  assert.equal(scoreDuelOutcome(final, playing), null)
  assert.equal(scoreDuelOutcome(playing, final), null)
})

test('both finished: higher final score wins regardless of who finished first or host role', () => {
  const a = { status: 'gameOver' as const, score: 1200 }
  const b = { status: 'gameOver' as const, score: 100 }
  assert.deepEqual(scoreDuelOutcome(a, b), { result: 'win', difference: 1100 })
  assert.deepEqual(scoreDuelOutcome(b, a), { result: 'loss', difference: -1100 })
  assert.deepEqual(scoreDuelOutcome(a, { ...b, score: 1300 }), { result: 'loss', difference: -100 })
})

test('equal final scores draw, including zero; evaluating again does not mutate either score', () => {
  for (const score of [0, 40, 999999999]) {
    const a = Object.freeze({ status: 'gameOver' as const, score })
    const b = Object.freeze({ status: 'gameOver' as const, score })
    for (let i = 0; i < 3; i++) assert.deepEqual(scoreDuelOutcome(a, b), { result: 'draw', difference: 0 })
  }
})
