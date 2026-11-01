/**
 * Twin Gap Report data contract, shared by the SPA (src/), the Worker (worker/), the man page and the build
 * (scripts/sync-reports.ts). Plain data and pure functions only: no DOM, no React, no Workers runtime types,
 * and no runtime imports (Node runs this file directly during the build).
 *
 * Where the numbers come from. Every report is produced by `lab/` (Python) as `lab/reports/<id>/report.json`
 * (schema `meatspace.twin-gap-report/v2`). `scripts/sync-reports.ts` verifies each file's hashes, copies the files
 * to `public/data/reports/<id>/` and writes the summaries below into `shared/reports.generated.ts` and
 * `public/data/reports/index.json`. Nothing in here is typed by hand: a number on the site is a field of a summary,
 * and every summary field that is a number carries `prov`, a JSON pointer into the report file it came from
 * (`lab/reports/<id>/report.json#/headline/sets/future/stock`), ready for ds `<Num prov>` / `<Reading prov>`.
 *
 * Sign convention (as in the lab): change = calibrated / reference - 1, paired by episode. NEGATIVE = better.
 */

/* ------------------------------------------------------------------------------------------------
 * Schemas and constants
 * ---------------------------------------------------------------------------------------------- */

export const REPORT_SCHEMA = 'meatspace.twin-gap-report/v2'
export const PACKAGE_SCHEMA = 'meatspace.calibrated-twin/v1'
export const TRACE_SCHEMA = 'meatspace.twin-trace/v1'
export const INDEX_SCHEMA = 'meatspace.report-index/v1'

/** Static files copied by the build; served by the asset layer under this path and by GET /v1/reports/:id/files/:name. */
export const REPORTS_BASE_PATH = '/data/reports'
export const REPORT_INDEX_PATH = `${REPORTS_BASE_PATH}/index.json`

/** Files a report directory may publish, in display order. `report.strict.json`: see ReportFiles. */
export const REPORT_FILE_NAMES = [
  'report.json',
  'report.strict.json',
  'report.md',
  'calibrated_twin.json',
  'trace.json',
  'heldout_episode.svg',
  'rmse_by_joint_future.svg',
  'rmse_by_joint.svg',
] as const
export type ReportFileName = (typeof REPORT_FILE_NAMES)[number]

export const FILE_CONTENT_TYPES: Readonly<Record<ReportFileName, string>> = {
  'report.json': 'application/json; charset=utf-8',
  'report.strict.json': 'application/json; charset=utf-8',
  'report.md': 'text/markdown; charset=utf-8',
  'calibrated_twin.json': 'application/json; charset=utf-8',
  'trace.json': 'application/json; charset=utf-8',
  'heldout_episode.svg': 'image/svg+xml',
  'rmse_by_joint_future.svg': 'image/svg+xml',
  'rmse_by_joint.svg': 'image/svg+xml',
}

/** The five scored arm joints, canonical order (the gripper is never scored: it touches objects). */
export const JOINTS = ['shoulder_pan', 'shoulder_lift', 'elbow_flex', 'wrist_flex', 'wrist_roll'] as const
export type Joint = (typeof JOINTS)[number]

export type TwinId = 'robotstudio_so101' | 'trs_so_arm100'
export type Family = 'so101' | 'so100'
export const FAMILY_LABEL: Readonly<Record<Family, string>> = { so101: 'SO-101', so100: 'SO-100' }
export const TWIN_FAMILY: Readonly<Record<TwinId, Family>> = { robotstudio_so101: 'so101', trs_so_arm100: 'so100' }

/** The two held-out sets. Future = the last 20% of episodes by index (the harder, chronological test). */
export type HeldoutSet = 'future' | 'interleaved'
export const HELDOUT_SETS: readonly HeldoutSet[] = ['future', 'interleaved']
export type Model = 'stock' | 'aligned_stock' | 'baseline' | 'calibrated'

/** Verdict labels written by the lab (report.py `_gap_label` / `_base_label`), fixed before the batch was run. */
export type GapLabel =
  | 'closes most of the gap'
  | 'closes part of the gap'
  | 'small improvement; most of the gap remains'
  | 'no clear change'
  | 'calibration makes the twin WORSE'
  | 'n/a'
