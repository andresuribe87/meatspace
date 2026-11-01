import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { digitsFor, fmt, fmtSeconds, fmtSigned } from '../format'
import { useContainerWidth, usePlayhead, type PlayheadGeometry } from '../hooks'
import { bandPath, comb, countOutside, deltaScale, extent, linePath, maxAbsResidual, rmse, timebase, yScale } from '../math'
import { Figure } from '../Panel'
import { ChannelKeys, Tabs } from '../Tabs'
import { CursorDot } from './Graticule'
import { TraceTable } from './ScopePlot'
import { ALL_CHANNELS, type ChannelVisibility, type JointTraces } from './types'

const px = (v: number) => Math.round(v) + 0.5
const PL = 38
const PR = 6

export interface ScopeStripsProps {
  /** One entry per joint, each with per-frame traces of the same held-out episode. */
  joints: JointTraces[]
  fps: number
  /** ± mask in degrees. Default 1.0. */
  tolerance?: number
  /** e.g. "held-out episode 07". */
  episode?: string
  /** Provenance of the trace export. Without it the figure shows UNCAL. */
  prov?: string
  /** Default playhead frame. */
  initialFrame?: number
  /** Joint selected on phones and in the table view. Default: the first. */
  defaultJoint?: string
  /**
   * Per-joint RMSE printed under each joint name, from the source (e.g. trace.json rmse_deg, over every frame and the
   * lab's definition). Without it the strip computes RMSE from the drawn series, which can differ from a published value.
   */
  rmse?: Record<string, { stock?: number | null; cal?: number | null }>
  number?: number | string
  title?: ReactNode
  caption?: ReactNode
  id?: string
}

/**
 * Fig 1 small multiples: one strip per joint (own °/div), each with a Δ lane (own 1-2-5 Δ scale, mask band,
 * gap comb), all on one shared role=slider playhead with an at-cursor side table. Under 900px the side table
 * drops below; under 560px one strip shows behind a joint tab switch at 170px and 5 divisions.
 */
export function ScopeStrips({
  joints,
  fps,
  tolerance = 1,
  episode = 'held-out episode',
  prov,
  initialFrame,
  defaultJoint,
  rmse: rmseGiven,
  number = 1,
  title,
  caption,
  id,
}: ScopeStripsProps) {
  const [ch, setCh] = useState<ChannelVisibility>(ALL_CHANNELS)
  const [sel, setSel] = useState(defaultJoint ?? joints[0]?.joint)
  const selected = joints.find((j) => j.joint === sel) ?? joints[0]
  const allViol = useMemo(() => {
    let s = 0
    let c = 0
    let total = 0
    for (const j of joints) {
      if (j.stock) s += countOutside(j.stock, j.real, tolerance)
      if (j.cal) c += countOutside(j.cal, j.real, tolerance)
      total += j.real.length
    }
    return { s, c, total }
  }, [joints, tolerance])

  return (
    <Figure
      id={id}
      number={number}
      title={title ?? `${episode} · real vs stock twin vs calibrated twin · all ${joints.length} joints`}
      uncal={!prov}
      padded={false}
      controls={<ChannelKeys value={ch} onChange={setCh} />}
      table={selected ? <TraceTable joint={selected.joint} traces={selected} fps={fps} placeholder={!prov} /> : null}
      caption={
        caption ??
        `Open-loop replay of one held-out episode. The recorded command drives each twin; the real follower's measured state is the reference, drawn on top inside its ±${fmt(tolerance, 1)}° mask. Each strip has a Δ lane underneath: amber ticks mark the frames where a twin leaves the mask.`
      }
      keys="Focus the plot, then ← → one frame · shift ½ s · page up/down 1 s · home / end"
    >
      <Strips joints={joints} fps={fps} tolerance={tolerance} episode={episode} prov={prov} ch={ch} sel={selected?.joint} onSel={setSel} initialFrame={initialFrame} allViol={allViol} rmseGiven={rmseGiven} />
    </Figure>
  )
}

