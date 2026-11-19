import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { SubpageBar } from '../ui/SubpageBar.tsx'
import { Segmented, Stepper } from '../ui/SettingsControls.tsx'
import { BackendChoice } from './BackendChoice.tsx'
import { BricksAudio } from '../audio/synth.ts'
import { MatchResults } from '../multiplayer/ResultViews.tsx'
import { recordResult } from '../multiplayer/results.ts'
import type { MatchResult } from '../multiplayer/results.ts'
import type { MultiplayerPreferences } from '../multiplayer/live-options.ts'
import { summaryLine } from '../multiplayer/connection-stats.ts'
import type { ConnectionSummary } from '../multiplayer/connection-stats.ts'
import { createRoom, joinLobby, joinRoom, NetworkRoom, readLobbyLink, readShareLink, ROOMS_SERVER, shareLink, watchNotices } from './kit.ts'
import type { KitRoom, KitRoomState } from './kit.ts'
import { localPlayerId, parseMessage, parseRoomData } from './protocol.ts'
import type { NetSettings, RoomData } from './protocol.ts'
import NetLiveGame from './NetLiveGame.tsx'
import { InviteQr } from './InviteQr.tsx'
import { readNetCheckpoint } from './checkpoint.ts'
import type { NetCheckpoint } from './checkpoint.ts'
import type { NetRound } from './NetLiveGame.tsx'
import type { Backend } from '../multiplayer/connection-stats.ts'

export const LAST_ROOM_KEY = 'bricks.net-last-room.v1'
const ROUND_KEY = 'bricks.net-round.v1'
const store = {
  get: (key: string, storage: Storage = localStorage) => { try { return storage.getItem(key) } catch { return null } },
  set: (key: string, value: string | null, storage: Storage = localStorage) => { try { if (value === null) storage.removeItem(key); else storage.setItem(key, value) } catch { /* Optional convenience. */ } },
}

function message(reason: unknown, fallback: string) {
  const text = (reason as { message?: string; text?: string })?.text ?? (reason as { message?: string })?.message
  return typeof text === 'string' && text.trim() ? text : fallback
}