export type BaselineLabel =
  | 'beats the physics-free lag filter'
  | 'no clear difference from the physics-free lag filter'
  | 'is WORSE than the physics-free lag filter'
  | 'n/a'

/* ------------------------------------------------------------------------------------------------
 * Summaries (shared/reports.generated.ts, public/data/reports/index.json, GET /v1/reports)
 * ---------------------------------------------------------------------------------------------- */

/** A measured value with its 95% bootstrap interval over episodes and its n. Units are in the field name. */
export interface Est {
  mean: number
  ci95: [number, number]
  /** Episodes behind the interval. */
  n: number
  /** `lab/reports/<id>/report.json#/json/pointer` to the object holding mean and ci95. */
  prov: string
}

/** Paired relative change, calibrated vs a reference (fraction: -0.91 = 91% lower error). Negative = better. */
export interface Change {
  mean: number
  ci95: [number, number]
  /** Episodes where the calibrated twin's error is lower. */
  improved: number
  n: number
  prov: string
}

export interface SetSummary {
  n_episodes: number
  /** Held-out sim-vs-real joint RMSE, degrees, mean over the 5 arm joints and over episodes. */
  rmse_deg: Record<Model, Est>
  vs_stock: Change
  vs_baseline: Change
  gap_label: GapLabel
  baseline_label: BaselineLabel
  /** The lab's one-line verdict, verbatim. */
  verdict: string
  verdict_prov: string
}

export interface LagJoint {
  /** Command-to-state lag, ms (interleaved held-out set, mean over episodes). null when not measurable. */
  real: number | null
  stock: number | null
  calibrated: number | null
}

export interface LagSummary {
  per_joint_ms: Record<Joint, LagJoint>
  /** Range over the five joints, ms. */
  real_ms: Range1
  stock_ms: Range1
  calibrated_ms: Range1
  /** Largest per-joint |model - real| lag, ms. */
  max_mismatch_ms: { stock: number | null; calibrated: number | null }
  /** Median over joints, frames (an instantaneous actuator measures 1 frame in the replay). */
  median_frames: { real: number | null; stock: number | null; calibrated: number | null }
  prov: string
}

/** A plain range without provenance of its own (it inherits the enclosing object's prov). */
export interface Range1 {
  min: number | null
  max: number | null
}

/**
 * Range over several reports. The values are `pointer` in each report.json of `ids` (`*` in the pointer stands for
 * every joint), so `lab/reports/<min_id>/report.json#<pointer>` holds the min.
 */
export interface Range {
  min: number
  max: number
  /** Report ids at the min and the max. */
  min_id: string
  max_id: string
  /** Values the range was taken over. */
  n: number
  /** JSON pointer inside each report.json of `ids`. */
  pointer: string
  ids: string[]
  /** Pointer to this aggregate in the index (`/data/reports/index.json#/aggregates/...`), for `<Num prov>`. */
  prov: string
}

/** One published file: size and the sha256 of its bytes (the ETag the API serves). URL: reportFileUrl(id, name). */
export interface FileMeta {
  bytes: number
  sha256: string
}

/**
 * Published files, by name. `json_file` is the one to parse: `report.strict.json` when the lab's report.json contains
 * the non-JSON tokens NaN or Infinity (Python's json writes them; 2 reports, in units.encodings of the gripper), with
 * those tokens written as null and nothing else changed; otherwise report.json itself. report.json is always the
 * original bytes, which content_sha256 verifies.
 */
export type ReportFiles = Partial<Record<ReportFileName, FileMeta>>

export interface Hashes {
  /** report.json content_sha256 (everything except `volatile`). Verified by the build. */
  content_sha256: string
  /** report.json results_sha256 (results only, environment-independent). Verified by the build. */
  results_sha256: string
  package_sha256: string | null
  trace_sha256: string | null
}

