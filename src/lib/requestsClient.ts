/**
 * POST /v1/requests client for the three request dialogs (src/pages/RequestDialogs.tsx):
 * a Twin Gap Report on your dataset, a real-robot pilot (waitlist) and evaluation on robots you own.
 *
 * Wire contract (application/json, one endpoint, discriminated by `kind`):
 *   { kind: 'gap_report', email, dataset, robot, notes?, website }
 *   { kind: 'pilot', email, robot, simulator, policy_format, checkpoint_ready, deadline?, budget, notes?, website }
 *   { kind: 'own_robot', email, robot, robot_count, eval_cost, notes?, website }
 * `website` is the honeypot: always sent, empty for people. A valid request answers 202
 * `{ ok: true, request_id, status }`; errors use the shared ApiErrorBody (`$.field` paths on ERR_SCHEMA).
 *
 * Never throws: every outcome (network failure, timeout, non-JSON gateway error, ApiErrorBody) is folded into a result.
 */
import type { ApiErrorBody } from '../../shared/types'

export const REQUESTS_ENDPOINT = '/v1/requests'

export type RequestKind = 'gap_report' | 'pilot' | 'own_robot'

interface Common {
  email: string
  notes?: string
  /** Honeypot. Hidden from people; anything typed here marks the request as automated. */
  website: string
}

export interface GapReportRequest extends Common {
  kind: 'gap_report'
  /** Hugging Face Hub dataset id, `owner/name`. */
  dataset: string
  robot: string
}

export interface PilotRequest extends Common {
  kind: 'pilot'
  robot: string
  simulator: string
  policy_format: string
  checkpoint_ready: string
  /** YYYY-MM-DD, when there is one. */
  deadline?: string
  budget: string
}

export interface OwnRobotRequest extends Common {
  kind: 'own_robot'
  robot: string
  /** How many robots, as a range ("1", "2-5", ...). */
  robot_count: string
  /** What an evaluation costs today, in people-time or money, free text. */
  eval_cost: string
}

export type RequestBody = GapReportRequest | PilotRequest | OwnRobotRequest

export type RequestResult =
  | { ok: true; requestId: string | null; status: string | null }
  | {
      ok: false
      code: string
      message: string
      /** HTTP status; 0 when the server was not reached. */
      status: number
      /** `$.field` of a schema error, when the server names one. */
      path?: string
      /** Seconds to wait after a 429. */
      retryAfterS?: number
    }

const TIMEOUT_MS = 10_000
const DEFAULT_RETRY_S = 60

/** Allowed shape of an `owner/name` Hub dataset id (Hub repo-name rules, no revision). */
export const DATASET_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,95}\/[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/

/** Light email check; the server has the final word. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function apiError(body: unknown): ApiErrorBody['error'] | null {
  if (typeof body !== 'object' || body === null || !('error' in body)) return null
  const err = (body as { error: unknown }).error
  if (typeof err !== 'object' || err === null) return null
  const { code, message, path } = err as Record<string, unknown>
  if (typeof code !== 'string' || typeof message !== 'string') return null
  return { code: code as ApiErrorBody['error']['code'], message, ...(typeof path === 'string' ? { path } : {}) }
}

function retryAfterSeconds(res: Response): number {
  const n = Number(res.headers.get('retry-after'))
  return Number.isFinite(n) && n > 0 ? Math.ceil(n) : DEFAULT_RETRY_S
}

/** Trim strings and drop empty optional fields, so the body carries only what was answered. The honeypot is kept as sent. */
export function cleanBody<T extends RequestBody>(body: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (k === 'website') {
      out[k] = typeof v === 'string' ? v : ''
      continue
    }
    if (typeof v === 'string') {
      const t = k === 'email' ? v.trim().toLowerCase() : v.trim()
      if (t) out[k] = t
    } else if (v !== undefined) out[k] = v
  }
  return out as T
}

export async function submitRequest(body: RequestBody, opts: { fetch?: typeof fetch; signal?: AbortSignal } = {}): Promise<RequestResult> {
  const f = opts.fetch ?? fetch
  let res: Response
  try {
    res = await f(REQUESTS_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(cleanBody(body)),
      signal: opts.signal ?? AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (e) {
    // Network failure or the 10 s timeout: the busy key always resolves here, never spins on.
    const timedOut = e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError')
    return {
      ok: false,
      code: 'ERR_UNREACHABLE',
      message: timedOut ? 'meatspace.sh did not answer within 10 s. It may not have been stored.' : 'Could not reach meatspace.sh. Nothing was sent.',
      status: 0,
    }
  }

  const json: unknown = await res.json().catch(() => null)

  if (res.status === 429) {
    const s = retryAfterSeconds(res)
    return { ok: false, code: 'ERR_RATE_LIMITED', message: `Too many requests from this network. Try again in ${s} s.`, status: 429, retryAfterS: s }
  }
  if (res.ok) {
    const o = typeof json === 'object' && json !== null ? (json as Record<string, unknown>) : null
    if (o && o.ok === true) {
      return {
        ok: true,
        requestId: typeof o.request_id === 'string' ? o.request_id : null,
        status: typeof o.status === 'string' ? o.status : null,
      }
    }
    return { ok: false, code: 'ERR_BAD_RESPONSE', message: `/v1/requests answered HTTP ${res.status} without a receipt. It may not have been stored.`, status: res.status }
  }

  // Planned or switched-off intake answers 501 (ERR_NOT_BUILT), with or without a JSON body.
  if (res.status === 501) {
    return { ok: false, code: 'ERR_NOT_BUILT', message: 'Request intake is not switched on at this URL yet. Nothing was stored.', status: 501 }
  }
  // A gateway or proxy page instead of the API's JSON: say so, never pretend it was stored.
  if (json === null) {
    return { ok: false, code: 'ERR_BAD_RESPONSE', message: `/v1/requests answered HTTP ${res.status} without JSON. Nothing was stored.`, status: res.status }
  }

  const err = apiError(json)
  if (err) {
    // Schema messages may already start with their JSON path ("$.email: ..."); add it only when missing.
    const message = err.path && !err.message.startsWith(err.path) ? `${err.path}: ${err.message}` : err.message
    return { ok: false, code: err.code, message, status: res.status, ...(err.path ? { path: err.path } : {}) }
  }
  if (res.status === 404 || res.status === 405) {
    return { ok: false, code: 'ERR_NOT_FOUND', message: `/v1/requests answered HTTP ${res.status}. Nothing was stored.`, status: res.status }
  }
  return { ok: false, code: 'ERR_INTERNAL', message: `/v1/requests answered HTTP ${res.status}.`, status: res.status }
}

/** The same request as one curl command (ASCII, single-quoted body), for the dialogs' terminal block. */
export function requestCurl(body: RequestBody, origin = 'https://meatspace.sh'): string {
  const b = { ...cleanBody(body) } as Partial<RequestBody>
  delete b.website
  const json = JSON.stringify(b).replace(/'/g, `'\\''`)
  return `curl -s -X POST ${origin}${REQUESTS_ENDPOINT} \\\n    -H 'content-type: application/json' \\\n    -d '${json}'`
}
