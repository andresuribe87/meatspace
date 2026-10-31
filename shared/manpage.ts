/**
 * meatspace(1): the one manual behind both the /docs SPA route and `curl https://meatspace.sh/docs`.
 *
 * The page is built from structured blocks (prose, verbatim lines, code, definition lists) so the
 * browser can reflow prose on narrow screens while renderManText() lays out a classic 79-column
 * terminal page. Facts come from the shared contract wherever it exports them (limits, phase offsets,
 * primitives, compile targets, the seed orderbook, the state machine itself) so the manual cannot
 * drift from the API. Pure string functions only: this module runs in workerd and in the browser.
 */
import {
  MAX_ACTIVE_LOCKS_PER_CLIENT as LOCK_QUOTA,
  ORIGIN,
  RATE_LIMITS as LIMITS,
  REPO_URL,
  TASK_LOCK_MS,
  TICK_MS,
  VERSION,
  WAITLIST_MAX_BYTES,
  WS_ORIGIN,
} from './constants'
import {
  AGL_CEILING_LIMIT_M,
  attestMessage,
  GROUND_RESERVE_PCT,
  MAX_BODY_BYTES,
  MAX_DURATION_MIN,
  MAX_SPEND_USDC,
  MIN_DURATION_MIN,
  MIN_RTL_RESERVE_PCT,
  parseDispatchPayload,
  PHASE_OFFSETS_MS,
  planDispatch,
} from './dispatch'
import { centsToDecimal, formatOffset, formatRate, formatUsd } from './format'
import { CATEGORY_FILTERS, SEED_NODES } from './nodes'
import { COMPILE_TARGETS, defaultPayload, PRIMITIVE_IDS, PRIMITIVES } from './primitives'
import type {
  AerialIsrPayload,
  ApiErrorBody,
  DispatchEvent,
  DispatchPhase,
  ErrorCode,
  HardwareNode,
  Interface,
  PrimitiveId,
} from './types'

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
  | { kind: 'code'; lines: readonly string[]; style?: CodeStyle; tight?: boolean }

/**
 * shell: every line is a command. table: first line is the header row. console: dispatch trace
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
export const MAN_DATE = '2026-10-31'
/** Total text width: the 7-space body indent plus 72 columns of content. */
export const MAN_WIDTH = 79
export const MAN_INDENT = 7

const BODY = MAN_WIDTH - MAN_INDENT
const NBSP = ' '

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
const table = (rows: readonly (readonly string[])[], width = BODY): ManLeaf => code(columns(rows, width), 'table')
const json = (value: unknown, width = BODY): ManLeaf => code(jsonLines(value, width))
const dl = (items: readonly ManItem[]): ManBlock => ({ kind: 'dl', items })
const item = (term: string, ...desc: ManLeaf[]): ManItem => ({ term, desc })
/** Description lists nest one indent deeper. */
const DD = BODY - MAN_INDENT

/* ----------------------------------------------------------------------------
 * Facts derived from the contract
 * ------------------------------------------------------------------------- */

const REPO = REPO_URL
const LOCK_S = TASK_LOCK_MS / 1000
const TICK_S = TICK_MS / 1000
const DISPATCH_LIMIT = LIMITS.dispatchPerMin
const WAITLIST_LIMIT = LIMITS.waitlistPerMin
const RETRY_AFTER_S = LIMITS.retryAfterS
/** The handoff's illustrative short hash; real hashes differ per task. */
const SAMPLE_HASH = '0x9f8c...3a1b'

const VALUE_PROP =
  'Autonomous hardware sits idle in proprietary silos for most of its lifecycle, while software agents have zero native way to discover, rent, or task physical machines across vendor boundaries. meatspace.sh exposes idle robots and autonomous fleets as pay-per-minute API endpoints, handling cross-vendor command translation, safety sandboxing, and cryptographic proof of execution in a single call.'

const PHASES = Object.keys(PHASE_OFFSETS_MS) as DispatchPhase[]
const INTERFACES = Object.keys(COMPILE_TARGETS) as Interface[]
const OFFSETS = PHASES.map((ph) => String(PHASE_OFFSETS_MS[ph]))