interface SummaryBase {
  /** Lab directory name, `owner__name`. Route param of /reports/:id and /v1/reports/:id. */
  id: string
  /** Hub dataset id, `owner/name`. */
  dataset: string
  owner: string
  name: string
  revision_sha: string
  /** https://huggingface.co/datasets/<id>/tree/<sha> */
  dataset_url: string
  twin: TwinId
  family: Family
  robot: string
  menagerie_sha: string
  mujoco: string
  fps: number
  codebase_version: string
  robot_type: string
  /** Date the report file was published (git commit date of report.json), YYYY-MM-DD. */
  published: string
  hashes: Hashes
  files: ReportFiles
  /** The file to parse as JSON (report.strict.json or report.json). */
  json_file: 'report.json' | 'report.strict.json'
  /** `lab/reports/<id>/report.json` */
  prov: string
}

export interface OkReportSummary extends SummaryBase {
  status: 'ok'
  units: string
  recording_convention: string
  episodes: { fit: number; interleaved: number; future: number; total: number; frames: number }
  future: SetSummary
  interleaved: SetSummary
  lag: LagSummary
  /** Calibrated servo natural frequency over the 5 joints, Hz (identifiable; individual gains often are not). */
  natural_freq_hz: Range1 & { prov: string }
  command_delay_frames: number
  converged: boolean | null
  /** Inputs of the report page's check poll, read at build time so no lamp waits on a fetch. */
  checks: {
    /** report.json units.supported and units.heldout_agrees (null when the lab did not check the held-out episodes). */
    units: { supported: boolean; heldout_agrees: boolean | null; prov: string }
    /** Joints checked, and how many of them also fit the recorded range with the flipped sign (sign not identified by range). */
    mapping: { joints: number; sign_ambiguous: number; prov: string }
    /** Episodes shared by the fit and a held-out set (0 by construction). */
    split: { overlap: number; prov: string }
  }
  /** Number of entries in report.json limitations[]. */
  limitations: number
  trace: { episode: number; frames: number; decimation: number; url: string } | null
}

export type RejectionCategory = 'units' | 'mapping' | 'other'

export interface RejectedReportSummary extends SummaryBase {
  status: 'unsupported'
  /** report.json `reason`, verbatim. */
  reason: string
  /** One plain sentence derived from `reason` by a fixed rule (see sync-reports.ts `shortReason`). */
  reason_short: string
  category: RejectionCategory
  reason_prov: string
}

export type ReportSummary = OkReportSummary | RejectedReportSummary

/** A candidate whose compatibility scan failed, so no report was run (lab/reports/candidates.json). */
export interface NotRunCandidate {
  dataset: string
  sha: string
  verdict: string
  prov: string
}

export interface FamilyAggregate {
  family: Family
  robot: string
  twin: TwinId
  reports: number
  owners: number
  ids: string[]
  future: { vs_stock: Range; vs_baseline: Range; calibrated_rmse_deg: Range; stock_rmse_deg: Range }
  interleaved: { vs_stock: Range; vs_baseline: Range }
  /** Count of each future-block verdict label. */
  future_gap_labels: Partial<Record<GapLabel, number>>
  future_baseline_labels: Partial<Record<BaselineLabel, number>>
  lag: {
    /** Per-joint lag over every joint of every report of the family, ms. */
    real_ms: Range
    stock_ms: Range
    calibrated_ms: Range
    max_mismatch_stock_ms: Range
    max_mismatch_calibrated_ms: Range
    median_frames_stock: Range
  }
  natural_freq_hz: Range
}

export interface Counts {
  /** Candidate pool (lab/reports/candidates.json). */
  candidates: number
  /** Candidates whose scan passed: every one was run, whatever its result. */
  run: number
  /** status ok: has numbers. */
  reported: number
  /** status unsupported: rejected with a reason, no numbers. */
  rejected: number
  /** Scan failed: not run. */
  not_run: number
  owners_reported: number
  so101: number
  so100: number
  heldout_episodes_future: number
  heldout_episodes_interleaved: number
  /** `/data/reports/index.json#/counts`: append `/<field>` for one count. */
  prov: string
}

export interface ReportIndex {
  schema: typeof INDEX_SCHEMA
  /** Latest `published` date over all reports, YYYY-MM-DD. */
  generated_at: string
  source: 'lab/reports'
  /** meatspace_lab version that produced the reports. */
  lab_version: string
  counts: Counts
  /** status ok, sorted by dataset id (case-insensitive). */
  reports: OkReportSummary[]
  /** status unsupported, same order. */
  rejected: RejectedReportSummary[]
  not_run: NotRunCandidate[]
  aggregates: Record<Family, FamilyAggregate>
  /** The report featured on the home page, and why it was picked. */
  hero: { id: string; why: string }
  selection_rule: string
  pool: string
  verdict_rule: string
}

