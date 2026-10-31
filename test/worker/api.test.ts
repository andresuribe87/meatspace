import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

import { renderManText } from '../../shared/manpage'
import { SEED_NODES, SEED_STATS } from '../../shared/nodes'
import type { HardwareNode, NetworkSnapshot, NetworkStats } from '../../shared/types'
import { clientKey, normalizeIp } from '../../worker/http'
import worker from '../../worker/index'
import { INSTALL_SH } from '../../worker/install'
import { call, expectApiError, getJson, ORIGIN, snapshot } from './helpers'

const SEED_NODES_WIRE = JSON.parse(JSON.stringify(SEED_NODES)) as HardwareNode[]

function expectSecurityHeaders(res: Response) {
  expect(res.headers.get('x-content-type-options')).toBe('nosniff')
  expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
}

describe('GET /v1/snapshot (first read, before any tick)', () => {
  it('serves the seed exactly, so the ticker matches the handoff', async () => {
    const res = await call('/v1/snapshot')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/^application\/json/)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
    expectSecurityHeaders(res)
    const snap = await res.json<NetworkSnapshot>()
    expect(snap.seq).toBe(0)
    expect(typeof snap.ts).toBe('number')
    expect(snap.stats).toEqual(SEED_STATS)
    expect(snap.nodes).toEqual(SEED_NODES_WIRE)
  })
})

describe('read endpoints', () => {
  it('GET /v1 lists the API', async () => {
    const res = await call('/v1')
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    const index = await res.json<{ name: string; version: string; sandbox: boolean; docs: string; endpoints: { method: string; path: string; description: string }[] }>()
    expect(index).toMatchObject({ name: 'meatspace.sh', version: '0.1.4-alpha', sandbox: true, docs: 'https://meatspace.sh/docs' })
    expect(index.endpoints.map((e) => `${e.method} ${e.path}`)).toEqual([
      'GET /v1',
      'GET /v1/snapshot',
      'GET /v1/nodes',
      'GET /v1/nodes/:id',
      'GET /v1/stats',
      'GET /v1/stream',
      'POST /v1/dispatch',
      'POST /v1/waitlist',
    ])
    for (const e of index.endpoints) expect(e.description.length).toBeGreaterThan(0)
  })

  it('GET /v1/nodes returns the orderbook with a timestamp', async () => {
    const body = await getJson<{ nodes: HardwareNode[]; ts: number }>('/v1/nodes')
    expect(Object.keys(body).sort()).toEqual(['nodes', 'ts'])
    expect(body.nodes.map((n) => n.id)).toEqual(SEED_NODES.map((n) => n.id))
    expect(body.ts).toBeGreaterThan(0)
  })

  it('GET /v1/nodes/:id returns one node', async () => {
    const node = await getJson<HardwareNode>('/v1/nodes/VTOL-260-TX-04')
    expect(node).toEqual(SEED_NODES_WIRE[0])
  })

  it('GET /v1/nodes/:id 404s with ERR_NODE_NOT_FOUND', async () => {
    const err = await expectApiError(await call('/v1/nodes/NOPE-404'), 404, 'ERR_NODE_NOT_FOUND')
    expect(err.message).toBe('node NOPE-404 is not registered with the clearinghouse')
  })

  it('stamps ts with the time of the read, not of the last tick', async () => {
    await scheduler.wait(5)
    const t0 = Date.now()
    for (const path of ['/v1/snapshot', '/v1/nodes', '/v1/stats']) {
      const { ts } = await getJson<{ ts: number }>(path)
      expect(ts, path).toBeGreaterThanOrEqual(t0)
      expect(ts, path).toBeLessThanOrEqual(Date.now())
    }
  })

  it('GET /v1/stats returns ticker stats with a timestamp', async () => {
    const body = await getJson<{ stats: NetworkStats; ts: number }>('/v1/stats')
    expect(body.stats).toEqual((await snapshot()).stats)
    expect(body.ts).toBeGreaterThan(0)
  })

  it('HEAD is served by the GET handler without a body', async () => {
    const res = await call('/v1', { method: 'HEAD' })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('')
  })
})

describe('routing errors', () => {
  it('unknown /v1 path -> 404 ERR_NOT_FOUND (with CORS)', async () => {
    const res = await call('/v1/nope')
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
    expect(res.headers.get('cache-control')).toBe('no-store')
    expectSecurityHeaders(res)
    await expectApiError(res, 404, 'ERR_NOT_FOUND')
  })

  it.each([
    ['DELETE', '/v1/snapshot', 'GET, HEAD'],
    ['POST', '/v1/nodes/VTOL-260-TX-04', 'GET, HEAD'],
    ['GET', '/v1/dispatch', 'POST'],
    ['PUT', '/v1/waitlist', 'POST'],
    ['POST', '/install.sh', 'GET, HEAD'],
    ['POST', '/healthz', 'GET, HEAD'],
  ])('%s %s -> 405 allow: %s', async (method, path, allow) => {
    const res = await call(path, { method })
    expect(res.headers.get('allow')).toBe(allow)
    await expectApiError(res, 405, 'ERR_METHOD_NOT_ALLOWED')
  })

  it('GET /v1/stream without an upgrade -> 426', async () => {
    const res = await call('/v1/stream')
    expect(res.headers.get('upgrade')).toBe('websocket')
    await expectApiError(res, 426, 'ERR_UPGRADE_REQUIRED')
  })
})