/** "a, b, c or d" */
const orList = (xs: readonly string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`)
const quoted = (xs: readonly string[]) => xs.map((x) => `"${x}"`)
/** 2.5 -> "2.5", 31.25 -> "31.25", 15 -> "15" */
const num = (n: number) => String(Math.round(n * 1e6) / 1e6)
/** Keep comparison operators on the same line as their operand when wrapping. */
const glue = (s: string) => s.replace(/(<=|>=|==|<|>) /g, `$1${NBSP}`)

function seedNode(id: string): HardwareNode {
  const n = SEED_NODES.find((x) => x.id === id)
  if (!n) throw new Error(`manpage: node ${id} missing from the seed orderbook`)
  return n
}

function aerialDefault(): AerialIsrPayload {
  const pl = defaultPayload('AERIAL_ISR_SORTIE', SEED_NODES)
  if (pl.primitive !== 'AERIAL_ISR_SORTIE') throw new Error('manpage: unexpected default sortie payload')
  return pl
}

/** The console's default call: AERIAL_ISR_SORTIE on VTOL-260-TX-04, $3.40 / min x 12.5 min = $42.50. */
const SORTIE = aerialDefault()
const SORTIE_NODE = seedNode(SORTIE.node_id)
const SORTIE_PLAN = planDispatch(SORTIE, SORTIE_NODE, 0)
const SORTIE_TARGET = COMPILE_TARGETS[SORTIE_NODE.iface]
const SORTIE_ESCROW = `${formatRate(SORTIE_NODE.rateCents)} x ${num(SORTIE.est_duration_min)} min = ${formatUsd(SORTIE_PLAN.escrowCents)}`.replaceAll(' ', NBSP)

type StepEvent = Extract<DispatchEvent, { type: 'step' }>
const isStep = (e: DispatchEvent): e is StepEvent => e.type === 'step'

/** Success: the three planned steps plus ATTEST (appended by the Durable Object), then the receipt. */
const SORTIE_STEPS: readonly StepEvent[] = [
  ...SORTIE_PLAN.events.filter(isStep),
  { type: 'step', t_ms: PHASE_OFFSETS_MS.ATTEST, phase: 'ATTEST', message: attestMessage(SAMPLE_HASH), status: 'SIGNED' },
]

/** The handoff's console trace: offset, message, status (the ATTEST line is printed without one). */
function traceLines(): string[] {
  const out: string[] = []
  for (const e of SORTIE_STEPS) {
    const head = `${formatOffset(e.t_ms).padStart(5)}  ${e.message}`
    const status = e.phase === 'ATTEST' ? '' : e.status
    if (!status) out.push(head)
    else if (head.length + 1 + status.length <= BODY) out.push(`${head} ${status}`)
    else out.push(head, `${' '.repeat(7)}${status}`)
  }
  return out
}

/** `jq -c '[.t_ms, .type, .phase, .status // .code]'` over the success stream. */
const JQ_SUMMARY = [
  ...SORTIE_STEPS.map((e) => JSON.stringify([e.t_ms, e.type, e.phase, e.status])),
  JSON.stringify([PHASE_OFFSETS_MS.ATTEST, 'receipt', null, null]),
]

/** A cap just under the default sortie's escrow, which the exact spend-cap comparison rejects. */
const UNDER_CAP = num((SORTIE_PLAN.escrowCents - 0.1) / 100)

/** VALIDATE step copy when the node is unknown (no geometry check ran). */
const NOT_FOUND_STEP = planDispatch({ ...SORTIE, node_id: 'NOPE-404' }, undefined, 0).events.find(isStep)?.message ?? ''

/** A real failure from the state machine: rtl_reserve_pct below the firmware minimum. */
const LOW_RESERVE = 10
const LOW_RESERVE_PLAN = planDispatch({ ...SORTIE, constraints: { ...SORTIE.constraints, rtl_reserve_pct: LOW_RESERVE } }, SORTIE_NODE, 0)
const LOW_RESERVE_ERROR = LOW_RESERVE_PLAN.events.find((e) => e.type === 'error')

/** A real pre-stream schema error, exactly as the Worker serialises it. */
function schemaErrorExample(): ApiErrorBody {
  const r = parseDispatchPayload({ ...SORTIE, est_duration_min: MAX_DURATION_MIN + 60 })
  if (r.ok) throw new Error('manpage: schema example unexpectedly valid')
  return { error: { code: r.code, message: r.message, path: r.path } }
}

const filterLabel = (id: string) => CATEGORY_FILTERS.find((f) => f.id === id)?.label ?? id

/* ----------------------------------------------------------------------------
 * Sections
 * ------------------------------------------------------------------------- */

const SYNOPSIS: ManBlock[] = [
  code(
    [
      `curl -s ${ORIGIN}/v1/nodes`,
      `curl -s ${ORIGIN}/v1/nodes/${SORTIE.node_id}`,
      `curl -sN -X POST ${ORIGIN}/v1/dispatch \\`,
      `     -H 'content-type: application/json' -d @payload.json`,
      `websocat ${WS_ORIGIN}/v1/stream`,
      `wscat -c ${WS_ORIGIN}/v1/stream`,
    ],
    'shell',
  ),
]

const DESCRIPTION: ManBlock[] = [
  p(VALUE_PROP),
  p(
    `v0.1 is a live sandbox: the HTTP API is real and the commands on this page work from any terminal, but the hardware, settlement and attestation behind them are simulated. Every receipt carries "sandbox":${NBSP}true.`,
  ),
]

const ENDPOINTS: ManBlock[] = [
  p(
    `Base URL ${ORIGIN}. There is no authentication in v0.1. /v1 responses are JSON unless noted and never cached (cache-control: no-store); every /v1 endpoint except /v1/waitlist allows cross-origin calls (access-control-allow-origin: *) and exposes the x-meatspace-task-id and retry-after headers. A known path called with the wrong method gets 405 ERR_METHOD_NOT_ALLOWED and an allow header; an unknown /v1 path gets 404 ERR_NOT_FOUND. /docs/, /install.sh/ and /healthz/ redirect (301) to the same path without the trailing slash, keeping the query string.`,
  ),
  dl([
    item('GET /v1', p('Endpoint index: name, version, sandbox flag, docs URL and the list of endpoints.'), pre(['-> 200: { name, version, sandbox, docs, endpoints[] }'], true)),
    item('GET /v1/snapshot', p('Ticker stats and the whole live orderbook in one document.'), pre(['-> 200: NetworkSnapshot { seq, ts, stats, nodes[] }'], true)),
    item('GET /v1/nodes', p('The live hardware orderbook.'), pre(['-> 200: { nodes: HardwareNode[], ts }'], true)),
    item(
      'GET /v1/nodes/:id',
      p(`One node by NODE_ID, e.g. /v1/nodes/${SORTIE.node_id}.`),
      pre(['-> 200: HardwareNode', '-> 404: ApiErrorBody, ERR_NODE_NOT_FOUND'], true),
    ),
    item(
      'GET /v1/stats',
      p('Ticker stats: active nodes, available flight/actuation hours, 24h settled volume and network latency.'),
      pre(['-> 200: { stats: NetworkStats, ts }'], true),
    ),
    item(
      'GET /v1/stream',
      p(`WebSocket. Pushes a snapshot frame on connect and every ~${TICK_S}${NBSP}s while open; see STREAM.`),
      pre(['-> 101: text frames {"type":"snapshot","data":NetworkSnapshot}', '-> 426: ApiErrorBody, ERR_UPGRADE_REQUIRED'], true),
    ),
    item(
      'POST /v1/dispatch',
      p(
        `Task a node. The body is a primitive payload (application/json, at most ${MAX_BODY_BYTES} bytes; see PRIMITIVES). Runs VALIDATE, ESCROW, COMPILE and ATTEST; see DISPATCH LIFECYCLE and RESPONSE FORMAT.`,
      ),
      pre(['-> 200, 404, 409, 422, 429: application/x-ndjson DispatchEvents', '-> 400, 413, 429, 500: ApiErrorBody, before any stream'], true),
    ),
    item(
      'POST /v1/waitlist',
      p(
        `Join the API key or hardware operator queue. The body (application/json, at most ${WAITLIST_MAX_BYTES} bytes) has kind "api_keys" or "hardware", email, and optional handle (<= 64 chars) and detail (<= 500 chars); hardware sign-ups may add protocol (mavlink, ros2, vda5050, opcua) and fleet_size (1, 2-10, 11-50, 51-250, 250+). Requests with a foreign Origin header are refused. A valid sign-up always gets 200, repeats included.`,
      ),
      pre(['-> 200: { ok: true, kind }', '-> 400, 403, 413, 429, 500: ApiErrorBody'], true),
    ),
    item('GET /install.sh', p('Inert POSIX sh installer for meatspaced(8); see FILES.'), pre(['-> 200: text/plain'], true)),
    item(
      'GET /docs',
      p('This manual: plain text for curl and for ?format=txt, the HTML page for browsers (Accept: text/html).'),
      pre(['-> 200: text/plain or text/html'], true),
    ),
    item('GET /healthz', p('Liveness check.'), pre(['-> 200: text/plain "ok"'], true)),
  ]),
  p('NetworkSnapshot (GET /v1/snapshot, every /v1/stream frame):'),
  table([
    ['FIELD', 'TYPE', 'MEANING'],
    ['seq', 'number', 'monotonic; drop snapshots with seq <= last seen'],
    ['ts', 'number', 'server epoch ms when produced: read time for GET and the first stream frame, tick or change time for later frames'],
    ['stats', 'NetworkStats', 'ticker, below'],
    ['nodes', 'HardwareNode[]', 'orderbook, below'],
  ]),
  p('NetworkStats (the ticker):'),
  table([
    ['FIELD', 'TYPE', 'MEANING'],
    ['activeNodes', 'number', 'ACTIVE NODES'],
    ['availableHrs', 'number', 'AVAILABLE FLIGHT/ACTUATION HRS, one decimal'],
    ['settled24hCents', 'integer', '24H SETTLED VOLUME, USDC cents'],
    ['latencyMs', 'number', 'NETWORK LATENCY, ms'],
  ]),
  p('HardwareNode (one row of the orderbook):'),
  table([
    ['FIELD', 'TYPE', 'MEANING'],
    ['id', 'string', `NODE_ID, e.g. "${SORTIE_NODE.id}"`],
    ['category', 'string', orList(CATEGORY_FILTERS.filter((f) => f.id !== 'ALL').map((f) => f.id))],
    ['chassis', 'string', `e.g. "${SORTIE_NODE.chassis}"`],
    ['iface', 'string', orList(quoted(INTERFACES))],
    ['lat, lon', 'number', 'home position, signed WGS84 decimal degrees'],
    ['sector', 'string', `site label, e.g. "${SORTIE_NODE.sector}"`],
    ['sensors', 'string', `e.g. "${SORTIE_NODE.sensors}"`],
    ['power', 'string', 'BATTERY or MAINS'],
    ['charge', 'number', 'live, 0-100: BATTERY state of charge %, MAINS duty headroom %'],
    ['status', 'string', 'DOCKED, IDLE, CHARGING or TASKED'],
    ['rateCents', 'integer', 'spot rate, USDC cents per minute'],
    ['geofenceKm', 'number', 'firmware geofence radius, km'],
    ['drainPctPerMin', 'number', 'charge % used per tasked minute; 0 on MAINS'],
    ['minAglM', 'number', 'AERIAL only: firmware AGL floor, m'],
    ['envelopeMm', '[x, y, z]', 'MANIPULATOR only: work envelope, mm'],
    ['minToleranceMm', 'number', 'MANIPULATOR only: best tolerance, mm'],
    ['taskedUntil', 'number|null', 'epoch ms when the task lock releases'],
    ['taskId', 'string|null', 'task holding the lock'],
  ]),
  p(
    `Node status follows the simulated network. TASKED: a task lock is held for ${LOCK_S}${NBSP}s. When it releases, a BATTERY node goes to CHARGING, then DOCKED once nearly full; a fully charged DOCKED node now and then undocks to IDLE, and an IDLE node goes back to CHARGING before its charge drops below what its primitive's default est_duration_min and reserve need. So an IDLE or DOCKED node always passes the battery check with its default payload (see SAFETY ENVELOPES). A MAINS cell goes straight back to IDLE.`,
  ),
]

