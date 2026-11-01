/**
 * /concept, left column of the v0.1 demo: the v0.1 hero kept as written (tagline, the 2-sentence value proposition),
 * a withdrawal note under it, the API synopsis of the simulator and the inert daemon install line.
 * The page's H1 belongs to /concept, so the old tagline is an h2 here.
 */
import { InstallSnippet } from './InstallSnippet'

/** man(1)-style synopsis of the calls an agent actually makes. GET rows link to the live JSON / man page. */
const SYNOPSIS: readonly { method: string; path: string; what: string; href?: string }[] = [
  { method: 'GET', path: '/v1/concept/nodes', what: 'list the fictional nodes (simulated)', href: '/v1/concept/nodes' },
  { method: 'POST', path: '/v1/concept/dispatch', what: 'run the simulator: validate, price, compile, hash; nothing moves' },
  { method: 'WS', path: '/v1/concept/stream', what: 'simulated orderbook and ticker' },
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
        <p className="t-legend">original copy, v0.1, kept as written</p>
        <hgroup className="space-y-3">
          {/* Sized to the column (cqi) so "stdout to reality." + cursor sit on one line wherever they can; on phones it breaks before "reality.". */}
          <h2 id="thesis-title" className="text-[clamp(2.25rem,8.8cqi,4rem)] leading-[1.05] font-semibold tracking-tight text-fg">
            stdout to{' '}
            <span className="whitespace-nowrap">
              reality.
              <span
                aria-hidden="true"
                className="cursor-blink ml-[0.12em] inline-block h-[0.82em] w-[0.5em] translate-y-[0.06em] bg-emerald align-baseline"
              />
            </span>
          </h2>
          <p className="text-sm text-muted sm:text-base">dispatch tasks to physical hardware.</p>
        </hgroup>
        <blockquote className="t-prose max-w-[62ch] border-l-2 border-edge pl-4">
          Autonomous hardware sits idle in proprietary silos for most of its lifecycle, while software agents have zero native way to discover, rent, or
          task physical machines across vendor boundaries. <code>meatspace.sh</code> exposes idle robots and autonomous fleets as pay-per-minute API
          endpoints, handling cross-vendor command translation, safety sandboxing, and cryptographic proof of execution in a single call.
        </blockquote>
        <p className="t-caption max-w-[62ch]">
          <b>Withdrawn.</b> None of this was built: no robots, no operators, no payments. &ldquo;Cryptographic proof of execution&rdquo; meant hardware
          attestation, which we never had.
        </p>
      </div>
      <Synopsis />
      <InstallSnippet className="mt-auto" />
    </section>
  )
}
