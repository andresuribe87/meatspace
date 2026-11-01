import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'

import { digitsFor, fmt, fmtSeconds, fmtSigned } from '../format'
import { useContainerWidth, usePlayhead, type PlayheadGeometry } from '../hooks'
import { Key } from '../Key'
import { Lamp } from '../Lamp'
import { bandPath, comb, countOutside, deltaScale, extent, linePath, maxAbsResidual, timebase, yScale } from '../math'
import { ScrollBox } from '../Table'
import { CursorDot, Graticule } from './Graticule'
import { ALL_CHANNELS, CHANNEL_LABEL, CHANNEL_WORD, type ChannelVisibility, type Traces } from './types'

const px = (v: number) => Math.round(v) + 0.5

export interface ScopePlotProps {
  /** Joint name, e.g. "shoulder_lift". */
  joint: string
  /** Per-frame traces of one held-out episode (same length). real is the reference. */
  traces: Traces
  fps: number
  /** ± mask around CH1, in the trace unit (degrees). Default 1.0. */
  tolerance?: number
  /** Plot height in px at desktop width (0.9× under a 560px container). Default 300. */
  height?: number
  /** Default playhead frame. Default: the middle frame. */
  initialFrame?: number
  /** Bezel label, e.g. "held-out ep 07". */
  episode?: string
  /** Provenance of the traces (report.json trace export path). Without it the bezel shows UNCAL. */
  prov?: string
  /** Show the UNCAL lamp in the top bezel when there is no prov. Turn off when the enclosing panel already shows it (one per panel). */
  uncalLamp?: boolean
  /** [ Table ] key and table view (every 15th frame). Default true. */
  tableView?: boolean
  /** Initial channel visibility. */
  channels?: Partial<ChannelVisibility>
  /** aria-label of the plot image; defaults to a generated summary. */
  label?: string
  className?: string
}

/**
 * C-17 Instrument screen with the hero scope: one joint, main pane (64%) and a Δ = SIM − REAL pane (36%)
 * with the ±tolerance mask and the amber gap comb. CH1 real is solid on top inside its band; CH2 stock and
 * CH3 calibrated are dashed underneath; command is dotted. 10 x-divisions, 5 under a 560px container (s/div
 * doubles). The playhead is a role=slider whose aria-valuetext reads every channel and its Δ.
 *
 * @example <ScopePlot joint="shoulder_lift" traces={{ real, stock, cal }} fps={30} episode="held-out ep 07" prov="lab/reports/x/traces.json#/shoulder_lift" />
 */
