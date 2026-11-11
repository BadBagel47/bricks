/**
 * Owner music test player (docs/music/player.html). Plays the current game
 * theme through the game's own voices and every proposal in docs/music/themes
 * through the shared proposal engine, with a timeline, danger/level controls
 * and a ranking. Built by `npm run music:player`; not part of the game bundle.
 */
import { DANGER_BPM, MUSIC_BARS, NORMAL_BPM, scheduleMusicStep, stepSeconds, STEPS_PER_BAR, THEME_CHORDS } from '../audio/music.ts'
import type { MusicChannel, NoiseSpec, ToneSpec, Voices } from '../audio/voices.ts'
import { VoicePool } from '../audio/web-voices.ts'

interface DataVoice { kind: MusicChannel; midi?: number; len?: number }
interface DataTheme {
  id: string; title: string; category: string; description: string; tempoLabel: string
  dangerMode: boolean; usesLevel: boolean; length: number; chords: string[]
  sections?: { name: string; from: number; to: number }[]
  lead: ({ len: number; midi: number } | null)[]; normal: DataVoice[][]; danger: DataVoice[][]
}
interface Position { step: number; loop: number; bpm: number }
interface DataPlayer {
  themes: DataTheme[]; theme: DataTheme | null; playing: boolean
  load(id: string): DataTheme; start(): void; stop(): void
  setDanger(on: boolean): void; setLevel(level: number): void; setVolume(volume: number): void; now(): Position | null
}
declare const BricksMusic: { createPlayer(): DataPlayer }

interface Note { ch: MusicChannel; step: number; len: number; midi?: number }
interface Backend {
  start(): void; stop(): void; setDanger(on: boolean): void; setLevel(level: number): void
  setVolume(volume: number): void; now(): Position | null
}
interface Track {
  id: string; title: string; category: string; description: string; tempoLabel: string
  dangerMode: boolean; usesLevel: boolean; game: boolean; length: number; chords: string[]
  sections: { name: string; from: number; to: number }[]
  notes(danger: boolean): Note[]
  backend: Backend
}

const midiOf = (hz: number) => Math.round(69 + 12 * Math.log2(hz / 440))

/** The game's own theme, played exactly as in the game (same scheduler and voices). */
class GameBackend implements Backend {
  private context: AudioContext | null = null
  private gain: GainNode | null = null
  private pool: VoicePool | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private bar = 0
  private step = 0
  private loop = 0
  private next = 0
  private danger = false
  private dangerRequested = false
  private volume = 0.8
  private queue: (Position & { time: number })[] = []
  private readonly voices: Voices = {
    tone: (spec) => { if (this.gain) this.pool?.tone(spec, this.gain) },
    noise: (spec) => { if (this.gain) this.pool?.noise(spec, this.gain) },
  }

  private init() {
    if (this.context) return
    const context = new AudioContext()
    const compressor = context.createDynamicsCompressor()
    compressor.threshold.value = -12; compressor.knee.value = 12; compressor.ratio.value = 3
    compressor.attack.value = 0.003; compressor.release.value = 0.2
    compressor.connect(context.destination)
    this.gain = context.createGain()
    this.gain.gain.value = this.level()
    this.gain.connect(compressor)
    this.pool = new VoicePool(context)
    this.context = context
  }

  /** Same volume curve as the game's music setting. */
  private level() { return this.volume ** 2 * 0.77 }

  start() {
    this.init()
    const context = this.context!
    void context.resume()
    if (this.timer !== null) return
    this.bar = 0; this.step = 0; this.loop = 0; this.queue = []
    this.danger = this.dangerRequested
    this.next = context.currentTime + 0.06
    this.tick()
  }

  private readonly tick = () => {
    const context = this.context!
    while (this.next < context.currentTime + 0.12) {
      if (this.step % 4 === 0) this.danger = this.dangerRequested
      scheduleMusicStep(this.voices, this.bar, this.step, this.next, this.danger)
      this.queue.push({ step: this.bar * STEPS_PER_BAR + this.step, loop: this.loop, bpm: this.danger ? DANGER_BPM : NORMAL_BPM, time: this.next })
      this.next += stepSeconds(this.danger)
      if (++this.step === STEPS_PER_BAR) {
        this.step = 0
        if (++this.bar === MUSIC_BARS) { this.bar = 0; this.loop++ }
      }
    }
    this.timer = setTimeout(this.tick, 25)
  }

