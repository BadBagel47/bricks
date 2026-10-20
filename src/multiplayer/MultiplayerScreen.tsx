import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { readFirebaseConfig } from './config.ts'
import { MultiplayerError, playerFacingError } from './errors.ts'
import { inviteURL, previousRoomCode } from './room-model.ts'
import type { JoinedRoom } from './room-model.ts'
import type { Rooms } from './rooms.ts'

function configured() { try { return readFirebaseConfig(import.meta.env) !== null } catch { return false } }
function setInvite(code: string | null) {
  const url = new URL(location.href)
  if (code) url.searchParams.set('room', code); else url.searchParams.delete('room')
  history.replaceState(null, '', url)
}

export default function MultiplayerScreen({ username, branding, onBack }: { username: string; branding: ReactNode; onBack: () => void }) {
  const [code, setCode] = useState(() => new URL(location.href).searchParams.get('room') ?? '')
  const [joined, setJoined] = useState<JoinedRoom | null>(null)
  const [previous, setPrevious] = useState(previousRoomCode)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<MultiplayerError | null>(null)
  const [notice, setNotice] = useState('')
  const [copyFallback, setCopyFallback] = useState<string | null>(null)
  const [connected, setConnected] = useState<boolean | null>(null)
  const service = useRef<Promise<Rooms> | null>(null)
  const alive = useRef(true)
  const operation = useRef(0)
  const retry = useRef<(() => Promise<JoinedRoom | void>) | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const available = configured()

  useLayoutEffect(() => { heading.current?.focus() }, [joined?.code])
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  function rooms(): Promise<Rooms> {
    if (!service.current) service.current = Promise.all([import('./firebase-client.ts'), import('./rooms.ts')]).then(([firebase, repository]) => {
      return new repository.Rooms(firebase.getFirebaseClient(readFirebaseConfig(import.meta.env)))
    }).catch(reason => { service.current = null; throw playerFacingError(reason) })
    return service.current
  }

  async function run(task: () => Promise<JoinedRoom | void>) {
    const id = ++operation.current
    retry.current = task
    setBusy(true); setError(null); setNotice(''); setCopyFallback(null)
    try {
      const result = await task()
      if (!alive.current || id !== operation.current) return
      if (result) {
        setJoined(result); setCode(result.code); setInvite(result.code); setError(null)
        setPrevious(previousRoomCode())
      }
    } catch (reason) { if (alive.current && id === operation.current) setError(playerFacingError(reason)) }
    finally { if (alive.current && id === operation.current) setBusy(false) }
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
    const stops: (() => void)[] = []
    void rooms().then(repository => {
      if (cancelled) return
      stops.push(repository.connection(setConnected, setError))
      stops.push(repository.watch(joined, room => {
        if (room.status === 'closed') {
          retry.current = async () => repository.join(joined.code, username)
          setJoined(null); setError(new MultiplayerError('room-closed')); return
        }
        setJoined(current => current?.code === joined.code ? { ...current, room } : current)
      }, reason => { retry.current = async () => repository.join(joined.code, username); setJoined(null); setError(reason) }))
    }).catch(reason => { if (!cancelled) setError(playerFacingError(reason)) })
    return () => { cancelled = true; stops.forEach(stop => stop()) }
    // Watch the room epoch, not every incoming participant update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined?.code, joined?.room.epoch])

  async function back() {
    if (joined && connected !== false) {
      await run(async () => { await (await rooms()).leave(joined); setInvite(null); onBack() })
    } else { setInvite(null); onBack() }
  }

  async function copy(value: string, success: string) {
    try { await navigator.clipboard.writeText(value); setCopyFallback(null); setNotice(success) }
    catch { setCopyFallback(value); setNotice('Clipboard is unavailable. Select and copy the text below.') }
  }

  const isHost = joined?.uid === joined?.room.hostUid
  return <main className="shell">
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
        <dl className="room-players"><div><dt>Host</dt><dd>{joined.room.players.host.name}</dd></div><div><dt>Opponent</dt><dd>{joined.room.players.guest?.name ?? 'Waiting for opponent…'}</dd></div></dl>
        {connected === false && <p className="notice" role="status">Unable to connect. Check your connection and try again.</p>}
        <div className="room-actions">
          <button className="back-button" onClick={() => void copy(joined.code, 'Code copied.')}>Copy Code</button>
          <button className="back-button" onClick={() => void copy(inviteURL(joined.code, location.href), 'Invite link copied.')}>Copy Invite Link</button>
        </div>
        <label className="invite-field">Invite link<input readOnly value={inviteURL(joined.code, location.href)} onFocus={event => event.currentTarget.select()} /></label>
        {isHost && <form className="name-form" onSubmit={event => { event.preventDefault(); void run(async () => (await rooms()).changeCode(joined, code, username)) }}>
          <label htmlFor="custom-room-code">Room code</label>
          <input autoCapitalize="characters" autoComplete="off" disabled={busy || Boolean(joined.room.players.guest)} id="custom-room-code" maxLength={8} value={code} onChange={event => setCode(event.target.value)} />
          <button className="button button-primary" disabled={busy || Boolean(joined.room.players.guest)} type="submit">Change Code</button>
        </form>}
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
