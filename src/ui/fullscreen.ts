/**
 * F-033: fullscreen for the whole page. Browsers only enter fullscreen from a tap or key
 * press, so a remembered choice is restored at the first such input after the page loads.
 */
export const FULLSCREEN_KEY = 'bricks.fullscreen.v1'

interface FullscreenElement { requestFullscreen?: (options?: FullscreenOptions) => Promise<void>; webkitRequestFullscreen?: () => void }
export interface FullscreenDocument {
  readonly fullscreenEnabled?: boolean
  readonly webkitFullscreenEnabled?: boolean
  readonly fullscreenElement?: Element | null
  readonly webkitFullscreenElement?: Element | null
  readonly documentElement: FullscreenElement
  exitFullscreen?: () => Promise<void>
  webkitExitFullscreen?: () => void
  addEventListener(type: string, listener: (event?: Event) => void, options?: AddEventListenerOptions | boolean): void
  removeEventListener(type: string, listener: (event?: Event) => void, options?: EventListenerOptions | boolean): void
}
interface KeyStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }

export function fullscreenSupported(doc: FullscreenDocument): boolean {
  return Boolean(doc.fullscreenEnabled ?? doc.webkitFullscreenEnabled)
}

export function fullscreenActive(doc: FullscreenDocument): boolean {
  return Boolean(doc.fullscreenElement ?? doc.webkitFullscreenElement)
}

export async function enterFullscreen(doc: FullscreenDocument): Promise<boolean> {
  const root = doc.documentElement
  try {
    if (root.requestFullscreen) await root.requestFullscreen({ navigationUI: 'hide' })
    else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen()
    else return false
    return true
  } catch {
    return false
  }
}

export async function exitFullscreen(doc: FullscreenDocument): Promise<void> {
  try {
    if (doc.exitFullscreen) await doc.exitFullscreen()
    else doc.webkitExitFullscreen?.()
  } catch { /* Already left, e.g. with the system back gesture. */ }
}

export function rememberedFullscreen(storage: KeyStorage): boolean {
  try { return storage.getItem(FULLSCREEN_KEY) === 'on' } catch { return false }
}

export function rememberFullscreen(storage: KeyStorage, on: boolean): void {
  try { storage.setItem(FULLSCREEN_KEY, on ? 'on' : 'off') } catch { /* Fullscreen still works for this visit. */ }
}

/**
 * When the player chose fullscreen last time, enter it again at the first tap, click or key
 * press on the page, except on the fullscreen button itself (it toggles on its own).
 * Returns a function that stops waiting.
 */
export function restoreFullscreenOnFirstInput(doc: FullscreenDocument, storage: KeyStorage): () => void {
  if (!fullscreenSupported(doc) || !rememberedFullscreen(storage)) return () => {}
  const events = ['pointerup', 'keydown'] as const
  const stop = () => { for (const type of events) doc.removeEventListener(type, restore, true) }
  function restore(event?: Event) {
    const target = event?.target as { closest?: (selector: string) => unknown } | null | undefined
    if (target?.closest?.('[data-fullscreen-toggle]')) { stop(); return }
    stop()
    if (!fullscreenActive(doc) && rememberedFullscreen(storage)) void enterFullscreen(doc)
  }
  for (const type of events) doc.addEventListener(type, restore, true)
  return stop
}

interface DisplayWindow { matchMedia?: (query: string) => { matches: boolean }; navigator?: object }

/**
 * F-064: true when the game runs as an app added to the home screen, which is always
 * fullscreen, so the fullscreen button has nothing to do. Checked when the page opens:
 * a browser tab cannot be in page fullscreen then (it needs a tap first), so a fullscreen
 * or standalone display mode at that moment means the installed app.
 */
export function runsAsInstalledApp(win: DisplayWindow, doc: FullscreenDocument): boolean {
  if (fullscreenActive(doc)) return false
  if ((win.navigator as { standalone?: unknown } | undefined)?.standalone === true) return true // iPhone home-screen app
  try {
    return ['fullscreen', 'standalone', 'minimal-ui'].some((mode) => win.matchMedia?.(`(display-mode: ${mode})`).matches === true)
  } catch {
    return false
  }
}
