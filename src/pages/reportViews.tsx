/**
 * Report views shared by the home page and /reports: number cells with provenance, the report index table, the
 * held-out set switch, the SO-101 vs SO-100 findings and the memo's bar. Every number is a ds <Num> with `prov`
 * (a report.json pointer or an index.json pointer), never typed by hand.
 */
import type { MouseEvent, ReactNode } from 'react'

import {
  baselineShort,
  baselineVerdict,
  FAMILY_LABEL,
  gapShort,
  gapVerdict,
  pct,
  reportProv,
  type Change,
  type Est as EstT,
  type Family,
  type HeldoutSet,
  type OkReportSummary,
  type Range,
  type RejectedReportSummary,
  type ReportIndex,
  type SetSummary,
} from '../../shared/reports'
import { Ids, Lamp, ModeSwitch, Num as DsNum, Panel, Table, type Column, type NumProps, type TableProps } from '../ds'
import { MEMO_URL } from '../../shared/constants'
import { BAR, BAR_QUOTE, BAR_SOURCE, barByFamily, familyReports, notHelped, rangeOver, TASK_WORDS } from '../lib/findings'

/** ds Num in the terminal face: a number is a mono island even inside prose (the audit's face rule). */
function Num(p: NumProps) {
  return <DsNum {...p} className={p.className ? `font-mono ${p.className}` : 'font-mono'} />
}

type Go = (e: MouseEvent<HTMLAnchorElement>) => void

/* ------------------------------------------------------------------------------------------------
 * Number cells
 * ---------------------------------------------------------------------------------------------- */

/** "5.35° [5.14, 5.54]": an RMSE estimate, degrees. `stacked` puts the interval on its own muted line (tables). */
export function Est({ e, digits = 2, stacked }: { e: EstT; digits?: number; stacked?: boolean }) {
  const ci = (
    <span className="nw">
      [<Num value={e.ci95[0]} digits={digits} prov={e.prov} />, <Num value={e.ci95[1]} digits={digits} prov={e.prov} />]
    </span>
  )
  return stacked ? (
    <>
      <Num value={e.mean} digits={digits} unit="°" prov={e.prov} />
      <small className="block text-[10.5px] text-muted">{ci}</small>
    </>
  ) : (
    <span className="nw">
      <Num value={e.mean} digits={digits} unit="°" prov={e.prov} /> <span className="muted">{ci}</span>
    </span>
  )
}

/** "−91% [−92, −91]": a paired change, whole percent, signed. Negative = better. */
export function Chg({ c, stacked }: { c: Pick<Change, 'mean' | 'ci95' | 'prov'>; stacked?: boolean }) {
  const ci = (
    <span className="nw">
      [<Num value={pct(c.ci95[0])} digits={0} signed prov={c.prov} />, <Num value={pct(c.ci95[1])} digits={0} signed prov={c.prov} />]
    </span>
  )
  return stacked ? (
    <>
      <Num value={pct(c.mean)} digits={0} signed unit="%" prov={c.prov} />
      <small className="block text-[10.5px] text-muted">{ci}</small>
    </>
  ) : (
    <span className="nw">
      <Num value={pct(c.mean)} digits={0} signed unit="%" prov={c.prov} /> <span className="muted">{ci}</span>
    </span>
  )
}

/** A percent range over several reports, from an index aggregate: "−91% to −76%". */
export function PctRange({ r }: { r: Pick<Range, 'min' | 'max' | 'prov'> }) {
  return (
    <span className="nw">
      <Num value={pct(r.min)} digits={0} signed unit="%" prov={r.prov} /> to <Num value={pct(r.max)} digits={0} signed unit="%" prov={r.prov} />
    </span>
  )
}