const PRIMITIVE_FIELDS: Readonly<Record<PrimitiveId, readonly (readonly string[])[]>> = {
  AERIAL_ISR_SORTIE: [
    ['geometry.type', 'string', '"Polygon"'],
    ['geometry.coordinates', 'array', `1-8 linear rings of 4-256 [lon,${NBSP}lat] positions, each closed (first == last); every vertex inside the node geofence`],
    ['constraints.agl_floor_m', 'number', '>= 0, <= 10000; >= the node minAglM'],
    ['constraints.agl_ceiling_m', 'number', `>= 0, <= 10000; <= ${AGL_CEILING_LIMIT_M}; > agl_floor_m`],
    ['constraints.rtl_reserve_pct', 'number', `>= 0, <= 100; >= ${MIN_RTL_RESERVE_PCT}`],
    ['sensors', 'string[]', '1-16 items, 1-64 chars each'],
  ],
  SUBSTATION_THERMAL_SWEEP: [
    ['site.type', 'string', '"Point"'],
    ['site.coordinates', '[lon, lat]', 'inside the node geofence'],
    ['assets', 'string[]', '1-64 items, 1-64 chars each; one inspection pose per asset'],
    ['route', 'string', '1-64 chars'],
    ['thresholds.delta_t_alarm_c', 'number', '> 0, <= 500; alarm delta, degrees C'],
    ['thresholds.emissivity', 'number', '> 0, <= 1'],
  ],
  AUTOMATED_CNC_SYNTHESIS: [
    ['site.type', 'string', '"Point"'],
    ['site.coordinates', '[lon, lat]', 'within the cell geofence'],
    ['artifact.format', 'string', '"STEP" or "GCODE"'],
    ['artifact.uri', 'string', '1-512 chars'],
    ['artifact.bbox_mm', '[x, y, z]', 'mm, each > 0, <= 10000; inside the cell work envelope'],
    ['material', 'string', '1-64 chars'],
    ['tolerance_mm', 'number', '> 0, <= 10; >= the cell minToleranceMm'],
    ['qty', 'integer', '1-10000 parts'],
  ],
}

