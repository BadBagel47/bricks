import { BricksAudio } from '../audio/synth.ts'
import type { MultiplayerPreferences } from './live-options.ts'
import { cancelCurrentStart } from './start-repository.ts'
import type { Connections } from './match-start.ts'
import { WaitingMessages } from './waiting-messages.ts'
import MatchSettingsPanel from './MatchSettingsPanel.tsx'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { readFirebaseConfig } from './config.ts'
import { MultiplayerError, playerFacingError } from './errors.ts'
import { inviteURL, previousRoomCode } from './room-model.ts'
import type { JoinedRoom } from './room-model.ts'
import { observePresence } from './presence.ts'
import type { RoomPresence } from './presence.ts'
import type { Rooms } from './rooms.ts'

function configured() { try { return readFirebaseConfig(import.meta.env) !== null } catch { return false } }
function setInvite(code: string | null) {
  const url = new URL(location.href)
  if (code) url.searchParams.set('room', code); else url.searchParams.delete('room')
  history.replaceState(null, '', url)
}

export default function MultiplayerScreen({ username, branding, onBack, preferences }: { preferences: MultiplayerPreferences; username: string; branding: ReactNode; onBack: () => void }) {
  const [playing, setPlaying] = useState(false)
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
  if (waitingMessages.current?.key !== lobbyKey) waitingMessages.current = { key: lobbyKey, messages: new WaitingMessages() }

  useLayoutEffect(() => { heading.current?.focus() }, [joined?.code])
  useEffect(() => { alive.current = true; return () => { alive.current = false; void service.current?.then(repository => { if (!alive.current) repository.suspend() }) } }, [])

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
  const isHost = joined?.uid === joined?.room.hostUid
  return <main className="shell" inert={playing} onPointerDownCapture={() => audio.unlock()} onKeyDownCapture={() => audio.unlock()}>
    <header className="topbar">{branding}<button className="back-button" disabled={busy} onClick={() => void back()}>← Back to menu</button></header>
    <section className="settings-card multiplayer-card" aria-busy={busy}>
      <h1 ref={heading} tabIndex={-1}>{joined ? `Room ${joined.code}` : '2 Players'}</h1>
      {!available && <p className="notice" role="status">Multiplayer is not connected yet.</p>}
      {error && <div role="alert"><p className="notice">{error.message}</p><div className="room-actions">
        {retry.current && <button className="back-button" disabled={busy} onClick={() => void run(retry.current!)}>Retry</button>}
        {!joined && <button className="back-button" onClick={() => { setError(null); input.current?.focus() }}>Edit code</button>}
      </div></div>}
      {notice && <p className="notice" role="status">{notice}</p>}
      {copyFallback && <label className="invite-field">Copy text<input readOnly autoFocus value={copyFallback} onFocus={event => event.currentTarget.select()} /></label>}
      {busy && <p role="status">Connecting…</p>}
      {joined ? <>
        {database && <MatchSettingsPanel options={{ preferences, audio, onPlaying: setPlaying }} key={`${joined.code}:${joined.room.epoch}:${joined.room.roleRevision ?? 0}`} database={database} joined={joined} connected={connected === true} hostConnected={presence[joined.room.hostUid] === true} messages={waitingMessages.current.messages} connections={connections} localConnection={localConnection} locked={starting} onLocked={setStarting} />}
        {localHost && guestUid && !guestOnline && connected === true && <p role="status">Opponent disconnected. Waiting up to 15 seconds before freeing the slot.</p>}
        <dl className="room-players" aria-label="Players"><div><dt>Host</dt><dd><span>{joined.room.players.host.name}</span> · <span>{status(joined.room.players.host.uid)}</span></dd></div><div><dt>Opponent</dt><dd>{joined.room.players.guest ? <><span>{joined.room.players.guest.name}</span> · <span>{status(joined.room.players.guest.uid)}</span></> : 'Waiting for opponent…'}</dd></div></dl>
        {connected === false && <p className="notice" role="status">Unable to connect. Check your connection and try again.</p>}
        <div className="room-actions">
          <button className="back-button" onClick={() => void copy(joined.code, 'Code copied.')}>Copy Code</button>
          <button className="back-button" onClick={() => void copy(inviteURL(joined.code, location.href), 'Invite link copied.')}>Copy Invite Link</button>
        </div>
        <label className="invite-field">Invite link<input readOnly value={inviteURL(joined.code, location.href)} onFocus={event => event.currentTarget.select()} /></label>
        <div className="room-actions">
          {isHost && joined.room.players.guest && <button className="back-button" disabled={busy || starting || connected !== true || !presence[joined.room.players.guest.uid]} onClick={() => void run(async () => (await rooms()).transfer(joined))}>Transfer Host</button>}
          <button className="back-button" disabled={busy} onClick={() => void back()}>Leave Lobby</button>
        </div>

      </> : <>
        <div className="menu-actions">
          <button className="button button-primary" disabled={busy || !available} onClick={() => void run(async () => (await rooms()).create(username))}>Host Game</button>
          {previous && <button className="secondary-card" disabled={busy || !available} onClick={() => void run(async () => (await rooms()).reopen(previous, username))}>Reopen Previous Room</button>}
        </div>
        <form className="name-form" onSubmit={event => { event.preventDefault(); void run(async () => (await rooms()).join(code, username)) }}>
          <label htmlFor="join-room-code">Room code</label>
          <input ref={input} autoCapitalize="characters" autoComplete="off" id="join-room-code" maxLength={8} value={code} onChange={event => setCode(event.target.value)} />
          <button className="button button-primary" disabled={busy || !available} type="submit">Join Game</button>
        </form>
      </>}
    </section>
  </main>
}
