import { ResultCollector } from './results.ts'
import { captureBattleCheckpoint } from './battle-checkpoint.ts'
import { publishCheckpoint } from './checkpoint-repository.ts'
import { MatchClock } from './match-clock.ts'
import { claimControlLease } from './control-lease.ts'
import { parseRecoverySession, recoverySessionPath } from './recovery-session.ts'
import { BattleGame, battleOutcome } from '../engine/battle.ts'
import { battlePath, parseAttackStream, parseBattleFinish, publishBattleFinish, sendAttacks } from './battle-repository.ts'
import type { BattleFinish } from './battle-repository.ts'
import { scoreDuelOutcome } from './score-duel.ts'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { get, onValue, ref } from 'firebase/database'
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

export default function LiveGame({ database, joined, start, options, serverTimeOffset, paused, onLeave }: { database: Database; joined: JoinedRoom; start: MatchStart; options: LiveOptions; serverTimeOffset: number; paused: boolean; onLeave: () => Promise<void> }) {
  const { preferences: { personal, bindings, gamepadBindings }, audio, onPlaying } = options
  const [game, setGame] = useState(() => createGame({ seed: start.seed, startLevel: start.settings.startLevel, holdEnabled: start.settings.hold, hardDropEnabled: personal.hardDropEnabled }))
  const [collector] = useState(() => new ResultCollector(start, joined, result => options.onCompleted(result, joined.uid)))
  const resultsVisible = options.completedId !== null
  const current = useRef(game)
  const battle = start.settings.mode === 'battle'
  const [battleGame] = useState(() => battle ? new BattleGame(game, start.seed, joined.uid === start.hostUid ? 'guest' : 'host') : null)
  const [clock] = useState(() => {
    const value = new MatchClock(Date.now() + serverTimeOffset - start.countdownAt - 5000, performance.now())
    if (paused) value.pause(performance.now())
    return value
  })
  const battleFrame = useCallback(() => clock.frame(performance.now()), [clock])
  const [otherFinish, setOtherFinish] = useState<BattleFinish | null>(null)
  const [ownFinishFrame, setOwnFinishFrame] = useState<number | null>(null)
  const [sentRows, setSentRows] = useState(0)
  const [, refreshBattle] = useState(0)
  const [opponent, setOpponent] = useState<GameSnapshot | null>(null)
  const [error, setError] = useState('')
  const [publishedFinal, setPublishedFinal] = useState<Pick<GameSnapshot, 'status' | 'score'> | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [controller, setController] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const screen = useRef<HTMLElement>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const held = useRef(new HeldInputs())
  const controlsBlocked = useRef(false)
  const pausedRef = useRef(paused)
  useLayoutEffect(() => {
    controlsBlocked.current = paused || confirm || Boolean(error)
    if (paused !== pausedRef.current) {
      if (paused) { clock.pause(performance.now()); held.current.clear(); audio.pauseGame() }
      else { clock.resume(performance.now()); audio.resumeGame() }
      pausedRef.current = paused
    }
  }, [paused, confirm, error, clock, audio])
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
    if (battleGame) {
      commit(battleGame.advanceTo(battleFrame()))
      commit(battleGame.action(action))
    } else commit(dispatch(current.current, action))
  }
  const applyRef = useRef(apply)
  const commitRef = useRef(commit)
  useLayoutEffect(() => { applyRef.current = apply; commitRef.current = commit })

  useEffect(() => { onPlaying(true); audio.beginGame(personal); if (pausedRef.current) audio.pauseGame(); return () => { onPlaying(false); audio.leaveGame() } }, [audio, onPlaying, personal])
  useEffect(() => {
    let alive = true
    let previousSequence = 0
    const stop = onValue(ref(database, `${base}/${opponentUid}`), snapshot => {
      try {
        const next = parseGameSnapshot(snapshot.val())
        if (next?.matchId === start.id && next.connection === otherConnection && next.seq > previousSequence) {
          if (battleGame && next.status === 'gameOver') battleGame.opponentEnded = true
          previousSequence = next.seq
          collector.opponent(next)
          setOpponent(next)
        }
      } catch { setError('Opponent data is invalid. Return to the lobby.') }
    }, () => setError('Unable to synchronize. Return to the lobby.'))
    const stopAttacks = battleGame ? onValue(ref(database, battlePath('battleAttacks', joined, opponentUid)), snapshot => {
      try {
        const stream = parseAttackStream(snapshot.val())
        if (stream?.matchId === start.id && stream.connection === otherConnection) { battleGame.receive(stream.total); refreshBattle(value => value + 1) }
      } catch { setError('Opponent attacks are invalid. Return to the lobby.') }
    }, () => setError('Unable to synchronize attacks. Return to the lobby.')) : () => {}
    const stopFinish = battleGame ? onValue(ref(database, battlePath('battleFinishes', joined, opponentUid)), snapshot => {
      try { const final = parseBattleFinish(snapshot.val()); if (final?.matchId === start.id && final.connection === otherConnection) { collector.opponentFinish(final); setOtherFinish(final) } }
      catch { setError('Opponent result is invalid. Return to the lobby.') }
    }, () => setError('Unable to synchronize results. Return to the lobby.')) : () => {}
    let acknowledgedProduced = 0
    let committedSent = 0
    let leaseAcquired = false
    const gate = new SnapshotGate()
    let timer: ReturnType<typeof setTimeout>
    async function publish() {
      if (!alive) return
      if (pausedRef.current) { timer = setTimeout(() => void publish(), 500); return }
      const next = gate.next(current.current, performance.now())
      const produced = battleGame?.produced ?? 0
      // Capture before awaiting network I/O: game input continues while writes are in flight.
      const savedGame = next ? structuredClone(current.current) : null
      const savedBattle = next && battleGame ? captureBattleCheckpoint(battleGame, { matchId: start.id, uid: joined.uid, epoch: joined.room.epoch }, { acknowledgedProduced, committedSent }) : null
      const finishStats = battleGame?.endedFrame !== null && battleGame ? { frame: battleGame.endedFrame!, received: battleGame.received, applied: battleGame.applied, cancelled: battleGame.cancelled } : null
      try {
        if (!leaseAcquired) {
          await claimControlLease(database, joined, start, connection)
          leaseAcquired = true
          if (!alive) return
        }
        if (battleGame && produced > acknowledgedProduced) {
          committedSent = await sendAttacks(database, joined, start, produced - acknowledgedProduced)
          acknowledgedProduced = produced
          if (alive) setSentRows(committedSent)
        }
        if (next) {
          const checkpoint = savedBattle ? { ...savedBattle, acknowledgedProduced, committedSent } : null
          await publishCheckpoint(database, joined, { ...next, matchId: start.id, connection }, savedGame!, checkpoint)
          if (next.status === 'gameOver' && finishStats) {
            await publishBattleFinish(database, joined, start, { ...finishStats, sent: committedSent })
            if (alive) setOwnFinishFrame(finishStats.frame)
          }
          if (next.status === 'gameOver') collector.acknowledgeOwn(next, finishStats ? { ...finishStats, sent: committedSent } : null)
          if (alive && next.status === 'gameOver') setPublishedFinal({ status: next.status, score: next.score })
        }
      } catch {
        let interrupted: boolean = pausedRef.current
        if (alive && !interrupted) {
          try { interrupted = parseRecoverySession((await get(ref(database, recoverySessionPath(joined)))).val())?.matchId === start.id } catch { /* Report the original synchronization failure. */ }
        }
        if (alive && interrupted) timer = setTimeout(() => void publish(), 500)
        else if (alive) setError('Unable to synchronize. Return to the lobby.')
        return
      }
      if (next?.status === 'gameOver') return
      // Wait after server acknowledgement: no queued writes, no per-frame traffic.
      if (alive) timer = setTimeout(() => void publish(), 500)
    }
    timer = setTimeout(() => void publish(), 0)
    return () => { alive = false; clearTimeout(timer); stop(); stopAttacks(); stopFinish() }
  }, [database, base, joined.uid, opponentUid, start.id, connection, otherConnection, battleGame, joined, start, collector])

  useLayoutEffect(() => {
    if (resultsVisible) return
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
  }, [confirm, game.status, error, resultsVisible])

  useEffect(() => {
    if (resultsVisible) return
    let frame = 0
    let previous: number | null = null
    let previousPad = new Set<string>()
    function keydown(event: KeyboardEvent) {
      if (event.code === 'Tab') return
      if (current.current.status === 'gameOver' && event.target instanceof HTMLButtonElement && (event.code === 'Space' || event.code === 'Enter')) return
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
      if (pausedRef.current) {
        previous = null; previousPad.clear(); held.current.clear()
        frame = requestAnimationFrame(tick)
        return
      }
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
      if (previous !== null && !error) commitRef.current(battleGame ? battleGame.advanceTo(battleFrame()) : advanceGame(current.current, now - previous))
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
  }, [bindings, gamepadBindings, audio, error, battleGame, battleFrame, resultsVisible])

  async function leave() {
    setLeaving(true)
    try { await onLeave() }
    catch { setError('Unable to leave. Check your connection and try again.'); setLeaving(false) }
  }
  const finished = game.status === 'gameOver'
  const difference = game.score - (opponent?.score ?? 0)
  const duel = start.settings.mode === 'score-duel'
  const battleResult = battle && !error && publishedFinal && opponent?.status === 'gameOver' ? battleOutcome(ownFinishFrame, otherFinish?.frame ?? null) : null
  const outcome = duel && !error ? scoreDuelOutcome(publishedFinal, opponent) : battleResult ? { result: battleResult, difference } : null
  const outcomeTitle = outcome ? outcome.result === 'win' ? 'You win' : outcome.result === 'loss' ? 'You lose' : 'Draw' : ''
  const duelStatus = outcome ? `${outcomeTitle}. ${ownName}: ${game.score.toLocaleString()}. ${otherName}: ${opponent!.score.toLocaleString()}.` : finished ? publishedFinal ? 'Waiting for opponent to finish.' : 'Saving final score…' : opponent?.status === 'gameOver' ? 'Opponent finished. Keep playing.' : ''
  if (resultsVisible) return null
  return createPortal(<>
    <main ref={screen} className="multiplayer-game" inert={confirm} aria-label="Multiplayer game">
      <header className="multiplayer-hud"><strong>{start.settings.mode === 'battle' ? 'Battle' : 'Score Duel'}</strong><span aria-label="Score difference">{difference > 0 ? '+' : ''}{difference.toLocaleString()}</span>{!outcome && <button tabIndex={-1} className="back-button" onClick={() => setConfirm(true)}>Leave match</button>}</header>
      {paused && <p role="status">Match paused. Waiting for reconnection…</p>}
      <div className="duel-boards">
        <section aria-label="Your game"><h2>{ownName}</h2><dl className="live-stats"><div><dt>Score</dt><dd>{game.score.toLocaleString()}</dd></div><div><dt>Level</dt><dd>{game.level}</dd></div><div><dt>Lines</dt><dd>{game.lines}</dd></div></dl><Playfield game={game} swipeMode={personal.mobileControlMethod === 'swipe' && !finished} onSwipe={(from, to) => actionsForSwipe(from, to).forEach(action => apply(action))} /><div className="live-previews"><div><span>Next</span><PiecePreview type={game.next} level={game.level} /></div>{game.holdEnabled && <div><span>Hold</span>{game.held && <PiecePreview type={game.held} level={game.level} />}</div>}</div><p role="status">{finished ? 'Game over' : 'Playing'}</p></section>
        <section aria-label="Opponent game"><h2>{otherName}</h2><dl className="live-stats"><div><dt>Score</dt><dd>{opponent?.score.toLocaleString() ?? '0'}</dd></div><div><dt>Level</dt><dd>{opponent?.level ?? start.settings.startLevel}</dd></div><div><dt>Lines</dt><dd>{opponent?.lines ?? 0}</dd></div></dl><Playfield game={{ board: decodeBoard(opponent?.board ?? '0'.repeat(200)), active: null, level: opponent?.level ?? start.settings.startLevel }} swipeMode={false} onSwipe={() => {}} /><p role="status">{opponent ? opponent.status === 'gameOver' ? 'Game over' : 'Connected' : 'Synchronizing…'}</p></section>
      </div>
      {battleGame && <p className="battle-stats" aria-label="Battle attacks">Pending: {battleGame.pending} · Sent: {sentRows} · Applied: {battleGame.applied} · Cancelled: {battleGame.cancelled}</p>}
      {(duel || battle) && !error && duelStatus && <section className="duel-status" aria-label={battle ? "Battle status" : "Score Duel status"} role="status">{outcome ? <><h2>{outcomeTitle}</h2><p>{ownName}: {game.score.toLocaleString()} · {otherName}: {opponent!.score.toLocaleString()}</p><p>{battle ? `Survival: ${(ownFinishFrame! / 60).toFixed(2)} s · ${(otherFinish!.frame / 60).toFixed(2)} s` : `Score difference: ${Math.abs(outcome.difference).toLocaleString()}`}</p></> : <p>{duelStatus}</p>}</section>}
      {!finished && !(controller && personal.hideTouchControlsWhenController) && <TouchControls method={personal.mobileControlMethod} buttonSize={personal.touchButtonSize} leftHanded={personal.leftHandedControls} holdEnabled={game.holdEnabled} hardDropEnabled={game.hardDropEnabled} enabled={!finished && !error && !confirm && !paused} apply={apply} />}
      <p className="control-hint">Esc / {bindings.pause.replace('Key', '')}: leave match · Multiplayer keeps running while this menu is open.</p>
      <p className="visually-hidden" role="status">{announcement}</p>
      {error && <p role="alert">{error}</p>}
      {(finished || error) && <button className="back-button" disabled={leaving} onClick={() => { if (outcome) void leave(); else setConfirm(true) }}>Return to lobby</button>}
    </main>
    {confirm && <div className="game-overlay" style={{ zIndex: 21 }}><div className="overlay-card" role="dialog" aria-modal="true" aria-labelledby="leave-match-title" ref={dialog}><h1 id="leave-match-title">{outcome ? 'Return to lobby?' : 'Leave match?'}</h1><p>{outcome ? 'The match is complete.' : 'The match keeps running. Returning to the lobby ends this session for both players.'}</p><button className="button button-primary" disabled={leaving} onClick={() => { setConfirm(false); held.current.clear() }}>{outcome ? 'Stay here' : finished ? 'Keep watching' : 'Keep playing'}</button><button className="overlay-link" disabled={leaving} onClick={() => void leave()}>Return to lobby</button></div></div>}
  </>, document.body)
}