  stop() {
    if (this.timer !== null) clearTimeout(this.timer)
    this.timer = null
    this.queue = []
    if (this.gain) this.pool?.stop(this.gain)
  }

  setDanger(on: boolean) { this.dangerRequested = on }
  setLevel() { /* The game theme does not change with level. */ }
  setVolume(volume: number) {
    this.volume = volume
    if (this.context && this.gain) this.gain.gain.setTargetAtTime(this.level(), this.context.currentTime, 0.02)
  }

  now(): Position | null {
    if (this.timer === null || !this.context) return null
    let current: (Position & { time: number }) | null = null
    while (this.queue.length && this.queue[0].time <= this.context.currentTime) current = this.queue.shift()!
    if (current) this.queue.unshift(current)
    return current
  }
}

function gameNotes(danger: boolean): Note[] {
  const notes: Note[] = []
  const seconds = stepSeconds(danger)
  const add = (spec: ToneSpec | NoiseSpec, wave?: string) => {
    if (!spec.ch || (spec.ch === 'lead' && wave === 'p50')) return
    const step = Math.round(spec.t / seconds)
    const pitched = spec.ch === 'lead' || spec.ch === 'bass' || spec.ch === 'arp'
    notes.push({ ch: spec.ch, step, len: pitched ? Math.max(1, Math.round(spec.dur / seconds / 0.9)) : 1, midi: pitched && 'f' in spec && spec.f ? midiOf(spec.f) : undefined })
  }
  const recorder: Voices = { tone: (spec) => add(spec, spec.wave), noise: (spec) => add(spec) }
  for (let index = 0; index < MUSIC_BARS * STEPS_PER_BAR; index++) {
    scheduleMusicStep(recorder, Math.floor(index / STEPS_PER_BAR), index % STEPS_PER_BAR, index * seconds, danger)
  }
  return notes
}

function gameTrack(): Track {
  const half = THEME_CHORDS.length
  return {
    id: 'bricks', title: 'Bricks Theme', category: 'Spelets musik', game: true,
    description: 'Låten som spelas i spelet idag. 16 takter i a-moll som spelas två varv; andra varvet lägger till arpeggio.',
    tempoLabel: `${NORMAL_BPM} BPM, fara ${DANGER_BPM} BPM`,
    dangerMode: true, usesLevel: false, length: MUSIC_BARS * STEPS_PER_BAR,
    chords: [...THEME_CHORDS, ...THEME_CHORDS],
    sections: [
      { name: 'A', from: 0, to: half / 2 }, { name: 'B', from: half / 2, to: half },
      { name: 'A + arpeggio', from: half, to: half * 1.5 }, { name: 'B + arpeggio', from: half * 1.5, to: half * 2 },
    ],
    notes: gameNotes, backend: new GameBackend(),
  }
}

function dataTrack(player: DataPlayer, theme: DataTheme): Track {
  const backend: Backend = {
    start() { if (player.theme?.id !== theme.id) player.load(theme.id); player.start() },
    stop() { player.stop() },
    setDanger(on) { player.setDanger(on) },
    setLevel(level) { player.setLevel(level) },
    setVolume(volume) { player.setVolume(volume) },
    now() { return player.theme?.id === theme.id ? player.now() : null },
  }
  const previous = theme.id === 'original'
  return {
    id: theme.id,
    title: previous ? 'Tidigare spelmusik' : theme.title,
    category: previous ? 'Ersatt (GPT)' : theme.category,
    description: previous ? 'Slingan som fanns i spelet före den nya musiken. Finns med för jämförelse.' : theme.description,
    tempoLabel: theme.tempoLabel, dangerMode: theme.dangerMode, usesLevel: theme.usesLevel, game: false,
    length: theme.length, chords: theme.chords, sections: theme.sections ?? [],
    notes(danger) {
      const notes: Note[] = []
      theme.lead.forEach((note, step) => { if (note) notes.push({ ch: 'lead', step, len: note.len, midi: note.midi }) })
      for (const [step, voices] of (danger && theme.dangerMode ? theme.danger : theme.normal).entries()) {
        for (const voice of voices) notes.push({ ch: voice.kind, step, len: voice.midi ? Math.max(1, Math.round(voice.len ?? 1)) : 1, midi: voice.midi })
      }
      return notes
    },
    backend,
  }
}

