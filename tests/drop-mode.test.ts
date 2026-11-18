import assert from 'node:assert/strict'
import test from 'node:test'
import { actionAllowed, parseDropMode } from '../src/input/drop-mode.ts'

test('drop modes allow the chosen drops only', () => {
  assert.equal(actionAllowed('softDrop', 'drop'), true)
  assert.equal(actionAllowed('hardDrop', 'drop'), false)
  assert.equal(actionAllowed('softDrop', 'hard'), false)
  assert.equal(actionAllowed('hardDrop', 'hard'), true)
  assert.equal(actionAllowed('softDrop', 'both'), true)
  assert.equal(actionAllowed('hardDrop', 'both'), true)
  for (const mode of ['drop', 'hard', 'both'] as const) assert.equal(actionAllowed('moveLeft', mode), true)
})

test('saved settings without a drop mode keep their hard drop choice', () => {
  assert.equal(parseDropMode(undefined, undefined), 'both')
  assert.equal(parseDropMode(undefined, true), 'both')
  assert.equal(parseDropMode(undefined, false), 'drop')
  assert.equal(parseDropMode('hard', true), 'hard')
  assert.equal(parseDropMode('sideways', false), 'drop')
})
