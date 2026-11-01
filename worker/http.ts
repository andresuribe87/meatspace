import type { Context, MiddlewareHandler } from 'hono'

import { RATE_LIMITS } from '../shared/constants'
import type { ApiErrorBody, ErrorCode } from '../shared/types'
import { sha256Hex } from './crypto'

export type AppEnv = { Bindings: Env }
export type AppContext = Context<AppEnv>

/** Thrown anywhere in a handler; app.onError turns it into a non-streamed ApiErrorBody response. */
export class ApiError extends Error {
  readonly status: number
  readonly code: ErrorCode
  readonly path: string | undefined
  readonly headers: Record<string, string>

  constructor(status: number, code: ErrorCode, message: string, opts: { path?: string; headers?: Record<string, string> } = {}) {
    super(message)
    this.status = status
    this.code = code
    this.path = opts.path
    this.headers = opts.headers ?? {}
  }
}

export function errorResponse(err: ApiError): Response {
  const body: ApiErrorBody = { error: { code: err.code, message: err.message, ...(err.path ? { path: err.path } : {}) } }
  return Response.json(body, { status: err.status, headers: err.headers })
}

export function textResponse(body: string, cacheControl: string): Response {
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': cacheControl } })
}

/** Static-asset responses carry immutable headers; copy so middleware can decorate them. */
export async function fromAssets(c: AppContext): Promise<Response> {
  const res = await c.env.ASSETS.fetch(c.req.raw)
  return new Response(res.body, res)
}

const HEXTET = /^[0-9a-f]{1,4}$/
const OCTET = /^\d{1,3}$/

/** "2001:db8::1" -> its eight 16-bit groups (handles "::" and a dotted IPv4 tail), or null when not IPv6. */
function ipv6Groups(ip: string): number[] | null {
  let addr = ip.trim().toLowerCase().split('%')[0]
  if (!addr.includes(':')) return null
  const tail = addr.slice(addr.lastIndexOf(':') + 1)
  if (tail.includes('.')) {
    const o = tail.split('.')
    if (o.length !== 4 || !o.every((x) => OCTET.test(x) && Number(x) <= 255)) return null
    const [a, b, c, d] = o.map(Number)
    addr = `${addr.slice(0, -tail.length)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`
  }
  const halves = addr.split('::')
  if (halves.length > 2) return null
  const [head, rest] = halves.map((h) => (h === '' ? [] : h.split(':')))
  let groups = head
  if (rest) {
    const missing = 8 - head.length - rest.length
    if (missing < 1) return null
    groups = [...head, ...Array<string>(missing).fill('0'), ...rest]
  }
  if (groups.length !== 8 || !groups.every((x) => HEXTET.test(x))) return null
  return groups.map((x) => parseInt(x, 16))
}

/**
 * The identity rate limits and lock quotas key on: an IPv4 address as is, an IPv6 address truncated to its /64
 * (one subscriber's allocation, so rotating addresses inside it buys no extra quota). IPv4-mapped IPv6 counts as IPv4.
 */
export function normalizeIp(ip: string): string {
  const g = ipv6Groups(ip)
  if (!g) return ip
  if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) return [g[6] >> 8, g[6] & 0xff, g[7] >> 8, g[7] & 0xff].join('.')
  return `${g.slice(0, 4).map((x) => x.toString(16)).join(':')}::/64`
}

export const clientNetwork = (req: Request) => normalizeIp(req.headers.get('cf-connecting-ip') ?? 'anon')

/** Opaque per-client id for lock ownership, so the Durable Object never stores an address. */
export async function clientKey(req: Request): Promise<string> {
  return (await sha256Hex(clientNetwork(req))).slice(0, 16)
}

export async function rateLimit(limiter: RateLimit, req: Request): Promise<void> {
  const { success } = await limiter.limit({ key: clientNetwork(req) })
  if (!success) {
    throw new ApiError(429, 'ERR_RATE_LIMITED', `rate limit exceeded; retry in ${RATE_LIMITS.retryAfterS}s`, {
      headers: { 'retry-after': String(RATE_LIMITS.retryAfterS) },
    })
  }
}

/**
 * Parses the body as JSON regardless of content-type (curl -d sends form-urlencoded),
 * reading at most `maxBytes` so a lying or absent content-length cannot force a large read.
 */
export async function readJson(req: Request, maxBytes: number): Promise<unknown> {
  const text = await readText(req, maxBytes)
  try {
    return JSON.parse(text)
  } catch {
    throw new ApiError(400, 'ERR_INVALID_JSON', 'request body is not valid JSON')
  }
}

async function readText(req: Request, maxBytes: number): Promise<string> {
  const tooLarge = () => new ApiError(413, 'ERR_PAYLOAD_TOO_LARGE', `request body exceeds ${maxBytes} bytes`)
  if (Number(req.headers.get('content-length') ?? 0) > maxBytes) throw tooLarge()
  if (!req.body) return ''
  const reader = req.body.getReader()
  const decoder = new TextDecoder()
  let size = 0
  let text = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) return text + decoder.decode()
    size += value.byteLength
    if (size > maxBytes) {
      await reader.cancel()
      throw tooLarge()
    }
    text += decoder.decode(value, { stream: true })
  }
}

const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
}

const CORS_ORIGIN = { 'access-control-allow-origin': '*' }

const CORS_PREFLIGHT: Readonly<Record<string, string>> = {
  ...CORS_ORIGIN,
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
}

const CORS_RESPONSE: Readonly<Record<string, string>> = {
  ...CORS_ORIGIN,
  'access-control-expose-headers': 'x-meatspace-task-id, retry-after, etag, x-meatspace-sha256, x-meatspace-content-sha256',
}

/** Intake endpoints accept same-origin browsers and curl only: no CORS preflight, no CORS headers. */
const SAME_ORIGIN_ONLY = new Set(['/v1/waitlist', '/v1/requests'])

function setAll(res: Response, headers: Readonly<Record<string, string>>): void {
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v)
}

/** A 101 carries a runtime-owned WebSocket: nothing to decorate. */
const isUpgrade = (res: Response) => res.status === 101

export const securityHeaders: MiddlewareHandler<AppEnv> = async (c, next) => {
  await next()
  if (!isUpgrade(c.res)) setAll(c.res, SECURITY_HEADERS)
}

/**
 * /v1: open to cross-origin callers except the same-origin-only intake endpoints, and never cached unless the handler
 * says otherwise (report files carry their own ETag and cache-control).
 */
export const apiHeaders: MiddlewareHandler<AppEnv> = async (c, next) => {
  const cors = !SAME_ORIGIN_ONLY.has(c.req.path)
  if (cors && c.req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_PREFLIGHT })
  await next()
  if (isUpgrade(c.res)) return
  if (!c.res.headers.has('cache-control')) c.res.headers.set('cache-control', 'no-store')
  if (cors) setAll(c.res, CORS_RESPONSE)
}
