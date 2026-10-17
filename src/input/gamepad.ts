import { INPUT_ACTIONS } from './keyboard.ts'
import type { InputAction } from './keyboard.ts'

export type GamepadBindings = Record<InputAction, number>
export interface GamepadSnapshot {
  readonly buttons: readonly { readonly pressed: boolean; readonly value?: number }[]
  readonly axes: readonly number[]
}

export const DEFAULT_GAMEPAD_BINDINGS: GamepadBindings = {
  moveLeft: 14,
  moveRight: 15,
  softDrop: 13,
  rotateCounterclockwise: 1,
  rotateClockwise: 0,
  hardDrop: 2,
  hold: 3,
  pause: 9,
}

export function parseGamepadBindings(serialized: string | null): GamepadBindings {
  try {
    const saved: unknown = JSON.parse(serialized ?? 'null')
    if (!saved || typeof saved !== 'object') return { ...DEFAULT_GAMEPAD_BINDINGS }
    const candidate = saved as Record<string, unknown>
    const result = { ...DEFAULT_GAMEPAD_BINDINGS }
    const used = new Set<number>()
    for (const action of INPUT_ACTIONS) {
      const button = candidate[action]
      if (typeof button === 'number' && Number.isInteger(button) && button >= 0 && button <= 31 && !used.has(button)) {
        result[action] = button
        used.add(button)
      } else {
        used.add(result[action])
      }
    }
    return result
  } catch {
    return { ...DEFAULT_GAMEPAD_BINDINGS }
  }
}

export function remapGamepadButton(bindings: GamepadBindings, action: InputAction, button: number): GamepadBindings {
  if (!Number.isInteger(button) || button < 0 || button > 31) throw new RangeError('Choose a controller button from 1 to 32')
  const conflict = INPUT_ACTIONS.find((candidate) => candidate !== action && bindings[candidate] === button)
  if (conflict) throw new RangeError(`Button ${button + 1} is already assigned`)
  return { ...bindings, [action]: button }
}

export function gamepadActions(pad: GamepadSnapshot, bindings: GamepadBindings): Set<InputAction> {
  const active = new Set<InputAction>()
  for (const action of INPUT_ACTIONS) {
    const button = pad.buttons[bindings[action]]
    if (button && (button.pressed || (button.value ?? 0) >= 0.55)) active.add(action)
  }
  const horizontal = pad.axes[0] ?? 0
  const vertical = pad.axes[1] ?? 0
  if (horizontal <= -0.55) active.add('moveLeft')
  if (horizontal >= 0.55) active.add('moveRight')
  if (vertical >= 0.55) active.add('softDrop')
  return active
}

export function gamepadButtonLabel(button: number): string {
  return `Button ${button + 1}`
}
