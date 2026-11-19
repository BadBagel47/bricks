import assert from 'node:assert/strict'
import test from 'node:test'
import { compareBackend, ConnectionStats, readConnectionStats, saveConnectionStats, summaryLine } from '../src/multiplayer/connection-stats.ts'

function memory() {
  const values = new Map<string, string>()
  return { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v) } }
}

test('delays, gaps and reconnects are summarised the same way for both versions', () => {
  const stats = new ConnectionStats('cloudflare')
  assert.equal(stats.summary(), null)
  let now = 0
  for (const delay of [40, 50, 60, 70, 300]) { stats.update(delay, now); now += 100 }
  stats.paused(now); now += 2500; stats.resumed(now)
  stats.update(55, now + 10)
  const summary = stats.summary('2026-11-19T00:00:00.000Z')!
  assert.equal(summary.samples, 6)
  assert.equal(summary.delayMedian, 60)
  assert.equal(summary.delayP90, 300)
  assert.equal(summary.gapMedian, 100)
  assert.equal(summary.gapMax, 100, 'the pause is not counted as a gap')
  assert.equal(summary.reconnects, 1)
  assert.equal(summary.reconnectMs, 2500)
  assert.match(summaryLine(summary), /Cloudflare.*delay 60 ms.*1 reconnect \(2\.5 s\)/)
})

test('the latest matches per version are kept and compared', () => {
  const storage = memory()
  const base = { playedAt: '2026-11-19T00:00:00.000Z', samples: 10, delayP90: 100, gapMedian: 200, gapMax: 400, reconnects: 0, reconnectMs: 0 }
  for (let i = 0; i < 25; i++) saveConnectionStats({ ...base, backend: 'firebase', delayMedian: 100 + i }, storage)
  saveConnectionStats({ ...base, backend: 'cloudflare', delayMedian: 40 }, storage)
  const all = readConnectionStats(storage)
  assert.equal(all.filter(s => s.backend === 'firebase').length, 20)
  assert.equal(compareBackend(all, 'cloudflare')!.delayMedian, 40)
  assert.equal(compareBackend(all, 'firebase')!.matches, 20)
  assert.equal(compareBackend([], 'firebase'), null)
})
