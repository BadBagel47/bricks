import assert from 'node:assert/strict'
import { test } from 'node:test'
import { HeldInputs } from '../src/input/repeat.ts'

test('held controls repeat at the same rate at 30, 60 and 120 Hz and after a frame stall', () => {
  const counts = [30, 60, 120].map((rate) => {
    const held = new HeldInputs()
    held.press('keyboard:left', 'moveLeft', 0)
    let count = 0
    for (let i = 1; i <= rate; i++) count += held.due(i * 1000 / rate).length
    return count
  })
  const stalled = new HeldInputs()
  stalled.press('keyboard:left', 'moveLeft', 0)
  assert.deepEqual(counts, [18, 18, 18])
  assert.equal(stalled.due(1000).length, 18)
})

test('releases, pause clearing and controller disconnect clear only the intended holds', () => {
  const held = new HeldInputs()
  held.press('pad:left', 'moveLeft', 0)
  held.press('ArrowDown', 'softDrop', 0)
  held.press('KeyX', 'rotateClockwise', 0)
  held.clearSource('pad:')
  assert.deepEqual(held.due(160), ['softDrop'])
  held.release('ArrowDown')
  assert.deepEqual(held.due(500), [])
  held.press('ArrowLeft', 'moveLeft', 0)
  held.clear()
  assert.deepEqual(held.due(1000), [])
})
