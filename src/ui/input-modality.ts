/**
 * Tracks whether the player is navigating with Tab or not. Focus rings are only drawn
 * after Tab, so screens and dialogs that move focus on open, and game keys such as the
 * arrows or Space, never make outlines appear (B-005, B-012).
 */
const NAVIGATION_KEYS = new Set(['Tab'])

export function trackInputModality(root: HTMLElement = document.documentElement): void {
  root.dataset.input = 'pointer'
  window.addEventListener('pointerdown', () => { root.dataset.input = 'pointer' }, true)
  window.addEventListener('keydown', (event) => { if (NAVIGATION_KEYS.has(event.key)) root.dataset.input = 'keyboard' }, true)
}
