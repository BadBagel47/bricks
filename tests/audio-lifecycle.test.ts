import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { TestContext } from 'node:test'
import { BricksAudio } from '../src/audio/synth.ts'
import { createBoard } from '../src/engine/board.ts'
import { DEFAULT_PERSONAL_SETTINGS } from '../src/persistence.ts'

type Source = { active: boolean; ended: boolean; startedAt: number }

function audioHarness(t: TestContext) {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'] })
  const sources: Source[] = []
  const parameter = () => ({
    value: 1,
    setValueAtTime(value: number) { this.value = value },
    setTargetAtTime(value: number) { this.value = value },
    exponentialRampToValueAtTime() {},
    linearRampToValueAtTime() {},
    cancelScheduledValues() {},
  })
  const node = () => ({ connect() {}, disconnect() {} })
  const source = () => {
    let endTimer: ReturnType<typeof setTimeout> | undefined
    const item = {
      ...node(), active: false, ended: false, startedAt: 0, type: 'sine', buffer: null, loop: false,
      frequency: parameter(), onended: () => {},
      setPeriodicWave() {},
      start(when = Date.now() / 1000) { this.active = true; this.startedAt = when },
      stop(when = Date.now() / 1000) {
        clearTimeout(endTimer)
        endTimer = setTimeout(() => { this.active = false; this.ended = true; this.onended() }, Math.max(0, when * 1000 - Date.now()))
      },
    }
    sources.push(item)
    return item
  }
  class Context {
    state = 'running'
    sampleRate = 800
    destination = node()
    get currentTime() { return Date.now() / 1000 }
    resume() { return Promise.resolve() }
    createGain() { return { ...node(), gain: parameter() } }
    createOscillator() { return source() }
    createBufferSource() { return source() }
    createPeriodicWave() { return {} }
    createBuffer(_channels: number, length: number) { return { getChannelData: () => new Float32Array(length) } }
    createBiquadFilter() { return { ...node(), type: 'lowpass', Q: parameter(), frequency: parameter() } }
    createDynamicsCompressor() { return { ...node(), threshold: parameter(), knee: parameter(), ratio: parameter(), attack: parameter(), release: parameter() } }
  }
  const original = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext')
  Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: Context })
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'AudioContext', original)
    else Reflect.deleteProperty(globalThis, 'AudioContext')
  })
  const active = () => sources.filter((item) => item.active).length
  return { audio: new BricksAudio(DEFAULT_PERSONAL_SETTINGS), sources, active, tick: (ms: number) => t.mock.timers.tick(ms) }
}

test('music schedules continuously; pause silences everything and schedules nothing until resume', (t) => {
  const { audio, sources, active, tick } = audioHarness(t)
  audio.beginGame(DEFAULT_PERSONAL_SETTINGS)
  tick(500)
  assert.ok(sources.length > 5, 'music keeps scheduling ahead')
  audio.handleEvents([{ type: 'linesCleared', count: 1, points: 40 }])
  audio.pauseGame()
  tick(20)
  assert.equal(active(), 0)
  const stoppedCount = sources.length
  tick(1000)
  assert.equal(sources.length, stoppedCount)
  audio.resumeGame()
  tick(200)
  assert.ok(sources.length > stoppedCount)
})

test('replay and leaving cancel the Game Over effect and leftover music', (t) => {
  const { audio, sources, active, tick } = audioHarness(t)
  audio.beginGame(DEFAULT_PERSONAL_SETTINGS)
  tick(100)
  audio.endGame()
  const gameOverSources = sources.length
  tick(50)
  assert.equal(sources.length, gameOverSources, 'music stops at Game Over')
  const previous = [...sources]
  audio.beginGame(DEFAULT_PERSONAL_SETTINGS)
  tick(20)
  assert.equal(previous.some((item) => item.active), false)
  audio.leaveGame()
  tick(20)
  const count = sources.length
  tick(1000)
  assert.equal(sources.length, count)
  assert.equal(active(), 0)
})

test('muting effects cancels queued notes while music continues', (t) => {
  const { audio, sources, tick } = audioHarness(t)
  audio.beginGame(DEFAULT_PERSONAL_SETTINGS)
  tick(100)
  const before = sources.length
  audio.handleEvents([{ type: 'linesCleared', count: 4, points: 1200 }])
  const effectSources = sources.slice(before)
  assert.ok(effectSources.length > 10)
  audio.updateSettings({ ...DEFAULT_PERSONAL_SETTINGS, musicVolume: 35, effectsEnabled: false })
  tick(20)
  assert.equal(effectSources.some((item) => item.active), false)
  const afterMute = sources.length
  tick(400)
  assert.ok(sources.length > afterMute, 'music keeps playing at the new volume')
  const quiet = sources.length
  audio.handleEvents([{ type: 'rotated', direction: 'clockwise' }])
  assert.equal(sources.length, quiet, 'muted effects create no sounds')
})

test('silent settings create no sound sources at all', (t) => {
  const { audio, sources, tick } = audioHarness(t)
  const silent = { ...DEFAULT_PERSONAL_SETTINGS, musicEnabled: false, effectsEnabled: false }
  audio.beginGame(silent)
  audio.handleEvents([{ type: 'rotated', direction: 'clockwise' }, { type: 'linesCleared', count: 2, points: 100 }])
  tick(1000)
  assert.equal(sources.length, 0)
})

test('danger tempo schedules more music per second than calm play', (t) => {
  const calm = audioHarness(t)
  calm.audio.beginGame(DEFAULT_PERSONAL_SETTINGS)
  calm.tick(2000)
  const calmCount = calm.sources.length
  calm.audio.leaveGame()
  calm.tick(50)
  const board = createBoard().map((row) => [...row])
  board[0][0] = 'T'
  calm.audio.beginGame(DEFAULT_PERSONAL_SETTINGS)
  calm.audio.setDanger(board)
  const start = calm.sources.length
  calm.tick(2000)
  assert.ok(calm.sources.length - start > calmCount)
})