function primitiveBlocks(id: PrimitiveId): ManBlock[] {
  const def = PRIMITIVES[id]
  const nodes = SEED_NODES.filter((n) => n.category === def.category).map((n) => n.id)
  return [
    dl([
      item(
        id,
        pre([def.summary]),
        p(
          `Intent ${def.intent}, on ${def.category} nodes (${filterLabel(def.category)}): ${nodes.join(', ')}. Default node ${def.defaultNodeId}, est_duration_min ${num(def.estDurationMin)}.`,
        ),
      ),
    ]),
    table([['FIELD', 'TYPE', 'CONSTRAINT'], ...PRIMITIVE_FIELDS[id]]),
    p(id === 'AERIAL_ISR_SORTIE' ? 'Default payload, the payload.json of SYNOPSIS:' : 'Default payload:'),
    json(defaultPayload(id, SEED_NODES)),
  ]
}

const PRIMITIVES_SECTION: ManBlock[] = [
  p(
    'A primitive binds one intent to one node category; tasking a node of another category fails VALIDATE with ERR_PRIMITIVE_UNSUPPORTED. Positions are GeoJSON [lon, lat] in WGS84 decimal degrees; units are minutes, USDC, km, metres AGL and mm. Strings must be non-empty; unknown fields are ignored and dropped.',
  ),
  p('Fields common to every primitive:'),
  table([
    ['FIELD', 'TYPE', 'CONSTRAINT'],
    ['primitive', 'string', orList(PRIMITIVE_IDS)],
    ['node_id', 'string', '^[A-Z0-9][A-Z0-9-]{1,31}$'],
    ['intent', 'string', "the primitive's intent, below"],
    ['est_duration_min', 'number', `>= ${MIN_DURATION_MIN}, <= ${MAX_DURATION_MIN}; billable minutes`],
    ['max_spend_usdc', 'number', `> 0, <= ${MAX_SPEND_USDC}; caps the escrow`],
    ['proof.attestation', 'string', '"TPM2_QUOTE"'],
    ['proof.artifacts', 'string[]', '1-16 items, 1-64 chars each'],
  ]),
  ...PRIMITIVE_IDS.flatMap(primitiveBlocks),
]

const phaseTerm = (ph: DispatchPhase) => `${formatOffset(PHASE_OFFSETS_MS[ph]).padEnd(6)}${ph}`

