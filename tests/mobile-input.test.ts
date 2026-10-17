import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEFAULT_GAMEPAD_BINDINGS, gamepadActions, gamepadButtonLabel, parseGamepadBindings, remapGamepadButton } from '../src/input/gamepad.ts'
import { actionsForSwipe } from '../src/input/swipe.ts'

test('standard gamepad defaults map d-pad, face buttons and pause', () => {
  assert.equal(DEFAULT_GAMEPAD_BINDINGS.moveLeft, 14)
  assert.equal(DEFAULT_GAMEPAD_BINDINGS.rotateClockwise, 0)
  assert.equal(DEFAULT_GAMEPAD_BINDINGS.pause, 9)
  assert.equal(gamepadButtonLabel(0), 'Button 1')
})

test('gamepad button remapping is immutable, range-checked and conflict-checked', () => {
  const changed = remapGamepadButton(DEFAULT_GAMEPAD_BINDINGS, 'moveLeft', 6)
  assert.equal(changed.moveLeft, 6)
  assert.equal(DEFAULT_GAMEPAD_BINDINGS.moveLeft, 14)
  assert.throws(() => remapGamepadButton(changed, 'moveRight', 6), /already assigned/)
  assert.throws(() => remapGamepadButton(changed, 'moveRight', 32), /controller button/)
  assert.deepEqual(parseGamepadBindings(JSON.stringify({ moveLeft: 6 } )).moveLeft, 6)
  assert.deepEqual(parseGamepadBindings('{"moveLeft":15}'), DEFAULT_GAMEPAD_BINDINGS)
})

test('gamepad polling supports held digital buttons and analog movement', () => {
  const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }))
  buttons[0] = { pressed: true, value: 1 }
  buttons[13] = { pressed: false, value: 0 }
  const actions = gamepadActions({ buttons, axes: [-0.8, 0.7] }, DEFAULT_GAMEPAD_BINDINGS)
  assert.deepEqual([...actions].sort(), ['moveLeft', 'rotateClockwise', 'softDrop'].sort())
})

test('swipes have thresholds for movement, drop, hard drop and rotation', () => {
  assert.deepEqual(actionsForSwipe({ x: 100, y: 100 }, { x: 60, y: 103 }), ['moveLeft'])
  assert.deepEqual(actionsForSwipe({ x: 10, y: 10 }, { x: 10, y: 105 }), ['softDrop', 'softDrop'])
  assert.deepEqual(actionsForSwipe({ x: 10, y: 100 }, { x: 10, y: 20 }), ['hardDrop'])
  assert.deepEqual(actionsForSwipe({ x: 0, y: 0 }, { x: 5, y: 5 }), ['rotateClockwise'])
  assert.deepEqual(actionsForSwipe({ x: 0, y: 0 }, { x: 30, y: 2 }), [])
})
