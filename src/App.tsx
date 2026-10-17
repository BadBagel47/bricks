import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { advanceGame, createGame, dispatch, pieceCells, spawnPiece } from './engine/index.ts'
import type { GameAction, GameEvent, GameState, PieceType } from './engine/index.ts'
import { ACTION_LABELS, actionForCode, INPUT_ACTIONS, isRepeatable, keyLabel, parseBindings, remapKey } from './input/keyboard.ts'
import type { InputAction, KeyboardBindings } from './input/keyboard.ts'
import { colorForPiece } from './ui/level-palettes.ts'
import { addHighscore, DEFAULT_PERSONAL_SETTINGS, DEFAULT_SINGLE_PLAYER_SETTINGS, parseHighscores, parsePersonalSettings, parseSinglePlayerSettings, serializeHighscores } from './persistence.ts'
import type { HighscoreRecord, PersonalSettings, SinglePlayerSettings } from './persistence.ts'
import { BricksAudio } from './audio/synth.ts'
import './App.css'

const USERNAME_KEY = 'bricks.username'
const CONTROLS_KEY = 'bricks.controls.v1'
const PERSONAL_KEY = 'bricks.personal.v1'
const SINGLE_PLAYER_KEY = 'bricks.single-player.v1'
const HIGHSCORES_KEY = 'bricks.highscores.v1'
type View = 'welcome' | 'menu' | 'settings' | 'highScores' | 'game'

function readControls() {
  try { return parseBindings(localStorage.getItem(CONTROLS_KEY)) } catch { return parseBindings(null) }
}

function readStored<T>(key: string, parse: (raw: string | null) => T, fallback: T): T {
  try { return parse(localStorage.getItem(key)) } catch { return fallback }
}

function makeRunId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function readUsername() {
  try { return localStorage.getItem(USERNAME_KEY)?.trim() ?? '' } catch { return '' }
}

