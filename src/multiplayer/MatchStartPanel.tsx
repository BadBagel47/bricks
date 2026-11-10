import { bothReady, parseReadiness, previousRoundId, readyForRound, readinessPath } from './round-readiness.ts'
import type { RoundReadiness } from './round-readiness.ts'
import { publishReadiness, withdrawReadiness } from './readiness-repository.ts'
import LiveGame from './LiveGame.tsx'
import type { LiveOptions } from './live-options.ts'
import { useEffect, useMemo, useRef, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import type { Database } from 'firebase/database'
import type { JoinedRoom } from './room-model.ts'
import type { MatchSettings } from './match-settings.ts'
import { countdownSeconds, parseMatchStart, startStillValid } from './match-start.ts'
import type { Connections, MatchStart } from './match-start.ts'
import { createMatchStart, startPath, transitionMatchStart } from './start-repository.ts'
import { playerFacingError } from './errors.ts'
import { abandonRecovery, beginRecovery, parseRecoverySession, recoverySessionPath, resumeRecovery } from './recovery-session.ts'
import type { RecoverySession } from './recovery-session.ts'
import { RECOVERY_GRACE_MS } from './recovery.ts'
import { parseRecoveryReadiness, prepareRecovery, recoveryReadinessPath } from './recovery-readiness.ts'
import type { RecoveryReadiness } from './recovery-readiness.ts'

export default function MatchStartPanel({ options, database, joined, settings, approved, editing, otherEditors, connected, connections, localConnection, onLocked }: { options: LiveOptions; database: Database; joined: JoinedRoom; settings: MatchSettings; approved: boolean; editing: boolean; otherEditors: boolean; connected: boolean; connections: Connections | null; localConnection: string | null; onLocked: (value: boolean) => void }) {
  const [start, setStart] = useState<MatchStart | null>(null)
  const [readiness, setReadiness] = useState<RoundReadiness | null>(null)
  const [recovery, setRecovery] = useState<RecoverySession | null>(null)
  const [recoveryReady, setRecoveryReady] = useState<Record<string, RecoveryReadiness>>({})
  const [candidate, setCandidate] = useState<Awaited<ReturnType<typeof prepareRecovery>> | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [offset, setOffset] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const interrupted = useRef(new Set<string>())
  const playedMatches = useRef(new Set<string>())
  const ownedMatches = useRef(new Set<string>())
  const host = joined.uid === joined.room.hostUid
  const path = startPath(joined)
  const readyPath = readinessPath(joined)
  const recoveryPath = recoverySessionPath(joined)
  const recoveryReadyPath = recoveryReadinessPath(joined, joined.uid).replace(/\/[^/]+$/, '')
  const joinedRef = useRef(joined)
  joinedRef.current = joined
  const recoveryContext = useRef({ matchId: start?.id, connection: localConnection, cycle: recovery?.cycle })
  recoveryContext.current = { matchId: start?.id, connection: localConnection, cycle: recovery?.cycle }
  const retainedCandidate = useRef<{ resumedAt: number; cycle: number; value: Awaited<ReturnType<typeof prepareRecovery>> } | null>(null)
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
    const stopRecovery = onValue(ref(database, recoveryPath), snapshot => {
      try { setRecovery(parseRecoverySession(snapshot.val())) } catch (reason) { setError(playerFacingError(reason).message) }
    }, reason => setError(playerFacingError(reason).message))
    const stopRecoveryReady = onValue(ref(database, recoveryReadyPath), snapshot => {
      try {
        const values: Record<string, RecoveryReadiness> = {}
        snapshot.forEach(child => { const value = parseRecoveryReadiness(child.val()); if (value && child.key) values[child.key] = value })
        setRecoveryReady(values)
      } catch (reason) { setError(playerFacingError(reason).message) }
    }, reason => setError(playerFacingError(reason).message))
    const stopClock = onValue(ref(database, '.info/serverTimeOffset'), snapshot => {
      const value = snapshot.val()
      if (typeof value === 'number' && Number.isFinite(value)) setOffset(value)
    })
    return () => { stopStart(); stopReadiness(); stopRecovery(); stopRecoveryReady(); stopClock() }
  }, [database, path, readyPath, recoveryPath, recoveryReadyPath])
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
  const countdown = start?.status === 'countdown' && offset !== null ? countdownSeconds(start, now + offset) : null
  const heardCount = useRef<number | null>(null)
  useEffect(() => {
    const previous = heardCount.current
    heardCount.current = countdown
    if (countdown === null || countdown === previous) return
    if (countdown > 0 && countdown <= 3) options.audio.cue('countdownTick')
    else if (countdown === 0 && previous !== null) options.audio.cue('countdownGo')
  }, [countdown, options.audio])
  const needsReadiness = start?.roundVersion === 1 && start.status === 'countdown'
  const session = recovery?.matchId === start?.id ? recovery : null
  const resumed = session?.phase === 'resumed' ? session : null
  const effectiveStart = useMemo(() => start && session ? { ...start, hostConnection: session.hostConnection, guestConnection: session.guestConnection } : start, [start, session])
  const valid = effectiveStart && connections !== null && (!needsReadiness || readiness !== null) ? startStillValid(effectiveStart, joined.room, settings, connections) && (!needsReadiness || bothReady(effectiveStart, readiness!, connections)) : null
  const selected = effectiveStart && localConnection === (host ? effectiveStart.hostConnection : effectiveStart.guestConnection)
  useEffect(() => { if (start?.status === 'ready' && selected) ownedMatches.current.add(start.id) }, [start?.id, start?.status, selected])
  useEffect(() => {
    if (!start || !effectiveStart || !active || !connected || connections === null || valid === null) return
    if (resumed) {
      if (!valid) void beginRecovery(database, joinedRef.current, effectiveStart).catch(() => {})
      return
    }
    if (valid && !interrupted.current.has(start.id)) return
    const identities = { [effectiveStart.hostUid]: { [effectiveStart.hostConnection]: true }, [effectiveStart.guestUid]: { [effectiveStart.guestConnection]: true } }
    if (start.status === 'ready' && startStillValid(effectiveStart, joined.room, settings, identities) && !valid) {
      void beginRecovery(database, joined, effectiveStart).catch(() => { /* Presence may have recovered before the server checks it. */ })
      return
    }
    if (start.status === 'countdown' || !startStillValid(effectiveStart, joined.room, settings, identities)) void transitionMatchStart(database, joined, start.id, 'cancelled').catch(reason => setError(playerFacingError(reason).message))
    // Freeze cancellation to session/validity changes, not the local countdown clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start?.id, active, connected, valid, connections === null, resumed])
  useEffect(() => {
    if (!start || start.status !== 'ready' || recovery?.matchId !== start.id || !connected) return
    if (recovery.phase === 'resumed') return
    if (recovery.phase === 'abandoned') {
      void transitionMatchStart(database, joinedRef.current, start.id, 'cancelled').catch(reason => setError(playerFacingError(reason).message))
      return
    }
    if (offset === null) return
    const timer = setTimeout(() => void abandonRecovery(database, joinedRef.current, start.id).catch(reason => setError(playerFacingError(reason).message)), Math.max(0, recovery.interruptedAt + RECOVERY_GRACE_MS - (Date.now() + offset)) + 250)
    return () => clearTimeout(timer)
  // A new room object must not restart the fixed deadline.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [database, path, start?.id, start?.status, recovery, connected, offset])
  useEffect(() => {
    if (!start || !effectiveStart || start.status !== 'ready' || recovery?.matchId !== start.id || recovery.phase !== 'paused' || !connected || !localConnection) return
    // An absent/corrupt checkpoint or a still-live old controller cannot be resumed.
    // Presence changes retry the claim without polling or additional heartbeats.
    // The server can resume just before this acknowledgement resolves; retain
    // the candidate and check its match/connection again before rendering it.
    void prepareRecovery(database, joinedRef.current, effectiveStart, localConnection, recovery.cycle).then(value => {
      if (recoveryContext.current.matchId === value.readiness.matchId && recoveryContext.current.connection === value.readiness.connection && recoveryContext.current.cycle === value.readiness.cycle) setCandidate(previous => previous && Object.entries(value.readiness).every(([key, field]) => previous.readiness[key as keyof RecoveryReadiness] === field) ? previous : value)
    }).catch(() => {})
    // Only connection/session changes should initiate a recovery attempt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [database, path, start?.id, start?.status, recovery, connected, localConnection, connections])
  useEffect(() => {
    if (!start || start.status !== 'ready' || recovery?.phase !== 'paused' || recovery.matchId !== start.id || !candidate || candidate.readiness.matchId !== start.id || candidate.readiness.connection !== localConnection || !connected || offset === null) return
    const one = recoveryReady[start.hostUid], two = recoveryReady[start.guestUid]
    if (!one || !two || one.matchId !== start.id || two.matchId !== start.id || one.cycle !== recovery.cycle || two.cycle !== recovery.cycle || candidate.readiness.cycle !== recovery.cycle) return
    void resumeRecovery(database, joinedRef.current, start.id, recovery.cycle, one.connection, two.connection, Math.max(one.battleFrame, two.battleFrame)).catch(() => { /* The server rejects stale readiness or missing presence. */ })
    // A server transaction decides the race between resuming and expiration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [database, path, start?.id, start?.status, recovery, recoveryReady, candidate, localConnection, connected, offset])
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
  const paused = Boolean(start && start.status === 'ready' && (!connected || !selected || valid === false || (!resumed && interrupted.current.has(start.id)) || (recovery?.matchId === start.id && recovery.phase !== 'resumed')))
  // Wait for the local presence view before mounting a newly resumed game. Its
  // clock then starts from the shared server timestamp without local skew.
  const freshCandidate = resumed && connected && valid && offset !== null && candidate && candidate.readiness.matchId === start?.id && candidate.readiness.connection === localConnection && candidate.readiness.cycle === resumed.cycle ? candidate : undefined
  if (resumed && freshCandidate) retainedCandidate.current = { resumedAt: resumed.resumedAt, cycle: resumed.cycle, value: freshCandidate }
  const generation = resumed?.resumedAt ?? session?.lastResumedAt ?? 0
  const generationCycle = resumed?.cycle ?? (session?.lastResumedAt ? session.cycle - 1 : 0)
  const restored = freshCandidate ?? (generation && start && ownedMatches.current.has(start.id) && retainedCandidate.current?.resumedAt === generation && retainedCandidate.current.cycle === generationCycle ? retainedCandidate.current.value : undefined)
  if (start?.status === 'ready' && effectiveStart && (selected || ownedMatches.current.has(start.id)) && (!generation || restored) && (start.settings.mode !== 'battle' || start.battleVersion === 1)) return <LiveGame key={`${start.id}:${generationCycle}`} database={database} joined={joined} start={effectiveStart} options={options} serverTimeOffset={offset ?? 0} paused={paused} restored={restored || undefined} resumedAt={generation || undefined} resumedFrame={resumed?.battleFrame} previousOpponentConnection={session && generation ? (host ? session.previousGuestConnection : session.previousHostConnection) : undefined} onLeave={() => transitionMatchStart(database, joined, start.id, 'cancelled')} />
  const bothConnected = Boolean(connections && localConnection && connections[joined.room.hostUid]?.[localConnection] && joined.room.players.guest && Object.keys(connections[joined.room.players.guest.uid] ?? {}).length)
  const roundId = previousRoundId(start)
  const consent = Boolean(readiness && connections && readyForRound(readiness.host, joined.room.hostUid, roundId, joined.room.roleRevision ?? 0, connections, host ? localConnection : null) && readyForRound(readiness.guest, joined.room.players.guest?.uid, roundId, joined.room.roleRevision ?? 0, connections))
  const canStart = consent && host && loaded && connected && offset !== null && bothConnected && !editing && !otherEditors && (!settings.requireApproval || approved)
  return <section aria-label="Match start">
    {error && <p className="notice" role="alert">{error}</p>}
    {active && start ? <>
      <h2>{ready ? 'Match in progress' : 'Starting match'}</h2>
      <p>{start.settings.mode === 'battle' ? 'Battle' : 'Score Duel'} · Level {String(start.settings.startLevel).padStart(2, '0')} · Hold {start.settings.hold ? 'on' : 'off'}</p>
      {start.status === 'countdown' && <p role="status" aria-label="Countdown">{countdown === null ? 'Synchronizing…' : countdown || 'Starting…'}</p>}
      {active && start.settings.mode === 'battle' && start.battleVersion !== 1 && <p role="status">Battle has been updated. Return to the lobby and start a new match.</p>}
      {ready && !selected && <p role="status">This match is controlled by another tab.</p>}
      {paused && <p role="status">Match paused. Waiting for reconnection…</p>}
      {!connected && <p role="status">Start interrupted. Reconnecting…</p>}
      <button className="back-button" disabled={!connected || busy} onClick={() => void cancel()}>{start.status === 'ready' ? 'Return to lobby' : 'Cancel start'}</button>
    </> : <>
      {start?.status === 'cancelled' && start.id !== options.lastCompletedId && <p role="status">{playedMatches.current.has(start.id) ? 'Match interrupted. Return to the lobby to try again.' : 'Start cancelled. Return to the lobby to try again.'}</p>}
      {joined.room.players.guest && !consent && <p role="status">Waiting for both players to be ready.</p>}
      {host && <button className="button button-primary" disabled={!canStart || busy} onClick={() => void begin()}>Start Match</button>}
    </>}
  </section>
}
