import { useEffect, useLayoutEffect, useRef } from 'react'
import { DEFAULT_REPEAT } from '../input/repeat.ts'
import type { RepeatTiming } from '../input/repeat.ts'
import type { CustomLayout, GroupPlace } from './custom-layout.ts'
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { dropPosition, pieceCells } from '../engine/index.ts'
import type { Cell, GameAction, GameState, PieceType } from '../engine/index.ts'
import { blockStyle } from './level-palettes.ts'
import type { BlockColors } from './level-palettes.ts'
import { previewShape } from './piece-preview.ts'
import type { ClearEffect } from './board-effects.ts'
import { hardDropAllowed, softDropAllowed } from '../input/drop-mode.ts'
import type { DropMode } from '../input/drop-mode.ts'

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
interface SwipePoint { readonly x: number; readonly y: number }

function blockVars(type: PieceType | 'G', level: number, colors: BlockColors): CSSProperties {
  const style = blockStyle(type, level, colors)
  return { '--cell-fill': style.fill, '--cell-ring': style.ring ?? 'transparent', '--cell-color': style.ring ?? style.fill } as CSSProperties
}

export function Playfield({ game, swipeMode, onSwipe, ghost = false, colors = 'level', clear = null, thump = 0 }: { game: Pick<GameState, 'board' | 'active' | 'level'>; swipeMode: boolean; onSwipe: (start: SwipePoint, end: SwipePoint, board: { left: number; width: number }) => void; ghost?: boolean; colors?: BlockColors; clear?: ClearEffect | null; thump?: number }) {
  const cells: Cell[] = game.board.flatMap((row) => [...row])
  const ghosts = new Set<number>()
  const swipeStart = useRef<SwipePoint | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const activeCells = new Set<number>()
  if (game.active) {
    if (ghost) for (const [x, y] of pieceCells(dropPosition(game.board, game.active))) ghosts.add(y * 10 + x)
    for (const [x, y] of pieceCells(game.active)) { cells[y * 10 + x] = game.active.type; ghosts.delete(y * 10 + x); activeCells.add(y * 10 + x) }
  }
  // F-022: blocks above cleared rows fall into place after the cleared rows flash away.
  useLayoutEffect(() => {
    const board = root.current
    if (!clear || !board || reducedMotion()) return
    const cellElements = board.querySelectorAll<HTMLElement>(':scope > .board-cell')
    const step = (cellElements[10]?.offsetTop ?? 0) - (cellElements[0]?.offsetTop ?? 0)
    clear.shifts.forEach((shift, y) => {
      if (!shift) return
      for (let x = 0; x < 10; x++) {
        const element = cellElements[y * 10 + x]
        if (!element?.classList.contains('filled') || activeCells.has(y * 10 + x)) continue
        element.animate([{ transform: `translateY(${-shift * step}px)` }, { transform: `translateY(${-shift * step}px)`, offset: 0.45 }, { transform: 'translateY(0)' }], { duration: 330, easing: 'cubic-bezier(.5,0,.75,0)' })
      }
    })
    // Only the clear id should trigger the animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clear?.id])
  // A hard drop lands with a small bump of the whole board.
  useEffect(() => {
    if (!thump || !root.current || reducedMotion()) return
    root.current.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(4px)' }, { transform: 'translateY(0)' }], { duration: 160, easing: 'ease-out' })
  }, [thump])
  const ghostStyle = game.active ? blockVars(game.active.type, game.level, colors) : undefined
  return <div ref={root} className={`playfield${swipeMode ? ' swipe-active' : ''}`} role="img" aria-label="Game board, 10 columns by 20 rows"
    onPointerDown={(event) => { if (swipeMode && event.pointerType !== 'mouse') { swipeStart.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId) } }}
    onPointerUp={(event) => { if (!swipeMode || !swipeStart.current) return; const rect = event.currentTarget.getBoundingClientRect(); onSwipe(swipeStart.current, { x: event.clientX, y: event.clientY }, { left: rect.left, width: rect.width }); swipeStart.current = null }}
    onPointerCancel={() => { swipeStart.current = null }}>
    {cells.map((type, index) => type
      ? <div className="board-cell filled" key={index} style={blockVars(type, game.level, colors)} />
      : <div className={`board-cell${ghosts.has(index) ? ' ghost' : ''}`} key={index} style={ghosts.has(index) ? ghostStyle : undefined} />)}
    {clear && <div className={`clear-overlay${clear.rows.length === 4 ? ' quad' : ''}`} key={clear.id} aria-hidden="true">
      {clear.rows.flatMap((y) => clear.before[y].map((type, x) => <span key={`${y}-${x}`} className="clearing" style={{ gridRow: y + 1, gridColumn: x + 1, '--i': Math.abs(x - 4.5), ...(type ? blockVars(type, game.level, colors) : {}) } as CSSProperties} />))}
    </div>}
  </div>
}

/** F-060 (owner test): Hold below the orange rotate button, or in the free top corner above the other one. */
export type HoldPlacement = 'bottom' | 'top'

const ICONS = {
  left: <path d="M15 5l-7 7 7 7" />,
  right: <path d="M9 5l7 7-7 7" />,
  down: <path d="M5 9l7 7 7-7" />,
  clockwise: <><path d="M20 12a8 8 0 1 1-2.6-5.9" /><path d="M20 4v5h-5" /></>,
  counterclockwise: <><path d="M4 12a8 8 0 1 0 2.6-5.9" /><path d="M4 4v5h5" /></>,
  hardDrop: <><path d="M6 5l6 6 6-6" /><path d="M6 11l6 6 6-6" /><path d="M5 21h14" /></>,
}

export function TouchControls({ method, buttonSize, leftHanded, dropMode, enabled, apply, rotateButtons = 'two', holdEnabled = false, holdAvailable = true, holdPlacement = 'bottom', repeat = DEFAULT_REPEAT, custom = null }: {
  method: 'dpad' | 'swipe'; buttonSize: number; leftHanded: boolean; holdEnabled?: boolean; holdAvailable?: boolean; dropMode: DropMode; enabled: boolean; apply: (action: GameAction) => void; rotateButtons?: 'one' | 'two'; holdPlacement?: HoldPlacement; repeat?: RepeatTiming; custom?: CustomLayout | null
}) {
  const two = rotateButtons === 'two'
  const left = <TouchButton enabled={enabled} timing={repeat} label="Move left" icon={ICONS.left} action="moveLeft" apply={apply} repeat />
  const right = <TouchButton enabled={enabled} timing={repeat} label="Move right" icon={ICONS.right} action="moveRight" apply={apply} repeat />
  const down = softDropAllowed(dropMode) && <TouchButton enabled={enabled} timing={repeat} label="Soft drop" icon={ICONS.down} action="softDrop" apply={apply} repeat />
  const ccw = two && <TouchButton enabled={enabled} label="Rotate counterclockwise" icon={ICONS.counterclockwise} action="rotateCounterclockwise" apply={apply} secondary />
  const cw = <TouchButton enabled={enabled} label={two ? 'Rotate clockwise' : 'Rotate'} icon={ICONS.clockwise} action="rotateClockwise" apply={apply} primary />
  const drop = hardDropAllowed(dropMode) && <TouchButton enabled={enabled} label="Hard drop" icon={ICONS.hardDrop} action="hardDrop" apply={apply} />
  // F-050: a Hold button when Hold is on; the Hold box can still be tapped.
  const hold = holdEnabled && <TouchButton enabled={enabled && holdAvailable} label="Hold" text="HOLD" action="hold" apply={apply} hold />
  const single = dropMode !== 'both'
  const count = 3 + (two ? 1 : 0) + (single ? 1 : 2) + (holdEnabled ? 1 : 0)
  // F-060: with Split and two rotate buttons, Hold joins the rotate buttons; otherwise it stays in the pad.
  const holdInRotate = Boolean(hold) && two
  const padHold = holdInRotate ? false : hold
  return <section className={`touch-controls${leftHanded ? ' left-handed' : ''}${method === 'dpad' ? ' touch-split' : ''}${single ? ' single-drop' : ''}${method === 'dpad' && holdInRotate ? ' hold-in-rotate' : ''}${method === 'dpad' && custom ? ' touch-custom' : ''}`} style={{ '--preferred-touch-size': `${buttonSize}px`, '--touch-count': count } as CSSProperties} aria-label="Touch controls">
    {method === 'swipe' ? <p className="swipe-instructions">Tap the left half to rotate ↺ and the right half to rotate ↻ · Swipe left/right to move{softDropAllowed(dropMode) ? ' · Swipe down to soft drop' : ''}{hardDropAllowed(dropMode) ? ' · Swipe up to hard drop' : ''}</p>
      : <>
        {single ? <div className={`touch-pad single${padHold ? ' with-hold' : ''}`} style={placeStyle(custom?.pad)}>{left}{down || drop}{right}{padHold}</div> : <div className="touch-pad" style={placeStyle(custom?.pad)}>{drop}{left}{down}{right}{padHold}</div>}
        <div className={`touch-rotate${two ? ' two' : ''}${holdInRotate ? ` with-hold hold-${holdPlacement}` : ''}`} style={placeStyle(custom?.rotate)}>{ccw}{cw}{holdInRotate && hold}</div>
      </>}
  </section>
}

/** F-061: where a button group sits in the player's own layout (used by CSS only in portrait). */
function placeStyle(place: GroupPlace | undefined): CSSProperties | undefined {
  return place ? { '--x': place.x, '--y': place.y, '--s': place.scale } as CSSProperties : undefined
}

/** Small static copy of the touch buttons for the Settings preview (F-023). */
export function TouchPreview({ rotateButtons, dropMode, leftHanded, holdEnabled = false, holdPlacement = 'bottom' }: { rotateButtons: 'one' | 'two'; dropMode: DropMode; leftHanded: boolean; holdEnabled?: boolean; holdPlacement?: HoldPlacement }) {
  const icon = (paths: ReactNode, kind = '') => <span className={`preview-key${kind}`}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">{paths}</svg></span>
  const two = rotateButtons === 'two'
  const ccw = two && icon(ICONS.counterclockwise, ' secondary'), cw = icon(ICONS.clockwise, ' primary')
  const down = softDropAllowed(dropMode) && icon(ICONS.down), drop = hardDropAllowed(dropMode) && icon(ICONS.hardDrop), single = dropMode !== 'both'
  const hold = holdEnabled && <span className="preview-key touch-hold">HOLD</span>
  const holdInRotate = Boolean(hold) && two, padHold = holdInRotate ? false : hold
  return <div className={`touch-preview split${single ? ' single-drop' : ''}${leftHanded ? ' left-handed' : ''}`} role="img" aria-label={`Preview: split layout with ${two ? 'two rotate buttons' : 'one rotate button'}`}>
    <><div className={`touch-pad${single ? ' single' : ''}${single && padHold ? ' with-hold' : ''}`}>{single ? <>{icon(ICONS.left)}{down || drop}{icon(ICONS.right)}{padHold}</> : <>{drop}{icon(ICONS.left)}{down}{icon(ICONS.right)}{padHold}</>}</div><div className={`touch-rotate${two ? ' two' : ''}${holdInRotate ? ` with-hold hold-${holdPlacement}` : ''}`}>{ccw}{cw}{holdInRotate && hold}</div></>
  </div>
}

function TouchButton({ label, icon, text, action, apply, enabled, repeat = false, timing = DEFAULT_REPEAT, primary = false, secondary = false, hold = false }: {
  label: string; icon?: ReactNode; text?: string; action: GameAction; apply: (action: GameAction) => void; enabled: boolean; repeat?: boolean; timing?: RepeatTiming; primary?: boolean; secondary?: boolean; hold?: boolean
}) {
  const activePointer = useRef<number | null>(null)
  const delay = useRef<ReturnType<typeof setTimeout> | null>(null)
  const interval = useRef<ReturnType<typeof setInterval> | null>(null)
  function stop() {
    if (delay.current) clearTimeout(delay.current)
    if (interval.current) clearInterval(interval.current)
    delay.current = null
    interval.current = null
    activePointer.current = null
  }
  function press(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault()
    if (!enabled || activePointer.current !== null) return
    stop()
    activePointer.current = event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)
    apply(action)
    if (repeat) delay.current = setTimeout(() => { apply(action); interval.current = setInterval(() => apply(action), action === 'softDrop' ? timing.softDropInterval : timing.interval) }, timing.delay)
  }
  function release(event: ReactPointerEvent<HTMLButtonElement>) {
    if (activePointer.current === event.pointerId) stop()
  }
  useEffect(() => { if (!enabled) stop(); return stop }, [enabled])
  return <button aria-label={label} disabled={!enabled} className={`touch-button${primary ? ' touch-primary' : ''}${secondary ? ' touch-secondary' : ''}${hold ? ' touch-hold' : ''}`} onClick={(event) => { if (event.detail === 0) apply(action) }} onLostPointerCapture={release} onPointerCancel={release} onPointerDown={press} onPointerUp={release} type="button">{text ? <span aria-hidden="true">{text}</span> : <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>}</button>
}

