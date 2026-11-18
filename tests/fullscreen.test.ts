import assert from 'node:assert/strict'
import test from 'node:test'
import { FULLSCREEN_KEY, fullscreenActive, rememberFullscreen, rememberedFullscreen, restoreFullscreenOnFirstInput } from '../src/ui/fullscreen.ts'
import type { FullscreenDocument } from '../src/ui/fullscreen.ts'

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial))
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
}

function fakeDocument(enabled = true) {
  const listeners = new Map<string, Set<(event?: Event) => void>>()
  let requests = 0
  const doc: FullscreenDocument & { fire(type: string, event?: Event): void; requests(): number; active: boolean } = {
    fullscreenEnabled: enabled,
    active: false,
    get fullscreenElement() { return this.active ? ({} as Element) : null },
    documentElement: { requestFullscreen: async () => { requests += 1; doc.active = true } },
    addEventListener(type, listener) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type)!.add(listener) },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener) },
    fire(type, event?: Event) { for (const listener of [...(listeners.get(type) ?? [])]) listener(event) },
    requests: () => requests,
  }
  return doc
}

test('the fullscreen choice is remembered', () => {
  const storage = memoryStorage()
  assert.equal(rememberedFullscreen(storage), false)
  rememberFullscreen(storage, true)
  assert.equal(storage.getItem(FULLSCREEN_KEY), 'on')
  assert.equal(rememberedFullscreen(storage), true)
  rememberFullscreen(storage, false)
  assert.equal(rememberedFullscreen(storage), false)
})

test('a remembered choice enters fullscreen once, at the first input', async () => {
  const doc = fakeDocument()
  restoreFullscreenOnFirstInput(doc, memoryStorage({ [FULLSCREEN_KEY]: 'on' }))
  assert.equal(doc.requests(), 0)
  doc.fire('pointerup')
  await Promise.resolve()
  assert.equal(doc.requests(), 1)
  assert.equal(fullscreenActive(doc), true)
  doc.active = false
  doc.fire('keydown')
  assert.equal(doc.requests(), 1)
})

test('nothing is restored without a remembered choice or browser support', () => {
  const off = fakeDocument()
  restoreFullscreenOnFirstInput(off, memoryStorage())
  off.fire('pointerup')
  assert.equal(off.requests(), 0)
  const unsupported = fakeDocument(false)
  restoreFullscreenOnFirstInput(unsupported, memoryStorage({ [FULLSCREEN_KEY]: 'on' }))
  unsupported.fire('pointerup')
  assert.equal(unsupported.requests(), 0)
})

test('the first tap on the fullscreen button itself is left to the button', () => {
  const doc = fakeDocument()
  restoreFullscreenOnFirstInput(doc, memoryStorage({ [FULLSCREEN_KEY]: 'on' }))
  doc.fire('pointerup', { target: { closest: (selector: string) => selector === '[data-fullscreen-toggle]' ? {} : null } } as unknown as Event)
  doc.fire('pointerup')
  assert.equal(doc.requests(), 0)
})
