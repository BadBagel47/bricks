import { useEffect, useRef } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { dropPosition, pieceCells } from '../engine/index.ts'
import type { Cell, GameAction, GameState, PieceType } from '../engine/index.ts'
import { blockStyle } from './level-palettes.ts'
import type { BlockColors } from './level-palettes.ts'
import { previewCells } from './piece-preview.ts'
interface SwipePoint { readonly x: number; readonly y: number }

function blockVars(type: PieceType | 'G', level: number, colors: BlockColors): CSSProperties {
  const style = blockStyle(type, level, colors)
  return { '--cell-fill': style.fill, '--cell-ring': style.ring ?? 'transparent', '--cell-color': style.ring ?? style.fill } as CSSProperties
}

export function Playfield({ game, swipeMode, onSwipe, ghost = false, colors = 'level' }: { game: Pick<GameState, 'board' | 'active' | 'level'>; swipeMode: boolean; onSwipe: (start: SwipePoint, end: SwipePoint) => void; ghost?: boolean; colors?: BlockColors }) {
  const cells: Cell[] = game.board.flatMap((row) => [...row])
  const ghosts = new Set<number>()
  const swipeStart = useRef<SwipePoint | null>(null)
  if (game.active) {
    if (ghost) for (const [x, y] of pieceCells(dropPosition(game.board, game.active))) ghosts.add(y * 10 + x)
    for (const [x, y] of pieceCells(game.active)) { cells[y * 10 + x] = game.active.type; ghosts.delete(y * 10 + x) }
  }
  const ghostStyle = game.active ? blockVars(game.active.type, game.level, colors) : undefined
  return <div className={`playfield${swipeMode ? ' swipe-active' : ''}`} role="img" aria-label="Game board, 10 columns by 20 rows"
    onPointerDown={(event) => { if (swipeMode && event.pointerType !== 'mouse') { swipeStart.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId) } }}
    onPointerUp={(event) => { if (!swipeMode || !swipeStart.current) return; onSwipe(swipeStart.current, { x: event.clientX, y: event.clientY }); swipeStart.current = null }}
    onPointerCancel={() => { swipeStart.current = null }}>
    {cells.map((type, index) => type
      ? <div className="board-cell filled" key={index} style={blockVars(type, game.level, colors)} />
      : <div className={`board-cell${ghosts.has(index) ? ' ghost' : ''}`} key={index} style={ghosts.has(index) ? ghostStyle : undefined} />)}
  </div>
}

export function TouchControls({ method, buttonSize, leftHanded, hardDropEnabled, enabled, apply }: {
  method: 'dpad' | 'swipe'; buttonSize: number; leftHanded: boolean; holdEnabled?: boolean; hardDropEnabled: boolean; enabled: boolean; apply: (action: GameAction) => void
}) {
  return <section className={`touch-controls${leftHanded ? ' left-handed' : ''}`} style={{ '--preferred-touch-size': `${buttonSize}px` } as CSSProperties} aria-label="Touch controls">
    {method === 'dpad' ? <div className="touch-row">
      <TouchButton enabled={enabled} label="Move left" icon={<path d="M15 5l-7 7 7 7" />} action="moveLeft" apply={apply} repeat />
      <TouchButton enabled={enabled} label="Move right" icon={<path d="M9 5l7 7-7 7" />} action="moveRight" apply={apply} repeat />
      <TouchButton enabled={enabled} label="Soft drop" icon={<path d="M5 9l7 7 7-7" />} action="softDrop" apply={apply} repeat />
      <TouchButton enabled={enabled} label="Rotate" icon={<><path d="M20 12a8 8 0 1 1-2.6-5.9" /><path d="M20 4v5h-5" /></>} action="rotateClockwise" apply={apply} primary />
      {hardDropEnabled && <TouchButton enabled={enabled} label="Hard drop" icon={<><path d="M6 5l6 6 6-6" /><path d="M6 11l6 6 6-6" /><path d="M5 21h14" /></>} action="hardDrop" apply={apply} />}
    </div> : <p className="swipe-instructions">Tap to rotate · Swipe left/right to move · Swipe down to soft drop · Swipe up to hard drop</p>}
  </section>
}

function TouchButton({ label, icon, action, apply, enabled, repeat = false, primary = false }: {
  label: string; icon: ReactNode; action: GameAction; apply: (action: GameAction) => void; enabled: boolean; repeat?: boolean; primary?: boolean
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
    if (repeat) delay.current = setTimeout(() => { apply(action); interval.current = setInterval(() => apply(action), action === 'softDrop' ? 65 : 48) }, 160)
  }
  function release(event: ReactPointerEvent<HTMLButtonElement>) {
    if (activePointer.current === event.pointerId) stop()
  }
  useEffect(() => { if (!enabled) stop(); return stop }, [enabled])
  return <button aria-label={label} disabled={!enabled} className={`touch-button${primary ? ' touch-primary' : ''}`} onClick={(event) => { if (event.detail === 0) apply(action) }} onLostPointerCapture={release} onPointerCancel={release} onPointerDown={press} onPointerUp={release} type="button"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">{icon}</svg></button>
}

export function PiecePreview({ type, level, colors = 'level' }: { type: PieceType; level: number; colors?: BlockColors }) {
  const cells = previewCells(type)
  return <div className="piece-preview" aria-label={`${type} piece`}>
    {Array.from({ length: 16 }, (_, index) => {
      const filled = cells.has(index)
      return <span className={filled ? 'filled' : ''} key={index} style={filled ? blockVars(type, level, colors) : undefined} />
    })}
  </div>
}

/** Hold box. Tapping it holds the active piece; keyboard and controller players use their Hold binding. */
export function HoldBox({ type, level, colors = 'level', enabled, onHold }: { type: PieceType | null; level: number; colors?: BlockColors; enabled: boolean; onHold: () => void }) {
  return <button aria-label="Use Hold" className="hold-box" disabled={!enabled} onPointerDown={(event) => { event.preventDefault(); if (enabled) onHold() }} onClick={(event) => { if (event.detail === 0 && enabled) onHold() }} tabIndex={-1} type="button">
    <span>Hold</span>
    {type ? <PiecePreview type={type} level={level} colors={colors} /> : <span className="empty-hold" aria-hidden="true">—</span>}
  </button>
}
