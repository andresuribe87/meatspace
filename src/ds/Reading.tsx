import type { ReactNode } from 'react'

import { fmt } from './format'
import { Num, type Provenance } from './Num'
import type { Channel } from './viz/types'

export interface ReadingProps {
  /** Legend, e.g. "held-out rmse · stock twin". Rendered as caps legend. */
  label: ReactNode
  /** Channel line key shown before the legend (colour + dash, same as the traces). */
  channel?: Channel
  value: number
  digits?: number
  /** Always print a sign (−79%). */
  signed?: boolean
  /**
   * Unit. "°" stays full size (it sits at cap height); alphabetic units (ms, fr, %, eps) shrink to .42em
   * and keep their case. "%" is tight, the others spaced.
   */
  unit?: string
  /** 95% interval [lo, hi]. Required: pass null only when the reading has no interval, and say why nearby. */
  ci: [number, number] | null
  /** Sample size. Required wherever an interval appears; pass null only when it does not apply. */
  n: number | null
  /** Words after "n = 10", e.g. "held-out episodes". */
  nLabel?: ReactNode
  /** Interval label, default "95%". */
  ciLabel?: string
  /** Text before the interval on the CI line, e.g. "(133 ms) ·". */
  ciPrefix?: ReactNode
  /** Text after the interval, e.g. "· p90 5.61°". */
  extra?: ReactNode
  /** xl 112, l 64, m 40, s 26 (phone xl 72, l 48). */
  size?: 'xl' | 'l' | 'm' | 's'
  /** Stacked asymmetric tolerance display variant (sizes xl, l, m only). The bracket form is always printed too. */
  tolerance?: boolean
  /** Provenance for the value and its interval. Without it every figure renders UNCAL. */
  prov?: string | Provenance
  placeholder?: boolean
  className?: string
}

function Unit({ unit }: { unit: string }) {
  if (unit === '°' || unit === 'deg') return <span className="deg">°</span>
  return <span className={unit === '%' ? 'uu' : 'uu sp'}>{unit}</span>
}

/**
 * C-04 Readout ("Reading"): legend → value → `95% [lo, hi]` → `n = …`. Replaces the stat tile.
 * Never a bare number; never coloured by verdict.
 *
 * @example <Reading label="held-out rmse · calibrated" channel="cal" value={1.07} unit="°" ci={[1.0, 1.15]} n={10} nLabel="held-out episodes" prov={p} />
 */
export function Reading({
  label,
  channel,
  value,
  digits = 2,
  signed,
  unit,
  ci,
  n,
  nLabel,
  ciLabel = '95%',
  ciPrefix,
  extra,
  size = 'l',
  tolerance,
  prov,
  placeholder,
  className = '',
}: ReadingProps) {
  const showTol = tolerance && ci && size !== 's'
  return (
    <div className={`ro ${className}`}>
      <div className="ro-l t-legend">
        {channel ? <i className={`sw sw--${channel}`} style={{ width: 16 }} aria-hidden="true" /> : null}
        {label}
      </div>
      <div className={`ro-v ${size}`}>
        <Num className="n" value={value} digits={digits} signed={signed} prov={prov} placeholder={placeholder} />
        {unit ? <Unit unit={unit} /> : null}
        {showTol ? (
          <span className="tol" aria-hidden="true">
            <span>+{fmt(ci[1] - value, digits)}</span>
            <span>−{fmt(value - ci[0], digits)}</span>
          </span>
        ) : null}
      </div>
      {ci || ciPrefix || extra ? (
        <div className="ro-ci">
          {ciPrefix ? <>{ciPrefix} </> : null}
          {ci ? (
            <>
              {ciLabel}{' '}
              <span className="nw">
                [<Num value={ci[0]} digits={digits} prov={prov} placeholder={placeholder} />,{' '}
                <Num value={ci[1]} digits={digits} prov={prov} placeholder={placeholder} />]
              </span>
            </>
          ) : null}
          {extra ? <> {extra}</> : null}
        </div>
      ) : null}
      {n != null ? (
        <div className="ro-n">
          <span className="nw">n = {n}</span>
          {nLabel ? <> {nLabel}</> : null}
        </div>
      ) : null}
    </div>
  )
}

/** Alias: the spec calls it a Readout. */
export const Readout = Reading
