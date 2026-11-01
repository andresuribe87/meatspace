/**
 * meatspace(1): the one manual behind both the /docs SPA route and `curl https://meatspace.sh/docs`.
 *
 * The page is built from structured blocks (prose, verbatim lines, code, definition lists) so the
 * browser can reflow prose on narrow screens while renderManText() lays out a classic 79-column
 * terminal page. Facts come from the shared contract wherever it exports them: statuses from
 * shared/status.ts, endpoints, cells and request fields from shared/api.ts, every report number from
 * shared/reports.generated.ts (written by the build from lab/reports), limits from shared/constants.ts.
 * Nothing about a result is typed here. Pure string functions only: this module runs in workerd and in
 * the browser.
 */
import { CELLS, cellWire, ENDPOINTS, NOTES_MAX, REQUEST_MAX_BYTES, REQUEST_OPTIONS, REQUEST_STATUS, REQUESTS_PER_MIN, statusOf, type EndpointDef } from './api'
import { MAX_ACTIVE_LOCKS_PER_CLIENT as LOCK_QUOTA, ORIGIN, RATE_LIMITS as LIMITS, REPO_URL, VERSION } from './constants'
import { changeText, estText, gapShort, PACKAGE_SCHEMA, REPORT_SCHEMA, TRACE_SCHEMA, type GapLabel, type OkReportSummary, type Range } from './reports'
import { REPORT_INDEX } from './reports.generated'
import { apiStatus, CAPABILITIES, CAPABILITY_STATUS, type CapabilityStatus } from './status'
import type { ErrorCode } from './types'

export interface ManSection {
  /** Uppercase section heading, e.g. "SYNOPSIS". */
  title: string
  /** Section body as plain text; lines are pre-wrapped at <= 72 columns, indentation preserved. */
  body: string
}

/** A body element. Lines are relative to the block's own left edge (no section indent). */
export type ManLeaf =
  /** Prose. Wrapped at the available width in text; the browser reflows it. */
  | { kind: 'p'; text: string; tight?: boolean }
  /** Verbatim lines that may wrap on narrow screens (hanging indent preserved). */
  | { kind: 'pre'; lines: readonly string[]; tight?: boolean }
  /** Verbatim lines that never wrap (tables, commands, JSON); scroll sideways when too wide. */
  | { kind: 'code'; lines: readonly string[]; style?: CodeStyle; tight?: boolean; rows?: readonly (readonly string[])[] }

/**
 * shell: every line is a command. table: first line is the header row. console: an event trace
 * (offset, message, status). Unstyled: lines starting "$ " (and their "\" continuations) are commands.
 */
export type CodeStyle = 'shell' | 'table' | 'console'

export interface ManItem {
  term: string
  desc: readonly ManLeaf[]
}

/** `tight`: no blank line before this block. */
export type ManBlock = ManLeaf | { kind: 'dl'; items: readonly ManItem[]; tight?: boolean }

export const MAN_TITLE = 'MEATSPACE(1)'
export const MAN_MANUAL = 'meatspace.sh Manual'
export const MAN_VERSION = `v${VERSION}`
export const MAN_DATE = '2026-11-01'
/** Total text width: the 7-space body indent plus 72 columns of content. */
export const MAN_WIDTH = 79
export const MAN_INDENT = 7

const BODY = MAN_WIDTH - MAN_INDENT
const NBSP = ' '

/* ----------------------------------------------------------------------------
 * Layout primitives (pure)
 * ------------------------------------------------------------------------- */

/** Greedy word wrap on regular spaces. NBSP glues words together and is kept. */
function wrap(text: string, width: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/[ \n]+/).filter(Boolean)) {
    if (!line) line = word
    else if (line.length + 1 + word.length <= width) line += ` ${word}`
    else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines
}

/**
 * Aligned columns. Every column but the last is padded to its widest cell; the last column wraps
 * within what is left of `width`, continuation lines hanging under it.
 */
function columns(rows: readonly (readonly string[])[], width: number, gap = 2): string[] {
  const n = rows[0].length
  const widths = Array.from({ length: n - 1 }, (_, c) => Math.max(...rows.map((r) => r[c].length)))
  const lead = widths.reduce((sum, w) => sum + w + gap, 0)
  const out: string[] = []
  for (const r of rows) {
    const prefix = widths.map((w, c) => r[c].padEnd(w + gap)).join('')
    const [first = '', ...rest] = wrap(glue(r[n - 1]), width - lead)
    out.push(`${prefix}${first}`.trimEnd())
    for (const cont of rest) out.push(`${' '.repeat(lead)}${cont}`)
  }
  return out.map((l) => l.replaceAll(NBSP, ' '))
}

