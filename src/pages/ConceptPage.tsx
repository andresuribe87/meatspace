/**
 * /concept: the v0.1 industrial dispatch marketplace, kept working and labelled. Everything on this page is a
 * simulation: no hardware, no nodes, no money. A sticky ConceptBanner sits on every scroll position, the page sets
 * <meta name="robots" content="noindex"> while mounted, and the ticker, orderbook and console say SIMULATED.
 * The demo itself still talks to the v0.1 API (POST /v1/dispatch, WS /v1/stream).
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState, type MouseEvent } from 'react'

import { capability } from '../../shared/status'
import { SEED_NODES } from '../../shared/nodes'
import { buildPayload, defaultPayload, PRIMITIVE_IDS, primitiveForCategory } from '../../shared/primitives'
import type { HardwareNode, PrimitiveId } from '../../shared/types'
import { ArchitectureStrip } from '../components/ArchitectureStrip'
import { DispatchConsole } from '../components/DispatchConsole'
import { Orderbook } from '../components/Orderbook'
import { useNoindex } from '../lib/noindex'
import { Thesis } from '../components/Thesis'
import { ConceptBanner, Key, Lamp, Ruler, SectionHeader, useReducedMotion } from '../ds'
import { formatPayload } from '../lib/payload'
import { useNetwork } from '../lib/useNetwork'

export interface ConceptPageProps {
  onNavigate: (to: string) => void
}

function initialDrafts(): Record<PrimitiveId, string> {
  return Object.fromEntries(PRIMITIVE_IDS.map((p) => [p, formatPayload(defaultPayload(p, SEED_NODES))])) as Record<PrimitiveId, string>
}

/** Best-effort node_id extraction from the (possibly user-edited) JSON draft. */
function draftNodeId(draft: string): string | null {
  try {
    const v = JSON.parse(draft) as { node_id?: unknown }
    return typeof v.node_id === 'string' ? v.node_id : null
  } catch {
    return null
  }
}


const CARRIED: string[] = [
  'curl-first API, with the manual in plain text',
  'NDJSON event streams with stable error codes and honest HTTP status',
  'hard spend caps, lock quotas and per-network rate limits',
  'flags that say what is simulated, in every response',
]

/**
 * /concept: the v0.1 dispatch demo (ticker, console, orderbook, design ideas), intact and working against the
 * v0.1 API, behind a sticky CONCEPT banner and an honest preface.
 */
/** Under reduced motion the orderbook redraws at most this often; "Pause stream" stops it for everyone. */
const REDUCED_MOTION_EVERY_MS = 60_000