export default function NetMultiplayer({ username, onBack, preferences, backendSwitch }: { username: string; onBack: () => void; preferences: MultiplayerPreferences; backendSwitch: (value: Backend) => void }) {
  const [audio] = useState(() => new BricksAudio(preferences.personal))
  const [player] = useState(() => localPlayerId())
  const [room, setRoom] = useState<KitRoom | null>(null)
  const [state, setState] = useState<KitRoomState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [copyFallback, setCopyFallback] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [lastRoom, setLastRoom] = useState<string | null>(null)
  const [hellos, setHellos] = useState<Record<string, string>>({})
  const [otherLobbyRound, setOtherLobbyRound] = useState(-1)
  const [live, setLive] = useState<NetRound | null>(null)
  const [restored, setRestored] = useState<NetCheckpoint | null>(null)
  const [playing, setPlaying] = useState(false)
  const [completed, setCompleted] = useState<{ result: MatchResult; uid: string } | null>(null)
  const [connection, setConnection] = useState<ConnectionSummary | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [inLobby, setInLobby] = useState(true)
  const alive = useRef(true)
  const heading = useRef<HTMLHeadingElement>(null)
  const roomRef = useRef<KitRoom | null>(null)
  roomRef.current = room

  useEffect(() => { alive.current = true; return () => { alive.current = false; roomRef.current?.disconnect() } }, [])
  useLayoutEffect(() => { heading.current?.focus() }, [room?.code])
  // The admin page's notices for 2 Players (network-kit F-066).
  useEffect(() => {
    const watcher = watchNotices(ROOMS_SERVER, { mode: 'duo' })
    return () => { if (typeof watcher === 'function') watcher(); else watcher?.stop?.() }
  }, [])
  // Rejoin last room (replaces Reopen Previous Room): only while network-kit still keeps it.
  useEffect(() => {
    const saved = store.get(LAST_ROOM_KEY)
    if (!saved || room) return
    let current = true
    void NetworkRoom.info(ROOMS_SERVER, saved).then(info => { if (current && info && !info.closed) setLastRoom(saved) }).catch(() => {})
    return () => { current = false }
  }, [room])

  const connect = useCallback(async (open: () => Promise<KitRoom>) => {
    setBusy(true); setError(''); setNotice(''); setCopyFallback(null)
    try {
      const joined = await open()
      if (!alive.current) { joined.disconnect(); return }
      store.set(LAST_ROOM_KEY, joined.code)
      // While in a room the address names it, so a reload comes straight back (F-038); no key is kept.
      history.replaceState(null, '', `${location.pathname}${location.search}#room=${joined.code}`)
      setRoom(joined); setState(joined.room); setInLobby(true); setOtherLobbyRound(-1); setHellos({})
    } catch (reason) {
      if (alive.current) setError(message(reason, 'Unable to connect. Check your connection and try again.'))
    } finally { if (alive.current) setBusy(false) }
  }, [])

  // Links: an admin lobby (#nk-lobby=…) or an invitation (#room=…&key=…).
  useEffect(() => {
    if (readLobbyLink(location.hash)) void connect(() => joinLobby(username))
    else {
      const link = readShareLink(location.hash)
      // The link is used once: coming back to this screen later must not join again.
      if (link) { void connect(() => joinRoom(username, link.code, link.key)); history.replaceState(null, '', `${location.pathname}${location.search}`) }
    }
    // Only the address the screen opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Room events.
  useEffect(() => {
    if (!room) return
    const hello = () => room.send({ t: 'hello', player })
    const stops = [
      room.on('room', next => setState({ ...next })),
      room.on('welcome', () => { hello(); setState(room.room ? { ...room.room } : null) }),
      room.on('peer', peer => { if (peer.event === 'join' || peer.event === 'back') { room.send({ t: 'hello', player }, { to: [peer.id] }) } }),
      room.on('message', ({ from, data }) => {
        const msg = parseMessage(data)
        if (!msg || !from) return
        if (msg.t === 'hello') setHellos(value => value[from] === msg.player ? value : { ...value, [from]: msg.player })
        else if (msg.t === 'lobby') setOtherLobbyRound(msg.round)
        else if (msg.t === 'approve' && room.isHost) {
          const data = parseRoomData(room.room?.data)
          if (msg.revision === data.settings.revision) room.setData({ ...data, approved: msg.revision })
        }
      }),
      room.on('closed', closed => { history.replaceState(null, '', `${location.pathname}${location.search}`); setRoom(null); setState(null); setLive(null); setError(closed.text || 'The room has closed.') }),
      room.on('error', failure => { if (failure.text) setError(failure.text); else if (failure.code === 'game-closed') setError('2 Players is not taking new players right now.') }),
    ]
    hello()
    return () => stops.forEach(stop => stop())
  }, [room, player])

  const roomData: RoomData = parseRoomData(state?.data)
  // The host's change shows at once; the room's copy takes over when it arrives.
  const [pending, setPending] = useState<RoomData | null>(null)
  const data: RoomData = pending && pending.settings.revision > roomData.settings.revision ? pending : roomData
  const players = (state?.players ?? []).filter(p => p.role === 'player')
  const me = room?.me ?? null
  const isHost = Boolean(state && me && state.hostId === me)
  const other = players.find(p => p.id !== me) ?? null
  const otherOnline = other?.status === 'online'
  const round = state?.round ?? 0

  // Tell the other player when this device is in the lobby (rematch consent).
  useEffect(() => { if (room && inLobby && !live) room.send({ t: 'lobby', round }) }, [room, inLobby, live, round, other?.id, other?.status])

  // A round starting (countdown) mounts the live game; after a reload the saved game continues (F-038).
  useEffect(() => {
    if (!room || !state || !me || !other) return
    if ((state.phase !== 'countdown' && state.phase !== 'playing') || state.seed === null || state.startsAt === null) return
    if (live?.round === state.round || completed) return
    const marker = `${room.code}:${state.round}`
    let saved: NetCheckpoint | null = null
    if (store.get(ROUND_KEY, sessionStorage) === marker) {
      // This page took part in this round before a reload: continue its saved game, if any.
      saved = readNetCheckpoint({ code: room.code, round: state.round, seed: state.seed, startLevel: data.settings.startLevel, hold: data.settings.hold, battle: data.settings.mode === 'battle' })
      if (!saved) {
        room.send({ t: 'quit', round: state.round })
        if (isHost) room.end()
        setNotice('The match could not continue after the page reloaded. No result is recorded.')
        return
      }
    }
    store.set(ROUND_KEY, marker, sessionStorage)
    const host = state.hostId === me
    setInLobby(false)
    setRestored(saved)
    room.send({ t: 'hello', player })
    setLive({
      code: room.code, round: state.round, seed: state.seed, startsAt: state.startsAt, settings: data.settings,
      ownId: me, otherId: other.id, host, ownName: username, otherName: other.name,
      ownUid: `nk:${player}`, otherUid: saved?.otherUid ?? `nk:${hellos[other.id] ?? other.id.replace(/[^a-z0-9]/gi, '').slice(0, 16)}`,
    })
    // Mount once per round; settings are frozen at the start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, state?.phase, state?.round, me, other?.id])

  const onCompleted = useCallback((result: MatchResult, uid: string) => {
    setCompleted({ result, uid }); setSaving(true); setSaveError('')
    void recordResult(result).catch(() => { if (alive.current) setSaveError('Results could not be saved on this device.') }).finally(() => { if (alive.current) setSaving(false) })
  }, [])
  const options = { preferences, audio, onPlaying: setPlaying, completedId: completed?.result.id ?? null, lastCompletedId: null, onCompleted }

  function toLobby() {
    setLive(null); setCompleted(null); setInLobby(true)
    if (room && isHost && state?.phase === 'playing') room.end()
  }
  function leaveRoom() {
    history.replaceState(null, '', `${location.pathname}${location.search}`)
    room?.leave(); setRoom(null); setState(null); setLive(null); setCompleted(null)
  }
  function back() { leaveRoom(); onBack() }
  async function copy(value: string, success: string) {
    try { await navigator.clipboard.writeText(value); setCopyFallback(null); setNotice(success) }
    catch { setCopyFallback(value); setNotice('Clipboard is unavailable. Select and copy the text below.') }
  }
  function saveSettings(next: Partial<NetSettings>) {
    if (!room || !isHost) return
    const value: RoomData = { v: 1, settings: { ...data.settings, ...next, revision: data.settings.revision + 1 }, approved: 0 }
    setPending(value)
    room.setData(value)
  }

  const approvalNeeded = data.settings.requireApproval && data.approved !== data.settings.revision
  const otherInLobby = otherLobbyRound === round
  const canStart = Boolean(isHost && other && otherOnline && otherInLobby && !approvalNeeded && (state?.phase === 'lobby' || state?.phase === 'ended'))
  const startHint = !other ? 'Waiting for opponent…' : !otherOnline ? 'Opponent disconnected.' : !otherInLobby ? 'Waiting for your opponent to return to the lobby.' : approvalNeeded ? 'Waiting for your opponent to approve the settings.' : ''
  const inviteLink = room ? shareLink(`${location.origin}${location.pathname}`, room.code, room.inviteKeys?.player?.k) : ''
  const slots = 6

  return <><main className="shell" inert={playing || completed !== null} onPointerDownCapture={() => audio.unlock()} onKeyDownCapture={() => audio.unlock()}>
    <SubpageBar title="2 Players" heading={!room} headingRef={room ? undefined : heading} disabled={busy} onBack={back} aside={room ? undefined : <>Playing as <b>{username}</b></>} />
    <section className="settings-card multiplayer-card" aria-busy={busy}>
      {!room && <BackendChoice value="cloudflare" onChange={backendSwitch} disabled={busy} />}
      {room && <div className="room-code-card">
        <span className="room-code-label" aria-hidden="true">Room code</span>
        <h1 ref={heading} tabIndex={-1} aria-label={`Room ${room.code}`} className="code-tiles" style={{ '--count': room.code.length } as CSSProperties}>{[...room.code].map((letter, index) => <span aria-hidden="true" className="brand-tile" key={index}>{letter}</span>)}</h1>
        <div className="room-copy">
          <button className="back-button" onClick={() => void copy(inviteLink, 'Invite link copied.')}>Copy Invite Link</button>
          <button className="back-button" onClick={() => void copy(room.code, 'Code copied.')}>Copy Code</button>
          <InviteQr url={inviteLink} full={Boolean(other)} />
        </div>
      </div>}
      {error && <div role="alert"><p className="notice">{error}</p></div>}
      {notice && <p className="notice" role="status">{notice}</p>}
      {copyFallback && <label className="invite-field">Copy text<input readOnly autoFocus value={copyFallback} onFocus={event => event.currentTarget.select()} /></label>}
      {busy && <p role="status">Connecting…</p>}
      {room ? <>
        <dl className="room-players lobby-players" aria-label="Players">
          {players.map(p => <div key={p.id}><dt>{p.id === state?.hostId ? 'Host' : 'Guest'}</dt><dd><span className="player-name">{p.name}</span><span className={`player-status ${p.status === 'online' ? 'online' : 'offline'}`}>{p.status === 'online' ? 'Connected' : 'Disconnected'}</span></dd></div>)}
          {players.length < 2 && <div className="waiting"><dt>Guest</dt><dd><span className="player-name">Waiting for opponent…</span></dd></div>}
        </dl>
        <section className="match-settings" aria-label="Match settings">
          <h2 className="settings-heading">Match settings</h2>
          {isHost ? <>
            <Segmented label="Mode" value={data.settings.mode} options={[{ value: 'score-duel', label: 'Score Duel' }, { value: 'battle', label: 'Battle' }]} onChange={mode => saveSettings({ mode })} />
            <div className="setting-group">
              <Stepper label="Starting Level" value={data.settings.startLevel} min={0} max={19} lowerLabel="Lower starting level" raiseLabel="Raise starting level" onChange={startLevel => saveSettings({ startLevel })} />
              <label className="toggle-row"><span>Hold Piece</span><input checked={data.settings.hold} onChange={event => saveSettings({ hold: event.target.checked })} type="checkbox" /></label>
              <label className="toggle-row"><span>Guest approves settings</span><input checked={data.settings.requireApproval} onChange={event => saveSettings({ requireApproval: event.target.checked })} type="checkbox" /></label>
            </div>
          </> : <>
            <p className="mode-summary">{data.settings.mode === 'battle' ? 'Battle' : 'Score Duel'} · Level {String(data.settings.startLevel).padStart(2, '0')} · Hold {data.settings.hold ? 'on' : 'off'}</p>
            {approvalNeeded && <button className="button button-primary" onClick={() => room.send({ t: 'approve', revision: data.settings.revision })}>Approve Settings</button>}
          </>}
        </section>
        {isHost ? <>
          <button className="button button-primary" disabled={!canStart} onClick={() => { setError(''); room.start() }}>Start Match</button>
          {startHint && <p role="status">{startHint}</p>}
        </> : <p role="status">{other && otherOnline ? 'Waiting for the host to start.' : 'Waiting for the host…'}</p>}
        <div className="room-actions"><button className="back-button" onClick={leaveRoom}>Leave Lobby</button></div>
      </> : <>
        <section className="mp-choice mp-host" aria-labelledby="host-heading">
          <div className="mp-choice-head"><span className="brand-tile" aria-hidden="true">+</span><h2 id="host-heading">Host a game</h2></div>
          <button className="button button-primary" disabled={busy} onClick={() => void connect(() => createRoom(username))}>Host Game</button>
          {lastRoom && <button className="secondary-card" disabled={busy} onClick={() => void connect(() => joinRoom(username, lastRoom))}>Rejoin Last Room</button>}
        </section>
        <form className="mp-choice mp-join" aria-labelledby="join-heading" onSubmit={event => { event.preventDefault(); void connect(() => joinRoom(username, code)) }}>
          <div className="mp-choice-head"><span className="brand-tile" aria-hidden="true">#</span><h2 id="join-heading">Join a game</h2></div>
          <label htmlFor="join-room-code" className="code-entry-label">Room code</label>
          <div className="code-entry" style={{ '--count': slots } as CSSProperties}>
            <input autoCapitalize="characters" autoComplete="off" autoCorrect="off" spellCheck={false} id="join-room-code" maxLength={6} value={code} onChange={event => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} />
            {Array.from({ length: slots }, (_, index) => <span aria-hidden="true" key={index} className={index < code.length ? 'brand-tile filled' : index === code.length ? 'code-slot next' : 'code-slot'}>{code[index] ?? ''}</span>)}
          </div>
          <button className={code.length === 6 ? 'button button-primary' : 'secondary-card join-idle'} disabled={busy || code.length !== 6} type="submit">Join Game</button>
        </form>
      </>}
    </section>
  </main>
    {room && live && <NetLiveGame key={`${live.code}:${live.round}`} room={room} round={live} options={options} paused={Boolean(state?.paused)} onExit={toLobby} onConnection={setConnection} restored={restored} otherUid={hellos[live.otherId] ? `nk:${hellos[live.otherId]}` : undefined} />}
    {completed && <MatchResults result={completed.result} uid={completed.uid} saving={saving} saveError={saveError} actionError="" busy={false} connection={connection ? summaryLine(connection) : undefined} onRetrySave={() => onCompleted(completed.result, completed.uid)} onLobby={toLobby} onMenu={back} />}
  </>
}
