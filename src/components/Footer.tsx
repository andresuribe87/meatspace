/** Site footer: identity, sandbox disclosure and plain links. */
import type { MouseEvent, ReactNode } from 'react'

import { REPO_URL, VERSION } from '../../shared/constants'
import type { WaitlistKind } from '../../shared/types'

export interface FooterProps {
  onNavigate: (to: string) => void
  onOpenPanel: (kind: WaitlistKind) => void
}


/** `[ label ]` as a real link. Case is left as written so endpoint names (install.sh) stay literal. */
function BracketLink({ href, children, onClick, external }: { href: string; children: ReactNode; onClick?: (e: MouseEvent<HTMLAnchorElement>) => void; external?: boolean }) {
  return (
    <a
      href={href}
      onClick={onClick}
      {...(external ? { target: '_blank', rel: 'noopener' } : {})}
      className="inline-flex items-center gap-1.5 px-2 py-1 tracking-wider whitespace-nowrap text-muted hover:text-fg"
    >
      <span aria-hidden="true">[</span>
      <span>{children}</span>
      <span aria-hidden="true">]</span>
      {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </a>
  )
}

export function Footer({ onNavigate }: FooterProps) {
  const onDocs = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    onNavigate('/docs')
  }

  return (
    <footer className="border-t border-line">
      {/* Phones: stacked. sm..xl: identity + disclosure on the left, links on the right. xl+: one row. DOM order = reading order throughout. */}
      <div className="mx-auto flex max-w-[1600px] flex-col gap-x-6 gap-y-1.5 px-4 py-3 text-xs text-muted sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6 xl:flex xl:flex-row xl:justify-between">
        <p className="whitespace-nowrap sm:col-start-1 sm:row-start-1">
          <span className="text-fg">meatspace.sh</span> // stdout to reality.
        </p>
        <p className="sm:col-start-1 sm:row-start-2 xl:text-center">v{VERSION} sandbox — hardware, settlement and attestation are simulated.</p>
        <nav aria-label="Footer" className="-mx-2 sm:col-start-2 sm:row-span-2 sm:row-start-1">
          <ul className="flex flex-wrap items-center">
            <li>
              <BracketLink href="/docs" onClick={onDocs}>
                DOCS
              </BracketLink>
            </li>
            <li>
              <BracketLink href="/install.sh">install.sh</BracketLink>
            </li>
            <li>
              <BracketLink href={REPO_URL} external>
                GITHUB
              </BracketLink>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  )
}