function App() {
  const [username, setUsername] = useState(readUsername)
  const [draft, setDraft] = useState(username)
  const [view, setView] = useState<View>(username ? 'menu' : 'welcome')
  const [notice, setNotice] = useState('')
  const [bindings, setBindings] = useState<KeyboardBindings>(readControls)
  const [capture, setCapture] = useState<InputAction | null>(null)
  const [captureError, setCaptureError] = useState('')
  const [personal, setPersonal] = useState<PersonalSettings>(() => readStored(PERSONAL_KEY, parsePersonalSettings, DEFAULT_PERSONAL_SETTINGS))
  const [singlePlayer, setSinglePlayer] = useState<SinglePlayerSettings>(() => readStored(SINGLE_PLAYER_KEY, parseSinglePlayerSettings, DEFAULT_SINGLE_PLAYER_SETTINGS))
  const [highscores, setHighscores] = useState<HighscoreRecord[]>(() => readStored(HIGHSCORES_KEY, parseHighscores, []))
  const [resultRank, setResultRank] = useState<number | null>(null)
  const [isNewRecord, setIsNewRecord] = useState(false)
  const [game, setGame] = useState<GameState>(() => createGame())
  const gameRef = useRef(game)
  const bindingsRef = useRef(bindings)
  const highscoresRef = useRef(highscores)
  const usernameRef = useRef(username)
  const runIdRef = useRef('')
  const audioRef = useRef<BricksAudio | null>(null)

  function saveUsername(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanName = draft.trim()
    if (cleanName.length < 2 || cleanName.length > 16) return
    let saveFailed = false
    try { localStorage.setItem(USERNAME_KEY, cleanName) } catch { saveFailed = true }
    setUsername(cleanName)
    usernameRef.current = cleanName
    setView('menu')
    setNotice(saveFailed ? 'Your browser could not save this name. You can still continue.' : '')
  }

  function beginGame() {
    const fresh = createGame({ startLevel: singlePlayer.startLevel, hardDropEnabled: personal.hardDropEnabled, holdEnabled: singlePlayer.holdEnabled })
    const audio = audioRef.current ?? new BricksAudio(personal)
    audioRef.current = audio
    audio.beginGame(personal)
    audio.setDanger(fresh.board)
    runIdRef.current = makeRunId()
    setResultRank(null)
    setIsNewRecord(false)
    gameRef.current = fresh
    setGame(fresh)
    setView('game')
    setNotice('')
  }

  function commitGame(next: GameState, events: readonly GameEvent[] = []) {
    const previous = gameRef.current
    if (next === previous) return
    gameRef.current = next
    setGame(next)
    audioRef.current?.handleEvents(events)
    if (events.some((event) => event.type === 'locked' || event.type === 'linesCleared')) audioRef.current?.setDanger(next.board)
    if (previous.status !== 'gameOver' && next.status === 'gameOver') {
      const result = addHighscore(highscoresRef.current, {
        id: runIdRef.current,
        username: usernameRef.current || 'Player',
        score: next.score,
        level: next.level,
        lines: next.lines,
        achievedAt: new Date().toISOString(),
      })
      highscoresRef.current = [...result.records]
      setHighscores([...result.records])
      setResultRank(result.rank)
      setIsNewRecord(result.isNewRecord)
      try { localStorage.setItem(HIGHSCORES_KEY, serializeHighscores(result.records)) }
      catch { setNotice('Your browser could not save this score.') }
    }
  }

  function apply(action: GameAction) {
    const transition = dispatch(gameRef.current, action)
    commitGame(transition.state, transition.events)
  }

  function savePersonal(next: PersonalSettings) {
    setPersonal(next)
    audioRef.current?.updateSettings(next)
    try { localStorage.setItem(PERSONAL_KEY, JSON.stringify(next)) }
    catch { setNotice('Your browser could not save this setting.') }
  }

  function saveSinglePlayer(next: SinglePlayerSettings) {
    setSinglePlayer(next)
    try { localStorage.setItem(SINGLE_PLAYER_KEY, JSON.stringify(next)) }
    catch { setNotice('Your browser could not save this setting.') }
  }

  useEffect(() => {
    if (view !== 'game') return
    let frame = 0
    let previous = 0
    const held = new Map<string, { action: InputAction; since: number; last: number }>()
    const stopRepeats = () => held.clear()
    const onKeyDown = (event: KeyboardEvent) => {
      const action = event.code === 'Escape' ? 'pause' : actionForCode(bindingsRef.current, event.code)
      if (!action) return
      event.preventDefault()
      if (event.repeat) return
      if (action === 'pause') {
        if (gameRef.current.status === 'paused') apply('resume')
        else if (gameRef.current.status === 'playing') apply('pause')
        stopRepeats()
        return
      }
      if (gameRef.current.status !== 'playing') return
      apply(action as GameAction)
      if (isRepeatable(action)) held.set(event.code, { action, since: performance.now(), last: 0 })
    }
    const onKeyUp = (event: KeyboardEvent) => held.delete(event.code)
    const onVisibility = () => {
      previous = 0
      if (document.hidden && gameRef.current.status === 'playing') apply('pause')
      stopRepeats()
    }
    const tick = (now: number) => {
      if (previous && gameRef.current.status === 'playing') {
        const transition = advanceGame(gameRef.current, Math.min(now - previous, 100))
        if (transition.events.length) commitGame(transition.state, transition.events)
        else gameRef.current = transition.state
        for (const repeat of held.values()) {
          const elapsed = now - repeat.since
          const interval = repeat.action === 'softDrop' ? 65 : 48
          if (elapsed >= 160 && now - repeat.last >= interval) {
            repeat.last = now
            apply(repeat.action as GameAction)
          }
        }
      }
      previous = now
      frame = requestAnimationFrame(tick)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    document.addEventListener('visibilitychange', onVisibility)
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [view])

  useEffect(() => {
    if (!capture) return
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault()
      try {
        const next = remapKey(bindingsRef.current, capture, event.code)
        setBindings(next)
        bindingsRef.current = next
        localStorage.setItem(CONTROLS_KEY, JSON.stringify(next))
        setCapture(null)
        setCaptureError('')
      } catch (error) {
        setCaptureError(error instanceof Error ? error.message : 'This key cannot be assigned.')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [capture])

  if (view === 'welcome') return <main className="shell welcome-shell">
    <Brand />
    <section className="welcome-card" aria-labelledby="welcome-title">
      <h1 id="welcome-title">Enter your name</h1>
      <form className="name-form" onSubmit={saveUsername}>
        <label htmlFor="username">Player name</label>
        <input autoComplete="nickname" autoFocus id="username" maxLength={16} minLength={2} onChange={(event) => setDraft(event.target.value)} required value={draft} />
        <span className="field-hint">2–16 characters</span>
        {notice && <p className="notice" role="status">{notice}</p>}
        <button className="button button-primary" type="submit">Continue</button>
      </form>
    </section>
  </main>

  if (view === 'settings') return <main className="shell">
    <header className="topbar"><Brand compact /><button className="back-button" onClick={() => setView('menu')}>← Back to menu</button></header>
    <section className="settings-card">
      <h1>Personal settings</h1>
      <form className="name-form" onSubmit={saveUsername}>
        <label htmlFor="username">Player name</label>
        <input id="username" maxLength={16} minLength={2} onChange={(event) => setDraft(event.target.value)} required value={draft} />
        <span className="field-hint">2–16 characters</span>
        <button className="button button-primary" type="submit">Save name</button>
      </form>
      <label className="toggle-row"><span>Hard Drop</span><input checked={personal.hardDropEnabled} onChange={(event) => savePersonal({ ...personal, hardDropEnabled: event.target.checked })} type="checkbox" /></label>
      <label className="toggle-row"><span>Music</span><input checked={personal.musicEnabled} onChange={(event) => savePersonal({ ...personal, musicEnabled: event.target.checked })} type="checkbox" /></label>
      <label className="audio-volume"><span>Music volume</span><input aria-label="Music volume" max="100" min="0" onChange={(event) => savePersonal({ ...personal, musicVolume: Number(event.target.value) })} type="range" value={personal.musicVolume} /><output>{personal.musicVolume}%</output></label>
      <label className="toggle-row"><span>Sound effects</span><input checked={personal.effectsEnabled} onChange={(event) => savePersonal({ ...personal, effectsEnabled: event.target.checked })} type="checkbox" /></label>
      <label className="audio-volume"><span>Effects volume</span><input aria-label="Effects volume" max="100" min="0" onChange={(event) => savePersonal({ ...personal, effectsVolume: Number(event.target.value) })} type="range" value={personal.effectsVolume} /><output>{personal.effectsVolume}%</output></label>
      <h2 className="settings-heading">Keyboard</h2>
      <div className="binding-list">{INPUT_ACTIONS.map((action) => <div className="binding-row" key={action}>
        <span>{ACTION_LABELS[action]}</span>
        <button className="key-button" onClick={() => { setCapture(action); setCaptureError('') }}>{capture === action ? 'Press a key…' : keyLabel(bindings[action])}</button>
      </div>)}</div>
      {captureError && <p className="notice" role="status">{captureError}</p>}
      {capture && <button className="back-button cancel-capture" onClick={() => { setCapture(null); setCaptureError('') }}>Cancel</button>}
      <h2 className="settings-heading">1 Player Settings</h2>
      <label className="setting-select-row" htmlFor="start-level"><span>Starting Level</span><select id="start-level" onChange={(event) => saveSinglePlayer({ ...singlePlayer, startLevel: Number(event.target.value) })} value={singlePlayer.startLevel}>{Array.from({ length: 20 }, (_, level) => <option key={level} value={level}>Level {String(level).padStart(2, '0')}</option>)}</select></label>
      <label className="toggle-row"><span>Hold Piece</span><input checked={singlePlayer.holdEnabled} onChange={(event) => saveSinglePlayer({ ...singlePlayer, holdEnabled: event.target.checked })} type="checkbox" /></label>
      {notice && <p className="notice" role="status">{notice}</p>}
    </section>
  </main>

  if (view === 'highScores') return <main className="shell">
    <header className="topbar"><Brand compact /><button className="back-button" onClick={() => setView('menu')}>← Back to menu</button></header>
    <section className="settings-card score-list-page">
      <h1>High Scores</h1>
      {highscores.length === 0 ? <p className="empty-scores">No scores yet.</p> : <HighscoreTable records={highscores} />}
    </section>
  </main>

  if (view === 'game') return <main className="shell game-shell">
    <header className="topbar game-topbar"><Brand compact /><button className="back-button" onClick={() => { audioRef.current?.leaveGame(); setView('menu'); setNotice('') }}>← Main menu</button></header>
    <section className="game-layout" aria-label="Single-player game">
      <aside className="game-side game-stats">
        <div><span>Score</span><strong>{game.score.toLocaleString()}</strong></div>
        <div><span>Level</span><strong>{game.level}</strong></div>
        <div><span>Lines</span><strong>{game.lines}</strong></div>
      </aside>
      <Playfield game={game} />
      <aside className="game-side next-panel"><span>Next</span><PiecePreview type={game.next} level={game.level} />{game.holdEnabled && <><span>Hold</span>{game.held ? <PiecePreview type={game.held} level={game.level} /> : <span className="empty-hold">—</span>}</>}</aside>
    </section>
    <p className="control-hint" aria-label="Keyboard controls">{keyLabel(bindings.moveLeft)} {keyLabel(bindings.moveRight)} Move · {keyLabel(bindings.softDrop)} Soft drop · {keyLabel(bindings.rotateCounterclockwise)} {keyLabel(bindings.rotateClockwise)} Rotate · {personal.hardDropEnabled ? `${keyLabel(bindings.hardDrop)} Hard drop` : 'Hard Drop off'}{game.holdEnabled ? ` · ${keyLabel(bindings.hold)} Hold` : ''} · {keyLabel(bindings.pause)} / Esc Pause</p>
    {game.status === 'paused' && <div className="game-overlay"><section className="overlay-card" aria-labelledby="overlay-title"><h1 id="overlay-title">Paused</h1><button className="button button-primary" onClick={() => apply('resume')}>Resume</button><button className="overlay-link" onClick={() => { audioRef.current?.leaveGame(); setView('menu') }}>Main menu</button></section></div>}
    {game.status === 'gameOver' && <div className="game-overlay"><section className="overlay-card result-card" aria-labelledby="overlay-title"><h1 id="overlay-title">Game over</h1>{isNewRecord && <p className="record-badge">New record</p>}{notice && <p className="notice" role="status">{notice}</p>}<div className="result-stats"><div><span>Final score</span><strong>{game.score.toLocaleString()}</strong></div><div><span>Level</span><strong>{game.level}</strong></div><div><span>Lines</span><strong>{game.lines}</strong></div><div><span>Highscore</span><strong>{resultRank ? `#${resultRank}` : '—'}</strong></div></div><HighscoreTable records={highscores} compact /><button className="button button-primary" onClick={beginGame}>Play Again</button><button className="overlay-link" onClick={() => setView('menu')}>Main Menu</button></section></div>}
  </main>

  return <main className="shell menu-shell">
    <header className="topbar"><Brand compact /><button aria-label="Open personal settings" className="settings-button" onClick={() => { setDraft(username); setView('settings') }}>⚙<span>Settings</span></button></header>
    <section className="menu-content">
      <div className="hero-copy"><h1>Make room<br />for <span>one more.</span></h1></div>
      <div className="menu-actions" aria-label="Main menu">
        <button className="mode-card single-player" onClick={beginGame}><span className="mode-copy"><strong>1 Player</strong></span></button>
        <div className="mode-card disabled-card" aria-disabled="true"><span className="mode-copy"><strong>2 Players</strong></span><span className="coming-soon">Coming soon</span></div>
        <button className="secondary-card" onClick={() => setView('highScores')}>High Scores</button>
        {notice && <p className="notice menu-notice" role="status">{notice}</p>}
      </div>
    </section>
  </main>
}

function Playfield({ game }: { game: GameState }) {
  const cells: (PieceType | null)[] = game.board.flatMap((row) => [...row])
  if (game.active) for (const [x, y] of pieceCells(game.active)) cells[y * 10 + x] = game.active.type
  return <div className="playfield" role="grid" aria-label="Game board">
    {cells.map((type, index) => <div className={`board-cell${type ? ' filled' : ''}`} key={index} role="gridcell" style={type ? { '--cell-color': colorForPiece(type, game.level) } as CSSProperties : undefined} />)}
  </div>
}

function PiecePreview({ type, level }: { type: PieceType; level: number }) {
  const cells = new Set(pieceCells(spawnPiece(type)).map(([x, y]) => `${x},${y}`))
  return <div className="piece-preview" aria-label={`${type} piece`}>
    {Array.from({ length: 16 }, (_, index) => {
      const x = index % 4
      const y = Math.floor(index / 4)
      const filled = cells.has(`${x},${y}`)
      return <span className={filled ? 'filled' : ''} key={index} style={filled ? { '--cell-color': colorForPiece(type, level) } as CSSProperties : undefined} />
    })}
  </div>
}

function HighscoreTable({ records, compact = false }: { records: readonly HighscoreRecord[]; compact?: boolean }) {
  return <div className={`score-table-wrap${compact ? ' score-table-compact' : ''}`}>
    <table className="score-table"><thead><tr><th>#</th><th>Player</th><th>Score</th><th>Level</th><th>Lines</th></tr></thead>
      <tbody>{records.map((record, index) => <tr key={record.id}><td>{index + 1}</td><td>{record.username}</td><td>{record.score.toLocaleString()}</td><td>{record.level}</td><td>{record.lines}</td></tr>)}</tbody>
    </table>
  </div>
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <a aria-label="Bricks home" className={`brand${compact ? ' brand-compact' : ''}`} href="#home" onClick={(event) => event.preventDefault()}>
    <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span><span>BRICKS<span className="brand-period">.</span></span>
  </a>
}

export default App
