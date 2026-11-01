import { Fragment, useRef, type ReactNode } from 'react'

import { fmt } from '../format'
import { useContainerWidth } from '../hooks'
import { Lamp } from '../Lamp'
import { step125 } from '../math'
import { Num } from '../Num'
import { Figure } from '../Panel'
import { ScrollBox } from '../Table'
import type { Interval } from './types'

export interface CIBarRow {
  /** Joint name, or the summary label ("arm mean"). */
  joint: string
  /** Held-out RMSE of the stock twin, mean over episodes with its 95% CI (degrees). */
  stock: Interval
  /** Held-out RMSE of the calibrated twin (degrees). */
  cal: Interval
  /** Paired change in percent (negative = better), mean with its 95% CI. From report.json, not derived from the bars. */
  change: Interval
}

export interface CIBarsProps {
  rows: CIBarRow[]
  /** Arm mean, drawn under an edge rule. */
  summary?: CIBarRow
  /** Pass limit as a fraction of stock RMSE. PASS when the calibrated upper CI < passRatio × stock mean. Default 0.5. */
  passRatio?: number
  /** Held-out episodes per arm, for the caption and the table. */
  n?: number
  /** Provenance (report.json path). Without it: UNCAL lamp, dashed numbers and dashed, unlit verdicts. */
  prov?: string
  number?: number | string
  title?: ReactNode
  caption?: ReactNode
  id?: string
}

function verdict(r: CIBarRow, ratio: number) {
  return r.cal.hi < ratio * r.stock.mean
}

/**
 * Fig 2: per-joint held-out RMSE with 95% CI. Paired bars from one baseline (stock cyan above, calibrated orchid
 * below), fg whiskers with caps, value at the whisker tip, an amber pass-limit tick on the calibrated row,
 * change % [CI] and a verdict lamp. Verdicts computed from UNCAL data stay dashed. Under 560px each joint is
 * `name | change | verdict` over a full-width bar; the verdict never drops.
 */
export function CIBars({ rows, summary, passRatio = 0.5, n, prov, number = 2, title, caption, id }: CIBarsProps) {
  const all = summary ? [...rows, summary] : rows
  return (
    <Figure
      id={id}
      number={number}
      title={title ?? 'per-joint rmse · held-out · 95% CI'}
      uncal={!prov}
      table={<BarsTable rows={rows} summary={summary} passRatio={passRatio} n={n} prov={prov} />}
      caption={
        caption ??
        `A joint passes when the calibrated twin's upper CI bound sits below ${passRatio === 0.5 ? 'half' : `${Math.round(passRatio * 100)}%`} of the stock twin's RMSE. A joint that clears the limit on its point estimate but not on its interval is marked marginal, not passed.`
      }
    >
      <div className="legend-row">
        <span>
          <i className="sw-box sw-box--stock" aria-hidden="true" />
          stock twin
        </span>
        <span>
          <i className="sw-box sw-box--cal" aria-hidden="true" />
          calibrated twin
        </span>
        <span>
          <i className="sw sw--ci" style={{ width: 14 }} aria-hidden="true" />
          95% CI
        </span>
        <span>
          <i className="lim-key" aria-hidden="true" />
          pass limit: {passRatio === 0.5 ? 'half of stock' : `${Math.round(passRatio * 100)}% of stock`}
        </span>
      </div>
      <Bars rows={rows} summary={summary} all={all} passRatio={passRatio} prov={prov} />
    </Figure>
  )
}

