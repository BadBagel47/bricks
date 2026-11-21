import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { Board, PieceType } from '../engine/index.ts'
import type { PersonalSettings } from '../persistence.ts'
import { HoldBox, NextQueue, PiecePreview, Playfield, TouchControls } from './GameViews.tsx'
import { BOARD_MAX, BOARD_MIN, keepOnScreen, placeFromRect, resizedScale } from './custom-layout.ts'
import type { CustomLayout, GroupPlace, LayoutGroup } from './custom-layout.ts'

const GROUP_LABELS: Record<LayoutGroup, string> = { pad: 'Move and drop buttons', rotate: 'Rotate buttons' }

/** A few settled pieces, so the board looks like a game in progress. */
function sampleBoard(): Board {
  const rows: (PieceType | 'G' | null)[][] = Array.from({ length: 20 }, () => Array<PieceType | null>(10).fill(null))
  const fill = (y: number, cells: string) => { [...cells].forEach((c, x) => { if (c !== '.') rows[y][x] = c as PieceType }) }
  fill(16, '......Z...')
  fill(17, 'T....ZZ..I')
  fill(18, 'TTLL.OZSSI')
  fill(19, 'TJLLOO.SSI')
  return rows as Board
}

interface Rects { pad: DOMRect; rotate: DOMRect }
const sameRect = (a: DOMRect, b: DOMRect) => Math.abs(a.left - b.left) < 0.5 && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5

/** The size custom layouts are drawn at with scale 1 (kept in step with `.touch-custom` in App.css). */
/** Groups keep the screen's usual 14 px edge, so their frame and handle stay visible. */
const withMargin = (size: { width: number; height: number }) => ({ width: size.width + 28, height: size.height + 28 })

const baseTouchSize = () => Math.min(84, (innerWidth - 68) / 5.65)

/**
 * F-061: edit the player's own layout on a copy of the 1 Player screen. The two button groups are
 * dragged into place and resized with their corner handle (or moved with the arrow keys and
 * resized with + and − when focused); the slider sets the board's height. Reset returns to the
 * standard layout, Done keeps the result.
 */
