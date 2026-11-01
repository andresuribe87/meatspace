/**
 * Sync the lab's Twin Gap Reports into the site (runs before every build and dev server: package.json prebuild/predev).
 *
 *   node scripts/sync-reports.ts            verify lab/reports, copy files, write the index + generated module
 *   node scripts/sync-reports.ts --check    verify only; exit 1 if public/data or shared/reports.generated.ts is stale
 *
 * For every lab/reports/<id>/report.json it:
 *   1. checks the schema (meatspace.twin-gap-report/v2) and recomputes content_sha256 and results_sha256 exactly as
 *      the lab does (Python json.dumps(sort_keys=True, separators=(",", ":"), ensure_ascii=True) over the parsed
 *      file, with number and string tokens kept verbatim), and the calibrated package and trace hashes;
 *      any mismatch, an unknown schema or a trace made from another report fails the build;
 *   2. copies report.json, report.md, calibrated_twin.json, trace.json and the SVGs to public/data/reports/<id>/,
 *      plus report.strict.json when report.json holds the non-JSON tokens NaN / Infinity (written as null);
 *   3. writes public/data/reports/index.json and shared/reports.generated.ts (the same ReportIndex): summaries with
 *      a JSON-pointer provenance on every number, counts, aggregates per robot family, the rejected list with
 *      reasons and the candidates that were never run.
 * Numbers are copied, never computed, except ranges (min/max) and counts over reports, which name their sources.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import {
  FAMILY_LABEL,
  INDEX_SCHEMA,
  JOINTS,
  PACKAGE_SCHEMA,
  REPORT_SCHEMA,
  REPORTS_BASE_PATH,
  TRACE_SCHEMA,
  TWIN_FAMILY,
  reportFileUrl,
  reportProv,
  type BaselineLabel,
  type Change,
  type Est,
  type Family,
  type FamilyAggregate,
  type GapLabel,
  type HeldoutSet,
  type Joint,
  type LagSummary,
  type Model,
  type NotRunCandidate,
  type OkReportSummary,
  type Range,
  type Range1,
  type RejectedReportSummary,
  type RejectionCategory,
  type FileMeta,
  type ReportFileName,
  type ReportFiles,
  type ReportIndex,
  type SetSummary,
  type TwinId,
} from '../shared/reports.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Featured on the home page: the LeRobot team's own SO-101 dataset (the copy says why, and what is assumed). */
export const HERO = {
  id: 'lerobot__svla_so101_pickplace',
  why: "lerobot/svla_so101_pickplace is published by the LeRobot team, so anyone can check it; it was picked for that reason, not for its result. Its metadata says robot_type so100_follower, so the match to the SO-101 twin is assumed from the dataset's name and card, not confirmed.",
}

/** lab/meatspace_lab/report.py DIAGNOSTIC_KEYS: optimizer-path diagnostics left out of results_sha256. */
const DIAGNOSTIC_KEYS = new Set(['delay_screen_mse_deg2', 'gain_grid_mse_deg2_by_delay', 'n_simulated_rollout_sets', 'optimizer_status'])
const HASH_EXCLUDE = new Set(['volatile', 'content_sha256', 'results_sha256'])
const COPY: readonly string[] = ['report.json', 'report.md', 'calibrated_twin.json', 'trace.json', 'heldout_episode.svg', 'rmse_by_joint_future.svg', 'rmse_by_joint.svg']

export class SyncError extends Error {}

/* ------------------------------------------------------------------------------------------------
 * Lab JSON: Python's json output. Tokens are kept verbatim so the canonical form (and so the hash) is
 * byte-identical to Python's; NaN / Infinity / -Infinity are accepted (Python writes them).
 * ---------------------------------------------------------------------------------------------- */

export type JNode =
  | { t: 'obj'; entries: { key: string; raw: string; value: JNode }[] }
  | { t: 'arr'; items: JNode[] }
  | { t: 'str'; raw: string }
  | { t: 'lit'; raw: string; start: number; end: number }

const NONSTANDARD = new Set(['NaN', 'Infinity', '-Infinity'])

