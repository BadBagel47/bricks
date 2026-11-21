/**
 * F-061: the player's own touch-control layout (1 Player, portrait). Each button group (the
 * pad with the arrows and drops, the rotate buttons) has a centre as a share of the screen's
 * width and height and a size relative to the standard button size; the board has a height
 * relative to its standard size. `null` means the standard layout, which adapts to the screen.
 */
export interface GroupPlace { readonly x: number; readonly y: number; readonly scale: number }
export interface CustomLayout { readonly pad: GroupPlace; readonly rotate: GroupPlace; readonly board: number }
export type LayoutGroup = 'pad' | 'rotate'

export const SCALE_MIN = 0.7
export const SCALE_MAX = 1.4
export const BOARD_MIN = 0.6
export const BOARD_MAX = 1

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

function parsePlace(value: unknown): GroupPlace | null {
  if (!value || typeof value !== 'object') return null
  const { x, y, scale } = value as Record<string, unknown>
  if (!finite(x) || !finite(y) || !finite(scale)) return null
  return { x: clamp(x, 0, 1), y: clamp(y, 0, 1), scale: clamp(scale, SCALE_MIN, SCALE_MAX) }
}

export function parseCustomLayout(value: unknown): CustomLayout | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const pad = parsePlace(record.pad), rotate = parsePlace(record.rotate)
  if (!pad || !rotate || !finite(record.board)) return null
  return { pad, rotate, board: clamp(record.board, BOARD_MIN, BOARD_MAX) }
}

interface Size { readonly width: number; readonly height: number }

/** Moves a group's centre so the whole group stays on the screen. */
export function keepOnScreen(place: GroupPlace, group: Size, screen: Size): GroupPlace {
  const halfX = Math.min(0.5, group.width / 2 / screen.width), halfY = Math.min(0.5, group.height / 2 / screen.height)
  return { ...place, x: clamp(place.x, halfX, 1 - halfX), y: clamp(place.y, halfY, 1 - halfY) }
}

/** Dragging a group's corner handle outwards by (dx, dy) grows it, inwards shrinks it. */
export function resizedScale(startScale: number, startGroup: Size, dx: number, dy: number): number {
  const grow = (dx / Math.max(1, startGroup.width) + dy / Math.max(1, startGroup.height))
  return clamp(startScale * (1 + grow), SCALE_MIN, SCALE_MAX)
}

/** A group's place from where it is drawn now, e.g. in the standard layout. */
export function placeFromRect(rect: { left: number; top: number; width: number; height: number }, screen: Size, scale = 1): GroupPlace {
  return { x: (rect.left + rect.width / 2) / screen.width, y: (rect.top + rect.height / 2) / screen.height, scale }
}
