import { useEffect, useState } from 'react'
import { BACKEND_LABEL, compareBackend, CONNECTION_STATS_CHANGED, CONNECTION_STATS_KEY, readConnectionStats } from './connection-stats.ts'
import type { ConnectionSummary } from './connection-stats.ts'

/** F-036: Settings → Connection: the latest 2 Players matches per version, side by side. */
export function ConnectionComparison() {
  const [all, setAll] = useState<ConnectionSummary[]>(() => readConnectionStats())
  useEffect(() => {
    const refresh = () => setAll(readConnectionStats())
    const storage = (event: StorageEvent) => { if (event.key === CONNECTION_STATS_KEY || event.key === null) refresh() }
    window.addEventListener(CONNECTION_STATS_CHANGED, refresh); window.addEventListener('storage', storage)
    return () => { window.removeEventListener(CONNECTION_STATS_CHANGED, refresh); window.removeEventListener('storage', storage) }
  }, [])
  const rows = (['firebase', 'cloudflare'] as const).map(backend => ({ backend, stats: compareBackend(all, backend) }))
  if (rows.every(row => !row.stats)) return <p className="connection-empty">Play a 2 Players match to compare Firebase and Cloudflare.</p>
  return <table className="connection-table" aria-label="Connection comparison">
    <thead><tr><th scope="col">Server</th><th scope="col">Matches</th><th scope="col">Delay</th><th scope="col">Updates every</th><th scope="col">Longest gap</th><th scope="col">Reconnects</th></tr></thead>
    <tbody>{rows.map(({ backend, stats }) => <tr key={backend}><th scope="row">{BACKEND_LABEL[backend]}</th>{stats
      ? <><td>{stats.matches}</td><td>{stats.delayMedian} ms</td><td>{stats.gapMedian} ms</td><td>{stats.gapMax} ms</td><td>{stats.reconnects}</td></>
      : <td colSpan={5}>No matches yet</td>}</tr>)}</tbody>
  </table>
}