/* ------------------------------------------------------------------------------------------------
 * report.json (the parts the site reads), calibrated_twin.json, trace.json
 * ---------------------------------------------------------------------------------------------- */

export interface Stat {
  mean: number | null
  ci95: [number | null, number | null]
  p90?: number | null
  median?: number | null
  n?: number
}

export interface Improvement {
  abs_reduction_deg: Stat
  rel_reduction: Stat
  rel_change: Stat
  per_episode_rel_change: { median: number | null; median_ci95: [number | null, number | null]; min: number | null; max: number | null }
  episodes_improved: number
  episodes_total: number
}

export type PerJoint<T> = Record<Joint | 'arm_mean', T>

export interface ModelBlock {
  sim_vs_real_rmse_deg: PerJoint<Stat>
  static_frame_rmse_deg: PerJoint<Stat>
  sim_tracking_rmse_deg: PerJoint<Stat>
  lag_frames: PerJoint<Stat>
  lag_ms: PerJoint<Stat>
  final_pose_gap_deg: PerJoint<Stat>
}

export interface SetMetrics {
  n_episodes: number
  real: { real_tracking_rmse_deg: PerJoint<Stat>; lag_frames: PerJoint<Stat>; lag_ms: PerJoint<Stat> }
  stock: ModelBlock
  aligned_stock: ModelBlock
  baseline: ModelBlock
  calibrated: ModelBlock
  improvement_calibrated_vs_stock: PerJoint<Improvement>
  improvement_aligned_vs_stock: PerJoint<Improvement>
  improvement_calibrated_vs_baseline: PerJoint<Improvement>
  improvement_baseline_vs_stock: PerJoint<Improvement>
  workspace_outside_fit_range_frac?: Record<Joint, number>
  outside_twin_range_frac?: { stock: Record<Joint, number>; calibrated: Record<Joint, number> }
}

export interface HeadlineSet {
  n_episodes: number
  stock: Stat
  aligned_stock: Stat
  baseline: Stat
  calibrated: Stat
  calibrated_vs_stock: Improvement
  calibrated_vs_baseline: Improvement
  gap_label: GapLabel
  baseline_label: BaselineLabel
  verdict: string
}

export interface EpisodeRow {
  episode: number
  set: 'fit' | HeldoutSet
  frames: number
  stock_rmse_deg: number[]
  aligned_stock_rmse_deg: number[]
  baseline_rmse_deg: number[]
  calibrated_rmse_deg: number[]
}

/**
 * report.json, schema meatspace.twin-gap-report/v2, as parsed from `files.json` (NaN/Infinity read as null).
 * Typed where the site reads it; everything else is `unknown` and stays available.
 */
export interface TwinGapReport {
  schema: typeof REPORT_SCHEMA
  status: 'ok' | 'unsupported'
  reason?: string
  dataset: {
    id: string
    revision_sha: string
    codebase_version: string
    robot_type: string
    fps: number
    episodes_total: number
    frames_used: number
    files: { path: string; sha256: string; bytes: number }[]
    [k: string]: unknown
  }
  twin: { id: TwinId; menagerie_sha: string; twin_dir_content_sha256: string; xml: string; contacts: string; [k: string]: unknown }
  environment: { mujoco: string; numpy: string; scipy: string; python: string; meatspace_lab: string; code_sha256: string; [k: string]: unknown }
  split: { fit: number[]; interleaved_heldout: number[]; future_heldout: number[]; [k: string]: unknown }
  units: { reason: string; supported: boolean; [k: string]: unknown }
  conventions: { replay: string; lag: string; recording: string; [k: string]: unknown }
  headline?: {
    metric: string
    sets: Record<HeldoutSet, HeadlineSet>
    verdict: string
    lag_interleaved: {
      per_joint_ms: Record<Joint, LagJoint>
      max_abs_mismatch_vs_real_ms: { stock: number | null; calibrated: number | null }
      median_over_joints_frames: { real: number | null; stock: number | null; calibrated: number | null }
    }
  }
  metrics?: Record<'fit' | HeldoutSet, SetMetrics>
  episodes?: EpisodeRow[]
  fit?: { calibrated: { params: TwinParamsJson; converged: boolean | null; identifiability: { derived: Record<Joint, DerivedServo>; [k: string]: unknown }; [k: string]: unknown }; [k: string]: unknown }
  package?: { file: string; sha256: string }
  plots?: { episode: string; episode_set: HeldoutSet; episode_index: number; bars_interleaved: string; bars_future: string }
  limitations: string[]
  content_sha256: string
  results_sha256: string
  [k: string]: unknown
}

