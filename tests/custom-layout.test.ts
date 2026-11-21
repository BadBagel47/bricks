import assert from 'node:assert/strict'
import { test } from 'node:test'
import { keepOnScreen, parseCustomLayout, placeFromRect, resizedScale } from '../src/ui/custom-layout.ts'
import { parsePersonalSettings } from '../src/persistence.ts'

test('F-061: a saved own layout is read safely; anything broken falls back to the standard layout', () => {
  const layout = { pad: { x: 0.25, y: 0.8, scale: 1.1 }, rotate: { x: 0.8, y: 0.85, scale: 0.9 }, board: 0.85 }
  assert.deepEqual(parseCustomLayout(layout), layout)
  assert.deepEqual(parseCustomLayout({ pad: { x: -1, y: 2, scale: 9 }, rotate: { x: 0.5, y: 0.5, scale: 0.1 }, board: 3 }), { pad: { x: 0, y: 1, scale: 1.4 }, rotate: { x: 0.5, y: 0.5, scale: 0.7 }, board: 1 })
  assert.equal(parseCustomLayout({ pad: { x: 0.2, y: 0.8 }, rotate: { x: 0.8, y: 0.8, scale: 1 }, board: 1 }), null)
  assert.equal(parseCustomLayout('left'), null)
  assert.equal(parsePersonalSettings(null).customLayout, null, 'the standard layout by default')
  assert.deepEqual(parsePersonalSettings(JSON.stringify({ customLayout: layout })).customLayout, layout)
})

test('F-061: groups stay on the screen while dragged, and resizing follows the corner handle', () => {
  const screen = { width: 400, height: 800 }, group = { width: 200, height: 100 }
  assert.deepEqual(keepOnScreen({ x: 0, y: 1, scale: 1 }, group, screen), { x: 0.25, y: 1 - 50 / 800, scale: 1 })
  assert.deepEqual(keepOnScreen({ x: 0.5, y: 0.5, scale: 1 }, group, screen), { x: 0.5, y: 0.5, scale: 1 })
  assert.equal(resizedScale(1, group, 20, 10), 1.2)
  assert.equal(resizedScale(1, group, -200, -100), 0.7)
  assert.equal(resizedScale(1.3, group, 200, 100), 1.4)
  assert.deepEqual(placeFromRect({ left: 100, top: 600, width: 200, height: 100 }, screen), { x: 0.5, y: 0.8125, scale: 1 })
})
