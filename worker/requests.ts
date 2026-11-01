import { parseRequestBody, REQUEST_ID_PREFIX, REQUEST_MAX_BYTES, REQUEST_STATUS, statusOf, type ParsedRequest, type RequestKind, type RequestReceipt } from '../shared/api'
import { sha256Hex } from './crypto'
import { ApiError, type AppContext, rateLimit, readJson } from './http'

/** A repeat (same id) keeps one row and takes the latest answers, so a corrected budget or robot list is not dropped. */
const INSERT_SQL = `INSERT INTO requests (id, kind, email, dataset, payload, source, country)
VALUES (?, ?, ?, ?, ?, ?, ?)
ON CONFLICT (id) DO UPDATE SET
  payload = excluded.payload,
  source = excluded.source,
  country = excluded.country,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`

const MESSAGES: Readonly<Record<RequestKind, string>> = {
  gap_report:
    'Queued. A person runs the same pipeline as the published reports, by hand, and emails the result. Units are checked when the data is downloaded; if the data cannot confirm them, the report says so and stops.',
  pilot: 'On the pilot waitlist. No real cell exists yet and nothing was charged. We will email you to talk scope.',
  own_robot: 'Noted. Software for evaluating on robots you own is planned, not built. We will email you to set up a call.',
}

/** Same kind + email (+ dataset for a gap report) -> same id, so a repeat is one row (with the latest answers) and gets the same receipt. */
export async function requestId(r: Pick<ParsedRequest, 'kind' | 'email' | 'dataset'>): Promise<string> {
  const key = [r.kind, r.email, r.dataset?.toLowerCase() ?? ''].join('\n')
  return `${REQUEST_ID_PREFIX[r.kind]}${(await sha256Hex(key)).slice(0, 16)}`
}

/**
 * POST /v1/requests. Same-origin or no Origin (curl), rate-limited per client, 4 KiB cap, honeypot. Always answers
 * 202 for valid input, repeats included, so it never reveals whether an email is already on file.
 */
export async function handleRequest(c: AppContext): Promise<Response> {
  await rateLimit(c.env.WAITLIST_LIMITER, c.req.raw)
  const origin = c.req.header('origin')
  if (origin !== undefined && origin !== new URL(c.req.url).origin) {
    throw new ApiError(403, 'ERR_FORBIDDEN', 'cross-origin requests are not accepted; post from this site or without an Origin header (curl)')
  }
  const parsed = parseRequestBody(await readJson(c.req.raw, REQUEST_MAX_BYTES))
  if (!parsed.ok) throw new ApiError(400, 'ERR_SCHEMA', `${parsed.path}: ${parsed.message}`, { path: parsed.path })
  const r = parsed.request
  const id = await requestId(r)
  if (!r.bot) {
    try {
      await c.env.DB.prepare(INSERT_SQL).bind(id, r.kind, r.email, r.dataset, JSON.stringify(r.fields), r.source, country(c.req.raw)).run()
    } catch (err) {
      console.error('request insert failed', err)
      throw new ApiError(500, 'ERR_INTERNAL', 'could not record the request; try again later')
    }
  }
  const receipt: RequestReceipt = {
    ok: true,
    request_id: id,
    kind: r.kind,
    status: statusOf(REQUEST_STATUS[r.kind]),
    ...(r.kind === 'gap_report' ? { run: 'manual' as const } : {}),
    charged: false,
    message: MESSAGES[r.kind],
  }
  return c.json(receipt, 202)
}

function country(req: Request): string | null {
  const cf = req.cf as IncomingRequestCfProperties | undefined
  return typeof cf?.country === 'string' ? cf.country : null
}
