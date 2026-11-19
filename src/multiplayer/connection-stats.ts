/**
 * F-036: the same connection measurements for both 2 Players versions (Firebase and
 * Cloudflare), so the owner can compare them. Measured on the receiving device:
 * - delay: from the server receiving an opponent update to it reaching this device
 *   (server clock on both sides: Firebase's write time, network-kit's arrival time);
 * - gap: time between two opponent updates arriving (evenness);
 * - reconnects: how often and how long the match was paused for a lost connection.
 * The sender's leg (device to server) is not included: neither version tells it.
 */
export type Backend = 'firebase' | 'cloudflare'

export interface ConnectionSummary {
  readonly backend: Backend
  readonly playedAt: string
  readonly samples: number
  readonly delayMedian: number
  readonly delayP90: number
  readonly gapMedian: number
  readonly gapMax: number
  readonly reconnects: number
  readonly reconnectMs: number
}

function quantile(sorted: readonly number[], q: number): number {
  if (!sorted.length) return 0
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]
}

export class ConnectionStats {
  private delays: number[] = []
  private gaps: number[] = []
  private lastArrival: number | null = null
  private pausedAt: number | null = null
  private reconnects = 0
  private reconnectMs = 0
  readonly backend: Backend
  constructor(backend: Backend) { this.backend = backend }

  /** One opponent update: `serverDelay` in ms (server time now minus the server's stamp), `now` from performance.now(). */
  update(serverDelay: number, now: number) {
    if (Number.isFinite(serverDelay)) this.delays.push(Math.max(0, Math.min(serverDelay, 60_000)))
    if (this.lastArrival !== null && this.pausedAt === null) this.gaps.push(Math.max(0, now - this.lastArrival))
    this.lastArrival = now
  }
  paused(now: number) {
    if (this.pausedAt === null) this.pausedAt = now
  }
  resumed(now: number) {
    if (this.pausedAt === null) return
    this.reconnects++
    this.reconnectMs += Math.max(0, now - this.pausedAt)
    this.pausedAt = null
    this.lastArrival = null // the first update after a pause is not a gap
  }
  summary(playedAt = new Date().toISOString()): ConnectionSummary | null {
    if (!this.delays.length) return null
    const delays = [...this.delays].sort((a, b) => a - b), gaps = [...this.gaps].sort((a, b) => a - b)
    return {
      backend: this.backend, playedAt, samples: delays.length,
      delayMedian: Math.round(quantile(delays, 0.5)), delayP90: Math.round(quantile(delays, 0.9)),
      gapMedian: Math.round(quantile(gaps, 0.5)), gapMax: Math.round(gaps.at(-1) ?? 0),
      reconnects: this.reconnects, reconnectMs: Math.round(this.reconnectMs),
    }
  }
}

export const CONNECTION_STATS_KEY = 'bricks.connection-stats.v1'
export const CONNECTION_STATS_CHANGED = 'bricks-connection-stats-changed'
const KEEP = 20
type StatsStorage = Pick<Storage, 'getItem' | 'setItem'>

function valid(value: unknown): value is ConnectionSummary {
  const s = value as ConnectionSummary
  const n = (x: unknown) => typeof x === 'number' && Number.isFinite(x) && x >= 0
  return Boolean(s) && (s.backend === 'firebase' || s.backend === 'cloudflare') && typeof s.playedAt === 'string'
    && [s.samples, s.delayMedian, s.delayP90, s.gapMedian, s.gapMax, s.reconnects, s.reconnectMs].every(n)
}

export function readConnectionStats(storage: StatsStorage = localStorage): ConnectionSummary[] {
  try {
    const data = JSON.parse(storage.getItem(CONNECTION_STATS_KEY) ?? '[]')
    return Array.isArray(data) ? data.filter(valid) : []
  } catch { return [] }
}

/** Keeps the latest 20 matches per version. */
export function saveConnectionStats(summary: ConnectionSummary, storage: StatsStorage = localStorage): void {
  const all = [...readConnectionStats(storage), summary]
  const kept = (['firebase', 'cloudflare'] as const).flatMap(backend => all.filter(s => s.backend === backend).slice(-KEEP))
  try { storage.setItem(CONNECTION_STATS_KEY, JSON.stringify(kept)) } catch { /* Measurements are optional. */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CONNECTION_STATS_CHANGED))
}

/** Averages of the stored matches for one version, or null when there are none. */
export function compareBackend(all: readonly ConnectionSummary[], backend: Backend) {
  const list = all.filter(s => s.backend === backend)
  if (!list.length) return null
  const mean = (pick: (s: ConnectionSummary) => number) => Math.round(list.reduce((sum, s) => sum + pick(s), 0) / list.length)
  return {
    matches: list.length, delayMedian: mean(s => s.delayMedian), delayP90: mean(s => s.delayP90), gapMedian: mean(s => s.gapMedian),
    gapMax: Math.max(...list.map(s => s.gapMax)), reconnects: list.reduce((sum, s) => sum + s.reconnects, 0),
  }
}

export const BACKEND_LABEL: Record<Backend, string> = { firebase: 'Firebase', cloudflare: 'Cloudflare' }

/** One line for the result screen. */
export function summaryLine(summary: ConnectionSummary): string {
  const reconnect = summary.reconnects ? ` · ${summary.reconnects} reconnect${summary.reconnects === 1 ? '' : 's'} (${(summary.reconnectMs / 1000).toFixed(1)} s)` : ''
  return `Connection (${BACKEND_LABEL[summary.backend]}): delay ${summary.delayMedian} ms · updates every ${summary.gapMedian} ms (longest ${summary.gapMax} ms)${reconnect}`
}
