/**
 * The v0.2 /v1 API contract: the endpoint registry (GET /v1, the man page ENDPOINTS section and the route tests all
 * read it), the cells and their lanes (GET /v1/cells, /cells), and the request intake body (POST /v1/requests).
 * Every status word comes from shared/status.ts: an endpoint's own status says whether it works at that URL; the
 * capability it serves says what is behind it (a LIVE intake can lead to an ON REQUEST, hand-run report).
 *
 * Plain data and pure functions only (compiled by the SPA, the Worker and the tests).
 */
import { ORIGIN, RATE_LIMITS, WAITLIST_MAX_BYTES } from './constants'
import { apiStatus, CAPABILITIES, type ApiStatus, type Capability, type CapabilityPart, type CapabilityStatus } from './status'

/* ------------------------------------------------------------------------------------------------
 * Capabilities
 * ---------------------------------------------------------------------------------------------- */

export function capabilityOf(part: CapabilityPart): Capability {
  const c = (CAPABILITIES as readonly Capability[]).find((x) => x.part === part)
  if (!c) throw new Error(`shared/status.ts has no capability ${part}`)
  return c
}

/** Wire form of a capability's status, e.g. "live", "on_request". */
export const capabilityApiStatus = (part: CapabilityPart): ApiStatus => apiStatus(capabilityOf(part).status)

/* ------------------------------------------------------------------------------------------------
 * Endpoints
 * ---------------------------------------------------------------------------------------------- */

export type Method = 'GET' | 'POST' | 'WS'

export interface EndpointDef {
  method: Method
  /** Hono-style path, e.g. /v1/reports/:id. */
  path: string
  /** Whether this endpoint works at this URL: LIVE, PLANNED (answers 501) or CONCEPT (the v0.1 simulation). */
  status: Extract<CapabilityStatus, 'LIVE' | 'PLANNED' | 'CONCEPT'>
  /** The capability behind it (shared/status.ts part number), when there is one. */
  part?: CapabilityPart
  /** One line, shown in GET /v1 and the man page. */
  description: string
  /** v0.1 path kept as an alias of this /v1/concept path. */
  alias_of?: string
}

const live = (method: Method, path: string, description: string, part?: CapabilityPart): EndpointDef => ({ method, path, status: 'LIVE', description, part })
const planned = (method: Method, path: string, description: string, part: CapabilityPart): EndpointDef => ({ method, path, status: 'PLANNED', description, part })
const concept = (method: Method, path: string, description: string, alias_of?: string): EndpointDef => ({
  method,
  path,
  status: 'CONCEPT',
  description,
  part: 'MS-CONCEPT',
  ...(alias_of ? { alias_of } : {}),
})

/** v0.1 concept endpoints under /v1/concept, and the old paths that stay as aliases. */
export const CONCEPT_ROUTES = [
  { sub: '/snapshot', method: 'GET', description: 'Simulated v0.1 snapshot: ticker and orderbook, all invented.' },
  { sub: '/nodes', method: 'GET', description: 'Simulated v0.1 orderbook (fictional machines at real place names).' },
  { sub: '/nodes/:id', method: 'GET', description: 'One fictional machine of the simulated orderbook.' },
  { sub: '/stats', method: 'GET', description: 'Simulated v0.1 ticker (invented numbers).' },
  { sub: '/stream', method: 'WS', description: 'WebSocket of the simulated v0.1 snapshot, every ~2 s.' },
  { sub: '/dispatch', method: 'POST', description: 'Simulated v0.1 dispatch. Streams NDJSON; nothing moves, nothing is charged.' },
] as const satisfies readonly { sub: string; method: Method; description: string }[]

