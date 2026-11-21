/**
 * B-040: parts of the game (the 2 Players screens) are separate files whose names change with
 * every published version, and only the newest files exist. A page opened before a new version
 * was published cannot load them any more. Then the page reloads once by itself, remembering
 * which screen to reopen; if that still fails within a short time, the error is shown instead.
 */
export const RELOAD_KEY = 'bricks.reload-after-update.v1'
const RETRY_WINDOW_MS = 60_000

interface Store { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }

/** True when the page may reload for this failure (not already reloaded for it a moment ago). */
export function shouldReload(storage: Store, now: number): boolean {
  try {
    const last = JSON.parse(storage.getItem(RELOAD_KEY) ?? 'null') as { at?: unknown } | null
    return !(last && typeof last.at === 'number' && now - last.at < RETRY_WINDOW_MS)
  } catch { return true }
}

export function rememberReload(storage: Store, now: number, reopen: string): void {
  try { storage.setItem(RELOAD_KEY, JSON.stringify({ at: now, reopen })) } catch { /* the reload still helps */ }
}

/** The screen to reopen after such a reload (read once), or null. */
export function takeReopen(storage: Store): string | null {
  try {
    const value = JSON.parse(storage.getItem(RELOAD_KEY) ?? 'null') as { reopen?: unknown; taken?: unknown } | null
    if (!value || value.taken || typeof value.reopen !== 'string') return null
    storage.setItem(RELOAD_KEY, JSON.stringify({ ...value, taken: true }))
    return value.reopen
  } catch { return null }
}

/** Wraps a dynamic import: on failure reload once (and never resolve), otherwise pass the error on. */
export function importOrReload<T>(load: () => Promise<T>, reopen: string, storage: Store = sessionStorage, reload: () => void = () => location.reload()): () => Promise<T> {
  return () => load().catch((error: unknown) => {
    if (!shouldReload(storage, Date.now())) throw error
    rememberReload(storage, Date.now(), reopen)
    reload()
    return new Promise<T>(() => {})
  })
}