const isScalar = (v: unknown) => v === null || typeof v !== 'object'

/** Pretty JSON: objects one key per line, arrays of scalars inline when they fit `width`. */
function jsonLines(value: unknown, width: number): string[] {
  const out: string[] = []
  const emit = (v: unknown, indent: string, key: string, comma: string) => {
    const head = `${indent}${key ? `${JSON.stringify(key)}: ` : ''}`
    if (isScalar(v)) {
      out.push(`${head}${JSON.stringify(v)}${comma}`)
      return
    }
    if (Array.isArray(v)) {
      const flat = `[${v.map((x) => JSON.stringify(x)).join(', ')}]`
      if (v.every(isScalar) && head.length + flat.length + comma.length <= width) {
        out.push(`${head}${flat}${comma}`)
        return
      }
      out.push(`${head}[`)
      v.forEach((x, i) => emit(x, `${indent}  `, '', i < v.length - 1 ? ',' : ''))
      out.push(`${indent}]${comma}`)
      return
    }
    const entries = Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== undefined)
    out.push(`${head}{`)
    entries.forEach(([k, x], i) => emit(x, `${indent}  `, k, i < entries.length - 1 ? ',' : ''))
    out.push(`${indent}}${comma}`)
  }
  emit(value, '', '', '')
  return out
}

const p = (text: string, tight?: boolean): ManLeaf => ({ kind: 'p', text, tight })
const pre = (lines: readonly string[], tight?: boolean): ManLeaf => ({ kind: 'pre', lines, tight })
const code = (lines: readonly string[], style?: CodeStyle): ManLeaf => ({ kind: 'code', lines, style })
/** A column table: `lines` for the text page, `rows` (header first) so a narrow screen can stack the cells instead. */
const table = (rows: readonly (readonly string[])[], width = BODY): ManLeaf => ({ kind: 'code', lines: columns(rows, width), style: 'table', rows })
const json = (value: unknown, width = BODY): ManLeaf => code(jsonLines(value, width))
const dl = (items: readonly ManItem[]): ManBlock => ({ kind: 'dl', items })
const item = (term: string, ...desc: ManLeaf[]): ManItem => ({ term, desc })
/** Description lists nest one indent deeper. */
const DD = BODY - MAN_INDENT

