import { afterEach, describe, expect, it, vi } from 'vitest'

import type { DispatchEvent } from '../../shared/types'
import { createLineSplitter, executeDispatch } from '../../src/lib/dispatchClient'

const enc = new TextEncoder()

const RECEIPT = {
  task_id: 'tsk_0123456789abcdef',
  status: 'DISPATCHED',
  primitive: 'AERIAL_ISR_SORTIE',
  node_id: 'VTOL-260-TX-04',
  interface: 'MAVLink v2',
  escrow_usdc: '42.50',
  rate_usdc_per_min: '3.40',
  est_duration_min: 12.5,
  compiled: { target: 'MAVLink v2', artifact: 'MISSION_ITEM_INT', count: 18 },
  telemetry_stream_hash: `0x9f8c${'0'.repeat(56)}3a1b`,
  attestation: 'TPM2_QUOTE',
  issued_at: '2026-10-31T00:00:00.000Z',
  sandbox: true,
}

const SUCCESS = [
  { type: 'step', t_ms: 0, phase: 'VALIDATE', message: 'Validating GeoJSON polygon against node firmware geofence...', status: 'PASS' },
  { type: 'step', t_ms: 140, phase: 'ESCROW', message: 'Locking escrow ($42.50 USDC) & bidding on Node VTOL-260-TX-04...', status: 'ACCEPTED' },
  { type: 'step', t_ms: 380, phase: 'COMPILE', message: 'Compiling intent to MAVLink waypoint primitive...', status: 'DISPATCHED' },
  { type: 'step', t_ms: 800, phase: 'ATTEST', message: 'Returning TPM-signed telemetry stream hash (0x9f8c...3a1b).', status: 'SIGNED' },
  { type: 'receipt', t_ms: 800, receipt: RECEIPT },
]
const NDJSON = SUCCESS.map((e) => JSON.stringify(e)).join('\n') + '\n'

function streamOf(chunks: Uint8Array[], delayMs = 0): ReadableStream<Uint8Array> {
  let i = 0
  return new ReadableStream({
    async pull(c) {
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs))
      if (i < chunks.length) c.enqueue(chunks[i++])
      else c.close()
    },
  })
}

const ndjson = (chunks: Uint8Array[], status = 200, delayMs = 0, headers: Record<string, string> = {}) =>
  new Response(streamOf(chunks, delayMs), { status, headers: { 'content-type': 'application/x-ndjson; charset=utf-8', ...headers } })

function mockFetch(make: () => Response | Promise<Response>) {
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    if (init.signal?.aborted) throw init.signal.reason
    return make()
  })
}

async function run(make: () => Response, signal = new AbortController().signal) {
  mockFetch(make)
  const events: DispatchEvent[] = []
  const r = await executeDispatch('{}', (e) => events.push(e), signal)
  return { events, ...r }
}

afterEach(() => vi.unstubAllGlobals())

describe('executeDispatch NDJSON parsing', () => {
  it('is independent of chunk boundaries (every 2-way split, and 1-byte chunks)', async () => {
    const bytes = enc.encode(NDJSON)
    for (let cut = 1; cut < bytes.length; cut += 5) {
      const { events, httpStatus } = await run(() => ndjson([bytes.slice(0, cut), bytes.slice(cut)]))
      expect(events).toEqual(SUCCESS)
      expect(httpStatus).toBe(200)
    }
    const { events } = await run(() => ndjson([...bytes].map((b) => Uint8Array.of(b))))
    expect(events).toEqual(SUCCESS)
  })

  it('decodes multibyte UTF-8 split mid-codepoint, CRLF, blank lines and a final unterminated line', async () => {
    const text =
      '{"type":"step","t_ms":0,"phase":"VALIDATE","message":"ünïcødé — ok","status":"PASS"}\r\n\n' +
      '{"type":"error","t_ms":140,"phase":"ESCROW","code":"ERR_NODE_BUSY","message":"busy","http_status":409}'
    const bytes = enc.encode(text)
    const cut = bytes.indexOf(0xc3) + 1
    const { events, httpStatus } = await run(() => ndjson([bytes.slice(0, cut), bytes.slice(cut)], 409))
    expect(events[0]).toMatchObject({ type: 'step', message: 'ünïcødé — ok' })
    expect(events[1]).toMatchObject({ type: 'error', code: 'ERR_NODE_BUSY' })
    expect(httpStatus).toBe(409)
  })

  it('a stream that ends without a terminal event yields a synthetic ERR_INTERNAL', async () => {
    const partial = NDJSON.split('\n').slice(0, 2).join('\n') + '\n'
    const { events } = await run(() => ndjson([enc.encode(partial)]))
    expect(events).toHaveLength(3)
    expect(events[2]).toMatchObject({ type: 'error', code: 'ERR_INTERNAL' })
  })

  it('a malformed line yields ERR_INTERNAL', async () => {
    const { events } = await run(() => ndjson([enc.encode(`${JSON.stringify(SUCCESS[0])}\n{not json\n`)]))
    expect(events.at(-1)).toMatchObject({ type: 'error', code: 'ERR_INTERNAL' })
  })
})

