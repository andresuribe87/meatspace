/** 404, in the system: what was asked for, where to go, and how to ask the API what exists. */
import { useId } from 'react'

import { CodeBlock, Key, Ruler } from '../../ds'
import { useNoindex } from '../../lib/noindex'
import { linkHandler } from '../../lib/router'

export function NotFoundPage({ path, onNavigate }: { path: string; onNavigate: (to: string) => void }) {
  const hid = useId()
  const go = linkHandler(onNavigate)
  useNoindex()
  return (
    <main id="main" className="page-wrap flex-1 pt-[var(--s-8)] pb-[var(--s-9)]" aria-labelledby={hid}>
      <p className="t-legend">
        GET <span className="normal-case">{path}</span>
      </p>
      <h1 id={hid} className="t-h1 mt-[var(--s-3)] text-balance">
        404 // no such path.
      </h1>
      <Ruler className="mt-[var(--s-5)]" />
      <div className="g10 mt-[var(--s-6)]">
        <div className="c-5 ds-stack">
          <p className="t-lede">Nothing lives at this address. Try the reports, or ask the API what exists.</p>
          <div className="ds-row">
            <Key variant="primary" href="/" onClick={go}>
              Home
            </Key>
            <Key variant="secondary" href="/reports" onClick={go}>
              Read the reports
            </Key>
          </div>
        </div>
        <div className="c-5">
          <CodeBlock title={<>shell · <b>GET /v1</b></>} code="curl -s https://meatspace.sh/v1 | jq '.endpoints[] | {method, path, status}'" what="API index command" />
        </div>
      </div>
    </main>
  )
}
