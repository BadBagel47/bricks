import { bothReady, parseReadiness, previousRoundId, readyForRound, readinessPath } from './round-readiness.ts'
import type { RoundReadiness } from './round-readiness.ts'
import { publishReadiness, withdrawReadiness } from './readiness-repository.ts'
import LiveGame from './LiveGame.tsx'
import type { LiveOptions } from './live-options.ts'
import { useEffect, useRef, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import type { Database } from 'firebase/database'
import type { JoinedRoom } from './room-model.ts'
import type { MatchSettings } from './match-settings.ts'
import { countdownSeconds, parseMatchStart, startStillValid } from './match-start.ts'
import type { Connections, MatchStart } from './match-start.ts'
import { createMatchStart, startPath, transitionMatchStart } from './start-repository.ts'
import { playerFacingError } from './errors.ts'

export default function MatchStartPanel({ options, database, joined, settings, approved, editing, otherEditors, connected, connections, localConnection, onLocked }: { options: LiveOptions; database: Database; joined: JoinedRoom; settings: MatchSettings; approved: boolean; editing: boolean; otherEditors: boolean; connected: boolean; connections: Connections | null; localConnection: string | null; onLocked: (value: boolean) => void }) {
  const [start, setStart] = useState<MatchStart | null>(null)
  const [readiness, setReadiness] = useState<RoundReadiness | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [offset, setOffset] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const interrupted = useRef(new Set<string>())
  const playedMatches = useRef(new Set<string>())
  const host = joined.uid === joined.room.hostUid
  const path = startPath(joined)
  const readyPath = readinessPath(joined)
  const active = start !== null && start.status !== 'cancelled'
  useEffect(() => {
    if (start?.status === 'ready') playedMatches.current.add(start.id)
  }, [start?.id, start?.status])
  useEffect(() => {
    const stopStart = onValue(ref(database, path), snapshot => {
      try { setStart(parseMatchStart(snapshot.val())); setNow(Date.now()); setLoaded(true) }
      catch (reason) { setError(playerFacingError(reason).message) }
    }, reason => setError(playerFacingError(reason).message))
    const stopReadiness = onValue(ref(database, readyPath), snapshot => {
      try { setReadiness(parseReadiness(snapshot.val())) } catch (reason) { setError(playerFacingError(reason).message) }
    }, reason => setError(playerFacingError(reason).message))
    const stopClock = onValue(ref(database, '.info/serverTimeOffset'), snapshot => {
      const value = snapshot.val()
      if (typeof value === 'number' && Number.isFinite(value)) setOffset(value)
    })
    return () => { stopStart(); stopReadiness(); stopClock() }
  }, [database, path, readyPath])
  useEffect(() => {
    if (!loaded || !connected || !localConnection) return
    let current = true
    const action = options.completedId !== null ? withdrawReadiness(database, joined, localConnection, () => current)
      : !active ? publishReadiness(database, joined, localConnection, previousRoundId(start), () => current) : null
    void action?.catch(reason => { if (current) setError(playerFacingError(reason).message) })
    return () => { current = false }
    // The marker is stable through a live round and bound to this connection/generation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [database, path, joined.uid, joined.room.roleRevision, loaded, connected, localConnection, start?.id, start?.status, options.completedId])
  useEffect(() => { onLocked(active); return () => onLocked(false) }, [active, onLocked])
  useEffect(() => {
    if (start?.status !== 'countdown') return
    const timer = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(timer)
  }, [start?.status])
  useEffect(() => {
    if (active && !connected && start) interrupted.current.add(start.id)
  }, [active, connected, start])
  const needsReadiness = start?.roundVersion === 1 && start.status === 'countdown'
  const valid = start && connections !== null && (!needsReadiness || readiness !== null) ? startStillValid(start, joined.room, settings, connections) && (!needsReadiness || bothReady(start, readiness!, connections)) : null
  useEffect(() => {
    if (!start || !active || !connected || connections === null || valid === null) return
    if (valid && !interrupted.current.has(start.id)) return
    void transitionMatchStart(database, joined, start.id, 'cancelled').catch(reason => setError(playerFacingError(reason).message))
    // Freeze cancellation to session/validity changes, not the local countdown clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start?.id, active, connected, valid, connections === null])
  useEffect(() => {
    if (!start || start.status !== 'countdown' || !host || !connected || !valid || offset === null || localConnection !== start.hostConnection || interrupted.current.has(start.id)) return
    const timer = setTimeout(() => {
      void transitionMatchStart(database, joined, start.id, 'ready').catch(reason => setError(playerFacingError(reason).message))
    }, Math.max(0, start.countdownAt + 5100 - (Date.now() + offset)))
    return () => clearTimeout(timer)
    // Schedule one server-authorized transition, never a write per tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start?.id, start?.status, host, connected, valid, offset, localConnection])
  async function begin() {
    if (!connections || !localConnection) return
    setBusy(true); setError('')
    try { await createMatchStart(database, joined, settings, connections, localConnection) }
    catch (reason) { setError(playerFacingError(reason).message) }
    finally { setBusy(false) }
  }
  async function cancel() {
    if (!start) return
    setBusy(true); setError('')
    try { await transitionMatchStart(database, joined, start.id, 'cancelled') }
    catch (reason) { setError(playerFacingError(reason).message) }
    finally { setBusy(false) }
  }
  const ready = start?.status === 'ready' && valid && connected
  const selected = start && localConnection === (host ? start.hostConnection : start.guestConnection)
  if (ready && selected && (start.settings.mode !== 'battle' || start.battleVersion === 1)) return <LiveGame key={start.id} database={database} joined={joined} start={start} options={options} serverTimeOffset={offset ?? 0} onLeave={() => transitionMatchStart(database, joined, start.id, 'cancelled')} />
  const bothConnected = Boolean(connections && localConnection && connections[joined.room.hostUid]?.[localConnection] && joined.room.players.guest && Object.keys(connections[joined.room.players.guest.uid] ?? {}).length)
  const roundId = previousRoundId(start)
  const consent = Boolean(readiness && connections && readyForRound(readiness.host, joined.room.hostUid, roundId, joined.room.roleRevision ?? 0, connections, host ? localConnection : null) && readyForRound(readiness.guest, joined.room.players.guest?.uid, roundId, joined.room.roleRevision ?? 0, connections))
  const canStart = consent && host && loaded && connected && offset !== null && bothConnected && !editing && !otherEditors && (!settings.requireApproval || approved)
  return <section aria-label="Match start">
    {error && <p className="notice" role="alert">{error}</p>}
    {active && start ? <>
      <h2>{ready ? 'Match in progress' : 'Starting match'}</h2>
      <p>{start.settings.mode === 'battle' ? 'Battle' : 'Score Duel'} · Level {String(start.settings.startLevel).padStart(2, '0')} · Hold {start.settings.hold ? 'on' : 'off'}</p>
      {start.status === 'countdown' && <p role="status" aria-label="Countdown">{offset === null ? 'Synchronizing…' : countdownSeconds(start, now + offset) || 'Starting…'}</p>}
      {active && start.settings.mode === 'battle' && start.battleVersion !== 1 && <p role="status">Battle has been updated. Return to the lobby and start a new match.</p>}
      {ready && !selected && <p role="status">This match is controlled by another tab.</p>}
      {!connected && <p role="status">Start interrupted. Reconnecting…</p>}
      <button className="back-button" disabled={!connected || busy} onClick={() => void cancel()}>{start.status === 'ready' ? 'Return to lobby' : 'Cancel start'}</button>
    </> : <>
      {start?.status === 'cancelled' && start.id !== options.lastCompletedId && <p role="status">{playedMatches.current.has(start.id) ? 'Match interrupted. Return to the lobby to try again.' : 'Start cancelled. Return to the lobby to try again.'}</p>}
      {joined.room.players.guest && !consent && <p role="status">Waiting for both players to be ready.</p>}
      {host && <button className="button button-primary" disabled={!canStart || busy} onClick={() => void begin()}>Start Match</button>}
    </>}
  </section>
}
