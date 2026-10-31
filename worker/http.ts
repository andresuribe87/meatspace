import type { Context, MiddlewareHandler } from 'hono'

import { RATE_LIMITS } from '../shared/constants'
import type { ApiErrorBody, ErrorCode } from '../shared/types'

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

export async function rateLimit(limiter: RateLimit, req: Request): Promise<void> {
  const { success } = await limiter.limit({ key: req.headers.get('cf-connecting-ip') ?? 'anon' })
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
  'access-control-expose-headers': 'x-meatspace-task-id',
}

function setAll(res: Response, headers: Readonly<Record<string, string>>): void {
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v)
}

/** A 101 carries a runtime-owned WebSocket: nothing to decorate. */
const isUpgrade = (res: Response) => res.status === 101

export const securityHeaders: MiddlewareHandler<AppEnv> = async (c, next) => {
  await next()
  if (!isUpgrade(c.res)) setAll(c.res, SECURITY_HEADERS)
}

/** /v1: never cached, and open to cross-origin callers except the same-origin-only waitlist. */
export const apiHeaders: MiddlewareHandler<AppEnv> = async (c, next) => {
  const cors = c.req.path !== '/v1/waitlist'
  if (cors && c.req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_PREFLIGHT })
  await next()
  if (isUpgrade(c.res)) return
  c.res.headers.set('cache-control', 'no-store')
  if (cors) setAll(c.res, CORS_RESPONSE)
}
