import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { onValue, ref, serverTimestamp, set } from 'firebase/database'
import type { Database } from 'firebase/database'
import { advanceGame, createGame, dispatch } from '../engine/index.ts'
import type { GameAction, Transition } from '../engine/index.ts'
import { actionForCode } from '../input/keyboard.ts'
import { gamepadActions } from '../input/gamepad.ts'
import { HeldInputs } from '../input/repeat.ts'
import { actionsForSwipe } from '../input/swipe.ts'
import { PiecePreview, Playfield, TouchControls } from '../ui/GameViews.tsx'
import { decodeBoard, parseGameSnapshot, SnapshotGate } from './game-snapshot.ts'
import type { GameSnapshot } from './game-snapshot.ts'
import type { JoinedRoom } from './room-model.ts'
import type { MatchStart } from './match-start.ts'
import type { LiveOptions } from './live-options.ts'
import './live-game.css'

export default function LiveGame({ database, joined, start, options, onLeave }: { database: Database; joined: JoinedRoom; start: MatchStart; options: LiveOptions; onLeave: () => Promise<void> }) {
  const { preferences: { personal, bindings, gamepadBindings }, audio, onPlaying } = options
  const [game, setGame] = useState(() => createGame({ seed: start.seed, startLevel: start.settings.startLevel, holdEnabled: start.settings.hold, hardDropEnabled: personal.hardDropEnabled }))
  const current = useRef(game)
  const [opponent, setOpponent] = useState<GameSnapshot | null>(null)
  const [error, setError] = useState('')
  const [leaving, setLeaving] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [controller, setController] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const screen = useRef<HTMLElement>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const held = useRef(new HeldInputs())
  const controlsBlocked = useRef(false)
  useLayoutEffect(() => { controlsBlocked.current = confirm || Boolean(error) }, [confirm, error])
  const localHost = joined.uid === start.hostUid
  const opponentUid = localHost ? start.guestUid : start.hostUid
  const connection = localHost ? start.hostConnection : start.guestConnection
  const otherConnection = localHost ? start.guestConnection : start.hostConnection
  const ownName = localHost ? joined.room.players.host.name : joined.room.players.guest!.name
  const otherName = localHost ? joined.room.players.guest!.name : joined.room.players.host.name
  const base = `gameSnapshots/${joined.code}/${joined.room.epoch}`

  function commit(transition: Transition) {
    current.current = transition.state
    // Gravity counters change at 60 Hz; render only a visible engine transition.
    if (!transition.events.length) return
    setGame(transition.state)
    audio.handleEvents(transition.events)
    audio.setDanger(transition.state.board)
    if (transition.events.some(event => event.type === 'linesCleared' || event.type === 'gameOver')) setAnnouncement(transition.state.status === 'gameOver' ? 'Game over.' : `${transition.state.score} points. ${transition.state.lines} lines.`)
  }
  function apply(action: GameAction) {
    if (controlsBlocked.current || action === 'pause' || action === 'resume') return
    commit(dispatch(current.current, action))
  }
  const applyRef = useRef(apply)
  const commitRef = useRef(commit)
  useLayoutEffect(() => { applyRef.current = apply; commitRef.current = commit })

  useEffect(() => { onPlaying(true); audio.beginGame(personal); return () => { onPlaying(false); audio.leaveGame() } }, [audio, onPlaying, personal])
  useEffect(() => {
    let alive = true
    let previousSequence = 0
    const stop = onValue(ref(database, `${base}/${opponentUid}`), snapshot => {
      try {
        const next = parseGameSnapshot(snapshot.val())
        if (next?.matchId === start.id && next.connection === otherConnection && next.seq > previousSequence) {
          previousSequence = next.seq
          setOpponent(next)
        }
      } catch { setError('Opponent data is invalid. Return to the lobby.') }
    }, () => setError('Unable to synchronize. Return to the lobby.'))
    const gate = new SnapshotGate()
    let timer: ReturnType<typeof setTimeout>
    async function publish() {
      if (!alive) return
      const next = gate.next(current.current, performance.now())
      try {
        if (next) await set(ref(database, `${base}/${joined.uid}`), { ...next, matchId: start.id, connection, updatedAt: serverTimestamp() })
      } catch {
        if (alive) setError('Unable to synchronize. Return to the lobby.')
        return
      }
      // Wait after server acknowledgement: no queued writes, no per-frame traffic.
      if (alive) timer = setTimeout(() => void publish(), 500)
    }
    timer = setTimeout(() => void publish(), 0)
    return () => { alive = false; clearTimeout(timer); stop() }
  }, [database, base, joined.uid, opponentUid, start.id, connection, otherConnection])

  useLayoutEffect(() => {
    if (confirm) dialog.current?.querySelector('button')?.focus()
    function tab(event: KeyboardEvent) {
      if (event.code !== 'Tab') return
      event.preventDefault()
      const scope = confirm ? dialog.current : screen.current
      const buttons = Array.from(scope?.querySelectorAll<HTMLButtonElement>('button:not(:disabled):not([tabindex="-1"])') ?? []).filter(button => button.offsetWidth || button.offsetHeight)
      if (!buttons.length) return
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
      buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus()
    }
    window.addEventListener('keydown', tab, true)
    return () => window.removeEventListener('keydown', tab, true)
  }, [confirm, game.status, error])

  useEffect(() => {
    let frame = 0
    let previous: number | null = null
    let previousPad = new Set<string>()
    function keydown(event: KeyboardEvent) {
      if (event.code === 'Tab') return
      const action = event.code === 'Escape' ? 'pause' : actionForCode(bindings, event.code)
      if (!action) return
      // Keep Enter/Space available to the confirmation dialog.
      if (controlsBlocked.current && action !== 'pause') return
      event.preventDefault()
      if (event.repeat) return
      if (action === 'pause') { held.current.clear(); setConfirm(value => !value); return }
      audio.unlock()
      applyRef.current(action)
      held.current.press(event.code, action, performance.now())
    }
    function keyup(event: KeyboardEvent) { held.current.release(event.code) }
    function clear() { held.current.clear(); previousPad.clear() }
    function tick(now: number) {
      let pad: Gamepad | undefined
      try { pad = Array.from(navigator.getGamepads?.() ?? []).find((value): value is Gamepad => Boolean(value?.connected)) } catch { /* Keyboard/touch remain available. */ }
      setController(Boolean(pad))
      const actions = pad ? gamepadActions(pad, gamepadBindings) : new Set<import('../input/keyboard.ts').InputAction>()
      for (const action of actions) if (!previousPad.has(action)) {
        if (action === 'pause') { held.current.clear(); setConfirm(value => !value) }
        else { applyRef.current(action); held.current.press(`pad:${action}`, action, now) }
      }
      for (const action of previousPad) if (!actions.has(action as import('../input/keyboard.ts').InputAction)) held.current.release(`pad:${action}`)
      previousPad = new Set(actions)
      // Multiplayer has no local pause. A hidden tab's next frame catches up gravity.
      if (previous !== null && !error) commitRef.current(advanceGame(current.current, now - previous))
      previous = now
      for (const action of held.current.due(now)) applyRef.current(action)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    window.addEventListener('keydown', keydown)
    window.addEventListener('keyup', keyup)
    window.addEventListener('blur', clear)
    document.addEventListener('visibilitychange', clear)
    return () => { cancelAnimationFrame(frame); clear(); window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup); window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', clear) }
  }, [bindings, gamepadBindings, audio, error])

  async function leave() {
    setLeaving(true)
    try { await onLeave() }
    catch { setError('Unable to leave. Check your connection and try again.'); setLeaving(false) }
  }
  const finished = game.status === 'gameOver'
  const difference = game.score - (opponent?.score ?? 0)
  return createPortal(<>
    <main ref={screen} className="multiplayer-game" inert={confirm} aria-label="Multiplayer game">
      <header className="multiplayer-hud"><strong>{start.settings.mode === 'battle' ? 'Battle' : 'Score Duel'}</strong><span aria-label="Score difference">{difference > 0 ? '+' : ''}{difference.toLocaleString()}</span><button tabIndex={-1} className="back-button" onClick={() => setConfirm(true)}>Leave match</button></header>
      <div className="duel-boards">
        <section aria-label="Your game"><h2>{ownName}</h2><dl className="live-stats"><div><dt>Score</dt><dd>{game.score.toLocaleString()}</dd></div><div><dt>Level</dt><dd>{game.level}</dd></div><div><dt>Lines</dt><dd>{game.lines}</dd></div></dl><Playfield game={game} swipeMode={personal.mobileControlMethod === 'swipe' && !finished} onSwipe={(from, to) => actionsForSwipe(from, to).forEach(action => apply(action))} /><div className="live-previews"><div><span>Next</span><PiecePreview type={game.next} level={game.level} /></div>{game.holdEnabled && <div><span>Hold</span>{game.held && <PiecePreview type={game.held} level={game.level} />}</div>}</div><p role="status">{finished ? 'Game over' : 'Playing'}</p></section>
        <section aria-label="Opponent game"><h2>{otherName}</h2><dl className="live-stats"><div><dt>Score</dt><dd>{opponent?.score.toLocaleString() ?? '0'}</dd></div><div><dt>Level</dt><dd>{opponent?.level ?? start.settings.startLevel}</dd></div><div><dt>Lines</dt><dd>{opponent?.lines ?? 0}</dd></div></dl><Playfield game={{ board: decodeBoard(opponent?.board ?? '0'.repeat(200)), active: null, level: opponent?.level ?? start.settings.startLevel }} swipeMode={false} onSwipe={() => {}} /><p role="status">{opponent ? opponent.status === 'gameOver' ? 'Game over' : 'Connected' : 'Synchronizing…'}</p></section>
      </div>
      {!(controller && personal.hideTouchControlsWhenController) && <TouchControls method={personal.mobileControlMethod} buttonSize={personal.touchButtonSize} leftHanded={personal.leftHandedControls} holdEnabled={game.holdEnabled} hardDropEnabled={game.hardDropEnabled} enabled={!finished && !error && !confirm} apply={apply} />}
      <p className="control-hint">Esc / {bindings.pause.replace('Key', '')}: leave match · Multiplayer keeps running while this menu is open.</p>
      <p className="sr-only" role="status">{announcement}</p>
      {error && <p role="alert">{error}</p>}
      {(finished || error) && <button className="back-button" disabled={leaving} onClick={() => setConfirm(true)}>Return to lobby</button>}
    </main>
    {confirm && <div className="game-overlay" style={{ zIndex: 21 }}><div className="overlay-card" role="dialog" aria-modal="true" aria-labelledby="leave-match-title" ref={dialog}><h1 id="leave-match-title">Leave match?</h1><p>The match keeps running. Returning to the lobby ends this session for both players.</p><button className="button button-primary" disabled={leaving} onClick={() => { setConfirm(false); held.current.clear() }}>Keep playing</button><button className="overlay-link" disabled={leaving} onClick={() => void leave()}>Return to lobby</button></div></div>}
  </>, document.body)
}