export const ENDPOINTS: readonly EndpointDef[] = [
  live('GET', '/v1', 'This index: every endpoint and its status.'),
  live('GET', '/v1/reports', 'Every Twin Gap Report: summaries, counts, the rejected list with reasons.', 'MS-TGR-1'),
  live('GET', '/v1/reports/:id', 'One report.json (schema meatspace.twin-gap-report/v2).', 'MS-TGR-1'),
  live('GET', '/v1/reports/:id/twin', 'The calibrated twin package, calibrated_twin.json. Rejected reports have none.', 'MS-TWIN-PKG'),
  live('GET', '/v1/reports/:id/trace', 'trace.json: one held-out episode, per frame: command, real, stock, baseline, calibrated.', 'MS-TGR-1'),
  live('GET', '/v1/reports/:id/files/:name', 'Any published file of a report, byte for byte, with ETag = sha256.', 'MS-TGR-1'),
  live('GET', '/v1/cells', 'Cells and the status of each lane: twin, trials, real.', 'MS-RV-SO101'),
  live('GET', '/v1/cells/:id', 'One cell.', 'MS-RV-SO101'),
  live('POST', '/v1/requests', 'Request a gap report on your dataset (run by hand), a real-robot pilot (waitlist) or tell us about your robots.', 'MS-TGR-REQ'),
  planned('POST', '/v1/trials', 'Run a policy on a cell twin or real robot. Answers 501.', 'MS-TT-SIM'),
  planned('GET', '/v1/trials/:id', 'Status and results of a trial run. Answers 501.', 'MS-TT-SIM'),
  planned('GET', '/v1/cells/:id/twin', "A cell's own calibrated twin, once our unit exists. Answers 501.", 'MS-RV-SO101'),
  planned('GET', '/mcp', 'MCP server for agents. Answers 501.', 'MS-MCP'),
  concept('GET', '/v1/concept', 'Index of the v0.1 simulated dispatch API.'),
  ...CONCEPT_ROUTES.map((r) => concept(r.method, `/v1/concept${r.sub}`, r.description)),
  concept('POST', '/v1/waitlist', 'v0.1 waitlist (API keys, hardware). Kept working; new requests go to POST /v1/requests.'),
  ...CONCEPT_ROUTES.map((r) => concept(r.method, `/v1${r.sub}`, `v0.1 path: answers 308 Permanent Redirect to /v1/concept${r.sub}.`, `/v1/concept${r.sub}`)),
  live('GET', '/docs', 'MEATSPACE(1): plain text for curl and ?format=txt, HTML for browsers.'),
  live('GET', '/install.sh', 'Inert POSIX sh script: prints what it would do and exits. Changes nothing.'),
  live('GET', '/healthz', 'Liveness: "ok".'),
]

/**
 * What GET /v1 lists: the v0.2 API, the concept index and the kept v0.1 waitlist. The concept API itself (and the
 * v0.1 paths that redirect to it) is listed only by GET /v1/concept, so its words stay under /concept.
 */
export const INDEX_ENDPOINTS: readonly EndpointDef[] = ENDPOINTS.filter((e) => !e.alias_of && !e.path.startsWith('/v1/concept/'))

/** One entry of GET /v1 (wire form). */
export interface EndpointWire {
  method: Method
  path: string
  status: ApiStatus
  description: string
  capability?: { part: CapabilityPart; name: string; status: ApiStatus }
  alias_of?: string
}

export function endpointWire(e: EndpointDef): EndpointWire {
  const c = e.part ? capabilityOf(e.part) : null
  return {
    method: e.method,
    path: e.path,
    status: apiStatus(e.status),
    description: e.description,
    ...(c ? { capability: { part: c.part as CapabilityPart, name: c.name, status: apiStatus(c.status) } } : {}),
    ...(e.alias_of ? { alias_of: e.alias_of } : {}),
  }
}

/* ------------------------------------------------------------------------------------------------
 * Cells
 * ---------------------------------------------------------------------------------------------- */

export type Lane = 'twin' | 'trials' | 'real'

/** A status that is either a capability's (by part number) or a plain vocabulary word with no ledger row. */
export type StatusSource = { part: CapabilityPart } | { status: CapabilityStatus }

export function statusOf(src: StatusSource): ApiStatus {
  return 'part' in src ? capabilityApiStatus(src.part) : apiStatus(src.status)
}

export interface CellDef {
  id: string
  robot: string
  robot_label: string
  task: string
  task_summary: string
  lanes: Record<Lane, StatusSource & { note: string }>
  request: string
}