/** Keep comparison operators on the same line as their operand when wrapping. */
const glue = (s: string) => s.replace(/(<=|>=|==|<|>) /g, `$1${NBSP}`)
/** "a, b, c or d" */
const orList = (xs: readonly string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`)
const andList = (xs: readonly string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)
const quoted = (xs: readonly string[]) => xs.map((x) => `"${x}"`)
/** Printable ASCII for the text page (status.ts scope lines use a middle dot). */
const ascii = (s: string) => s.replaceAll(' · ', '; ').replaceAll('·', ';')

/* ----------------------------------------------------------------------------
 * Facts from the contract and the reports
 * ------------------------------------------------------------------------- */

const IDX = REPORT_INDEX
const C = IDX.counts
const HERO = IDX.reports.find((r) => r.id === IDX.hero.id) as OkReportSummary
const SO101 = IDX.aggregates.so101
const SO100 = IDX.aggregates.so100
const RETRY_AFTER_S = LIMITS.retryAfterS
const MENAGERIE = 'https://github.com/google-deepmind/mujoco_menagerie'

/** -0.9143 -> "-91%" */
const pct0 = (v: number) => `${v < 0 ? '-' : '+'}${Math.abs(Math.round(v * 100))}%`
/** A change range as improvements: min/max of negative changes -> "76% to 91% lower". */
const lowerRange = (r: Range) => `${Math.round(-r.max * 100)}% to ${Math.round(-r.min * 100)}%`
const msRange = (r: Range) => `${Math.round(r.min)} to ${Math.round(r.max)} ms`
const labelled = (fam: typeof SO100, set: 'future', label: string) =>
  IDX.reports.filter((r) => r.family === fam.family && (r[set].gap_label === label || r[set].baseline_label === label)).map((r) => r.dataset)

const CAP_ROWS = CAPABILITIES.map((c) => [apiStatus(c.status), c.name, ascii(c.scope)])
const USED_STATUSES = [...new Set(CAPABILITIES.map((c) => c.status))] as CapabilityStatus[]

const R = `${ORIGIN}/v1/reports`
const ID = HERO.id

/* ----------------------------------------------------------------------------
 * Sections
 * ------------------------------------------------------------------------- */

const SYNOPSIS: ManBlock[] = [
  code(
    [
      `R=${R}  ID=${ID}`,
      `curl -s $R | jq -r '.reports[].id'`,
      `curl -s $R/$ID | jq .headline.sets.future`,
      `curl -s $R/$ID/twin -o calibrated_twin.json`,
      `curl -s $R/$ID/trace | jq -c .series.elbow_flex.real`,
      `curl -s ${ORIGIN}/v1/cells | jq .cells`,
      `curl -s -X POST ${ORIGIN}/v1/requests \\`,
      `     -H 'content-type: application/json' -d @request.json`,
      `curl ${ORIGIN}/docs`,
    ],
    'shell',
  ),
]

const DESCRIPTION: ManBlock[] = [
  p(
    "meatspace.sh measures how far a robot's simulation twin is from the real robot, and publishes each result with the files to check it. A Twin Gap Report replays a public LeRobot dataset open-loop in the matching MuJoCo Menagerie twin, measures command-to-state lag and per-joint sim-vs-real error, fits a calibrated twin on some episodes, and reports the error on episodes the fit never saw, with 95% bootstrap intervals, next to a physics-free baseline.",
  ),
  p(
    'Scope: actuator and proprioception only. The replay is open-loop, in joint space, with contacts disabled: it measures the actuator model, not task success, contact or vision, and it does not test new policies. Every candidate dataset in the pool is reported whatever its result; one that fails a unit or mapping check is listed with the reason and gets no numbers.',
  ),
  p(
    `${MAN_VERSION}: reports, calibrated twin packages and request intake work today. A gap report on your own dataset is run by hand. Hosted twin trials and the MCP server are planned and their endpoints answer 501; a real SO-101 cell is a waitlist (nothing is purchased). The v0.1 dispatch marketplace was a simulation and lives under /v1/concept. Files carry sha256 hashes; nothing is signed yet.`,
  ),
]

const STATUS: ManBlock[] = [
  p('Status words come from one source shared with the site and GET /v1. A capability wears exactly one:'),
  table([['STATUS', 'CAPABILITY', 'SCOPE'], ...CAP_ROWS]),
  dl(USED_STATUSES.map((s) => item(apiStatus(s), p(CAPABILITY_STATUS[s].meaning)))),
  p(
    `Each endpoint in GET /v1 has its own status (live, planned or concept) and names the capability behind it, so a live intake can lead to an on_request report that a person runs. Cells list a status per lane: ${CELLS.map((c) => {
      const w = cellWire(c)
      return `${c.id} twin ${w.twin}, trials ${w.trials}, real ${w.real}`
    }).join('; ')}.`,
  ),
]

const fut = HERO.future
const heroRows = [
  ['MODEL', 'RMSE DEG [95% CI]'],
  ['stock twin', estText(fut.rmse_deg.stock)],
  ['aligned stock', estText(fut.rmse_deg.aligned_stock)],
  ['lag-filter baseline', estText(fut.rmse_deg.baseline)],
  ['calibrated twin', estText(fut.rmse_deg.calibrated)],
  ['change vs stock', changeText(fut.vs_stock)],
  ['change vs baseline', changeText(fut.vs_baseline)],
]

const REPORTS: ManBlock[] = [
  p(
    `${C.reported} reports, ${C.so101} SO-101 and ${C.so100} SO-100, from ${C.owners_reported} dataset owners; ${C.rejected} more were run and rejected with a reason, and ${C.not_run} candidates of the pool of ${C.candidates} failed the compatibility scan and were not run (lab/reports/candidates.json). Newest report: ${IDX.generated_at}. Every number below comes from those files; GET /v1/reports has them all.`,
  ),
  dl([
    item(
      'Method',
      p(
        'Load the dataset at a pinned revision sha (tabular data only, per-file sha256). Detect units from the encoder-tick lattice and check the joint mapping against the twin, on the fit episodes. Replay every recorded command open-loop in the twin: q_sim[0] = x[0], then for each frame hold ctrl = a[t - d] for one frame (d = command delay; stock d = 0) and compare q_sim[t] with x[t] for t = 1..T-1. Contacts are disabled; the gripper is never scored.',
      ),
    ),
    item(
      'Hold-out sets',
      p(
        'Future block: the last 20% of episodes by index, recorded after every fit episode (the harder test). Interleaved: round(0.2 n) episodes drawn at random from the rest, plus every episode beyond the 40-episode fit cap. Fit: what remains, at most 40. Units and the mapping are decided on the fit episodes only.',
      ),
    ),
    item(
      'Models',
      p(
        'stock: the Menagerie MJCF as published. aligned stock: stock dynamics plus a fitted command delay. baseline: a physics-free lag filter per joint, y[t+1] = y[t] + alpha*(a[t-d] + b - y[t]), three parameters per joint, fitted on the same episodes. calibrated: fitted kp, kv and frictionloss per joint plus one command delay, armature fixed. "vs baseline" is what the MuJoCo physics adds over a black-box lag model.',
      ),
    ),
    item(
      'Metrics',
      p(
        'Sim-vs-real joint RMSE in degrees, mean over the 5 arm joints, then over episodes. change = calibrated / reference - 1, paired by episode: negative is better. Every interval is a 95% percentile bootstrap over whole episodes (10,000 resamples, fixed seed). Also: command-to-state lag per joint (ms), static-frame RMSE (gravity sag), final-pose gap, workspace novelty and clipping.',
      ),
    ),
    item('Verdict', p(IDX.verdict_rule)),
    item(
      'How to read one',
      p(`${HERO.dataset} (${HERO.robot}, ${HERO.twin}), future block, ${fut.n_episodes} held-out episodes:`),
      table(heroRows, DD),
      p(`Verdict: ${fut.verdict}.`),
      code([`$ curl -s $R/$ID | jq '.headline.sets.future.verdict'`]),
    ),
    item(
      'Findings',
      p(
        `${SO101.robot} (${SO101.reports} datasets, ${SO101.owners} owners): the stock ${SO101.twin} twin answers commands within about one frame (median ${SO101.lag.median_frames_stock.min} to ${SO101.lag.median_frames_stock.max} frames, ${msRange(SO101.lag.stock_ms)} per joint) while the real arms lag ${msRange(SO101.lag.real_ms)}. On the future block the calibrated twin's error is ${lowerRange(SO101.future.vs_stock)} lower than stock and ${lowerRange(SO101.future.vs_baseline)} lower than the lag-filter baseline (interleaved: ${lowerRange(SO101.interleaved.vs_baseline)}).`,
      ),
      p(
        `${SO100.robot} (${SO100.reports} datasets): the stock ${SO100.twin} twin is already close on dynamics. Future-block verdicts: ${Object.entries(SO100.future_gap_labels)
          .map(([k, v]) => `${gapShort(k as GapLabel)} ${v}`)
          .join(', ')}. Change vs the lag-filter baseline: ${pct0(SO100.future.vs_baseline.min)} to ${pct0(SO100.future.vs_baseline.max)}. No clear change vs stock on ${andList(labelled(SO100, 'future', 'no clear change'))}; worse than the baseline on ${andList(labelled(SO100, 'future', 'is WORSE than the physics-free lag filter'))}. Where the arm pushes on the world, a contact-free replay cannot model it and no actuator calibration removes that error; each report's limitations say where.`,
      ),
    ),
    item(
      'Limitations',
      p(
        'Open-loop, joint-space, contact-free: pushing on the world shows up as twin error. The servo is an ideal PD position actuator: it reproduces dynamic lag, not static sag, so the calibrated final-pose error is often larger than stock. Individual gains are often not identified; read the natural frequency and damping ratio. One dataset is one robot. About 10 held-out episodes per set on 50-episode datasets, so intervals are approximate. Each report lists its own limitations.',
      ),
    ),
    item(
      'Files',
      pre([
        'report.json           schema ' + REPORT_SCHEMA,
        'report.strict.json    the same, NaN and Infinity written as null',
        'report.md             human-readable, ends with the exact command',
        'calibrated_twin.json  schema ' + PACKAGE_SCHEMA,
        'trace.json            schema ' + TRACE_SCHEMA,
        'heldout_episode.svg   the trace episode, plotted',
        'rmse_by_joint*.svg    per-joint RMSE with intervals',
      ]),
    ),
    item(
      'trace.json',
      p(
        'One held-out episode per report, the future-block episode with the median stock error: per frame, for each arm joint, the command, the real state and the stock, baseline and calibrated replays, in degrees (2 decimals). The lab re-runs the report\'s replay to write it and checks the per-joint RMSE against report.json. A long episode is decimated by an integer factor, recorded as "decimation".',
      ),
    ),
    item(
      'Hashes',
      p(
        'report.json carries content_sha256 (everything except the volatile runtime block) and results_sha256 (results only, the same on any machine); the package and the trace carry their own sha256. content_sha256 verifies against /v1/reports/:id/files/report.json parsed as the lab wrote it (Python json, NaN allowed), not against the strict copy GET /v1/reports/:id serves for the two reports that hold NaN. report.md and the SVG plots are renderings: their sha256 (the ETag) is recorded at build, but report.json does not cover them. The build recomputes every one and refuses to publish a report that does not match. Hashed, not signed: Ed25519 signing is planned.',
      ),
    ),
  ]),
]