describe('executeDispatch pre-stream and transport errors', () => {
  const jsonError = (status: number, error: object, headers: Record<string, string> = {}) => () =>
    new Response(JSON.stringify({ error }), { status, headers: { 'content-type': 'application/json', ...headers } })

  it('maps ApiErrorBody to one error event, prefixing the path once', async () => {
    const a = await run(jsonError(400, { code: 'ERR_SCHEMA', message: 'expected finite number', path: '$.qty' }))
    expect(a.events).toEqual([
      { type: 'error', t_ms: 0, phase: null, code: 'ERR_SCHEMA', message: '$.qty: expected finite number', http_status: 400 },
    ])
    const b = await run(jsonError(400, { code: 'ERR_SCHEMA', message: '$.qty: expected integer', path: '$.qty' }))
    expect(b.events[0]).toMatchObject({ message: '$.qty: expected integer' })
  })

  it('appends retry-after on 429', async () => {
    const r = await run(jsonError(429, { code: 'ERR_RATE_LIMITED', message: 'too many dispatches' }, { 'retry-after': '12' }))
    expect(r.events[0]).toMatchObject({ code: 'ERR_RATE_LIMITED', message: 'too many dispatches (retry after 12s)', http_status: 429 })
  })

  it('a non-API response (e.g. a 501 stub) is reported honestly', async () => {
    const r = await run(() => new Response('stub', { status: 501, headers: { 'content-type': 'text/plain' } }))
    expect(r.events[0]).toMatchObject({ code: 'ERR_INTERNAL', message: 'dispatch endpoint unreachable (HTTP 501)' })
  })

  it('network failure -> ERR_INTERNAL with http status 0', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('fetch failed')
    })
    const events: DispatchEvent[] = []
    const r = await executeDispatch('{}', (e) => events.push(e), new AbortController().signal)
    expect(r.httpStatus).toBe(0)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ type: 'error', code: 'ERR_INTERNAL' })
  })

  it('abort mid-stream rejects with AbortError and emits nothing further', async () => {
    const ac = new AbortController()
    const events: DispatchEvent[] = []
    mockFetch(() => ndjson(NDJSON.split('\n').filter(Boolean).map((l) => enc.encode(`${l}\n`)), 200, 30))
    const p = executeDispatch(
      '{}',
      (e) => {
        events.push(e)
        if (events.length === 2) ac.abort()
      },
      ac.signal,
    )
    await expect(p).rejects.toMatchObject({ name: 'AbortError' })
    expect(events).toHaveLength(2)
  })
})

describe('executeDispatch onResponse', () => {
  it('reports status and task id once, as soon as the headers arrive and before any event', async () => {
    mockFetch(() => ndjson([enc.encode(NDJSON)], 200, 0, { 'x-meatspace-task-id': RECEIPT.task_id }))
    const calls: string[] = []
    await executeDispatch(
      '{}',
      (e) => calls.push(`event:${e.type}`),
      new AbortController().signal,
      (status, taskId) => calls.push(`response:${status}:${taskId}`),
    )
    expect(calls[0]).toBe(`response:200:${RECEIPT.task_id}`)
    expect(calls.filter((c) => c.startsWith('response:'))).toHaveLength(1)
    expect(calls).toHaveLength(1 + SUCCESS.length)
  })

  it('passes a null task id when the header is absent (pre-stream JSON error)', async () => {
    mockFetch(() => new Response(JSON.stringify({ error: { code: 'ERR_SCHEMA', message: 'bad' } }), { status: 400, headers: { 'content-type': 'application/json' } }))
    const onResponse = vi.fn()
    await executeDispatch('{}', () => {}, new AbortController().signal, onResponse)
    expect(onResponse).toHaveBeenCalledExactlyOnceWith(400, null)
  })

  it('has already fired when the stream is aborted after commit', async () => {
    const ac = new AbortController()
    const onResponse = vi.fn()
    mockFetch(() => ndjson(NDJSON.split('\n').filter(Boolean).map((l) => enc.encode(`${l}\n`)), 200, 30, { 'x-meatspace-task-id': RECEIPT.task_id }))
    const p = executeDispatch('{}', () => ac.abort(), ac.signal, onResponse)
    await expect(p).rejects.toMatchObject({ name: 'AbortError' })
    expect(onResponse).toHaveBeenCalledExactlyOnceWith(200, RECEIPT.task_id)
  })

  it('is not called when the request never got a response', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('fetch failed')
    })
    const onResponse = vi.fn()
    await executeDispatch('{}', () => {}, new AbortController().signal, onResponse)
    expect(onResponse).not.toHaveBeenCalled()
  })
})

describe('createLineSplitter', () => {
  it('splits on LF, strips CR, drops blank lines and flushes on end', () => {
    const lines: string[] = []
    const s = createLineSplitter((l) => lines.push(l))
    s.push('a')
    s.push('b\nc\r')
    s.push('\n\n  \nd')
    s.end()
    expect(lines).toEqual(['ab', 'c', 'd'])
  })
})