// ---------- state ----------
const proposals = BricksMusic.createPlayer()
const tracks: Track[] = [gameTrack(), ...proposals.themes.filter((theme) => theme.id !== 'original').map((theme) => dataTrack(proposals, theme)), ...proposals.themes.filter((theme) => theme.id === 'original').map((theme) => dataTrack(proposals, theme))]
const byId = (id: string) => tracks.find((track) => track.id === id)!
const RANK_KEY = 'bricks-music-ranking'
let order = tracks.map((track) => track.id)
try {
  const saved: unknown = JSON.parse(localStorage.getItem(RANK_KEY) ?? '[]')
  const known = Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string' && order.includes(id)) : []
  order = [...known, ...order.filter((id) => !known.includes(id))]
} catch { /* Storage unavailable: keep the default order. */ }
const saveOrder = () => { try { localStorage.setItem(RANK_KEY, JSON.stringify(order)) } catch { /* Not persisted. */ } }

let selected = tracks[0]
let playing = false
let danger = false
let level = 0
let volume = 0.8

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const CATEGORY_COLORS = ['#FFB547', '#38D1E8', '#A98BF5', '#4FD98A', '#F2706D', '#5B9CF6', '#F7964A']
const categoryColor = new Map<string, string>()
for (const track of tracks) if (!categoryColor.has(track.category)) categoryColor.set(track.category, CATEGORY_COLORS[categoryColor.size % CATEGORY_COLORS.length])

// ---------- ranking ----------
function renderRanking() {
  const list = $('rank')
  list.replaceChildren()
  order.forEach((id, index) => {
    const track = byId(id)
    const item = document.createElement('li')
    item.className = 'rank-item' + (track === selected ? ' selected' : '')
    const select = document.createElement('button')
    select.type = 'button'
    select.className = 'rank-select'
    select.setAttribute('aria-pressed', String(track === selected))
    select.innerHTML = '<span class="rank-num"></span><span class="rank-text"><strong></strong><span class="chip"></span><small></small></span>'
    select.querySelector('.rank-num')!.textContent = String(index + 1)
    ;(select.querySelector('.rank-num') as HTMLElement).style.background = CATEGORY_COLORS[index % CATEGORY_COLORS.length]
    select.querySelector('strong')!.textContent = track.title + (track === selected && playing ? '  ♪' : '')
    const chip = select.querySelector('.chip') as HTMLElement
    chip.textContent = track.category
    chip.style.setProperty('--chip', categoryColor.get(track.category)!)
    select.querySelector('small')!.textContent = track.tempoLabel
    select.addEventListener('click', () => choose(track))
    const moves = document.createElement('div')
    moves.className = 'rank-moves'
    for (const [label, delta, text] of [['Flytta upp', -1, '▲'], ['Flytta ner', 1, '▼']] as const) {
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = text
      button.setAttribute('aria-label', `${label}: ${track.title}`)
      button.disabled = index + delta < 0 || index + delta >= order.length
      button.addEventListener('click', () => {
        ;[order[index], order[index + delta]] = [order[index + delta], order[index]]
        saveOrder(); renderRanking()
      })
      moves.append(button)
    }
    item.append(select, moves)
    list.append(item)
  })
}

$('copy').addEventListener('click', async () => {
  const text = 'Rangordning av Bricks-musik:\n' + order.map((id, index) => `${index + 1}. ${byId(id).title} (${byId(id).category})`).join('\n')
  const status = $('copied')
  try { await navigator.clipboard.writeText(text); status.textContent = 'Kopierat!' } catch { status.textContent = 'Kunde inte kopiera' }
  setTimeout(() => { status.textContent = '' }, 2000)
})

