import { frequency, noteNumber } from './voices.ts'
import type { Voices } from './voices.ts'

export const EFFECT_NAMES = [
  'move', 'rotate', 'lock', 'hardDrop', 'hold', 'clear1', 'clear2', 'clear3', 'four', 'levelUp',
  'menuMove', 'menuSelect', 'menuBack', 'pause', 'countdownTick', 'countdownGo',
  'garbageSent', 'garbageIncoming', 'garbageRise', 'gameOver', 'victory', 'defeat',
] as const
export type EffectName = (typeof EFFECT_NAMES)[number]

const m = (name: string) => frequency(noteNumber(name))

function lineClear(v: Voices, t: number, count: number) {
  const notes = ['C6', 'E6', 'G6', 'C7', 'E7'].map(noteNumber).slice(0, count + 2)
  notes.forEach((midi, index) => {
    v.tone({ t: t + index * 0.045, dur: 0.09, f: frequency(midi), wave: 'p25', vol: 0.11 })
    if (count >= 2) v.tone({ t: t + index * 0.045, dur: 0.09, f: frequency(midi - 4), wave: 'p12', vol: 0.05 })
  })
  v.noise({ t, dur: 0.25 + count * 0.05, type: 'highpass', f: 5000, f2: 9000, vol: 0.05 })
}

