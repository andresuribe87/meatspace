/**
 * Zone A: status bar. Brand | live ticker | [ DOCS ] [ CONNECT HARDWARE (meatspaced) ] [ API KEYS ].
 *
 * >= 1600px: one row (the full ticker only fits beside the brand and buttons from there). Narrower: brand + buttons,
 * then the ticker on its own full-width row. Phones: the buttons wrap under the brand and the bar scrolls away;
 * from sm up it is sticky (its height is --header-h in index.css).
 * The ticker crawls (marquee) only when its slot is narrower than the text, so it never overflows;
 * hovering pauses it and prefers-reduced-motion stops it as a static line clipped at the slot edge.
 */
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type Ref } from 'react'

import { VERSION } from '../../shared/constants'
import { tickerFields, tickerText, type TickerField } from '../../shared/format'
import type { NetworkStats, WaitlistKind } from '../../shared/types'
import type { Route } from '../lib/router'
import type { ConnectionState } from '../lib/useNetwork'
import { BracketButton } from './ui'

export interface StatusBarProps {
  stats: NetworkStats
  connection: ConnectionState
  route: Route
  onNavigate: (to: string) => void
  onOpenPanel: (kind: WaitlistKind) => void
}

const FLASH_MS = 600

/** Value that turns emerald for a hard 600 ms whenever it changes (no easing). */
function TickerValue({ value }: { value: string }) {
  const [hot, setHot] = useState(false)
  const prev = useRef(value)
  useEffect(() => {
    if (prev.current === value) return
    prev.current = value
    setHot(true)
    const t = window.setTimeout(() => setHot(false), FLASH_MS)
    return () => window.clearTimeout(t)
  }, [value])
  return <span className={`tabular transition-none ${hot ? 'text-emerald' : 'text-fg'}`}>{value}</span>
}

const Sep = () => <span className="whitespace-pre text-muted"> | </span>

function TickerLine({ fields, lineRef }: { fields: TickerField[]; lineRef?: Ref<HTMLSpanElement> }) {
  return (
    <span ref={lineRef} className="inline-flex shrink-0 whitespace-pre">
      {fields.map((f, i) => (
        <Fragment key={f.key}>
          {i > 0 ? <Sep /> : null}
          <span className="text-muted">{f.label}: </span>
          <TickerValue value={f.value} />
        </Fragment>
      ))}
    </span>
  )
}

const CONNECTION: Record<ConnectionState, { glyph: string; label: string; tone: string; title: string }> = {
  live: { glyph: '●', label: 'LIVE', tone: 'text-emerald', title: 'live stream connected' },
  connecting: { glyph: '○', label: 'SYNC', tone: 'text-amber', title: 'connecting to live stream' },
  reconnecting: { glyph: '○', label: 'SYNC', tone: 'text-amber', title: 'reconnecting to live stream' },
  offline: { glyph: '○', label: 'OFFLINE', tone: 'text-muted', title: 'browser is offline' },
}

function ConnectionIndicator({ connection }: { connection: ConnectionState }) {
  const c = CONNECTION[connection]
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap ${c.tone}`} title={c.title}>
      <span aria-hidden="true">{c.glyph}</span>
      <span className="sr-only">network stream: </span>
      <span>{c.label}</span>
    </span>
  )
}

function Ticker({ stats, connection }: { stats: NetworkStats; connection: ConnectionState }) {
  const fields = tickerFields(stats)
  const viewportRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLSpanElement>(null)
  const [crawl, setCrawl] = useState(false)

  // Crawl only when the static line does not fit its slot (re-measured on resize / font load).
  useLayoutEffect(() => {
    const viewport = viewportRef.current
    const line = lineRef.current
    if (!viewport || !line) return
    const measure = () => setCrawl(line.offsetWidth > viewport.clientWidth + 1)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(viewport)
    ro.observe(line)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="flex h-full min-w-0 items-center gap-3 text-[11px] leading-none">
      <ConnectionIndicator connection={connection} />
      <div aria-hidden="true" className="h-3 w-px shrink-0 bg-line" />
      {/* Screen readers get the whole ticker once, as plain text; the moving copy is hidden and nothing is aria-live. */}
      <span className="sr-only">{tickerText(stats)}</span>
      <div ref={viewportRef} aria-hidden="true" className="min-w-0 flex-1 overflow-hidden">
        <div className={crawl ? 'ticker-track hover:[animation-play-state:paused]' : 'flex justify-center'}>
          <TickerLine fields={fields} lineRef={lineRef} />
          {crawl ? (
            <>
              <span className="motion-reduce:hidden">
                <Sep />
              </span>
              <span className="inline-flex motion-reduce:hidden">
                <TickerLine fields={fields} />
                <Sep />
              </span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function StatusBar({ stats, connection, route, onNavigate, onOpenPanel }: StatusBarProps) {
  const onBrand = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    onNavigate('/')
  }
  const onDocs = route === '/docs'

  return (
    <header className="border-b border-line bg-bg sm:sticky sm:top-0 sm:z-40">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 px-4 sm:px-6 min-[1600px]:h-10 min-[1600px]:flex-nowrap">
        <a
          href="/"
          onClick={onBrand}
          className="flex h-9 shrink-0 items-center text-xs whitespace-nowrap sm:h-10"
        >
          <span className="font-semibold text-fg">meatspace.sh</span>
          <span className="whitespace-pre text-muted"> // v{VERSION}</span>
        </a>

        <div className="order-last -mx-4 h-7 w-[calc(100%+2rem)] border-t border-line px-4 sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6 min-[1600px]:order-none min-[1600px]:mx-0 min-[1600px]:h-full min-[1600px]:w-auto min-[1600px]:min-w-0 min-[1600px]:flex-1 min-[1600px]:border-t-0 min-[1600px]:px-0">
          <Ticker stats={stats} connection={connection} />
        </div>

        <nav
          aria-label="Primary"
          className="-mx-2 flex w-[calc(100%+1rem)] shrink-0 flex-wrap items-center gap-y-0.5 pb-1 sm:-mr-2 sm:ml-auto sm:w-auto sm:flex-nowrap sm:justify-end sm:gap-1 sm:pb-0"
        >
          <BracketButton
            onClick={() => onNavigate('/docs')}
            aria-current={onDocs ? 'page' : undefined}
            className={onDocs ? 'text-emerald!' : ''}
          >
            DOCS
          </BracketButton>
          <BracketButton onClick={() => onOpenPanel('hardware')} aria-haspopup="dialog">
            CONNECT HARDWARE (<span className="normal-case">meatspaced</span>)
          </BracketButton>
          <BracketButton onClick={() => onOpenPanel('api_keys')} aria-haspopup="dialog">
            API KEYS
          </BracketButton>
        </nav>
      </div>
    </header>
  )
}
