import { Segmented } from '../ui/SettingsControls.tsx'
import type { Backend } from '../multiplayer/connection-stats.ts'

export const BACKEND_KEY = 'bricks.net-backend.v1'
export function savedBackend(): Backend {
  try { return localStorage.getItem(BACKEND_KEY) === 'cloudflare' ? 'cloudflare' : 'firebase' } catch { return 'firebase' }
}
/** A Cloudflare invitation (#room=…) or admin lobby link (#nk-lobby=…) in the address (checked without loading network-kit). */
export function cloudflareLink(hash = typeof location === 'undefined' ? '' : location.hash): boolean {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  return params.has('nk-lobby') || params.has('room')
}
export function saveBackend(value: Backend) {
  try { localStorage.setItem(BACKEND_KEY, value) } catch { /* Chosen for this visit only. */ }
}

/** F-028: Firebase or Cloudflare while both exist (Firebase first until Cloudflare is ready). */
export function BackendChoice({ value, onChange, disabled = false }: { value: Backend; onChange: (value: Backend) => void; disabled?: boolean }) {
  return <div className="backend-choice" aria-disabled={disabled}>
    <span className="setting-label">Server</span>
    <Segmented label="Server" value={value} options={[{ value: 'firebase', label: 'Firebase' }, { value: 'cloudflare', label: 'Cloudflare' }]} onChange={next => { if (!disabled) onChange(next) }} />
  </div>
}