/** A plain range over several reports, from an index aggregate: "112 to 179 ms". */
export function NumRange({ r, digits = 0, unit }: { r: Pick<Range, 'min' | 'max' | 'prov'>; digits?: number; unit?: string }) {
  return (
    <span className="nw">
      <Num value={r.min} digits={digits} prov={r.prov} /> to <Num value={r.max} digits={digits} prov={r.prov} />
      {unit ? (unit === '°' ? unit : ` ${unit}`) : null}
    </span>
  )
}

/**
 * C-04 readout for a range over datasets (no interval: it is not an estimate, it is the spread). Uses the readout
 * classes of the design system; the caption says what the range is over.
 */
export function RangeReading({ label, min, max, unit, digits = 0, signed, prov, note }: { label: ReactNode; min: number; max: number; unit: string; digits?: number; signed?: boolean; prov: string; note: ReactNode }) {
  return (
    <div className="ro">
      <div className="ro-l t-legend">{label}</div>
      <div className="ro-v s">
        <DsNum className="n" value={min} digits={digits} signed={signed} prov={prov} />
        <span className="uu sp">to</span>
        <span className="ml-[0.3em]">
          <DsNum className="n" value={max} digits={digits} signed={signed} prov={prov} />
        </span>
        <span className={unit === '%' ? 'uu' : 'uu sp'}>{unit}</span>
      </div>
      <div className="ro-n">{note}</div>
    </div>
  )
}

/** Verdict lamps of one held-out set: the gap label against stock, then the comparison with the lag filter. */
export function VerdictLamps({ s }: { s: SetSummary }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-[6px]">
      <Lamp status={gapVerdict(s.gap_label)} size="sm" title={`vs stock: ${s.gap_label}`}>
        {gapShort(s.gap_label)}
      </Lamp>
      <Lamp status={baselineVerdict(s.baseline_label)} size="sm" title={`vs physics-free lag filter: ${s.baseline_label}`}>
        {baselineShort(s.baseline_label)}
      </Lamp>
    </span>
  )
}

/* ------------------------------------------------------------------------------------------------
 * Stacked tables
 * ---------------------------------------------------------------------------------------------- */

/**
 * ds Table in `stack` mode, with its caption printed under the table instead of inside it: a <caption> inside a
 * stacked (display: block) table collapses to a one-word-wide column on phones.
 */
export function StackTable<R>(props: TableProps<R>) {
  const { caption, ...rest } = props
  return (
    <div>
      <Table {...rest} stack />
      {caption ? <p className="t-caption mt-[var(--s-3)]">{caption}</p> : null}
    </div>
  )
}

/* ------------------------------------------------------------------------------------------------
 * Held-out set switch
 * ---------------------------------------------------------------------------------------------- */

export function SetSwitch({ value, onChange, label = 'Held-out set' }: { value: HeldoutSet; onChange: (s: HeldoutSet) => void; label?: string }) {
  return (
    <ModeSwitch
      label={label}
      value={value}
      onChange={(v) => onChange(v as HeldoutSet)}
      options={[
        { value: 'future', label: 'future block', title: 'The last 20% of episodes by index, recorded after every fit episode' },
        { value: 'interleaved', label: 'interleaved', title: 'Random episodes from the same period as the fit episodes' },
      ]}
    />
  )
}

/* ------------------------------------------------------------------------------------------------
 * Report index table
 * ---------------------------------------------------------------------------------------------- */

type IndexRow = { kind: 'ok'; r: OkReportSummary } | { kind: 'refused'; r: RejectedReportSummary }

export interface ReportIndexTableProps {
  index: ReportIndex
  set: HeldoutSet
  go: Go
  /** Include the refused rows, spanned with their reason. */
  refused?: boolean
  /** Fewer columns (home page). */
  compact?: boolean
  /** Two columns that fit a phone without stacking: dataset (with robot and verdict), then vs stock over vs baseline. */
  mini?: boolean
  label?: string
  caption?: ReactNode
}