const TWIN_PACKAGES: ManBlock[] = [
  p(
    `calibrated_twin.json, schema ${PACKAGE_SCHEMA}, holds parameter overrides for the Menagerie MJCF (kp, kv, damping, armature, frictionloss per arm joint), the joint mapping from dataset degrees to MJCF radians, the command delay in frames, the joint ranges, the replay options (timestep, substeps, contacts off) and provenance (dataset sha, Menagerie sha, fit episodes). Its sha256 covers the canonical JSON. It models one robot: the unit that recorded the dataset, not the robot model; transfer to other units is not tested.`,
  ),
  p(`Apply it to the Menagerie twin at the pinned commit (${HERO.menagerie_sha.slice(0, 7)} for the published reports):`),
  pre([
    'actuator j  gainprm[0] = kp, biasprm[1] = -kp, biasprm[2] = -kv',
    'joint j     damping, armature, frictionloss; range = jnt_range_rad',
    'option      timestep; contacts disabled',
    'commands    q = sign * deg2rad(x) + deg2rad(nominal_offset_deg),',
    '            held for one frame, delayed by command_delay_frames',
  ]),
  p('Or write a calibrated MJCF with the lab tooling (lab/ in the repository):'),
  code([
    `$ curl -s $R/$ID/twin -o calibrated_twin.json`,
    '$ python -m meatspace_lab export-twin \\',
    '    --twin mujoco_menagerie/robotstudio_so101 \\',
    '    --package calibrated_twin.json --out so101_calibrated.xml',
  ]),
]

