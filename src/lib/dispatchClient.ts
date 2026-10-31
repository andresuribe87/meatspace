/**
 * Browser client for POST /v1/dispatch.
 *
 * The Worker streams `application/x-ndjson`: one DispatchEvent per line, flushed at the handoff's
 * offsets (00 / 140 / 380 / 800 ms). Errors raised before the stream starts (bad JSON, schema,
 * size, rate limit) come back as a plain `application/json` ApiErrorBody. Anything else (network
 * failure, a stubbed endpoint, an HTML error page) is reported as a synthetic ERR_INTERNAL event so
 * the console always ends on a terminal line.
 *
 * `onResponse` fires once the response headers are in, before any event: a 2xx with a task id means the
 * server already committed the dispatch (node locked, escrow taken), even if the stream is aborted later.
 *
 * Aborting `signal` rejects with the signal's AbortError and emits nothing further.
 */
import type { ApiErrorBody, DispatchEvent, DispatchPhase, DispatchReceipt, ErrorCode, StepStatus } from '../../shared/types'

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isStr = (v: unknown): v is string => typeof v === 'string'

const PHASES: ReadonlySet<string> = new Set<DispatchPhase>(['VALIDATE', 'ESCROW', 'COMPILE', 'ATTEST'])
const STATUSES: ReadonlySet<string> = new Set<StepStatus>(['PASS', 'ACCEPTED', 'DISPATCHED', 'SIGNED', 'FAIL', 'REJECTED'])

function internalError(message: string, httpStatus: number): DispatchEvent {
  return { type: 'error', t_ms: 0, phase: null, code: 'ERR_INTERNAL', message, http_status: httpStatus }
}

/** One decoded NDJSON value -> DispatchEvent. `null` = not an event this client understands. */
export function toDispatchEvent(v: unknown, httpStatus: number): DispatchEvent | null {
  if (!isObj(v)) return null
  const t_ms = isNum(v.t_ms) ? v.t_ms : 0
  switch (v.type) {
    case 'step':
      if (!isStr(v.phase) || !PHASES.has(v.phase) || !isStr(v.status) || !STATUSES.has(v.status) || !isStr(v.message)) return null
      return { type: 'step', t_ms, phase: v.phase as DispatchPhase, status: v.status as StepStatus, message: v.message }
    case 'error':
      if (!isStr(v.code) || !isStr(v.message)) return null
      return {
        type: 'error',
        t_ms,
        phase: isStr(v.phase) && PHASES.has(v.phase) ? (v.phase as DispatchPhase) : null,
        code: v.code as ErrorCode,
        message: v.message,
        http_status: isNum(v.http_status) ? v.http_status : httpStatus,
      }
    case 'receipt': {
      const r = v.receipt
      if (!isObj(r) || !isStr(r.task_id) || !isStr(r.escrow_usdc)) return null
      return { type: 'receipt', t_ms, receipt: r as unknown as DispatchReceipt }
    }
    default:
      return null
  }
}

/** ApiErrorBody -> synthetic error event (path folded into the message when the server left it out). */
function apiErrorEvent(body: unknown, httpStatus: number, retryAfter: string | null): DispatchEvent | null {
  if (!isObj(body) || !isObj(body.error)) return null
  const { code, message, path } = (body as unknown as ApiErrorBody).error
  if (!isStr(code) || !isStr(message)) return null
  let text = isStr(path) && path.length > 0 && !message.includes(path) ? `${path}: ${message}` : message
  if (retryAfter && /^\d+$/.test(retryAfter) && !/retry/i.test(text)) text += ` (retry after ${retryAfter}s)`
  return { type: 'error', t_ms: 0, phase: null, code, message: text, http_status: httpStatus }
}

function abortError(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')
}

/**
 * Incremental NDJSON line splitter. Feed decoded text with push(); every complete line goes to
 * `onLine` (without the trailing "\n" / "\r\n"). Call end() once to flush a final unterminated line.
 */
export function createLineSplitter(onLine: (line: string) => void): { push: (text: string) => void; end: () => void } {
  let buf = ''
  const emit = (raw: string) => {
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw
    if (line.trim().length > 0) onLine(line)
  }
  return {
    push(text) {
      buf += text
      let nl = buf.indexOf('\n')
      while (nl !== -1) {
        emit(buf.slice(0, nl))
        buf = buf.slice(nl + 1)
        nl = buf.indexOf('\n')
      }
    },
    end() {
      const rest = buf
      buf = ''
      emit(rest)
    },
  }
}

class ProtocolError extends Error {}

async function readNdjson(res: Response, onEvent: (e: DispatchEvent) => void, signal: AbortSignal): Promise<boolean> {
  let terminal = false
  const splitter = createLineSplitter((line) => {
    let value: unknown
    try {
      value = JSON.parse(line)
    } catch {
      throw new ProtocolError('malformed NDJSON line in dispatch stream')
    }
    const ev = toDispatchEvent(value, res.status)
    if (!ev) return // unknown event type: skip (forward compatible)
    if (ev.type === 'error' || ev.type === 'receipt') terminal = true
    onEvent(ev)
  })

  if (!res.body) {
    splitter.push(await res.text())
    splitter.end()
    return terminal
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      if (signal.aborted) throw abortError(signal)
      splitter.push(decoder.decode(value, { stream: true }))
    }
    splitter.push(decoder.decode())
    splitter.end()
  } catch (e) {
    reader.cancel().catch(() => {})
    throw e
  } finally {
    reader.releaseLock()
  }
  return terminal
}

export async function executeDispatch(
  body: string,
  onEvent: (e: DispatchEvent) => void,
  signal: AbortSignal,
  onResponse?: (status: number, taskId: string | null) => void,
): Promise<{ httpStatus: number }> {
  if (signal.aborted) throw abortError(signal)

  let res: Response
  try {
    res = await fetch('/v1/dispatch', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/x-ndjson, application/json' },
      body,
      cache: 'no-store',
      signal,
    })
  } catch {
    if (signal.aborted) throw abortError(signal)
    onEvent(internalError('dispatch endpoint unreachable (network error)', 0))
    return { httpStatus: 0 }
  }

  const status = res.status
  onResponse?.(status, res.headers.get('x-meatspace-task-id') || null)
  const ct = (res.headers.get('content-type') ?? '').toLowerCase()

  if (ct.includes('application/x-ndjson')) {
    try {
      const terminal = await readNdjson(res, onEvent, signal)
      if (!terminal) onEvent(internalError('dispatch stream ended before a receipt or error', status))
    } catch (e) {
      if (signal.aborted) throw abortError(signal)
      onEvent(internalError(e instanceof ProtocolError ? e.message : 'dispatch stream interrupted (network error)', status))
    }
    return { httpStatus: status }
  }

  if (ct.includes('application/json')) {
    let parsed: unknown = null
    try {
      parsed = await res.json()
    } catch {
      if (signal.aborted) throw abortError(signal)
    }
    const ev = apiErrorEvent(parsed, status, res.headers.get('retry-after'))
    onEvent(ev ?? internalError(`unexpected JSON response from dispatch endpoint (HTTP ${status})`, status))
    return { httpStatus: status }
  }

  // Not a dispatch response at all: stubbed endpoint, proxy error page, SPA fallback, ...
  res.body?.cancel().catch(() => {})
  onEvent(
    internalError(
      status >= 400 ? `dispatch endpoint unreachable (HTTP ${status})` : `unexpected response from dispatch endpoint (HTTP ${status}, ${ct.split(';')[0] || 'no content-type'})`,
      status,
    ),
  )
  return { httpStatus: status }
}
