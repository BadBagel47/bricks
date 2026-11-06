import { useEffect, useRef } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { pieceCells } from '../engine/index.ts'
import type { GameAction, GameState, PieceType } from '../engine/index.ts'
import { colorForPiece } from './level-palettes.ts'
import { previewCells } from './piece-preview.ts'
interface SwipePoint { readonly x: number; readonly y: number }

export function Playfield({ game, swipeMode, onSwipe }: { game: Pick<GameState, 'board' | 'active' | 'level'>; swipeMode: boolean; onSwipe: (start: SwipePoint, end: SwipePoint) => void }) {
  const cells: (PieceType | null)[] = game.board.flatMap((row) => [...row])
  const swipeStart = useRef<SwipePoint | null>(null)
  if (game.active) for (const [x, y] of pieceCells(game.active)) cells[y * 10 + x] = game.active.type
  return <div className={`playfield${swipeMode ? ' swipe-active' : ''}`} role="img" aria-label="Game board, 10 columns by 20 rows"
    onPointerDown={(event) => { if (swipeMode && event.pointerType !== 'mouse') { swipeStart.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId) } }}
    onPointerUp={(event) => { if (!swipeMode || !swipeStart.current) return; onSwipe(swipeStart.current, { x: event.clientX, y: event.clientY }); swipeStart.current = null }}
    onPointerCancel={() => { swipeStart.current = null }}>
    {cells.map((type, index) => <div className={`board-cell${type ? ' filled' : ''}`} key={index} style={type ? { '--cell-color': colorForPiece(type, game.level) } as CSSProperties : undefined} />)}
  </div>
}

export function TouchControls({ method, buttonSize, leftHanded, holdEnabled, hardDropEnabled, enabled, apply }: {
  method: 'dpad' | 'swipe'; buttonSize: number; leftHanded: boolean; holdEnabled: boolean; hardDropEnabled: boolean; enabled: boolean; apply: (action: GameAction) => void
}) {
  return <section className={`touch-controls${leftHanded ? ' left-handed' : ''}`} style={{ '--preferred-touch-size': `${buttonSize}px` } as CSSProperties} aria-label="Touch controls">
    {method === 'dpad' ? <div className="touch-pad" aria-label="Directional pad">
      <span />
      <TouchButton enabled={enabled} label="Move left" mark="←" action="moveLeft" apply={apply} repeat />
      <span />
      <TouchButton enabled={enabled} label="Move right" mark="→" action="moveRight" apply={apply} repeat />
      <TouchButton enabled={enabled} label="Soft drop" mark="↓" action="softDrop" apply={apply} repeat />
    </div> : <p className="swipe-instructions">Tap to rotate · Swipe left/right to move · Swipe down to soft drop · Swipe up to hard drop</p>}
    <div className="touch-actions">
      <TouchButton enabled={enabled} label="Rotate counterclockwise" mark="B" action="rotateCounterclockwise" apply={apply} />
      <TouchButton enabled={enabled} label="Rotate clockwise" mark="A" action="rotateClockwise" apply={apply} />
      {hardDropEnabled && <TouchButton enabled={enabled} label="Hard drop" mark="DROP" action="hardDrop" apply={apply} primary />}
      {holdEnabled && <TouchButton enabled={enabled} label="Hold piece" mark="HOLD" action="hold" apply={apply} />}
    </div>
  </section>
}

function TouchButton({ label, mark, action, apply, enabled, repeat = false, primary = false }: {
  label: string; mark: string; action: GameAction; apply: (action: GameAction) => void; enabled: boolean; repeat?: boolean; primary?: boolean
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
  return <button aria-label={label} disabled={!enabled} className={`touch-button${primary ? ' touch-primary' : ''}${mark.length > 2 ? ' touch-word' : ''}`} onClick={(event) => { if (event.detail === 0) apply(action) }} onLostPointerCapture={release} onPointerCancel={release} onPointerDown={press} onPointerUp={release} type="button">{mark}</button>
}

export function PiecePreview({ type, level }: { type: PieceType; level: number }) {
  const cells = previewCells(type)
  return <div className="piece-preview" aria-label={`${type} piece`}>
    {Array.from({ length: 16 }, (_, index) => {
      const filled = cells.has(index)
      return <span className={filled ? 'filled' : ''} key={index} style={filled ? { '--cell-color': colorForPiece(type, level) } as CSSProperties : undefined} />
    })}
  </div>
}