/**
 * There is one planned cell. Its twin will be a calibration of OUR unit, which does not exist yet (nothing purchased):
 * the published reports' packages model other people's arms, so this lane is PLANNED, not LIVE.
 */
export const CELLS: readonly CellDef[] = [
  {
    id: 'so101-pick-v1',
    robot: 'so101',
    robot_label: 'SO-101',
    task: 'SO101_PICK_PLACE_CUBE',
    task_summary: 'Pick a cube and place it in a marked zone.',
    lanes: {
      twin: { status: 'PLANNED', note: "Calibrated on our own unit, the same way the reports calibrate other people's arms. The unit is not purchased." },
      trials: { part: 'MS-TT-SIM', note: 'Hosted twin trials need a container host for MuJoCo; POST /v1/trials answers 501.' },
      real: { part: 'MS-RV-SO101', note: 'Physical SO-101 cell. Nothing purchased; gated on $3k committed in pilots.' },
    },
    request: `${ORIGIN}/#request-pilot`,
  },
]

export interface CellWire {
  id: string
  robot: string
  robot_label: string
  task: string
  task_summary: string
  lanes: Record<Lane, { status: ApiStatus; capability: CapabilityPart | null; note: string }>
  /** Convenience copies of the lane statuses. */
  twin: ApiStatus
  trials: ApiStatus
  real: ApiStatus
  request: string
}

export function cellWire(c: CellDef): CellWire {
  const lane = (l: Lane) => {
    const d = c.lanes[l]
    return { status: statusOf(d), capability: 'part' in d ? d.part : null, note: d.note }
  }
  const lanes = { twin: lane('twin'), trials: lane('trials'), real: lane('real') }
  return {
    id: c.id,
    robot: c.robot,
    robot_label: c.robot_label,
    task: c.task,
    task_summary: c.task_summary,
    lanes,
    twin: lanes.twin.status,
    trials: lanes.trials.status,
    real: lanes.real.status,
    request: c.request,
  }
}

/* ------------------------------------------------------------------------------------------------
 * POST /v1/requests
 * ---------------------------------------------------------------------------------------------- */

export const REQUEST_KINDS = ['gap_report', 'pilot', 'own_robot'] as const
export type RequestKind = (typeof REQUEST_KINDS)[number]

/** Body cap (bytes), shared with the v0.1 waitlist. */
export const REQUEST_MAX_BYTES = WAITLIST_MAX_BYTES
/** Requests per minute per client (IPv4 address or IPv6 /64), shared with the v0.1 waitlist limiter. */
export const REQUESTS_PER_MIN = RATE_LIMITS.waitlistPerMin
export const NOTES_MAX = 500

/**
 * What each kind of request asks for; the 202 receipt's `status` is its wire status: on_request (a person runs the
 * report), waitlist (no real cell yet), planned (software for robots you own is not built; this starts a conversation).
 */
export const REQUEST_STATUS: Readonly<Record<RequestKind, StatusSource>> = {
  gap_report: { part: 'MS-TGR-REQ' },
  pilot: { part: 'MS-RV-SO101' },
  own_robot: { status: 'PLANNED' },
}

/** request_id prefix per kind. */
export const REQUEST_ID_PREFIX: Readonly<Record<RequestKind, string>> = { gap_report: 'gr_', pilot: 'pl_', own_robot: 'or_' }