export function ConceptPage({ onNavigate }: ConceptPageProps) {
  useNoindex()
  const { snapshot: live, clockOffsetMs } = useNetwork()
  const hid = useId()
  const reduce = useReducedMotion()
  const [paused, setPaused] = useState(false)
  // What the page shows: the live snapshot, or a frozen one (paused, or reduced motion between minute updates).
  const [snapshot, setSnapshot] = useState(live)
  const lastShown = useRef(0)
  useEffect(() => {
    if (paused) return
    const now = Date.now()
    if (reduce && now - lastShown.current < REDUCED_MOTION_EVERY_MS) return
    lastShown.current = now
    setSnapshot(live)
  }, [live, paused, reduce])

  const [primitive, setPrimitive] = useState<PrimitiveId>('AERIAL_ISR_SORTIE')
  const [drafts, setDrafts] = useState<Record<PrimitiveId, string>>(initialDrafts)
  const [loadNonce, setLoadNonce] = useState(0)
  const consoleRef = useRef<HTMLDivElement>(null)

  /** [ TASK NODE ]: load the node's canonical payload into its primitive's tab and bring the console into view. */
  const taskNode = useCallback((node: HardwareNode) => {
    const p = primitiveForCategory(node.category)
    setPrimitive(p)
    setDrafts((d) => ({ ...d, [p]: formatPayload(buildPayload(node)) }))
    setLoadNonce((n) => n + 1)
    const el = consoleRef.current
    if (el) {
      const top = el.getBoundingClientRect().top
      const headerH = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0
      if (top < headerH || top > window.innerHeight * 0.5) {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
      }
    }
  }, [])

  const resetDraft = useCallback(() => {
    setDrafts((d) => ({ ...d, [primitive]: formatPayload(defaultPayload(primitive, SEED_NODES)) }))
    setLoadNonce((n) => n + 1)
  }, [primitive])

  const onDraftChange = useCallback((text: string) => setDrafts((d) => ({ ...d, [primitive]: text })), [primitive])
  const targetNodeId = useMemo(() => draftNodeId(drafts[primitive]), [drafts, primitive])

  /** Same-origin links route through the SPA on an unmodified left click (the banner's way back included). */
  const onLinkClick = (e: MouseEvent<HTMLElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const a = (e.target as HTMLElement).closest('a')
    const href = a?.getAttribute('href')
    if (!a || !href || !href.startsWith('/') || href.startsWith('//') || a.target || a.hasAttribute('download')) return
    if (/^\/(v1|install\.sh)(\/|$)/.test(href)) return
    e.preventDefault()
    onNavigate(href)
  }

  return (
    <div onClick={onLinkClick} className="min-w-0">
      {/* Sticky under the header on every scroll position at desktop sizes; on phones and short screens it scrolls away
          with the page (it must not cover the page or keyboard focus at 400% zoom). Content aligns to the page grid. */}
      <aside aria-label="Concept notice" className="concept-wrap">
        <ConceptBanner
          sticky={false}
          message={
            <>
              <span className="max-sm:hidden">concept // simulated // no hardware, no nodes, no money</span>
              <span className="sm:hidden">simulated</span>
            </>
          }
          backHref="/"
          backLabel={
            <>
              <span className="max-sm:hidden">Back to the real thing</span>
              <span className="sm:hidden">Home</span>
            </>
          }
        />
      </aside>

      <main id="main" className="page-wrap pt-[var(--s-7)] pb-[var(--s-9)]">
        <header aria-labelledby={hid}>
          <p className="ds-row">
            <Lamp status={capability('MS-CONCEPT').status} />
            <span className="t-legend">v0.1 · 2026-10-31 · kept for the record</span>
          </p>
          <h1 id={hid} className="t-h1 mt-[var(--s-4)] max-w-[22ch]">
            A dispatch API for idle industrial robots
          </h1>
          <div className="g10 mt-[var(--s-5)]">
            <div className="c-6 ds-stack">
              <p className="t-lede">
                v0.1 of meatspace.sh imagined drones, quadrupeds and CNC cells exposed as API endpoints that an agent could rent by the minute. We built the
                website and a simulator behind it. We did not build the network.
              </p>
              <p className="t-prose">
                Nothing on this page is a product. The nodes are fictional, the ticker numbers were invented, and the console runs a simulator: no machine
                moves and nothing is charged. The demo below still works, so you can see what was claimed and what was actually behind it.
              </p>
            </div>
            <div className="c-4 ds-stack">
              <p className="t-legend">why it is a concept now</p>
              <p className="t-prose">
                A marketplace needs supply, insurance and trust before it needs a website. We had a website. So we started over with the part we can prove
                from public data: how far a robot's twin is from the robot.
              </p>
              <span className="ds-row">
                <Key variant="primary" href="/reports">
                  Read the Twin Gap Reports
                </Key>
                <Lamp status={capability('MS-TGR-1').status} size="sm" />
              </span>
            </div>
          </div>
          <Ruler className="mt-[var(--s-6)]" />
        </header>

        <section aria-labelledby="concept-carried" className="mt-[var(--s-7)]">
          <div className="g10">
            <div className="c-4">
              <h2 id="concept-carried" className="t-legend">
                what carried over to v0.2
              </h2>
            </div>
            <ul className="c-6 grid gap-x-[var(--gutter)] gap-y-[var(--s-2)] sm:grid-cols-2">
              {CARRIED.map((c) => (
                <li key={c} className="t-ui border-t border-line pt-[var(--s-2)]">
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="concept-demo" className="mt-[var(--s-9)] max-md:mt-[var(--s-8)]">
          <SectionHeader
            id="concept-demo"
            eyebrow="the v0.1 demo, as it ran"
            title="Simulated end to end."
            description="The console and the orderbook still talk to the v0.1 API, now under /v1/concept. Every response carries sandbox: true. Styled as it ran in v0.1, syntax colours included; the rest of the site follows the v0.2 design system."
          />
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-[var(--s-3)] border border-line px-[var(--s-3)] py-[var(--s-2)]">
              <p className="t-caption max-w-[80ch]">
                The v0.1 header ran a live ticker of active nodes, flight hours and 24-hour volume. Those numbers were invented and are withdrawn, so the ticker
                is not shown.
              </p>
              <Key variant="secondary" size="sm" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
                {paused ? 'Resume stream' : 'Pause stream'}
              </Key>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
              <Thesis />
              <div ref={consoleRef} className="min-w-0 scroll-mt-[calc(var(--header-h)+64px)]">
                <DispatchConsole
                  primitive={primitive}
                  onPrimitiveChange={setPrimitive}
                  draft={drafts[primitive]}
                  onDraftChange={onDraftChange}
                  onReset={resetDraft}
                  loadNonce={loadNonce}
                />
              </div>
            </div>
            <Orderbook nodes={snapshot.nodes} targetNodeId={targetNodeId} onTaskNode={taskNode} clockOffsetMs={clockOffsetMs} />
            <ArchitectureStrip />
          </div>
        </section>
      </main>
    </div>
  )
}
