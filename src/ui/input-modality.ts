/**
 * Tracks whether the player last used a pointer (touch/mouse) or the keyboard.
 * Focus rings are only drawn in keyboard mode, so screens and dialogs that move
 * focus on open do not flash outlines on phones (B-005).
 */
const NAVIGATION_KEYS = new Set(['Tab', 'Enter', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape', 'Home', 'End'])

export function trackInputModality(root: HTMLElement = document.documentElement): void {
  root.dataset.input = 'pointer'
  window.addEventListener('pointerdown', () => { root.dataset.input = 'pointer' }, true)
  window.addEventListener('keydown', (event) => { if (NAVIGATION_KEYS.has(event.key)) root.dataset.input = 'keyboard' }, true)
}
