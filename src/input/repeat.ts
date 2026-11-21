import { isRepeatable } from './keyboard.ts'
import type { InputAction } from './keyboard.ts'

/** F-056: how soon a held button starts repeating, and how fast it then moves sideways. */
export type RepeatDelay = 'short' | 'normal' | 'long'
export type RepeatSpeed = 'slow' | 'normal' | 'fast'
export interface RepeatTiming { readonly delay: number; readonly interval: number; readonly softDropInterval: number }

const DELAYS: Record<RepeatDelay, number> = { short: 110, normal: 160, long: 230 }
const INTERVALS: Record<RepeatSpeed, number> = { slow: 80, normal: 48, fast: 28 }
/** Soft drop keeps its own pace; only the wait before it repeats follows the delay setting. */
const SOFT_DROP_INTERVAL = 65

export function repeatTiming(delay: RepeatDelay = 'normal', speed: RepeatSpeed = 'normal'): RepeatTiming {
  return { delay: DELAYS[delay], interval: INTERVALS[speed], softDropInterval: SOFT_DROP_INTERVAL }
}
export const DEFAULT_REPEAT = repeatTiming()

/** Shared keyboard/gamepad repeat timing; elapsed time determines repeats, not render rate. */
export class HeldInputs {
  private readonly held = new Map<string, { action: InputAction; nextAt: number }>()
  timing: RepeatTiming

  constructor(timing: RepeatTiming = DEFAULT_REPEAT) { this.timing = timing }

  press(source: string, action: InputAction, now: number) {
    if (isRepeatable(action)) this.held.set(source, { action, nextAt: now + this.timing.delay })
  }

  release(source: string) { this.held.delete(source) }
  clear() { this.held.clear() }
  clearSource(prefix: string) {
    for (const source of this.held.keys()) if (source.startsWith(prefix)) this.held.delete(source)
  }

  due(now: number): InputAction[] {
    const actions: InputAction[] = []
    for (const held of this.held.values()) {
      while (now >= held.nextAt) {
        actions.push(held.action)
        held.nextAt += held.action === 'softDrop' ? this.timing.softDropInterval : this.timing.interval
      }
    }
    return actions
  }
}