const LIFECYCLE: ManBlock[] = [
  p(
    `POST /v1/dispatch runs four phases against live node state. The outcome is decided atomically when the request arrives: a successful dispatch locks the node (TASKED) for ${LOCK_S}${NBSP}s for every client, and adds its escrow to the 24h settled volume, before the first event is written. Events are then released at fixed offsets from request start. Only VALIDATE and ESCROW can fail in v0.1; the first failure ends the stream.`,
  ),
  dl([
    item(
      phaseTerm('VALIDATE'),
      p(
        `The node must be registered (ERR_NODE_NOT_FOUND, 404) and of the primitive's category (ERR_PRIMITIVE_UNSUPPORTED). The payload must then fit the node's firmware envelope: geofence, altitude, RTL reserve and battery for aircraft; geofence and battery for rovers; site, work envelope and tolerance for cells. See SAFETY ENVELOPES. PASS, or FAIL and an error event. On PASS, and on a geofence or work-envelope failure, the step message is the primitive's own check (the trace below shows the sortie's); any other failure names the check that failed instead, e.g. "${NOT_FOUND_STEP}" for an unknown node.`,
      ),
    ),
    item(
      phaseTerm('ESCROW'),
      p(
        `A node that is already TASKED rejects the bid (ERR_NODE_BUSY, 409), and so does a client that already holds ${LOCK_QUOTA} active task locks (ERR_LOCK_QUOTA, 429; see RATE LIMITS). Otherwise escrow is the node's spot rate x est_duration_min, rounded to the cent, and must not exceed max_spend_usdc (ERR_SPEND_CAP). The cap is compared exactly as sent: against the default sortie's ${formatUsd(SORTIE_PLAN.escrowCents)} escrow, ${UNDER_CAP} is rejected and ${num(SORTIE_PLAN.escrowCents / 100)} accepted. ACCEPTED, or REJECTED and an error event.`,
      ),
    ),
    item(
      phaseTerm('COMPILE'),
      p("Compiles the intent into the native primitive of the node's interface (not of the payload's primitive). DISPATCHED."),
      table(
        [['INTERFACE', 'ARTIFACT'], ...INTERFACES.map((i) => [i, COMPILE_TARGETS[i].artifact])],
        DD,
      ),
      p(
        'compiled.count is AERIAL (exterior ring positions - 1) x 4 + 2: takeoff, four legs per edge, RTL. GROUND assets + 1: a pose per asset, then dock. MANIPULATOR qty x 3: roughing, finishing and a probe cycle per part.',
      ),
    ),
    item(
      phaseTerm('ATTEST'),
      p('Returns the TPM-signed telemetry stream hash (see PROOF OF PHYSICAL WORK), then the receipt event at the same offset. SIGNED.'),
    ),
  ]),
  p(`Reference trace, the default ${SORTIE.primitive} on ${SORTIE.node_id} (${SORTIE_ESCROW} escrow; the hash differs per task):`),
  code(traceLines(), 'console'),
]

const RESPONSE_FORMAT: ManBlock[] = [
  p(
    'A dispatch that reaches the state machine answers with content-type application/x-ndjson: one DispatchEvent JSON object per line, each written at its t_ms offset, and the stream closes after the last one. Success is four step events, then a receipt. Failure is the steps up to and including the failing one (status FAIL or REJECTED), then one error event. Use curl -N so each line prints as it arrives.',
  ),
  p('The HTTP status reflects the outcome even though the body streams:'),
  code([
    '200  dispatched; the stream ends with a receipt',
    '404  ERR_NODE_NOT_FOUND at VALIDATE',
    '409  ERR_NODE_BUSY at ESCROW',
    '422  any other VALIDATE or ESCROW failure',
    '429  ERR_LOCK_QUOTA at ESCROW, with a retry-after header',
  ]),
  p('A successful dispatch also returns its task id in the x-meatspace-task-id response header.'),
  dl([
    item(
      'type "step"',
      table(
        [
          ['FIELD', 'TYPE', 'MEANING'],
          ['t_ms', 'number', `${orList(OFFSETS)}, ms from request start`],
          ['phase', 'string', orList(PHASES)],
          ['message', 'string', 'the console line'],
          ['status', 'string', 'PASS, ACCEPTED, DISPATCHED or SIGNED; FAIL (VALIDATE) or REJECTED (ESCROW) on failure'],
        ],
        DD,
      ),
    ),
    item(
      'type "error"',
      table(
        [
          ['FIELD', 'TYPE', 'MEANING'],
          ['t_ms', 'number', 'offset of the failing phase'],
          ['phase', 'string', 'the failing phase, or null'],
          ['code', 'string', 'see ERRORS'],
          ['message', 'string', 'what failed, with the values involved'],
          ['http_status', 'number', 'same as the HTTP response status'],
        ],
        DD,
      ),
    ),
    item(
      'type "receipt"',
      table(
        [
          ['FIELD', 'TYPE', 'MEANING'],
          ['t_ms', 'number', String(PHASE_OFFSETS_MS.ATTEST)],
          ['receipt', 'object', 'DispatchReceipt, below'],
        ],
        DD,
      ),
    ),
  ]),
  p('DispatchReceipt:'),
  table([
    ['FIELD', 'TYPE', 'MEANING'],
    ['task_id', 'string', '"tsk_" + 16 hex digits'],
    ['status', 'string', '"DISPATCHED"'],
    ['primitive', 'string', "the payload's primitive"],
    ['node_id', 'string', 'the tasked node'],
    ['interface', 'string', `node interface, e.g. "${SORTIE_NODE.iface}"`],
    ['escrow_usdc', 'string', `2 dp decimal, e.g. "${centsToDecimal(SORTIE_PLAN.escrowCents)}"`],
    ['rate_usdc_per_min', 'string', `2 dp decimal, e.g. "${centsToDecimal(SORTIE_NODE.rateCents)}"`],
    ['est_duration_min', 'number', 'from the payload'],
    ['compiled.target', 'string', 'node interface'],
    ['compiled.artifact', 'string', `COMPILE artifact, e.g. "${SORTIE_TARGET.artifact}"`],
    ['compiled.count', 'number', `compiled primitives, e.g. ${SORTIE_PLAN.compiled?.count ?? 0}`],
    ['telemetry_stream_hash', 'string', '"0x" + 64 lowercase hex digits (SHA-256)'],
    ['attestation', 'string', '"TPM2_QUOTE"'],
    ['issued_at', 'string', 'ISO-8601 UTC'],
    ['sandbox', 'boolean', 'true: v0.1 is simulated'],
  ]),
  p('The default sortie (payload.json of SYNOPSIS), one line per event:'),
  code([
    `$ curl -sN -X POST ${ORIGIN}/v1/dispatch \\`,
    `    -H 'content-type: application/json' -d @payload.json \\`,
    `    | jq -c '[.t_ms, .type, .phase, .status // .code]'`,
    ...JQ_SUMMARY,
  ]),
  p(
    `With constraints.rtl_reserve_pct set to ${LOW_RESERVE} the same call gets HTTP ${LOW_RESERVE_PLAN.httpStatus}: the VALIDATE step with status FAIL, then this error event (pretty-printed here; one line on the wire):`,
  ),
  json(LOW_RESERVE_ERROR),
  p(
    `Requests rejected before the state machine runs get a plain JSON ApiErrorBody (content-type application/json), not NDJSON: 400${NBSP}ERR_INVALID_JSON, 400${NBSP}ERR_SCHEMA (error.path names the field), 413${NBSP}ERR_PAYLOAD_TOO_LARGE (body over ${MAX_BODY_BYTES} bytes), 429${NBSP}ERR_RATE_LIMITED and 500${NBSP}ERR_INTERNAL. For est_duration_min ${MAX_DURATION_MIN + 60}:`,
  ),
  json(schemaErrorExample()),
]

