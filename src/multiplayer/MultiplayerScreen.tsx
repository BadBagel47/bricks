import { SubpageBar } from '../ui/SubpageBar.tsx'
import { MatchResults } from './ResultViews.tsx'
import { recordResult } from './results.ts'
import type { MatchResult } from './results.ts'
import { BricksAudio } from '../audio/synth.ts'
import type { MultiplayerPreferences } from './live-options.ts'
import { cancelCurrentStart } from './start-repository.ts'
import type { Connections } from './match-start.ts'
import { WaitingMessages } from './waiting-messages.ts'
import MatchSettingsPanel from './MatchSettingsPanel.tsx'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { readFirebaseConfig } from './config.ts'
import { MultiplayerError, playerFacingError } from './errors.ts'
import { inviteURL, previousRoomCode } from './room-model.ts'
import type { JoinedRoom } from './room-model.ts'
import { observePresence } from './presence.ts'
import type { RoomPresence } from './presence.ts'
import type { Rooms } from './rooms.ts'
import { invitationToken, operatingOrigin, publicOperating } from '../access/client.ts'
import { publicAccess, parseOperating } from '../../modules/access-control/operating.ts'
import type { OperatingConfig } from '../../modules/access-control/operating.ts'
import { onValue, ref } from 'firebase/database'

function configured() { try { return readFirebaseConfig(import.meta.env) !== null } catch { return false } }
function setInvite(code: string | null) {
  const url = new URL(location.href)
  if (code) url.searchParams.set('room', code); else url.searchParams.delete('room')
  history.replaceState(null, '', url)
}