/** C-10 report index: every ok report, then (optionally) the refused ones with their reason. Sortable; stacks on phones. */
export function ReportIndexTable({ index, set, go, refused = true, compact, mini, label = 'Report index', caption }: ReportIndexTableProps) {
  const rows: IndexRow[] = [...index.reports.map((r) => ({ kind: 'ok' as const, r })), ...(refused ? index.rejected.map((r) => ({ kind: 'refused' as const, r })) : [])]
  const ok = (row: IndexRow) => (row.kind === 'ok' ? row.r : null)
  const num = (get: (r: OkReportSummary) => number) => (row: IndexRow) => {
    const r = ok(row)
    return r ? get(r) : null
  }
  if (mini) {
    const miniCols: Column<IndexRow>[] = [
      {
        key: 'dataset',
        header: 'dataset',
        wrap: true,
        cell: (row) => (
          <span className="flex flex-col gap-[4px]">
            <a className="lnk" href={`/reports/${row.r.id}`} onClick={go}>
              <Ids>{row.r.dataset}</Ids>
            </a>
            <span className="text-[11px] text-muted">{row.r.robot}</span>
            {row.kind === 'ok' ? <VerdictLamps s={row.r[set]} /> : null}
          </span>
        ),
      },
      {
        key: 'change',
        header: 'change',
        align: 'right',
        cell: (row) =>
          row.kind === 'ok' ? (
            <span className="inline-grid grid-cols-[auto_auto] items-baseline gap-x-[8px] gap-y-[6px] text-right">
              <span className="t-legend">vs stock</span>
              <span>
                <Chg c={row.r[set].vs_stock} stacked />
              </span>
              <span className="t-legend">vs base</span>
              <span>
                <Chg c={row.r[set].vs_baseline} stacked />
              </span>
            </span>
          ) : null,
      },
    ]
    return (
      <div>
        <Table
          label={label}
          compact
          rows={rows}
          rowKey={(row) => row.r.id}
          columns={miniCols}
          rowClassName={(row) => (row.kind === 'refused' ? 'refused' : undefined)}
          span={(row) =>
            row.kind === 'refused'
              ? {
                  from: 0,
                  content: (
                    <span className="flex flex-col items-start gap-[4px]">
                      <a className="lnk" href={`/reports/${row.r.id}`} onClick={go}>
                        <Ids>{row.r.dataset}</Ids>
                      </a>
                      <span className="text-[11px] text-muted">{row.r.robot}</span>
                      <Lamp status="REFUSED" size="sm" />
                      <span className="text-[12px]">{row.r.reason_short}</span>
                    </span>
                  ),
                }
              : null
          }
        />
        {caption ? <p className="t-caption mt-[var(--s-3)]">{caption}</p> : null}
      </div>
    )
  }
  const cols: Column<IndexRow>[] = [
    {
      key: 'dataset',
      header: 'dataset',
      lead: true,
      wrap: true,
      // Refused rows sort after the reported ones, as shipped (and as aria-sort says from the start).
      sort: (row) => `${row.kind === 'refused' ? 1 : 0}${row.r.dataset.toLowerCase()}`,
      cell: (row) => (
        <a className="lnk" href={`/reports/${row.r.id}`} onClick={go}>
          <Ids>{row.r.dataset}</Ids>
        </a>
      ),
    },
    { key: 'robot', header: 'robot', sort: (row) => row.r.robot, cell: (row) => row.r.robot },
    {
      key: 'n',
      header: 'held-out',
      align: 'right',
      sort: num((r) => r[set].n_episodes),
      cell: (row) => {
        const r = ok(row)
        return r ? <Num value={r[set].n_episodes} digits={0} prov={reportProv(r.id, `/headline/sets/${set}/n_episodes`)} /> : null
      },
    },
    {
      key: 'stock',
      header: 'stock rmse',
      align: 'right',
      sort: num((r) => r[set].rmse_deg.stock.mean),
      cell: (row) => (row.kind === 'ok' ? <Est e={row.r[set].rmse_deg.stock} stacked /> : null),
    },
    ...(compact
      ? []
      : [
          {
            key: 'baseline',
            header: 'baseline rmse',
            align: 'right' as const,
            sort: num((r) => r[set].rmse_deg.baseline.mean),
            cell: (row: IndexRow) => (row.kind === 'ok' ? <Est e={row.r[set].rmse_deg.baseline} stacked /> : null),
          },
        ]),
    {
      key: 'cal',
      header: 'calibrated rmse',
      align: 'right',
      sort: num((r) => r[set].rmse_deg.calibrated.mean),
      cell: (row) => (row.kind === 'ok' ? <Est e={row.r[set].rmse_deg.calibrated} stacked /> : null),
    },
    {
      key: 'vs_stock',
      header: 'vs stock',
      align: 'right',
      sort: num((r) => r[set].vs_stock.mean),
      cell: (row) => (row.kind === 'ok' ? <Chg c={row.r[set].vs_stock} stacked /> : null),
    },
    {
      key: 'vs_baseline',
      header: 'vs baseline',
      align: 'right',
      sort: num((r) => r[set].vs_baseline.mean),
      cell: (row) => (row.kind === 'ok' ? <Chg c={row.r[set].vs_baseline} stacked /> : null),
    },
    {
      key: 'verdict',
      header: 'verdict',
      label: 'verdict',
      cell: (row) => (row.kind === 'ok' ? <VerdictLamps s={row.r[set]} /> : null),
    },
  ]
  return (
    <StackTable
      label={label}
      compact={compact}
      rows={rows}
      rowKey={(row) => row.r.id}
      columns={cols}
      rowClassName={(row) => (row.kind === 'refused' ? 'refused' : undefined)}
      initialSort={{ key: 'dataset', dir: 'ascending' }}
      span={(row) =>
        row.kind === 'refused'
          ? {
              from: 2,
              content: (
                <span className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-[10px] whitespace-normal">
                  <Lamp status="REFUSED" size="sm" />
                  <span>{row.r.reason_short}</span>
                </span>
              ),
            }
          : null
      }
      caption={caption}
    />
  )
}