const ERROR_DOCS: Readonly<Record<ErrorCode, { http: number; phase: DispatchPhase | '-'; meaning: string }>> = {
  ERR_INVALID_JSON: { http: 400, phase: '-', meaning: 'body is not valid JSON' },
  ERR_SCHEMA: { http: 400, phase: '-', meaning: 'fails schema; see error.path' },
  ERR_PAYLOAD_TOO_LARGE: { http: 413, phase: '-', meaning: `body too large (dispatch: ${MAX_BODY_BYTES} bytes, waitlist: ${WAITLIST_MAX_BYTES} bytes)` },
  ERR_RATE_LIMITED: { http: 429, phase: '-', meaning: `per-client limit; retry-after${NBSP}${RETRY_AFTER_S}` },
  ERR_NOT_FOUND: { http: 404, phase: '-', meaning: 'no such /v1 endpoint' },
  ERR_METHOD_NOT_ALLOWED: { http: 405, phase: '-', meaning: 'wrong method for the path; see the allow header' },
  ERR_FORBIDDEN: { http: 403, phase: '-', meaning: 'cross-origin waitlist sign-up' },
  ERR_UPGRADE_REQUIRED: { http: 426, phase: '-', meaning: '/v1/stream without an Upgrade' },
  ERR_NODE_NOT_FOUND: { http: 404, phase: 'VALIDATE', meaning: 'unknown node_id (also GET /v1/nodes/:id)' },
  ERR_PRIMITIVE_UNSUPPORTED: { http: 422, phase: 'VALIDATE', meaning: 'node of the wrong category' },
  ERR_GEOFENCE: { http: 422, phase: 'VALIDATE', meaning: 'outside the node geofence' },
  ERR_ALTITUDE_ENVELOPE: {
    http: 422,
    phase: 'VALIDATE',
    meaning: `agl_floor_m < node minAglM, agl_ceiling_m > ${AGL_CEILING_LIMIT_M} m, or ceiling <= floor`,
  },
  ERR_RTL_RESERVE: { http: 422, phase: 'VALIDATE', meaning: `rtl_reserve_pct below ${MIN_RTL_RESERVE_PCT}` },
  ERR_INSUFFICIENT_CHARGE: { http: 422, phase: 'VALIDATE', meaning: 'charge < est. draw + reserve' },
  ERR_WORK_ENVELOPE: { http: 422, phase: 'VALIDATE', meaning: 'bbox_mm exceeds cell envelope' },
  ERR_TOLERANCE: { http: 422, phase: 'VALIDATE', meaning: 'tolerance_mm < cell minimum' },
  ERR_SITE_MISMATCH: { http: 422, phase: 'VALIDATE', meaning: 'CNC site is not at the cell' },
  ERR_NODE_BUSY: { http: 409, phase: 'ESCROW', meaning: 'node is TASKED (locked)' },
  ERR_LOCK_QUOTA: { http: 429, phase: 'ESCROW', meaning: `client holds ${LOCK_QUOTA} task locks` },
  ERR_SPEND_CAP: { http: 422, phase: 'ESCROW', meaning: 'escrow exceeds max_spend_usdc' },
  ERR_INTERNAL: { http: 500, phase: '-', meaning: 'unexpected server error' },
}

