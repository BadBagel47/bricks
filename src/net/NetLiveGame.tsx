import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { advanceGame, createGame, dispatch } from '../engine/index.ts'
import type { GameAction, GameState, Transition } from '../engine/index.ts'
import { BattleGame, battleOutcome } from '../engine/battle.ts'
import { actionForCode } from '../input/keyboard.ts'
import { gamepadActions } from '../input/gamepad.ts'
import type { InputAction } from '../input/keyboard.ts'
import { HeldInputs } from '../input/repeat.ts'
import { actionsForSwipe } from '../input/swipe.ts'
import { actionAllowed } from '../input/drop-mode.ts'
import { HoldBox, PiecePreview, Playfield, TouchControls } from '../ui/GameViews.tsx'
import { lineClearEffect } from '../ui/board-effects.ts'
import type { ClearEffect } from '../ui/board-effects.ts'
import { decodeBoard, snapshotContent } from '../multiplayer/game-snapshot.ts'
import { MatchClock } from '../multiplayer/match-clock.ts'
import { MAX_START_CATCH_UP_MS } from '../multiplayer/match-start.ts'
import type { LiveOptions } from '../multiplayer/live-options.ts'
import type { MatchResult, ResultPlayer } from '../multiplayer/results.ts'
import { ConnectionStats, saveConnectionStats } from '../multiplayer/connection-stats.ts'
import type { ConnectionSummary } from '../multiplayer/connection-stats.ts'
import { matchId, OpponentStream, parseMessage } from './protocol.ts'
import type { BoardMessage, FinishMessage, NetSettings } from './protocol.ts'
import type { KitRoom } from './kit.ts'
import { clearNetCheckpoint, restoreBattle, restoreCatchUp, saveNetCheckpoint } from './checkpoint.ts'
import type { NetCheckpoint } from './checkpoint.ts'
import { StartCountdown } from '../ui/StartCountdown.tsx'
import '../multiplayer/live-game.css'

/** Everything both players know about one round when it starts. */
export interface NetRound {
  readonly code: string
  readonly round: number
  readonly seed: number
  readonly startsAt: number
  readonly settings: NetSettings
  readonly ownId: string
  readonly otherId: string
  readonly host: boolean
  readonly ownName: string
  readonly otherName: string
  readonly ownUid: string
  readonly otherUid: string
}

/** Board updates at most this often (Firebase: every 250 ms because of its write rules). */
export const NET_BOARD_SPACING_MS = 100
const POLL_MS = 40

type Final = { score: number; level: number; lines: number }
type Stats = Pick<FinishMessage, 'frame' | 'sent' | 'received' | 'applied' | 'cancelled'>

/** Builds the local result once both players' finals (and Battle finishes) are known. */
export function netResult(round: NetRound, own: Final, other: Final, ownBattle: Stats | null, otherBattle: Stats | null): MatchResult | null {
  const battle = round.settings.mode === 'battle'
  const outcome = battle ? battleOutcome(ownBattle?.frame ?? null, otherBattle?.frame ?? null) : own.score > other.score ? 'win' : own.score < other.score ? 'loss' : 'draw'
  if (!outcome) return null
  const player = (uid: string, name: string, board: Final, result: ResultPlayer['outcome'], stats: Stats | null): ResultPlayer => ({ uid, name, score: board.score, level: board.level, lines: board.lines, outcome: result, ...(battle && stats ? { battle: { frame: stats.frame, sent: stats.sent, received: stats.received, applied: stats.applied, cancelled: stats.cancelled } } : {}) })
  const mine = player(round.ownUid, round.ownName, own, outcome, ownBattle)
  const theirs = player(round.otherUid, round.otherName, other, outcome === 'win' ? 'loss' : outcome === 'loss' ? 'win' : 'draw', otherBattle)
  return { version: 1, id: matchId(round.code, round.round, round.seed), mode: round.settings.mode, roomCode: round.code, epoch: round.round, playedAt: new Date(round.startsAt).toISOString(), players: round.host ? [mine, theirs] : [theirs, mine] }
}