const EFFECTS: Record<EffectName, (v: Voices, t: number) => void> = {
  move: (v, t) => v.tone({ t, dur: 0.035, f: 1046, wave: 'p50', vol: 0.08, a: 0.001, rel: 0.02 }),
  rotate: (v, t) => v.tone({ t, dur: 0.065, f: 740, f2: 1175, wave: 'p25', vol: 0.1, a: 0.002 }),
  lock(v, t) {
    v.tone({ t, dur: 0.1, f: 230, f2: 80, wave: 'tri', vol: 0.38, a: 0.001, dec: 0.03 })
    v.noise({ t, dur: 0.06, type: 'lowpass', f: 1200, vol: 0.12 })
  },
  hardDrop(v, t) {
    v.noise({ t, dur: 0.09, f: 3500, f2: 400, q: 1.2, vol: 0.2 })
    v.tone({ t: t + 0.07, dur: 0.18, f: 170, f2: 42, wave: 'tri', vol: 0.5, a: 0.001, dec: 0.04 })
    v.noise({ t: t + 0.07, dur: 0.14, type: 'lowpass', f: 700, vol: 0.22 })
  },
  hold(v, t) {
    v.tone({ t, dur: 0.05, f: m('D6'), wave: 'p12', vol: 0.1 })
    v.tone({ t: t + 0.06, dur: 0.08, f: m('A6'), wave: 'p12', vol: 0.1 })
    v.tone({ t: t + 0.06, dur: 0.08, f: m('D6'), wave: 'p50', vol: 0.04 })
  },
  clear1: (v, t) => lineClear(v, t, 1),
  clear2: (v, t) => lineClear(v, t, 2),
  clear3: (v, t) => lineClear(v, t, 3),
  four(v, t) {
    const run = ['C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C7', 'E7', 'G7'].map(noteNumber)
    run.forEach((midi, index) => {
      v.tone({ t: t + index * 0.032, dur: 0.07, f: frequency(midi), wave: 'p12', vol: 0.1 })
      v.tone({ t: t + index * 0.032 + 0.016, dur: 0.06, f: frequency(midi - 12), wave: 'p25', vol: 0.05 })
    })
    const hit = t + run.length * 0.032 + 0.02
    for (const [name, wave, vol] of [['C6', 'p25', 0.08], ['E6', 'p25', 0.06], ['G6', 'p50', 0.05], ['C7', 'p12', 0.06]] as const) {
      v.tone({ t: hit, dur: 0.6, f: m(name), wave, vol, dec: 0.25, sus: 0.5, rel: 0.2, vib: 16 })
    }
    v.tone({ t: hit, dur: 0.5, f: m('C3'), wave: 'tri', vol: 0.4, dec: 0.2, sus: 0.6 })
    v.tone({ t: hit, dur: 0.16, f: 150, f2: 40, wave: 'sine', vol: 0.5, a: 0.001 })
    v.noise({ t: hit, dur: 0.9, type: 'highpass', f: 3000, q: 0.4, vol: 0.12 })
  },
  levelUp(v, t) {
    const melody = ['G5', 'C6', 'E6', 'G6'].map(noteNumber)
    melody.forEach((midi, index) => {
      const last = index === melody.length - 1
      v.tone({ t: t + index * 0.08, dur: last ? 0.4 : 0.075, f: frequency(midi), wave: 'p25', vol: 0.11, vib: last ? 14 : 0, rel: last ? 0.12 : 0.02 })
      v.tone({ t: t + index * 0.08, dur: last ? 0.4 : 0.075, f: frequency(midi - 5), wave: 'p12', vol: 0.05 })
    })
    v.tone({ t, dur: 0.24, f: m('G3'), wave: 'tri', vol: 0.3 })
    v.tone({ t: t + 0.24, dur: 0.4, f: m('C3'), wave: 'tri', vol: 0.32 })
  },
  menuMove: (v, t) => v.tone({ t, dur: 0.028, f: 1568, wave: 'p50', vol: 0.06, a: 0.001 }),
  menuSelect(v, t) {
    v.tone({ t, dur: 0.05, f: 988, wave: 'p25', vol: 0.1 })
    v.tone({ t: t + 0.055, dur: 0.1, f: 1319, wave: 'p25', vol: 0.1 })
  },
  menuBack(v, t) {
    v.tone({ t, dur: 0.05, f: 880, wave: 'p25', vol: 0.09 })
    v.tone({ t: t + 0.055, dur: 0.09, f: 659, wave: 'p25', vol: 0.09 })
  },
  pause(v, t) {
    v.tone({ t, dur: 0.06, f: 784, wave: 'p50', vol: 0.08 })
    v.tone({ t: t + 0.07, dur: 0.12, f: 523, wave: 'p50', vol: 0.08 })
  },
  countdownTick: (v, t) => v.tone({ t, dur: 0.12, f: 880, wave: 'p50', vol: 0.11 }),
  countdownGo(v, t) {
    v.tone({ t, dur: 0.35, f: 1760, wave: 'p25', vol: 0.11, dec: 0.1, sus: 0.6 })
    v.tone({ t, dur: 0.35, f: 880, wave: 'p12', vol: 0.06 })
  },
  garbageSent(v, t) {
    v.tone({ t, dur: 0.14, f: 300, f2: 1500, wave: 'p12', vol: 0.1, lin: true })
    v.noise({ t, dur: 0.1, f: 2500, f2: 6000, vol: 0.07 })
  },
  garbageIncoming(v, t) {
    ;[220, 185, 220, 185].forEach((f, index) => v.tone({ t: t + index * 0.12, dur: 0.09, f, wave: 'p25', vol: 0.12 }))
  },
  garbageRise(v, t) {
    v.noise({ t, dur: 0.35, type: 'lowpass', f: 600, f2: 150, vol: 0.25 })
    v.tone({ t, dur: 0.32, f: 75, f2: 48, wave: 'tri', vol: 0.4 })
    v.tone({ t: t + 0.03, dur: 0.05, f: 110, wave: 'p50', vol: 0.05 })
    v.tone({ t: t + 0.12, dur: 0.05, f: 104, wave: 'p50', vol: 0.05 })
  },
  gameOver(v, t0) {
    let t = t0
    let step = 0.075
    for (let index = 0; index < 10; index++) {
      const midi = noteNumber('E5') - index
      v.tone({ t, dur: step * 0.9, f: frequency(midi), f2: frequency(midi - 0.6), wave: 'p50', vol: 0.1 })
      t += step
      step *= 1.13
    }
    v.tone({ t, dur: 0.8, f: m('E2'), f2: m('C2'), wave: 'tri', vol: 0.4, dec: 0.3, sus: 0.6 })
    v.noise({ t, dur: 0.9, type: 'lowpass', f: 400, vol: 0.14 })
  },
  victory(v, t) {
    const melody = [['C5', 0.1], ['E5', 0.1], ['G5', 0.1], ['C6', 0.2], ['A5', 0.1], ['B5', 0.1], ['C6', 0.6]] as const
    let start = t
    melody.forEach(([name, length], index) => {
      const last = index === melody.length - 1
      v.tone({ t: start, dur: length * 0.95, f: m(name), wave: 'p25', vol: 0.12, vib: last ? 14 : 0, rel: last ? 0.2 : 0.02 })
      v.tone({ t: start, dur: length * 0.95, f: frequency(noteNumber(name) - (last ? 5 : 4)), wave: 'p12', vol: 0.05 })
      start += length
    })
    ;([['C3', 0], ['G2', 0.3], ['F2', 0.5], ['G2', 0.6], ['C3', 0.7]] as const).forEach(([name, offset], index) => {
      v.tone({ t: t + offset, dur: index === 4 ? 0.6 : 0.18, f: m(name), wave: 'tri', vol: 0.32 })
    })
    v.tone({ t, dur: 0.14, f: 150, f2: 42, wave: 'sine', vol: 0.5, a: 0.001 })
    v.noise({ t: t + 0.3, dur: 0.15, f: 1900, q: 0.7, vol: 0.2 })
    v.tone({ t: t + 0.7, dur: 0.14, f: 150, f2: 42, wave: 'sine', vol: 0.5, a: 0.001 })
    v.noise({ t: t + 0.7, dur: 0.8, type: 'highpass', f: 3500, q: 0.4, vol: 0.09 })
  },
  defeat(v, t) {
    const lead = ['A4', 'G4', 'F4', 'E4']
    const harmony = ['F4', 'E4', 'D4', 'B3']
    const bass = ['A2', 'G2', 'F2', 'E2']
    lead.forEach((name, index) => {
      const last = index === 3
      const length = last ? 0.8 : 0.26
      v.tone({ t: t + index * 0.28, dur: length, f: m(name), wave: 'p25', vol: 0.11, vib: last ? 12 : 0, rel: last ? 0.3 : 0.03 })
      v.tone({ t: t + index * 0.28, dur: length, f: m(harmony[index]), wave: 'p12', vol: 0.05 })
      v.tone({ t: t + index * 0.28, dur: length, f: m(bass[index]), wave: 'tri', vol: 0.3 })
    })
  },
}

export function scheduleEffect(voices: Voices, name: EffectName, t: number) {
  EFFECTS[name](voices, t)
}
