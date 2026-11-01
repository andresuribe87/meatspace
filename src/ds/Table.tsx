import { useMemo, useRef, useState, type ReactNode } from 'react'

import { useOverflowA11y } from './hooks'

/**
 * Overflow container: scrolls sideways inside its own box, never the page. When it overflows it
 * becomes focusable (tabIndex 0) and is named (role=region + aria-label), so keyboard users can scroll it.
 */
export function ScrollBox({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useOverflowA11y(ref, `${label}, scrolls sideways`)
  return (
    <div ref={ref} className={`tbl-wrap ${className}`}>
      {children}
    </div>
  )
}

export interface Column<R> {
  key: string
  header: ReactNode
  /** Numbers right-aligned at fixed precision. */
  align?: 'left' | 'right'
  /** Makes the header a sort button (th aria-sort). Return null for rows that always sort last (refused). */
  sort?: (row: R) => number | string | null
  cell: (row: R, index: number) => ReactNode
  /** Label printed above the value when the table stacks on a phone. Defaults to the header when it is a string. */
  label?: string
  /** Stack mode: this cell spans the whole card (e.g. the dataset id). */
  lead?: boolean
  /** Let this cell wrap (prose); cells are nowrap by default. */
  wrap?: boolean
  className?: string
}

export interface TableProps<R> {
  columns: Column<R>[]
  rows: R[]
  rowKey: (row: R, index: number) => string
  /** Accessible name of the scroll region (and of the table when there is no caption). */
  label: string
  /** Sans caption under the table: method, units, n. */
  caption?: ReactNode
  rowClassName?: (row: R) => string | undefined
  /**
   * Collapse the cells from column index `from` into one cell for this row (refused rows: REFUSED lamp + reason).
   * Return null for a normal row.
   */
  span?: (row: R) => { from: number; content: ReactNode } | null
  /** Summary row on an edge rule (arm mean). */
  summary?: R
  /** Stack into labelled rows on a ≤ 760px container, so it never scrolls sideways on phones (report index). */
  stack?: boolean
  /** Tighter cell padding (synopsis tables). */
  compact?: boolean
  initialSort?: { key: string; dir: 'ascending' | 'descending' }
  className?: string
}

/**
 * C-10 Table: caps legend headers on an edge rule, 13px tabular cells, right-aligned numbers, hairline rows,
 * raised hover row, summary on an edge rule. Sortable headers are buttons inside th[aria-sort].
 * Scrolls inside its own focusable, named box when it overflows.
 *
 * @example <Table label="Report index" columns={cols} rows={reports} rowKey={(r) => r.id} stack span={(r) => r.refused ? { from: 2, content: … } : null} />
 */
export function Table<R>({
  columns,
  rows,
  rowKey,
  label,
  caption,
  rowClassName,
  span,
  summary,
  stack,
  compact,
  initialSort,
  className = '',
}: TableProps<R>) {
  const [sort, setSort] = useState(initialSort ?? null)
  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col?.sort) return rows
    const get = col.sort
    return [...rows].sort((a, b) => {
      const x = get(a)
      const y = get(b)
      if (x === null && y === null) return 0
      if (x === null) return 1
      if (y === null) return -1
      const c = typeof x === 'string' && typeof y === 'string' ? x.localeCompare(y) : (x as number) - (y as number)
      return sort.dir === 'ascending' ? c : -c
    })
  }, [rows, columns, sort])

  const toggle = (key: string) =>
    setSort((s) => ({ key, dir: s?.key === key && s.dir === 'ascending' ? 'descending' : 'ascending' }))

  const labelOf = (c: Column<R>) => c.label ?? (typeof c.header === 'string' ? c.header : undefined)

  const renderRow = (r: R, i: number, extraClass?: string) => {
    const sp = span?.(r) ?? null
    const cls = [rowClassName?.(r), extraClass].filter(Boolean).join(' ') || undefined
    const cells = sp ? columns.slice(0, sp.from) : columns
    return (
      <tr key={rowKey(r, i)} className={cls}>
        {cells.map((c) => (
          <td
            key={c.key}
            data-label={c.lead ? undefined : labelOf(c)}
            className={[c.align === 'right' ? 'r' : '', c.wrap ? 'wrap-ok' : '', c.lead ? 'lead' : '', c.className ?? ''].filter(Boolean).join(' ') || undefined}
          >
            {c.cell(r, i)}
          </td>
        ))}
        {sp ? (
          <td colSpan={columns.length - sp.from} className="wrap-ok full">
            {sp.content}
          </td>
        ) : null}
      </tr>
    )
  }

  const table = (
    <table className={['tbl', stack ? 'tbl--stack' : '', compact ? 'tbl--compact' : '', className].filter(Boolean).join(' ')} aria-label={caption ? undefined : label}>
      {caption ? <caption>{caption}</caption> : null}
      <thead>
        <tr>
          {columns.map((c) => {
            const ariaSort = c.sort ? (sort?.key === c.key ? sort.dir : 'none') : undefined
            return (
              <th key={c.key} scope="col" aria-sort={ariaSort} className={c.align === 'right' ? 'r' : undefined}>
                {c.sort ? (
                  <button type="button" onClick={() => toggle(c.key)}>
                    {c.header}
                  </button>
                ) : (
                  c.header
                )}
              </th>
            )
          })}
        </tr>
      </thead>
      <tbody>
        {sorted.map((r, i) => renderRow(r, i))}
        {summary ? renderRow(summary, -1, 'sum') : null}
      </tbody>
    </table>
  )
  return stack ? (
    <div className="cq">
      <ScrollBox label={label}>{table}</ScrollBox>
    </div>
  ) : (
    <ScrollBox label={label}>{table}</ScrollBox>
  )
}
