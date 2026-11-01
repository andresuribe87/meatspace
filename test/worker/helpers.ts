import { env, exports } from 'cloudflare:workers'

import type { ApiErrorBody, DispatchEvent, NetworkSnapshot } from '../../shared/types'

export const ORIGIN = 'https://meatspace.sh'

/**
 * A fresh client per call keeps the per-client rate limiters (20/min, 5/min) and the lock quota out of unrelated
 * tests. Clients are IPv6 /64s, so the randomness goes in the network half of the address.
 */
export function randomIp(): string {
  const [a, b] = crypto.getRandomValues(new Uint16Array(2))
  return `2001:db8:${a.toString(16)}:${b.toString(16)}::1`
}

export interface CallInit extends RequestInit {
  ip?: string
}

export function call(path: string, { ip, ...init }: CallInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set('cf-connecting-ip', ip ?? randomIp())
  return exports.default.fetch(new Request(`${ORIGIN}${path}`, { ...init, headers }))
}

export function postJson(path: string, body: unknown, init: CallInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json')
  return call(path, { ...init, method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) })
}

export async function getJson<T>(path: string): Promise<T> {
  const res = await call(path)
  if (res.status !== 200) throw new Error(`GET ${path} -> ${res.status}: ${await res.text()}`)
  return res.json<T>()
}

export const snapshot = () => getJson<NetworkSnapshot>('/v1/concept/snapshot')

export async function expectApiError(res: Response, status: number, code: string): Promise<ApiErrorBody['error']> {
  const text = await res.text()
  if (res.status !== status) throw new Error(`expected ${status}, got ${res.status}: ${text}`)
  if (!res.headers.get('content-type')?.startsWith('application/json')) throw new Error(`not JSON: ${res.headers.get('content-type')}`)
  const body = JSON.parse(text) as ApiErrorBody
  if (body.error.code !== code) throw new Error(`expected ${code}, got ${body.error.code}: ${body.error.message}`)
  return body.error
}

export interface TimedEvent {
  event: DispatchEvent
  /** ms since `t0` when the line arrived. */
  at: number
}

/** Reads an NDJSON body line by line, recording when each line arrived. */
export async function readNdjson(res: Response, t0 = Date.now()): Promise<TimedEvent[]> {
  if (!res.body) throw new Error('no body')
  const out: TimedEvent[] = []
  const decoder = new TextDecoder()
  let buf = ''
  for await (const chunk of res.body) {
    buf += decoder.decode(chunk, { stream: true })
    let nl: number
    while ((nl = buf.indexOf('\n')) >= 0) {
      out.push({ event: JSON.parse(buf.slice(0, nl)) as DispatchEvent, at: Date.now() - t0 })
      buf = buf.slice(nl + 1)
    }
  }
  if (buf !== '') throw new Error(`trailing partial line: ${buf}`)
  return out
}

export const network = () => env.NETWORK.getByName('global')
