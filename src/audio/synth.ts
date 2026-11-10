import type { Board, GameEvent } from '../engine/types.ts'
import type { PersonalSettings } from '../persistence.ts'
import { scheduleEffect } from './effects.ts'
import type { EffectName } from './effects.ts'
import { MUSIC_BARS, scheduleMusicStep, stepSeconds, STEPS_PER_BAR } from './music.ts'
import { nextDangerState } from './tempo.ts'
import type { NoiseSpec, ToneSpec, Voices, Wave } from './voices.ts'

type AudioSettings = Pick<PersonalSettings, 'musicEnabled' | 'musicVolume' | 'effectsEnabled' | 'effectsVolume'>
type Voice = { source: AudioScheduledSourceNode; extras: AudioScheduledSourceNode[]; envelope: GainNode; destination: GainNode }

/** Seconds of music scheduled ahead of the audio clock. */
const LOOKAHEAD = 0.12
const SCHEDULER_MS = 25
const PULSE_DUTIES: Record<'p12' | 'p25' | 'p50', number> = { p12: 0.125, p25: 0.25, p50: 0.5 }

const musicAudible = (settings: AudioSettings) => settings.musicEnabled && settings.musicVolume > 0
const effectsAudible = (settings: AudioSettings) => settings.effectsEnabled && settings.effectsVolume > 0

/**
 * Generated retro audio for Bricks: a looping four-channel soundtrack with a
 * danger tempo, and synthesized effects. Nothing is downloaded.
 */
export class BricksAudio {
  private context: AudioContext | null = null
  private musicGain: GainNode | null = null
  private effectsGain: GainNode | null = null
  private readonly waves = new Map<Wave, PeriodicWave>()
  private noiseBuffer: AudioBuffer | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private readonly voices = new Set<Voice>()
  private settings: AudioSettings
  private playing = false
  /** Danger state requested by the board; the music switches on the next beat. */
  private dangerRequested = false
  private danger = false
  private bar = 0
  private step = 0
  private nextStepTime = 0

  constructor(settings: AudioSettings) {
    this.settings = settings
  }

  /** Unlock a silent context from a user gesture, before play starts. */
  unlock() { this.ensureAudio() }

  beginGame(settings: AudioSettings) {
    this.stopMusic()
    this.stopEffects()
    this.bar = 0
    this.step = 0
    this.danger = false
    this.dangerRequested = false
    this.settings = settings
    this.playing = true
    this.applyVolumes()
    this.startMusic()
  }

  updateSettings(settings: AudioSettings) {
    const musicWasAudible = musicAudible(this.settings)
    this.settings = settings
    this.applyVolumes()
    if (musicAudible(settings) && this.playing) {
      if (!musicWasAudible || this.timer === null) this.startMusic()
    } else this.stopMusic()
    if (!effectsAudible(settings)) this.stopEffects()
  }

  pauseGame() {
    this.playing = false
    this.stopMusic()
    this.stopEffects()
  }

  resumeGame() {
    this.playing = true
    this.applyVolumes()
    this.startMusic()
  }

  endGame() {
    this.playing = false
    this.stopMusic()
    this.stopEffects()
    this.cue('gameOver')
  }

  leaveGame() {
    this.pauseGame()
  }

  setDanger(board: Board) {
    this.dangerRequested = nextDangerState(board, this.dangerRequested)
  }

  /** Play a named effect now, for menus and multiplayer moments outside engine events. */
  cue(name: EffectName, delay = 0) {
    if (!effectsAudible(this.settings) || !this.ensureContext() || !this.context) return
    scheduleEffect(this.effectVoices, name, this.context.currentTime + 0.005 + delay)
  }

  handleEvents(events: readonly GameEvent[]) {
    if (events.some((event) => event.type === 'paused')) this.pauseGame()
    if (events.some((event) => event.type === 'resumed')) this.resumeGame()
    if (events.some((event) => event.type === 'gameOver')) {
      this.endGame()
      return
    }
    const cleared = events.find((event): event is Extract<GameEvent, { type: 'linesCleared' }> => event.type === 'linesCleared')
    if (cleared) this.cue(cleared.count >= 4 ? 'four' : cleared.count === 3 ? 'clear3' : cleared.count === 2 ? 'clear2' : 'clear1')
    else if (events.some((event) => event.type === 'hardDropped')) this.cue('hardDrop')
    else if (events.some((event) => event.type === 'locked')) this.cue('lock')
    if (events.some((event) => event.type === 'levelChanged')) this.cue('levelUp', cleared ? 0.35 : 0)
    if (events.some((event) => event.type === 'rotated')) this.cue('rotate')
    if (events.some((event) => event.type === 'held')) this.cue('hold')
    if (events.some((event) => event.type === 'moved' && event.dx !== 0)) this.cue('move')
  }