export interface DerivedServo {
  I_eff_kgm2: number
  natural_freq_hz: { value: number; ci95: [number, number] }
  damping_ratio: { value: number; ci95: [number, number] }
}

export interface TwinParamsJson {
  kp: number[]
  kv: number[]
  damping: number[]
  armature: number[]
  frictionloss: number[]
  offset_deg?: number[]
  delay_frames?: number
  jnt_range_rad?: [number, number][] | null
}

/** calibrated_twin.json, schema meatspace.calibrated-twin/v1. Apply with `python -m meatspace_lab export-twin`. */
export interface CalibratedTwinPackage {
  schema: typeof PACKAGE_SCHEMA
  twin: TwinId
  joints_mjcf: string[]
  joints_canonical: string[]
  mapping: { sign: number[]; nominal_offset_deg: number[]; zero_reference: string; note: string; fitted_offset_correction_deg: number[]; formula: string }
  params: Omit<TwinParamsJson, 'offset_deg' | 'delay_frames' | 'jnt_range_rad'>
  jnt_range_rad: [number, number][] | null
  command_delay_frames: number
  options: { timestep: number; substeps_per_frame: number; contacts: string }
  meta: { dataset: string; dataset_revision_sha: string; menagerie_sha: string; fitted_on_episodes: number[]; mujoco: string; [k: string]: unknown }
  sha256: string
}

/** Series of one joint in trace.json: degrees, rounded to 2 decimals, one value per (decimated) frame. */
export interface TraceSeries {
  /** Recorded command a[t]. */
  cmd: number[]
  /** Recorded follower state x[t] (the reference). */
  real: number[]
  /** Stock twin (Menagerie MJCF as published), open-loop replay. */
  stock: number[]
  /** Physics-free lag filter (report.json fit.baseline). */
  baseline: number[]
  /** Calibrated twin (calibrated_twin.json), open-loop replay. */
  cal: number[]
}

/** trace.json, schema meatspace.twin-trace/v1 (python -m meatspace_lab export-trace). */
export interface TwinTrace {
  schema: typeof TRACE_SCHEMA
  report_id: string
  dataset: { id: string; revision_sha: string }
  twin: { id: TwinId; menagerie_sha: string }
  episode: { index: number; set: HeldoutSet; frames: number; selection: string }
  units: 'deg'
  /** Recording frame rate. */
  fps: number
  /** Every `decimation`-th frame is kept (1 = all). */
  decimation: number
  /** fps / decimation: the rate of the series below. */
  fps_series: number
  /** Frame index of each sample. */
  frame: number[]
  /** Seconds since the episode start. */
  t: number[]
  joints: Joint[]
  series_keys: Record<keyof TraceSeries, string>
  series: Record<Joint, TraceSeries>
  /** Per-joint RMSE over the full-resolution episode (equals report.json episodes[] for this episode). */
  rmse_deg: Record<'stock' | 'baseline' | 'calibrated', number[]>
  rmse_definition: string
  check: { report_episode_row: Record<string, number[]>; max_abs_diff_deg: number; tolerance_deg: number }
  replay: string
  provenance: {
    report_file: string
    report_content_sha256: string
    report_results_sha256: string
    dataset_revision_sha: string
    dataset_files_sha256: string[]
    package_file: string
    package_sha256: string
    twin_dir_content_sha256: string
    episode_index: number
    json_paths: { episode: string; rmse: string; baseline: string; replay: string }
    exporter: string
    mujoco: string
    report_mujoco: string
  }
  sha256: string
}

