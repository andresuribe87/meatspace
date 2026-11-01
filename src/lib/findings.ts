/**
 * Pure read-outs of the report index for the pages: the memo's bar, per-family ranges and the reports where
 * calibration does not clearly help. Every number keeps a provenance string, so it renders through ds <Num prov>.
 * Nothing here is typed by hand: thresholds come from the memo (cited), values from shared/reports.generated.ts.
 */
import {
  reportProv,
  type Family,
  type HeldoutSet,
  type OkReportSummary,
  type RejectedReportSummary,
  type ReportIndex,
} from '../../shared/reports'

/** Display names of the two held-out sets. */
export const SET_LABEL: Readonly<Record<HeldoutSet, string>> = { future: 'future block', interleaved: 'interleaved' }

/** Where the bar was written down before the batch was run. */
export const BAR_SOURCE = 'docs/strategy/2026-11-01-pmf-memo.md#7-what-we-can-build-now-with-zero-hardware'

/** The memo's threshold for "a genuine finding" (section 7): at least -50% held-out RMSE and lag within 1 frame, consistently across 3+ datasets from different owners. */
export const BAR = { change: -0.5, lagFrames: 1, datasets: 3 } as const

/**
 * The memo's sentence, verbatim (docs/strategy/2026-11-01-pmf-memo.md, section 7), split where its numbers sit so each
 * number renders through <Num prov>: "the fitted twin cuts held-out RMSE by at least 50% and matches lag within 1
 * frame, consistently across 3 or more datasets from different owners."
 */
export const BAR_QUOTE = ['the fitted twin cuts held-out RMSE by at least ', '% and matches lag within ', ' frame, consistently across ', ' or more datasets from different owners.'] as const

export interface BarRow {
  report: OkReportSummary
  /** Future-block change vs stock (fraction). */
  change: number
  /** |calibrated - real| lag, frames, median over joints (interleaved set). */
  lagGap: number | null
  meets: boolean
}

export interface BarResult {
  rows: BarRow[]
  met: OkReportSummary[]
  /** Distinct owners among the datasets that meet the bar. */
  owners: number
  /**
   * "Consistently": every dataset in `rows` meets the bar, and they come from at least BAR.datasets datasets and
   * BAR.datasets owners. A count of passes alone is not the memo's bar (3 of 100 would pass it).
   */
  holds: boolean
  /** Provenance of the computed result (the rule, applied to the index). */
  prov: string
}

/** Applies the memo's bar to ok reports (future block for the change, interleaved set for the lag). */
export function barResult(index: ReportIndex, set: HeldoutSet = 'future', family?: Family): BarResult {
  const rows = index.reports.filter((r) => !family || r.family === family).map((r) => {
    const change = r[set].vs_stock.mean
    const m = r.lag.median_frames
    const lagGap = m.calibrated != null && m.real != null ? Math.abs(m.calibrated - m.real) : null
    return { report: r, change, lagGap, meets: change <= BAR.change && lagGap != null && lagGap <= BAR.lagFrames }
  })
  const met = rows.filter((r) => r.meets).map((r) => r.report)
  const owners = new Set(met.map((r) => r.owner)).size
  return {
    rows,
    met,
    owners,
    holds: rows.length > 0 && met.length === rows.length && met.length >= BAR.datasets && owners >= BAR.datasets,
    prov: `/data/reports/index.json#/reports${family ? ` (family ${family})` : ''}: ${set}.vs_stock.mean <= ${BAR.change} and |lag.median_frames.calibrated - lag.median_frames.real| <= ${BAR.lagFrames}, on every dataset (rule: ${BAR_SOURCE})`,
  }
}

/** The bar per robot family: the memo's "consistently" is read within one twin, never pooled across both. */
export function barByFamily(index: ReportIndex, set: HeldoutSet = 'future'): Record<Family, BarResult> {
  return { so101: barResult(index, set, 'so101'), so100: barResult(index, set, 'so100') }
}

export interface ValueAt {
  value: number
  id: string
  prov: string
}

/** Min and max of a per-report value over reports, each with the report.json pointer it came from. */
export function rangeOver(reports: OkReportSummary[], get: (r: OkReportSummary) => number | null, pointer: string): { min: ValueAt; max: ValueAt; n: number } | null {
  let min: ValueAt | null = null
  let max: ValueAt | null = null
  let n = 0
  for (const r of reports) {
    const v = get(r)
    if (v == null || !Number.isFinite(v)) continue
    n++
    const at = { value: v, id: r.id, prov: reportProv(r.id, pointer) }
    if (!min || v < min.value) min = at
    if (!max || v > max.value) max = at
  }
  return min && max ? { min, max, n } : null
}

export function familyReports(index: ReportIndex, family: Family): OkReportSummary[] {
  return index.reports.filter((r) => r.family === family)
}

/**
 * Reports where calibration does not clearly help on the future block: no clear change (or worse) against stock,
 * or not better than the physics-free lag filter. Chosen by the lab's own labels, not by hand.
 */
export function notHelped(index: ReportIndex, family?: Family): OkReportSummary[] {
  return index.reports.filter(
    (r) =>
      (!family || r.family === family) &&
      (r.future.gap_label === 'no clear change' ||
        r.future.gap_label === 'calibration makes the twin WORSE' ||
        r.future.baseline_label !== 'beats the physics-free lag filter'),
  )
}

/** A plain-words description of a dataset's task, only where the dataset name states it (never a guess). */
export const TASK_WORDS: Readonly<Record<string, string>> = {
  CarolinePascal__plug_socket_moved: 'pushing a plug into a socket',
  Chojins__chess_game_001_blue_stereo: 'moving chess pieces',
}

/** Rejected reports grouped by why (units, mapping, other). */
export function rejectedBy(index: ReportIndex): Record<RejectedReportSummary['category'], RejectedReportSummary[]> {
  const out: Record<RejectedReportSummary['category'], RejectedReportSummary[]> = { units: [], mapping: [], other: [] }
  for (const r of index.rejected) out[r.category].push(r)
  return out
}

/**
 * A plain-words line for a candidate's scan verdict (the raw verdict stays beside it, muted), by a fixed rule on the
 * scanner's text. `truncated` is true when the scanner cut the text short (an unclosed bracket or quote).
 */
export function notRunShort(verdict: string): { short: string; truncated: boolean } {
  const quotes = (verdict.match(/'/g) ?? []).length
  const truncated = (verdict.match(/\[/g) ?? []).length > (verdict.match(/\]/g) ?? []).length || quotes % 2 === 1
  if (/^not a single SO arm/.test(verdict)) return { short: 'Not a single SO arm: its joint names do not map onto the twin.', truncated }
  if (/RemoteEntryNotFoundError|404 Client Error/.test(verdict)) return { short: 'A file the scan needs was not found on the Hub (HTTP 404).', truncated }
  if (/^unsupported units/.test(verdict)) return { short: 'Units the pipeline cannot read from the data.', truncated }
  return { short: verdict.split(':')[0], truncated }
}

/** Thousands separator for counts (en-US), e.g. 1,511. */
export function count(n: number): string {
  return n.toLocaleString('en-US')
}
