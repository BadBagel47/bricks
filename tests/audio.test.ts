import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createBoard } from '../src/engine/board.ts'
import { frequencyForNote, isDangerStack, musicIntervalMs, ORIGINAL_MELODY } from '../src/audio/tempo.ts'

test('music tempo increases and notes rise by one octave at dangerous stack height', () => {
  assert.ok(musicIntervalMs(true) < musicIntervalMs(false))
  assert.equal(frequencyForNote(69, true), frequencyForNote(69, false) * 2)
  assert.equal(ORIGINAL_MELODY.length, 16)
  assert.ok(new Set(ORIGINAL_MELODY).size > 4)
})

test('danger tempo begins when the locked stack reaches the top five rows', () => {
  const board = createBoard().map((row) => [...row])
  assert.equal(isDangerStack(board), false)
  board[4][0] = 'T'
  assert.equal(isDangerStack(board), true)
  board[4][0] = null
  board[5][0] = 'T'
  assert.equal(isDangerStack(board), false)
})