const ERRORS: ManBlock[] = [
  p(
    'Every error has a stable code. Codes with a phase arrive as the error event of a dispatch stream, whose HTTP status matches; the rest are ApiErrorBody JSON responses, { error: { code, message, path? } }.',
  ),
  table([['CODE', 'HTTP', 'PHASE', 'MEANING'], ...Object.entries(ERROR_DOCS).map(([c, d]) => [c, String(d.http), d.phase, d.meaning])]),
]

/** Worked battery check for the default sortie, using the same formula as planDispatch. */
function batteryExample(): string {
  const draw = SORTIE_NODE.drainPctPerMin * SORTIE.est_duration_min
  const reserve = SORTIE.constraints.rtl_reserve_pct
  return `${SORTIE_NODE.id}, default sortie: ${num(SORTIE_NODE.drainPctPerMin)} x ${num(SORTIE.est_duration_min)} + ${num(reserve)} = ${num(draw + reserve)}% required. The node starts ${SORTIE_NODE.status} at ${num(SORTIE_NODE.charge)}%, and an IDLE or DOCKED node never holds less than its default payload needs (see Node status under ENDPOINTS).`
}

const dash = (v: string | undefined) => v ?? '-'

const SAFETY: ManBlock[] = [
  p(
    "meatspaced(8) is designed to enforce each node's firmware envelope at the edge, before motor spin-up. Until it ships, the clearinghouse enforces the same envelopes at VALIDATE, against each node's limits (below) and its live, simulated charge.",
  ),
  dl([
    item(
      'Geofence',
      p(
        "Great-circle distance from the node's home position must not exceed its geofenceKm. AERIAL_ISR_SORTIE checks every polygon vertex and SUBSTATION_THERMAL_SWEEP checks site; both fail with ERR_GEOFENCE. AUTOMATED_CNC_SYNTHESIS checks site against the cell and fails with ERR_SITE_MISMATCH.",
      ),
    ),
    item(
      'AGL floor and ceiling',
      p(
        `AERIAL only. agl_floor_m must be at least the node's minAglM, agl_ceiling_m at most ${AGL_CEILING_LIMIT_M} m, and the ceiling above the floor; otherwise ERR_ALTITUDE_ENVELOPE.`,
      ),
    ),
    item('RTL reserve', p(`AERIAL only. rtl_reserve_pct must be at least ${MIN_RTL_RESERVE_PCT}; otherwise ERR_RTL_RESERVE.`)),
    item('Ground reserve', p(`GROUND only. Rovers keep a fixed ${GROUND_RESERVE_PCT}% return-to-dock reserve.`)),
    item(
      'Battery draw',
      p(
        `BATTERY nodes only; MAINS cells skip it. The task needs drainPctPerMin x est_duration_min of charge on top of the reserve (rtl_reserve_pct for AERIAL, ${GROUND_RESERVE_PCT} for GROUND). Live charge below that sum fails with ERR_INSUFFICIENT_CHARGE.`,
      ),
      p(batteryExample()),
    ),
    item('Work envelope', p("MANIPULATOR only. Each axis of artifact.bbox_mm (x, y, z) must fit the cell's envelopeMm; otherwise ERR_WORK_ENVELOPE.")),
    item('Tolerance', p("MANIPULATOR only. tolerance_mm must not be tighter (smaller) than the cell's minToleranceMm; otherwise ERR_TOLERANCE.")),
  ]),
  p('Node limits. These are static; charge and status are live, read them from GET /v1/nodes:'),
  table([
    ['NODE_ID', 'GEOFENCE', 'MIN_AGL', 'DRAW', 'ENVELOPE_MM', 'TOL_MM'],
    ...SEED_NODES.map((n) => [
      n.id,
      `${n.geofenceKm.toFixed(1)} km`,
      n.minAglM === undefined ? '-' : `${n.minAglM} m`,
      n.power === 'BATTERY' ? `${n.drainPctPerMin.toFixed(1)} %/min` : 'mains',
      dash(n.envelopeMm?.join('x')),
      dash(n.minToleranceMm === undefined ? undefined : num(n.minToleranceMm)),
    ]),
  ]),
]

const PROOF: ManBlock[] = [
  p(
    'Design goal: hardware TPM cryptographic signatures attached to raw MCAP/ROS bags, RTK-GPS flight logs, and sensor frames to guarantee zero synthetic spoofing.',
  ),
  p(
    'Each payload declares its proof: proof.attestation is "TPM2_QUOTE", a TPM 2.0 quote signed by the node, and proof.artifacts names the evidence the node attaches to the run. The console defaults:',
  ),
  table([['PRIMITIVE', 'ARTIFACTS'], ...PRIMITIVE_IDS.map((id) => [id, defaultPayload(id, SEED_NODES).proof.artifacts.join(', ')])]),
  p(
    `At ATTEST the receipt carries telemetry_stream_hash: "0x" + the lowercase hex SHA-256 of the UTF-8 canonical JSON of the object {issued_at, node_id, payload, task_id}. issued_at, node_id and task_id are the receipt's; payload is the request body after validation, so unknown fields are dropped. Canonical JSON sorts object keys at every level, keeps array order, has no whitespace and writes strings and numbers as JSON.stringify does (RFC 8785). The ATTEST step prints the hash shortened, e.g. ${SAMPLE_HASH}, and receipt.attestation is "TPM2_QUOTE".`,
  ),
  p(
    `v0.1 sandbox: no hardware runs, so there is no telemetry stream, TPM quote or artifact yet. The hash is computed by the clearinghouse over the request alone and every receipt carries "sandbox":${NBSP}true; treat it as a task fingerprint, not as proof of work.`,
  ),
]

