/** Daemon quick-install block (Zone B, left column). Copy = the command only: no comment, no prompt. */
import { ArrowUpRight } from 'lucide-react'
import { Fragment } from 'react'

import { CopyButton } from './ui'

/** v0.1 showed this with sudo and a "register with the clearinghouse" line. Both are gone: the script is inert and needs no root. */
export const INSTALL_COMMENT = '# meatspaced was never released: this script prints a dry run and exits'
export const INSTALL_COMMAND = 'curl -sSL https://meatspace.sh/install.sh | sh'

export function InstallSnippet({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      <div className="border border-line bg-bg">
        <div className="flex min-h-9 items-center justify-between gap-3 border-b border-line py-1 pr-1 pl-3">
          <h2 className="text-[11px] font-medium tracking-[0.14em] text-muted">INSTALL // meatspaced // NOT RELEASED</h2>
          <CopyButton text={INSTALL_COMMAND} ariaLabel="install command" />
        </div>
        <pre className="px-3 py-3 text-xs leading-relaxed whitespace-pre-wrap sm:text-[13px]">
          <code className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-[1ch]">
            <span className="col-span-2 text-muted wrap-anywhere">{INSTALL_COMMENT}</span>
            <span className="text-muted select-none" aria-hidden="true">
              $
            </span>
            <span className="text-fg">
              {/* Break only between shell words: a wrap inside "--protocol=..." would misread as two arguments. */}
              {INSTALL_COMMAND.split(' ').map((word, i) => (
                <Fragment key={i}>
                  {i > 0 ? ' ' : null}
                  <span className="whitespace-nowrap">{word}</span>
                </Fragment>
              ))}
            </span>
          </code>
        </pre>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        <a
          href="/install.sh"
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-0.5 text-fg underline decoration-line underline-offset-[3px] hover:text-emerald hover:decoration-emerald"
        >
          inspect install.sh
          <ArrowUpRight size={12} strokeWidth={2} aria-hidden="true" />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        <span aria-hidden="true"> · </span>
        <span>prints a dry run and exits; no changes are made</span>
      </p>
    </div>
  )
}