export function PiecePreview({ type, level, colors = 'level' }: { type: PieceType; level: number; colors?: BlockColors }) {
  const shape = previewShape(type)
  // The 4 × 4 frame keeps its size; the piece's own grid sits exactly in its centre.
  return <div className="piece-preview" aria-label={`${type} piece`}>
    <div className="piece-preview-grid" style={{ width: `${shape.width * 25}%`, height: `${shape.height * 25}%`, gridTemplateColumns: `repeat(${shape.width}, 1fr)`, gridTemplateRows: `repeat(${shape.height}, 1fr)`, '--shape': `${shape.width} / ${shape.height}` } as CSSProperties}>
      {Array.from({ length: shape.width * shape.height }, (_, index) => {
        const filled = shape.cells.has(index)
        return <span className={filled ? 'filled' : ''} key={index} style={filled ? blockVars(type, level, colors) : undefined} />
      })}
    </div>
  </div>
}

/** Hold box. Tapping it holds the active piece; keyboard and controller players use their Hold binding. */
export function HoldBox({ type, level, colors = 'level', enabled, onHold }: { type: PieceType | null; level: number; colors?: BlockColors; enabled: boolean; onHold: () => void }) {
  return <button aria-label="Use Hold" className="hold-box" disabled={!enabled} onPointerDown={(event) => { event.preventDefault(); if (enabled) onHold() }} onClick={(event) => { if (event.detail === 0 && enabled) onHold() }} tabIndex={-1} type="button">
    <span>Hold</span>
    {type ? <PiecePreview type={type} level={level} colors={colors} /> : <span className="empty-hold" aria-hidden="true">—</span>}
  </button>
}

/** F-054: the pieces after the next one, smaller, below it (Modern shows three in all). */
export function NextQueue({ queue, level, colors = 'level' }: { queue: readonly PieceType[]; level: number; colors?: BlockColors }) {
  if (!queue.length) return null
  return <div className="next-queue" aria-label={`Then ${queue.join(', ')}`}>{queue.map((type, index) => <PiecePreview key={index} type={type} level={level} colors={colors} />)}</div>
}