export function parseLabJson(text: string): JNode {
  let i = 0
  const ws = () => {
    while (i < text.length && ' \t\n\r'.includes(text[i])) i++
  }
  const fail = (msg: string): never => {
    throw new SyncError(`JSON: ${msg} at offset ${i}`)
  }
  const str = (): string => {
    const start = i
    i++
    while (i < text.length && text[i] !== '"') i += text[i] === '\\' ? 2 : 1
    if (text[i] !== '"') fail('unterminated string')
    i++
    return text.slice(start, i)
  }
  const value = (): JNode => {
    ws()
    const c = text[i]
    if (c === '{') {
      i++
      const entries: { key: string; raw: string; value: JNode }[] = []
      ws()
      if (text[i] === '}') {
        i++
        return { t: 'obj', entries }
      }
      for (;;) {
        ws()
        if (text[i] !== '"') fail('expected a key')
        const raw = str()
        ws()
        if (text[i++] !== ':') fail('expected ":"')
        entries.push({ key: JSON.parse(raw) as string, raw, value: value() })
        ws()
        if (text[i] === ',') i++
        else if (text[i] === '}') {
          i++
          return { t: 'obj', entries }
        } else fail('expected "," or "}"')
      }
    }
    if (c === '[') {
      i++
      const items: JNode[] = []
      ws()
      if (text[i] === ']') {
        i++
        return { t: 'arr', items }
      }
      for (;;) {
        items.push(value())
        ws()
        if (text[i] === ',') i++
        else if (text[i] === ']') {
          i++
          return { t: 'arr', items }
        } else fail('expected "," or "]"')
      }
    }
    if (c === '"') return { t: 'str', raw: str() }
    const start = i
    while (i < text.length && !',]} \t\n\r'.includes(text[i])) i++
    const raw = text.slice(start, i)
    if (!(raw === 'true' || raw === 'false' || raw === 'null' || NONSTANDARD.has(raw) || /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/.test(raw))) {
      fail(`bad literal ${JSON.stringify(raw)}`)
    }
    return { t: 'lit', raw, start, end: i }
  }
  const out = value()
  ws()
  if (i !== text.length) fail('trailing data')
  return out
}

/** Python canonical_json of a parsed lab file (sorted keys by code point, compact separators, tokens verbatim). */
export function canonical(node: JNode): string {
  switch (node.t) {
    case 'obj': {
      const es = [...node.entries].sort((a, b) => cmpCodePoints(a.key, b.key))
      return `{${es.map((e) => `${pyKey(e.raw)}:${canonical(e.value)}`).join(',')}}`
    }
    case 'arr':
      return `[${node.items.map(canonical).join(',')}]`
    case 'str':
      return node.raw
    case 'lit':
      return node.raw
  }
}

/** Python json with ensure_ascii writes the same escapes for keys as for values, so a raw key token is canonical. */
const pyKey = (raw: string) => raw

function cmpCodePoints(a: string, b: string): number {
  const x = Array.from(a, (ch) => ch.codePointAt(0)!)
  const y = Array.from(b, (ch) => ch.codePointAt(0)!)
  for (let k = 0; k < Math.min(x.length, y.length); k++) if (x[k] !== y[k]) return x[k] - y[k]
  return x.length - y.length
}

/** Plain JS value; NaN / Infinity become null. */
export function toValue(node: JNode): unknown {
  switch (node.t) {
    case 'obj':
      return Object.fromEntries(node.entries.map((e) => [e.key, toValue(e.value)]))
    case 'arr':
      return node.items.map(toValue)
    case 'str':
      return JSON.parse(node.raw) as string
    case 'lit':
      return NONSTANDARD.has(node.raw) ? null : (JSON.parse(node.raw) as unknown)
  }
}

/** Offsets of NaN / Infinity tokens (outside strings). */
export function nonstandardTokens(node: JNode, out: { start: number; end: number }[] = []): { start: number; end: number }[] {
  if (node.t === 'obj') for (const e of node.entries) nonstandardTokens(e.value, out)
  else if (node.t === 'arr') for (const v of node.items) nonstandardTokens(v, out)
  else if (node.t === 'lit' && NONSTANDARD.has(node.raw)) out.push({ start: node.start, end: node.end })
  return out
}

/** The same text with NaN / Infinity tokens written as null; nothing else changes. */
export function strictText(text: string, tokens: { start: number; end: number }[]): string {
  let out = ''
  let at = 0
  for (const t of [...tokens].sort((a, b) => a.start - b.start)) {
    out += `${text.slice(at, t.start)}null`
    at = t.end
  }
  return out + text.slice(at)
}

const without = (node: JNode, drop: (key: string) => boolean): JNode =>
  node.t === 'obj' ? { t: 'obj', entries: node.entries.filter((e) => !drop(e.key)) } : node

const sha256 = (data: string | Buffer) => createHash('sha256').update(data).digest('hex')

/** report.py content_sha256: everything except volatile and the two hashes. */
export function contentSha256(report: JNode): string {
  return sha256(canonical(without(report, (k) => HASH_EXCLUDE.has(k))))
}

