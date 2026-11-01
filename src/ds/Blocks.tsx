import type { ReactNode } from 'react'

import { CAPABILITIES, type Capability, type LampWord } from '../../shared/status'
import { Key } from './Key'
import { Lamp } from './Lamp'
import { Table } from './Table'

/** Skip link: the first focusable element on every page. Visible on keyboard focus only. */
export function SkipLink({ href = '#main', children = 'Skip to content' }: { href?: string; children?: ReactNode }) {
  return (
    <a className="skip-link" href={href}>
      {children}
    </a>
  )
}

export interface StatusLineItem {
  label: ReactNode
  /** A count (<Num prov=…>, built from lab/reports at deploy) or a lifecycle word ("planned"). */
  value: ReactNode
  /** Lifecycle words print lower case in fg; counts print in the terminal face. */
  word?: boolean
  /** Dropped on phones (only reports, refused and real cell stay). */
  hideOnPhone?: boolean
}

/**
 * C-12 Status line: the static facts bar that replaced the ticker. Built at deploy from files:
 * `REPORTS n | REFUSED n | HELD-OUT EPISODES n | TWIN TRIALS planned | REAL CELL waitlist | UPDATED date`.
 * No LIVE dot, no traction numbers, nothing ticks. A visually hidden "Status:" prefix names it.
 */
export function StatusLine({ items, className = '' }: { items: StatusLineItem[]; className?: string }) {
  return (
    <div className={`sline ${className}`}>
      <span className="sr">Status: </span>
      {items.map((it, i) => (
        <span key={i} className={it.hideOnPhone ? 'hide-sm' : undefined}>
          {it.label} {it.word ? <i>{it.value}</i> : <b>{it.value}</b>}
        </span>
      ))}
    </div>
  )
}

/** C-14 Capability ledger: part number · name · lifecycle lamp · one muted scope line. Defaults to shared/status.ts CAPABILITIES. */
export function Ledger({ items = CAPABILITIES, label = 'Capabilities' }: { items?: readonly Capability[]; label?: string }) {
  return (
    <div className="cq">
      <ul className="ledger" aria-label={label}>
        {items.map((c) => (
          <li key={c.part}>
            <span className="pn">{c.part}</span>
            <span className="nm">{c.name}</span>
            <Lamp status={c.status} size="sm" />
            <span className="sc">{c.scope}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export interface ChainStep {
  /** "01 measure · MS-TGR-1" */
  index: ReactNode
  status: LampWord
  title: ReactNode
  /** Sans body with the bold status sentence. */
  body: ReactNode
}

/** C-19 Signal chain: 3 compartments joined by ▶ connectors (▼ under a 760px container). */
export function SignalChain({ steps, label = 'Signal chain' }: { steps: ChainStep[]; label?: string }) {
  return (
    <div className="cq">
      <ol className="chain" aria-label={label}>
        {steps.map((s, i) => (
          <li key={i}>
            <div className="st">
              <span className="idx">{s.index}</span>
              <Lamp status={s.status} size="sm" />
            </div>
            <h4>{s.title}</h4>
            <p>{s.body}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}

/**
 * C-16 Concept banner: sticky, full width, amber rules over a 135° hatch, a lit CONCEPT lamp,
 * `concept // simulated // no hardware, no nodes, no money` and a way back. /concept only, every scroll position.
 */
export function ConceptBanner({
  message = 'concept // simulated // no hardware, no nodes, no money',
  backHref = '/',
  backLabel = 'Back to the real thing',
  sticky = true,
}: {
  message?: ReactNode
  backHref?: string
  backLabel?: ReactNode
  sticky?: boolean
}) {
  return (
    <div className={`concept ${sticky ? 'concept--sticky' : ''}`} role="note" aria-label="Concept">
      <Lamp status="CONCEPT" lit />
      <span className="msg">{message}</span>
      <Key variant="ghost" size="sm" href={backHref}>
        {backLabel}
      </Key>
    </div>
  )
}

export interface Revision {
  rev: string
  date: string
  /** Withdrawals in plain words. Never restate withdrawn numbers. */
  change: ReactNode
}

/** C-22 Revision table: rev · date · change. Records what changed, including what was withdrawn. */
export function RevisionTable({ rows, label = 'Revisions' }: { rows: Revision[]; label?: string }) {
  return (
    <Table
      label={label}
      className="rev"
      rows={rows}
      rowKey={(r) => r.rev}
      columns={[
        { key: 'rev', header: 'rev', cell: (r) => r.rev },
        { key: 'date', header: 'date', cell: (r) => r.date },
        { key: 'change', header: 'change', wrap: true, cell: (r) => r.change },
      ]}
    />
  )
}

export interface IntervalMeterProps {
  value: number
  lo: number
  hi: number
  min?: number
  max?: number
  /** Series colour of the band and point: a channel, or text (fg). */
  channel?: 'real' | 'stock' | 'cal'
  /** Accessible reading, e.g. "calibrated twin 72% [65, 78], n = 200". */
  label: string
  className?: string
}

/** Interval meter: hairline track, CI band (series colour at 35%), 8px square point estimate. */
export function IntervalMeter({ value, lo, hi, min = 0, max = 1, channel = 'real', label, className = '' }: IntervalMeterProps) {
  const x = (v: number) => ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * 100
  return (
    <span className={`imeter im--${channel} ${className}`} role="img" aria-label={label}>
      <span className="im-track" />
      <span className="im-band" style={{ left: `${x(lo)}%`, width: `${Math.max(0, x(hi) - x(lo))}%` }} />
      <span className="im-pt" style={{ left: `${x(value)}%` }} />
    </span>
  )
}
