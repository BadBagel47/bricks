import MatchStartPanel from './MatchStartPanel.tsx'
import type { Connections } from './match-start.ts'
import HostWaiting from './HostWaiting.tsx'
import { publishEditor } from './editor-session.ts'
import type { WaitingMessages } from './waiting-messages.ts'
import { useEffect, useState } from 'react'
import { get, onValue, ref, runTransaction, set } from 'firebase/database'
import type { Database } from 'firebase/database'
import type { JoinedRoom } from './room-model.ts'
import { DEFAULT_MATCH_SETTINGS, isApproved, parseSettings, sameSettings } from './match-settings.ts'
import type { Approval, MatchSettings } from './match-settings.ts'
import { MultiplayerError, playerFacingError } from './errors.ts'

export default function MatchSettingsPanel({ database, joined, connected, hostConnected, messages, connections, localConnection, locked, onLocked }: { database: Database; joined: JoinedRoom; connected: boolean; hostConnected: boolean; messages: WaitingMessages; connections: Connections | null; localConnection: string | null; locked: boolean; onLocked: (value: boolean) => void }) {
  const [settings, setSettings] = useState(DEFAULT_MATCH_SETTINGS)
  const [approval, setApproval] = useState<Approval | null>(null)
  const [draft, setDraft] = useState<MatchSettings | null>(null)
  const [editors, setEditors] = useState<Record<string, Record<string, { roleRevision?: number }>>>({})
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const host = joined.uid === joined.room.hostUid
  const base = `matchSettings/${joined.code}/${joined.room.epoch}`
  useEffect(() => {
    const stopConfig = onValue(ref(database, `${base}/config`), snapshot => {
      try { setSettings(parseSettings(snapshot.val())); setLoaded(true) }
      catch (reason) { setError(playerFacingError(reason).message) }
    }, reason => setError(playerFacingError(reason).message))
    const stopApproval = onValue(ref(database, `${base}/approval`), snapshot => setApproval(snapshot.val()), reason => setError(playerFacingError(reason).message))
    const stopEditors = onValue(ref(database, `${base}/editors`), snapshot => setEditors(snapshot.val() ?? {}), reason => setError(playerFacingError(reason).message))
    return () => { stopConfig(); stopApproval(); stopEditors() }
  }, [database, base])
  const editing = draft !== null
  useEffect(() => {
    if (!editing || !host || !connected || locked) return
    return publishEditor(database, joined, reason => setError(playerFacingError(reason).message))
    // The parent keys this panel by room/epoch/role generation. Draft changes
    // stay private and must not cause marker writes on every edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, host, connected, locked, database, base])
  async function save() {
    if (!draft) return
    if (sameSettings(settings, draft)) { setDraft(null); return }
    setBusy(true); setError('')
    let stale = false
    try {
      const baseline = parseSettings((await get(ref(database, `${base}/config`))).val())
      const result = await runTransaction(ref(database, `${base}/config`), value => {
        const current = parseSettings(value ?? (baseline.revision ? baseline : null))
        stale = current.revision !== draft.revision
        if (stale) return undefined
        return { ...draft, revision: current.revision + 1 }
      }, { applyLocally: false })
      if (stale || !result.committed) { setError('Settings changed. Cancel and reopen the editor.'); return }
      setDraft(null)
    } catch (reason) { setError(playerFacingError(reason).message) }
    finally { setBusy(false) }
  }
  async function approve() {
    setBusy(true); setError('')
    try {
      if (!joined.room.players.guest || joined.room.players.guest.uid !== joined.uid) throw new MultiplayerError('permission')
      await set(ref(database, `${base}/approval`), { roleRevision: joined.room.roleRevision ?? 0, revision: settings.revision, hostUid: joined.room.hostUid, guestUid: joined.uid })
    } catch (reason) { setError(playerFacingError(reason).message) }
    finally { setBusy(false) }
  }
  const approved = isApproved(settings, approval, joined.room.hostUid, joined.room.players.guest?.uid, joined.room.roleRevision ?? 0)
  const waiting = !host && connected && hostConnected && Object.values(editors[joined.room.hostUid] ?? {}).some(value => value?.roleRevision === (joined.room.roleRevision ?? 0))
  if (waiting && !locked) return <HostWaiting messages={messages} />
  return <section aria-label="Match settings">
    {error && <p className="notice" role="alert">{error}</p>}
    {!loaded ? <p role="status">Loading match settings…</p> : <>
      <dl className="room-players"><div><dt>Match mode</dt><dd>{settings.mode === 'battle' ? 'Battle' : 'Score Duel'}</dd></div><div><dt>Start level</dt><dd>{String(settings.startLevel).padStart(2, '0')}</dd></div><div><dt>Hold</dt><dd>{settings.hold ? 'On' : 'Off'}</dd></div><div><dt>Require approval</dt><dd>{settings.requireApproval ? 'On' : 'Off'}</dd></div></dl>
      {settings.requireApproval && <p role="status">{!joined.room.players.guest ? 'Waiting for opponent…' : approved ? 'Settings approved.' : 'Waiting for opponent approval.'}</p>}
      {!host && settings.requireApproval && <button className="back-button" disabled={!connected || busy || approved || locked} onClick={() => void approve()}>👍 Approve settings</button>}
      {host && !draft && <button className="back-button" disabled={!connected || busy || locked} onClick={() => setDraft({ ...settings })}>Edit Match Settings</button>}
      {host && draft && !locked && <form className="match-settings-editor" aria-label="Edit match settings" onSubmit={event => { event.preventDefault(); void save() }}>
        <label className="setting-select-row">Match mode<select aria-label="Match mode" value={draft.mode} disabled={busy} onChange={event => setDraft({ ...draft, mode: event.target.value as MatchSettings['mode'] })}><option value="score-duel">Score Duel</option><option value="battle">Battle</option></select></label>
        <label className="setting-select-row">Start level<select aria-label="Start level" value={draft.startLevel} disabled={busy} onChange={event => setDraft({ ...draft, startLevel: Number(event.target.value) })}>{Array.from({ length: 20 }, (_, level) => <option key={level} value={level}>{String(level).padStart(2, '0')}</option>)}</select></label>
        <label className="toggle-row"><input type="checkbox" checked={draft.hold} disabled={busy} onChange={event => setDraft({ ...draft, hold: event.target.checked })} /> Hold piece</label>
        <label className="toggle-row"><input type="checkbox" checked={draft.requireApproval} disabled={busy} onChange={event => setDraft({ ...draft, requireApproval: event.target.checked })} /> Require approval</label>
        <div className="room-actions"><button className="button button-primary" disabled={!connected || busy} type="submit">Apply Settings</button><button className="back-button" disabled={busy} type="button" onClick={() => setDraft(null)}>Cancel</button></div>
      </form>}
      <MatchStartPanel database={database} joined={joined} settings={settings} approved={approved} editing={editing} otherEditors={Object.keys(editors[joined.room.hostUid] ?? {}).length > 0} connected={connected} connections={connections} localConnection={localConnection} onLocked={onLocked} />
    </>}
  </section>
}
