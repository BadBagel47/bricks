export const INPUT_ACTIONS = [
  'moveLeft', 'moveRight', 'softDrop', 'rotateCounterclockwise',
  'rotateClockwise', 'hardDrop', 'hold', 'pause',
] as const

export type InputAction = (typeof INPUT_ACTIONS)[number]
export type KeyboardBindings = Record<InputAction, string>

export const DEFAULT_BINDINGS: KeyboardBindings = {
  moveLeft: 'ArrowLeft',
  moveRight: 'ArrowRight',
  softDrop: 'ArrowDown',
  rotateCounterclockwise: 'KeyZ',
  rotateClockwise: 'KeyX',
  hardDrop: 'Space',
  hold: 'KeyC',
  pause: 'KeyP',
}

export const ACTION_LABELS: Record<InputAction, string> = {
  moveLeft: 'Move left',
  moveRight: 'Move right',
  softDrop: 'Soft drop',
  rotateCounterclockwise: 'Rotate counterclockwise',
  rotateClockwise: 'Rotate clockwise',
  hardDrop: 'Hard drop',
  hold: 'Hold',
  pause: 'Pause',
}

export function actionForCode(bindings: KeyboardBindings, code: string): InputAction | undefined {
  return INPUT_ACTIONS.find((action) => bindings[action] === code)
}

export function remapKey(bindings: KeyboardBindings, action: InputAction, code: string): KeyboardBindings {
  if (!code || code === 'Escape' || code === 'Tab') throw new RangeError('Choose a usable key')
  const conflict = actionForCode(bindings, code)
  if (conflict && conflict !== action) throw new RangeError(`${code} is already assigned`)
  return { ...bindings, [action]: code }
}

export function parseBindings(serialized: string | null): KeyboardBindings {
  try {
    const saved: unknown = JSON.parse(serialized ?? 'null')
    if (!saved || typeof saved !== 'object') return { ...DEFAULT_BINDINGS }
    const candidate = saved as Record<string, unknown>
    const result = { ...DEFAULT_BINDINGS }
    for (const action of INPUT_ACTIONS) {
      const code = candidate[action]
      if (typeof code === 'string' && code && code !== 'Escape' && code !== 'Tab') result[action] = code
    }
    // Restore a complete usable map if corrupt/partial data assigns a key twice.
    if (new Set(Object.values(result)).size !== INPUT_ACTIONS.length) return { ...DEFAULT_BINDINGS }
    return result
  } catch {
    return { ...DEFAULT_BINDINGS }
  }
}

export function keyLabel(code: string): string {
  const arrows: Record<string, string> = { ArrowLeft: '←', ArrowRight: '→', ArrowDown: '↓', ArrowUp: '↑', Space: 'Space' }
  if (arrows[code]) return arrows[code]
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  return code
}

export function isRepeatable(action: InputAction): boolean {
  return action === 'moveLeft' || action === 'moveRight' || action === 'softDrop'
}
