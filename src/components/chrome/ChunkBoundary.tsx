/**
 * Error boundary around a routed page. A lazy page whose chunk is gone (a tab left open across a deploy: Workers
 * static assets drop the old hashed files) would otherwise blank the whole app. On a chunk-load error it reloads once
 * (guarded by a sessionStorage flag, so a real outage cannot loop) and otherwise shows a panel that says what failed.
 */
import { Component, type ReactNode } from 'react'

import { Callout, Key } from '../../ds'
import { isChunkError, reloadOnce } from '../../lib/chunkReload'

interface State {
  error: unknown
}

/** Mount it with `key={path}`: a new route gets a fresh boundary (and a fresh try). */
export class ChunkBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: unknown): State {
    return { error }
  }

  componentDidCatch(error: unknown) {
    if (isChunkError(error)) reloadOnce()
  }

  render() {
    if (!this.state.error) return this.props.children
    const chunk = isChunkError(this.state.error)
    return (
      <main id="main" className="page-wrap pt-[var(--s-8)] pb-[var(--s-9)]">
        <div className="max-w-[72ch] ds-stack">
          <h1 className="t-h1">{chunk ? 'This page was updated.' : 'This page failed to render.'}</h1>
          <Callout register="note" source={this.state.error instanceof Error ? this.state.error.message : String(this.state.error)}>
            {chunk
              ? 'meatspace.sh was deployed while this tab was open, and the code for this page is no longer served. Reload to get the current version.'
              : 'Something in this page threw while rendering. Reloading may help; the reports and the API are not affected.'}
          </Callout>
          <div className="ds-row">
            <Key variant="primary" onClick={() => window.location.reload()}>
              Reload
            </Key>
            <Key variant="secondary" href="/">
              Home
            </Key>
          </div>
        </div>
      </main>
    )
  }
}
