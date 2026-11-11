import type { NoiseSpec, ToneSpec, Wave } from './voices.ts'

type Voice = { source: AudioScheduledSourceNode; extras: AudioScheduledSourceNode[]; envelope: GainNode; destination: GainNode }
const PULSE_DUTIES: Record<'p12' | 'p25' | 'p50', number> = { p12: 0.125, p25: 0.25, p50: 0.5 }

/**
 * Web Audio voices for the game's instrument vocabulary (pulse, triangle, sine
 * and filtered noise). Shared by the game (`BricksAudio`) and the music test
 * player so both sound identical. Tracks voices per destination for fading stops.
 */
export class VoicePool {
  private readonly waves = new Map<Wave, PeriodicWave>()
  private noiseBuffer: AudioBuffer | null = null
  private readonly voices = new Set<Voice>()

  private readonly context: AudioContext

  constructor(context: AudioContext) {
    this.context = context
  }

  /** Fade out and stop every voice playing into the destination. */
  stop(destination: GainNode) {
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

  tone(spec: ToneSpec, destination: GainNode) {
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

  noise(spec: NoiseSpec, destination: GainNode) {
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
