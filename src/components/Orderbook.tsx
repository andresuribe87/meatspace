/**
 * Zone C: live hardware orderbook. Dense, client-side filtered table of the nodes in the latest snapshot.
 * [ TASK NODE ] hands the node to App, which loads its canonical payload into the dispatch console.
 *
 * Layout is fixed-width wherever live values change (charge %, status tag, lock countdown) so a new
 * snapshot never shifts columns. Narrow windows scroll the table inside its own container, never the page,
 * with ACTION frozen on the right; from sm up NODE_ID is also frozen on the left (phones keep only ACTION
 * frozen, so the scroll window between the two stays wide enough to read).
 */
import { Fragment, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'

import { TASK_LOCK_MS } from '../../shared/constants'
import { canonicalChargeFloorPct } from '../../shared/dispatch'
import { formatCoords, formatRate } from '../../shared/format'
import { CATEGORY_FILTERS } from '../../shared/nodes'
import type { Category, HardwareNode } from '../../shared/types'
import { BracketButton, Meter, Panel, StatusTag } from './ui'

export interface OrderbookProps {
  nodes: HardwareNode[]
  /** node_id currently loaded in the dispatch console (highlight that row). */
  targetNodeId: string | null
  /** [ TASK NODE ] handler. */
  onTaskNode: (node: HardwareNode) => void
  /** Server clock minus client clock (ms), so lock countdowns run on server time. */
  clockOffsetMs: number
}

type FilterId = 'ALL' | Category

/** Header copy, verbatim from the handoff (including its spacing). */
const COLUMNS: readonly { label: string; align: 'left' | 'right' }[] = [
  { label: 'NODE_ID', align: 'left' },
  { label: 'CHASSIS_CLASS', align: 'left' },
  { label: 'INTERFACE', align: 'left' },
  { label: 'COORDINATES /SECTOR', align: 'left' },
  { label: 'PAYLOAD / SENSORS', align: 'left' },
  { label: 'BATTERY / DUTY', align: 'left' },
  { label: 'SPOT_RATE', align: 'right' },
  { label: 'ACTION', align: 'right' },
]

/** Clamping to the server's lock length keeps client clock skew from showing nonsense. */
const MAX_LOCK_S = TASK_LOCK_MS / 1000

/** 8px gutters: with CHASSIS_CLASS and PAYLOAD / SENSORS wrapping, the full row fits a 1280px window, scrollbar included. */
const CELL = 'border-b border-line px-2 py-1.5 align-middle'
/** One width for [ TASK NODE ] and [ LOCKED 30s ], so the frozen ACTION column never resizes. */
const ACTION_BUTTON = 'w-[7.5rem] justify-center px-1!'

/** Clock resolution: the lock countdown is at most ~2 x CLOCK_MS behind the true remaining time. */
const CLOCK_MS = 250

const subscribeClock = (onTick: () => void) => {
  const id = window.setInterval(onTick, CLOCK_MS)
  return () => window.clearInterval(id)
}
const subscribeNothing = () => () => {}
/** Epoch ms quantised to CLOCK_MS, so repeated reads within one render agree. */
const readClock = () => Math.floor(Date.now() / CLOCK_MS) * CLOCK_MS

/** Wall clock read on every render; additionally ticks every CLOCK_MS while `active` (some node is TASKED). */
function useLockClock(active: boolean): number {
  return useSyncExternalStore(active ? subscribeClock : subscribeNothing, readClock)
}

function lockSeconds(node: HardwareNode, now: number): number | null {
  if (node.taskedUntil === null) return null
  return Math.min(MAX_LOCK_S, Math.max(0, Math.ceil((node.taskedUntil - now) / 1000)))
}

/** Same rule the API applies: not locked, and enough charge for the canonical payload [ TASK NODE ] loads. */
function isDispatchable(node: HardwareNode): boolean {
  return node.status !== 'TASKED' && node.charge >= canonicalChargeFloorPct(node)
}

/** Emerald = nominal telemetry; amber = tasked, charging or below the charge its canonical payload needs. */
function chargeTone(node: HardwareNode): 'emerald' | 'amber' {
  return node.status === 'TASKED' || node.status === 'CHARGING' || node.charge < canonicalChargeFloorPct(node) ? 'amber' : 'emerald'
}

/** AVAILABLE + CHARGING + TASKED = NODES: below its floor a node is always on charge (the drift model sends it there). */
function summary(nodes: readonly HardwareNode[]): string[] {
  let available = 0
  let charging = 0
  let tasked = 0
  for (const n of nodes) {
    if (n.status === 'TASKED') tasked++
    else if (isDispatchable(n)) available++
    else charging++
  }
  const parts = [`${nodes.length} NODES`, `${available} AVAILABLE`]
  if (charging > 0) parts.push(`${charging} CHARGING`)
  parts.push(`${tasked} TASKED`)
  return parts
}

export function Orderbook({ nodes, targetNodeId, onTaskNode, clockOffsetMs }: OrderbookProps) {
  const [filter, setFilter] = useState<FilterId>('ALL')

  const counts = useMemo(() => {
    const c: Record<FilterId, number> = { ALL: nodes.length, AERIAL: 0, GROUND: 0, MANIPULATOR: 0 }
    for (const n of nodes) c[n.category]++
    return c
  }, [nodes])

  // Dataset order is kept as-is: rows never reorder between snapshots.
  const visible = useMemo(() => (filter === 'ALL' ? nodes : nodes.filter((n) => n.category === filter)), [nodes, filter])
  const now = useLockClock(nodes.some((n) => n.status === 'TASKED')) + clockOffsetMs
  const filterLabel = CATEGORY_FILTERS.find((f) => f.id === filter)?.label ?? 'All'

  // Whether the table is wider than its container (phones / narrow windows): shows the frozen-column rule and scroll hint.
  const scrollRef = useRef<HTMLDivElement>(null)
  const [overflowing, setOverflowing] = useState(false)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setOverflowing(el.scrollWidth > el.clientWidth + 1))
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    return () => ro.disconnect()
  }, [])
  const frozenRule = overflowing ? 'border-r-transparent sm:border-r-line' : 'border-r-transparent'
  /** Left rule of the frozen ACTION column, so [ TASK NODE ] stays reachable on phones without scrolling sideways. */
  const actionRule = overflowing ? 'border-l-line' : 'border-l-transparent'

  return (
    <Panel
      id="orderbook"
      title={
        <>
          LIVE HARDWARE ORDERBOOK // <span className="whitespace-nowrap normal-case">WS /v1/stream</span>
        </>
      }
      actions={
        <>
          {/* Wraps only between segments, never inside "9 AVAILABLE". */}
          <span className="mr-2 text-[11px] text-muted tabular">
            {summary(visible).map((part, i) => (
              <Fragment key={part}>
                {i > 0 ? ' · ' : null}
                <span className="whitespace-nowrap">{part}</span>
              </Fragment>
            ))}
          </span>
          <div role="group" aria-label="Filter nodes by category" className="-mx-1 flex flex-wrap items-center">
            {CATEGORY_FILTERS.map((f) => {
              const active = f.id === filter
              return (
                <BracketButton
                  key={f.id}
                  tone={active ? 'default' : 'muted'}
                  aria-pressed={active}
                  onClick={() => setFilter(f.id)}
                  className={`normal-case! tracking-normal! ${active ? 'bg-emerald/10 text-emerald! hover:text-emerald!' : ''}`}
                >
                  {f.label} <span className={`tabular ${active ? 'text-emerald' : 'text-muted'}`}>{counts[f.id]}</span>
                </BracketButton>
              )
            })}
          </div>
        </>
      }
    >
      <div ref={scrollRef} className="max-h-[80vh] overflow-auto overscroll-x-contain">
        <table className="w-full min-w-[1120px] border-separate border-spacing-0 text-xs tabular">
          <caption className="sr-only">
            Live hardware orderbook, category {filterLabel}: {visible.length} nodes. TASK NODE loads the node into the dispatch console.
          </caption>
          <thead>
            <tr>
              {COLUMNS.map((c, i) => (
                <th
                  key={c.label}
                  scope="col"
                  className={`sticky top-0 border-b border-line bg-panel px-2 py-2 text-[11px] font-medium tracking-[0.08em] whitespace-nowrap text-muted ${
                    c.align === 'right' ? 'text-right' : 'text-left'
                  } ${i === 0 ? `z-10 border-r border-l-2 border-l-transparent sm:left-0 sm:z-20 ${frozenRule}` : i === COLUMNS.length - 1 ? `right-0 z-20 w-px border-l ${actionRule}` : 'z-10'}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((n) => (
              <NodeRow
                key={n.id}
                node={n}
                now={now}
                isTarget={n.id === targetNodeId}
                frozenRule={frozenRule}
                actionRule={actionRule}
                onTaskNode={onTaskNode}
              />
            ))}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className={`${CELL} py-4 text-muted`}>
                  no nodes listed in {filterLabel}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="px-3 py-2 text-[11px] leading-relaxed text-muted">
        spot rates in USDC · escrow = rate × est_duration_min · simulated sandbox
        {overflowing ? (
          <>
            {' · '}
            <span className="whitespace-nowrap text-fg/70">scroll → for full row</span>
          </>
        ) : null}
      </p>
    </Panel>
  )
}

interface NodeRowProps {
  node: HardwareNode
  now: number
  isTarget: boolean
  /** Right rule of the frozen NODE_ID column (visible only while the table scrolls horizontally). */
  frozenRule: string
  /** Left rule of the frozen ACTION column. */
  actionRule: string
  onTaskNode: (node: HardwareNode) => void
}

function NodeRow({ node: n, now, isTarget, frozenRule, actionRule, onTaskNode }: NodeRowProps) {
  const tasked = n.status === 'TASKED'
  const tone = chargeTone(n)
  const mains = n.power === 'MAINS'
  const lock = tasked ? lockSeconds(n, now) : null
  // Figure space keeps "LOCKED  9s" as wide as "LOCKED 10s", so the label doesn't shift as the countdown runs.
  const lockLabel = lock === null ? 'LOCKED' : `LOCKED ${String(lock).padStart(2, '\u2007')}s`
  // The frozen cell is opaque (it covers cells scrolling beneath it), so the row tint is repeated on it as an overlay
  // that also spans its left / right borders.
  const tint = tasked ? 'bg-amber/5' : isTarget ? 'bg-emerald/5' : ''
  const tintOverlay = tasked
    ? 'before:bg-amber/5'
    : isTarget
      ? 'before:bg-emerald/5'
      : 'before:hidden'

  return (
    <tr aria-current={isTarget ? 'true' : undefined} className={`group ${tint} hover:bg-bg`}>
      <th
        scope="row"
        className={`${CELL} relative z-[1] border-r border-l-2 bg-panel text-left font-medium whitespace-nowrap sm:sticky sm:left-0 group-hover:bg-bg before:pointer-events-none before:absolute before:inset-y-0 before:-right-px before:-left-0.5 before:-z-10 before:content-[''] group-hover:before:hidden ${tintOverlay} ${frozenRule} ${
          isTarget ? 'border-l-emerald' : 'border-l-transparent'
        } ${tasked ? 'text-amber' : 'text-fg'}`}
      >
        {n.id}
      </th>
      <td className={`${CELL} text-fg`}>
        {/* Wraps only at spaces: browsers also break after a hyphen ("Fixed-" / "Wing"). */}
        {n.chassis.split(' ').map((word, i) => (
          <Fragment key={i}>
            {i > 0 ? ' ' : null}
            <span className="whitespace-nowrap">{word}</span>
          </Fragment>
        ))}
      </td>
      <td className={`${CELL} whitespace-nowrap text-fg`}>{n.iface}</td>
      <td className={CELL}>
        <span className="block whitespace-nowrap text-fg">{formatCoords(n.lat, n.lon)}</span>{' '}
        <span className="block whitespace-nowrap text-fg/60">[{n.sector}]</span>
      </td>
      <td className={`${CELL} text-fg/80`}>
        {/* Wraps only between sensors ("FLIR Thermal" / "+ RTK-GPS"), never inside one. */}
        {n.sensors.split(' + ').map((sensor, i) => (
          <Fragment key={sensor}>
            {i > 0 ? ' ' : null}
            <span className="whitespace-nowrap">
              {i > 0 ? '+ ' : null}
              {sensor}
            </span>
          </Fragment>
        ))}
      </td>
      <td className={`${CELL} whitespace-nowrap`}>
        <span className="flex items-center gap-2">
          <Meter value={n.charge} tone={tone} label={`${n.id} ${mains ? 'duty headroom' : 'battery'}`} />
          <span className="w-[4ch] text-right text-fg">{Math.floor(n.charge)}%</span>{' '}
          <StatusTag tone={tone} className="w-[10ch]">
            {n.status}
          </StatusTag>
          <span className="w-[2ch] text-[10px] leading-none text-muted">
            {mains ? (
              <abbr title="mains power: duty headroom" className="no-underline">
                AC
              </abbr>
            ) : null}
          </span>
        </span>
      </td>
      <td className={`${CELL} text-right whitespace-nowrap text-fg`}>{formatRate(n.rateCents)}</td>
      <td
        className={`${CELL} sticky right-0 z-[1] border-l bg-panel text-right group-hover:bg-bg before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:content-[''] group-hover:before:hidden ${tintOverlay} ${actionRule}`}
      >
        {tasked ? (
          <BracketButton tone="primary" disabled aria-label={`${lockLabel}: ${n.id} is tasked`} className={`${ACTION_BUTTON} normal-case!`}>
            {lockLabel}
          </BracketButton>
        ) : (
          <BracketButton tone="primary" onClick={() => onTaskNode(n)} aria-label={`TASK NODE ${n.id}`} className={ACTION_BUTTON}>
            TASK NODE
          </BracketButton>
        )}
      </td>
    </tr>
  )
}
