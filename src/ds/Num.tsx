import { Fragment, useEffect, useId, useRef, useState, type ReactNode } from 'react'

import { fmt, fmtSigned } from './format'

/** Where a number came from. `ref` is the field path or URL; the rest fills the provenance popover. */
export interface Provenance {
  /** Field path into report.json (`lab/reports/x/report.json#/headline/stock/mean`) or a cited URL. Required. */
  ref: string
  /** The full reading, e.g. "4.93 deg [4.64, 5.25] held-out, n = 10". */
  reading?: string
  field?: string
  file?: string
  /** dataset@rev */
  dataset?: string
  /** twin@sha · mujoco version */
  twin?: string
  /** report sha256 and run */
  report?: string
}

export interface NumProps {
  /** The number (or a pre-formatted string such as a sha or a date). */
  value: number | string | null | undefined
  /** Fixed precision. Default 2. */
  digits?: number
  /** Always print a sign (+0.73, −79). */
  signed?: boolean
  /** ASCII minus for copyable contexts (code, JSON twins). Screen text uses a true minus. */
  ascii?: boolean
  /** Unit printed right after the figure, inside the same span (e.g. "°" in a table cell). */
  unit?: ReactNode
  /**
   * Provenance. Default-deny: without it the number renders as UNCAL (dashed amber underline, no data-prov),
   * and the e2e audit fails the production build. A string sets data-prov; an object also makes the number a
   * button that opens the provenance popover.
   */
  prov?: string | Provenance
  /** Acknowledged placeholder: silences the dev warning. Still renders UNCAL and still fails the production audit. */
  placeholder?: boolean
  className?: string
}

let warned = 0

/**
 * C-03 Num, the honesty primitive. Numbers are default-deny: no `prov`, no plain rendering.
 * A panel holding any UNCAL Num must show one UNCAL lamp (Panel `uncal`, Figure without `prov`).
 *
 * @example <Num value={h.stock.mean} prov="lab/reports/x/report.json#/headline/stock/mean" />
 * @example <Num value={5.06} />  // renders UNCAL
 */
export function Num({ value, digits = 2, signed, ascii, unit, prov, placeholder, className = '' }: NumProps) {
  const text =
    value == null ? 'n/a' : typeof value === 'number' ? (signed ? fmtSigned(value, digits, ascii) : fmt(value, digits, ascii)) : value
  const ref = typeof prov === 'string' ? prov : prov?.ref

  useEffect(() => {
    if (ref || placeholder || !import.meta.env.DEV || warned > 20) return
    warned++
    console.warn(`[ds] <Num value=${JSON.stringify(value)}> has no prov: it renders UNCAL and fails the production audit.`)
  }, [ref, placeholder, value])

  const cls = ['num', className].filter(Boolean).join(' ')
  if (!ref) {
    return (
      <span className={cls} data-uncal="" title="Placeholder: not measured">
        {text}
        {unit}
      </span>
    )
  }
  if (typeof prov === 'string') {
    return (
      <span className={cls} data-prov={ref}>
        {text}
        {unit}
      </span>
    )
  }
  return <ProvNum text={text} unit={unit} prov={prov!} className={cls} />
}

function ProvNum({ text, unit, prov, className }: { text: string; unit: ReactNode; prov: Provenance; className: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const btn = useRef<HTMLButtonElement>(null)
  const pop = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        btn.current?.focus()
      }
    }
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (!pop.current?.contains(t) && !btn.current?.contains(t)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  const rows: [string, string | undefined][] = [
    ['value', prov.reading],
    ['field', prov.field],
    ['file', prov.file ?? prov.ref],
    ['dataset', prov.dataset],
    ['twin', prov.twin],
    ['report', prov.report],
  ]
  return (
    <span className="num-wrap">
      <button
        ref={btn}
        type="button"
        className={className}
        data-prov={prov.ref}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        {text}
        {unit}
      </button>
      <span ref={pop} id={id} className="prov-pop" role="dialog" aria-label="Provenance" hidden={!open}>
        {/* Spans, not <dl>: a Num may sit inside a paragraph. */}
        <span className="pp">
          {rows
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <Fragment key={k}>
                <span className="k">{k}</span>
                <span className="v">{v}</span>
              </Fragment>
            ))}
        </span>
      </span>
    </span>
  )
}
