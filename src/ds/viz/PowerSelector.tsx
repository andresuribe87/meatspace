import { useState } from 'react'

import { fmt, fmtSigned } from '../format'
import { Lamp } from '../Lamp'
import { newcombe, wilson } from '../math'
import { ModeSwitch } from '../Tabs'

export interface PowerSelectorProps {
  /** Example success rate of the calibrated twin in sim (0..1). Inputs are labelled as examples. */
  twin: number
  /** Example success rate of the real cell (0..1). */
  real: number
  /** Trials per arm to choose from. */
  options?: number[]
  defaultN?: number
}

/**
 * C-23 Power selector [planned]: how many real trials? Wilson 95% dot-and-interval rows for the calibrated
 * twin (orchid) and the real cell (fg), and a Newcombe interval for real − twin (amber whisker, fg zero line).
 * Tags: not verification (n < 50), smoke test (50 to 199), powered (≥ 200). Ships on /cells only once a cell exists.
 */
export function PowerSelector({ twin, real, options = [10, 50, 200, 400], defaultN = 200 }: PowerSelectorProps) {
  const [n, setN] = useState(defaultN)
  const arm = (p: number) => {
    const k = Math.round(p * n)
    const ci = wilson(k, n)
    return { p: k / n, ci }
  }
  const tw = arm(twin)
  const rl = arm(real)
  const [d, lo, hi] = newcombe(rl.p, rl.ci, tw.p, tw.ci)
  const pct = (v: number) => (v * 100).toFixed(0)
  const row = (k: 'cal' | 'real', label: string, a: { p: number; ci: [number, number] }) => (
    <div className="pow-row" key={k}>
      <div className="lb">
        <i className={`sw-box sw-box--${k}`} aria-hidden="true" />
        {label}
      </div>
      <svg viewBox="0 0 300 22" preserveAspectRatio="none" role="img" aria-label={`${label}: ${pct(a.p)}% [${pct(a.ci[0])}, ${pct(a.ci[1])}], n = ${n}`} className="viz">
        <line x1={0} x2={300} y1={11} y2={11} className="g-line" />
        {[0, 1, 2, 3, 4].map((q) => (
          <line key={q} x1={q * 75} x2={q * 75} y1={7} y2={15} className="g-axis" />
        ))}
        <rect x={a.ci[0] * 300} y={6} width={(a.ci[1] - a.ci[0]) * 300} height={10} className={k === 'cal' ? 'f-cal-ci' : 'f-real-ci'} />
        <rect x={a.p * 300 - 4} y={7} width={8} height={8} className={`f-${k}`} />
      </svg>
      <div className="vv">
        <b>{pct(a.p)}%</b> [{pct(a.ci[0])}, {pct(a.ci[1])}]
      </div>
    </div>
  )
  const gx = (v: number) => 150 + v * 300
  return (
    <div className="pow">
      <div className="pnl-h">
        <span className="t-legend">how many real trials? · success, Wilson 95%</span>
        <ModeSwitch
          label="Trials per arm"
          options={options.map((o) => ({ value: String(o), label: `n ${o}` }))}
          value={String(n)}
          onChange={(v) => setN(Number(v))}
        />
      </div>
      <div className="pow-b ds-stack">
        {row('cal', 'calibrated twin, sim', tw)}
        {row('real', 'real cell', rl)}
        <div className="pow-row">
          <div className="lb">gap real − twin</div>
          <svg viewBox="0 0 300 22" preserveAspectRatio="none" role="img" aria-label={`gap ${fmtSigned(d * 100, 0)} points [${fmt(lo * 100, 0)}, ${fmt(hi * 100, 0)}]`} className="viz">
            <line x1={0} x2={300} y1={11} y2={11} className="g-line" />
            <line x1={150} x2={150} y1={3} y2={19} className="s-real" />
            <line x1={gx(lo)} x2={gx(hi)} y1={11} y2={11} className="s-warn" strokeWidth={2} />
            <line x1={gx(lo)} x2={gx(lo)} y1={6} y2={16} className="s-warn" />
            <line x1={gx(hi)} x2={gx(hi)} y1={6} y2={16} className="s-warn" />
            <rect x={gx(d) - 4} y={7} width={8} height={8} className="f-text" />
          </svg>
          <div className="vv">
            <b>{fmtSigned(d * 100, 0)} pts</b> [{fmt(lo * 100, 0)}, {fmt(hi * 100, 0)}]
          </div>
        </div>
        <div className="ds-row">
          {n < 50 ? (
            <Lamp status="FAULT">not verification · n &lt; 50</Lamp>
          ) : n < 200 ? (
            <Lamp status="GAP">smoke test · n 50 to 199</Lamp>
          ) : (
            <Lamp kind="live">powered · n ≥ 200</Lamp>
          )}
          {hi < 0 ? <Lamp status="GAP">sim overstates real</Lamp> : <Lamp kind="planned">inconclusive · CI spans 0</Lamp>}
        </div>
        <p className="t-caption">
          Example inputs, not results: sim {pct(twin)}%, real {pct(real)}%. Wilson 95% per arm, Newcombe for the gap. The page ships with /cells once
          a real cell exists.
        </p>
      </div>
    </div>
  )
}