/** Allowed values of every enumerated field, per kind (the dialogs' option values). */
export const REQUEST_OPTIONS = {
  gap_report: {
    robot: ['so100', 'so101', 'other', 'unsure'],
    visibility: ['public', 'private'],
    simulator: ['mujoco', 'isaac', 'genesis', 'maniskill', 'pybullet', 'gazebo', 'world_model', 'other', 'none'],
  },
  pilot: {
    robot: ['so101', 'so100', 'koch', 'franka', 'bimanual', 'other'],
    simulator: ['mujoco', 'isaac', 'genesis', 'maniskill', 'pybullet', 'gazebo', 'world_model', 'other', 'none'],
    policy_format: ['lerobot', 'vla', 'rl', 'scripted', 'other'],
    serve: ['yes', 'given_spec', 'weights_only', 'unsure'],
    checkpoint_ready: ['yes', '2_weeks', '1_month', 'not_yet'],
    deadline_reason: ['conference', 'rebuttal', 'customer', 'milestone', 'none'],
    budget: ['none', 'lt_500', '500_1k', '1k_5k', '5k_10k', '10k_25k', 'gt_25k'],
    who_pays: ['grant', 'company', 'personal', 'unsure'],
    org_type: ['university', 'startup', 'sim_company', 'agent_lab', 'other'],
    trials: ['50', '200', '400+', 'unsure'],
    deposit: ['yes', 'depends', 'no'],
  },
  own_robot: {
    robot_count: ['1', '2-5', '6-20', '21+'],
    evals_per_week: ['0-5', '5-20', '20-100', '100+'],
    hours_per_week: ['lt_5', '5-20', '20-40', 'gt_40'],
    pain: ['resets', 'labeling', 'scheduling', 'watching', 'writing', 'other'],
    stack: ['lerobot', 'ros2', 'custom', 'other'],
    budget: ['yes', 'maybe', 'no'],
  },
} as const

type Opt<K extends RequestKind, F extends keyof (typeof REQUEST_OPTIONS)[K]> = (typeof REQUEST_OPTIONS)[K][F] extends readonly (infer U)[] ? U : never

interface RequestCommon {
  email: string
  /** Free text, at most 500 characters. */
  notes?: string
  name?: string
  org?: string
  /** Page or link that sent it, e.g. "/reports/x". */
  source?: string
  /** Honeypot: must be empty or absent. */
  website?: string
}

export interface GapReportRequest extends RequestCommon {
  kind: 'gap_report'
  /** Hugging Face Hub dataset id, owner/name. */
  dataset: string
  robot: Opt<'gap_report', 'robot'>
  /** Commit sha, branch or tag. Default: the latest commit when the run starts. */
  revision?: string
  own_data?: boolean
  visibility?: Opt<'gap_report', 'visibility'>
  simulator?: Opt<'gap_report', 'simulator'>
  /** You allow publishing the report on meatspace.sh. Default false. */
  publish?: boolean
}

export interface PilotRequest extends RequestCommon {
  kind: 'pilot'
  robot: Opt<'pilot', 'robot'>
  simulator: Opt<'pilot', 'simulator'>
  policy_format: Opt<'pilot', 'policy_format'>
  checkpoint_ready: Opt<'pilot', 'checkpoint_ready'>
  budget: Opt<'pilot', 'budget'>
  /** YYYY-MM-DD. */
  deadline?: string
  deadline_reason?: Opt<'pilot', 'deadline_reason'>
  serve?: Opt<'pilot', 'serve'>
  who_pays?: Opt<'pilot', 'who_pays'>
  org_type?: Opt<'pilot', 'org_type'>
  trials?: Opt<'pilot', 'trials'>
  /** e.g. "0.62 and 0.71 success on two checkpoints", at most 200 characters. */
  sim_results?: string
  /** An agent, not a person, will call the API. */
  agent?: boolean
  deposit?: Opt<'pilot', 'deposit'>
}

export interface OwnRobotRequest extends RequestCommon {
  kind: 'own_robot'
  /** e.g. "2x Franka FR3, 4x SO-101", at most 120 characters. */
  robot: string
  robot_count: Opt<'own_robot', 'robot_count'>
  /** What one evaluation costs today, at most 200 characters. */
  eval_cost: string
  evals_per_week?: Opt<'own_robot', 'evals_per_week'>
  hours_per_week?: Opt<'own_robot', 'hours_per_week'>
  pain?: Opt<'own_robot', 'pain'>[]
  stack?: Opt<'own_robot', 'stack'>[]
  budget?: Opt<'own_robot', 'budget'>
  /** Happy to talk for 30 minutes. */
  call?: boolean
}

export type RequestBody = GapReportRequest | PilotRequest | OwnRobotRequest