/** report.py results_sha256: also without environment and the fit's optimizer-path diagnostics. */
export function resultsSha256(report: JNode): string {
  if (report.t !== 'obj') throw new SyncError('report is not an object')
  const entries = report.entries
    .filter((e) => !HASH_EXCLUDE.has(e.key) && e.key !== 'environment')
    .map((e) => {
      if (e.key !== 'fit' || e.value.t !== 'obj') return e
      const fit: JNode = {
        t: 'obj',
        entries: e.value.entries.map((f) => (f.value.t === 'obj' ? { ...f, value: without(f.value, (k) => DIAGNOSTIC_KEYS.has(k)) } : f)),
      }
      return { ...e, value: fit }
    })
  return sha256(canonical({ t: 'obj', entries }))
}

/** twin.py package_sha256 / trace.py trace_sha256: everything except the sha256 field. */
export function selfSha256(node: JNode): string {
  return sha256(canonical(without(node, (k) => k === 'sha256')))
}

/* ------------------------------------------------------------------------------------------------
 * Summaries
 * ---------------------------------------------------------------------------------------------- */

// report.json is typed in shared/reports.ts for its readers; here it is walked by pointer, so loosely.
// oxlint-disable-next-line no-explicit-any
type Any = any

function est(id: string, obj: Any, pointer: string): Est {
  if (obj?.mean == null || obj.ci95?.[0] == null || obj.ci95?.[1] == null) throw new SyncError(`${id}: no estimate at ${pointer}`)
  return { mean: obj.mean, ci95: [obj.ci95[0], obj.ci95[1]], n: obj.n, prov: reportProv(id, pointer) }
}

function change(id: string, imp: Any, pointer: string): Change {
  const rc = imp?.rel_change
  if (rc?.mean == null || rc.ci95?.[0] == null) throw new SyncError(`${id}: no change at ${pointer}`)
  return { mean: rc.mean, ci95: [rc.ci95[0], rc.ci95[1]], improved: imp.episodes_improved, n: imp.episodes_total, prov: reportProv(id, `${pointer}/rel_change`) }
}

function setSummary(id: string, rep: Any, set: HeldoutSet): SetSummary {
  const p = `/headline/sets/${set}`
  const h = rep.headline.sets[set]
  const models: Model[] = ['stock', 'aligned_stock', 'baseline', 'calibrated']
  return {
    n_episodes: h.n_episodes,
    rmse_deg: Object.fromEntries(models.map((m) => [m, est(id, h[m], `${p}/${m}`)])) as Record<Model, Est>,
    vs_stock: change(id, h.calibrated_vs_stock, `${p}/calibrated_vs_stock`),
    vs_baseline: change(id, h.calibrated_vs_baseline, `${p}/calibrated_vs_baseline`),
    gap_label: h.gap_label as GapLabel,
    baseline_label: h.baseline_label as BaselineLabel,
    verdict: h.verdict,
    verdict_prov: reportProv(id, `${p}/verdict`),
  }
}

const range1 = (vals: (number | null | undefined)[]): Range1 => {
  const v = vals.filter((x): x is number => typeof x === 'number')
  return v.length ? { min: Math.min(...v), max: Math.max(...v) } : { min: null, max: null }
}

function lagSummary(id: string, rep: Any): LagSummary {
  const li = rep.headline.lag_interleaved
  const per = li.per_joint_ms as Record<Joint, { real: number | null; stock: number | null; calibrated: number | null }>
  return {
    per_joint_ms: per,
    real_ms: range1(JOINTS.map((j) => per[j].real)),
    stock_ms: range1(JOINTS.map((j) => per[j].stock)),
    calibrated_ms: range1(JOINTS.map((j) => per[j].calibrated)),
    max_mismatch_ms: li.max_abs_mismatch_vs_real_ms,
    median_frames: li.median_over_joints_frames,
    prov: reportProv(id, '/headline/lag_interleaved'),
  }
}

/** One plain sentence for a rejection reason, by a fixed rule on the lab's text (the verbatim reason stays alongside). */
export function shortReason(reason: string): { short: string; category: RejectionCategory } {
  if (/no documented mapping for zero reference 'calibration_zero_pose'/.test(reason)) {
    return { short: 'Legacy-calibrated SO-101 data: there is no documented joint mapping onto the robotstudio_so101 twin.', category: 'mapping' }
  }
  const m = /does not fit the twin's joint range .* for: (\w+)/.exec(reason)
  if (m) {
    return { short: `Recorded ${m[1]} range does not fit the twin's joint range under the documented calibration, with either sign.`, category: 'mapping' }
  }
  if (/[Uu]nits could not be verified/.test(reason)) return { short: 'Units could not be verified from the encoder-tick lattice.', category: 'units' }
  return { short: reason.split(';')[0], category: 'other' }
}