/* ------------------------------------------------------------------------------------------------
 * Pure helpers
 * ---------------------------------------------------------------------------------------------- */

/** `lab/reports/<id>/report.json#<pointer>`: the provenance string format used everywhere. */
export function reportProv(id: string, pointer = '', file = 'report.json'): string {
  return `lab/reports/${id}/${file}${pointer ? `#${pointer}` : ''}`
}

/** Path (no origin) of a published file. */
export function reportFileUrl(id: string, name: ReportFileName): string {
  return `${REPORTS_BASE_PATH}/${encodeURIComponent(id)}/${name}`
}

/** API paths for one report (no origin). */
export function reportApiPaths(id: string) {
  const base = `/v1/reports/${encodeURIComponent(id)}`
  return { report: base, twin: `${base}/twin`, trace: `${base}/trace`, file: (name: ReportFileName) => `${base}/files/${name}` }
}

export function findReport(index: ReportIndex, id: string): ReportSummary | undefined {
  return index.reports.find((r) => r.id === id) ?? index.rejected.find((r) => r.id === id)
}

export function isOk(r: ReportSummary): r is OkReportSummary {
  return r.status === 'ok'
}

/**
 * Lamp word (shared/status.ts VERDICTS) for a gap label. The bar ("closes most of the gap": the fitted twin cuts
 * held-out error by at least 50% with the interval excluding 0) was fixed before the batch was run. Nothing here is
 * "verified": that word is reserved for real-robot results with n >= 50.
 */
export function gapVerdict(label: GapLabel): 'MET' | 'BELOW BAR' | 'GAP' | 'FAULT' | 'SCOPE' {
  switch (label) {
    case 'closes most of the gap':
      return 'MET'
    case 'closes part of the gap':
    case 'small improvement; most of the gap remains':
      return 'BELOW BAR'
    case 'no clear change':
      return 'GAP'
    case 'calibration makes the twin WORSE':
      return 'FAULT'
    default:
      return 'SCOPE'
  }
}

/** Lamp word for the comparison with the physics-free lag-filter baseline. */
export function baselineVerdict(label: BaselineLabel): 'PASS' | 'MARGINAL' | 'FAULT' | 'SCOPE' {
  switch (label) {
    case 'beats the physics-free lag filter':
      return 'PASS'
    case 'no clear difference from the physics-free lag filter':
      return 'MARGINAL'
    case 'is WORSE than the physics-free lag filter':
      return 'FAULT'
    default:
      return 'SCOPE'
  }
}

/** Short plain words for a gap label, for table cells (the full label stays available). */
export function gapShort(label: GapLabel): string {
  switch (label) {
    case 'closes most of the gap':
      return 'closes most'
    case 'closes part of the gap':
      return 'closes part'
    case 'small improvement; most of the gap remains':
      return 'small improvement'
    case 'no clear change':
      return 'no clear change'
    case 'calibration makes the twin WORSE':
      return 'worse'
    default:
      return 'n/a'
  }
}

export function baselineShort(label: BaselineLabel): string {
  switch (label) {
    case 'beats the physics-free lag filter':
      return 'beats baseline'
    case 'no clear difference from the physics-free lag filter':
      return 'no clear difference'
    case 'is WORSE than the physics-free lag filter':
      return 'worse than baseline'
    default:
      return 'n/a'
  }
}

/** Props for ds `<Reading>` from an RMSE estimate: `<Reading label="..." unit="°" {...readingOf(s.rmse_deg.calibrated)} />`. */
export function readingOf(e: Est): { value: number; ci: [number, number]; n: number; prov: string } {
  return { value: e.mean, ci: e.ci95, n: e.n, prov: e.prov }
}

/** Props for ds `<Reading>` from a change, in percent: `<Reading label="vs stock" {...changeReadingOf(s.vs_stock)} />`. */
export function changeReadingOf(c: Change, digits = 0) {
  return {
    value: pct(c.mean),
    ci: [pct(c.ci95[0]), pct(c.ci95[1])] as [number, number],
    n: c.n,
    prov: c.prov,
    unit: '%',
    signed: true,
    digits,
  }
}

