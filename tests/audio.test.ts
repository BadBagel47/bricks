import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createBoard } from '../src/engine/board.ts'
import { EFFECT_NAMES, scheduleEffect } from '../src/audio/effects.ts'
import { MUSIC_BARS, scheduleMusicStep, stepSeconds, STEPS_PER_BAR, THEME } from '../src/audio/music.ts'
import { isDangerStack, nextDangerState } from '../src/audio/tempo.ts'
import type { NoiseSpec, ToneSpec, Voices } from '../src/audio/voices.ts'
import { frequency, noteNumber } from '../src/audio/voices.ts'

function recorder() {
  const tones: ToneSpec[] = []
  const noises: NoiseSpec[] = []
  const voices: Voices = { tone: (spec) => tones.push(spec), noise: (spec) => noises.push(spec) }
  return { voices, tones, noises }
}

test('the original theme has 16 complete bars and loops twice with an arpeggio pass', () => {
  assert.equal(THEME.length, 16)
  assert.equal(MUSIC_BARS, 32)
  for (const bar of THEME) {
    let covered = 0
    for (const [, [, length]] of bar.steps) covered += length
    assert.ok(covered <= STEPS_PER_BAR)
  }
  const first = recorder(), second = recorder()
  for (let step = 0; step < STEPS_PER_BAR; step++) {
    scheduleMusicStep(first.voices, 0, step, step, false)
    scheduleMusicStep(second.voices, 16, step, step, false)
  }
  assert.ok(second.tones.length > first.tones.length, 'second pass adds the arpeggio layer')
})

test('note helpers follow MIDI tuning', () => {
  assert.equal(noteNumber('A4'), 69)
  assert.equal(noteNumber('C4'), 60)
  assert.equal(noteNumber('Bb2'), 46)
  assert.equal(frequency(69), 440)
})

test('danger music is faster and drives every sixteenth step', () => {
  assert.ok(stepSeconds(true) < stepSeconds(false))
  const calm = recorder(), danger = recorder()
  for (let step = 0; step < STEPS_PER_BAR; step++) {
    scheduleMusicStep(calm.voices, 3, step, step, false)
    scheduleMusicStep(danger.voices, 3, step, step, true)
  }
  assert.ok(danger.tones.length > calm.tones.length)
  assert.ok(danger.noises.length > calm.noises.length)
})

test('danger begins in the top six rows and ends with hysteresis below row nine', () => {
  const board = createBoard().map((row) => [...row])
  assert.equal(isDangerStack(board), false)
  board[5][0] = 'T'
  assert.equal(isDangerStack(board), true)
  assert.equal(nextDangerState(board, false), true)
  board[5][0] = null
  board[7][0] = 'T'
  assert.equal(isDangerStack(board), false)
  assert.equal(nextDangerState(board, false), false, 'calm music stays calm at row 7')
  assert.equal(nextDangerState(board, true), true, 'danger music stays urgent at row 7')
  board[7][0] = null
  board[9][0] = 'T'
  assert.equal(nextDangerState(board, true), false)
})

test('every effect schedules finite sounds that start at or after the requested time', () => {
  for (const name of EFFECT_NAMES) {
    const { voices, tones, noises } = recorder()
    scheduleEffect(voices, name, 10)
    assert.ok(tones.length + noises.length > 0, name)
    for (const spec of [...tones, ...noises]) {
      assert.ok(spec.t >= 10 && spec.dur > 0 && spec.dur < 2, name)
    }
    for (const spec of tones) assert.ok(Number.isFinite(spec.f) && spec.f > 20 && spec.f < 20000, name)
  }
})
