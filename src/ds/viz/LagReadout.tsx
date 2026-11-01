import { useRef, type ReactNode } from 'react'

import { fmt, framesToMs } from '../format'
import { useContainerWidth } from '../hooks'
import { Lamp } from '../Lamp'
import { Num } from '../Num'
import { Figure } from '../Panel'
import { Reading } from '../Reading'
import { ScrollBox } from '../Table'
import type { Interval } from './types'

export interface LagReadoutProps {
  fps: number
  /** Command-to-state lag in frames (median over joints), with 95% CI. */
  real: Interval
  stock: Interval
  cal: Interval
  /** |cal − real| at or under this many frames lights "cal matches". Default 1. */
  matchTolerance?: number
  n?: number | null
  /** Provenance (report.json path). Without it: UNCAL lamp, dashed numbers, unlit verdict. */
  prov?: string
  number?: number | string
  title?: ReactNode
  caption?: ReactNode
  id?: string
}

type Row = 'cmd' | 'real' | 'stock' | 'cal'

/**
 * Fig 3: command → state lag. Big readout in frames with ms, a "cal matches ≤ 1 fr" lamp, a timing diagram
 * (≥ 560px: unit steps delayed by each channel's lag, cursor at the 50% crossing, amber Δt for stock) and a
 * vernier on all widths (frames over ms, ▼ markers, amber segment between stock and real).
 */
export function LagReadout({ fps, real, stock, cal, matchTolerance = 1, n = null, prov, number = 3, title, caption, id }: LagReadoutProps) {
  const gap = Math.abs(cal.mean - real.mean)
  const match = gap <= matchTolerance
  const ms = (f: number) => Math.round(framesToMs(f, fps))
  return (
    <Figure
      id={id}
      number={number}
      title={title ?? 'command to state lag · median of joints'}
      uncal={!prov}
      table={<LagTable fps={fps} real={real} stock={stock} cal={cal} prov={prov} />}
      caption={
        caption ??
        'The timing diagram (wide screens) delays a unit step by each channel’s measured lag, with a cursor at the 50% crossing. The vernier puts the same lags on one scale, frames over ms; amber marks the gap between stock and real.'
      }
    >
      <div className="lagbig">
        <Reading
          label="real follower"
          channel="real"
          value={real.mean}
          unit="fr"
          ci={[real.lo, real.hi]}
          n={n}
          ciPrefix={
            <span className="nw">
              (<Num value={ms(real.mean)} digits={0} prov={prov} placeholder={!prov} /> ms) ·
            </span>
          }
          extra={`· ${fps} fps`}
          prov={prov}
          placeholder={!prov}
        />
        <div className="ro" style={{ marginLeft: 'auto', justifyItems: 'end' }}>
          {match ? (
            <Lamp kind="pass" uncal={!prov}>
              cal matches ≤ {fmt(matchTolerance, matchTolerance % 1 ? 1 : 0)} fr
            </Lamp>
          ) : (
            <Lamp kind="gap">cal off by &gt; {fmt(matchTolerance, matchTolerance % 1 ? 1 : 0)} fr</Lamp>
          )}
          <span className="ro-n">
            |cal − real| = <Num value={gap} prov={prov} placeholder={!prov} /> fr
          </span>
        </div>
      </div>
      <Timing fps={fps} lags={{ real, stock, cal }} prov={prov} />
      <Vernier fps={fps} lags={{ real, stock, cal }} />
    </Figure>
  )
}

