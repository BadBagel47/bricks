import type { CSSProperties } from 'react'
import type { KeyboardEvent } from 'react'
import type { PieceType } from '../engine/types.ts'
import { previewShape } from './piece-preview.ts'
import { blockStyle } from './level-palettes.ts'
import type { BlockColors } from './level-palettes.ts'

export interface SegmentOption<T extends string> { readonly value: T; readonly label: string }

/** Single-choice control rendered as a row of segments (ARIA radio group). */
export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly SegmentOption<T>[]; onChange: (value: T) => void }) {
  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    event.preventDefault()
    const next = options[(index + step + options.length) % options.length]
    onChange(next.value)
    const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role=radio]')
    buttons?.[(index + step + options.length) % options.length]?.focus()
  }
  const selected = Math.max(0, options.findIndex(option => option.value === value))
  return <div className="segmented" role="radiogroup" aria-label={label} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`, '--n': options.length, '--i': selected } as CSSProperties}>
    <span className="seg-thumb" aria-hidden="true" />
    {options.map((option, index) => <button key={option.value} type="button" role="radio" aria-checked={option.value === value} tabIndex={option.value === value ? 0 : -1} onClick={() => onChange(option.value)} onKeyDown={(event) => move(event, index)}>{option.label}</button>)}
  </div>
}

/** Number control with minus and plus buttons. */
export function Stepper({ label, value, min, max, lowerLabel, raiseLabel, onChange }: { label: string; value: number; min: number; max: number; lowerLabel: string; raiseLabel: string; onChange: (value: number) => void }) {
  return <div className="stepper-row">
    <span>{label}</span>
    <div className="stepper">
      <button type="button" aria-label={lowerLabel} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>−</button>
      <output aria-label={label}>{String(value).padStart(2, '0')}</output>
      <button type="button" aria-label={raiseLabel} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
    </div>
  </div>
}

const PREVIEW_TYPES: readonly PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

/** Seven sample pieces in the chosen block colors, drawn at the given level. */
export function ColorPreview({ colors, level }: { colors: BlockColors; level: number }) {
  return <div className="color-preview" role="img" aria-label={colors === 'level' ? 'Preview: retro colors that change with each level' : colors === 'tones' ? 'Preview: shades that change with each level' : 'Preview: fixed modern colors'}>
    {PREVIEW_TYPES.map((type) => {
      const style = blockStyle(type, level, colors)
      // B-016: each piece is drawn in its own bounding box and centred in its slot.
      const shape = previewShape(type)
      return <div aria-hidden="true" className="preview-piece" key={type}><div style={{ gridTemplateColumns: `repeat(${shape.width}, 8px)` }}>
        {Array.from({ length: shape.width * shape.height }, (_, index) => shape.cells.has(index)
          ? <i key={index} style={{ background: style.fill, boxShadow: style.ring ? `inset 0 0 0 2px ${style.ring}` : undefined }} />
          : <i key={index} className="empty" />)}
      </div></div>
    })}
  </div>
}
