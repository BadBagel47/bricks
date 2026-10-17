import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { advanceGame, createGame, dispatch, pieceCells, spawnPiece } from './engine/index.ts'
import type { GameAction, GameState, PieceType } from './engine/index.ts'
import { ACTION_LABELS, actionForCode, INPUT_ACTIONS, isRepeatable, keyLabel, parseBindings, remapKey } from './input/keyboard.ts'
import type { InputAction, KeyboardBindings } from './input/keyboard.ts'
import { colorForPiece } from './ui/level-palettes.ts'
import './App.css'

const USERNAME_KEY = 'bricks.username'
const CONTROLS_KEY = 'bricks.controls.v1'
type View = 'welcome' | 'menu' | 'settings' | 'game'

function readControls() {
  try { return parseBindings(localStorage.getItem(CONTROLS_KEY)) } catch { return parseBindings(null) }
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
  const [game, setGame] = useState<GameState>(() => createGame())
  const gameRef = useRef(game)
  const bindingsRef = useRef(bindings)

  function saveUsername(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanName = draft.trim()
    if (cleanName.length < 2 || cleanName.length > 16) return
    let saveFailed = false
    try { localStorage.setItem(USERNAME_KEY, cleanName) } catch { saveFailed = true }
    setUsername(cleanName)
    setView('menu')
    setNotice(saveFailed ? 'Your browser could not save this name. You can still continue.' : '')
  }

  function beginGame() {
    const fresh = createGame({ hardDropEnabled: true, holdEnabled: false })
    gameRef.current = fresh
    setGame(fresh)
    setView('game')
    setNotice('')
  }

  function apply(action: GameAction) {
    const transition = dispatch(gameRef.current, action)
    if (transition.state === gameRef.current) return
    gameRef.current = transition.state
    setGame(transition.state)
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
        gameRef.current = transition.state
        if (transition.events.length) setGame(transition.state)
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
      <h2 className="settings-heading">Keyboard</h2>
      <div className="binding-list">{INPUT_ACTIONS.map((action) => <div className="binding-row" key={action}>
        <span>{ACTION_LABELS[action]}</span>
        <button className="key-button" onClick={() => { setCapture(action); setCaptureError('') }}>{capture === action ? 'Press a key…' : keyLabel(bindings[action])}</button>
      </div>)}</div>
      {captureError && <p className="notice" role="status">{captureError}</p>}
      {capture && <button className="back-button cancel-capture" onClick={() => { setCapture(null); setCaptureError('') }}>Cancel</button>}
    </section>
  </main>

  if (view === 'game') return <main className="shell game-shell">
    <header className="topbar game-topbar"><Brand compact /><button className="back-button" onClick={() => { setView('menu'); setNotice('') }}>← Main menu</button></header>
    <section className="game-layout" aria-label="Single-player game">
      <aside className="game-side game-stats">
        <div><span>Score</span><strong>{game.score.toLocaleString()}</strong></div>
        <div><span>Level</span><strong>{game.level}</strong></div>
        <div><span>Lines</span><strong>{game.lines}</strong></div>
      </aside>
      <Playfield game={game} />
      <aside className="game-side next-panel"><span>Next</span><PiecePreview type={game.next} level={game.level} /></aside>
    </section>
    <p className="control-hint" aria-label="Keyboard controls">{keyLabel(bindings.moveLeft)} {keyLabel(bindings.moveRight)} Move · {keyLabel(bindings.softDrop)} Soft drop · {keyLabel(bindings.rotateCounterclockwise)} {keyLabel(bindings.rotateClockwise)} Rotate · {keyLabel(bindings.hardDrop)} Hard drop · {keyLabel(bindings.pause)} / Esc Pause</p>
    {game.status === 'paused' && <div className="game-overlay"><section className="overlay-card" aria-labelledby="overlay-title"><h1 id="overlay-title">Paused</h1><button className="button button-primary" onClick={() => apply('resume')}>Resume</button><button className="overlay-link" onClick={() => setView('menu')}>Main menu</button></section></div>}
    {game.status === 'gameOver' && <div className="game-overlay"><section className="overlay-card" aria-labelledby="overlay-title"><h1 id="overlay-title">Game over</h1><p>Score: {game.score.toLocaleString()}</p><button className="button button-primary" onClick={beginGame}>Play again</button><button className="overlay-link" onClick={() => setView('menu')}>Main menu</button></section></div>}
  </main>

  return <main className="shell menu-shell">
    <header className="topbar"><Brand compact /><button aria-label="Open personal settings" className="settings-button" onClick={() => { setDraft(username); setView('settings') }}>⚙<span>Settings</span></button></header>
    <section className="menu-content">
      <div className="hero-copy"><h1>Make room<br />for <span>one more.</span></h1></div>
      <div className="menu-actions" aria-label="Main menu">
        <button className="mode-card single-player" onClick={beginGame}><span className="mode-copy"><strong>1 Player</strong></span></button>
        <div className="mode-card disabled-card" aria-disabled="true"><span className="mode-copy"><strong>2 Players</strong></span><span className="coming-soon">Coming soon</span></div>
        <button className="secondary-card" onClick={() => setNotice('High scores are not available yet.')}>High Scores</button>
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

function Brand({ compact = false }: { compact?: boolean }) {
  return <a aria-label="Bricks home" className={`brand${compact ? ' brand-compact' : ''}`} href="#home" onClick={(event) => event.preventDefault()}>
    <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span><span>BRICKS<span className="brand-period">.</span></span>
  </a>
}

export default App