export function ScopePlot({
  joint,
  traces,
  fps,
  tolerance = 1,
  height = 300,
  initialFrame,
  episode = 'held-out episode',
  prov,
  uncalLamp = true,
  tableView = true,
  channels,
  label,
  className = '',
}: ScopePlotProps) {
  const host = useRef<HTMLDivElement>(null)
  const W = useContainerWidth(host)
  const n = traces.real.length
  const vis = { ...ALL_CHANNELS, ...channels }
  const has = { real: vis.real, stock: vis.stock && !!traces.stock, cal: vis.cal && !!traces.cal, cmd: vis.cmd && !!traces.cmd }
  const small = W > 0 && W < 560
  const xdiv = small ? 5 : 10
  const Ht = Math.round(height * (small ? 0.9 : 1))
  const geom = useRef<PlayheadGeometry | null>(null)
  const ph = usePlayhead(n, fps, initialFrame ?? Math.floor(n / 2), geom)
  const [table, setTable] = useState(false)
  const clip = `sc${useId().replace(/[^a-zA-Z0-9]/g, '')}`

  const m = useMemo(() => {
    if (!W || n < 2) return null
    const real = traces.real
    const padL = 40
    const padR = 10
    const y0 = 10
    const gap = 26
    const axisB = 22
    const inner = Ht - y0 - axisB - gap
    const mainH = Math.round(inner * 0.64)
    const dH = inner - mainH
    const x0 = padL
    const w = W - padL - padR
    const tb = timebase(n, fps, xdiv)
    const fullFrames = Math.round(tb.fullS * fps) + 1
    const xs = (i: number) => x0 + (i / fps / tb.fullS) * w
    // The scale depends on the data, not on which channels are shown: toggling never rescales.
    const [lo, hi] = extent(real, traces.stock, traces.cal, traces.cmd)
    const sc = yScale(lo, hi, 8)
    const ys = (v: number) => y0 + mainH - ((v - sc.min) / (sc.step * 8)) * mainH
    const ds = deltaScale(maxAbsResidual(real, traces.stock, traces.cal), 3, tolerance)
    const dy0 = y0 + mainH + gap
    const dys = (v: number) => dy0 + dH / 2 - (v / ds.lim) * (dH / 2)
    const line = (a: ArrayLike<number>) => linePath(n, (i) => a[i], xs, ys)
    const resid = (a: ArrayLike<number>) => linePath(n, (i) => a[i] - real[i], xs, dys)
    const combPath = (a: ArrayLike<number>) =>
      comb(a, real, tolerance, w / (fullFrames - 1))
        .map(([i, d]) => `M${xs(i).toFixed(1)} ${dys(Math.sign(d) * tolerance).toFixed(1)}V${dys(d).toFixed(1)}`)
        .join('')
    return {
      x0,
      w,
      y0,
      mainH,
      dH,
      gap,
      dy0,
      tb,
      fullFrames,
      xs,
      ys,
      dys,
      sc,
      ds,
      band: bandPath(real, tolerance, xs, ys),
      real: line(real),
      stock: traces.stock ? line(traces.stock) : '',
      cal: traces.cal ? line(traces.cal) : '',
      cmd: traces.cmd ? line(traces.cmd) : '',
      dStock: traces.stock ? resid(traces.stock) : '',
      dCal: traces.cal ? resid(traces.cal) : '',
      combStock: traces.stock ? combPath(traces.stock) : '',
      combCal: traces.cal ? combPath(traces.cal) : '',
    }
  }, [W, Ht, xdiv, n, traces, fps, tolerance])

  useEffect(() => {
    geom.current = m ? { x0: m.x0, w: m.w, fullFrames: m.fullFrames } : null
  }, [m])

  const viol = useMemo(
    () => ({
      stock: traces.stock ? countOutside(traces.stock, traces.real, tolerance) : null,
      cal: traces.cal ? countOutside(traces.cal, traces.real, tolerance) : null,
    }),
    [traces, tolerance],
  )

  const i = ph.idx
  const r = traces.real
  const valueText = [
    `t ${fmtSeconds(i / fps)} s, frame ${i}`,
    has.real ? `real ${fmt(r[i], 1)} degrees` : null,
    has.stock && traces.stock ? `stock ${fmt(traces.stock[i], 1)}, delta ${fmtSigned(traces.stock[i] - r[i], 1)}` : null,
    has.cal && traces.cal ? `calibrated ${fmt(traces.cal[i], 1)}, delta ${fmtSigned(traces.cal[i] - r[i], 1)}` : null,
  ]
    .filter(Boolean)
    .join('; ')

  const summary =
    label ??
    `${episode}, ${joint}: real robot${traces.stock ? ', stock twin' : ''}${traces.cal ? ' and calibrated twin' : ''}, with the sim minus real residual below.` +
      (viol.stock != null ? ` Stock leaves the ±${fmt(tolerance, 1)}° mask on ${viol.stock} of ${n} frames` : '') +
      (viol.cal != null ? `, calibrated on ${viol.cal}.` : '.') +
      (prov ? '' : ' Placeholder signal.')

  const scaleText = m ? `${m.sc.step.toFixed(Math.max(1, digitsFor(m.sc.step)))}°/div · Δ ${m.ds.step.toFixed(Math.max(1, digitsFor(m.ds.step)))}°/div` : ''
  const keys: ReactNode[] = (['real', 'stock', 'cal', 'cmd'] as const)
    .filter((c) => (c === 'real' ? true : !!traces[c]))
    .map((c) => (
      <span key={c}>
        <i className={`sw sw--${c}`} aria-hidden="true" />
        {CHANNEL_LABEL[c]}
      </span>
    ))

  let tip: ReactNode = null
  if (m && ph.active && !table) {
    const x = m.xs(i)
    const tw = 236
    let left = x + 14
    if (left + tw > W - 4) left = x - tw - 14
    const row = (c: 'real' | 'stock' | 'cal', v: number, d: number | null) => (
      <div className="tr" key={c}>
        <i className={`sw sw--${c}`} aria-hidden="true" />
        <span>{CHANNEL_WORD[c] === 'calibrated' ? 'cal' : CHANNEL_WORD[c]}</span>
        <b>{fmt(v)}°</b>
        <span className="d">{d == null ? '' : `Δ ${fmtSigned(d)}`}</span>
      </div>
    )
    tip = (
      <div className="tip" style={{ left: Math.max(0, left), top: m.y0 + 6 }} aria-hidden="true">
        <div className="tt">
          t = {fmtSeconds(i / fps)} s · frame {i}
        </div>
        {has.real ? row('real', r[i], null) : null}
        {has.stock && traces.stock ? row('stock', traces.stock[i], traces.stock[i] - r[i]) : null}
        {has.cal && traces.cal ? row('cal', traces.cal[i], traces.cal[i] - r[i]) : null}
      </div>
    )
  }

  return (
    <div className={`scope-f ${className}`}>
      <div className="bezel top">
        <div className="keys">{keys}</div>
        <div className="meta">
          <span className="nw">{scaleText}</span>
          {!prov && uncalLamp ? <Lamp status="UNCAL" size="sm" /> : null}
        </div>
      </div>
      {table ? (
        <div style={{ padding: 'var(--s-3) var(--s-4)' }}>
          <TraceTable joint={joint} traces={traces} fps={fps} placeholder={!prov} />
        </div>
      ) : null}
      {/* The host stays mounted (hidden in table view) so its ResizeObserver keeps measuring. */}
      <div ref={host} className="scope viz" style={{ height: Ht, display: table ? 'none' : undefined }}>
          {m ? (
            <svg viewBox={`0 0 ${W} ${Ht}`} role="img" aria-label={summary} shapeRendering="geometricPrecision">
              <defs>
                <clipPath id={clip}>
                  <rect x={m.x0} y={0} width={m.w} height={Ht} />
                </clipPath>
              </defs>
              <Graticule
                x0={m.x0}
                w={m.w}
                y0={m.y0}
                h={m.mainH}
                nx={xdiv}
                ny={8}
                yLabel={(k) => (k % 2 === 0 ? fmt(m.sc.min + k * m.sc.step, digitsFor(m.sc.step)) : '')}
              />
              {Array.from({ length: xdiv + 1 }, (_, k) => (
                <text key={k} x={m.x0 + (k * m.w) / xdiv} y={Ht - 6} textAnchor={k === 0 ? 'start' : k === xdiv ? 'end' : 'middle'}>
                  {(k * m.tb.sPerDiv).toFixed(digitsFor(m.tb.sPerDiv)) + (k === xdiv ? ' s' : '')}
                </text>
              ))}
              <g clipPath={`url(#${clip})`}>
                {has.real ? <path d={m.band} className="f-mask" /> : null}
                {has.cmd ? <path d={m.cmd} className="tr tr-cmd" strokeWidth={1} /> : null}
                {has.stock ? <path d={m.stock} className="tr tr-stock" strokeWidth={2} /> : null}
                {has.cal ? <path d={m.cal} className="tr tr-cal" strokeWidth={4} /> : null}
                {has.real ? <path d={m.real} className="tr tr-real" strokeWidth={1.5} /> : null}
              </g>
              {/* Δ pane: 1-2-5 autoscale, never clipped */}
              <text x={m.x0} y={m.dy0 - 9} letterSpacing=".06em">
                Δ = SIM − REAL
              </text>
              <rect x={m.x0} y={m.dys(tolerance)} width={m.w} height={m.dys(-tolerance) - m.dys(tolerance)} className="f-mask" />
              <Graticule
                x0={m.x0}
                w={m.w}
                y0={m.dy0}
                h={m.dH}
                nx={xdiv}
                ny={6}
                yLabel={(k) => {
                  const v = -m.ds.lim + k * m.ds.step
                  return k % 2 === 0 ? (v === 0 ? '0' : fmtSigned(v, digitsFor(m.ds.step))) : ''
                }}
              />
              <g clipPath={`url(#${clip})`}>
                {has.stock && m.combStock ? <path d={m.combStock} className="comb" strokeWidth={1} shapeRendering="crispEdges" /> : null}
                {has.cal && m.combCal ? <path d={m.combCal} className="comb" strokeWidth={1} shapeRendering="crispEdges" /> : null}
                <line x1={m.x0} x2={m.x0 + m.w} y1={m.dys(0)} y2={m.dys(0)} className="s-real" strokeWidth={1} />
                {has.stock ? <path d={m.dStock} className="tr tr-stock" strokeWidth={1.5} /> : null}
                {has.cal ? <path d={m.dCal} className="tr tr-cal" strokeWidth={1.5} /> : null}
              </g>
              <g>
                <line x1={px(m.xs(i))} x2={px(m.xs(i))} y1={m.y0} y2={m.y0 + m.mainH + m.gap + m.dH} className="cur-line" shapeRendering="crispEdges" />
                {has.stock && traces.stock ? <CursorDot x={px(m.xs(i))} y={m.ys(traces.stock[i])} channel="stock" /> : null}
                {has.cal && traces.cal ? <CursorDot x={px(m.xs(i))} y={m.ys(traces.cal[i])} channel="cal" /> : null}
                {has.real ? <CursorDot x={px(m.xs(i))} y={m.ys(r[i])} channel="real" /> : null}
              </g>
            </svg>
          ) : null}
          <div
            className="ph"
            tabIndex={0}
            role="slider"
            aria-label={`Playhead, ${joint}, ${episode}`}
            aria-valuemin={0}
            aria-valuemax={n - 1}
            aria-valuenow={i}
            aria-valuetext={valueText}
            {...ph.bind}
          />
          {tip}
        </div>
      <div className="bezel bot">
        <span>
          <span className="nw">{episode}</span> · <span className="nw">{joint}</span> ·{' '}
          <span className="nw">M {m ? m.tb.sPerDiv.toFixed(2) : '…'} s/div</span> · <span className="nw">{fps} fps</span>
        </span>
        <span className="ds-row" style={{ gap: 10 }}>
          <span className="nw">
            mask ±{fmt(tolerance, 1)}°{viol.stock != null ? ` · out: stock ${viol.stock}` : ''}
            {viol.cal != null ? ` / cal ${viol.cal}` : ''} of {n} fr
          </span>
          {tableView ? (
            <Key variant="ghost" size="sm" aria-pressed={table} onClick={() => setTable((t) => !t)}>
              {table ? 'Chart' : 'Table'}
            </Key>
          ) : null}
        </span>
      </div>
    </div>
  )
}