interface Loaded {
  id: string
  dir: string
  text: string
  node: JNode
  rep: Any
  files: Map<string, Buffer>
  strict: string | null
  published: string
}

/**
 * Trace numbers against the content-hashed report: trace.rmse_deg must equal the report.json row of the same episode
 * exactly, and (at full frame rate) the series must reproduce it. The series are rounded to 2 dp, so the recomputed
 * RMSE may differ from the row by up to about half that step; anything beyond TRACE_RMSE_TOL is an edited sample.
 */
const TRACE_RMSE_TOL = { full: 0.01, decimated: 0.03 }
const TRACE_MODELS = [
  ['stock', 'stock', 'stock_rmse_deg'],
  ['baseline', 'baseline', 'baseline_rmse_deg'],
  ['calibrated', 'cal', 'calibrated_rmse_deg'],
] as const

export function checkTraceNumbers(id: string, tr: Any, rep: Any): void {
  const where = `lab/reports/${id}/trace.json`
  const row = (rep.episodes as Any[]).find((e) => e.episode === tr.episode.index)
  if (!row) throw new SyncError(`${where}: report.json has no episode row for episode ${tr.episode.index}`)
  const tol = tr.decimation > 1 ? TRACE_RMSE_TOL.decimated : TRACE_RMSE_TOL.full
  for (const [model, key, col] of TRACE_MODELS) {
    const want = row[col] as number[]
    const got = tr.rmse_deg?.[model] as number[] | undefined
    if (!got || got.length !== want.length || got.some((v, i) => v !== want[i])) {
      throw new SyncError(`${where}: rmse_deg.${model} does not equal report.json episodes row ${tr.episode.index} (${col})`)
    }
    tr.joints.forEach((j: Joint, i: number) => {
      const sim = tr.series[j][key] as number[]
      const real = tr.series[j].real as number[]
      let ss = 0
      for (let k = 1; k < real.length; k++) ss += (sim[k] - real[k]) ** 2
      const v = Math.sqrt(ss / Math.max(1, real.length - 1))
      if (Math.abs(v - want[i]) > tol) {
        throw new SyncError(`${where}: series.${j}.${key} gives rmse ${v.toFixed(4)}, report.json says ${want[i]} (edited sample?)`)
      }
    })
  }
}

/**
 * Publish dates live in lab data (lab/reports/published.json), not in git history: a shallow clone (CI, Workers
 * Builds) would otherwise date every report to its HEAD commit.
 */
function readPublished(labReports: string): Record<string, string> {
  const f = join(labReports, 'published.json')
  if (!existsSync(f)) throw new SyncError('lab/reports/published.json is missing (one YYYY-MM-DD publish date per report id)')
  const j = JSON.parse(readFileSync(f, 'utf8')) as { schema?: string; dates?: Record<string, string> }
  if (j.schema !== 'meatspace.published/v1' || !j.dates) throw new SyncError('lab/reports/published.json: expected {"schema": "meatspace.published/v1", "dates": {...}}')
  for (const [k, v] of Object.entries(j.dates)) if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new SyncError(`lab/reports/published.json: ${k}: not a date: ${v}`)
  return j.dates
}

function fileMeta(data: Buffer): FileMeta {
  return { bytes: data.byteLength, sha256: sha256(data) }
}