export default function MultiplayerScreen({ username, onBack, preferences }: { preferences: MultiplayerPreferences; username: string; onBack: () => void }) {
  const [playing, setPlaying] = useState(false)
  const [completed, setCompleted] = useState<{ result: MatchResult; uid: string } | null>(null)
  const [lastCompletedId, setLastCompletedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [resultBusy, setResultBusy] = useState(false)
  const [resultError, setResultError] = useState('')
  const [audio] = useState(() => new BricksAudio(preferences.personal))

  const [code, setCode] = useState(() => new URL(location.href).searchParams.get('room') ?? '')
  const [joined, setJoined] = useState<JoinedRoom | null>(null)
  const [previous, setPrevious] = useState(previousRoomCode)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<MultiplayerError | null>(null)
  const [admitted, setAdmitted] = useState<{ key: string; database: import('firebase/database').Database } | null>(null)
  const [presence, setPresence] = useState<RoomPresence>({})
  const [connections, setConnections] = useState<Connections | null>(null)
  const [localConnection, setLocalConnection] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [notice, setNotice] = useState('')
  const [operating, setOperating] = useState<OperatingConfig | null>(null)
  const [accessNotice, setAccessNotice] = useState('')
  const [copyFallback, setCopyFallback] = useState<string | null>(null)
  const [connected, setConnected] = useState<boolean | null>(null)
  const currentRoom = useRef(joined)
  currentRoom.current = joined
  const service = useRef<Promise<Rooms> | null>(null)
  const alive = useRef(true)
  const operation = useRef(0)
  const activeRequest = useRef(false)
  const retry = useRef<(() => Promise<JoinedRoom | void>) | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const available = configured()
  const waitingMessages = useRef<{ key: string; messages: WaitingMessages } | null>(null)
  const lobbyKey = joined ? `${joined.code}:${joined.room.epoch}` : ''
  const database = admitted?.key === lobbyKey ? admitted.database : null
  const privateToken = joined ? invitationToken(joined.code) : undefined
  const sharingURL = joined && (!joined.private || privateToken) ? inviteURL(joined.code, location.href, privateToken) : null
  if (waitingMessages.current?.key !== lobbyKey) waitingMessages.current = { key: lobbyKey, messages: new WaitingMessages() }

  useLayoutEffect(() => { heading.current?.focus() }, [joined?.code])
  useEffect(() => {
    if (!operatingOrigin()) return
    let alive = true
    void publicOperating().then(value => { if (alive) setOperating(value) }).catch(() => { if (alive) setAccessNotice('Unable to check public access. Try again before starting a new match.') })
    return () => { alive = false }
  }, [])
  useEffect(() => {
    if (!database || !operatingOrigin()) return
    const stop = onValue(ref(database, 'operating/config'), snapshot => {
        try { setOperating(parseOperating(snapshot.val())); setAccessNotice('') }
        catch { setAccessNotice('Unable to check public access. New matches may be unavailable.') }
      }, () => setAccessNotice('Unable to check public access. New matches may be unavailable.'))
    return stop
  }, [database])
  useEffect(() => {
    if (!operating) return
    const refresh = () => setAccessNotice(publicAccess(operating, 'multi', Date.now()) ? '' : 'Public multiplayer is closed. Private invitations and administrator access may still be used.')
    refresh()
    const remaining = operating.multi.mode === 'until' ? operating.multi.expiresAt - Date.now() : 0
    const timer = remaining > 0 ? setTimeout(refresh, Math.min(remaining + 10, 2_147_483_647)) : undefined
    return () => clearTimeout(timer)
  }, [operating])
  useEffect(() => { alive.current = true; return () => { alive.current = false; void service.current?.then(repository => { if (!alive.current) repository.suspend() }) } }, [])

  const onCompleted = useCallback((result: MatchResult, uid: string) => {
    if (alive.current) { setCompleted({ result, uid }); setLastCompletedId(result.id); setSaving(true); setSaveError('') }
    // Save even if the view left while the final server acknowledgement was in flight.
    void recordResult(result).catch(() => {
      if (alive.current) setSaveError('Results could not be saved on this device.')
    }).finally(() => { if (alive.current) setSaving(false) })
  }, [])
  async function resultLobby() {
    setResultBusy(true); setResultError('')
    try { if (database && joined) await cancelCurrentStart(database, joined); setCompleted(null) }
    catch { setResultError('Unable to return to the lobby. Check your connection and try again.') }
    finally { setResultBusy(false) }
  }

  function rooms(): Promise<Rooms> {
    if (!service.current) service.current = Promise.all([import('./firebase-client.ts'), import('./rooms.ts')]).then(([firebase, repository]) => {
      return new repository.Rooms(firebase.getFirebaseClient(readFirebaseConfig(import.meta.env)))
    }).catch(reason => { service.current = null; throw playerFacingError(reason) })
    return service.current
  }

  async function run(task: () => Promise<JoinedRoom | void>) {
    const id = ++operation.current
    activeRequest.current = true
    retry.current = task
    setBusy(true); setError(null); setNotice(''); setCopyFallback(null)
    try {
      const result = await task()
      if (!alive.current || id !== operation.current) return
      if (result) {
        if (!joined || joined.code !== result.code || joined.room.epoch !== result.room.epoch) setAdmitted(null)
        setJoined(result); setCode(result.code); setInvite(result.code); setError(null)
        setPrevious(previousRoomCode())
      }
    } catch (reason) {
      if (alive.current && id === operation.current) {
        setError(playerFacingError(reason))
        if (!joined) void service.current?.then(repository => repository.suspend())
      }
    }
    finally {
      if (id === operation.current) {
        activeRequest.current = false
        if (alive.current) setBusy(false)
      }
    }
  }

  useEffect(() => {
    if (!available) return
    const invite = new URL(location.href).searchParams.get('room')
    if (invite !== null) void run(async () => (await rooms()).join(invite, username))
    // This effect handles the initial invite, including after name onboarding.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, available])

  useEffect(() => {
    if (!joined) return
    let cancelled = false
    setPresence({}); setConnections(null); setLocalConnection(null); setConnected(null)
    const stops: (() => void)[] = []
    let presenceStarted = false
    void rooms().then(repository => {
      if (cancelled) return
      stops.push(repository.connection(setConnected, setError))
      stops.push(repository.watch(joined, room => {
        if (cancelled) return
        if (room.status === 'closed') {
          retry.current = async () => repository.join(joined.code, username)
          setAdmitted(null); setJoined(null); setError(new MultiplayerError('room-closed')); return
        }
        if (!presenceStarted) {
          presenceStarted = true
          setAdmitted({ key: `${joined.code}:${joined.room.epoch}`, database: repository.database })
          stops.push(observePresence(repository.database, joined, setPresence, setError, setConnections, setLocalConnection))
        }
        setJoined(current => current?.code === joined.code ? { ...current, room } : current)
      }, reason => { retry.current = async () => repository.join(joined.code, username); setAdmitted(null); setJoined(null); setError(reason) }))
    }).catch(reason => { if (!cancelled) setError(playerFacingError(reason)) })
    return () => {
      cancelled = true; stops.forEach(stop => stop())
    }
    // Watch the room epoch, not every incoming participant update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined?.code, joined?.room.epoch])

  useEffect(() => {
    if (joined || busy || activeRequest.current) return
    void service.current?.then(repository => {
      if (!currentRoom.current && !activeRequest.current) repository.suspend()
    })
  }, [joined, busy])

  const guestUid = joined?.room.players.guest?.uid
  const guestOnline = guestUid ? presence[guestUid] === true : false
  const localHost = Boolean(joined && joined.uid === joined.room.hostUid)
  useEffect(() => {
    if (!joined || !guestUid || !localHost || connected !== true || guestOnline || starting) return
    const timer = setTimeout(() => {
      void rooms().then(repository => repository.releaseDisconnectedGuest(joined, guestUid)).catch(reason => {
        // A guest can reconnect before the server evaluates the cleanup write.
        const error = playerFacingError(reason)
        if (alive.current && error.code !== 'permission') setError(error)
      })
    }, 15000)
    return () => clearTimeout(timer)
    // Preserve the grace period across unrelated room snapshot updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined?.code, joined?.room.epoch, guestUid, localHost, connected, guestOnline, starting])

  async function back() {
    if (joined && connected !== false) {
      await run(async () => { if (database) await cancelCurrentStart(database, joined); await (await rooms()).leave(joined); setInvite(null); onBack() })
    } else { setInvite(null); onBack() }
  }

  async function copy(value: string, success: string) {
    try { await navigator.clipboard.writeText(value); setCopyFallback(null); setNotice(success) }
    catch { setCopyFallback(value); setNotice('Clipboard is unavailable. Select and copy the text below.') }
  }

  const status = (uid: string) => connected === false ? 'Unknown' : presence[uid] ? 'Connected' : 'Disconnected'
  const statusClass = (uid: string) => connected === false ? 'unknown' : presence[uid] ? 'online' : 'offline'
  const isHost = joined?.uid === joined?.room.hostUid
  const slots = Math.min(8, Math.max(4, code.length))
  return <><main className="shell" inert={playing || completed !== null} onPointerDownCapture={() => audio.unlock()} onKeyDownCapture={() => audio.unlock()}>
    <SubpageBar title="2 Players" heading={!joined} headingRef={joined ? undefined : heading} disabled={busy} onBack={() => void back()} aside={joined ? undefined : <>Playing as <b>{username}</b></>} />
    <section className="settings-card multiplayer-card" aria-busy={busy}>
      {joined ? <div className="room-code-card">
        <span className="room-code-label" aria-hidden="true">Room code</span>
        <h1 ref={heading} tabIndex={-1} aria-label={`Room ${joined.code}`} className="code-tiles" style={{ '--count': joined.code.length } as CSSProperties}>{[...joined.code].map((letter, index) => <span aria-hidden="true" className="brand-tile" key={index}>{letter}</span>)}</h1>
        <div className="room-copy">
          {sharingURL && <button className="button button-primary" onClick={() => void copy(sharingURL, 'Invite link copied.')}>Copy Invite Link</button>}
          <button className="back-button" onClick={() => void copy(joined.code, 'Code copied.')}>Copy Code</button>
        </div>
        {sharingURL ? <label className="invite-field">Invite link<input readOnly value={sharingURL} onFocus={event => event.currentTarget.select()} /></label> : <p className="notice">Share the original private invitation link. The room code alone does not grant access.</p>}
      </div> : null}
      {!available && <p className="notice" role="status">Multiplayer is not connected yet.</p>}
      {accessNotice && <p className="notice" role="status">{accessNotice}</p>}
      {error && <div role="alert"><p className="notice">{error.message}</p><div className="room-actions">
        {retry.current && <button className="back-button" disabled={busy} onClick={() => void run(retry.current!)}>Retry</button>}
        {!joined && <button className="back-button" onClick={() => { setError(null); input.current?.focus() }}>Edit code</button>}
      </div></div>}
      {notice && <p className="notice" role="status">{notice}</p>}
      {copyFallback && <label className="invite-field">Copy text<input readOnly autoFocus value={copyFallback} onFocus={event => event.currentTarget.select()} /></label>}
      {busy && <p role="status">Connecting…</p>}
      {joined ? <>
        <dl className="room-players lobby-players" aria-label="Players">
          <div><dt>Host</dt><dd><span className="player-name">{joined.room.players.host.name}</span><span className={`player-status ${statusClass(joined.room.players.host.uid)}`}>{status(joined.room.players.host.uid)}</span></dd></div>
          <div className={joined.room.players.guest ? undefined : 'waiting'}><dt>Guest</dt><dd>{joined.room.players.guest ? <><span className="player-name">{joined.room.players.guest.name}</span><span className={`player-status ${statusClass(joined.room.players.guest.uid)}`}>{status(joined.room.players.guest.uid)}</span></> : <span className="player-name">Waiting for opponent…</span>}</dd></div>
        </dl>
        {localHost && guestUid && !guestOnline && connected === true && <p role="status">Opponent disconnected. Waiting up to 15 seconds before freeing the slot.</p>}
        {connected === false && <p className="notice" role="status">Unable to connect. Check your connection and try again.</p>}
        {database && <MatchSettingsPanel options={{ preferences, audio, onPlaying: setPlaying, completedId: completed?.result.id ?? null, lastCompletedId, onCompleted }} key={`${joined.code}:${joined.room.epoch}:${joined.room.roleRevision ?? 0}`} database={database} joined={joined} connected={connected === true} hostConnected={presence[joined.room.hostUid] === true} messages={waitingMessages.current.messages} connections={connections} localConnection={localConnection} locked={starting} onLocked={setStarting} />}
        <div className="room-actions">
          {isHost && joined.room.players.guest && <button className="back-button" disabled={busy || starting || connected !== true || !presence[joined.room.players.guest.uid]} onClick={() => void run(async () => (await rooms()).transfer(joined))}>Transfer Host</button>}
          <button className="back-button" disabled={busy} onClick={() => void back()}>Leave Lobby</button>
        </div>

      </> : <>
        <section className="mp-choice mp-host" aria-labelledby="host-heading">
          <div className="mp-choice-head"><span className="brand-tile" aria-hidden="true">+</span><h2 id="host-heading">Host a game</h2></div>
          <button className="button button-primary" disabled={busy || !available} onClick={() => void run(async () => (await rooms()).create(username))}>Host Game</button>
          {previous && <button className="secondary-card" disabled={busy || !available} onClick={() => void run(async () => (await rooms()).reopen(previous, username))}>Reopen Previous Room</button>}
        </section>
        <form className="mp-choice mp-join" aria-labelledby="join-heading" onSubmit={event => { event.preventDefault(); void run(async () => (await rooms()).join(code, username)) }}>
          <div className="mp-choice-head"><span className="brand-tile" aria-hidden="true">#</span><h2 id="join-heading">Join a game</h2></div>
          <label htmlFor="join-room-code" className="code-entry-label">Room code</label>
          <div className="code-entry" style={{ '--count': slots } as CSSProperties}>
            <input ref={input} autoCapitalize="characters" autoComplete="off" autoCorrect="off" spellCheck={false} id="join-room-code" maxLength={8} value={code} onChange={event => setCode(event.target.value.toUpperCase())} />
            {Array.from({ length: slots }, (_, index) => <span aria-hidden="true" key={index} className={index < code.length ? 'brand-tile filled' : index === code.length ? 'code-slot next' : 'code-slot'}>{code[index] ?? ''}</span>)}
          </div>
          <button className={code.trim().length >= 4 ? 'button button-primary' : 'secondary-card join-idle'} disabled={busy || !available} type="submit">Join Game</button>
        </form>
      </>}
    </section>
  </main>
    {completed && <MatchResults result={completed.result} uid={completed.uid} saving={saving} saveError={saveError} actionError={resultError || error?.message || ''} busy={busy || resultBusy} onRetrySave={() => onCompleted(completed.result, completed.uid)} onLobby={() => void resultLobby()} onMenu={() => void back()} />}
  </>
}