/** ds viz `Interval` from an estimate (or a change in percent with `percent`). */
export function intervalOf(e: { mean: number; ci95: [number, number] }, percent = false): { mean: number; lo: number; hi: number } {
  const f = percent ? pct : (v: number) => v
  return { mean: f(e.mean), lo: f(e.ci95[0]), hi: f(e.ci95[1]) }
}

/** ds viz `Interval` from a report.json Stat (null-safe: null when the stat is missing). */
export function intervalOfStat(s: Stat | undefined, percent = false): { mean: number; lo: number; hi: number } | null {
  if (!s || s.mean == null || s.ci95[0] == null || s.ci95[1] == null) return null
  return intervalOf({ mean: s.mean, ci95: [s.ci95[0], s.ci95[1]] }, percent)
}

/**
 * Fraction -> percent, computed exactly as the lab does (`100 * m` in Python), so that rounding it for display gives
 * the lab's digits. No "denoising": -0.285 is -28.499999999999996 here and in the lab, and both print -28.
 */
export function pct(fraction: number): number {
  return 100 * fraction
}

/**
 * `x.toFixed(d)` with Python's rounding, which is what the lab's report.md, INDEX.md and verdict text use: correct
 * rounding of the double's exact value, and an exact tie (…5 with nothing after it) goes to the even digit.
 * toFixed sends ties away from zero, so -46.5 printed -47 here and -46 in the lab. Every number on the site is
 * printed through this (ds `fmt`), so the site and the lab never disagree on a digit.
 */
export function pyFixed(x: number, d: number): string {
  const s = x.toFixed(d)
  if (!Number.isFinite(x) || Math.abs(x) >= 1e21) return s
  // The exact decimal expansion for any double this size. ES2018 raised toFixed's limit from 20 to 100 digits.
  // oxlint-disable-next-line number-arg-out-of-range
  const exact = Math.abs(x).toFixed(100)
  const dot = exact.indexOf('.')
  if (!/^50*$/.test(exact.slice(dot + 1 + d))) return s
  const kept = d === 0 ? exact.slice(0, dot) : exact.slice(0, dot + 1 + d)
  // A tie: toFixed went away from zero. When the kept digit is already even, round toward zero instead.
  if (Number(kept[kept.length - 1]) % 2 === 1) return s
  return x < 0 && /[1-9]/.test(kept) ? `-${kept}` : kept
}

/** "-91% [-92, -91]": the lab's own text form of a change (ASCII minus; for copyable text and JSON). */
export function changeText(c: { mean: number; ci95: [number, number] }): string {
  const s = (v: number) => {
    const t = pyFixed(100 * v, 0)
    const r = Number(t)
    return `${r < 0 ? '-' : '+'}${t.replace('-', '')}`
  }
  return `${s(c.mean)}% [${s(c.ci95[0])}, ${s(c.ci95[1])}]`
}

/** "0.46 [0.44, 0.48]" (degrees implied). */
export function estText(e: { mean: number; ci95: [number, number] }, digits = 2): string {
  return `${e.mean.toFixed(digits)} [${e.ci95[0].toFixed(digits)}, ${e.ci95[1].toFixed(digits)}]`
}

/** Joint series of a trace in the shape ds viz `JointTraces` takes (real / stock / cal / cmd; baseline kept aside). */
export function traceJoints(trace: TwinTrace): { joint: Joint; real: number[]; stock: number[]; cal: number[]; cmd: number[]; baseline: number[] }[] {
  return trace.joints.map((joint) => {
    const s = trace.series[joint]
    return { joint, real: s.real, stock: s.stock, cal: s.cal, cmd: s.cmd, baseline: s.baseline }
  })
}

/** Per-joint RMSE of a trace series against real over samples 1..N-1 (the lab's definition, on the decimated series). */
export function traceRmse(trace: TwinTrace, key: 'stock' | 'baseline' | 'cal'): number[] {
  return trace.joints.map((j) => {
    const sim = trace.series[j][key]
    const real = trace.series[j].real
    let s = 0
    for (let i = 1; i < real.length; i++) s += (sim[i] - real[i]) ** 2
    return Math.sqrt(s / Math.max(1, real.length - 1))
  })
}
