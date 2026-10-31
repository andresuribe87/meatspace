/**
 * POST /v1/waitlist client for the [ API KEYS ] and [ CONNECT HARDWARE (meatspaced) ] panels.
 * Never throws: every outcome (network failure, non-JSON gateway error, ApiErrorBody) is folded into a result.
 */
import type { ApiErrorBody, WaitlistRequest } from '../../shared/types'

export type WaitlistResult = { ok: true } | { ok: false; code: string; message: string; status: number }

const ENDPOINT = '/v1/waitlist'
const TIMEOUT_MS = 10_000
const DEFAULT_RETRY_S = 60

const UNREACHABLE: WaitlistResult = { ok: false, code: 'ERR_INTERNAL', message: 'waitlist endpoint unreachable', status: 0 }

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

export async function submitWaitlist(req: WaitlistRequest): Promise<WaitlistResult> {
  let res: Response
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    return UNREACHABLE
  }

  const body: unknown = await res.json().catch(() => null)

  if (res.status === 429) {
    return { ok: false, code: 'ERR_RATE_LIMITED', message: `rate limited, retry in ${retryAfterSeconds(res)}s`, status: 429 }
  }
  if (res.ok) {
    if (typeof body === 'object' && body !== null && (body as { ok?: unknown }).ok === true) return { ok: true }
    return { ok: false, code: 'ERR_INTERNAL', message: 'unexpected response from waitlist endpoint', status: res.status }
  }

  const err = apiError(body)
  if (err) {
    // The Worker already prefixes schema messages with their JSON path ("$.email: ..."); add it only when missing.
    const message = err.path && !err.message.startsWith(err.path) ? `${err.path}: ${err.message}` : err.message
    return { ok: false, code: err.code, message, status: res.status }
  }
  return { ok: false, code: 'ERR_INTERNAL', message: `waitlist endpoint returned HTTP ${res.status}`, status: res.status }
}
