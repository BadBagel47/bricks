import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { archiveOwner, battleHighscores, duelHighscores, headToHead, OWNER_STORAGE_KEY, readResults, RESULT_STORAGE_KEY, RESULTS_CHANGED } from './results.ts'
import type { MatchResult } from './results.ts'
import './results.css'

const OUTCOME_LABEL = { win: 'Win', loss: 'Loss', draw: 'Draw' } as const

function rememberedOwner(): string | null {
  try { return localStorage.getItem(OWNER_STORAGE_KEY) } catch { return null }
}

/** Survival time as m:ss.s from 60 Hz frames. */
export function survivalTime(frame: number): string {
  const seconds = frame / 60
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, '0')}`
}

function YouMark({ own }: { own: boolean }) {
  return own ? <span className="you-mark"> (you)</span> : null
}

export function MultiplayerHighscores({ mode, onPlay, limit = 10, heading = true, ownUid, currentMatch }: { mode: MatchResult['mode']; onPlay?: () => void; limit?: number; heading?: boolean; ownUid?: string; currentMatch?: string }) {
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    function refresh() { try { setMatches(readResults()); setError('') } catch { setError('Local highscores are unavailable.') } }
    const storage = (event: StorageEvent) => { if (event.key === RESULT_STORAGE_KEY || event.key === null) refresh() }
    refresh(); window.addEventListener(RESULTS_CHANGED, refresh); window.addEventListener('storage', storage)
    return () => { window.removeEventListener(RESULTS_CHANGED, refresh); window.removeEventListener('storage', storage) }
  }, [])
  const owner = ownUid ?? archiveOwner(matches, rememberedOwner())
  const duel = duelHighscores(matches).slice(0, limit), battle = battleHighscores(matches).slice(0, limit)
  const label = mode === 'battle' ? 'Battle highscores' : 'Score Duel highscores'
  return <section aria-label={label}>
    {heading && !onPlay && <h2 className="result-section-title">{mode === 'battle' ? 'Battle' : 'Score Duel'} top {limit}</h2>}
    {error ? <p role="alert">{error}</p> : (mode === 'battle' ? battle : duel).length === 0 ? <div className="empty-scores"><p>No scores yet.</p>{onPlay && <button className="button button-primary" onClick={onPlay}>Play 2 Players</button>}</div>
      : mode === 'score-duel'
        ? <table className="score-cards" aria-label={label}><thead className="visually-hidden"><tr><th>#</th><th>Player</th><th>Result</th><th>Score</th></tr></thead><tbody>{duel.map((p, i) => <tr key={p.id} className={p.id === `${currentMatch}:${owner}` ? 'own' : undefined}><td className="rank">{i + 1}</td><td className="name">{p.name}<YouMark own={p.uid === owner} /></td><td className="meta">{OUTCOME_LABEL[p.outcome]} · Level {String(p.level).padStart(2, '0')} · {p.lines} lines</td><td className="value">{p.score.toLocaleString()}</td></tr>)}</tbody></table>
        : <><table className="score-cards" aria-label={label}><thead className="visually-hidden"><tr><th>#</th><th>Player</th><th>Record</th><th>Wins</th></tr></thead><tbody>{battle.map((p, i) => <tr key={p.uid} className={p.uid === owner ? 'own' : undefined}><td className="rank">{i + 1}</td><td className="name">{p.name}<YouMark own={p.uid === owner} /></td><td className="meta">{p.played} played · {Math.round(p.wins / p.played * 100)}% · {p.score.toLocaleString()} pts · {p.sent} rows sent</td><td className="value">{p.wins} {p.wins === 1 ? 'win' : 'wins'}</td></tr>)}</tbody></table>{onPlay && <p className="ranking-note">Ranked by wins, then win rate and points.</p>}</>}
  </section>
}

export function MatchResults({ result, uid, saving, saveError, actionError, busy, onRetrySave, onLobby, onMenu }: { result: MatchResult; uid: string; saving: boolean; saveError: string; actionError: string; busy: boolean; onRetrySave: () => void; onLobby: () => void; onMenu: () => void }) {
  const screen = useRef<HTMLElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const [archive, setArchive] = useState<MatchResult[]>([])
  const own = result.players.find(player => player.uid === uid)!
  const other = result.players.find(player => player.uid !== uid)!
  const battle = result.mode === 'battle'
  useLayoutEffect(() => {
    heading.current?.focus()
    function tab(event: KeyboardEvent) {
      if (event.code !== 'Tab') return
      event.preventDefault()
      const buttons = Array.from(screen.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])
      if (!buttons.length) return
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
      buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus()
    }
    window.addEventListener('keydown', tab, true)
    return () => window.removeEventListener('keydown', tab, true)
  }, [result.id])
  useEffect(() => {
    try { localStorage.setItem(OWNER_STORAGE_KEY, uid) } catch { /* Owner marking is only a convenience. */ }
    function refresh() { try { setArchive(readResults()) } catch { setArchive([]) } }
    refresh(); window.addEventListener(RESULTS_CHANGED, refresh)
    return () => window.removeEventListener(RESULTS_CHANGED, refresh)
  }, [uid])
  const difference = Math.abs(own.score - other.score)
  const subtitle = battle
    ? own.outcome === 'draw' ? 'Both boards topped out together' : `${own.outcome === 'win' ? 'You' : other.name} survived ${(Math.abs(own.battle!.frame - other.battle!.frame) / 60).toFixed(1)} s longer`
    : own.outcome === 'draw' ? 'Equal scores' : `${own.outcome === 'win' ? 'Ahead' : 'Behind'} by ${difference.toLocaleString()} points`
  const record = headToHead(archive.some(m => m.id === result.id) ? archive : [...archive, result], result.mode, own.uid, other.uid)
  const better = (a: number, b: number, higher = true) => a === b ? '' : (a > b) === higher ? 'better' : ''
  return createPortal(<main ref={screen} className={`match-results outcome-${own.outcome}`} aria-label="Match results">
    <div className="result-bar"><span className="match-chip">{battle ? 'Battle' : 'Score Duel'}</span><span className="match-chip match-room">Room <b>{result.roomCode}</b></span></div>
    <header className="result-head">
      <h1 ref={heading} tabIndex={-1}>{own.outcome === 'win' ? 'You win' : own.outcome === 'loss' ? 'You lose' : 'Draw'}</h1>
      <p>{subtitle}</p>
    </header>
    <table className="result-players" aria-label="Final scores"><thead className="visually-hidden"><tr><th>Player</th><th>Score</th><th>Level and lines</th><th>Result</th></tr></thead>
      <tbody>{result.players.map(p => <tr key={p.uid} className={p.uid === uid ? 'own' : 'other'}>
        <td className="player"><span className="brand-tile" aria-hidden="true">{p.name.trim().charAt(0).toUpperCase() || '?'}</span><span className="pname">{p.name}</span></td>
        <td className="score">{p.score.toLocaleString()}</td>
        <td className="meta">Level <b>{String(p.level).padStart(2, '0')}</b> · Lines <b>{p.lines}</b></td>
        <td className={`outcome ${p.outcome}`}>{p.outcome === 'win' ? 'Winner' : OUTCOME_LABEL[p.outcome]}</td>
      </tr>)}</tbody></table>
    {battle && <table className="result-compare" aria-label="Battle statistics"><thead><tr><th scope="col">{own.name}</th><th scope="col"><span className="lbl">Battle</span></th><th scope="col">{other.name}</th></tr></thead><tbody>
      <tr><td className={better(own.battle!.frame, other.battle!.frame)}>{survivalTime(own.battle!.frame)}</td><th scope="row">Survived</th><td className={better(other.battle!.frame, own.battle!.frame)}>{survivalTime(other.battle!.frame)}</td></tr>
      <tr><td className={better(own.battle!.sent, other.battle!.sent)}>{own.battle!.sent}</td><th scope="row">Rows sent</th><td className={better(other.battle!.sent, own.battle!.sent)}>{other.battle!.sent}</td></tr>
      <tr><td className={better(own.battle!.cancelled, other.battle!.cancelled)}>{own.battle!.cancelled}</td><th scope="row">Cancelled</th><td className={better(other.battle!.cancelled, own.battle!.cancelled)}>{other.battle!.cancelled}</td></tr>
    </tbody></table>}
    <section className="result-card-box" aria-label="Head to head">
      <div className="row"><strong>{own.name} vs {other.name}</strong><b className="record">{record.wins}–{record.losses}{record.draws ? `–${record.draws}` : ''}</b></div>
      <div className="row"><span className="pills">{record.recent.map((outcome, i) => <span key={i} className={`pill ${outcome}`} aria-label={OUTCOME_LABEL[outcome]}>{outcome === 'win' ? 'W' : outcome === 'loss' ? 'L' : 'D'}</span>)}</span><span className="muted">Last {record.recent.length} {record.recent.length === 1 ? 'match' : 'matches'}</span></div>
    </section>
    {saving && <p role="status">Saving results…</p>}
    {saveError && <div role="alert" className="result-alert"><p>{saveError}</p><button className="secondary-card" onClick={onRetrySave}>Retry saving</button></div>}
    <MultiplayerHighscores mode={result.mode} limit={3} ownUid={uid} currentMatch={result.id} />
    {actionError && <p role="alert">{actionError}</p>}
    <div className="result-actions"><button className="button button-primary" disabled={busy} onClick={onLobby}>Rematch</button><button className="secondary-card" disabled={busy} onClick={onMenu}>Main Menu</button></div>
  </main>, document.body)
}
