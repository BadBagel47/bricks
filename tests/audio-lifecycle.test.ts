import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { TestContext } from 'node:test'
import { BricksAudio } from '../src/audio/synth.ts'
import { frequencyForNote, ORIGINAL_MELODY } from '../src/audio/tempo.ts'
import { createBoard } from '../src/engine/board.ts'
import { DEFAULT_PERSONAL_SETTINGS } from '../src/persistence.ts'

function audioHarness(t: TestContext) {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'] })
  const tones: { frequency: { value: number }; active: boolean }[] = []
  const parameter = () => ({
    value: 1,
    setValueAtTime(value: number) { this.value = value },
    setTargetAtTime(value: number) { this.value = value },
    exponentialRampToValueAtTime() {},
    linearRampToValueAtTime() {},
    cancelScheduledValues() {},
  })
  class Context {
    state = 'running'
    destination = {}
    get currentTime() { return Date.now() / 1000 }
    resume() { return Promise.resolve() }
    createGain() { return { gain: parameter(), connect() {}, disconnect() {} } }
    createOscillator() {
      let endTimer: ReturnType<typeof setTimeout> | undefined
      const tone = {
        frequency: parameter(), active: false, type: 'sine',
        onended: () => {}, connect() {}, disconnect() {},
        start() { this.active = true },
        stop(when = Date.now() / 1000) {
          clearTimeout(endTimer)
          endTimer = setTimeout(() => { this.active = false; this.onended() }, Math.max(0, when * 1000 - Date.now()))
        },
      }
      tones.push(tone)
      return tone
    }
  }
  const original = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext')
  Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: Context })
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'AudioContext', original)
    else Reflect.deleteProperty(globalThis, 'AudioContext')
  })
  return { audio: new BricksAudio(DEFAULT_PERSONAL_SETTINGS), tones, tick: (ms: number) => t.mock.timers.tick(ms) }
}

test('pause silences active tones and cancels the remaining line-clear effect; resume only restarts music', (t) => {
  const { audio, tones, tick } = audioHarness(t)
  audio.beginGame(DEFAULT_PERSONAL_SETTINGS)
  audio.handleEvents([{ type: 'linesCleared', count: 1, points: 40 }])
  tick(0)
  assert.ok(tones.filter((tone) => tone.active).length >= 2)
  audio.pauseGame()
  tick(20)
  assert.equal(tones.some((tone) => tone.active), false)
  const stoppedCount = tones.length
  tick(1000)
  assert.equal(tones.length, stoppedCount)
  audio.resumeGame()
  assert.equal(tones.length, stoppedCount + 1)
  assert.equal(tones.at(-1)?.frequency.value, frequencyForNote(ORIGINAL_MELODY[1], false))
  tick(250)
  assert.equal(tones.length, stoppedCount + 1)
})

test('replay cancels the Game Over sequence and resets melody and danger state', (t) => {
  const { audio, tones, tick } = audioHarness(t)
  audio.beginGame(DEFAULT_PERSONAL_SETTINGS)
  const board = createBoard().map((row) => [...row])
  board[0][0] = 'T'
  audio.setDanger(board)
  audio.endGame()
  tick(0)
  const previousTones = [...tones]
  audio.beginGame(DEFAULT_PERSONAL_SETTINGS)
  assert.equal(tones.at(-1)?.frequency.value, frequencyForNote(ORIGINAL_MELODY[0], false))
  const replayCount = tones.length
  tick(20)
  assert.equal(previousTones.some((tone) => tone.active), false)
  tick(280)
  assert.equal(tones.length, replayCount, 'No old Game Over tones or danger-tempo notes leak into the replay')
})

test('leaving during Game Over cancels its remaining notes and all active sound', (t) => {
  const { audio, tones, tick } = audioHarness(t)
  audio.beginGame(DEFAULT_PERSONAL_SETTINGS)
  audio.endGame()
  tick(0)
  audio.leaveGame()
  const count = tones.length
  tick(1000)
  assert.equal(tones.length, count)
  assert.equal(tones.some((tone) => tone.active), false)
})

test('Game Over completes its three-note effect while music stays stopped', (t) => {
  const { audio, tones, tick } = audioHarness(t)
  audio.beginGame(DEFAULT_PERSONAL_SETTINGS)
  audio.endGame()
  tick(0)
  tick(120)
  tick(120)
  assert.deepEqual(tones.slice(1).map((tone) => tone.frequency.value), [59, 55, 50].map((note) => frequencyForNote(note, false)))
  tick(1000)
  assert.equal(tones.length, 4)
  assert.equal(tones.some((tone) => tone.active), false)
})

test('volume changes keep the current melody step; muting effects cancels queued notes', (t) => {
  const { audio, tones, tick } = audioHarness(t)
  audio.beginGame(DEFAULT_PERSONAL_SETTINGS)
  audio.handleEvents([{ type: 'linesCleared', count: 4, points: 1200 }])
  tick(0)
  const count = tones.length
  audio.updateSettings({ ...DEFAULT_PERSONAL_SETTINGS, musicVolume: 35, effectsEnabled: false })
  tick(250)
  assert.equal(tones.length, count)
  tick(140)
  assert.equal(tones.length, count + 1)
  assert.equal(tones.at(-1)?.frequency.value, frequencyForNote(ORIGINAL_MELODY[1], false))
})