function Timing({ fps, lags, prov }: { fps: number; lags: Record<'real' | 'stock' | 'cal', Interval>; prov?: string }) {
  const ax = useRef<HTMLDivElement>(null)
  const W = useContainerWidth(ax)
  const maxF = Math.max(6, Math.ceil(Math.max(lags.real.hi, lags.stock.hi, lags.cal.hi) + 1.5))
  const xs = (f: number) => 4 + ((f + 1) / (maxF + 1.4)) * (W - 8)
  const rows: [Row, string][] = [
    ['cmd', 'command a[t]'],
    ['real', 'CH1 real'],
    ['stock', 'CH2 stock'],
    ['cal', 'CH3 cal'],
  ]
  const lane = (k: Row) => {
    if (!W) return null
    const Hh = 44
    const lo = Hh - 8
    const hi = 8
    let d: string
    if (k === 'cmd') d = `M${xs(-1)} ${lo}L${xs(0)} ${lo}L${xs(0)} ${hi}L${xs(maxF)} ${hi}`
    else {
      const edge = lags[k].mean
      d = `M${xs(-1).toFixed(1)} ${lo}`
      for (let f = -1; f <= maxF + 1e-9; f += 0.05) {
        const s = 1 / (1 + Math.exp(-(f - edge) * 4.2))
        d += `L${xs(f).toFixed(1)} ${(lo - (lo - hi) * s).toFixed(1)}`
      }
    }
    const grid = []
    for (let f = -1; f <= maxF; f++) grid.push(<line key={f} x1={xs(f)} x2={xs(f)} y1={0} y2={Hh} className="g-grat" shapeRendering="crispEdges" />)
    return (
      <svg viewBox={`0 0 ${W} ${Hh}`} aria-hidden="true">
        {grid}
        <path d={d} className={`tr tr-${k}`} strokeWidth={k === 'real' ? 1.5 : k === 'cmd' ? 1 : 2} />
        {k !== 'cmd' ? (
          <>
            <line x1={xs(lags[k].mean)} x2={xs(lags[k].mean)} y1={0} y2={Hh} className="cur-line" shapeRendering="crispEdges" />
            <line x1={xs(0)} x2={xs(lags[k].mean)} y1={Hh / 2} y2={Hh / 2} className={k === 'stock' ? 's-warn' : 'g-muted'} />
            <rect x={xs(lags[k].mean) - 3} y={Hh / 2 - 3} width={6} height={6} className="f-text" />
          </>
        ) : null}
      </svg>
    )
  }
  const axis = () => {
    if (!W) return null
    const out = []
    for (let f = -1; f <= maxF; f++) {
      out.push(<line key={`t${f}`} x1={xs(f)} x2={xs(f)} y1={20} y2={30} className="g-muted" shapeRendering="crispEdges" />)
      if (f >= 0)
        out.push(
          <text key={`l${f}`} x={xs(f)} y={13} textAnchor="middle">
            {Math.round(framesToMs(f, fps))}
          </text>,
        )
    }
    for (let f = -1; f <= maxF + 1e-9; f += 0.2) out.push(<line key={`m${f.toFixed(1)}`} x1={xs(f)} x2={xs(f)} y1={26} y2={30} className="g-axis" shapeRendering="crispEdges" />)
    return <svg viewBox={`0 0 ${W} 30`}>{out}</svg>
  }
  return (
    <div className="timing viz" aria-hidden="true">
      <div className="ln h">ms →</div>
      <div className="ax" ref={ax}>
        {axis()}
      </div>
      <div className="lv">
        <small>lag · frames</small>
      </div>
      {rows.map(([k, label]) => (
        <TimingRow key={k} k={k} label={label} lane={lane(k)} lag={k === 'cmd' ? null : lags[k]} fps={fps} prov={prov} />
      ))}
    </div>
  )
}

function TimingRow({ k, label, lane, lag, fps, prov }: { k: Row; label: string; lane: ReactNode; lag: Interval | null; fps: number; prov?: string }) {
  return (
    <>
      <div className="ln">
        <i className={`sw sw--${k}`} style={{ width: 16 }} />
        <span>{label}</span>
      </div>
      <div className="lr">{lane}</div>
      <div className="lv">
        {lag ? (
          <>
            <Num value={Math.round(framesToMs(lag.mean, fps))} digits={0} prov={prov} placeholder={!prov} /> ms
            <small>
              {fmt(lag.mean)} fr ±{fmt((lag.hi - lag.lo) / 2)}
            </small>
          </>
        ) : (
          <>
            t = 0<small>step</small>
          </>
        )}
      </div>
    </>
  )
}