export function loadReports(labReports: string): Loaded[] {
  const out: Loaded[] = []
  const published = readPublished(labReports)
  const ids = readdirSync(labReports)
    .filter((d) => existsSync(join(labReports, d, 'report.json')))
    .sort()
  for (const id of ids) {
    const dir = join(labReports, id)
    const text = readFileSync(join(dir, 'report.json'), 'utf8')
    const node = parseLabJson(text)
    const rep = toValue(node) as Any
    const where = `lab/reports/${id}/report.json`
    if (rep.schema !== REPORT_SCHEMA) throw new SyncError(`${where}: unknown schema ${JSON.stringify(rep.schema)} (expected ${REPORT_SCHEMA})`)
    if (contentSha256(node) !== rep.content_sha256) throw new SyncError(`${where}: content_sha256 does not match the file (edited by hand?)`)
    if (resultsSha256(node) !== rep.results_sha256) throw new SyncError(`${where}: results_sha256 does not match the file`)
    if (id !== String(rep.dataset.id).replace('/', '__')) throw new SyncError(`${where}: directory name does not match dataset ${rep.dataset.id}`)
    if (rep.status !== 'ok' && rep.status !== 'unsupported') throw new SyncError(`${where}: unknown status ${rep.status}`)
    const files = new Map<string, Buffer>()
    const allowMissingTrace = process.env.MS_ALLOW_MISSING_TRACE === '1'
    for (const name of COPY) {
      const p = join(dir, name)
      if (existsSync(p)) files.set(name, readFileSync(p))
    }
    if (rep.status === 'ok') {
      const pkgBuf = files.get('calibrated_twin.json')
      if (!pkgBuf) throw new SyncError(`lab/reports/${id}: status ok but no calibrated_twin.json`)
      const pkgNode = parseLabJson(pkgBuf.toString('utf8'))
      const pkg = toValue(pkgNode) as Any
      if (pkg.schema !== PACKAGE_SCHEMA) throw new SyncError(`lab/reports/${id}/calibrated_twin.json: unknown schema ${pkg.schema}`)
      if (selfSha256(pkgNode) !== pkg.sha256 || pkg.sha256 !== rep.package.sha256) {
        throw new SyncError(`lab/reports/${id}/calibrated_twin.json: sha256 does not match the file or report.json package.sha256`)
      }
      const trBuf = files.get('trace.json')
      if (trBuf) {
        const trNode = parseLabJson(trBuf.toString('utf8'))
        const tr = toValue(trNode) as Any
        if (tr.schema !== TRACE_SCHEMA) throw new SyncError(`lab/reports/${id}/trace.json: unknown schema ${tr.schema}`)
        if (selfSha256(trNode) !== tr.sha256) throw new SyncError(`lab/reports/${id}/trace.json: sha256 does not match the file`)
        if (tr.provenance?.report_content_sha256 !== rep.content_sha256 || tr.episode?.index !== rep.plots?.episode_index) {
          throw new SyncError(`lab/reports/${id}/trace.json was made from another report.json; re-run: python -m meatspace_lab export-trace reports/${id}/`)
        }
        checkTraceNumbers(id, tr, rep)
      } else if (allowMissingTrace) {
        console.warn(`sync-reports: lab/reports/${id} has no trace.json (MS_ALLOW_MISSING_TRACE=1); its trace is null`)
      } else {
        // Fail closed: a report page without its Fig 1 would ship silently otherwise.
        throw new SyncError(`lab/reports/${id}: status ok but no trace.json; run: python -m meatspace_lab export-trace reports/${id}/ (or set MS_ALLOW_MISSING_TRACE=1)`)
      }
    } else if (files.has('trace.json') || files.has('calibrated_twin.json')) {
      throw new SyncError(`lab/reports/${id}: an unsupported report must not ship a package or a trace`)
    }
    const tokens = nonstandardTokens(node)
    const date = published[id]
    if (!date) throw new SyncError(`lab/reports/published.json: no publish date for ${id}`)
    out.push({ id, dir, text, node, rep, files, strict: tokens.length ? strictText(text, tokens) : null, published: date })
  }
  return out
}

function filesOf(l: Loaded): ReportFiles {
  const files: ReportFiles = {}
  for (const [name, data] of l.files) files[name as ReportFileName] = fileMeta(data)
  if (l.strict !== null) files['report.strict.json'] = fileMeta(Buffer.from(l.strict))
  return files
}

function base(l: Loaded) {
  const { rep, id } = l
  const twin = rep.twin.id as TwinId
  const family = TWIN_FAMILY[twin]
  if (!family) throw new SyncError(`${id}: unknown twin ${twin}`)
  const files = filesOf(l)
  if (!files['report.md']) throw new SyncError(`lab/reports/${id}: no report.md`)
  const [owner, name] = String(rep.dataset.id).split('/')
  return {
    id,
    dataset: rep.dataset.id as string,
    owner,
    name,
    revision_sha: rep.dataset.revision_sha as string,
    dataset_url: `https://huggingface.co/datasets/${rep.dataset.id}/tree/${rep.dataset.revision_sha}`,
    twin,
    family,
    robot: FAMILY_LABEL[family],
    menagerie_sha: rep.twin.menagerie_sha as string,
    mujoco: rep.environment.mujoco as string,
    fps: rep.dataset.fps as number,
    codebase_version: rep.dataset.codebase_version as string,
    robot_type: rep.dataset.robot_type as string,
    published: l.published,
    hashes: {
      content_sha256: rep.content_sha256 as string,
      results_sha256: rep.results_sha256 as string,
      package_sha256: (rep.package?.sha256 as string | undefined) ?? null,
      trace_sha256: files['trace.json'] ? ((JSON.parse(l.files.get('trace.json')!.toString('utf8')) as { sha256: string }).sha256 ?? null) : null,
    },
    files,
    json_file: l.strict === null ? ('report.json' as const) : ('report.strict.json' as const),
    prov: reportProv(id),
  }
}