  private readonly musicVoices: Voices = {
    tone: (spec) => this.tone(spec, this.musicGain),
    noise: (spec) => this.noise(spec, this.musicGain),
  }

  private readonly effectVoices: Voices = {
    tone: (spec) => this.tone(spec, this.effectsGain),
    noise: (spec) => this.noise(spec, this.effectsGain),
  }

  private ensureAudio() {
    if (this.context) {
      if (this.context.state === 'suspended') void this.context.resume().catch(() => undefined)
      return
    }
    try {
      this.context = new AudioContext()
      this.musicGain = this.context.createGain()
      this.effectsGain = this.context.createGain()
      this.musicGain.gain.setValueAtTime(0, this.context.currentTime)
      this.effectsGain.gain.setValueAtTime(0, this.context.currentTime)
      let output: AudioNode = this.context.destination
      try {
        // Gentle bus compression keeps the busy four-channel mix from clipping.
        const compressor = this.context.createDynamicsCompressor()
        compressor.threshold.value = -12
        compressor.knee.value = 12
        compressor.ratio.value = 3
        compressor.attack.value = 0.003
        compressor.release.value = 0.2
        compressor.connect(this.context.destination)
        output = compressor
      } catch { /* Play uncompressed where unsupported. */ }
      this.musicGain.connect(output)
      this.effectsGain.connect(output)
      void this.context.resume().catch(() => undefined)
    } catch {
      this.context = null
      this.musicGain = null
      this.effectsGain = null
    }
  }

  private applyVolumes() {
    this.ensureAudio()
    const now = this.context?.currentTime ?? 0
    const music = this.settings.musicEnabled ? (this.settings.musicVolume / 100) ** 2 * 0.77 : 0
    const effects = this.settings.effectsEnabled ? (this.settings.effectsVolume / 100) ** 2 * 0.9 : 0
    this.musicGain?.gain.setTargetAtTime(music, now, 0.025)
    this.effectsGain?.gain.setTargetAtTime(effects, now, 0.025)
  }

  private ensureContext(): boolean {
    this.ensureAudio()
    return this.context !== null && this.musicGain !== null && this.effectsGain !== null
  }

  private startMusic() {
    this.stopMusic()
    if (!this.playing || !musicAudible(this.settings) || !this.ensureContext() || !this.context) return
    // Resume from the start of the current beat, which always carries a bass note.
    this.step -= this.step % 4
    this.nextStepTime = this.context.currentTime + 0.05
    this.scheduleAhead()
  }

  private readonly scheduleAhead = () => {
    this.timer = null
    const context = this.context
    if (!context || !this.playing) return
    while (this.nextStepTime < context.currentTime + LOOKAHEAD) {
      if (this.step % 4 === 0) this.danger = this.dangerRequested
      scheduleMusicStep(this.musicVoices, this.bar, this.step, this.nextStepTime, this.danger)
      this.nextStepTime += stepSeconds(this.danger)
      if (++this.step === STEPS_PER_BAR) {
        this.step = 0
        this.bar = (this.bar + 1) % MUSIC_BARS
      }
    }
    this.timer = setTimeout(this.scheduleAhead, SCHEDULER_MS)
  }

  private stopMusic() {
    if (this.timer !== null) clearTimeout(this.timer)
    this.timer = null
    this.stopVoices(this.musicGain)
  }

  private stopEffects() {
    this.stopVoices(this.effectsGain)
  }

  private stopVoices(destination: GainNode | null) {
    const now = this.context?.currentTime ?? 0
    for (const voice of this.voices) {
      if (voice.destination !== destination) continue
      this.voices.delete(voice)
      try {
        // Briefly fade instead of cutting a waveform at full amplitude.
        const gain = voice.envelope.gain
        if (typeof gain.cancelAndHoldAtTime === 'function') gain.cancelAndHoldAtTime(now)
        else {
          const level = gain.value
          gain.cancelScheduledValues(now)
          gain.setValueAtTime(level, now)
        }
        gain.linearRampToValueAtTime(0, now + 0.008)
        voice.source.stop(now + 0.01)
        for (const extra of voice.extras) extra.stop(now + 0.01)
      } catch {
        voice.source.disconnect()
        voice.envelope.disconnect()
      }
    }
  }

  private track(source: AudioScheduledSourceNode, extras: AudioScheduledSourceNode[], envelope: GainNode, destination: GainNode, end: number) {
    const voice: Voice = { source, extras, envelope, destination }
    source.onended = () => {
      this.voices.delete(voice)
      source.disconnect()
      envelope.disconnect()
    }
    source.stop(end)
    for (const extra of extras) extra.stop(end)
    this.voices.add(voice)
  }