/** Table view of one joint's traces: every `every`th frame with t, frame, real, stock, Δ, calibrated, Δ. */
export function TraceTable({
  joint,
  traces,
  fps,
  every = 15,
  placeholder,
  caption,
}: {
  joint: string
  traces: Traces
  fps: number
  every?: number
  placeholder?: boolean
  caption?: ReactNode
}) {
  const rows: number[] = []
  for (let i = 0; i < traces.real.length; i += every) rows.push(i)
  const r = traces.real
  return (
    <ScrollBox label={`${joint} trace table`}>
      <table className="tbl">
        <caption>
          {caption ?? (
            <>
              {joint}, every {every}th frame, degrees.{placeholder ? ' Placeholder signal.' : ''}
            </>
          )}
        </caption>
        <thead>
          <tr>
            <th scope="col">t (s)</th>
            <th scope="col" className="r">
              frame
            </th>
            <th scope="col" className="r">
              real
            </th>
            {traces.stock ? (
              <>
                <th scope="col" className="r">
                  stock
                </th>
                <th scope="col" className="r">
                  Δ stock
                </th>
              </>
            ) : null}
            {traces.cal ? (
              <>
                <th scope="col" className="r">
                  calibrated
                </th>
                <th scope="col" className="r">
                  Δ cal
                </th>
              </>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((i) => (
            <tr key={i}>
              <td>{fmtSeconds(i / fps)}</td>
              <td className="r">{i}</td>
              <td className="r">{fmt(r[i])}</td>
              {traces.stock ? (
                <>
                  <td className="r">{fmt(traces.stock[i])}</td>
                  <td className="r">{fmtSigned(traces.stock[i] - r[i])}</td>
                </>
              ) : null}
              {traces.cal ? (
                <>
                  <td className="r">{fmt(traces.cal[i])}</td>
                  <td className="r">{fmtSigned(traces.cal[i] - r[i])}</td>
                </>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollBox>
  )
}