const opts = (xs: readonly string[]) => orList(quoted(xs))
const O = REQUEST_OPTIONS

const REQUESTS: ManBlock[] = [
  p(
    `POST /v1/requests takes one JSON object (at most ${REQUEST_MAX_BYTES} bytes) with kind and email, plus the fields of that kind. email is required and stored lowercase; free text is at most ${NOTES_MAX} characters (notes) unless noted; name, org and source are optional on every kind. Unknown fields are refused with ERR_SCHEMA and their $.path. A valid request always gets 202, repeats included, so the API never says whether an email is on file; a repeat of the same request returns the same request_id and replaces the answers stored for it. Nothing is charged. Requests from another site's origin are refused; curl sends none.`,
  ),
  dl([
    item(
      `kind "gap_report"  (${statusOf(REQUEST_STATUS.gap_report)})`,
      p(
        `A Twin Gap Report on your dataset, run by hand with the same pipeline. Required: dataset (Hub id, owner/name), robot (${opts(O.gap_report.robot)}). Optional: revision (sha, branch or tag), own_data (boolean), visibility (${opts(O.gap_report.visibility)}), simulator (${opts(O.gap_report.simulator)}), publish (boolean: you allow the report on meatspace.sh; default false). Units are checked when the data is downloaded: if the data cannot confirm them, the report says so and stops.`,
      ),
    ),
    item(
      `kind "pilot"  (${statusOf(REQUEST_STATUS.pilot)})`,
      p(
        `The real-robot pilot waitlist. There is no real cell yet. Required: robot (${opts(O.pilot.robot)}), simulator, policy_format (${opts(O.pilot.policy_format)}), checkpoint_ready (${opts(O.pilot.checkpoint_ready)}), budget (${opts(O.pilot.budget)}). Optional: deadline (YYYY-MM-DD), deadline_reason, serve, who_pays, org_type, trials (${opts(O.pilot.trials)}), sim_results (200 characters), agent (boolean), deposit.`,
      ),
    ),
    item(
      `kind "own_robot"  (${statusOf(REQUEST_STATUS.own_robot)})`,
      p(
        `Evaluation on robots you own: software for it is planned, not built. Required: robot (text, 120), robot_count (${opts(O.own_robot.robot_count)}), eval_cost (text, 200). Optional: evals_per_week, hours_per_week, pain[] and stack[] (arrays), budget (${opts(O.own_robot.budget)}), call (boolean).`,
      ),
    ),
  ]),
  p('The allowed values of every field are listed in shared/api.ts. Example request.json:'),
  json({ kind: 'gap_report', dataset: 'owner/name', robot: 'so101', own_data: true, email: 'you@example.com' }),
  p('Answer:'),
  json({ ok: true, request_id: 'gr_0123456789abcdef', kind: 'gap_report', status: statusOf(REQUEST_STATUS.gap_report), run: 'manual', charged: false, message: '...' }),
]

