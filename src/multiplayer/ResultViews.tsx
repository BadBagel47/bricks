import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { battleHighscores, duelHighscores, readResults, RESULT_STORAGE_KEY, RESULTS_CHANGED } from './results.ts'
import type { MatchResult } from './results.ts'
import './results.css'

export function MultiplayerHighscores({ mode }: { mode: MatchResult['mode'] }) {
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    function refresh() { try { setMatches(readResults()); setError('') } catch { setError('Local highscores are unavailable.') } }
    const storage = (event: StorageEvent) => { if (event.key === RESULT_STORAGE_KEY || event.key === null) refresh() }
    refresh(); window.addEventListener(RESULTS_CHANGED, refresh); window.addEventListener('storage', storage)
    return () => { window.removeEventListener(RESULTS_CHANGED, refresh); window.removeEventListener('storage', storage) }
  }, [])
  const duel = duelHighscores(matches), battle = battleHighscores(matches)
  return <section aria-label={mode === 'battle' ? 'Battle highscores' : 'Score Duel highscores'}>
    <h2>{mode === 'battle' ? 'Battle' : 'Score Duel'} highscores</h2>
    {error ? <p role="alert">{error}</p> : (mode === 'battle' ? battle : duel).length === 0 ? <p>No scores yet.</p> : <div className="score-table-wrap">
      {mode === 'score-duel' ? <table className="score-table" aria-label="Score Duel highscores"><thead><tr><th>#</th><th>Player</th><th>Score</th><th>Level</th><th>Lines</th><th>Result</th></tr></thead><tbody>{duel.map((p, i) => <tr key={p.id}><td>{i + 1}</td><td>{p.name}</td><td>{p.score.toLocaleString()}</td><td>{p.level}</td><td>{p.lines}</td><td>{p.outcome}</td></tr>)}</tbody></table>
        : <><table className="score-table" aria-label="Battle highscores"><thead><tr><th>#</th><th>Player</th><th>Wins</th><th>Played</th><th>Win %</th><th>Points</th><th>Lines</th><th>Rows sent</th></tr></thead><tbody>{battle.map((p, i) => <tr key={p.uid}><td>{i + 1}</td><td>{p.name}</td><td>{p.wins}</td><td>{p.played}</td><td>{(p.wins / p.played * 100).toFixed(1)}%</td><td>{p.score.toLocaleString()}</td><td>{p.lines}</td><td>{p.sent}</td></tr>)}</tbody></table><p className="ranking-note">Ranked by wins, then win percentage, total points and player ID.</p></>}
    </div>}
  </section>
}

export function MatchResults({ result, uid, saving, saveError, actionError, busy, onRetrySave, onLobby, onMenu }: { result: MatchResult; uid: string; saving: boolean; saveError: string; actionError: string; busy: boolean; onRetrySave: () => void; onLobby: () => void; onMenu: () => void }) {
  const screen = useRef<HTMLElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const own = result.players.find(player => player.uid === uid)!
  const winner = result.players.find(player => player.outcome === 'win')
  const difference = Math.abs(result.players[0].score - result.players[1].score)
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
  return createPortal(<main ref={screen} className="match-results" aria-label="Match results">
    <h1 ref={heading} tabIndex={-1}>{own.outcome === 'win' ? 'You win' : own.outcome === 'loss' ? 'You lose' : 'Draw'}</h1>
    <p>{result.mode === 'battle' ? 'Battle' : 'Score Duel'} · {new Date(result.playedAt).toLocaleString()}</p>
    <p aria-label="Winner">{winner ? `Winner: ${winner.name}` : 'Draw'}</p>
    <p>Score difference: {difference.toLocaleString()}</p>
    <div className="score-table-wrap"><table className="score-table" aria-label="Final scores"><thead><tr><th>Player</th><th>Score</th><th>Level</th><th>Lines</th><th>Result</th></tr></thead><tbody>{result.players.map(p => <tr key={p.uid}><td>{p.name}</td><td>{p.score.toLocaleString()}</td><td>{p.level}</td><td>{p.lines}</td><td>{p.outcome}</td></tr>)}</tbody></table></div>
    {result.mode === 'battle' && <div className="score-table-wrap"><table className="score-table" aria-label="Battle statistics"><thead><tr><th>Player</th><th>Survival</th><th>Sent</th><th>Received</th><th>Applied</th><th>Cancelled</th></tr></thead><tbody>{result.players.map(p => <tr key={p.uid}><td>{p.name}</td><td>{(p.battle!.frame / 60).toFixed(2)} s</td><td>{p.battle!.sent}</td><td>{p.battle!.received}</td><td>{p.battle!.applied}</td><td>{p.battle!.cancelled}</td></tr>)}</tbody></table></div>}
    {saving && <p role="status">Saving results…</p>}
    {saveError && <div role="alert"><p>{saveError}</p><button className="back-button" onClick={onRetrySave}>Retry saving</button></div>}
    <MultiplayerHighscores mode={result.mode} />
    {actionError && <p role="alert">{actionError}</p>}
    <div className="result-actions"><button className="back-button" disabled={busy} onClick={onLobby}>Return to lobby</button><button className="back-button" disabled={busy} onClick={onMenu}>Main Menu</button></div>
  </main>, document.body)
}
