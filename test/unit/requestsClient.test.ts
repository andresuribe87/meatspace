import { describe, expect, it } from 'vitest'

import { cleanBody, DATASET_ID_RE, requestCurl, submitRequest, type RequestBody } from '../../src/lib/requestsClient'

const BODY: RequestBody = { kind: 'gap_report', dataset: ' lerobot/svla_so101_pickplace ', robot: 'so101', email: ' Me@Lab.EDU ', notes: '', website: '' }

function fakeFetch(res: Response | Error, seen: { init?: RequestInit } = {}): typeof fetch {
  return (async (_url: RequestInfo | URL, init?: RequestInit) => {
    seen.init = init
    if (res instanceof Error) throw res
    return res
  }) as typeof fetch
}

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })

describe('requestsClient', () => {
  it('cleans the body: trims, lowercases email, drops empty optionals, keeps the honeypot', () => {
    expect(cleanBody(BODY)).toEqual({ kind: 'gap_report', dataset: 'lerobot/svla_so101_pickplace', robot: 'so101', email: 'me@lab.edu', website: '' })
  })

  it('posts JSON and returns the receipt on 202', async () => {
    const seen: { init?: RequestInit } = {}
    const r = await submitRequest(BODY, { fetch: fakeFetch(json(202, { ok: true, request_id: 'rq_1', status: 'queued' }), seen) })
    expect(r).toEqual({ ok: true, requestId: 'rq_1', status: 'queued' })
    expect(seen.init?.method).toBe('POST')
    expect(JSON.parse(String(seen.init?.body))).toMatchObject({ kind: 'gap_report', email: 'me@lab.edu', website: '' })
  })

  it('maps a schema error to its field path', async () => {
    const r = await submitRequest(BODY, { fetch: fakeFetch(json(400, { error: { code: 'ERR_SCHEMA', message: 'expected an email address', path: '$.email' } })) })
    expect(r).toMatchObject({ ok: false, code: 'ERR_SCHEMA', path: '$.email', message: '$.email: expected an email address', status: 400 })
  })

  it('reads retry-after on 429', async () => {
    const r = await submitRequest(BODY, { fetch: fakeFetch(json(429, { error: { code: 'ERR_RATE_LIMITED', message: 'x' } }, { 'retry-after': '42' })) })
    expect(r).toMatchObject({ ok: false, code: 'ERR_RATE_LIMITED', retryAfterS: 42, status: 429 })
  })

  it('folds a 501, with or without JSON, into ERR_NOT_BUILT', async () => {
    for (const res of [json(501, { error: { code: 'ERR_NOT_BUILT', message: 'planned' } }), new Response('not implemented', { status: 501 })]) {
      const r = await submitRequest(BODY, { fetch: fakeFetch(res) })
      expect(r).toMatchObject({ ok: false, code: 'ERR_NOT_BUILT', status: 501 })
    }
  })

  it('never reports success for a non-JSON gateway page', async () => {
    const r502 = await submitRequest(BODY, { fetch: fakeFetch(new Response('<html>bad gateway</html>', { status: 502 })) })
    expect(r502).toMatchObject({ ok: false, code: 'ERR_BAD_RESPONSE', status: 502 })
    const r200 = await submitRequest(BODY, { fetch: fakeFetch(new Response('<html>ok</html>', { status: 200 })) })
    expect(r200).toMatchObject({ ok: false, code: 'ERR_BAD_RESPONSE', status: 200 })
  })

  it('folds network failures and timeouts into ERR_UNREACHABLE (never throws)', async () => {
    const net = await submitRequest(BODY, { fetch: fakeFetch(new TypeError('Failed to fetch')) })
    expect(net).toMatchObject({ ok: false, code: 'ERR_UNREACHABLE', status: 0 })
    const slow = await submitRequest(BODY, { fetch: fakeFetch(new DOMException('timed out', 'TimeoutError')) })
    expect(slow).toMatchObject({ ok: false, code: 'ERR_UNREACHABLE', status: 0 })
    expect(slow.ok === false && slow.message).toMatch(/10 s/)
  })

  it('prints a copyable curl without the honeypot', () => {
    const c = requestCurl({ ...BODY, notes: "it's fine" })
    expect(c).toContain('curl -s -X POST https://meatspace.sh/v1/requests')
    expect(c).not.toContain('website')
    expect(c).toContain(`it'\\''s fine`)
  })

  it('accepts Hub ids and rejects anything else', () => {
    expect(DATASET_ID_RE.test('lerobot/svla_so101_pickplace')).toBe(true)
    expect(DATASET_ID_RE.test('cagataydev/so101-tic-tac-toe')).toBe(true)
    expect(DATASET_ID_RE.test('notvalid')).toBe(false)
    expect(DATASET_ID_RE.test('a/b/c')).toBe(false)
    expect(DATASET_ID_RE.test('https://huggingface.co/datasets/a/b')).toBe(false)
  })
})