/** What each endpoint answers. */
const RETURNS: Readonly<Record<string, readonly string[]>> = {
  'GET /v1': ['-> 200: { name, version, docs, reports, capabilities[],', '         endpoints[], concept }'],
  'GET /v1/reports': ['-> 200: ReportIndex { generated_at, counts, reports[],', '         rejected[], not_run[], aggregates }'],
  'GET /v1/reports/:id': ['-> 200: report.json (strict JSON)', '-> 404: ERR_REPORT_NOT_FOUND'],
  'GET /v1/reports/:id/twin': ['-> 200: calibrated_twin.json', '-> 404: ERR_REPORT_NOT_FOUND, ERR_FILE_NOT_FOUND (rejected)'],
  'GET /v1/reports/:id/trace': ['-> 200: trace.json', '-> 404: ERR_REPORT_NOT_FOUND, ERR_FILE_NOT_FOUND (rejected)'],
  'GET /v1/reports/:id/files/:name': ['-> 200: the file, byte for byte; 304 on If-None-Match', '-> 404: ERR_REPORT_NOT_FOUND, ERR_FILE_NOT_FOUND'],
  'GET /v1/cells': ['-> 200: { cells: Cell[] }'],
  'GET /v1/cells/:id': ['-> 200: Cell { id, robot, task, lanes, twin, trials, real }', '-> 404: ERR_CELL_NOT_FOUND'],
  'POST /v1/requests': ['-> 202: { ok, request_id, kind, status, charged: false }', '-> 400, 403, 413, 429, 500: ApiErrorBody'],
  'POST /v1/trials': ['-> 501: ERR_NOT_IMPLEMENTED'],
  'GET /v1/trials/:id': ['-> 501: ERR_NOT_IMPLEMENTED'],
  'GET /v1/cells/:id/twin': ['-> 501: ERR_NOT_IMPLEMENTED'],
  'GET /mcp': ['-> 501: ERR_NOT_IMPLEMENTED (any method)'],
  'GET /docs': ['-> 200: text/plain or text/html'],
  'GET /install.sh': ['-> 200: text/plain'],
  'GET /healthz': ['-> 200: text/plain "ok"'],
}

const endpointKey = (e: EndpointDef) => `${e.method} ${e.path}`
const endpointItem = (e: EndpointDef) =>
  item(endpointKey(e), p(`${e.status === 'PLANNED' ? 'Planned. ' : ''}${e.description}`), pre(RETURNS[endpointKey(e)] ?? [], true))

const ENDPOINTS_SECTION: ManBlock[] = [
  p(
    `Base URL ${ORIGIN}. No authentication and no API keys. /v1 responses are JSON unless noted. Every GET under /v1 allows cross-origin calls (access-control-allow-origin: *); POST /v1/requests accepts this site's origin or none (curl). Responses are not cached (no-store), except report files: they carry ETag = the sha256 of their bytes, answer If-None-Match with 304, and cache for 5 minutes, or for a year with ?sha256=<that hash> (a hash that is not the published one answers 404 ERR_FILE_NOT_FOUND and names the current hash). A known path called with the wrong method gets 405 and an allow header; an unknown /v1 path gets 404 ERR_NOT_FOUND. HEAD works wherever GET does.`,
  ),
  dl([
    ...ENDPOINTS.filter((e) => e.status !== 'CONCEPT').map(endpointItem),
    item('GET /v1/concept, /v1/concept/*', p('The v0.1 simulation. See CONCEPT.'), pre(['-> 200: concept index with every concept path'], true)),
  ]),
  p(':id is the report directory name, owner__name (GET /v1/reports lists them). :name is one of report.json, report.strict.json, report.md, calibrated_twin.json, trace.json, heldout_episode.svg, rmse_by_joint_future.svg, rmse_by_joint.svg, whichever the report publishes. A rejected report publishes only report.json and report.md.'),
]

const ERROR_DOCS: Readonly<Record<ErrorCode, { http: number; meaning: string }>> = {
  ERR_INVALID_JSON: { http: 400, meaning: 'body is not valid JSON' },
  ERR_SCHEMA: { http: 400, meaning: 'a field is missing or invalid; see error.path' },
  ERR_PAYLOAD_TOO_LARGE: { http: 413, meaning: 'body over the limit' },
  ERR_RATE_LIMITED: { http: 429, meaning: `per-client limit; retry-after${NBSP}${RETRY_AFTER_S}` },
  ERR_NOT_FOUND: { http: 404, meaning: 'no such /v1 endpoint' },
  ERR_METHOD_NOT_ALLOWED: { http: 405, meaning: 'wrong method for the path; see the allow header' },
  ERR_FORBIDDEN: { http: 403, meaning: "POST from another site's origin" },
  ERR_REPORT_NOT_FOUND: { http: 404, meaning: 'no report with that id' },
  ERR_FILE_NOT_FOUND: { http: 404, meaning: 'the report publishes no such file (rejected reports have no twin or trace)' },
  ERR_CELL_NOT_FOUND: { http: 404, meaning: 'no cell with that id' },
  ERR_NOT_IMPLEMENTED: { http: 501, meaning: 'planned endpoint; the message says what exists and where to sign up' },
  ERR_UPGRADE_REQUIRED: { http: 426, meaning: 'concept: stream without an Upgrade' },
  ERR_NODE_NOT_FOUND: { http: 404, meaning: 'concept: unknown machine id' },
  ERR_PRIMITIVE_UNSUPPORTED: { http: 422, meaning: 'concept: machine of the wrong category' },
  ERR_GEOFENCE: { http: 422, meaning: 'concept: outside the simulated geofence' },
  ERR_ALTITUDE_ENVELOPE: { http: 422, meaning: 'concept: altitude band outside the simulated limits' },
  ERR_RTL_RESERVE: { http: 422, meaning: 'concept: return reserve below the minimum' },
  ERR_INSUFFICIENT_CHARGE: { http: 422, meaning: 'concept: simulated charge too low' },
  ERR_WORK_ENVELOPE: { http: 422, meaning: 'concept: part larger than the cell envelope' },
  ERR_TOLERANCE: { http: 422, meaning: 'concept: tolerance tighter than the cell minimum' },
  ERR_SITE_MISMATCH: { http: 422, meaning: 'concept: site is not at the cell' },
  ERR_NODE_BUSY: { http: 409, meaning: 'concept: machine is locked by another task' },
  ERR_LOCK_QUOTA: { http: 429, meaning: `concept: client holds ${LOCK_QUOTA} task locks` },
  ERR_SPEND_CAP: { http: 422, meaning: 'concept: price above the request spend cap' },
  ERR_INTERNAL: { http: 500, meaning: 'unexpected server error' },
}