  private wave(oscillator: OscillatorNode, wave: Wave) {
    if (wave === 'tri') { oscillator.type = 'triangle'; return }
    if (wave === 'sine') { oscillator.type = 'sine'; return }
    let periodic = this.waves.get(wave)
    if (!periodic && this.context) {
      try {
        // Band-limited pulse wave with the classic NES duty cycles.
        const duty = PULSE_DUTIES[wave]
        const real = new Float32Array(40)
        const imag = new Float32Array(40)
        for (let k = 1; k < real.length; k++) real[k] = 2 * Math.sin(Math.PI * k * duty) / (Math.PI * k)
        periodic = this.context.createPeriodicWave(real, imag)
        this.waves.set(wave, periodic)
      } catch { /* Fall back to a plain square wave. */ }
    }
    if (periodic) oscillator.setPeriodicWave(periodic)
    else oscillator.type = 'square'
  }

  private tone(spec: ToneSpec, destination: GainNode | null) {
    const context = this.context
    if (!context || !destination) return
    try {
      const { t, dur } = spec
      const end = t + dur
      const vol = spec.vol ?? 0.15
      const attack = spec.a ?? 0.004
      const release = Math.min(spec.rel ?? 0.03, dur * 0.5)
      const decay = spec.dec ?? 0.08
      const sustain = spec.sus ?? 0.75
      const oscillator = context.createOscillator()
      this.wave(oscillator, spec.wave ?? 'p25')
      oscillator.frequency.setValueAtTime(spec.f, t)
      if (spec.f2) {
        const until = t + (spec.slide ?? dur)
        if (spec.lin) oscillator.frequency.linearRampToValueAtTime(spec.f2, until)
        else oscillator.frequency.exponentialRampToValueAtTime(spec.f2, until)
      }
      const envelope = context.createGain()
      envelope.gain.value = 0
      envelope.gain.setValueAtTime(0, t)
      envelope.gain.linearRampToValueAtTime(vol, t + attack)
      if (end - release > t + attack + decay) {
        envelope.gain.linearRampToValueAtTime(vol * sustain, t + attack + decay)
        envelope.gain.setValueAtTime(vol * sustain, end - release)
      }
      envelope.gain.linearRampToValueAtTime(0, end)
      oscillator.connect(envelope)
      envelope.connect(destination)
      const extras: AudioScheduledSourceNode[] = []
      if (spec.vib && dur > 0.2 && oscillator.detune) {
        const lfo = context.createOscillator()
        lfo.frequency.value = 5.8
        const depth = context.createGain()
        depth.gain.setValueAtTime(0, t)
        depth.gain.linearRampToValueAtTime(0, t + 0.12)
        depth.gain.linearRampToValueAtTime(spec.vib, t + 0.3)
        lfo.connect(depth)
        depth.connect(oscillator.detune)
        lfo.start(t)
        extras.push(lfo)
      }
      oscillator.start(t)
      this.track(oscillator, extras, envelope, destination, end + 0.02)
    } catch {
      // Audio can become unavailable if the browser suspends or tears down its device.
    }
  }

  private noise(spec: NoiseSpec, destination: GainNode | null) {
    const context = this.context
    if (!context || !destination) return
    try {
      if (!this.noiseBuffer) {
        const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate)
        const data = buffer.getChannelData(0)
        for (let index = 0; index < data.length; index++) data[index] = Math.random() * 2 - 1
        this.noiseBuffer = buffer
      }
      const { t, dur } = spec
      const source = context.createBufferSource()
      source.buffer = this.noiseBuffer
      source.loop = true
      const filter = context.createBiquadFilter()
      filter.type = spec.type ?? 'bandpass'
      filter.Q.value = spec.q ?? 1
      filter.frequency.setValueAtTime(spec.f ?? 1000, t)
      if (spec.f2) filter.frequency.exponentialRampToValueAtTime(spec.f2, t + dur)
      const envelope = context.createGain()
      envelope.gain.value = 0
      envelope.gain.setValueAtTime(0, t)
      envelope.gain.linearRampToValueAtTime(spec.vol ?? 0.15, t + (spec.a ?? 0.002))
      envelope.gain.exponentialRampToValueAtTime(0.0008, t + dur)
      source.connect(filter)
      filter.connect(envelope)
      envelope.connect(destination)
      source.start(t, Math.random() * 0.5)
      this.track(source, [], envelope, destination, t + dur + 0.02)
    } catch {
      // Noise is decoration; tones still play without it.
    }
  }
}
