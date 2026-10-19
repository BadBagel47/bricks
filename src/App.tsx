import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, FormEvent, PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { advanceGame, createGame, dispatch, pieceCells } from './engine/index.ts'
import type { GameAction, GameEvent, GameState, PieceType } from './engine/index.ts'
import { ACTION_LABELS, actionForCode, DEFAULT_BINDINGS, INPUT_ACTIONS, isRepeatable, keyLabel, parseBindings, remapKey } from './input/keyboard.ts'
import type { InputAction, KeyboardBindings } from './input/keyboard.ts'
import { DEFAULT_GAMEPAD_BINDINGS, gamepadActions, gamepadButtonLabel, parseGamepadBindings, remapGamepadButton } from './input/gamepad.ts'
import type { GamepadBindings } from './input/gamepad.ts'
import { HeldInputs } from './input/repeat.ts'
import { actionsForSwipe } from './input/swipe.ts'
import { colorForPiece } from './ui/level-palettes.ts'
import { previewCells } from './ui/piece-preview.ts'
import { addHighscore, DEFAULT_PERSONAL_SETTINGS, DEFAULT_SINGLE_PLAYER_SETTINGS, parseHighscores, parsePersonalSettings, parseSinglePlayerSettings, serializeHighscores } from './persistence.ts'
import type { HighscoreRecord, PersonalSettings, SinglePlayerSettings } from './persistence.ts'
import { BricksAudio } from './audio/synth.ts'
import './App.css'

const USERNAME_KEY = 'bricks.username'
const CONTROLS_KEY = 'bricks.controls.v1'
const GAMEPAD_CONTROLS_KEY = 'bricks.gamepad-controls.v1'
const PERSONAL_KEY = 'bricks.personal.v1'
const SINGLE_PLAYER_KEY = 'bricks.single-player.v1'
const HIGHSCORES_KEY = 'bricks.highscores.v1'
type View = 'welcome' | 'menu' | 'settings' | 'highScores' | 'game'

function readControls() {
  try { return parseBindings(localStorage.getItem(CONTROLS_KEY)) } catch { return parseBindings(null) }
}

function readGamepadControls() {
  try { return parseGamepadBindings(localStorage.getItem(GAMEPAD_CONTROLS_KEY)) } catch { return parseGamepadBindings(null) }
}

function readStored<T>(key: string, parse: (raw: string | null) => T, fallback: T): T {
  try { return parse(localStorage.getItem(key)) } catch { return fallback }
}

function connectedGamepads(): Gamepad[] {
  try {
    return Array.from(navigator.getGamepads?.() ?? []).filter((pad): pad is Gamepad => Boolean(pad?.connected))
  } catch {
    // Some browsers or embedding policies disable the API; keyboard and touch stay usable.
    return []
  }
}

function makeRunId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function readUsername() {
  try {
    const name = localStorage.getItem(USERNAME_KEY)?.trim() ?? ''
    return name.length >= 2 && name.length <= 16 ? name : ''
  } catch { return '' }
}