const ERRORS: ManBlock[] = [
  p('Every error has a stable code, in an ApiErrorBody: { error: { code, message, path? } }. Codes marked concept come only from the v0.1 simulation; in its dispatch stream they arrive as the final error event.'),
  table([['CODE', 'HTTP', 'MEANING'], ...Object.entries(ERROR_DOCS).map(([codeName, d]) => [codeName, String(d.http), d.meaning])]),
  p('A planned endpoint, for example:'),
  code([`$ curl -s -X POST ${ORIGIN}/v1/trials | jq -r .error.code`, 'ERR_NOT_IMPLEMENTED']),
]

const RATE_LIMITS: ManBlock[] = [
  table([
    ['ENDPOINT', 'LIMIT'],
    ['POST /v1/requests', `${REQUESTS_PER_MIN} per minute per client, shared with /v1/waitlist`],
    ['POST /v1/concept/dispatch', `${LIMITS.dispatchPerMin} per minute per client; ${LOCK_QUOTA} simulated task locks`],
  ]),
  p(
    `A client is an IPv4 address or an IPv6 /64: every address in one /64 shares its limits. Every request counts, valid or not. Over the limit: HTTP 429, ERR_RATE_LIMITED and retry-after:${NBSP}${RETRY_AFTER_S}. Counting is approximate. GET endpoints are not limited; report files are static and cached.`,
  ),
]

const CONCEPT: ManBlock[] = [
  p(
    `The v0.1 site described a dispatch marketplace for idle industrial machines. It was a simulation end to end: no machine, no operator, no money. It is kept, labeled, at ${ORIGIN}/concept. Its API answers under /v1/concept (GET /v1/concept lists every path: snapshot, stats, stream, dispatch and a fictional orderbook). The v0.1 paths without /concept answer 308 Permanent Redirect to the same path under /v1/concept, method and body kept, so old scripts keep working with curl -L: GET /v1/snapshot, GET /v1/stats, GET /v1/stream (WebSocket clients must use the new path) and POST /v1/dispatch. POST /v1/waitlist still answers in place.`,
  ),
  p(
    'Every concept response carries the header x-meatspace-status: concept, and every dispatch receipt "sandbox": true. Nothing moves and nothing is charged. A concept dispatch ends with a sha256 fingerprint of your request, which says nothing about execution. Its prices and phase names are v0.1 copy, not a product.',
  ),
  code([`$ curl -s ${ORIGIN}/v1/concept | jq -r '.endpoints[].path'`]),
]

const FILES: ManBlock[] = [
  dl([
    item(
      '/install.sh',
      p(
        "Inert POSIX sh script for meatspaced(8), a planned local evaluation runner and safety supervisor for robots you own. It prints what it detected and the plan it would run, and exits 0 (2 on an unknown option). It writes nothing, downloads nothing and starts nothing: meatspaced is not released. v0.1 flags are accepted and ignored.",
      ),
    ),
    item(
      `${ORIGIN}/data/reports/`,
      p(
        'The published report files, the same bytes GET /v1/reports/:id/files/:name serves, and index.json (the ReportIndex of GET /v1/reports). These are static paths: a name that is not published answers the site\'s HTML page with 200, not an error. Scripts should use /v1/reports/:id/files/:name, which answers 404 ERR_FILE_NOT_FOUND.',
      ),
    ),
  ]),
  code([`$ curl -sSL ${ORIGIN}/install.sh | sh`]),
]