export default function NetLiveGame({ room, round: startRound, options, paused, onExit, onConnection, restored = null, otherUid }: { room: KitRoom; round: NetRound; options: LiveOptions; paused: boolean; onExit: () => void; onConnection: (summary: ConnectionSummary | null) => void; restored?: NetCheckpoint | null; otherUid?: string }) {
  // The opponent's local player id can arrive after the start (their hello); the latest one is used for the result.
  const latestUid = otherUid ?? startRound.otherUid
  const round = useMemo(() => latestUid === startRound.otherUid ? startRound : { ...startRound, otherUid: latestUid }, [startRound, latestUid])
  const { preferences: { personal, bindings, gamepadBindings }, audio, onPlaying } = options
  const battle = round.settings.mode === 'battle'
  const [initial] = useState(() => {
    if (restored) return { game: restored.game, battleGame: restoreBattle(restored, round.host ? 'guest' : 'host') }
    const game = createGame({ seed: round.seed, startLevel: round.settings.startLevel, holdEnabled: round.settings.hold, hardDropEnabled: personal.hardDropEnabled })
    return { game, battleGame: battle ? new BattleGame(game, round.seed, round.host ? 'guest' : 'host') : null }
  })
  const [battleGame] = useState(initial.battleGame)
  const [game, setGame] = useState<GameState>(initial.game)
  const current = useRef(initial.game)
  // A restored Battle continues from its saved frame plus the reload time (at most 3 s), like a fresh start.
  const [clock] = useState(() => new MatchClock(restored?.battle ? restored.battle.frame * 1000 / 60 + restoreCatchUp(restored.savedAt, room.serverNow()) + 0.0001 : room.serverNow() - round.startsAt, performance.now()))
  const [stats] = useState(() => new ConnectionStats('cloudflare'))
  const [stream] = useState(() => { const value = new OpponentStream(round.round); if (restored) value.restore(restored.opponent, restored.otherAttacks, restored.otherFinish); return value })
  const [opponent, setOpponent] = useState<BoardMessage | null>(restored?.opponent ?? null)
  const [otherFinish, setOtherFinish] = useState<FinishMessage | null>(restored?.otherFinish ?? null)
  const [ownFinish, setOwnFinish] = useState<Stats | null>(restored?.ownFinish ?? null)
  const [sentRows, setSentRows] = useState(restored?.sentAttacks ?? 0)
  const [, refreshBattle] = useState(0)
  const [abandoned, setAbandoned] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [controller, setController] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [countdown, setCountdown] = useState(() => Math.max(0, Math.ceil((round.startsAt - room.serverNow()) / 1000)))
  const [clearFx, setClearFx] = useState<ClearEffect | null>(null)
  const [thump, setThump] = useState(0)
  const [completed, setCompleted] = useState(false)
  const effectId = useRef(0)
  const held = useRef(new HeldInputs())
  const controlsBlocked = useRef(false)
  const pausedRef = useRef(paused)
  /** B-028: an abandoned match stops: the board freezes and the music ends. */
  const abandonedRef = useRef(false)
  const started = useRef(false)
  const battleSounds = useRef({ produced: initial.battleGame?.produced ?? 0, applied: initial.battleGame?.applied ?? 0, received: initial.battleGame?.received ?? 0 })
  // Own stream counters, kept for a reload (F-038) and to send everything again when the opponent comes back.
  const sent = useRef({ seq: restored?.seq ?? 0, attacks: restored?.sentAttacks ?? 0, final: restored?.sentFinal ?? false, fingerprint: '' })
  const screen = useRef<HTMLElement>(null)
  const dialog = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    controlsBlocked.current = paused || confirm || Boolean(abandoned) || countdown > 0
    if (paused !== pausedRef.current) {
      const now = performance.now()
      if (paused) { clock.pause(now); held.current.clear(); audio.pauseGame(); stats.paused(now) }
      else { clock.resume(now); if (!abandonedRef.current) audio.resumeGame(); stats.resumed(now) }
      pausedRef.current = paused
    }
    if (abandoned && !abandonedRef.current) { abandonedRef.current = true; held.current.clear(); audio.pauseGame() }
  }, [paused, confirm, abandoned, countdown, clock, audio, stats])

  function commit(transition: Transition) {
    const previous = current.current
    current.current = transition.state
    if (!transition.events.length) return
    setGame(transition.state)
    if (personal.gameEffects) {
      if (transition.events.some(event => event.type === 'linesCleared')) {
        const effect = lineClearEffect(previous, transition.state, ++effectId.current)
        if (effect) { setClearFx(effect); window.setTimeout(() => setClearFx(fx => fx?.id === effect.id ? null : fx), 450) }
      }
      if (transition.events.some(event => event.type === 'hardDropped')) setThump(++effectId.current)
    }
    audio.handleEvents(transition.events)
    audio.setDanger(transition.state.board)
    if (battleGame) {
      const heard = battleSounds.current
      if (battleGame.produced > heard.produced) audio.cue('garbageSent', 0.12)
      if (battleGame.applied > heard.applied) audio.cue('garbageRise', 0.06)
      heard.produced = battleGame.produced; heard.applied = battleGame.applied
    }
    if (transition.events.some(event => event.type === 'linesCleared' || event.type === 'gameOver')) setAnnouncement(transition.state.status === 'gameOver' ? 'Game over.' : `${transition.state.score} points. ${transition.state.lines} lines.`)
  }
  function apply(action: GameAction) {
    if (controlsBlocked.current || action === 'pause' || action === 'resume' || !actionAllowed(action, personal.dropMode)) return
    if (battleGame) { commit(battleGame.advanceTo(clock.frame(performance.now()))); commit(battleGame.action(action)) }
    else commit(dispatch(current.current, action))
  }
  const applyRef = useRef(apply)
  const commitRef = useRef(commit)
  useLayoutEffect(() => { applyRef.current = apply; commitRef.current = commit })

  useEffect(() => { onPlaying(true); audio.beginGame(personal); return () => { onPlaying(false); audio.leaveGame() } }, [audio, onPlaying, personal])

  // Countdown display until the shared start.
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => setCountdown(Math.max(0, Math.ceil((round.startsAt - room.serverNow()) / 1000))), 100)
    return () => clearInterval(timer)
  }, [countdown, round.startsAt, room])

  // Receiving: every message is checked before use (F-028).
  useEffect(() => {
    return room.on('message', ({ from, data, at }) => {
      if (from !== round.otherId) return
      const message = parseMessage(data)
      if (!message) return
      if (message.t === 'board' && stream.board(message)) {
        if (typeof at === 'number') stats.update(room.serverNow() - at, performance.now())
        if (battleGame && message.status === 'gameOver') battleGame.opponentEnded = true
        setOpponent(message)
      } else if (message.t === 'attack' && battleGame && stream.attack(message)) {
        battleGame.receive(message.total)
        if (battleGame.received > battleSounds.current.received && battleGame.pending > 0) audio.cue('garbageIncoming')
        battleSounds.current.received = battleGame.received
        refreshBattle(value => value + 1)
      } else if (message.t === 'finish' && stream.final(message)) setOtherFinish(message)
      else if (message.t === 'quit' && message.round === round.round) setAbandoned('Your opponent left the match. No result is recorded.')
    })
  }, [room, round, stream, stats, battleGame, audio])
  useEffect(() => room.on('peer', peer => { if (peer.id === round.otherId && peer.event === 'gone') setAbandoned('Your opponent left the match. No result is recorded.') }), [room, round.otherId])

  // Sending: board on change (newest only), attacks and the final result reliably.
  useEffect(() => {
    let last = -Infinity
    const timer = setInterval(() => {
      if (pausedRef.current || room.serverNow() < round.startsAt) return
      const now = performance.now(), own = sent.current
      if (battleGame && battleGame.produced > own.attacks) {
        own.attacks = battleGame.produced
        room.send({ t: 'attack', round: round.round, total: own.attacks })
        setSentRows(own.attacks)
      }
      if (own.final) return
      const content = snapshotContent(current.current)
      const next = JSON.stringify(content)
      const final = content.status === 'gameOver'
      if (next === own.fingerprint || (!final && now - last < NET_BOARD_SPACING_MS)) return
      own.fingerprint = next; last = now
      const message: BoardMessage = { t: 'board', round: round.round, seq: ++own.seq, ...content }
      if (final) {
        own.final = true
        room.send(message)
        if (battleGame) {
          const finish: Stats = { frame: battleGame.endedFrame ?? clock.frame(now), sent: battleGame.produced, received: battleGame.received, applied: battleGame.applied, cancelled: battleGame.cancelled }
          room.send({ t: 'finish', round: round.round, ...finish })
          setOwnFinish(finish)
        }
      } else room.send(message, { latest: 'board', reliable: false })
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [room, round, battleGame, clock])

  // F-038: when the opponent comes back (a reload or a new connection), send the current state again.
  const ownFinishRef = useRef(ownFinish)
  ownFinishRef.current = ownFinish
  useEffect(() => room.on('peer', peer => {
    if (peer.id !== round.otherId || (peer.event !== 'back' && peer.event !== 'join')) return
    const own = sent.current
    if (own.seq > 0) room.send({ t: 'board', round: round.round, seq: ++own.seq, ...snapshotContent(current.current) } satisfies BoardMessage)
    if (own.attacks > 0) room.send({ t: 'attack', round: round.round, total: own.attacks })
    if (ownFinishRef.current) room.send({ t: 'finish', round: round.round, ...ownFinishRef.current })
  }), [room, round])

  // F-038: keep this player's game in the tab so a reload can continue the match.
  const opponentRef = useRef(opponent), otherFinishRef = useRef(otherFinish)
  opponentRef.current = opponent; otherFinishRef.current = otherFinish
  useEffect(() => {
    const save = () => {
      const b = battleGame
      saveNetCheckpoint({
        v: 1, code: round.code, round: round.round, seed: round.seed, savedAt: room.serverNow(), game: current.current,
        battle: b ? { received: b.received, applied: b.applied, cancelled: b.cancelled, produced: b.produced, frame: b.frame, endedFrame: b.endedFrame, opponentEnded: b.opponentEnded } : null,
        seq: sent.current.seq, sentAttacks: sent.current.attacks, sentFinal: sent.current.final, ownFinish: ownFinishRef.current,
        opponent: opponentRef.current, otherAttacks: stream.attackTotal, otherFinish: otherFinishRef.current, otherUid: round.otherUid,
      })
    }
    const timer = setInterval(save, 500)
    window.addEventListener('pagehide', save)
    return () => { clearInterval(timer); window.removeEventListener('pagehide', save) }
  }, [room, round, battleGame, stream])

  // Game loop: gravity only while both are connected and after the shared start.
  useEffect(() => {
    if (completed) return
    let frame = 0, previous: number | null = null, previousPad = new Set<string>()
    function keydown(event: KeyboardEvent) {
      if (event.code === 'Tab') return
      if (current.current.status === 'gameOver' && event.target instanceof HTMLButtonElement && (event.code === 'Space' || event.code === 'Enter')) return
      const action = event.code === 'Escape' ? 'pause' : actionForCode(bindings, event.code)
      if (!action) return
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
      if (pausedRef.current || abandonedRef.current || room.serverNow() < round.startsAt) {
        previous = null; previousPad.clear(); held.current.clear()
        frame = requestAnimationFrame(tick); return
      }
      if (!started.current) {
        started.current = true
        // A view mounted a little after the shared start catches up (B-002), at most 3 s.
        // A restored game catches up for the reload instead (F-038), also at most 3 s.
        const catchUp = restored ? restoreCatchUp(restored.savedAt, room.serverNow()) : Math.min(MAX_START_CATCH_UP_MS, Math.max(0, room.serverNow() - round.startsAt))
        if (!battleGame && current.current.status !== 'gameOver') commitRef.current(advanceGame(current.current, catchUp))
      }
      let pad: Gamepad | undefined
      try { pad = Array.from(navigator.getGamepads?.() ?? []).find((value): value is Gamepad => Boolean(value?.connected)) } catch { /* Keyboard and touch still work. */ }
      setController(Boolean(pad))
      const actions = pad ? gamepadActions(pad, gamepadBindings) : new Set<InputAction>()
      for (const action of actions) if (!previousPad.has(action)) {
        if (action === 'pause') { held.current.clear(); setConfirm(value => !value) }
        else { applyRef.current(action); held.current.press(`pad:${action}`, action, now) }
      }
      for (const action of previousPad) if (!actions.has(action as InputAction)) held.current.release(`pad:${action}`)
      previousPad = new Set(actions)
      if (previous !== null) commitRef.current(battleGame ? battleGame.advanceTo(clock.frame(performance.now())) : advanceGame(current.current, now - previous))
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
  }, [bindings, gamepadBindings, audio, battleGame, clock, room, round.startsAt, completed, restored])

  useLayoutEffect(() => {
    if (completed) return
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
  }, [confirm, game.status, abandoned, completed])

  const finished = game.status === 'gameOver'
  const ownFinal = finished ? { score: game.score, level: game.level, lines: game.lines } : null
  const otherFinal = opponent?.status === 'gameOver' ? { score: opponent.score, level: opponent.level, lines: opponent.lines } : null
  const result = !abandoned && ownFinal && otherFinal && (!battle || (ownFinish && otherFinish)) ? netResult(round, ownFinal, otherFinal, ownFinish, otherFinish) : null
  useEffect(() => {
    if (!result || completed) return
    setCompleted(true)
    clearNetCheckpoint()
    const summary = stats.summary(result.playedAt)
    if (summary) saveConnectionStats(summary)
    onConnection(summary)
    audio.cue(result.players.find(p => p.uid === round.ownUid)!.outcome === 'loss' ? 'defeat' : 'victory', 0.4)
    options.onCompleted(result, round.ownUid)
  }, [result, completed, stats, onConnection, options, round.ownUid, audio])

  function leave() {
    clearNetCheckpoint()
    if (!completed && !abandoned) room.send({ t: 'quit', round: round.round })
    onExit()
  }

  if (completed) return null
  const difference = game.score - (opponent?.score ?? 0)
  const pending = battleGame?.pending ?? 0
  const status = finished ? 'Waiting for opponent to finish.' : opponent?.status === 'gameOver' ? 'Opponent finished. Keep playing.' : ''
  const link = paused ? { text: 'Paused', kind: 'wait' } : opponent ? opponent.status === 'gameOver' ? { text: 'Finished', kind: 'done' } : { text: 'Connected', kind: 'ok' } : { text: 'Synchronizing…', kind: 'wait' }
  const pad = (value: number) => String(value).padStart(2, '0')
  return createPortal(<>
    <main ref={screen} className="multiplayer-game" inert={confirm} aria-label="Multiplayer game">
      <header className="match-bar">
        <button tabIndex={-1} type="button" className="match-leave" aria-label="Leave match" onClick={() => setConfirm(true)}><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 5 8 12 15 19" /></svg></button>
        <span className="match-chip">{battle ? 'Battle' : 'Score Duel'}</span>
        <span className={`match-chip link-${link.kind}`}><i aria-hidden="true" />{link.text}</span>
        <span className="match-chip match-room"><span className="room-label">Room </span><b>{round.code}</b></span>
      </header>
      <div className="score-row">
        <div className="score-card own"><span>{round.ownName}</span><strong>{game.score.toLocaleString()}</strong></div>
        <div className="score-diff"><span>Diff</span><strong aria-label="Score difference" className={difference > 0 ? 'ahead' : difference < 0 ? 'behind' : undefined}>{difference > 0 ? '+' : ''}{difference.toLocaleString()}</strong></div>
        <div className="score-card"><span>{round.otherName}</span><strong>{opponent?.score.toLocaleString() ?? '0'}</strong></div>
      </div>
      {paused && <p className="match-note" role="status">Match paused. Waiting for reconnection…</p>}
      <div className="duel-boards">
        {battleGame && <div className="incoming-meter" role="img" aria-label={`Incoming garbage: ${pending} ${pending === 1 ? 'row' : 'rows'}`}><span style={{ height: `${Math.min(pending, 20) * 5}%` }} /></div>}
        <section className="own-board" aria-label="Your game">
          <h2 className="visually-hidden">{round.ownName}</h2>
          <Playfield game={game} ghost={personal.ghostPiece && !finished} colors={personal.blockColors} clear={clearFx} thump={thump} swipeMode={personal.mobileControlMethod === 'swipe' && !finished} onSwipe={(from, to, board) => actionsForSwipe(from, to, board).forEach(action => apply(action))} />
          <dl className="live-stats visually-hidden"><div><dt>Score</dt><dd>{game.score.toLocaleString()}</dd></div><div><dt>Level</dt><dd>{pad(game.level)}</dd></div><div><dt>Lines</dt><dd>{game.lines}</dd></div></dl>
          <p role="status" className={finished ? 'board-status' : 'visually-hidden'}>{finished ? 'Game over' : 'Playing'}</p>
        </section>
        <aside className="match-side">
          <section className="opponent-board" aria-label="Opponent game">
            <h2 className="visually-hidden">{round.otherName}</h2>
            <Playfield game={{ board: decodeBoard(opponent?.board ?? '0'.repeat(200)), active: null, level: opponent?.level ?? round.settings.startLevel }} colors={personal.blockColors} swipeMode={false} onSwipe={() => {}} />
          </section>
          <div className="live-previews">
            <div className="preview-card"><span>Next</span><PiecePreview type={game.next} level={game.level} colors={personal.blockColors} /></div>
            {game.holdEnabled && <div><HoldBox type={game.held} level={game.level} colors={personal.blockColors} enabled={!finished && !abandoned && !confirm && !paused && !game.holdUsed && countdown === 0} onHold={() => apply('hold')} /></div>}
            {battleGame && pending > 0 && <div className="incoming-badge" aria-hidden="true"><strong>+{pending}</strong><span>incoming</span></div>}
          </div>
          <dl className="side-stats" aria-hidden="true"><div><dt>Level</dt><dd>{pad(game.level)}</dd></div><div><dt>Lines</dt><dd>{game.lines}</dd></div></dl>
        </aside>
      </div>
      {battleGame && <p className="battle-stats visually-hidden" aria-label="Battle attacks">Pending: {battleGame.pending} · Sent: {sentRows} · Applied: {battleGame.applied} · Cancelled: {battleGame.cancelled}</p>}
      {!abandoned && status && <section className="duel-status" aria-label={battle ? 'Battle status' : 'Score Duel status'} role="status"><p>{status}</p></section>}
      {!finished && !abandoned && !(controller && personal.hideTouchControlsWhenController) && <TouchControls method={personal.mobileControlMethod} buttonSize={56} leftHanded={personal.leftHandedControls} rotateButtons={personal.rotateButtons} layout={personal.touchLayout} holdEnabled={game.holdEnabled} dropMode={personal.dropMode} enabled={!finished && !confirm && !paused && countdown === 0} apply={apply} />}
      <p className="control-hint">Esc / {bindings.pause.replace('Key', '')}: leave match · Multiplayer keeps running while this menu is open.</p>
      <p className="visually-hidden" role="status">{announcement}</p>
      {abandoned && <p role="alert">{abandoned}</p>}
      {countdown > 0 && !abandoned && <StartCountdown seconds={countdown} />}
      {(finished || abandoned) && <button className="back-button" onClick={() => { if (abandoned) leave(); else setConfirm(true) }}>Return to lobby</button>}
    </main>
    {confirm && <div className="game-overlay" style={{ zIndex: 21 }}><div className="overlay-card" role="dialog" aria-modal="true" aria-labelledby="leave-match-title" ref={dialog}><h1 id="leave-match-title">Leave match?</h1><p>{paused ? 'The match is paused. Returning to the lobby ends this match for both players.' : 'The match keeps running. Returning to the lobby ends this match for both players.'}</p><button className="button button-primary" onClick={() => { setConfirm(false); held.current.clear() }}>{finished ? 'Keep watching' : paused ? 'Keep waiting' : 'Keep playing'}</button><button className="overlay-link" onClick={leave}>Return to lobby</button></div></div>}
  </>, document.body)
}