// ---------- player ----------
function renderNow() {
  $('now-title').textContent = selected.title
  const chip = $('now-chip')
  chip.textContent = selected.category
  chip.style.setProperty('--chip', categoryColor.get(selected.category)!)
  $('now-tempo').textContent = selected.tempoLabel
  $('now-desc').textContent = selected.description
  const play = $('play')
  play.setAttribute('aria-label', playing ? 'Stoppa' : 'Spela')
  play.classList.toggle('playing', playing)
  const dangerButton = $('danger')
  dangerButton.setAttribute('aria-checked', String(danger))
  dangerButton.toggleAttribute('disabled', !selected.dangerMode)
  $('danger-row').classList.toggle('unavailable', !selected.dangerMode)
  $('level-row').hidden = !selected.usesLevel
  $('level-value').textContent = String(level).padStart(2, '0')
  if (!playing) $('bpm').textContent = '–'
}

function choose(track: Track) {
  if (track === selected) return
  const wasPlaying = playing
  if (wasPlaying) selected.backend.stop()
  selected = track
  apply()
  if (wasPlaying) track.backend.start()
  renderRanking(); renderNow(); buildTimeline()
}

function apply() {
  selected.backend.setDanger(danger && selected.dangerMode)
  selected.backend.setLevel(level)
  selected.backend.setVolume(volume)
}

$('play').addEventListener('click', () => {
  playing = !playing
  if (playing) { apply(); selected.backend.start() } else selected.backend.stop()
  renderNow(); renderRanking()
})
$('danger').addEventListener('click', () => {
  if (!selected.dangerMode) return
  danger = !danger
  selected.backend.setDanger(danger)
  renderNow(); buildTimeline()
})
for (const [id, delta] of [['level-down', -1], ['level-up', 1]] as const) {
  $(id).addEventListener('click', () => {
    level = Math.min(19, Math.max(0, level + delta))
    selected.backend.setLevel(level)
    renderNow()
  })
}
$<HTMLInputElement>('volume').addEventListener('input', (event) => {
  volume = Number((event.target as HTMLInputElement).value)
  selected.backend.setVolume(volume)
})

// ---------- timeline ----------
const ROWS: { key: 'section' | 'chord' | MusicChannel; label: string; height: number; color?: string }[] = [
  { key: 'section', label: 'Del', height: 22 },
  { key: 'chord', label: 'Ackord', height: 20 },
  { key: 'lead', label: 'Melodi', height: 70, color: '#FFB547' },
  { key: 'bass', label: 'Bas', height: 44, color: '#38D1E8' },
  { key: 'arp', label: 'Arpeggio', height: 34, color: '#A98BF5' },
  { key: 'kick', label: 'Bastrumma', height: 14, color: '#F7964A' },
  { key: 'snare', label: 'Virvel', height: 14, color: '#F2706D' },
  { key: 'hat', label: 'Hi-hat', height: 14, color: '#4FD98A' },
]
const rowTop = new Map<string, number>()
let totalHeight = 0
for (const row of ROWS) { rowTop.set(row.key, totalHeight); totalHeight += row.height }
const lamps = new Map<string, HTMLElement>()
for (const row of ROWS) {
  const label = document.createElement('div')
  label.style.height = `${row.height}px`
  if (row.color) {
    const lamp = document.createElement('i')
    lamp.style.setProperty('--lamp', row.color)
    label.append(lamp)
    lamps.set(row.key, lamp)
  }
  label.append(row.label)
  $('labels').append(label)
}

const scroller = $('scroll')
const base = $<HTMLCanvasElement>('base')
const overlay = $<HTMLCanvasElement>('overlay')
const ratio = window.devicePixelRatio || 1
let px = 6
let current: Note[] = []

function prepare(canvas: HTMLCanvasElement, width: number) {
  canvas.width = width * ratio
  canvas.height = totalHeight * ratio
  canvas.style.width = `${width}px`
  canvas.style.height = `${totalHeight}px`
  const context = canvas.getContext('2d')!
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  return context
}