function okSummary(l: Loaded): OkReportSummary {
  const { rep, id } = l
  const sp = rep.split
  const derived = rep.fit.calibrated.identifiability?.derived ?? {}
  const trace = l.files.get('trace.json') ? (JSON.parse(l.files.get('trace.json')!.toString('utf8')) as Any) : null
  return {
    ...base(l),
    status: 'ok',
    units: rep.units.encodings[0].kind,
    recording_convention: rep.conventions.recording_convention,
    episodes: {
      fit: sp.fit.length,
      interleaved: sp.interleaved_heldout.length,
      future: sp.future_heldout.length,
      total: rep.dataset.episodes_total,
      frames: rep.dataset.frames_used,
    },
    future: setSummary(id, rep, 'future'),
    interleaved: setSummary(id, rep, 'interleaved'),
    lag: lagSummary(id, rep),
    natural_freq_hz: { ...range1(JOINTS.map((j) => derived[j]?.natural_freq_hz?.value)), prov: reportProv(id, '/fit/calibrated/identifiability/derived') },
    command_delay_frames: rep.fit.calibrated.params.delay_frames,
    converged: rep.fit.calibrated.converged,
    checks: {
      units: { supported: rep.units.supported === true, heldout_agrees: typeof rep.units.heldout_agrees === 'boolean' ? rep.units.heldout_agrees : null, prov: reportProv(id, '/units') },
      mapping: {
        joints: (rep.mapping_checks as Any[]).length,
        sign_ambiguous: (rep.mapping_checks as Any[]).filter((m) => String(m.decision).includes('flipped sign would also fit')).length,
        prov: reportProv(id, '/mapping_checks'),
      },
      split: { overlap: (rep.split.overlap as unknown[] | undefined)?.length ?? 0, prov: reportProv(id, '/split/overlap') },
    },
    limitations: rep.limitations.length,
    trace: trace ? { episode: trace.episode.index, frames: trace.episode.frames, decimation: trace.decimation, url: reportFileUrl(id, 'trace.json') } : null,
  }
}

function rejectedSummary(l: Loaded): RejectedReportSummary {
  const { short, category } = shortReason(l.rep.reason)
  return { ...base(l), status: 'unsupported', reason: l.rep.reason, reason_short: short, category, reason_prov: reportProv(l.id, '/reason') }
}

function rangeOf(prov: string, pointer: string, pts: { id: string; value: number | null }[]): Range {
  const v = pts.filter((p): p is { id: string; value: number } => typeof p.value === 'number')
  if (!v.length) throw new SyncError(`empty range for ${prov}`)
  const lo = v.reduce((a, b) => (b.value < a.value ? b : a))
  const hi = v.reduce((a, b) => (b.value > a.value ? b : a))
  return { min: lo.value, max: hi.value, min_id: lo.id, max_id: hi.id, n: v.length, pointer, ids: [...new Set(v.map((p) => p.id))], prov }
}

