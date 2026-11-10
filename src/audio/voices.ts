/** Instrument vocabulary shared by the music sequencer and the sound effects. */
export type Wave = 'p12' | 'p25' | 'p50' | 'tri' | 'sine'

export interface ToneSpec {
  /** Start time in AudioContext seconds. */
  readonly t: number
  readonly dur: number
  /** Frequency in Hz, optionally sliding to f2. */
  readonly f: number
  readonly f2?: number
  readonly lin?: boolean
  readonly slide?: number
  readonly wave?: Wave
  readonly vol?: number
  readonly a?: number
  readonly dec?: number
  readonly sus?: number
  readonly rel?: number
  /** Vibrato depth in cents, faded in on longer notes. */
  readonly vib?: number
}

export interface NoiseSpec {
  readonly t: number
  readonly dur: number
  readonly type?: BiquadFilterType
  readonly f?: number
  readonly f2?: number
  readonly q?: number
  readonly vol?: number
  readonly a?: number
}

export interface Voices {
  tone(spec: ToneSpec): void
  noise(spec: NoiseSpec): void
}

const NOTE_OFFSETS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

/** MIDI note number for names such as "A4", "G#5" or "Bb2". */
export function noteNumber(name: string): number {
  const match = /^([A-G])([#b]?)(-?\d)$/.exec(name)
  if (!match) throw new Error(`Invalid note ${name}`)
  const accidental = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0
  return 12 * (Number(match[3]) + 1) + NOTE_OFFSETS[match[1]] + accidental
}

export function frequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}