export function LayoutEditor({ personal, holdEnabled, onDone }: { personal: PersonalSettings; holdEnabled: boolean; onDone: (layout: CustomLayout | null) => void }) {
  const [draft, setDraft] = useState<CustomLayout | null>(personal.customLayout)
  const [standard, setStandard] = useState(personal.customLayout === null)
  const [rects, setRects] = useState<Rects | null>(null)
  const [board] = useState(sampleBoard)
  const root = useRef<HTMLElement>(null)
  const drag = useRef<{ group: LayoutGroup; mode: 'move' | 'resize'; x: number; y: number; place: GroupPlace; size: { width: number; height: number } } | null>(null)

  useLayoutEffect(() => {
    const measure = () => {
      const node = root.current
      const pad = node?.querySelector('.touch-pad')?.getBoundingClientRect(), rotate = node?.querySelector('.touch-rotate')?.getBoundingClientRect()
      if (!pad || !rotate) return
      setRects((previous) => previous && sameRect(previous.pad, pad) && sameRect(previous.rotate, rotate) ? previous : { pad, rotate })
      if (!draft) {
        // Start from the standard layout as it is drawn on this screen.
        const screen = { width: innerWidth, height: innerHeight }
        const button = node?.querySelector('.touch-pad .touch-button')?.getBoundingClientRect()
        const scale = button ? button.width / baseTouchSize() : 1
        const rotateButton = node?.querySelector('.touch-rotate .touch-secondary, .touch-rotate .touch-primary')?.getBoundingClientRect()
        const rotateScale = rotateButton ? rotateButton.width / (baseTouchSize() * (node?.querySelector('.touch-rotate .touch-secondary') ? 1.15 : 1.25)) : scale
        setDraft({ pad: placeFromRect(pad, screen, scale), rotate: placeFromRect(rotate, screen, rotateScale), board: 1 })
      }
    }
    measure()
    addEventListener('resize', measure)
    return () => removeEventListener('resize', measure)
  })

  const screen = () => ({ width: innerWidth, height: innerHeight })
  function update(group: LayoutGroup, place: GroupPlace) {
    if (!draft) return
    setDraft({ ...draft, [group]: place })
    setStandard(false)
  }
  function start(event: ReactPointerEvent<HTMLElement>, group: LayoutGroup, mode: 'move' | 'resize') {
    if (!draft || !rects) return
    event.preventDefault(); event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { group, mode, x: event.clientX, y: event.clientY, place: draft[group], size: { width: rects[group].width, height: rects[group].height } }
  }
  function move(event: ReactPointerEvent<HTMLElement>) {
    const current = drag.current
    if (!current) return
    const dx = event.clientX - current.x, dy = event.clientY - current.y
    if (current.mode === 'move') update(current.group, keepOnScreen({ ...current.place, x: current.place.x + dx / innerWidth, y: current.place.y + dy / innerHeight }, withMargin(current.size), screen()))
    else update(current.group, { ...current.place, scale: resizedScale(current.place.scale, current.size, dx, dy) })
  }
  function end() { drag.current = null }
  function nudge(event: ReactKeyboardEvent<HTMLElement>, group: LayoutGroup) {
    if (!draft || !rects) return
    const step = event.shiftKey ? 0.05 : 0.01, place = draft[group]
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    if (moves[event.key]) {
      event.preventDefault()
      update(group, keepOnScreen({ ...place, x: place.x + moves[event.key][0], y: place.y + moves[event.key][1] }, withMargin(rects[group]), screen()))
    } else if (event.key === '+' || event.key === '=' || event.key === '-') {
      event.preventDefault()
      const sign = event.key === '-' ? -1 : 1
      update(group, { ...place, scale: resizedScale(place.scale, { width: 100, height: 100 }, sign * 5, sign * 5) })
    }
  }
  function reset() { setDraft(null); setStandard(true); setRects(null) }

  const shown = standard ? null : draft
  const boardScale = draft?.board ?? 1
  return <main ref={root} className={`shell game-shell layout-editing${shown || boardScale !== 1 ? ' layout-custom' : ''}`} style={{ '--board-scale': boardScale } as CSSProperties} aria-label="Edit layout">
    <header className="topbar layout-editor-bar">
      <button className="back-button" type="button" onClick={reset}>Reset</button>
      <label className="layout-board-size"><span>Board</span><input aria-label="Board height" type="range" min={BOARD_MIN * 100} max={BOARD_MAX * 100} step={5} value={Math.round(boardScale * 100)} onChange={(event) => { if (draft) { setDraft({ ...draft, board: Number(event.target.value) / 100 }); setStandard(false) } }} /></label>
      <button className="back-button layout-done" type="button" onClick={() => onDone(standard ? null : draft)}>Done</button>
    </header>
    <section className="game-layout" aria-hidden="true">
      <aside className="game-side game-stats"><div><span>Score</span><strong>1,240</strong></div><div><span>Level</span><strong>02</strong></div><div><span>Lines</span><strong>14</strong></div></aside>
      <Playfield game={{ board, active: { type: 'T', rotation: 0, x: 3, y: 2 }, level: 2 }} colors={personal.blockColors} swipeMode={false} onSwipe={() => {}} />
      <aside className="game-side next-panel"><div className="next-box"><span>Next</span><PiecePreview type="L" level={2} colors={personal.blockColors} /><NextQueue queue={holdEnabled ? ['S', 'I'] : []} level={2} colors={personal.blockColors} /></div>{holdEnabled && <HoldBox type={null} level={2} colors={personal.blockColors} enabled={false} onHold={() => {}} />}</aside>
    </section>
    <TouchControls method="dpad" buttonSize={72} leftHanded={personal.leftHandedControls} rotateButtons={personal.rotateButtons} holdPlacement={personal.holdPlacement} holdEnabled={holdEnabled} dropMode={personal.dropMode} enabled apply={() => {}} custom={shown && draft} />
    {rects && (['pad', 'rotate'] as const).map((group) => <div key={group} className="layout-frame" role="group" tabIndex={0} aria-label={`${GROUP_LABELS[group]}: drag to move, drag the corner to resize`} style={{ left: rects[group].left - 6, top: rects[group].top - 6, width: rects[group].width + 12, height: rects[group].height + 12 }} onPointerDown={(event) => start(event, group, 'move')} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onKeyDown={(event) => nudge(event, group)}>
      <span className="layout-handle" aria-hidden="true" onPointerDown={(event) => start(event, group, 'resize')} onPointerMove={move} onPointerUp={end} onPointerCancel={end} />
    </div>)}
    <p className="layout-portrait-note" role="status">Turn the device upright to edit the layout.</p>
  </main>
}
