import type { ReactNode } from 'react'

export function SubpageBar({ title, onBack, disabled = false, heading = true }: { title: ReactNode; onBack: () => void; disabled?: boolean; heading?: boolean }) {
  return <header className="topbar subpage-bar">
    <button className="icon-back" aria-label="Back to menu" disabled={disabled} onClick={onBack} type="button">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
    </button>
    {heading ? <h1 className="subpage-title" tabIndex={-1}>{title}</h1> : <span className="subpage-title">{title}</span>}
  </header>
}
