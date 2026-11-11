import { frequency, noteNumber } from './voices.ts'
import type { Voices } from './voices.ts'

/**
 * Original Bricks soundtrack: a 16-bar A/B theme in A minor played twice,
 * the second time with an arpeggio layer. Four NES-style channels: pulse lead,
 * pulse arpeggio, triangle bass and noise drums.
 */
export const NORMAL_BPM = 132
export const DANGER_BPM = 172
export const STEPS_PER_BAR = 16

interface Chord { readonly root: number; readonly arp: readonly number[] }
export interface Bar { readonly chord: Chord; readonly steps: ReadonlyMap<number, readonly [note: number, length: number]> }

const chord = (root: string, arp: readonly string[]): Chord => ({ root: noteNumber(root), arp: arp.map(noteNumber) })
const CHORDS = {
  Am: chord('A2', ['A3', 'C4', 'E4']), F: chord('F2', ['A3', 'C4', 'F4']),
  C: chord('C3', ['C4', 'E4', 'G4']), G: chord('G2', ['B3', 'D4', 'G4']),
  E: chord('E2', ['B3', 'E4', 'G#4']), Dm: chord('D3', ['A3', 'D4', 'F4']),
  Bb: chord('Bb2', ['Bb3', 'D4', 'F4']),
} as const

/** Melody per bar as "note length" pairs in sixteenth steps; "-" is a rest. */
const SCORE: readonly (readonly [keyof typeof CHORDS, string])[] = [
  ['Am', 'A4 2 E5 2 A5 2 G5 2 E5 4 C5 2 D5 2'],
  ['F', 'A4 4 F4 2 A4 2 C5 4 A4 2 C5 2'],
  ['C', 'G4 2 C5 2 E5 2 G5 2 F5 2 E5 2 D5 2 E5 2'],
  ['G', 'D5 6 B4 2 G4 4 - 4'],
  ['Am', 'A4 2 E5 2 A5 2 B5 2 C6 4 B5 2 G5 2'],
  ['F', 'F5 2 E5 2 D5 2 C5 2 A4 4 C5 2 D5 2'],
  ['E', 'E5 4 G#4 2 B4 2 E5 2 D5 2 B4 2 G#4 2'],
  ['E', 'B4 4 G#4 4 E4 4 - 4'],
  ['Dm', 'F5 4 E5 2 D5 2 A4 4 D5 4'],
  ['Am', 'C5 4 B4 2 A4 2 E5 6 - 2'],
  ['F', 'A5 2 G5 2 F5 2 E5 2 F5 4 C5 4'],
  ['C', 'E5 4 D5 2 C5 2 G4 8'],
  ['Dm', 'D5 2 F5 2 A5 2 F5 2 D5 2 F5 2 A5 2 D6 2'],
  ['Am', 'C6 4 B5 2 A5 2 E5 8'],
  ['Bb', 'F5 2 D5 2 Bb4 2 D5 2 F5 2 Bb5 2 A5 2 F5 2'],
  ['E', 'G#5 4 E5 4 B4 4 G#4 4'],
]

/** Chord name per theme bar (for visualization). */
export const THEME_CHORDS: readonly string[] = SCORE.map(([name]) => name)

export const THEME: readonly Bar[] = SCORE.map(([name, melody]) => {
  const tokens = melody.split(' ')
  const steps = new Map<number, readonly [number, number]>()
  let step = 0
  for (let index = 0; index < tokens.length; index += 2) {
    const length = Number(tokens[index + 1])
    if (tokens[index] !== '-') steps.set(step, [noteNumber(tokens[index]), length])
    step += length
  }
  if (step !== STEPS_PER_BAR) throw new Error(`Bar ${name} has ${step} steps`)
  return { chord: CHORDS[name], steps }
})

/** The loop plays the theme twice; the second pass adds the arpeggio layer. */
export const MUSIC_BARS = THEME.length * 2

export function stepSeconds(danger: boolean): number {
  return 60 / (danger ? DANGER_BPM : NORMAL_BPM) / 4
}

function kick(voices: Voices, t: number) {
  voices.tone({ t, dur: 0.14, f: 150, f2: 42, wave: 'sine', vol: 0.55, a: 0.001, dec: 0.02, sus: 0.8, ch: 'kick' })
}

function snare(voices: Voices, t: number) {
  voices.noise({ t, dur: 0.15, f: 1900, q: 0.7, vol: 0.22, ch: 'snare' })
  voices.tone({ t, dur: 0.06, f: 240, f2: 160, wave: 'tri', vol: 0.18, a: 0.001, ch: 'snare' })
}

function hat(voices: Voices, t: number, open: boolean) {
  voices.noise({ t, dur: open ? 0.14 : 0.035, type: 'highpass', f: 7500, q: 0.5, vol: open ? 0.07 : 0.06, ch: 'hat' })
}

/** Schedule every channel for one sixteenth step. Danger adds drive without changing the tune. */
export function scheduleMusicStep(voices: Voices, bar: number, step: number, t: number, danger: boolean) {
  const local = bar % THEME.length
  const secondPass = bar >= THEME.length
  const { chord: harmony, steps } = THEME[local]
  const sd = stepSeconds(danger)
  const sectionB = local >= 8

  const note = steps.get(step)
  if (note) {
    const [midi, length] = note
    voices.tone({ t, dur: length * sd * 0.9, f: frequency(midi), wave: secondPass ? 'p12' : 'p25', vol: 0.12, dec: 0.1, sus: 0.7, vib: length >= 4 ? 12 : 0, ch: 'lead' })
    if (secondPass) voices.tone({ t, dur: length * sd * 0.85, f: frequency(midi - 12), wave: 'p50', vol: 0.035, ch: 'lead' })
  }

  if (danger) {
    voices.tone({ t, dur: sd * 0.85, f: frequency(harmony.root + (step % 2 ? 12 : 0)), wave: 'tri', vol: 0.3, a: 0.002, dec: 0.03, sus: 0.8, ch: 'bass' })
  } else if (step % 2 === 0) {
    const offset = [0, 0, 12, 0, 7, 0, 12, 7][step / 2]
    voices.tone({ t, dur: sd * 1.7, f: frequency(harmony.root + offset), wave: 'tri', vol: 0.32, a: 0.002, dec: 0.04, sus: 0.85, ch: 'bass' })
  }

  if (secondPass || danger) {
    const arp = harmony.arp[[0, 1, 2, 1][step % 4]] + 12
    voices.tone({ t, dur: sd * 0.8, f: frequency(arp), wave: 'p12', vol: 0.04, a: 0.002, dec: 0.03, sus: 0.6, ch: 'arp' })
  }

  const fill = local === 7 || local === 15
  if (step === 0 || step === 8 || (sectionB && step === 10) || (danger && step === 6)) kick(voices, t)
  if (step === 4 || step === 12 || (fill && step >= 13)) snare(voices, t)
  if (danger || step % 2 === 0) hat(voices, t, step === 14 && !danger)
}
