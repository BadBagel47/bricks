import type { GameAction } from '../engine/types.ts'

export interface SwipePoint {
  readonly x: number
  readonly y: number
}

export function actionsForSwipe(start: SwipePoint, end: SwipePoint): GameAction[] {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const horizontal = Math.abs(dx)
  const vertical = Math.abs(dy)
  if (Math.max(horizontal, vertical) < 20) return ['rotateClockwise']
  if (Math.max(horizontal, vertical) < 36) return []
  if (horizontal > vertical) {
    const action: GameAction = dx < 0 ? 'moveLeft' : 'moveRight'
    return Array<GameAction>(Math.max(1, Math.floor(horizontal / 42))).fill(action)
  }
  if (dy < -68) return ['hardDrop']
  if (dy > 0) return Array<GameAction>(Math.max(1, Math.floor(vertical / 42))).fill('softDrop')
  return []
}