function Bars({ rows, summary, all, passRatio, prov }: { rows: CIBarRow[]; summary?: CIBarRow; all: CIBarRow[]; passRatio: number; prov?: string }) {
  const first = useRef<HTMLDivElement>(null)
  const W = useContainerWidth(first)
  const maxHi = Math.max(...all.flatMap((r) => [r.stock.hi, r.cal.hi, r.stock.mean * passRatio]))
  const grid = step125(maxHi / 7)
  const narrow = W > 0 && W < 380
  const max = narrow ? Math.ceil((maxHi * 1.1) / grid) * grid : Math.ceil((maxHi * 1.04) / (grid / 2)) * (grid / 2)
  const xs = (v: number) => (v / max) * W
  const H = narrow ? 38 : 40

  const track = (r: CIBarRow) => {
    if (!W) return null
    const bh = 10
    const yS = H / 2 - bh - 1
    const yC = H / 2 + 1
    const lim = xs(passRatio * r.stock.mean)
    const bar = (k: 'stock' | 'cal', y: number, limX: number | null) => {
      const v = r[k]
      const lw = 28
      let lx = xs(v.hi) + 6
      if (limX != null && limX > xs(v.hi) - 2 && limX < lx + lw) lx = limX + 6
      return (
        <g key={k}>
          <rect x={0} y={y} width={Math.max(0, xs(v.mean))} height={bh} className={`f-${k}`} />
          <line x1={xs(v.lo)} x2={xs(v.hi)} y1={y + bh / 2} y2={y + bh / 2} className="s-text" />
          <line x1={xs(v.lo)} x2={xs(v.lo)} y1={y + 1} y2={y + bh - 1} className="s-text" />
          <line x1={xs(v.hi)} x2={xs(v.hi)} y1={y + 1} y2={y + bh - 1} className="s-text" />
          <text x={lx} y={y + bh - 1} className="lbl-t">
            {fmt(v.mean)}
          </text>
        </g>
      )
    }
    const ticks: ReactNode[] = []
    for (let v = 0; v <= max + 1e-9; v += grid) {
      const gx = Math.round(xs(v)) + 0.5
      ticks.push(<line key={v} x1={gx} x2={gx} y1={0} y2={H} className={v === 0 ? 'g-muted' : 'g-grat'} shapeRendering="crispEdges" />)
    }
    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${r.joint}: stock ${fmt(r.stock.mean)} degrees [${fmt(r.stock.lo)}, ${fmt(r.stock.hi)}], calibrated ${fmt(r.cal.mean)} [${fmt(r.cal.lo)}, ${fmt(r.cal.hi)}], pass limit ${fmt(passRatio * r.stock.mean)}.${prov ? '' : ' Placeholder.'}`}
      >
        {ticks}
        {bar('stock', yS, null)}
        {bar('cal', yC, lim)}
        <line x1={lim} x2={lim} y1={yC - 3} y2={yC + bh + 3} className="s-warn" strokeWidth={2} />
      </svg>
    )
  }

  const row = (r: CIBarRow, i: number, sum: boolean) => {
    const pass = verdict(r, passRatio)
    return (
      <Fragment key={r.joint}>
        {sum ? <div className="hr" /> : null}
        <div className={`jn b-j ${sum ? 'sum' : ''}`}>{r.joint}</div>
        <div className="rd b-c">
          <span className="nw">
            <Num value={r.change.mean} digits={0} prov={prov} placeholder={!prov} />%
          </span>
          <small>
            [{fmt(r.change.lo, 0)}, {fmt(r.change.hi, 0)}]
          </small>
        </div>
        <div className="vd b-v">{pass ? <Lamp status="PASS" size="sm" uncal={!prov} /> : <Lamp status="MARGINAL" size="sm" />}</div>
        <div className="trk b-t viz" ref={i === 0 ? first : undefined}>
          {track(r)}
        </div>
      </Fragment>
    )
  }

  const axisTicks: ReactNode[] = []
  if (W) {
    const stepLbl = narrow ? grid * 2 : grid
    for (let v = 0; v <= max + 1e-9; v += stepLbl) {
      const ax = xs(v)
      axisTicks.push(
        <g key={v}>
          <line x1={ax} x2={ax} y1={0} y2={4} className="g-muted" />
          <text x={ax} y={16} textAnchor={v === 0 ? 'start' : 'middle'}>
            {fmt(v, grid < 1 ? 1 : 0) + (v === 0 ? '°' : '')}
          </text>
        </g>,
      )
    }
  }

  return (
    <div className="bars">
      <div className="hd b-j">joint</div>
      <div className="hd tr b-t">
        rmse ° (0 to {fmt(max, max % 1 ? 1 : 0)})
      </div>
      <div className="hd r b-c">change</div>
      <div className="hd r b-v">verdict</div>
      {rows.map((r, i) => row(r, i, false))}
      {summary ? row(summary, rows.length, true) : null}
      <div className="ax-pad b-j" />
      <div className="axis b-t viz">
        {W ? (
          <svg viewBox={`0 0 ${W} 24`} aria-hidden="true">
            {axisTicks}
          </svg>
        ) : null}
      </div>
    </div>
  )
}

function BarsTable({ rows, summary, passRatio, n, prov }: { rows: CIBarRow[]; summary?: CIBarRow; passRatio: number; n?: number; prov?: string }) {
  const all = summary ? [...rows, summary] : rows
  return (
    <ScrollBox label="Per-joint RMSE table">
      <table className="tbl">
        <caption>
          Held-out RMSE per joint, degrees, mean over episodes [95% CI]{n != null ? `, n = ${n}` : ''}.{prov ? '' : ' Placeholder values.'}
        </caption>
        <thead>
          <tr>
            <th scope="col">joint</th>
            <th scope="col" className="r">
              stock
            </th>
            <th scope="col">95% CI</th>
            <th scope="col" className="r">
              calibrated
            </th>
            <th scope="col">95% CI</th>
            <th scope="col" className="r">
              change
            </th>
            <th scope="col">verdict</th>
          </tr>
        </thead>
        <tbody>
          {all.map((r) => (
            <tr key={r.joint} className={r === summary ? 'sum' : undefined}>
              <td>{r.joint}</td>
              <td className="r">
                <Num value={r.stock.mean} prov={prov} placeholder={!prov} />
              </td>
              <td className="ci">
                [{fmt(r.stock.lo)}, {fmt(r.stock.hi)}]
              </td>
              <td className="r">
                <Num value={r.cal.mean} prov={prov} placeholder={!prov} />
              </td>
              <td className="ci">
                [{fmt(r.cal.lo)}, {fmt(r.cal.hi)}]
              </td>
              <td className="r">
                <Num value={r.change.mean} digits={0} prov={prov} placeholder={!prov} />%
              </td>
              <td>{verdict(r, passRatio) ? 'pass' : 'marginal'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollBox>
  )
}
