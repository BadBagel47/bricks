import { isRepeatable } from './keyboard.ts'
import type { InputAction } from './keyboard.ts'

/** Shared keyboard/gamepad repeat timing; elapsed time determines repeats, not render rate. */
export class HeldInputs {
  private readonly held = new Map<string, { action: InputAction; nextAt: number }>()

  press(source: string, action: InputAction, now: number) {
    if (isRepeatable(action)) this.held.set(source, { action, nextAt: now + 160 })
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
        held.nextAt += held.action === 'softDrop' ? 65 : 48
      }
    }
    return actions
  }
}
