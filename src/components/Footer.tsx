/** Site footer (v0.2): identity, one honest status sentence, plain links. Same copy on every route. */
import type { MouseEvent } from 'react'

import { REPO_URL, VERSION } from '../../shared/constants'
import type { WaitlistKind } from '../../shared/types'
import { Key } from '../ds'

export interface FooterProps {
  onNavigate: (to: string) => void
  /** @deprecated v0.1 waitlist panels; unused since the v0.2 request dialogs. Kept so old call sites compile. */
  onOpenPanel?: (kind: WaitlistKind) => void
}

const LINKS: readonly [label: string, href: string][] = [
  ['Reports', '/reports'],
  ['Cells', '/cells'],
  ['Docs', '/docs'],
  ['Concept', '/concept'],
  ['Design', '/design'],
]

export function Footer({ onNavigate }: FooterProps) {
  const go = (to: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    onNavigate(to)
  }
  return (
    <footer className="border-t border-line">
      <div className="page-wrap flex flex-col gap-[var(--s-3)] py-[var(--s-5)] lg:flex-row lg:items-center lg:justify-between">
        <div className="t-ui ds-stack [&>*+*]:mt-[var(--s-1)]">
          <p>
            <b>meatspace.sh</b> <span className="muted">// stdout to reality.</span>
          </p>
          <p className="muted">v{VERSION}. Reports are real. Twin trials and the real cell are not built yet. /concept is a simulation.</p>
        </div>
        <nav aria-label="Footer">
          <ul className="ds-row">
            {LINKS.map(([label, href]) => (
              <li key={href}>
                <Key variant="ghost" size="sm" href={href} onClick={go(href)}>
                  {label}
                </Key>
              </li>
            ))}
            <li>
              <Key variant="ghost" size="sm" href={REPO_URL} target="_blank" rel="noopener">
                GitHub<span className="sr"> (opens in a new tab)</span>
              </Key>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  )
}
