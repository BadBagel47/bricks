import assert from 'node:assert/strict'
import { test } from 'node:test'
import { actionForCode, DEFAULT_BINDINGS, isRepeatable, keyLabel, parseBindings, remapKey } from '../src/input/keyboard.ts'

test('default controls map movement, rotation, drop, hold and pause', () => {
  assert.equal(actionForCode(DEFAULT_BINDINGS, 'ArrowLeft'), 'moveLeft')
  assert.equal(actionForCode(DEFAULT_BINDINGS, 'KeyX'), 'rotateClockwise')
  assert.equal(actionForCode(DEFAULT_BINDINGS, 'Space'), 'hardDrop')
  assert.equal(actionForCode(DEFAULT_BINDINGS, 'unknown'), undefined)
})

test('key remapping is immutable and prevents conflicting or reserved keys', () => {
  const changed = remapKey(DEFAULT_BINDINGS, 'moveLeft', 'KeyA')
  assert.equal(changed.moveLeft, 'KeyA')
  assert.equal(DEFAULT_BINDINGS.moveLeft, 'ArrowLeft')
  assert.throws(() => remapKey(changed, 'moveRight', 'KeyA'), /already assigned/)
  assert.throws(() => remapKey(changed, 'moveRight', 'Escape'), /usable key/)
})

test('control storage parsing tolerates missing, malformed and conflicting data', () => {
  assert.deepEqual(parseBindings(null), DEFAULT_BINDINGS)
  assert.deepEqual(parseBindings('{'), DEFAULT_BINDINGS)
  const parsed = parseBindings('{"moveLeft":"KeyA","moveRight":"KeyA"}')
  assert.equal(parsed.moveLeft, 'KeyA')
  assert.equal(parsed.moveRight, DEFAULT_BINDINGS.moveRight)
})

test('only movement and soft drop repeat while held', () => {
  assert.equal(isRepeatable('moveLeft'), true)
  assert.equal(isRepeatable('softDrop'), true)
  assert.equal(isRepeatable('hardDrop'), false)
  assert.equal(keyLabel('ArrowLeft'), '←')
  assert.equal(keyLabel('KeyZ'), 'Z')
})