function aggregate(family: Family, reps: OkReportSummary[]): FamilyAggregate {
  const fam = reps.filter((r) => r.family === family)
  const by = (path: string, pointer: string, get: (r: OkReportSummary) => (number | null)[]) =>
    rangeOf(`${REPORTS_BASE_PATH}/index.json#/aggregates/${family}/${path}`, pointer, fam.flatMap((r) => get(r).map((value) => ({ id: r.id, value }))))
  const ch = (set: HeldoutSet, k: 'vs_stock' | 'vs_baseline') => (r: OkReportSummary) => [r[set][k].mean]
  const chPtr = (set: HeldoutSet, k: 'vs_stock' | 'vs_baseline') => `/headline/sets/${set}/calibrated_${k}/rel_change/mean`
  const lagJ = (k: 'real' | 'stock' | 'calibrated') => (r: OkReportSummary) => JOINTS.map((j) => r.lag.per_joint_ms[j][k])
  const count = <K extends string>(keys: K[]) => keys.reduce<Partial<Record<K, number>>>((o, k) => ({ ...o, [k]: (o[k] ?? 0) + 1 }), {})
  return {
    family,
    robot: FAMILY_LABEL[family],
    twin: fam[0].twin,
    reports: fam.length,
    owners: new Set(fam.map((r) => r.owner)).size,
    ids: fam.map((r) => r.id),
    future: {
      vs_stock: by('future/vs_stock', chPtr('future', 'vs_stock'), ch('future', 'vs_stock')),
      vs_baseline: by('future/vs_baseline', chPtr('future', 'vs_baseline'), ch('future', 'vs_baseline')),
      calibrated_rmse_deg: by('future/calibrated_rmse_deg', '/headline/sets/future/calibrated/mean', (r) => [r.future.rmse_deg.calibrated.mean]),
      stock_rmse_deg: by('future/stock_rmse_deg', '/headline/sets/future/stock/mean', (r) => [r.future.rmse_deg.stock.mean]),
    },
    interleaved: {
      vs_stock: by('interleaved/vs_stock', chPtr('interleaved', 'vs_stock'), ch('interleaved', 'vs_stock')),
      vs_baseline: by('interleaved/vs_baseline', chPtr('interleaved', 'vs_baseline'), ch('interleaved', 'vs_baseline')),
    },
    future_gap_labels: count(fam.map((r) => r.future.gap_label)),
    future_baseline_labels: count(fam.map((r) => r.future.baseline_label)),
    lag: {
      real_ms: by('lag/real_ms', '/headline/lag_interleaved/per_joint_ms/*/real', lagJ('real')),
      stock_ms: by('lag/stock_ms', '/headline/lag_interleaved/per_joint_ms/*/stock', lagJ('stock')),
      calibrated_ms: by('lag/calibrated_ms', '/headline/lag_interleaved/per_joint_ms/*/calibrated', lagJ('calibrated')),
      max_mismatch_stock_ms: by('lag/max_mismatch_stock_ms', '/headline/lag_interleaved/max_abs_mismatch_vs_real_ms/stock', (r) => [r.lag.max_mismatch_ms.stock]),
      max_mismatch_calibrated_ms: by('lag/max_mismatch_calibrated_ms', '/headline/lag_interleaved/max_abs_mismatch_vs_real_ms/calibrated', (r) => [
        r.lag.max_mismatch_ms.calibrated,
      ]),
      median_frames_stock: by('lag/median_frames_stock', '/headline/lag_interleaved/median_over_joints_frames/stock', (r) => [r.lag.median_frames.stock]),
    },
    natural_freq_hz: by('natural_freq_hz', '/fit/calibrated/identifiability/derived/*/natural_freq_hz/value', (r) => [r.natural_freq_hz.min, r.natural_freq_hz.max]),
  }
}

export function buildIndex(loaded: Loaded[], candidatesText: string): ReportIndex {
  const byDataset = (a: { dataset: string }, b: { dataset: string }) => a.dataset.toLowerCase().localeCompare(b.dataset.toLowerCase())
  const reports = loaded.filter((l) => l.rep.status === 'ok').map(okSummary).sort(byDataset)
  const rejected = loaded.filter((l) => l.rep.status === 'unsupported').map(rejectedSummary).sort(byDataset)
  const cand = JSON.parse(candidatesText) as Any
  const pool: Any[] = cand.candidates
  const notRun: NotRunCandidate[] = pool
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.scan_verdict !== 'ok')
    .map(({ c, i }) => ({ dataset: c.dataset, sha: c.sha, verdict: c.scan_verdict, prov: `lab/reports/candidates.json#/candidates/${i}/scan_verdict` }))
  const runIds = new Set(loaded.map((l) => l.rep.dataset.id as string))
  const scanOk = pool.filter((c) => c.scan_verdict === 'ok').map((c) => c.dataset as string)
  for (const d of scanOk) if (!runIds.has(d)) throw new SyncError(`candidates.json: scan-ok candidate ${d} has no report (every scan-ok candidate is reported)`)
  const hero = reports.find((r) => r.id === HERO.id)
  if (!hero) throw new SyncError(`hero report ${HERO.id} is missing or not ok`)
  const labVersions = new Set(loaded.map((l) => l.rep.environment.meatspace_lab as string))
  if (labVersions.size !== 1) throw new SyncError(`reports come from several meatspace_lab versions: ${[...labVersions].join(', ')}`)
    return {
    schema: INDEX_SCHEMA,
    generated_at: loaded.map((l) => l.published).sort().at(-1)!,
    source: 'lab/reports',
    lab_version: [...labVersions][0],
    counts: {
      candidates: pool.length,
      run: loaded.length,
      reported: reports.length,
      rejected: rejected.length,
      not_run: notRun.length,
      owners_reported: new Set(reports.map((r) => r.owner)).size,
      so101: reports.filter((r) => r.family === 'so101').length,
      so100: reports.filter((r) => r.family === 'so100').length,
      heldout_episodes_future: reports.reduce((s, r) => s + r.future.n_episodes, 0),
      heldout_episodes_interleaved: reports.reduce((s, r) => s + r.interleaved.n_episodes, 0),
      prov: `${REPORTS_BASE_PATH}/index.json#/counts`,
    },
    reports,
    rejected,
    not_run: notRun,
    aggregates: { so101: aggregate('so101', reports), so100: aggregate('so100', reports) },
    hero: { id: HERO.id, why: HERO.why },
    selection_rule: cand.selection_rule,
    pool: cand.pool,
    verdict_rule:
      'Fixed before the batch was run: "closes most of the gap" when the change vs stock is at most -50% and its 95% interval excludes 0; "closes part" at most -20%; otherwise "small improvement", or "no clear change" when the interval includes 0, or "WORSE" when it lies above 0. The comparison with the physics-free lag filter uses the interval alone.',
  }
}