/** 202 body. `status`: REQUEST_STATUS of the kind (on_request, waitlist, planned). Nothing is charged. */
export interface RequestReceipt {
  ok: true
  request_id: string
  kind: RequestKind
  status: ApiStatus
  /** gap_report: a person runs it. */
  run?: 'manual'
  charged: false
  message: string
}

/** Hub dataset id: owner/name (Hub repo-name rules, no revision). */
export const DATASET_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,95}\/[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/
/** One @, no whitespace, at least one dot in the domain and no empty labels (the v0.1 waitlist rule). */
export const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

/* ------------------------------------------------------------------------------------------------
 * Request validation (pure; the Worker maps a failure to 400 ERR_SCHEMA with error.path)
 * ---------------------------------------------------------------------------------------------- */

type Field =
  | { t: 'enum'; values: readonly string[]; required?: boolean }
  | { t: 'text'; max: number; required?: boolean; re?: RegExp; hint?: string }
  | { t: 'bool' }
  | { t: 'date'; required?: boolean }
  | { t: 'multi'; values: readonly string[] }

const COMMON: Readonly<Record<string, Field>> = {
  notes: { t: 'text', max: NOTES_MAX },
  name: { t: 'text', max: 120 },
  org: { t: 'text', max: 120 },
  source: { t: 'text', max: 120 },
}

const o = REQUEST_OPTIONS

/** Fields per kind, beyond kind, email and the honeypot. Unknown fields are refused so a client bug cannot hide. */
const SCHEMA: Readonly<Record<RequestKind, Readonly<Record<string, Field>>>> = {
  gap_report: {
    ...COMMON,
    dataset: { t: 'text', max: 193, required: true, re: DATASET_ID_RE, hint: 'expected owner/name, like lerobot/svla_so101_pickplace' },
    robot: { t: 'enum', values: o.gap_report.robot, required: true },
    revision: { t: 'text', max: 64, re: /^[A-Za-z0-9][A-Za-z0-9._/-]*$/, hint: 'expected a commit sha, branch or tag' },
    own_data: { t: 'bool' },
    visibility: { t: 'enum', values: o.gap_report.visibility },
    simulator: { t: 'enum', values: o.gap_report.simulator },
    publish: { t: 'bool' },
  },
  pilot: {
    ...COMMON,
    robot: { t: 'enum', values: o.pilot.robot, required: true },
    simulator: { t: 'enum', values: o.pilot.simulator, required: true },
    policy_format: { t: 'enum', values: o.pilot.policy_format, required: true },
    checkpoint_ready: { t: 'enum', values: o.pilot.checkpoint_ready, required: true },
    budget: { t: 'enum', values: o.pilot.budget, required: true },
    deadline: { t: 'date' },
    deadline_reason: { t: 'enum', values: o.pilot.deadline_reason },
    serve: { t: 'enum', values: o.pilot.serve },
    who_pays: { t: 'enum', values: o.pilot.who_pays },
    org_type: { t: 'enum', values: o.pilot.org_type },
    trials: { t: 'enum', values: o.pilot.trials },
    sim_results: { t: 'text', max: 200 },
    agent: { t: 'bool' },
    deposit: { t: 'enum', values: o.pilot.deposit },
  },
  own_robot: {
    ...COMMON,
    robot: { t: 'text', max: 120, required: true },
    robot_count: { t: 'enum', values: o.own_robot.robot_count, required: true },
    eval_cost: { t: 'text', max: 200, required: true },
    evals_per_week: { t: 'enum', values: o.own_robot.evals_per_week },
    hours_per_week: { t: 'enum', values: o.own_robot.hours_per_week },
    pain: { t: 'multi', values: o.own_robot.pain },
    stack: { t: 'multi', values: o.own_robot.stack },
    budget: { t: 'enum', values: o.own_robot.budget },
    call: { t: 'bool' },
  },
}

class Invalid {
  readonly path: string
  readonly message: string
  constructor(path: string, message: string) {
    this.path = path
    this.message = message
  }
}
const invalid = (path: string, message: string) => new Invalid(path, message)
/** Absent, null and blank optional fields all mean "not provided". */
const isBlank = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '')
const list = (xs: readonly string[]) => xs.map((x) => `"${x}"`).join(', ')

function validDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

function parseField(key: string, f: Field, v: unknown): unknown {
  const path = `$.${key}`
  switch (f.t) {
    case 'enum':
      if (typeof v !== 'string' || !f.values.includes(v)) throw invalid(path, `expected one of ${list(f.values)}`)
      return v
    case 'text': {
      if (typeof v !== 'string') throw invalid(path, 'expected string')
      const t = v.trim()
      if (t.length > f.max) throw invalid(path, `must be at most ${f.max} chars`)
      if (f.re && !f.re.test(t)) throw invalid(path, f.hint ?? 'invalid format')
      return t
    }
    case 'bool':
      if (typeof v !== 'boolean') throw invalid(path, 'expected true or false')
      return v
    case 'date':
      if (typeof v !== 'string' || !validDate(v.trim())) throw invalid(path, 'expected a date, YYYY-MM-DD')
      return v.trim()
    case 'multi': {
      if (!Array.isArray(v) || v.length > f.values.length) throw invalid(path, `expected an array of ${list(f.values)}`)
      const out = new Set<string>()
      v.forEach((x, i) => {
        if (typeof x !== 'string' || !f.values.includes(x)) throw invalid(`${path}[${i}]`, `expected one of ${list(f.values)}`)
        out.add(x)
      })
      return [...out]
    }
  }
}

function parseEmail(v: unknown): string {
  if (typeof v !== 'string' || v.trim() === '') throw invalid('$.email', 'expected non-empty string')
  const email = v.trim().toLowerCase()
  if (email.length > 254) throw invalid('$.email', 'must be at most 254 chars')
  if (!EMAIL_RE.test(email)) throw invalid('$.email', 'expected an email address')
  return email
}

export interface ParsedRequest {
  kind: RequestKind
  email: string
  dataset: string | null
  source: string | null
  /** Every validated field except kind, email and the honeypot. */
  fields: Record<string, unknown>
  /** Honeypot tripped: acknowledge, never store. */
  bot: boolean
}

function parseOrThrow(input: unknown): ParsedRequest {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) throw invalid('$', 'expected object')
  const body = input as Record<string, unknown>
  if (typeof body.kind !== 'string' || !(REQUEST_KINDS as readonly string[]).includes(body.kind)) {
    throw invalid('$.kind', `expected one of ${list(REQUEST_KINDS)}`)
  }
  const kind = body.kind as RequestKind
  const schema = SCHEMA[kind]
  const email = parseEmail(body.email)
  const fields: Record<string, unknown> = {}
  for (const key of Object.keys(body)) {
    if (key === 'kind' || key === 'email' || key === 'website') continue
    if (!(key in schema)) throw invalid(`$.${key}`, `unknown field for kind "${kind}"`)
  }
  for (const [key, f] of Object.entries(schema)) {
    const v = body[key]
    if (isBlank(v) || (f.t === 'multi' && Array.isArray(v) && v.length === 0)) {
      if ('required' in f && f.required) throw invalid(`$.${key}`, 'required')
      continue
    }
    fields[key] = parseField(key, f, v)
  }
  const { source, ...rest } = fields
  return {
    kind,
    email,
    dataset: kind === 'gap_report' ? (fields.dataset as string) : null,
    source: typeof source === 'string' ? source : null,
    fields: rest,
    bot: !isBlank(body.website),
  }
}

export type RequestParse = { ok: true; request: ParsedRequest } | { ok: false; path: string; message: string }

/**
 * Validate a POST /v1/requests body (the Worker's rules; the dialogs can run the same check before sending).
 * Errors carry a `$.field` path and a message that says what is expected.
 */
export function parseRequestBody(input: unknown): RequestParse {
  try {
    return { ok: true, request: parseOrThrow(input) }
  } catch (e) {
    if (e instanceof Invalid) return { ok: false, path: e.path, message: e.message }
    throw e
  }
}
