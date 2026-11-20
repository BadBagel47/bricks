import { flushSync } from 'react-dom'

/** True when the system asks for reduced motion (F-049: the only way animations are turned off). */
export function reducedMotion(): boolean {
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
}

/**
 * F-021, F-047: a screen change cross-fades with the View Transitions API where the browser
 * has it; instantly with reduced motion, without the API, or when asked (a game starts instantly).
 */
export function crossFade(update: () => void, instant = false): void {
  const doc = document as Document & { startViewTransition?: (update: () => void) => unknown }
  if (instant || !doc.startViewTransition || reducedMotion()) { update(); return }
  doc.startViewTransition(() => flushSync(update))
}
