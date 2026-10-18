import type { GameEvent } from '../engine/types.ts'
import type { PersonalSettings } from '../persistence.ts'
import { frequencyForNote, isDangerStack, musicIntervalMs, ORIGINAL_MELODY } from './tempo.ts'
import type { Board } from '../engine/types.ts'

type AudioSettings = Pick<PersonalSettings, 'musicEnabled' | 'musicVolume' | 'effectsEnabled' | 'effectsVolume'>

export class BricksAudio {
  private context: AudioContext | null = null
  private musicGain: GainNode | null = null
  private effectsGain: GainNode | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private settings: AudioSettings
  private playing = false
  private danger = false
  private step = 0

  constructor(settings: AudioSettings) {
    this.settings = settings
  }

  beginGame(settings: AudioSettings) {
    this.settings = settings
    this.playing = true
    this.ensureAudio()
    this.applyVolumes()
    this.scheduleMusic()
  }

  updateSettings(settings: AudioSettings) {
    this.settings = settings
    this.applyVolumes()
    if (settings.musicEnabled && this.playing) this.scheduleMusic()
    else this.stopMusic()
  }

  pauseGame() {
    this.playing = false
    this.stopMusic()
  }

  resumeGame() {
    this.playing = true
    this.ensureAudio()
    this.scheduleMusic()
  }

  endGame() {
    this.playing = false
    this.stopMusic()
    this.playSequence([59, 55, 50], 0.12, 0.14)
  }

  leaveGame() {
    this.playing = false
    this.stopMusic()
  }

  setDanger(board: Board) {
    const next = isDangerStack(board)
    if (next === this.danger) return
    this.danger = next
    if (this.playing) this.scheduleMusic()
  }

  handleEvents(events: readonly GameEvent[]) {
    if (events.some((event) => event.type === 'paused')) this.pauseGame()
    if (events.some((event) => event.type === 'resumed')) this.resumeGame()
    if (events.some((event) => event.type === 'gameOver')) {
      this.endGame()
      return
    }
    if (events.some((event) => event.type === 'linesCleared')) this.playSequence([74, 79, 86, 91], 0.07, 0.09)
    else if (events.some((event) => event.type === 'hardDropped')) this.playTone(48, 0.16, 0.055, 'sawtooth')
    else if (events.some((event) => event.type === 'locked')) this.playTone(53, 0.07, 0.045)
    if (events.some((event) => event.type === 'rotated')) this.playTone(77, 0.045, 0.025)
    if (events.some((event) => event.type === 'held')) this.playTone(69, 0.075, 0.04, 'triangle')
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
      this.musicGain.connect(this.context.destination)
      this.effectsGain.connect(this.context.destination)
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
    this.musicGain?.gain.setTargetAtTime(this.settings.musicEnabled ? this.settings.musicVolume / 100 * 0.12 : 0, now, 0.025)
    this.effectsGain?.gain.setTargetAtTime(this.settings.effectsEnabled ? this.settings.effectsVolume / 100 * 0.18 : 0, now, 0.025)
  }

  private scheduleMusic() {
    this.stopMusic()
    if (!this.playing || !this.settings.musicEnabled || this.settings.musicVolume === 0 || !this.ensureContext()) return
    const note = ORIGINAL_MELODY[this.step % ORIGINAL_MELODY.length]
    this.playTone(note, musicIntervalMs(this.danger) / 1000 * 0.74, 0.48, 'square', this.musicGain)
    this.step++
    this.timer = setTimeout(() => this.scheduleMusic(), musicIntervalMs(this.danger))
  }

  private ensureContext(): boolean {
    this.ensureAudio()
    return this.context !== null && this.musicGain !== null && this.effectsGain !== null
  }

  private stopMusic() {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }

  private playSequence(notes: readonly number[], spacing: number, duration: number) {
    if (!this.settings.effectsEnabled || this.settings.effectsVolume === 0 || !this.ensureContext() || !this.context || !this.effectsGain) return
    notes.forEach((note, index) => setTimeout(() => this.playTone(note, duration, 0.55, 'square', this.effectsGain), index * spacing * 1000))
  }

  private playTone(note: number, duration: number, level: number, type: OscillatorType = 'square', destination = this.effectsGain) {
    if (!this.context || !destination) return
    if (destination === this.effectsGain && (!this.settings.effectsEnabled || this.settings.effectsVolume === 0)) return
    try {
      const oscillator = this.context.createOscillator()
      const envelope = this.context.createGain()
      const start = this.context.currentTime
      oscillator.type = type
      oscillator.frequency.setValueAtTime(frequencyForNote(note, this.danger), start)
      envelope.gain.setValueAtTime(0.0001, start)
      envelope.gain.exponentialRampToValueAtTime(level, start + 0.008)
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration)
      oscillator.connect(envelope)
      envelope.connect(destination)
      oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect() }
      oscillator.start(start)
      oscillator.stop(start + duration + 0.01)
    } catch {
      // Audio can become unavailable if the browser suspends or tears down its device.
    }
  }
}