describe('CORS', () => {
  it('answers /v1 preflight', async () => {
    const res = await call('/v1/dispatch', {
      method: 'OPTIONS',
      headers: { origin: 'https://agent.example', 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type' },
    })
    expect(res.status).toBe(204)
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
    expect(res.headers.get('access-control-allow-methods')).toBe('GET, POST, OPTIONS')
    expect(res.headers.get('access-control-allow-headers')).toBe('content-type')
    expectSecurityHeaders(res)
  })

  it('exposes the task id and retry-after headers to cross-origin callers', async () => {
    const res = await call('/v1/stats', { headers: { origin: 'https://agent.example' } })
    expect(res.headers.get('access-control-expose-headers')).toBe('x-meatspace-task-id, retry-after')
    await res.arrayBuffer()
  })

  it('keeps /v1/waitlist same-origin: no preflight, no CORS headers', async () => {
    const res = await call('/v1/waitlist', { method: 'OPTIONS', headers: { origin: 'https://agent.example' } })
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
    await expectApiError(res, 405, 'ERR_METHOD_NOT_ALLOWED')
  })
})

describe('non-API routes', () => {
  it('GET /healthz', async () => {
    const res = await call('/healthz')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    expectSecurityHeaders(res)
    expect(await res.text()).toBe('ok')
  })

  it('GET /install.sh serves the inert installer', async () => {
    const res = await call('/install.sh')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    expect(res.headers.get('cache-control')).toBe('public, max-age=300')
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
    expectSecurityHeaders(res)
    const body = await res.text()
    expect(body).toBe(INSTALL_SH)
    expect(body.startsWith('#!/bin/sh\n')).toBe(true)
  })

  it.each([
    ['curl default', { accept: '*/*' }, ''],
    ['explicit text', { accept: 'text/plain' }, ''],
    ['browser asking for ?format=txt', { accept: 'text/html,application/xhtml+xml' }, '?format=txt'],
  ])('GET /docs (%s) returns the plain-text man page', async (_, headers, query) => {
    const res = await call(`/docs${query}`, { headers })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    expect(res.headers.get('cache-control')).toBe('public, max-age=300')
    expect(res.headers.get('vary')).toBe('accept')
    expectSecurityHeaders(res)
    expect(await res.text()).toBe(renderManText())
  })

  it.each([
    ['/docs/', '/docs'],
    ['/docs/?format=txt', '/docs?format=txt'],
    ['/install.sh/', '/install.sh'],
    ['/install.sh/?a=1&b=2', '/install.sh?a=1&b=2'],
    ['/healthz/', '/healthz'],
  ])('GET %s -> 301 to %s', async (from, to) => {
    const res = await call(from, { redirect: 'manual' })
    expect(res.status).toBe(301)
    expect(res.headers.get('location')).toBe(to)
    expectSecurityHeaders(res)
  })

  // The ASSETS binding is only wired up by the Vite plugin, so a stub stands in for the SPA's index.html.
  it('GET /docs from a browser defers to the SPA asset, re-pointing canonical/og:url/title at /docs', async () => {
    const shell =
      '<!doctype html><title>meatspace.sh // stdout to reality.</title><link rel="canonical" href="https://meatspace.sh/" /><meta property="og:url" content="https://meatspace.sh/" />'
    const assets = { fetch: async () => new Response(shell, { headers: { 'content-type': 'text/html' } }) }
    const ctx = createExecutionContext()
    const req = new Request<unknown, IncomingRequestCfProperties>(`${ORIGIN}/docs`, { headers: { accept: 'text/html,application/xhtml+xml' } })
    const res = await worker.fetch(req, { ...env, ASSETS: assets as unknown as Fetcher }, ctx)
    await waitOnExecutionContext(ctx)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/html')
    expect(res.headers.get('vary')).toBe('accept')
    expectSecurityHeaders(res)
    expect(await res.text()).toBe(
      '<!doctype html><title>MEATSPACE(1) // meatspace.sh</title><link rel="canonical" href="https://meatspace.sh/docs" /><meta property="og:url" content="https://meatspace.sh/docs" />',
    )
  })
})

describe('client identity (rate limits and lock quota)', () => {
  it.each([
    ['203.0.113.7', '203.0.113.7'],
    ['2001:db8::1', '2001:db8:0:0::/64'],
    ['2001:DB8:0:0:ffff::1', '2001:db8:0:0::/64'],
    ['2001:0db8:0000:0000:0000:0000:0000:0001', '2001:db8:0:0::/64'],
    ['2001:db8:1:2:3:4:5:6', '2001:db8:1:2::/64'],
    ['2001:db8:1::', '2001:db8:1:0::/64'],
    ['::1', '0:0:0:0::/64'],
    ['fe80::1%eth0', 'fe80:0:0:0::/64'],
    ['64:ff9b::203.0.113.7', '64:ff9b:0:0::/64'],
    ['::ffff:203.0.113.7', '203.0.113.7'],
    ['::ffff:cb00:7107', '203.0.113.7'],
    ['anon', 'anon'],
    ['1::2::3', '1::2::3'],
    ['2001:db8:1:2:3:4:5:6:7', '2001:db8:1:2:3:4:5:6:7'],
    ['12345::1', '12345::1'],
    ['::ffff:203.0.113.256', '::ffff:203.0.113.256'],
  ])('%s -> %s', (ip, network) => {
    expect(normalizeIp(ip)).toBe(network)
  })

  it('derives one opaque 16-hex key per client network', async () => {
    const key = (ip: string) => clientKey(new Request(ORIGIN, { headers: { 'cf-connecting-ip': ip } }))
    const a = await key('2001:db8:5:6::1')
    expect(a).toMatch(/^[0-9a-f]{16}$/)
    expect(await key('2001:0db8:0005:0006:ffff:ffff:ffff:ffff')).toBe(a)
    expect(await key('2001:db8:5:7::1')).not.toBe(a)
    expect(await key('203.0.113.7')).toBe(await key('::ffff:203.0.113.7'))
    expect(await key('203.0.113.7')).not.toBe(await key('203.0.113.8'))
  })
})