function buildTimeline() {
  const track = selected
  current = track.notes(danger && track.dangerMode)
  px = Math.max(5, Math.floor((scroller.clientWidth || 600) / track.length))
  const width = track.length * px
  const g = prepare(base, width)
  prepare(overlay, width)
  // Bars and beats.
  for (let step = 0; step < track.length; step += 4) {
    g.fillStyle = step % 16 === 0 ? '#2C3352' : '#1B2036'
    g.fillRect(step * px, 0, 1, totalHeight)
  }
  // Sections and chords.
  const sectionTop = rowTop.get('section')!
  track.sections.forEach((section, index) => {
    const x = section.from * 16 * px
    const w = (section.to - section.from) * 16 * px
    g.fillStyle = index % 2 ? '#262C47' : '#1F2540'
    g.fillRect(x + 1, sectionTop + 2, w - 2, 18)
    g.fillStyle = '#EEF1FA'
    g.font = "600 11px 'Space Grotesk', system-ui, sans-serif"
    g.fillText(section.name, x + 6, sectionTop + 15, w - 10)
  })
  const chordTop = rowTop.get('chord')!
  track.chords.forEach((chord, bar) => {
    if (bar > 0 && track.chords[bar - 1] === chord) return
    g.fillStyle = '#9AA3C0'
    g.font = "500 10px 'Space Grotesk', system-ui, sans-serif"
    g.fillText(chord, bar * 16 * px + 4, chordTop + 14)
  })
  // Notes.
  const ranges = new Map<string, [number, number]>()
  for (const note of current) {
    if (note.midi === undefined) continue
    const range = ranges.get(note.ch) ?? [note.midi, note.midi]
    ranges.set(note.ch, [Math.min(range[0], note.midi), Math.max(range[1], note.midi)])
  }
  for (const note of current) {
    const row = ROWS.find((candidate) => candidate.key === note.ch)!
    const top = rowTop.get(note.ch)!
    g.fillStyle = row.color!
    if (note.midi !== undefined) {
      const [low, high] = ranges.get(note.ch)!
      const span = Math.max(1, high - low + 2)
      const h = Math.max(3, (row.height - 6) / span)
      const y = top + 3 + (high + 1 - note.midi) / span * (row.height - 6)
      g.fillRect(note.step * px, Math.min(y, top + row.height - 3 - h), Math.max(2, note.len * px - 1), h)
    } else {
      g.fillRect(note.step * px + 1, top + 3, Math.max(2, px - 2), row.height - 6)
    }
  }
}

let lastStep = -1
function frame() {
  const position = playing ? selected.backend.now() : null
  const g = overlay.getContext('2d')!
  if (position && position.step !== lastStep) {
    lastStep = position.step
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.clearRect(0, 0, overlay.width, overlay.height)
    g.setTransform(ratio, 0, 0, ratio, 0, 0)
    const x = position.step * px
    g.fillStyle = 'rgba(255,181,71,0.12)'
    g.fillRect(x, 0, px, totalHeight)
    g.fillStyle = '#FFB547'
    g.fillRect(x, 0, 2, totalHeight)
    const view = scroller.clientWidth
    if (x < scroller.scrollLeft + 20 || x > scroller.scrollLeft + view - 40) scroller.scrollLeft = Math.max(0, x - view * 0.25)
    for (const [key, lamp] of lamps) {
      lamp.classList.toggle('on', current.some((note) => note.ch === key && note.step <= position.step && position.step < note.step + Math.max(1, note.len)))
    }
    $('bpm').textContent = String(Math.round(position.bpm))
    $('beat').classList.toggle('on', position.step % 4 === 0)
  } else if (!position && lastStep !== -1) {
    lastStep = -1
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.clearRect(0, 0, overlay.width, overlay.height)
    for (const lamp of lamps.values()) lamp.classList.remove('on')
    $('beat').classList.remove('on')
  }
  requestAnimationFrame(frame)
}

let resizeTimer: ReturnType<typeof setTimeout> | undefined
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(buildTimeline, 150) })

renderRanking()
renderNow()
buildTimeline()
requestAnimationFrame(frame)
