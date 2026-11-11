import type { Board, GameEvent } from '../engine/types.ts'
import type { PersonalSettings } from '../persistence.ts'
import { scheduleEffect } from './effects.ts'
import type { EffectName } from './effects.ts'
import { MUSIC_BARS, scheduleMusicStep, stepSeconds, STEPS_PER_BAR } from './music.ts'
import { nextDangerState } from './tempo.ts'
import type { Voices } from './voices.ts'
import { VoicePool } from './web-voices.ts'

type AudioSettings = Pick<PersonalSettings, 'musicEnabled' | 'musicVolume' | 'effectsEnabled' | 'effectsVolume'>

/** Seconds of music scheduled ahead of the audio clock. */
const LOOKAHEAD = 0.12
const SCHEDULER_MS = 25

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
  private pool: VoicePool | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
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
    tone: (spec) => { if (this.musicGain) this.pool?.tone(spec, this.musicGain) },
    noise: (spec) => { if (this.musicGain) this.pool?.noise(spec, this.musicGain) },
  }

  private readonly effectVoices: Voices = {
    tone: (spec) => { if (this.effectsGain) this.pool?.tone(spec, this.effectsGain) },
    noise: (spec) => { if (this.effectsGain) this.pool?.noise(spec, this.effectsGain) },
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
      this.pool = new VoicePool(this.context)
      this.musicGain.connect(output)
      this.effectsGain.connect(output)
      void this.context.resume().catch(() => undefined)
    } catch {
      this.context = null
      this.pool = null
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
    if (this.musicGain) this.pool?.stop(this.musicGain)
  }

  private stopEffects() {
    if (this.effectsGain) this.pool?.stop(this.effectsGain)
  }
}
