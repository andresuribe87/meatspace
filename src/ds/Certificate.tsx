import { Fragment, type ReactNode } from 'react'

import type { LampKind, LampWord } from '../../shared/status'
import { Lamp } from './Lamp'

/**
 * Ids that wrap: inserts <wbr> after "/" and "_" so `lerobot/svla_so101_pickplace` breaks at sensible
 * points and never truncates.
 */
export function Ids({ children }: { children: string }) {
  const parts = children.split(/(?<=[/_])/)
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {p}
          {i < parts.length - 1 ? <wbr /> : null}
        </Fragment>
      ))}
    </>
  )
}

export interface SealProps {
  /** Legend after CAL: "twin record", "system record". */
  word: ReactNode
  /** Rows: fit-on, delay, params, kp stock → fitted, package, sha256. Values wrap, never truncate. */
  rows: [ReactNode, ReactNode][]
  /** Lamp at the right of the header (UNCAL while values are placeholders, or a revision word). */
  lamp?: ReactNode
  className?: string
  label?: string
}

/** C-15 Calibration seal: carbon card, edge border, folded corner, `CAL` in the readout face, then a record. */
export function Seal({ word, rows, lamp, className = '', label }: SealProps) {
  return (
    <div className={`seal ${className}`} role={label ? 'group' : undefined} aria-label={label}>
      <div className="seal-h">
        <span className="cal">CAL</span>
        <span className="t-legend" style={{ color: 'var(--text)' }}>
          {word}
        </span>
        {lamp}
      </div>
      <dl>
        {rows.map(([k, v], i) => (
          <Fragment key={i}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </Fragment>
        ))}
      </dl>
    </div>
  )
}

export interface TitleField {
  k: ReactNode
  v: ReactNode
  /** Columns spanned on the 6-column block (1, 2, 3, 4 or 6). */
  span?: 1 | 2 | 3 | 4 | 6
}

/** C-20 Title block: a 6-column grid of labelled fields (9.5px caps key, 12.5px value); 2 columns on phones. */
export function TitleBlock({ fields, label = 'Title block' }: { fields: TitleField[]; label?: string }) {
  return (
    <div className="cq">
      <div className="tblock" role="group" aria-label={label}>
        {fields.map((f, i) => (
          <div key={i} className={f.span && f.span > 1 ? `w${f.span}` : undefined}>
            <span className="k">{f.k}</span>
            <span className="v">{f.v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export interface ProvenanceCell {
  k: ReactNode
  /** Boxed datum letter before the key: R (reference dataset), T (twin). */
  datum?: string
  v: ReactNode
}

/**
 * C-20 Provenance frame: a GD&T-style row `ε̄ | value · CI | [R] dataset@rev | [T] twin@sha | split · method`.
 * Reflows to 3 then 2 columns and never truncates. Use <Ids> inside ids.
 */
export function ProvenanceFrame({ symbol = 'ε', cells, label = 'Provenance' }: { symbol?: ReactNode; cells: ProvenanceCell[]; label?: string }) {
  return (
    <div className="cq">
      <div className="pframe" role="group" aria-label={label}>
        <div className="sym" aria-hidden="true">
          <span className="ebar">{symbol}</span>
        </div>
        {cells.map((c, i) => (
          <div key={i}>
            <span className="k">
              {c.datum ? <i>{c.datum}</i> : null}
              {c.k}
            </span>
            {c.v}
          </div>
        ))}
      </div>
    </div>
  )
}

export interface PollRow {
  /** UNITS, MAPPING, SPLIT, HELD-OUT, CONTACT, SIGNING (from report.json). */
  check: string
  why: ReactNode
  /** GO, CAUTION, SCOPE, PLANNED... */
  status: LampWord
  /** Override the lamp kind for a phrase. */
  kind?: LampKind
  word?: ReactNode
}

/** C-21 Check poll (go / no-go): one row per report check with a reason and a lamp; result row on raised. */
export function CheckPoll({ rows, result, label = 'Report checks' }: { rows: PollRow[]; result?: PollRow; label?: string }) {
  const lamp = (r: PollRow) => (r.kind ? <Lamp kind={r.kind} size="sm">{r.word ?? r.status.toLowerCase()}</Lamp> : <Lamp status={r.status} size="sm">{r.word}</Lamp>)
  return (
    <div className="cq">
      <ul className="poll" aria-label={label}>
        {rows.map((r) => (
          <li key={r.check}>
            <span className="ck">{r.check}</span>
            <span className="why">{r.why}</span>
            {lamp(r)}
          </li>
        ))}
        {result ? (
          <li className="res">
            <span className="ck">{result.check}</span>
            <span className="why">{result.why}</span>
            {lamp(result)}
          </li>
        ) : null}
      </ul>
    </div>
  )
}

export interface CertificateHeaderProps {
  /** Eyebrow, e.g. "reports / lerobot/svla_so101_pickplace". */
  eyebrow?: ReactNode
  /** Report title (dataset x twin). Use <Ids> so it wraps. */
  title: ReactNode
  /** One muted facts line under the title. */
  meta?: ReactNode
  fields: TitleField[]
  /** Calibration seal on the right (C-15). */
  seal?: ReactNode
  /** Heading level of the title. Default 1 (the report page's H1). */
  level?: 1 | 2 | 3
}

/**
 * Certificate header (the /reports/:id top block): eyebrow, H1 title, facts line and title block on the
 * left, the calibration seal on the right. Stacks under a 1000px container.
 */
export function CertificateHeader({ eyebrow, title, meta, fields, seal, level = 1 }: CertificateHeaderProps) {
  const H = `h${level}` as 'h1' | 'h2' | 'h3'
  return (
    <div className="cert">
      <div className="cert-head">
        <div className="ds-stack" style={{ minWidth: 0 }}>
          {eyebrow ? <p className="t-legend">{eyebrow}</p> : null}
          <H className="cert-h1">{title}</H>
          {meta ? <p className="t-ui muted">{meta}</p> : null}
          <TitleBlock fields={fields} />
        </div>
        {seal}
      </div>
    </div>
  )
}