/* ------------------------------------------------------------------------------------------------
 * Findings by robot family
 * ---------------------------------------------------------------------------------------------- */

function idsOf(r: OkReportSummary[], go: Go) {
  return r.map((x, i) => (
    <span key={x.id}>
      {i ? (i === r.length - 1 ? ' and ' : ', ') : null}
      <a className="lnk" href={`/reports/${x.id}`} onClick={go}>
        <Ids>{x.dataset}</Ids>
      </a>
    </span>
  ))
}

/** One family's findings: three range readouts over its datasets and a plain paragraph of what they mean. */
export function FamilyPanel({ index, family, go }: { index: ReportIndex; family: Family; go: Go }) {
  const a = index.aggregates[family]
  const reports = familyReports(index, family)
  const realFrames = rangeOver(reports, (r) => r.lag.median_frames.real, '/headline/lag_interleaved/median_over_joints_frames/real')
  const weak = notHelped(index, family)
  const n = <Num value={a.reports} digits={0} prov={`/data/reports/index.json#/aggregates/${family}/reports`} />
  const owners = <Num value={a.owners} digits={0} prov={`/data/reports/index.json#/aggregates/${family}/owners`} />
  const L = a.lag
  const F = a.future
  const fast = L.median_frames_stock.max < 1.5
  // Counts behind the plain-words paragraph, by rule on the lab's own fields (never by hand).
  const closeLag = reports.filter((r) => r.lag.median_frames.stock != null && r.lag.median_frames.real != null && Math.abs(r.lag.median_frames.stock - r.lag.median_frames.real) <= 1)
  const closeProv = `/data/reports/index.json#/reports (${family}): |lag.median_frames.stock - lag.median_frames.real| <= 1`
  const LOWERS = new Set(['closes most of the gap', 'closes part of the gap', 'small improvement; most of the gap remains'])
  const lowers = reports.filter((r) => LOWERS.has(r.future.gap_label))
  const lowersProv = `/data/reports/index.json#/reports (${family}): future.gap_label (the lab's verdict rule)`
  const lowersRange = rangeOver(lowers, (r) => r.future.vs_stock.mean, '/headline/sets/future/calibrated_vs_stock/rel_change/mean')
  return (
    <Panel
      heading="h3"
      title={
        <>
          <b className="nw">{FAMILY_LABEL[family]}</b> · {a.twin} · {n}&nbsp;datasets · {owners}&nbsp;owners
        </>
      }
    >
      <div className="grid grid-cols-1 gap-[var(--s-4)] sm:grid-cols-3">
        <RangeReading
          label="real arm lag · per joint"
          min={L.real_ms.min}
          max={L.real_ms.max}
          unit="ms"
          prov={L.real_ms.prov}
          note={
            <>
              stock twin <NumRange r={L.stock_ms} unit="ms" />
            </>
          }
        />
        <RangeReading label="calibrated vs stock" min={pct(F.vs_stock.min)} max={pct(F.vs_stock.max)} unit="%" signed prov={F.vs_stock.prov} note="future block, range over datasets" />
        <RangeReading
          label="calibrated vs baseline"
          min={pct(F.vs_baseline.min)}
          max={pct(F.vs_baseline.max)}
          unit="%"
          signed
          prov={F.vs_baseline.prov}
          note="physics-free lag filter, same fit episodes"
        />
      </div>
      <div className="mt-[var(--s-4)] border-t border-line pt-[var(--s-4)]">
        {fast ? (
          <p className="t-caption">
            The stock {a.twin} twin answers its command within about one frame (median over joints <NumRange r={L.median_frames_stock} digits={2} unit="frames" />
            ), while the real arms lag <NumRange r={L.real_ms} unit="ms" /> per joint. The calibrated twin learns that lag: its worst joint is off by{' '}
            <NumRange r={L.max_mismatch_calibrated_ms} unit="ms" /> instead of <NumRange r={L.max_mismatch_stock_ms} unit="ms" />. On the future block it changes
            held-out error by <PctRange r={F.vs_stock} /> against stock, and by <PctRange r={F.vs_baseline} /> against a physics-free lag filter fitted on the same
            episodes.
          </p>
        ) : (
          <p className="t-caption">
            The stock {a.twin} twin is already close on lag: its median over joints is within one frame of the real arm&rsquo;s on{' '}
            <Num value={closeLag.length} digits={0} prov={closeProv} /> of {n} datasets (<NumRange r={L.median_frames_stock} digits={2} unit="frames" />, against{' '}
            {realFrames ? (
              <span className="nw">
                <Num value={realFrames.min.value} prov={realFrames.min.prov} /> to <Num value={realFrames.max.value} prov={realFrames.max.prov} /> frames
              </span>
            ) : null}{' '}
            for the real arms). Against stock, calibration lowers held-out error on <Num value={lowers.length} digits={0} prov={lowersProv} /> of {n} datasets
            {lowersRange ? (
              <>
                {' '}
                (
                <span className="nw">
                  <Num value={pct(lowersRange.min.value)} digits={0} signed unit="%" prov={lowersRange.min.prov} /> to{' '}
                  <Num value={pct(lowersRange.max.value)} digits={0} signed unit="%" prov={lowersRange.max.prov} />
                </span>
                , future block)
              </>
            ) : null}
            {reports.length - lowers.length ? (
              <>
                {' '}
                and does not clearly change it on <Num value={reports.length - lowers.length} digits={0} prov={lowersProv} />
              </>
            ) : null}
            . Against the physics-free lag filter the change is modest: <PctRange r={F.vs_baseline} />.
            {weak.length ? (
              <>
                {' '}
                It does not clearly help on {idsOf(weak, go)}
                {weak.some((w) => TASK_WORDS[w.id]) ? (
                  <> ({weak.filter((w) => TASK_WORDS[w.id]).map((w) => TASK_WORDS[w.id]).join('; ')}): contacts are off in the replay, so pushing on the world shows up as error no actuator fit removes.</>
                ) : (
                  '.'
                )}
              </>
            ) : null}
          </p>
        )}
      </div>
    </Panel>
  )
}