function App() {
  const [username, setUsername] = useState(readUsername)
  const [draft, setDraft] = useState(username)
  const [view, setView] = useState<View>(username ? 'menu' : 'welcome')
  const [notice, setNotice] = useState('')
  const [gameAnnouncement, setGameAnnouncement] = useState('')
  const [bindings, setBindings] = useState<KeyboardBindings>(readControls)
  const [capture, setCapture] = useState<InputAction | null>(null)
  const [captureError, setCaptureError] = useState('')
  const [gamepadBindings, setGamepadBindings] = useState<GamepadBindings>(readGamepadControls)
  const [gamepadCapture, setGamepadCapture] = useState<InputAction | null>(null)
  const [gamepadCaptureError, setGamepadCaptureError] = useState('')
  const [controllerStatus, setControllerStatus] = useState('No controller detected')
  const [personal, setPersonal] = useState<PersonalSettings>(() => readStored(PERSONAL_KEY, parsePersonalSettings, DEFAULT_PERSONAL_SETTINGS))
  const [singlePlayer, setSinglePlayer] = useState<SinglePlayerSettings>(() => readStored(SINGLE_PLAYER_KEY, parseSinglePlayerSettings, DEFAULT_SINGLE_PLAYER_SETTINGS))
  const [highscores, setHighscores] = useState<HighscoreRecord[]>(() => readStored(HIGHSCORES_KEY, parseHighscores, []))
  const [resultRank, setResultRank] = useState<number | null>(null)
  const [isNewRecord, setIsNewRecord] = useState(false)
  const [game, setGame] = useState<GameState>(() => createGame())
  const [gameSession, setGameSession] = useState(0)
  const previousViewRef = useRef(view)
  const gameRef = useRef(game)
  const bindingsRef = useRef(bindings)
  const gamepadBindingsRef = useRef(gamepadBindings)
  const controllerStatusRef = useRef(controllerStatus)
  const highscoresRef = useRef(highscores)
  const usernameRef = useRef(username)
  const runIdRef = useRef('')
  const audioRef = useRef<BricksAudio | null>(null)

  useLayoutEffect(() => {
    const viewChanged = previousViewRef.current !== view
    previousViewRef.current = view
    if (view !== 'game' && viewChanged) {
      document.querySelector<HTMLElement>('.shell h1')?.focus()
    }
  }, [view])

  useLayoutEffect(() => {
    if (view !== 'game') return
    const dialog = document.querySelector<HTMLElement>('.game-overlay [role="dialog"]')
    if (dialog && !dialog.contains(document.activeElement)) focusableControls(dialog)[0]?.focus()

    function containTab(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Tab') return
      const scope = document.querySelector<HTMLElement>('.game-overlay [role="dialog"]')
        ?? document.querySelector<HTMLElement>('main.game-shell')
      if (!scope) return
      const focusable = focusableControls(scope)
      if (!focusable.length) {
        if (scope.matches('main.game-shell')) event.preventDefault()
        return
      }
      // Cancel native navigation before it can move focus into browser chrome and trigger blur/pause.
      event.preventDefault()
      const activeIndex = focusable.indexOf(document.activeElement as HTMLElement)
      const nextIndex = activeIndex === -1
        ? (event.shiftKey ? focusable.length - 1 : 0)
        : (activeIndex + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length
      focusable[nextIndex].focus()
    }

    document.addEventListener('keydown', containTab, true)
    return () => document.removeEventListener('keydown', containTab, true)
  }, [game.status, view])

  function saveUsername(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanName = draft.trim()
    if (cleanName.length < 2 || cleanName.length > 16) return
    let saveFailed = false
    try { localStorage.setItem(USERNAME_KEY, cleanName) } catch { saveFailed = true }
    setCapture(null)
    setGamepadCapture(null)
    setUsername(cleanName)
    usernameRef.current = cleanName
    setView('menu')
    setNotice(saveFailed ? 'Your browser could not save this name. You can still continue.' : '')
  }

  function beginGame() {
    setGameAnnouncement('')
    const fresh = createGame({ startLevel: singlePlayer.startLevel, hardDropEnabled: personal.hardDropEnabled, holdEnabled: singlePlayer.holdEnabled })
    const audio = audioRef.current ?? new BricksAudio(personal)
    audioRef.current = audio
    audio.beginGame(personal)
    audio.setDanger(fresh.board)
    runIdRef.current = makeRunId()
    setGameSession((session) => session + 1)
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
    const announcements = events.flatMap((event) => {
      if (event.type === 'linesCleared') return [`${event.count} ${event.count === 1 ? 'line' : 'lines'} cleared.`]
      if (event.type === 'levelChanged') return [`Level ${event.to}.`]
      if (event.type === 'paused') return ['Game paused.']
      if (event.type === 'resumed') return ['Game resumed.']
      if (event.type === 'gameOver') return [`Game over. Final score ${next.score.toLocaleString()}.`]
      return []
    })
    if (announcements.length) setGameAnnouncement(announcements.join(' '))
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

  function resetKeyboardBindings() {
    setCapture(null)
    setCaptureError('')
    const defaults = { ...DEFAULT_BINDINGS }
    setBindings(defaults)
    bindingsRef.current = defaults
    try { localStorage.setItem(CONTROLS_KEY, JSON.stringify(defaults)) }
    catch { setNotice('Your browser could not save this setting.') }
  }

  function resetGamepadBindings() {
    setGamepadCapture(null)
    setGamepadCaptureError('')
    const defaults = { ...DEFAULT_GAMEPAD_BINDINGS }
    setGamepadBindings(defaults)
    gamepadBindingsRef.current = defaults
    try { localStorage.setItem(GAMEPAD_CONTROLS_KEY, JSON.stringify(defaults)) }
    catch { setNotice('Your browser could not save this setting.') }
  }

  function updateControllerStatus(status: string) {
    if (controllerStatusRef.current === status) return
    controllerStatusRef.current = status
    setControllerStatus(status)
  }

  useEffect(() => {
    const check = () => {
      const pad = connectedGamepads()[0]
      updateControllerStatus(pad ? `Gamepad connected${pad.mapping ? ` · ${pad.mapping}` : ''}` : 'No controller detected')
    }
    const timer = window.setInterval(check, 600)
    window.addEventListener('gamepadconnected', check)
    window.addEventListener('gamepaddisconnected', check)
    check()
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('gamepadconnected', check)
      window.removeEventListener('gamepaddisconnected', check)
    }
  }, [])

  useEffect(() => {
    if (view !== 'settings' || !gamepadCapture) return
    let frame = 0
    const pressedBefore = new Set<string>()
    const poll = () => {
      const pads = connectedGamepads()
      let captured: number | null = null
      const pressedNow = new Set<string>()
      for (const pad of pads) {
        for (let index = 0; index < pad.buttons.length; index++) {
          const button = pad.buttons[index]
          if (!button.pressed && button.value < 0.55) continue
          const key = `${pad.index}:${index}`
          pressedNow.add(key)
          if (captured === null && !pressedBefore.has(key)) captured = index
        }
      }
      pressedBefore.clear()
      for (const key of pressedNow) pressedBefore.add(key)
      if (captured !== null) {
        try {
          const next = remapGamepadButton(gamepadBindingsRef.current, gamepadCapture, captured)
          setGamepadBindings(next)
          gamepadBindingsRef.current = next
          localStorage.setItem(GAMEPAD_CONTROLS_KEY, JSON.stringify(next))
          setGamepadCapture(null)
          setGamepadCaptureError('')
        } catch (error) {
          setGamepadCaptureError(error instanceof Error ? error.message : 'This controller button cannot be assigned.')
        }
      }
      frame = requestAnimationFrame(poll)
    }
    frame = requestAnimationFrame(poll)
    return () => cancelAnimationFrame(frame)
  }, [gamepadCapture, view])

  useEffect(() => {
    if (view !== 'game') return
    let frame = 0
    let previous = 0
    const held = new HeldInputs()
    let previousPadActions = new Set<InputAction>()
    let previousPadIndex: number | null = null
    const stopRepeats = () => held.clear()
    const onKeyDown = (event: KeyboardEvent) => {
      const action = event.code === 'Escape' ? 'pause' : actionForCode(bindingsRef.current, event.code)
      if (!action) return
      if (action !== 'pause' && gameRef.current.status !== 'playing') return
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
      if (isRepeatable(action)) held.press(event.code, action, performance.now())
    }
    const onKeyUp = (event: KeyboardEvent) => held.release(event.code)
    const onVisibility = () => {
      previous = 0
      if (document.hidden && gameRef.current.status === 'playing') apply('pause')
      stopRepeats()
    }
    const onBlur = () => {
      previous = 0
      stopRepeats()
      if (gameRef.current.status === 'playing') apply('pause')
    }
    const pollGamepad = (now: number) => {
      const pad = connectedGamepads()[0]
      updateControllerStatus(pad ? `Gamepad connected${pad.mapping ? ` · ${pad.mapping}` : ''}` : 'No controller detected')
      const actions = pad ? gamepadActions(pad, gamepadBindingsRef.current) : new Set<InputAction>()
      if (pad?.index !== previousPadIndex) {
        held.clearSource('pad:')
        previousPadActions = new Set()
        previousPadIndex = pad?.index ?? null
      }
      for (const action of previousPadActions) if (!actions.has(action)) held.release(`pad:${action}`)
      for (const action of actions) {
        const wasDown = previousPadActions.has(action)
        if (action === 'pause') {
          if (!wasDown) {
            if (gameRef.current.status === 'paused') apply('resume')
            else if (gameRef.current.status === 'playing') apply('pause')
            stopRepeats()
          }
        } else if (gameRef.current.status === 'playing') {
          if (!wasDown) {
            apply(action)
            if (isRepeatable(action)) held.press(`pad:${action}`, action, now)
          }
        }
      }
      previousPadActions = actions
    }
    const tick = (now: number) => {
      pollGamepad(now)
      if (previous && gameRef.current.status === 'playing') {
        const transition = advanceGame(gameRef.current, now - previous)
        if (transition.events.length) commitGame(transition.state, transition.events)
        else gameRef.current = transition.state
        for (const action of held.due(now)) apply(action)
      }
      previous = now
      frame = requestAnimationFrame(tick)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    document.addEventListener('visibilitychange', onVisibility)
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [view, gameSession])

  useEffect(() => {
    if (view !== 'settings' || !capture) return
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
  }, [capture, view])

  if (view === 'welcome') return <main className="shell welcome-shell">
    <Brand />
    <section className="welcome-card" aria-labelledby="welcome-title">
      <h1 id="welcome-title" tabIndex={-1}>Enter your name</h1>
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
    <header className="topbar"><Brand compact /><button className="back-button" onClick={() => { setCapture(null); setGamepadCapture(null); setView('menu') }}>← Back to menu</button></header>
    <section className="settings-card">
      <h1 tabIndex={-1}>Personal settings</h1>
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
      <button className="reset-button" onClick={resetKeyboardBindings}>Reset keyboard controls</button>
      {captureError && <p className="notice" role="status">{captureError}</p>}
      {capture && <button className="back-button cancel-capture" onClick={() => { setCapture(null); setCaptureError('') }}>Cancel</button>}
      <h2 className="settings-heading">Controller</h2>
      <p className="controller-status">{controllerStatus}</p>
      <div className="binding-list">{INPUT_ACTIONS.map((action) => <div className="binding-row" key={action}>
        <span>{ACTION_LABELS[action]}</span>
        <button className="key-button" onClick={() => { setGamepadCapture(action); setGamepadCaptureError('') }}>{gamepadCapture === action ? 'Press a button…' : gamepadButtonLabel(gamepadBindings[action])}</button>
      </div>)}</div>
      {gamepadCaptureError && <p className="notice" role="status">{gamepadCaptureError}</p>}
      {gamepadCapture && <button className="back-button cancel-capture" onClick={() => { setGamepadCapture(null); setGamepadCaptureError('') }}>Cancel</button>}
      <button className="reset-button" onClick={resetGamepadBindings}>Reset controller controls</button>
      <h2 className="settings-heading">Mobile controls</h2>
      <label className="setting-select-row" htmlFor="mobile-controls"><span>Control method</span><select aria-label="Control method" id="mobile-controls" onChange={(event) => savePersonal({ ...personal, mobileControlMethod: event.target.value as PersonalSettings['mobileControlMethod'] })} value={personal.mobileControlMethod}><option value="dpad">D-Pad</option><option value="swipe">Swipe</option></select></label>
      <label className="audio-volume"><span>Button size</span><input aria-label="Touch button size" max="72" min="44" onChange={(event) => savePersonal({ ...personal, touchButtonSize: Number(event.target.value) })} step="4" type="range" value={personal.touchButtonSize} /><output>{personal.touchButtonSize}px</output></label>
      <label className="toggle-row"><span>Left-handed layout</span><input checked={personal.leftHandedControls} onChange={(event) => savePersonal({ ...personal, leftHandedControls: event.target.checked })} type="checkbox" /></label>
      <label className="toggle-row"><span>Hide touch controls when a controller is connected</span><input checked={personal.hideTouchControlsWhenController} onChange={(event) => savePersonal({ ...personal, hideTouchControlsWhenController: event.target.checked })} type="checkbox" /></label>
      <h2 className="settings-heading">1 Player Settings</h2>
      <label className="setting-select-row" htmlFor="start-level"><span>Starting Level</span><select aria-label="Starting Level" id="start-level" onChange={(event) => saveSinglePlayer({ ...singlePlayer, startLevel: Number(event.target.value) })} value={singlePlayer.startLevel}>{Array.from({ length: 20 }, (_, level) => <option key={level} value={level}>Level {String(level).padStart(2, '0')}</option>)}</select></label>
      <label className="toggle-row"><span>Hold Piece</span><input checked={singlePlayer.holdEnabled} onChange={(event) => saveSinglePlayer({ ...singlePlayer, holdEnabled: event.target.checked })} type="checkbox" /></label>
      {notice && <p className="notice" role="status">{notice}</p>}
    </section>
  </main>

  if (view === 'highScores') return <main className="shell">
    <header className="topbar"><Brand compact /><button className="back-button" onClick={() => { setCapture(null); setGamepadCapture(null); setView('menu') }}>← Back to menu</button></header>
    <section className="settings-card score-list-page">
      <h1 tabIndex={-1}>High Scores</h1>
      {highscores.length === 0 ? <p className="empty-scores">No scores yet.</p> : <HighscoreTable records={highscores} />}
    </section>
  </main>

  if (view === 'game') return <>
    <main className="shell game-shell" inert={game.status === 'paused' || game.status === 'gameOver'}>
    <header className="topbar game-topbar"><Brand compact /><button className="mobile-pause-button" onClick={() => apply('pause')} tabIndex={-1} type="button">Pause</button></header>
    <section className="game-layout" aria-label="Single-player game">
      <aside className="game-side game-stats">
        <div><span>Score</span><strong>{game.score.toLocaleString()}</strong></div>
        <div><span>Level</span><strong>{game.level}</strong></div>
        <div><span>Lines</span><strong>{game.lines}</strong></div>
      </aside>
      <Playfield game={game} swipeMode={personal.mobileControlMethod === 'swipe'} onSwipe={(start, end) => actionsForSwipe(start, end).forEach(apply)} />
      <aside className="game-side next-panel"><span>Next</span><PiecePreview type={game.next} level={game.level} />{game.holdEnabled && <><span>Hold</span>{game.held ? <PiecePreview type={game.held} level={game.level} /> : <span className="empty-hold">—</span>}</>}</aside>
    </section>
    {(!personal.hideTouchControlsWhenController || !controllerStatus.startsWith('Gamepad connected')) && <TouchControls method={personal.mobileControlMethod} buttonSize={personal.touchButtonSize} leftHanded={personal.leftHandedControls} holdEnabled={game.holdEnabled} hardDropEnabled={game.hardDropEnabled} enabled={game.status === 'playing'} apply={apply} />}
    <p className="controller-status" aria-live="polite">{controllerStatus}</p>
    <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{gameAnnouncement}</p>
    <p className="control-hint" aria-label="Keyboard controls">{keyLabel(bindings.moveLeft)} {keyLabel(bindings.moveRight)} Move · {keyLabel(bindings.softDrop)} Soft drop · {keyLabel(bindings.rotateCounterclockwise)} {keyLabel(bindings.rotateClockwise)} Rotate · {personal.hardDropEnabled ? `${keyLabel(bindings.hardDrop)} Hard drop` : 'Hard Drop off'}{game.holdEnabled ? ` · ${keyLabel(bindings.hold)} Hold` : ''} · {keyLabel(bindings.pause)} / Esc Pause</p>
    </main>
    {game.status === 'paused' && createPortal(<div className="game-overlay"><section className="overlay-card" role="dialog" aria-modal="true" aria-labelledby="overlay-title"><h1 id="overlay-title">Paused</h1><button className="button button-primary" autoFocus onClick={() => apply('resume')}>Resume</button><button className="overlay-link" onClick={() => { audioRef.current?.leaveGame(); setView('menu') }}>Main menu</button></section></div>, document.body)}
    {game.status === 'gameOver' && createPortal(<div className="game-overlay"><section className="overlay-card result-card" role="dialog" aria-modal="true" aria-labelledby="overlay-title"><h1 id="overlay-title">Game over</h1>{isNewRecord && <p className="record-badge">New record</p>}{notice && <p className="notice" role="status">{notice}</p>}<div className="result-stats"><div><span>Final score</span><strong>{game.score.toLocaleString()}</strong></div><div><span>Level</span><strong>{game.level}</strong></div><div><span>Lines</span><strong>{game.lines}</strong></div><div><span>Highscore</span><strong>{resultRank ? `#${resultRank}` : '—'}</strong></div></div><HighscoreTable records={highscores} compact /><button className="button button-primary" autoFocus onClick={beginGame}>Play Again</button><button className="overlay-link" onClick={() => { audioRef.current?.leaveGame(); setCapture(null); setGamepadCapture(null); setView('menu') }}>Main Menu</button></section></div>, document.body)}
  </>

  return <main className="shell menu-shell">
    <header className="topbar"><Brand compact /><button aria-label="Open personal settings" className="settings-button" onClick={() => { setDraft(username); setView('settings') }}>⚙<span>Settings</span></button></header>
    <section className="menu-content">
      <div className="hero-copy"><h1 tabIndex={-1}>Make room<br />for <span>one more.</span></h1></div>
      <div className="menu-actions" aria-label="Main menu">
        <button className="mode-card single-player" onClick={beginGame}><span className="mode-copy"><strong>1 Player</strong></span></button>
        <div className="mode-card disabled-card" aria-disabled="true"><span className="mode-copy"><strong>2 Players</strong></span><span className="coming-soon">Coming soon</span></div>
        <button className="secondary-card" onClick={() => setView('highScores')}>High Scores</button>
        {notice && <p className="notice menu-notice" role="status">{notice}</p>}
      </div>
    </section>
  </main>
}

interface SwipePoint { readonly x: number; readonly y: number }

function focusableControls(scope: HTMLElement): HTMLElement[] {
  return Array.from(scope.querySelectorAll<HTMLElement>(
    'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
  )).filter((control) => control.offsetWidth > 0 || control.offsetHeight > 0)
}

function Playfield({ game, swipeMode, onSwipe }: { game: GameState; swipeMode: boolean; onSwipe: (start: SwipePoint, end: SwipePoint) => void }) {
  const cells: (PieceType | null)[] = game.board.flatMap((row) => [...row])
  const swipeStart = useRef<SwipePoint | null>(null)
  if (game.active) for (const [x, y] of pieceCells(game.active)) cells[y * 10 + x] = game.active.type
  return <div className={`playfield${swipeMode ? ' swipe-active' : ''}`} role="img" aria-label="Game board, 10 columns by 20 rows"
    onPointerDown={(event) => { if (swipeMode && event.pointerType !== 'mouse') { swipeStart.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId) } }}
    onPointerUp={(event) => { if (!swipeMode || !swipeStart.current) return; onSwipe(swipeStart.current, { x: event.clientX, y: event.clientY }); swipeStart.current = null }}
    onPointerCancel={() => { swipeStart.current = null }}>
    {cells.map((type, index) => <div className={`board-cell${type ? ' filled' : ''}`} key={index} style={type ? { '--cell-color': colorForPiece(type, game.level) } as CSSProperties : undefined} />)}
  </div>
}

function TouchControls({ method, buttonSize, leftHanded, holdEnabled, hardDropEnabled, enabled, apply }: {
  method: 'dpad' | 'swipe'; buttonSize: number; leftHanded: boolean; holdEnabled: boolean; hardDropEnabled: boolean; enabled: boolean; apply: (action: GameAction) => void
}) {
  return <section className={`touch-controls${leftHanded ? ' left-handed' : ''}`} style={{ '--preferred-touch-size': `${buttonSize}px` } as CSSProperties} aria-label="Touch controls">
    {method === 'dpad' ? <div className="touch-pad" aria-label="Directional pad">
      <span />
      <TouchButton enabled={enabled} label="Move left" mark="←" action="moveLeft" apply={apply} repeat />
      <span />
      <TouchButton enabled={enabled} label="Move right" mark="→" action="moveRight" apply={apply} repeat />
      <TouchButton enabled={enabled} label="Soft drop" mark="↓" action="softDrop" apply={apply} repeat />
    </div> : <p className="swipe-instructions">Tap to rotate · Swipe left/right to move · Swipe down to soft drop · Swipe up to hard drop</p>}
    <div className="touch-actions">
      <TouchButton enabled={enabled} label="Rotate counterclockwise" mark="B" action="rotateCounterclockwise" apply={apply} />
      <TouchButton enabled={enabled} label="Rotate clockwise" mark="A" action="rotateClockwise" apply={apply} />
      {hardDropEnabled && <TouchButton enabled={enabled} label="Hard drop" mark="DROP" action="hardDrop" apply={apply} primary />}
      {holdEnabled && <TouchButton enabled={enabled} label="Hold piece" mark="HOLD" action="hold" apply={apply} />}
    </div>
  </section>
}

function TouchButton({ label, mark, action, apply, enabled, repeat = false, primary = false }: {
  label: string; mark: string; action: GameAction; apply: (action: GameAction) => void; enabled: boolean; repeat?: boolean; primary?: boolean
}) {
  const activePointer = useRef<number | null>(null)
  const delay = useRef<ReturnType<typeof setTimeout> | null>(null)
  const interval = useRef<ReturnType<typeof setInterval> | null>(null)
  function stop() {
    if (delay.current) clearTimeout(delay.current)
    if (interval.current) clearInterval(interval.current)
    delay.current = null
    interval.current = null
    activePointer.current = null
  }
  function press(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault()
    if (!enabled || activePointer.current !== null) return
    stop()
    activePointer.current = event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)
    apply(action)
    if (repeat) delay.current = setTimeout(() => { apply(action); interval.current = setInterval(() => apply(action), action === 'softDrop' ? 65 : 48) }, 160)
  }
  function release(event: ReactPointerEvent<HTMLButtonElement>) {
    if (activePointer.current === event.pointerId) stop()
  }
  useEffect(() => { if (!enabled) stop(); return stop }, [enabled])
  return <button aria-label={label} disabled={!enabled} className={`touch-button${primary ? ' touch-primary' : ''}${mark.length > 2 ? ' touch-word' : ''}`} onClick={(event) => { if (event.detail === 0) apply(action) }} onLostPointerCapture={release} onPointerCancel={release} onPointerDown={press} onPointerUp={release} type="button">{mark}</button>
}

function PiecePreview({ type, level }: { type: PieceType; level: number }) {
  const cells = previewCells(type)
  return <div className="piece-preview" aria-label={`${type} piece`}>
    {Array.from({ length: 16 }, (_, index) => {
      const filled = cells.has(index)
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
  return <span className={`brand${compact ? ' brand-compact' : ''}`}>
    <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span><span>BRICKS<span className="brand-period">.</span></span>
  </span>
}

export default App
