/** Zone B, left column: tagline, the exact 2-sentence value proposition, API synopsis, daemon quick-install. */
import { InstallSnippet } from './InstallSnippet'

/** man(1)-style synopsis of the calls an agent actually makes. GET rows link to the live JSON / man page. */
const SYNOPSIS: readonly { method: string; path: string; what: string; href?: string }[] = [
  { method: 'GET', path: '/v1/nodes', what: 'discover idle hardware across vendors', href: '/v1/nodes' },
  { method: 'POST', path: '/v1/dispatch', what: 'task a node; stream proof of execution' },
  { method: 'WS', path: '/v1/stream', what: 'live orderbook + network telemetry' },
  { method: 'GET', path: '/docs', what: 'man meatspace', href: '/docs' },
]

function Synopsis() {
  return (
    <section aria-labelledby="synopsis-title" className="space-y-2">
      <h2 id="synopsis-title" className="text-[11px] font-medium tracking-[0.14em] text-muted uppercase">
        Synopsis
      </h2>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-xs @md:grid-cols-[3.5rem_9rem_minmax(0,1fr)]">
        {SYNOPSIS.map((r) => (
          <div key={r.method + r.path} className="contents">
            <dt className="text-muted">{r.method}</dt>
            <dd className="text-fg">
              {r.href ? (
                <a href={r.href} className="underline decoration-line underline-offset-4 hover:text-emerald hover:decoration-emerald">
                  {r.path}
                </a>
              ) : (
                r.path
              )}
            </dd>
            <dd className="col-start-2 text-muted @md:col-start-3">{r.what}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function Thesis() {
  return (
    <section aria-labelledby="thesis-title" className="@container flex h-full min-w-0 flex-col gap-8 border border-line bg-bg px-4 py-6 sm:px-8 sm:py-8">
      <div className="space-y-5">
        <hgroup className="space-y-3">
          {/* Sized to the column (cqi) so "stdout to reality." + cursor sit on one line wherever they can; on phones it breaks before "reality.". */}
          <h1 id="thesis-title" className="text-[clamp(2.25rem,8.8cqi,4rem)] leading-[1.05] font-semibold tracking-tight text-fg">
            stdout to{' '}
            <span className="whitespace-nowrap">
              reality.
              <span
                aria-hidden="true"
                className="cursor-blink ml-[0.12em] inline-block h-[0.82em] w-[0.5em] translate-y-[0.06em] bg-emerald align-baseline"
              />
            </span>
          </h1>
          <p className="text-sm text-muted sm:text-base">dispatch tasks to physical hardware.</p>
        </hgroup>
        <p className="max-w-[62ch] font-sans text-[15px] leading-[1.7] text-fg/90 sm:text-base">
          Autonomous hardware sits idle in proprietary silos for most of its lifecycle, while software agents have zero native way to
          discover, rent, or task physical machines across vendor boundaries. <code className="font-mono text-[0.92em] text-emerald">meatspace.sh</code>{' '}
          exposes idle robots and autonomous fleets as pay-per-minute API endpoints, handling cross-vendor command translation, safety
          sandboxing, and cryptographic proof of execution in a single call.
        </p>
      </div>
      <Synopsis />
      <InstallSnippet className="mt-auto" />
    </section>
  )
}