/** Table 1: the two robot families side by side, every cell a range over that family's datasets. */
export function FamilyCompareTable({ index }: { index: ReportIndex }) {
  const fams: Family[] = ['so101', 'so100']
  type Row = { key: string; what: ReactNode; cell: (f: Family) => ReactNode }
  const agg = (f: Family) => index.aggregates[f]
  const rows: Row[] = [
    { key: 'n', what: 'datasets (owners)', cell: (f) => <span className="nw"><Num value={agg(f).reports} digits={0} prov={`/data/reports/index.json#/aggregates/${f}/reports`} /> (<Num value={agg(f).owners} digits={0} prov={`/data/reports/index.json#/aggregates/${f}/owners`} />)</span> },
    { key: 'real', what: 'real arm lag, per joint', cell: (f) => <NumRange r={agg(f).lag.real_ms} unit="ms" /> },
    { key: 'stock', what: 'stock twin lag, per joint', cell: (f) => <NumRange r={agg(f).lag.stock_ms} unit="ms" /> },
    { key: 'stockfr', what: 'stock twin lag, median of joints', cell: (f) => <NumRange r={agg(f).lag.median_frames_stock} digits={2} unit="frames" /> },
    { key: 'mm_s', what: 'worst joint lag mismatch, stock', cell: (f) => <NumRange r={agg(f).lag.max_mismatch_stock_ms} unit="ms" /> },
    { key: 'mm_c', what: 'worst joint lag mismatch, calibrated', cell: (f) => <NumRange r={agg(f).lag.max_mismatch_calibrated_ms} unit="ms" /> },
    { key: 'fs', what: 'future block: calibrated vs stock', cell: (f) => <PctRange r={agg(f).future.vs_stock} /> },
    { key: 'fb', what: 'future block: calibrated vs baseline', cell: (f) => <PctRange r={agg(f).future.vs_baseline} /> },
    { key: 'is', what: 'interleaved: calibrated vs stock', cell: (f) => <PctRange r={agg(f).interleaved.vs_stock} /> },
    { key: 'ib', what: 'interleaved: calibrated vs baseline', cell: (f) => <PctRange r={agg(f).interleaved.vs_baseline} /> },
    { key: 'cal', what: 'future block: calibrated rmse', cell: (f) => <NumRange r={agg(f).future.calibrated_rmse_deg} digits={2} unit="°" /> },
    { key: 'nat', what: 'fitted servo natural frequency', cell: (f) => <NumRange r={agg(f).natural_freq_hz} digits={1} unit="Hz" /> },
    {
      key: 'labels',
      what: 'future-block verdicts',
      cell: (f) => (
        <span className="inline-flex flex-col gap-[2px]">
          {Object.entries(agg(f).future_gap_labels).map(([k, v]) => (
            <span key={k} className="nw">
              <Num value={v} digits={0} prov={`/data/reports/index.json#/aggregates/${f}/future_gap_labels`} /> {k}
            </span>
          ))}
        </span>
      ),
    },
  ]
  return (
    <StackTable
      label="SO-101 against SO-100"
      rows={rows}
      rowKey={(r) => r.key}
      columns={[
        { key: 'what', header: 'measure', lead: true, wrap: true, cell: (r) => r.what },
        ...fams.map((f) => ({ key: f, header: `${FAMILY_LABEL[f]} · ${agg(f).twin}`, align: 'right' as const, cell: (r: Row) => r.cell(f) })),
      ]}
      caption="Ranges over each family's datasets. Lag: interleaved held-out set, command to state, per joint in ms or median over joints in frames. Change = calibrated / reference - 1, paired by episode; negative = better. Baseline: a physics-free per-joint lag filter fitted on the same episodes."
    />
  )
}