const BUGS: ManBlock[] = [
  p(
    'Reports come from runs started by hand, not from the API, and only SO-100 and SO-101 twins exist. There are no API keys: limits are per client network, so clients behind one NAT share them. Files are hashed, not signed. Contacts are off in the replay, so any push against the world shows up as twin error. The lab writes report.json with Python json, which can hold NaN and Infinity; GET /v1/reports/:id and report.strict.json carry null instead.',
  ),
]

const SEE_ALSO: ManBlock[] = [pre(['curl(1), jq(1), meatspaced(8)', MENAGERIE, 'https://github.com/huggingface/lerobot', REPO_URL])]

const PAGE: readonly { title: string; blocks: readonly ManBlock[] }[] = [
  { title: 'NAME', blocks: [pre(['meatspace - sim-to-real gap reports for robot twins'])] },
  { title: 'SYNOPSIS', blocks: SYNOPSIS },
  { title: 'DESCRIPTION', blocks: DESCRIPTION },
  { title: 'STATUS', blocks: STATUS },
  { title: 'REPORTS', blocks: REPORTS },
  { title: 'TWIN PACKAGES', blocks: TWIN_PACKAGES },
  { title: 'REQUESTS', blocks: REQUESTS },
  { title: 'ENDPOINTS', blocks: ENDPOINTS_SECTION },
  { title: 'ERRORS', blocks: ERRORS },
  { title: 'RATE LIMITS', blocks: RATE_LIMITS },
  { title: 'CONCEPT', blocks: CONCEPT },
  { title: 'FILES', blocks: FILES },
  { title: 'BUGS', blocks: BUGS },
  { title: 'SEE ALSO', blocks: SEE_ALSO },
]

/* ----------------------------------------------------------------------------
 * Text rendering
 * ------------------------------------------------------------------------- */

function leafLines(b: ManLeaf, width: number): string[] {
  return b.kind === 'p' ? wrap(b.text, width) : [...b.lines]
}

/** Blocks -> lines relative to the body edge, blank line between blocks unless `tight`. */
function blockLines(blocks: readonly ManBlock[], width: number): string[] {
  const out: string[] = []
  blocks.forEach((b, i) => {
    if (i > 0 && !b.tight) out.push('')
    if (b.kind !== 'dl') {
      out.push(...leafLines(b, width))
      return
    }
    b.items.forEach((it, j) => {
      if (j > 0) out.push('')
      out.push(it.term)
      for (const line of blockLines(it.desc, width - MAN_INDENT)) out.push(line ? `${' '.repeat(MAN_INDENT)}${line}` : '')
    })
  })
  return out.map((l) => l.replaceAll(NBSP, ' '))
}

export const MAN_SECTIONS: readonly ManSection[] = PAGE.map((s) => ({ title: s.title, body: blockLines(s.blocks, BODY).join('\n') }))

const BLOCKS = new Map(PAGE.map((s) => [s.title, s.blocks]))

/** Structured body of a section, for the HTML page. Falls back to one verbatim block. */
export function manBlocks(section: ManSection): readonly ManBlock[] {
  return BLOCKS.get(section.title) ?? [pre(section.body.split('\n'))]
}

/**
 * A prose block's lines exactly as the text page wraps them. `depth` 0 is a section body, 1 is inside
 * a definition list. NBSP is kept so a browser reflowing the same words never splits glued tokens.
 */
export function manProse(text: string, depth: number): string[] {
  return wrap(text, BODY - depth * MAN_INDENT)
}

/** "RATE LIMITS" -> "rate-limits" (the /docs#anchor). */
export function manSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** left, centre (centred on the page) and right fields on one MAN_WIDTH line. */
function threeUp(left: string, centre: string, right: string): string {
  const start = Math.max(left.length + 1, Math.floor((MAN_WIDTH - centre.length) / 2))
  const head = `${left.padEnd(start)}${centre}`
  return `${head}${right.padStart(Math.max(right.length + 1, MAN_WIDTH - head.length))}`
}

/** Plain-text man page served by `curl https://meatspace.sh/docs`. */
export function renderManText(): string {
  const indent = ' '.repeat(MAN_INDENT)
  const lines = [threeUp(MAN_TITLE, MAN_MANUAL, MAN_TITLE), '']
  for (const s of MAN_SECTIONS) {
    lines.push(s.title, ...s.body.split('\n').map((l) => (l ? `${indent}${l}` : '')), '')
  }
  lines.push(threeUp(MAN_VERSION, MAN_DATE, MAN_TITLE))
  return `${lines.join('\n')}\n`
}
