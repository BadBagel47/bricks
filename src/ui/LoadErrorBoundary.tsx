import { Component } from 'react'
import type { ReactNode } from 'react'

/** B-040: a part of the game that cannot be loaded shows a short message instead of a black screen. */
export class LoadErrorBoundary extends Component<{ children: ReactNode; onBack: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (!this.state.failed) return this.props.children
    return <main className="shell load-error">
      <section className="overlay-card" role="alert">
        <h1>Could not load 2 Players</h1>
        <p>Check the connection and try again.</p>
        <button className="button button-primary" type="button" onClick={() => location.reload()}>Try again</button>
        <button className="overlay-link" type="button" onClick={() => { this.setState({ failed: false }); this.props.onBack() }}>Main menu</button>
      </section>
    </main>
  }
}