/* ------------------------------------------------------------------------------------------------
 * The bar (memo section 7)
 * ---------------------------------------------------------------------------------------------- */

/** The bar written down before the batch, and how each robot family does against it, computed from the index. */
export function BarBox({ index, go }: { index: ReportIndex; go: Go }) {
  const fams = barByFamily(index)
  // "The lag filter also closes most of it": stated only when its mean error is at most half the stock twin's on every SO-101 dataset.
  const baselineMost = familyReports(index, 'so101').every((r) => r.future.rmse_deg.baseline.mean <= 0.5 * r.future.rmse_deg.stock.mean)
  const q = BAR_QUOTE
  return (
    <Panel
      heading="h3"
      title={
        <>
          <b>The bar</b> · written down before the batch
        </>
      }
    >
      <div className="ds-stack">
        <p className="t-prose">
          Before we call a calibrated twin a finding, it has to meet the bar from our{' '}
          <a className="lnk" href={MEMO_URL} rel="noopener">
            2026-11-01 plan
          </a>
          , section 7:
        </p>
        <blockquote className="t-prose border-l-2 border-edge pl-[var(--s-4)]">
          &ldquo;{q[0]}
          <Num value={-BAR.change * 100} digits={0} prov={BAR_SOURCE} />
          {q[1]}
          <Num value={BAR.lagFrames} digits={0} prov={BAR_SOURCE} />
          {q[2]}
          <Num value={BAR.datasets} digits={0} prov={BAR_SOURCE} />
          {q[3]}&rdquo;
        </blockquote>
        <p className="t-caption">
          We read &ldquo;consistently&rdquo; within one robot and its twin: the bar is met for a family only if every one of its datasets meets it. Change: future
          block, against the stock twin. Lag: median over joints, interleaved set.
        </p>
        <ul className="m-0 list-none border-t border-line p-0" aria-label="The bar, per robot">
          {(['so101', 'so100'] as Family[]).map((f) => {
            const b = fams[f]
            const lagged = b.rows.filter((r) => r.change <= BAR.change && !r.meets)
            return (
              <li key={f} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-[var(--s-4)] gap-y-[4px] border-b border-line py-[var(--s-3)]">
                <span className="t-ui">
                  <b className="nw">{FAMILY_LABEL[f]}</b> · {index.aggregates[f].twin}: met on <Num value={b.met.length} digits={0} prov={b.prov} /> of{' '}
                  <Num value={b.rows.length} digits={0} prov={b.prov} /> datasets
                  {b.met.length ? (
                    <>
                      , from <Num value={b.owners} digits={0} prov={b.prov} /> {b.owners === 1 ? 'owner' : 'owners'}
                    </>
                  ) : null}
                  .
                  {lagged.length ? (
                    <>
                      {' '}
                      <Num value={lagged.length} digits={0} prov={b.prov} /> more cut the error enough but miss the lag.
                    </>
                  ) : null}
                </span>
                <Lamp status={b.holds ? 'MET' : 'BELOW BAR'} size="sm">
                  {b.holds ? 'met' : 'not met'}
                </Lamp>
                {b.met.length && !b.holds ? <span className="t-caption col-span-2">Met on: {idsOf(b.met, go)}.</span> : null}
              </li>
            )
          })}
        </ul>
        <p className="t-caption">
          What the bar does not say: it compares the calibrated twin with the stock twin, and on <span className="nw">SO-101</span> most of the stock twin&rsquo;s gap is lag.
          {baselineMost ? <> A physics-free lag filter fitted on the same episodes also closes most of it.</> : null} The calibrated twin beats that filter by{' '}
          <PctRange r={index.aggregates.so101.future.vs_baseline} /> on <span className="nw">SO-101</span>. The bar is about the actuator model in open-loop replay; it says nothing about
          task success.
        </p>
      </div>
    </Panel>
  )
}