function Strips({
  joints,
  fps,
  tolerance,
  episode,
  prov,
  ch,
  sel,
  onSel,
  initialFrame,
  allViol,
  rmseGiven,
}: {
  rmseGiven?: ScopeStripsProps['rmse']
  joints: JointTraces[]
  fps: number
  tolerance: number
  episode: string
  prov?: string
  ch: ChannelVisibility
  sel?: string
  onSel: (j: string) => void
  initialFrame?: number
  allViol: { s: number; c: number; total: number }
}) {
  const smRef = useRef<HTMLDivElement>(null)
  const stripsRef = useRef<HTMLDivElement>(null)
  const smW = useContainerWidth(smRef)
  const stripsW = useContainerWidth(stripsRef)
  const narrow = smW > 0 && smW <= 560
  const plotW = Math.max(0, stripsW - (narrow ? 0 : 144))
  const H = narrow ? 170 : 140
  const xdiv = plotW > 0 && plotW < 520 ? 5 : 10
  const n = Math.max(...joints.map((j) => j.real.length))
  const geom = useRef<PlayheadGeometry | null>(null)
  const ph = usePlayhead(n, fps, initialFrame ?? Math.floor(n * 0.41), geom)
  const shown = narrow ? joints.filter((j) => j.joint === sel) : joints

  const tb = useMemo(() => timebase(n, fps, xdiv), [n, fps, xdiv])
  const fullFrames = Math.round(tb.fullS * fps) + 1
  const w = plotW - PL - PR
  const xs = useMemo(() => (i: number) => PL + (i / fps / tb.fullS) * w, [fps, tb, w])

  useEffect(() => {
    geom.current = plotW > 120 ? { x0: PL, w, fullFrames } : null
  }, [plotW, w, fullFrames])

  const models = useMemo(() => {
    if (plotW < 120) return []
    return joints.map((j) => {
      const pt = 8
      const laneG = 6
      const dH = Math.round((H - pt - laneG - 6) * 0.42)
      const mH = H - pt - laneG - 6 - dH
      const my0 = pt
      const dy0 = my0 + mH + laneG
      const [lo, hi] = extent(j.real, j.stock, j.cal, j.cmd)
      const sc = yScale(lo, hi, 4)
      const ds = deltaScale(maxAbsResidual(j.real, j.stock, j.cal), 1, tolerance)
      const ys = (v: number) => my0 + mH - ((v - sc.min) / (sc.step * 4)) * mH
      const dys = (v: number) => dy0 + dH / 2 - (v / ds.lim) * (dH / 2)
      const len = j.real.length
      const line = (a: ArrayLike<number>) => linePath(len, (i) => a[i], xs, ys)
      const resid = (a: ArrayLike<number>) => linePath(len, (i) => a[i] - j.real[i], xs, dys)
      const combPath = (a: ArrayLike<number>) =>
        comb(a, j.real, tolerance, w / (fullFrames - 1))
          .map(([i, d]) => `M${xs(i).toFixed(1)} ${dys(Math.sign(d) * tolerance).toFixed(1)}V${dys(d).toFixed(1)}`)
          .join('')
      return {
        joint: j.joint,
        my0,
        mH,
        dy0,
        dH,
        sc,
        ds,
        ys,
        dys,
        band: bandPath(j.real, tolerance, xs, ys),
        real: line(j.real),
        stock: j.stock ? line(j.stock) : '',
        cal: j.cal ? line(j.cal) : '',
        cmd: j.cmd ? line(j.cmd) : '',
        dStock: j.stock ? resid(j.stock) : '',
        dCal: j.cal ? resid(j.cal) : '',
        combStock: j.stock ? combPath(j.stock) : '',
        combCal: j.cal ? combPath(j.cal) : '',
        rmseStock: rmseGiven?.[j.joint]?.stock ?? (j.stock ? rmse(j.stock, j.real) : null),
        rmseCal: rmseGiven?.[j.joint]?.cal ?? (j.cal ? rmse(j.cal, j.real) : null),
      }
    })
  }, [joints, plotW, H, tolerance, xs, w, fullFrames, rmseGiven])

  const i = ph.idx
  const x = px(xs(i))
  const valueText =
    `t ${fmtSeconds(i / fps)} s, frame ${i}. ` +
    joints
      .map((j) => {
        const parts = [`${j.joint}: real ${fmt(j.real[i], 1)}`]
        if (j.stock) parts.push(`stock delta ${fmtSigned(j.stock[i] - j.real[i], 1)}`)
        if (j.cal) parts.push(`calibrated delta ${fmtSigned(j.cal[i] - j.real[i], 1)}`)
        return parts.join(', ')
      })
      .join('; ')

  return (
    <div ref={smRef} className={`sm ${narrow ? 'is-narrow' : ''}`}>
      {narrow ? (
        <Tabs label="Joint" items={joints.map((j) => ({ id: j.joint, label: j.joint }))} value={sel} onChange={onSel} className="sm-jsel" />
      ) : null}
      <div className="sm-grid">
        <div ref={stripsRef} className="sm-strips">
          {shown.map((j) => {
            const mdl = models.find((mm) => mm.joint === j.joint)
            return (
              <div key={j.joint} className="strip">
                {!narrow ? (
                  <div className="jn">
                    <span>{j.joint}</span>
                    {mdl ? (
                      <small>
                        {mdl.sc.step.toFixed(digitsFor(mdl.sc.step))}°/div · Δ ±{mdl.ds.lim.toFixed(digitsFor(mdl.ds.lim))}°
                      </small>
                    ) : null}
                    {mdl && mdl.rmseStock != null && mdl.rmseCal != null ? (
                      <small>
                        rmse {fmt(mdl.rmseStock)} / {fmt(mdl.rmseCal)}°
                      </small>
                    ) : null}
                  </div>
                ) : null}
                <div className="plot viz">
                  {mdl ? (
                    <svg
                      viewBox={`0 0 ${plotW} ${H}`}
                      role="img"
                      aria-label={`${j.joint}: stock leaves the ±${fmt(tolerance, 1)}° mask on ${j.stock ? countOutside(j.stock, j.real, tolerance) : 0} frames, calibrated on ${j.cal ? countOutside(j.cal, j.real, tolerance) : 0}.${prov ? '' : ' Placeholder signal.'}`}
                    >
                      <g shapeRendering="crispEdges">
                        {Array.from({ length: xdiv + 1 }, (_, k) => {
                          const gx = px(PL + (k * w) / xdiv)
                          return (
                            <g key={k}>
                              <line x1={gx} x2={gx} y1={mdl.my0} y2={mdl.my0 + mdl.mH} className="g-grat" />
                              <line x1={gx} x2={gx} y1={mdl.dy0} y2={mdl.dy0 + mdl.dH} className="g-grat" />
                            </g>
                          )
                        })}
                        {[0, 1, 2, 3, 4].map((k) => {
                          const gy = px(mdl.my0 + (k * mdl.mH) / 4)
                          return <line key={k} x1={PL} x2={PL + w} y1={gy} y2={gy} className={k === 0 || k === 4 ? 'g-frame' : 'g-grat'} />
                        })}
                        <line x1={PL} x2={PL + w} y1={px(mdl.dy0 + mdl.dH)} y2={px(mdl.dy0 + mdl.dH)} className="g-frame" />
                      </g>
                      <rect x={PL} y={mdl.dys(tolerance)} width={w} height={mdl.dys(-tolerance) - mdl.dys(tolerance)} className="f-mask" />
                      <text x={PL - 5} y={mdl.my0 + 4} textAnchor="end">
                        {fmt(mdl.sc.max, digitsFor(mdl.sc.step))}
                      </text>
                      <text x={PL - 5} y={mdl.my0 + mdl.mH + 3} textAnchor="end">
                        {fmt(mdl.sc.min, digitsFor(mdl.sc.step))}
                      </text>
                      <text x={PL - 5} y={mdl.dys(0) + 3.5} textAnchor="end">
                        Δ 0
                      </text>
                      {ch.real ? <path d={mdl.band} className="f-mask" /> : null}
                      {ch.cmd && mdl.cmd ? <path d={mdl.cmd} className="tr tr-cmd" strokeWidth={1} /> : null}
                      {ch.stock && mdl.stock ? <path d={mdl.stock} className="tr tr-stock" strokeWidth={1.75} /> : null}
                      {ch.cal && mdl.cal ? <path d={mdl.cal} className="tr tr-cal" strokeWidth={3.5} /> : null}
                      {ch.real ? <path d={mdl.real} className="tr tr-real" strokeWidth={1.5} /> : null}
                      {ch.stock && mdl.combStock ? <path d={mdl.combStock} className="comb" strokeWidth={1} shapeRendering="crispEdges" /> : null}
                      {ch.cal && mdl.combCal ? <path d={mdl.combCal} className="comb" strokeWidth={1} shapeRendering="crispEdges" /> : null}
                      <line x1={PL} x2={PL + w} y1={mdl.dys(0)} y2={mdl.dys(0)} className="s-real" strokeWidth={1} />
                      {ch.stock && mdl.dStock ? <path d={mdl.dStock} className="tr tr-stock" strokeWidth={1.25} /> : null}
                      {ch.cal && mdl.dCal ? <path d={mdl.dCal} className="tr tr-cal" strokeWidth={1.25} /> : null}
                      <line x1={x} x2={x} y1={0} y2={H} className="cur-line" shapeRendering="crispEdges" />
                      {ch.stock && j.stock ? <CursorDot x={x} y={mdl.ys(j.stock[i])} channel="stock" size={6} /> : null}
                      {ch.cal && j.cal ? <CursorDot x={x} y={mdl.ys(j.cal[i])} channel="cal" size={6} /> : null}
                      {ch.real ? <CursorDot x={x} y={mdl.ys(j.real[i])} channel="real" size={6} /> : null}
                    </svg>
                  ) : null}
                </div>
              </div>
            )
          })}
          <div className="sm-axis viz">
            {!narrow ? <div /> : null}
            <div>
              {plotW > 120 ? (
                <svg viewBox={`0 0 ${plotW} 24`} aria-hidden="true">
                  {Array.from({ length: xdiv + 1 }, (_, k) => {
                    const ax = PL + (k * w) / xdiv
                    return (
                      <g key={k}>
                        <line x1={ax} x2={ax} y1={0} y2={4} className="g-muted" />
                        <text x={ax} y={16} textAnchor={k === 0 ? 'start' : k === xdiv ? 'end' : 'middle'}>
                          {(k * tb.sPerDiv).toFixed(digitsFor(tb.sPerDiv)) + (k === xdiv ? ' s' : '')}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              ) : null}
            </div>
          </div>
          <div
            className="ph"
            tabIndex={0}
            role="slider"
            aria-label={`Playhead, ${episode}, all joints`}
            aria-valuemin={0}
            aria-valuemax={n - 1}
            aria-valuenow={i}
            aria-valuetext={valueText}
            {...ph.bind}
          >
            {plotW > 120 ? (
              <span className="fflag" style={{ left: Math.min(plotW - 44, Math.max(0, x - 20)) }} aria-hidden="true">
                F{String(i).padStart(3, '0')}
              </span>
            ) : null}
          </div>
        </div>
        <div className="sm-side">
          <p className="t-legend" style={{ marginBottom: 8 }}>
            at cursor · t {fmtSeconds(i / fps)} s · frame {i}
          </p>
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">joint</th>
                <th scope="col" className="r">
                  real °
                </th>
                <th scope="col" className="r">
                  Δ stock
                </th>
                <th scope="col" className="r">
                  Δ cal
                </th>
              </tr>
            </thead>
            <tbody>
              {joints.map((j) => (
                <tr key={j.joint}>
                  <td>{j.joint}</td>
                  <td className="r">{fmt(j.real[i], 1)}</td>
                  {(['stock', 'cal'] as const).map((k) => {
                    const a = j[k]
                    if (!a) return <td key={k} className="r muted">n/a</td>
                    const d = a[i] - j.real[i]
                    const out = Math.abs(d) > tolerance
                    return (
                      <td key={k} className="r" style={out ? { color: 'var(--warn)' } : undefined}>
                        {out ? '▲ ' : ''}
                        {fmtSigned(d)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="t-caption" style={{ fontSize: 13, marginTop: 10 }}>
            Δ is twin minus real. <span className="nw">▲ amber</span>: outside the ±{fmt(tolerance, 1)}° mask.
          </p>
        </div>
      </div>
      <div className="bezel bot">
        <span>
          <span className="nw">M {tb.sPerDiv.toFixed(2)} s/div</span> · <span className="nw">{fps} fps</span> ·{' '}
          <span className="nw">each strip: own °/div and Δ scale</span>
        </span>
        {/* Wraps between items, never inside one (320px at 400% zoom). */}
        <span>
          <span className="nw">out of ±{fmt(tolerance, 1)}°:</span> <span className="nw">stock {allViol.s}</span> ·{' '}
          <span className="nw">
            cal {allViol.c} of {allViol.total} fr
          </span>
        </span>
      </div>
    </div>
  )
}
