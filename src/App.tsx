import { useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

const USERNAME_KEY = 'bricks.username'

function readUsername() {
  try { return localStorage.getItem(USERNAME_KEY)?.trim() ?? '' } catch { return '' }
}

function App() {
  const [username, setUsername] = useState(readUsername)
  const [draft, setDraft] = useState(username)
  const [view, setView] = useState<'welcome' | 'menu' | 'settings'>(username ? 'menu' : 'welcome')
  const [notice, setNotice] = useState('')

  function saveUsername(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanName = draft.trim()
    if (cleanName.length < 2 || cleanName.length > 16) return
    let saveFailed = false
    try { localStorage.setItem(USERNAME_KEY, cleanName) }
    catch { saveFailed = true }
    setUsername(cleanName)
    setView('menu')
    setNotice(saveFailed ? 'Your browser could not save this name. You can still continue.' : '')
  }

  if (view === 'welcome') return <main className="shell welcome-shell">
    <Brand />
    <section className="welcome-card" aria-labelledby="welcome-title">
      <h1 id="welcome-title">Enter your name</h1>
      <form className="name-form" onSubmit={saveUsername}>
        <label htmlFor="username">Player name</label>
        <input autoComplete="nickname" autoFocus id="username" maxLength={16} minLength={2} onChange={(event) => setDraft(event.target.value)} required value={draft} />
        <span className="field-hint">2–16 characters</span>
        {notice && <p className="notice" role="status">{notice}</p>}
        <button className="button button-primary" type="submit">Continue</button>
      </form>
    </section>
  </main>

  if (view === 'settings') return <main className="shell">
    <header className="topbar"><Brand compact /><button className="back-button" onClick={() => setView('menu')}>← Back to menu</button></header>
    <section className="settings-card">
      <h1>Personal settings</h1>
      <form className="name-form" onSubmit={saveUsername}>
        <label htmlFor="username">Player name</label>
        <input id="username" maxLength={16} minLength={2} onChange={(event) => setDraft(event.target.value)} required value={draft} />
        <span className="field-hint">2–16 characters</span>
        <button className="button button-primary" type="submit">Save name</button>
      </form>
    </section>
  </main>

  return <main className="shell menu-shell">
    <header className="topbar"><Brand compact /><button aria-label="Open personal settings" className="settings-button" onClick={() => { setDraft(username); setView('settings') }}>⚙<span>Settings</span></button></header>
    <section className="menu-content">
      <div className="hero-copy"><h1>Make room<br />for <span>one more.</span></h1></div>
      <div className="menu-actions" aria-label="Main menu">
        <button className="mode-card single-player" onClick={() => setNotice('Single-player is not available yet.')}><span className="mode-copy"><strong>1 Player</strong></span></button>
        <div className="mode-card disabled-card" aria-disabled="true"><span className="mode-copy"><strong>2 Players</strong></span><span className="coming-soon">Coming soon</span></div>
        <button className="secondary-card" onClick={() => setNotice('High scores are not available yet.')}>High Scores</button>
        {notice && <p className="notice menu-notice" role="status">{notice}</p>}
      </div>
    </section>
  </main>
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <a aria-label="Bricks home" className={`brand${compact ? ' brand-compact' : ''}`} href="#home" onClick={(event) => event.preventDefault()}>
    <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span><span>BRICKS<span className="brand-period">.</span></span>
  </a>
}

export default App