const RATE_LIMITS: ManBlock[] = [
  table([
    ['ENDPOINT', 'LIMIT'],
    ['POST /v1/dispatch', `${DISPATCH_LIMIT} requests per minute per client`],
    ['POST /v1/waitlist', `${String(WAITLIST_LIMIT).padStart(String(DISPATCH_LIMIT).length, NBSP)} requests per minute per client`],
  ]),
  p(
    `A client is an IPv4 address or an IPv6 /64: every address in one /64 shares its limits. Every request counts, valid or not. Over the limit a request is refused before its body is read: HTTP 429, ERR_RATE_LIMITED and a retry-after:${NBSP}${RETRY_AFTER_S} header. Counting is approximate.`,
  ),
  p(
    `A client may also hold at most ${LOCK_QUOTA} task locks at once. A dispatch beyond that is rejected at ESCROW: HTTP 429 with an NDJSON stream ending in ERR_LOCK_QUOTA, and a retry-after header with the seconds until the client's earliest lock releases.`,
  ),
]

const STREAM: ManBlock[] = [
  p(
    `GET /v1/stream upgrades to a WebSocket. The server sends a snapshot text frame on connect, then every ~${TICK_S}${NBSP}s while the socket is open, and at once after any state change (a dispatch, a task lock releasing):`,
  ),
  code(['{"type":"snapshot","data":{"seq":N,"ts":N,"stats":{...},"nodes":[...]}}']),
  p(
    'Each frame is a full NetworkSnapshot, not a diff. seq is monotonic, across server restarts too: drop any frame whose seq is not greater than the last one applied. ts is when the server produced the frame: the connect time for the first frame, the tick or state-change time for the rest. Send the text frame "ping" (exactly, no newline) and the server answers "pong"; other client frames are ignored. A request without Upgrade: websocket gets 426 ERR_UPGRADE_REQUIRED.',
  ),
  code([`$ websocat ${WS_ORIGIN}/v1/stream | jq -c '.data.stats'`]),
]

const FILES: ManBlock[] = [
  dl([
    item(
      '/install.sh',
      p(
        'Inert POSIX sh installer for meatspaced(8), the edge daemon that will register ROS 2 / MAVLink hardware with the clearinghouse. It takes --protocol=mavlink|ros2|vda5050|opcua and --rtk-verify, prints what it detected and the plan it would run, and exits 0 (2 on an unknown option or protocol). It writes nothing, downloads nothing and starts nothing: meatspaced is not released yet.',
      ),
    ),
  ]),
  code([
    `$ curl -sSL ${ORIGIN}/install.sh | sh -s -- --help`,
    '# Register idle ROS 2 / MAVLink hardware node to the clearinghouse',
    `$ curl -sSL ${ORIGIN}/install.sh \\`,
    '    | sudo sh -s -- --protocol=mavlink --rtk-verify',
  ]),
]

const BUGS: ManBlock[] = [
  p(
    `${MAN_VERSION}: everything physical is simulated. No machine moves, no USDC settles, the ticker is synthetic, and telemetry hashes and attestations come from the clearinghouse instead of node hardware.`,
  ),
  p(
    `There are no API keys yet: every endpoint is anonymous and limited per client network only (an IPv4 address or an IPv6 /64), so clients behind one NAT or in one /64 share rate limits and a lock quota. Request a key with [${NBSP}API${NBSP}KEYS${NBSP}] at ${ORIGIN}/#api-keys or POST /v1/waitlist with kind "api_keys".`,
  ),
]

const SEE_ALSO: ManBlock[] = [pre(['meatspaced(8), curl(1), jq(1), websocat(1)', REPO])]

const PAGE: readonly { title: string; blocks: readonly ManBlock[] }[] = [
  { title: 'NAME', blocks: [pre(['meatspace - dispatch tasks to physical hardware'])] },
  { title: 'SYNOPSIS', blocks: SYNOPSIS },
  { title: 'DESCRIPTION', blocks: DESCRIPTION },
  { title: 'ENDPOINTS', blocks: ENDPOINTS },
  { title: 'PRIMITIVES', blocks: PRIMITIVES_SECTION },
  { title: 'DISPATCH LIFECYCLE', blocks: LIFECYCLE },
  { title: 'RESPONSE FORMAT', blocks: RESPONSE_FORMAT },
  { title: 'ERRORS', blocks: ERRORS },
  { title: 'SAFETY ENVELOPES', blocks: SAFETY },
  { title: 'PROOF OF PHYSICAL WORK', blocks: PROOF },
  { title: 'RATE LIMITS', blocks: RATE_LIMITS },
  { title: 'STREAM', blocks: STREAM },
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

/** "SAFETY ENVELOPES" -> "safety-envelopes" (the /docs#anchor). */
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
