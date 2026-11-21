import assert from 'node:assert/strict'
import { test } from 'node:test'
import { importOrReload, RELOAD_KEY, shouldReload, takeReopen } from '../src/ui/reload-after-update.ts'

function memory() {
  const values = new Map<string, string>()
  return { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v) }, removeItem: (k: string) => { values.delete(k) }, values }
}

test('B-040: a missing file reloads the page once and reopens the screen; a second failure is shown', async () => {
  const storage = memory()
  let reloads = 0
  const failing = importOrReload(() => Promise.reject(new Error('Failed to fetch dynamically imported module')), 'multiplayer', storage, () => { reloads++ })
  const pending = failing()
  await new Promise((resolve) => setTimeout(resolve, 10))
  assert.equal(reloads, 1)
  let settled = false; void pending.then(() => { settled = true }, () => { settled = true })
  await new Promise((resolve) => setTimeout(resolve, 10))
  assert.equal(settled, false, 'nothing is shown while the page reloads')
  assert.equal(takeReopen(storage), 'multiplayer')
  assert.equal(takeReopen(storage), null, 'reopened only once')
  await assert.rejects(failing(), /dynamically imported/, 'right after a reload the error is passed on')
  assert.equal(reloads, 1)
})

test('B-040: a working import is unaffected; an old reload note does not block a later one', async () => {
  const storage = memory()
  assert.equal(await importOrReload(() => Promise.resolve('ok'), 'multiplayer', storage, () => { throw new Error('no reload') })(), 'ok')
  storage.setItem(RELOAD_KEY, JSON.stringify({ at: Date.now() - 120_000, reopen: 'multiplayer' }))
  assert.equal(shouldReload(storage, Date.now()), true)
  storage.setItem(RELOAD_KEY, 'not json')
  assert.equal(shouldReload(storage, Date.now()), true)
  assert.equal(takeReopen(storage), null)
})
