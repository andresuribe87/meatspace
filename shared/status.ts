/**
 * Status is grammar (design system rule 5). The single source of truth for every lamp the site shows:
 * the UI annunciators (src/ds Lamp), the `status` fields in /v1 responses and the STATUS section of
 * the MEATSPACE(1) man page all read from here. New states are added here or nowhere.
 *
 * Plain data only: no DOM, no React, no Workers runtime types (this file is compiled by the SPA,
 * the Worker and the tests).
 *
 * Word discipline: LIVE means it works at that URL today. Nothing is LIVE until it does.
 */

/* ------------------------------------------------------------------------------------------------
 * Capability lifecycle (availability). Every capability wears exactly one of these.
 * ---------------------------------------------------------------------------------------------- */

export const CAPABILITY_STATUSES = ['LIVE', 'PREVIEW', 'PLANNED', 'WAITLIST', 'ON REQUEST', 'CONCEPT', 'REFUSED'] as const

/** Display word of a capability status, upper case as printed on a lamp. */
export type CapabilityStatus = (typeof CAPABILITY_STATUSES)[number]

/** Wire form of a capability status in /v1 JSON (`"status": "on_request"`). Lower snake case, ASCII. */
export type ApiStatus = 'live' | 'preview' | 'planned' | 'waitlist' | 'on_request' | 'concept' | 'refused'

/**
 * Lamp kinds: the visual treatments the annunciator knows. A kind is a shape + colour pair; the word
 * printed next to it is always real text, so no state is ever carried by colour alone.
 */
export const LAMP_KINDS = [
  'live',
  'preview',
  'planned',
  'waitlist',
  'onreq',
  'concept',
  'refused',
  'pass',
  'gap',
  'fault',
  'uncal',
  'armed',
  'sim',
  'real',
] as const
export type LampKind = (typeof LAMP_KINDS)[number]

/** Lamp shapes, drawn in CSS (never glyphs), named for documentation and the man page. */
export type LampShape = 'solid' | 'half' | 'hollow' | 'ring' | 'diamond' | 'cross' | 'triangle' | 'dashed' | 'blink'

/** Semantic tone. Maps to tokens: ok = emerald, warn = amber, text = fg, muted = muted. */
export type LampTone = 'ok' | 'warn' | 'text' | 'muted'

export interface LampDef {
  kind: LampKind
  shape: LampShape
  tone: LampTone
  /** Filled lamps invert: the word is carbon on a signal fill (PASS, FAULT, REFUSED). */
  filled: boolean
  /** Dashed border: not measured (UNCAL), or a verdict computed from unmeasured inputs. */
  dashed: boolean
}

export const LAMPS: Record<LampKind, LampDef> = {
  live: { kind: 'live', shape: 'solid', tone: 'ok', filled: false, dashed: false },
  preview: { kind: 'preview', shape: 'half', tone: 'text', filled: false, dashed: false },
  planned: { kind: 'planned', shape: 'hollow', tone: 'muted', filled: false, dashed: false },
  waitlist: { kind: 'waitlist', shape: 'ring', tone: 'muted', filled: false, dashed: false },
  onreq: { kind: 'onreq', shape: 'hollow', tone: 'muted', filled: false, dashed: false },
  concept: { kind: 'concept', shape: 'diamond', tone: 'warn', filled: false, dashed: false },
  refused: { kind: 'refused', shape: 'cross', tone: 'warn', filled: true, dashed: false },
  pass: { kind: 'pass', shape: 'solid', tone: 'ok', filled: true, dashed: false },
  gap: { kind: 'gap', shape: 'triangle', tone: 'warn', filled: false, dashed: false },
  fault: { kind: 'fault', shape: 'cross', tone: 'warn', filled: true, dashed: false },
  uncal: { kind: 'uncal', shape: 'dashed', tone: 'warn', filled: false, dashed: true },
  armed: { kind: 'armed', shape: 'blink', tone: 'ok', filled: false, dashed: false },
  sim: { kind: 'sim', shape: 'hollow', tone: 'muted', filled: false, dashed: false },
  real: { kind: 'real', shape: 'solid', tone: 'text', filled: false, dashed: false },
}

export interface CapabilityStatusDef {
  status: CapabilityStatus
  api: ApiStatus
  kind: LampKind
  /** One plain sentence: what the word promises. Used by the man page and the design reference. */
  meaning: string
}

export const CAPABILITY_STATUS: Record<CapabilityStatus, CapabilityStatusDef> = {
  LIVE: { status: 'LIVE', api: 'live', kind: 'live', meaning: 'Works at that URL today.' },
  PREVIEW: {
    status: 'PREVIEW',
    api: 'preview',
    kind: 'preview',
    meaning: 'Real output you can read, published before its version 1. The format may still change.',
  },
  PLANNED: { status: 'PLANNED', api: 'planned', kind: 'planned', meaning: 'Not built. Written in the future or conditional tense.' },
  WAITLIST: {
    status: 'WAITLIST',
    api: 'waitlist',
    kind: 'waitlist',
    meaning: 'Not built. Requests decide whether and when it is.',
  },
  'ON REQUEST': {
    status: 'ON REQUEST',
    api: 'on_request',
    kind: 'onreq',
    meaning: 'Done by a person when asked. Not self-serve.',
  },
  CONCEPT: {
    status: 'CONCEPT',
    api: 'concept',
    kind: 'concept',
    meaning: 'A simulation of an idea. No hardware, no machines, no money. Lives under /concept only.',
  },
  REFUSED: {
    status: 'REFUSED',
    api: 'refused',
    kind: 'refused',
    meaning: 'Looked at and declined, with the reason printed next to it.',
  },
}