/* ------------------------------------------------------------------------------------------------
 * Output
 * ---------------------------------------------------------------------------------------------- */

export function generatedModule(index: ReportIndex): string {
  return [
    '/**',
    ' * GENERATED by scripts/sync-reports.ts from lab/reports (npm run sync:reports; runs before build and dev). Do not edit:',
    ' * the build overwrites it, and test/unit/reports.test.ts fails when it is stale. Types: shared/reports.ts.',
    ' */',
    "import type { ReportIndex } from './reports'",
    '',
    `export const REPORT_INDEX: ReportIndex = ${JSON.stringify(index, null, 1)}`,
    '',
  ].join('\n')
}

export interface Plan {
  index: ReportIndex
  /** Relative path under the repo -> bytes. */
  writes: Map<string, Buffer>
}

export function plan(root = ROOT): Plan {
  const labReports = join(root, 'lab', 'reports')
  const loaded = loadReports(labReports)
  const index = buildIndex(loaded, readFileSync(join(labReports, 'candidates.json'), 'utf8'))
  const writes = new Map<string, Buffer>()
  const pub = (p: string) => `public${REPORTS_BASE_PATH}/${p}`
  for (const l of loaded) {
    for (const [name, data] of l.files) writes.set(pub(`${l.id}/${name}`), data)
    if (l.strict !== null) writes.set(pub(`${l.id}/report.strict.json`), Buffer.from(l.strict))
  }
  writes.set(pub('candidates.json'), readFileSync(join(labReports, 'candidates.json')))
  writes.set(pub('index.json'), Buffer.from(`${JSON.stringify(index)}\n`))
  writes.set('shared/reports.generated.ts', Buffer.from(generatedModule(index)))
  return { index, writes }
}

/** Paths that differ from the plan (missing, different bytes, or stale extra files under public/data/reports). */
export function staleness(p: Plan, root = ROOT): string[] {
  const out: string[] = []
  for (const [rel, data] of p.writes) {
    const abs = join(root, rel)
    if (!existsSync(abs) || !readFileSync(abs).equals(data)) out.push(rel)
  }
  const pubRoot = join(root, `public${REPORTS_BASE_PATH}`)
  const walk = (dir: string, rel: string) => {
    if (!existsSync(dir)) return
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const r = `${rel}/${e.name}`
      if (e.isDirectory()) walk(join(dir, e.name), r)
      else if (!p.writes.has(r)) out.push(`${r} (not in lab/reports)`)
    }
  }
  walk(pubRoot, `public${REPORTS_BASE_PATH}`)
  return out
}

export function apply(p: Plan, root = ROOT): void {
  rmSync(join(root, `public${REPORTS_BASE_PATH}`), { recursive: true, force: true })
  for (const [rel, data] of p.writes) {
    const abs = join(root, rel)
    mkdirSync(dirname(abs), { recursive: true })
    if (rel === 'shared/reports.generated.ts' && existsSync(abs) && readFileSync(abs).equals(data)) continue // keep mtime: no tsc rebuild
    writeFileSync(abs, data)
  }
}

function main(argv: string[]): number {
  try {
    const p = plan()
    const c = p.index.counts
    const summary = `${c.reported} reports, ${c.rejected} rejected, ${c.not_run} not run (pool ${c.candidates}); generated_at ${p.index.generated_at}`
    if (argv.includes('--check')) {
      const stale = staleness(p)
      if (stale.length) {
        console.error(`sync-reports --check: ${stale.length} stale path(s); run npm run sync:reports\n  ${stale.slice(0, 20).join('\n  ')}`)
        return 1
      }
      console.log(`sync-reports --check: up to date (${summary})`)
      return 0
    }
    apply(p)
    console.log(`sync-reports: hashes verified; ${summary}`)
    return 0
  } catch (e) {
    if (e instanceof SyncError) {
      console.error(`sync-reports: FAILED: ${e.message}`)
      return 1
    }
    throw e
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2))
}

