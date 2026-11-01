import { useId, useState, type ReactNode } from 'react'

import { Key } from './Key'
import { Lamp } from './Lamp'

/** C-18 Ruler: 1px edge rule with 8px minor and 40px major ticks. Under section heads and certificate headers only, never inside a panel. */
export function Ruler({ className = '' }: { className?: string }) {
  return <div className={`ruler ${className}`} aria-hidden="true" />
}

export interface PanelProps {
  /** Header legend. Wrap the key words in <b> to light them: <><b>Table 1</b> · characteristics</>. */
  title: ReactNode
  /** Heading level of the title. Default h2. Use 'div' when the panel title is not a heading. */
  heading?: 'h2' | 'h3' | 'h4' | 'div'
  /** Right side of the header: lamps, keys. */
  actions?: ReactNode
  /** The panel holds placeholder numbers: renders exactly one UNCAL lamp in the header. */
  uncal?: boolean
  /** No body padding (tables, consoles). */
  flush?: boolean
  as?: 'section' | 'div' | 'article' | 'aside'
  id?: string
  className?: string
  bodyClassName?: string
  children: ReactNode
}

/**
 * Panel: surface with a hairline border and a 36px header (caps legend left, lamps and keys right).
 *
 * @example <Panel title={<><b>Table 1</b> · characteristics · held-out</>} uncal flush>…</Panel>
 */
export function Panel({ title, heading = 'h2', actions, uncal, flush, as: Tag = 'section', id, className = '', bodyClassName = '', children }: PanelProps) {
  const hid = useId()
  const H = heading
  return (
    <Tag id={id} className={`pnl ${className}`} aria-labelledby={Tag === 'div' ? undefined : hid}>
      <div className="pnl-h">
        <H id={hid} className="t-legend">
          {title}
        </H>
        {uncal || actions ? (
          <span className="ds-row">
            {uncal ? <Lamp status="UNCAL" /> : null}
            {actions}
          </span>
        ) : null}
      </div>
      <div className={`pnl-b ${flush ? 'flush' : ''} ${bodyClassName}`}>{children}</div>
    </Tag>
  )
}

export interface SectionHeaderProps {
  /** Big section numeral ("03"). Omit for an unnumbered section. */
  numeral?: string
  /** Caps eyebrow above the title. */
  eyebrow?: ReactNode
  title: ReactNode
  /** Sans caption on the right. */
  description?: ReactNode
  /** Heading level. Default 2. */
  level?: 1 | 2 | 3
  /** id of the heading (for aria-labelledby on the section). */
  id?: string
  className?: string
}

/** Section header on the 10-division grid: numeral, eyebrow + title, description, then the ruler. */
export function SectionHeader({ numeral, eyebrow, title, description, level = 2, id, className = '' }: SectionHeaderProps) {
  const H = `h${level}` as 'h1' | 'h2' | 'h3'
  return (
    <div className={`sec-h ${numeral ? '' : 'no-num'} ${description ? '' : 'no-dsc'} ${className}`}>
      {numeral ? (
        <div className="sn" aria-hidden="true">
          {numeral}
        </div>
      ) : null}
      <div className="ttl">
        {eyebrow ? <p className="t-legend">{eyebrow}</p> : null}
        <H id={id} className="t-h2">
          {title}
        </H>
      </div>
      {description ? <p className="dsc t-caption">{description}</p> : null}
      <Ruler />
    </div>
  )
}

export interface FigureProps {
  /** Figure number, printed "Fig n". */
  number?: number | string
  /** What and statistic: "held-out episode 07 · real vs stock vs calibrated · all 5 joints". */
  title: ReactNode
  /** No provenance yet: shows the UNCAL lamp in the header (required while placeholders exist). */
  uncal?: boolean
  /** Extra header controls (channel keys) placed before the lamp and the table toggle. */
  controls?: ReactNode
  /** Table view. Every figure has one; the [ Table ] key toggles it (aria-pressed). */
  table?: ReactNode
  /** Sans caption: method and the pass rule. */
  caption?: ReactNode
  /** Keyboard hint line under the caption. */
  keys?: ReactNode
  /** Padded body (bars, lag). Plots that draw edge to edge pass false. */
  padded?: boolean
  id?: string
  className?: string
  children: ReactNode
}

/**
 * Figure frame for the report data-viz: header `Fig n · what · statistic`, UNCAL lamp while placeholders
 * exist, a [ Table ] toggle, then a sans figcaption with the method and the rule. No titles inside plots.
 */
export function Figure({ number, title, uncal, controls, table, caption, keys, padded = true, id, className = '', children }: FigureProps) {
  const [tableView, setTableView] = useState(false)
  const tid = useId()
  return (
    <figure id={id} className={`fig ${className}`} aria-labelledby={tid}>
      <div className="fig-h">
        <span className="t-legend" id={tid}>
          {number != null ? <b>Fig {number}</b> : null}
          {number != null ? ' · ' : null}
          {title}
        </span>
        <span className="ds-row" style={{ gap: 6 }}>
          {controls}
          {uncal ? <Lamp status="UNCAL" /> : null}
          {table ? (
            <Key variant="ghost" size="sm" aria-pressed={tableView} onClick={() => setTableView((v) => !v)}>
              {tableView ? 'Chart' : 'Table'}
            </Key>
          ) : null}
        </span>
      </div>
      {tableView && table ? <div className="fig-b">{table}</div> : padded ? <div className="fig-b">{children}</div> : children}
      {caption || keys ? (
        <figcaption className="fig-cap">
          {caption ? <p className="t-caption">{caption}</p> : null}
          {keys ? <p className="kb">{keys}</p> : null}
        </figcaption>
      ) : null}
    </figure>
  )
}
