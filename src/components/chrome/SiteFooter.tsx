/** v0.2 site footer: identity, one honest status sentence, plain links (Concept and Design live here, not in the nav). */
import { REPO_URL, VERSION } from '../../../shared/constants'
import { Key } from '../../ds'
import { linkHandler } from '../../lib/router'

const LINKS: readonly [label: string, href: string][] = [
  ['Reports', '/reports'],
  ['Cells', '/cells'],
  ['Power', '/power'],
  ['Docs', '/docs'],
  ['Concept', '/concept'],
  ['Design', '/design'],
]

export function SiteFooter({ onNavigate }: { onNavigate: (to: string) => void }) {
  const go = linkHandler(onNavigate)
  return (
    <footer className="mt-auto border-t border-line">
      <div className="page-wrap grid grid-cols-1 gap-[var(--s-4)] py-[var(--s-6)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] lg:gap-[var(--s-5)]">
        <p className="t-ui">
          <b className="font-semibold">meatspace.sh</b> <span className="muted">// stdout to reality.</span>
        </p>
        <p className="t-caption">v{VERSION}. Reports are real. Twin trials and the real cell are not built yet. /concept is a simulation.</p>
        <nav aria-label="Footer">
          {/* One row from lg up; a 4-column grid below, so no link is left alone on a row. */}
          <ul className="grid grid-cols-4 justify-items-start gap-x-[4px] gap-y-[2px] lg:flex lg:flex-nowrap lg:justify-end">
            {LINKS.map(([label, href]) => (
              <li key={href}>
                <Key variant="ghost" size="sm" href={href} onClick={go}>
                  {label}
                </Key>
              </li>
            ))}
            <li>
              <Key variant="ghost" size="sm" href={REPO_URL} rel="noopener">
                GitHub
              </Key>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  )
}