/* ------------------------------------------------------------------------------------------------
 * Verdicts, data state and run state. Words outside this vocabulary are not allowed on a lamp.
 * ---------------------------------------------------------------------------------------------- */

/** Verdict words and their lamp kinds. A verdict computed from UNCAL inputs renders dashed and unlit. */
export const VERDICTS = {
  PASS: 'pass',
  'WITHIN TOL': 'pass',
  MET: 'pass',
  GO: 'live',
  MARGINAL: 'gap',
  'OUT OF TOL': 'gap',
  GAP: 'gap',
  CAUTION: 'gap',
  'BELOW BAR': 'gap',
  FAULT: 'fault',
  SCOPE: 'sim',
  ISSUED: 'real',
} as const satisfies Record<string, LampKind>
export type Verdict = keyof typeof VERDICTS

/** Data and run states. UNCAL = not measured (a placeholder). ARMED blinks, and stops under reduced motion. */
export const STATES = {
  UNCAL: 'uncal',
  ARMED: 'armed',
  SIM: 'sim',
  REAL: 'real',
} as const satisfies Record<string, LampKind>
export type RunState = keyof typeof STATES

/** Every word a lamp may print. */
export type LampWord = CapabilityStatus | Verdict | RunState

/** Lamp kind for any vocabulary word. */
export function lampKindOf(word: LampWord): LampKind {
  if (word in CAPABILITY_STATUS) return CAPABILITY_STATUS[word as CapabilityStatus].kind
  if (word in VERDICTS) return VERDICTS[word as Verdict]
  return STATES[word as RunState]
}

export function isCapabilityStatus(v: unknown): v is CapabilityStatus {
  return typeof v === 'string' && (CAPABILITY_STATUSES as readonly string[]).includes(v)
}

/** Wire form for /v1 JSON. */
export function apiStatus(status: CapabilityStatus): ApiStatus {
  return CAPABILITY_STATUS[status].api
}

/** Parse a wire status back (e.g. from report.json); null when it is not in the vocabulary. */
export function fromApiStatus(api: string): CapabilityStatus | null {
  for (const s of CAPABILITY_STATUSES) if (CAPABILITY_STATUS[s].api === api) return s
  return null
}

/* ------------------------------------------------------------------------------------------------
 * Capability ledger (C-14). Part numbers label the signal-chain steps too.
 * Changing a status is a one-line edit here; the UI, /v1 (`GET /v1` endpoint statuses, `/v1/cells` lanes) and the
 * STATUS section of the man page follow. v0.2 status truth:
 *   Twin Gap Reports            LIVE        published at launch, JSON at /v1/reports
 *   calibrated twin packages    LIVE        downloadable at /v1/reports/:id/twin
 *   gap report on your dataset  ON REQUEST  intake is live (POST /v1/requests); a person runs it by hand
 *   hosted twin trials          PLANNED     POST /v1/trials answers 501
 *   real SO-101 cell            WAITLIST    nothing purchased; gated on $3k committed
 *   MCP server                  PLANNED
 *   v0.1 industrial dispatch    CONCEPT     simulated, /concept and /v1/concept only
 * ---------------------------------------------------------------------------------------------- */

export interface Capability {
  /** Part number, e.g. "MS-TGR-1". */
  part: string
  name: string
  status: CapabilityStatus
  /** One muted scope line: what it covers and, where it matters, what it is not. */
  scope: string
}

export const CAPABILITIES = [
  {
    part: 'MS-TGR-1',
    name: 'Twin Gap Reports',
    status: 'LIVE',
    scope: 'public LeRobot SO-100 / SO-101 data · open-loop joint replay · held-out RMSE with 95% intervals',
  },
  {
    part: 'MS-TWIN-PKG',
    name: 'Calibrated twin packages',
    status: 'LIVE',
    scope: 'calibrated_twin.json per report · models the unit that recorded the data, not the robot model',
  },
  {
    part: 'MS-TGR-REQ',
    name: 'Gap report on your dataset',
    status: 'ON REQUEST',
    scope: 'intake is live · a person runs the same pipeline by hand · LeRobot SO-100 / SO-101 data',
  },
  {
    part: 'MS-TT-SIM',
    name: 'Hosted twin trials',
    status: 'PLANNED',
    scope: 'mode "sim" · Wilson interval · spend cap · POST /v1/trials answers 501',
  },
  {
    part: 'MS-RV-SO101',
    name: 'Real verification',
    status: 'WAITLIST',
    scope: 'physical SO-101 cell · not built, nothing purchased · gated on $3k committed',
  },
  {
    part: 'MS-MCP',
    name: 'MCP server for agents',
    status: 'PLANNED',
    scope: 'reports as tools · caps an agent cannot raise',
  },
  {
    part: 'MS-CONCEPT',
    name: 'v0.1 industrial dispatch',
    status: 'CONCEPT',
    scope: 'simulated end to end · no hardware, no money · /concept and /v1/concept only',
  },
] as const satisfies readonly Capability[]

export type CapabilityPart = (typeof CAPABILITIES)[number]['part']

export function capability(part: CapabilityPart): Capability {
  return CAPABILITIES.find((c) => c.part === part)!
}