function Vernier({ fps, lags }: { fps: number; lags: Record<'real' | 'stock' | 'cal', Interval> }) {
  const box = useRef<HTMLDivElement>(null)
  const V = useContainerWidth(box)
  const maxF = Math.max(6, Math.ceil(Math.max(lags.real.hi, lags.stock.hi, lags.cal.hi) + 1))
  const maxMs = Math.floor(framesToMs(maxF, fps) / 50) * 50
  const L = 8
  const R = V - 8
  const fx = (f: number) => L + (f / maxF) * (R - L)
  const mx = (m: number) => fx((m / 1000) * fps)
  const out: ReactNode[] = []
  if (V) {
    out.push(<line key="base" x1={L} x2={R} y1={50.5} y2={50.5} className="g-edge" />)
    out.push(<line key="gap" x1={fx(lags.stock.mean)} x2={fx(lags.real.mean)} y1={50.5} y2={50.5} className="s-warn" strokeWidth={3} />)
    for (let k = 0; k <= maxF * 5; k++) {
      const f = k / 5
      const x = Math.round(fx(f)) + 0.5
      const maj = k % 5 === 0
      out.push(<line key={`f${k}`} x1={x} x2={x} y1={51} y2={maj ? 59 : 55} className={maj ? 'g-muted' : 'g-axis'} shapeRendering="crispEdges" />)
      if (maj)
        out.push(
          <text key={`fl${k}`} x={x} y={70} textAnchor={f === 0 ? 'start' : f === maxF ? 'end' : 'middle'}>
            {f + (f === maxF ? ' fr' : '')}
          </text>,
        )
    }
    out.push(<line key="msbase" x1={L} x2={R} y1={78.5} y2={78.5} className="g-line" />)
    for (let m = 0; m <= maxMs; m += 10) {
      const x = Math.round(mx(m)) + 0.5
      const maj = m % 50 === 0
      out.push(<line key={`m${m}`} x1={x} x2={x} y1={79} y2={maj ? 87 : 83} className={maj ? 'g-muted' : 'g-axis'} shapeRendering="crispEdges" />)
      if (maj)
        out.push(
          <text key={`ml${m}`} x={x} y={100} textAnchor={m === 0 ? 'start' : m === maxMs ? 'end' : 'middle'}>
            {m + (m === maxMs ? ' ms' : '')}
          </text>,
        )
    }
    // Leader labels, right to left: row 0 anchored start first; on a collision, row 1 anchored end, then row 1 start.
    // A row-1 label must also stay clear of every other marker's leader line, which crosses row 1.
    const marks = (['stock', 'cal', 'real'] as const).map((k) => ({ k, f: lags[k].mean, label: `${k} ${fmt(lags[k].mean)}` })).sort((a, b) => b.f - a.f)
    const xsOf = marks.map((m) => fx(m.f))
    const placed: { row: number; x0: number; x1: number }[] = []
    const hit = (row: number, a: number, b: number, self: number) =>
      placed.some((p) => p.row === row && a < p.x1 + 6 && b > p.x0 - 6) || (row === 1 && xsOf.some((x, j) => j !== self && x > a - 3 && x < b + 3))
    marks.forEach((mk, idx) => {
      const x = xsOf[idx]
      const tw = mk.label.length * 6.4
      const options: [number, 'start' | 'end', number, number][] = [
        [0, 'start', x + 4, x + 4 + tw],
        [1, 'end', x - 4 - tw, x - 4],
        [1, 'start', x + 4, x + 4 + tw],
        [0, 'end', x - 4 - tw, x - 4],
      ]
      const pick = options.find(([r, , a, b]) => a >= 0 && b <= V && !hit(r, a, b, idx)) ?? options[0]
      const [row, anchor, a, b] = pick
      placed.push({ row, x0: a, x1: b })
      const y = row ? 34 : 22
      out.push(
        <g key={`mk${mk.k}`}>
          <line x1={x} x2={x} y1={y + 3} y2={42} className={`s-${mk.k}`} strokeWidth={1} />
          <path d={`M${x - 5} 42L${x + 5} 42L${x} 50Z`} className={`f-${mk.k}`} />
          <text x={anchor === 'end' ? x - 4 : x + 4} y={y} textAnchor={anchor} className="lbl-t">
            {mk.label}
          </text>
        </g>,
      )
    })
  }
  return (
    <div className="vernier viz" ref={box} aria-hidden="true">
      {V ? <svg viewBox={`0 0 ${V} 104`}>{out}</svg> : null}
    </div>
  )
}

function LagTable({ fps, real, stock, cal, prov }: { fps: number; real: Interval; stock: Interval; cal: Interval; prov?: string }) {
  const rows: ['real' | 'stock' | 'cal', Interval][] = [
    ['real', real],
    ['stock', stock],
    ['cal', cal],
  ]
  return (
    <ScrollBox label="Lag table">
      <table className="tbl">
        <caption>Command to state lag, frames at {fps} fps, 95% CI.{prov ? '' : ' Placeholder values.'}</caption>
        <thead>
          <tr>
            <th scope="col">channel</th>
            <th scope="col" className="r">
              lag fr
            </th>
            <th scope="col">95% CI</th>
            <th scope="col" className="r">
              ms
            </th>
            <th scope="col" className="r">
              |Δ| vs real
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td>{k}</td>
              <td className="r">
                <Num value={v.mean} prov={prov} placeholder={!prov} />
              </td>
              <td className="ci">
                [{fmt(v.lo)}, {fmt(v.hi)}]
              </td>
              <td className="r">{Math.round(framesToMs(v.mean, fps))}</td>
              <td className="r">{k === 'real' ? '0' : `${fmt(Math.abs(v.mean - real.mean))} fr`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollBox>
  )
}
