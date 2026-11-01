import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

import { CELLS, CONCEPT_ROUTES, ENDPOINTS, endpointWire, INDEX_ENDPOINTS } from '../../shared/api'
import { reportFileUrl, traceRmse, type ReportIndex, type TwinGapReport, type TwinTrace } from '../../shared/reports'
import { REPORT_INDEX } from '../../shared/reports.generated'
import { apiStatus, CAPABILITIES, CAPABILITY_STATUSES } from '../../shared/status'
import type { ApiErrorBody } from '../../shared/types'
import worker from '../../worker/index'
import { FILE_CACHE, FILE_CACHE_IMMUTABLE } from '../../worker/reports'
import carolineReport from '../../lab/reports/CarolinePascal__plug_socket_moved/report.json?raw'
import siyavashReport from '../../lab/reports/siyavash__so101_test/report.json?raw'
import heroTwin from '../../lab/reports/lerobot__svla_so101_pickplace/calibrated_twin.json?raw'
import heroSvg from '../../lab/reports/lerobot__svla_so101_pickplace/heldout_episode.svg?raw'
import heroReport from '../../lab/reports/lerobot__svla_so101_pickplace/report.json?raw'
import heroMd from '../../lab/reports/lerobot__svla_so101_pickplace/report.md?raw'
import heroTrace from '../../lab/reports/lerobot__svla_so101_pickplace/trace.json?raw'
import { call, expectApiError, ORIGIN, postJson, randomIp } from './helpers'

const HERO = 'lerobot__svla_so101_pickplace'
/** The published files are byte copies of lab/reports (the build checks their hashes); the strict copy writes NaN / Infinity as null. */
const carolineStrict = carolineReport.replace(/: (-?Infinity|NaN)(,?\n)/g, ': null$2')
const STRICT = 'CarolinePascal__plug_socket_moved'
const REJECTED = 'siyavash__so101_test'

/** The asset layer: the published files the build copied, and the SPA shell (200 text/html) for anything else. */
const FILES: Record<string, string> = {
  [reportFileUrl(HERO, 'report.json')]: heroReport,
  [reportFileUrl(HERO, 'calibrated_twin.json')]: heroTwin,
  [reportFileUrl(HERO, 'trace.json')]: heroTrace,
  [reportFileUrl(HERO, 'report.md')]: heroMd,
  [reportFileUrl(HERO, 'heldout_episode.svg')]: heroSvg,
  [reportFileUrl(STRICT, 'report.json')]: carolineReport,
  [reportFileUrl(STRICT, 'report.strict.json')]: carolineStrict,
  [reportFileUrl(REJECTED, 'report.json')]: siyavashReport,
}
const SHELL = '<!doctype html><title>meatspace.sh</title>'

function assets(files: Record<string, string> = FILES) {
  const seen: string[] = []
  const fetcher = {
    fetch: async (input: RequestInfo | URL) => {
      const url = new URL(input instanceof Request ? input.url : String(input))
      seen.push(url.pathname)
      const body = files[url.pathname]
      if (body === undefined) return new Response(SHELL, { headers: { 'content-type': 'text/html' } })
      return new Response(body, { headers: { 'content-type': 'application/octet-stream' } })
    },
  }
  return { fetcher: fetcher as unknown as Fetcher, seen }
}

async function get(path: string, init: RequestInit = {}, files?: Record<string, string>) {
  const { fetcher, seen } = assets(files)
  const headers = new Headers(init.headers)
  headers.set('cf-connecting-ip', randomIp())
  const ctx = createExecutionContext()
  const req = new Request(`${ORIGIN}${path}`, { ...init, headers }) as Request<unknown, IncomingRequestCfProperties>
  const res = await worker.fetch(req, { ...env, ASSETS: fetcher }, ctx)
  await waitOnExecutionContext(ctx)
  return { res, seen }
}

const sha256 = async (text: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), (b) => b.toString(16).padStart(2, '0')).join('')

const summary = (id: string) => [...REPORT_INDEX.reports, ...REPORT_INDEX.rejected].find((r) => r.id === id)!

describe('GET /v1 (v0.2 index)', () => {
  it('lists every endpoint of the registry with its status and capability from shared/status.ts', async () => {
    const res = await call('/v1')
    expect(res.status).toBe(200)
    const index = await res.json<{
      version: string
      endpoints: ReturnType<typeof endpointWire>[]
      capabilities: { part: string; status: string }[]
      reports: { count: number }
      concept: string
    }>()
    expect(index.version).toBe('0.2.0')
    expect(index.endpoints).toEqual(INDEX_ENDPOINTS.map(endpointWire))
    // The concept API is listed only by GET /v1/concept: its words never appear in the v0.2 index.
    expect(JSON.stringify(index)).not.toMatch(/\bnodes\b|escrow|usdc|attestation|\btpm\b/i)
    const wire = CAPABILITY_STATUSES.map(apiStatus) as string[]
    for (const e of index.endpoints) {
      expect(wire, e.path).toContain(e.status)
      if (e.capability) expect(wire).toContain(e.capability.status)
    }
    expect(index.capabilities.map((c) => [c.part, c.status])).toEqual(CAPABILITIES.map((c) => [c.part, apiStatus(c.status)]))
    expect(index.reports.count).toBe(REPORT_INDEX.counts.reported)
    expect(index.concept).toBe('https://meatspace.sh/v1/concept')
  })

  it('tells the truth about each capability: reports and packages live, intake on request, trials planned, cell waitlist', async () => {
    const { endpoints } = await (await call('/v1')).json<{ endpoints: ReturnType<typeof endpointWire>[] }>()
    const by = (k: string) => endpoints.find((e) => `${e.method} ${e.path}` === k)!
    expect(by('GET /v1/reports')).toMatchObject({ status: 'live', capability: { part: 'MS-TGR-1', status: 'live' } })
    expect(by('GET /v1/reports/:id/twin')).toMatchObject({ status: 'live', capability: { part: 'MS-TWIN-PKG', status: 'live' } })
    expect(by('POST /v1/requests')).toMatchObject({ status: 'live', capability: { part: 'MS-TGR-REQ', status: 'on_request' } })
    expect(by('POST /v1/trials')).toMatchObject({ status: 'planned', capability: { part: 'MS-TT-SIM', status: 'planned' } })
    expect(by('GET /mcp')).toMatchObject({ status: 'planned', capability: { part: 'MS-MCP', status: 'planned' } })
    expect(by('GET /v1/cells')).toMatchObject({ status: 'live', capability: { part: 'MS-RV-SO101', status: 'waitlist' } })
    expect(by('GET /v1/concept')).toMatchObject({ status: 'concept', capability: { part: 'MS-CONCEPT', status: 'concept' } })
    for (const r of CONCEPT_ROUTES) {
      expect(by(`${r.method} /v1/concept${r.sub}`)).toBeUndefined()
      expect(by(`${r.method} /v1${r.sub}`)).toBeUndefined()
    }
    expect(by('POST /v1/waitlist')).toMatchObject({ status: 'concept' })
  })

  it('routes every endpoint it lists (no endpoint answers ERR_NOT_FOUND)', async () => {
    const sample = (p: string) => p.replace('/v1/reports/:id/files/:name', `/v1/reports/${HERO}/files/report.md`).replace(':id', p.startsWith('/v1/cells') ? CELLS[0].id : p.includes('nodes') ? 'VTOL-260-TX-04' : HERO)
    for (const e of ENDPOINTS) {
      const method = e.method === 'WS' ? 'GET' : e.method
      const init: RequestInit = method === 'POST' ? { method, body: '{}', headers: { 'content-type': 'application/json' } } : { method }
      const { res } = await get(sample(e.path), init)
      const body = await res.text()
      expect(res.status, `${e.method} ${e.path}: ${body}`).not.toBe(404)
      expect(res.status, `${e.method} ${e.path}`).not.toBe(405)
    }
  })
})

describe('GET /v1/reports', () => {
  it('serves the generated index, with CORS, not cached', async () => {
    const res = await call('/v1/reports')
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
    const body = await res.json<ReportIndex>()
    expect(body).toEqual(JSON.parse(JSON.stringify(REPORT_INDEX)))
    expect(body.counts).toMatchObject({ reported: 18, rejected: 5, so101: 5, so100: 13 })
    expect(body.reports.every((r) => r.status === 'ok')).toBe(true)
    expect(body.rejected.every((r) => r.status === 'unsupported' && r.reason.length > 0)).toBe(true)
  })
})

describe('GET /v1/reports/:id and its files', () => {
  it('serves report.json byte for byte with ETag = sha256 and short caching', async () => {
    const s = summary(HERO)
    const { res, seen } = await get(`/v1/reports/${HERO}`)
    expect(res.status).toBe(200)
    expect(seen).toEqual([reportFileUrl(HERO, 'report.json')])
    expect(res.headers.get('content-type')).toBe('application/json; charset=utf-8')
    expect(res.headers.get('etag')).toBe(`"${s.files['report.json']!.sha256}"`)
    expect(res.headers.get('cache-control')).toBe(FILE_CACHE)
    expect(res.headers.get('x-meatspace-content-sha256')).toBe(s.hashes.content_sha256)
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
    const text = await res.text()
    expect(text).toBe(heroReport)
    expect(await sha256(text)).toBe(s.files['report.json']!.sha256)
    const rep = JSON.parse(text) as TwinGapReport
    expect(rep.content_sha256).toBe(s.hashes.content_sha256)
    expect(rep.headline!.sets.future.calibrated.mean).toBe((s.status === 'ok' && s.future.rmse_deg.calibrated.mean) || NaN)
  })

  it('serves the strict-JSON copy where the lab file holds NaN or Infinity', async () => {
    const s = summary(STRICT)
    expect(s.json_file).toBe('report.strict.json')
    expect(() => JSON.parse(carolineReport)).toThrow()
    expect(await sha256(carolineStrict)).toBe(s.files['report.strict.json']!.sha256)
    const { res } = await get(`/v1/reports/${STRICT}`)
    expect(res.status).toBe(200)
    expect(res.headers.get('etag')).toBe(`"${s.files['report.strict.json']!.sha256}"`)
    const rep = JSON.parse(await res.text()) as TwinGapReport
    expect(rep.content_sha256).toBe(s.hashes.content_sha256)
    // the original bytes stay available
    const raw = await get(`/v1/reports/${STRICT}/files/report.json`)
    expect(await raw.res.text()).toBe(carolineReport)
  })

  it('answers If-None-Match with 304, and caches for a year when the URL names the sha256', async () => {
    const tag = summary(HERO).files['report.json']!.sha256
    const r304 = await get(`/v1/reports/${HERO}`, { headers: { 'if-none-match': `W/"x", "${tag}"` } })
    expect(r304.res.status).toBe(304)
    expect(r304.seen).toEqual([])
    expect(await r304.res.text()).toBe('')
    expect(r304.res.headers.get('etag')).toBe(`"${tag}"`)
    const pinned = await get(`/v1/reports/${HERO}?sha256=${tag}`)
    expect(pinned.res.headers.get('cache-control')).toBe(FILE_CACHE_IMMUTABLE)
    await pinned.res.arrayBuffer()
    expect(pinned.res.headers.get('content-security-policy')).toContain('sandbox')
    expect(pinned.res.headers.get('x-frame-options')).toBe('DENY')
    // A pin that names other bytes is never answered with the current ones.
    const stale = await get(`/v1/reports/${HERO}?sha256=${'0'.repeat(64)}`)
    const err = await expectApiError(stale.res, 404, 'ERR_FILE_NOT_FOUND')
    expect(err.message).toContain(tag)
    expect(stale.seen).toEqual([])
    const plain = await get(`/v1/reports/${HERO}`)
    expect(plain.res.headers.get('cache-control')).toBe(FILE_CACHE)
    await plain.res.arrayBuffer()
  })

  it('GET /v1/reports/:id/twin serves calibrated_twin.json; the package hash is the one report.json names', async () => {
    const { res } = await get(`/v1/reports/${HERO}/twin`)
    expect(res.status).toBe(200)
    const pkg = await res.json<{ schema: string; sha256: string; twin: string }>()
    expect(pkg).toMatchObject({ schema: 'meatspace.calibrated-twin/v1', twin: 'robotstudio_so101', sha256: summary(HERO).hashes.package_sha256 })
  })

  it('GET /v1/reports/:id/trace serves trace.json, made from this report, with RMSE that recomputes from its series', async () => {
    const { res } = await get(`/v1/reports/${HERO}/trace`)
    expect(res.status).toBe(200)
    const tr = await res.json<TwinTrace>()
    const s = summary(HERO)
    expect(tr.schema).toBe('meatspace.twin-trace/v1')
    expect(tr.provenance.report_content_sha256).toBe(s.hashes.content_sha256)
    expect(tr.sha256).toBe(s.hashes.trace_sha256)
    expect(tr.decimation).toBe(1)
    const rep = JSON.parse(heroReport) as TwinGapReport
    const row = rep.episodes!.find((e) => e.episode === tr.episode.index && e.set === 'future')!
    traceRmse(tr, 'stock').forEach((v, j) => expect(Math.abs(v - row.stock_rmse_deg[j]), `stock ${j}`).toBeLessThan(0.01))
    traceRmse(tr, 'cal').forEach((v, j) => expect(Math.abs(v - row.calibrated_rmse_deg[j]), `cal ${j}`).toBeLessThan(0.01))
    traceRmse(tr, 'baseline').forEach((v, j) => expect(Math.abs(v - row.baseline_rmse_deg[j]), `baseline ${j}`).toBeLessThan(0.01))
  })

  it('GET /v1/reports/:id/files/:name serves published files with their content type, HEAD without a body', async () => {
    const svg = await get(`/v1/reports/${HERO}/files/heldout_episode.svg`)
    expect(svg.res.status).toBe(200)
    expect(svg.res.headers.get('content-type')).toBe('image/svg+xml')
    expect(await svg.res.text()).toBe(heroSvg)
    const md = await get(`/v1/reports/${HERO}/files/report.md`, { method: 'HEAD' })
    expect(md.res.status).toBe(200)
    expect(md.res.headers.get('content-type')).toBe('text/markdown; charset=utf-8')
    expect(await md.res.text()).toBe('')
  })

  it('404s: unknown report, unknown file name, and the twin or trace of a rejected report', async () => {
    await expectApiError((await get('/v1/reports/nobody__nothing')).res, 404, 'ERR_REPORT_NOT_FOUND')
    await expectApiError((await get('/v1/reports/nobody__nothing/twin')).res, 404, 'ERR_REPORT_NOT_FOUND')
    await expectApiError((await get(`/v1/reports/${HERO}/files/secrets.txt`)).res, 404, 'ERR_FILE_NOT_FOUND')
    await expectApiError((await get(`/v1/reports/${HERO}/files/..%2F..%2Findex.html`)).res, 404, 'ERR_FILE_NOT_FOUND')
    const twin = await expectApiError((await get(`/v1/reports/${REJECTED}/twin`)).res, 404, 'ERR_FILE_NOT_FOUND')
    expect(twin.message).toContain('rejected')
    await expectApiError((await get(`/v1/reports/${REJECTED}/trace`)).res, 404, 'ERR_FILE_NOT_FOUND')
    // a rejected report itself is served: its reason is the result
    const { res } = await get(`/v1/reports/${REJECTED}`)
    expect(res.status).toBe(200)
    expect((await res.json<TwinGapReport>()).status).toBe('unsupported')
  })

  it('never serves the SPA shell as data: a file missing from the deploy is a 500', async () => {
    const { res } = await get(`/v1/reports/${HERO}`, {}, {})
    await expectApiError(res, 500, 'ERR_INTERNAL')
  })

  it('wrong methods get 405 with allow', async () => {
    const { res } = await get(`/v1/reports/${HERO}`, { method: 'POST' })
    expect(res.headers.get('allow')).toBe('GET, HEAD')
    await expectApiError(res, 405, 'ERR_METHOD_NOT_ALLOWED')
  })
})

describe('GET /v1/cells', () => {
  it('lists the one planned cell with honest lane statuses from shared/status.ts', async () => {
    const res = await call('/v1/cells')
    expect(res.status).toBe(200)
    const { cells } = await res.json<{ cells: { id: string; twin: string; trials: string; real: string; lanes: Record<string, { status: string }> }[] }>()
    expect(cells.map((c) => c.id)).toEqual(['so101-pick-v1'])
    expect(cells[0]).toMatchObject({ twin: 'planned', trials: 'planned', real: 'waitlist' })
    expect(cells[0].lanes.real.status).toBe(apiStatus(CAPABILITIES.find((c) => c.part === 'MS-RV-SO101')!.status))
    const one = await call('/v1/cells/so101-pick-v1')
    expect(await one.json()).toEqual(cells[0])
    await expectApiError(await call('/v1/cells/franka-v9'), 404, 'ERR_CELL_NOT_FOUND')
  })
})

describe('planned endpoints answer 501 and say where to go', () => {
  it.each([
    ['POST', '/v1/trials'],
    ['GET', '/v1/trials/tr_123'],
    ['GET', '/v1/cells/so101-pick-v1/twin'],
    ['GET', '/mcp'],
    ['POST', '/mcp'],
    ['GET', '/mcp/tools'],
  ])('%s %s -> 501 ERR_NOT_IMPLEMENTED', async (method, path) => {
    const res = await call(path, { method, ...(method === 'POST' ? { body: '{}' } : {}) })
    expect(res.headers.get('link')).toBe('<https://meatspace.sh/cells>; rel="help"')
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    const err = await expectApiError(res, 501, 'ERR_NOT_IMPLEMENTED')
    expect(err.message).toContain('https://meatspace.sh/cells')
    expect(err.message).toMatch(/planned/)
  })

  it('GET /v1/trials is 405 (allow POST)', async () => {
    const res = await call('/v1/trials')
    expect(res.headers.get('allow')).toBe('POST')
    await expectApiError(res, 405, 'ERR_METHOD_NOT_ALLOWED')
  })
})

describe('v0.1 concept API under /v1/concept, old paths redirect there', () => {
  it('GET /v1/concept lists only concept endpoints and says it is a simulation', async () => {
    const res = await call('/v1/concept')
    expect(res.status).toBe(200)
    expect(res.headers.get('x-meatspace-status')).toBe('concept')
    const body = await res.json<{ concept: boolean; sandbox: boolean; status: string; endpoints: { status: string }[] }>()
    expect(body).toMatchObject({ concept: true, sandbox: true, status: 'concept' })
    expect(body.endpoints.length).toBe(ENDPOINTS.filter((e) => e.status === 'CONCEPT').length)
    expect(body.endpoints.every((e) => e.status === 'concept')).toBe(true)
  })

  it('GET /v1/concept lists every concept path and the v0.1 paths that redirect to them', async () => {
    const body = await (await call('/v1/concept')).json<{ endpoints: { method: string; path: string; alias_of?: string }[] }>()
    for (const r of CONCEPT_ROUTES) {
      expect(body.endpoints.some((e) => e.path === `/v1/concept${r.sub}`)).toBe(true)
      expect(body.endpoints.find((e) => e.path === `/v1${r.sub}`)).toMatchObject({ alias_of: `/v1/concept${r.sub}` })
    }
  })

  it.each([
    ['GET', '/v1/snapshot', '/v1/concept/snapshot'],
    ['GET', '/v1/nodes', '/v1/concept/nodes'],
    ['GET', '/v1/nodes/VTOL-260-TX-04?x=1', '/v1/concept/nodes/VTOL-260-TX-04?x=1'],
    ['GET', '/v1/stats', '/v1/concept/stats'],
    ['GET', '/v1/stream', '/v1/concept/stream'],
    ['POST', '/v1/dispatch', '/v1/concept/dispatch'],
  ])('%s %s answers 308 to %s (method and body kept), marked concept', async (method, from, to) => {
    const res = await call(from, { method, redirect: 'manual' })
    expect(res.status).toBe(308)
    expect(res.headers.get('location')).toBe(to)
    expect(res.headers.get('x-meatspace-status')).toBe('concept')
    const body = await res.json<{ moved: boolean; message: string }>()
    expect(body.moved).toBe(true)
    expect(body.message).not.toMatch(/escrow|usdc|attestation|\btpm\b/i)
  })

  it.each(['/snapshot', '/nodes', '/stats'])('GET /v1/concept%s answers, marked concept', async (sub) => {
    const a = await call(`/v1/concept${sub}`)
    expect(a.status).toBe(200)
    expect(a.headers.get('x-meatspace-status')).toBe('concept')
  })

  it('one fictional machine, the stream upgrade check and the dispatch parser answer under /v1/concept', async () => {
    expect((await call('/v1/concept/nodes/VTOL-260-TX-04')).status).toBe(200)
    await expectApiError(await call('/v1/concept/nodes/NOPE-404'), 404, 'ERR_NODE_NOT_FOUND')
    const ws = await call('/v1/concept/stream')
    expect(ws.headers.get('upgrade')).toBe('websocket')
    await expectApiError(ws, 426, 'ERR_UPGRADE_REQUIRED')
    const d = await postJson('/v1/concept/dispatch', { primitive: 'NOPE' })
    expect(d.headers.get('x-meatspace-status')).toBe('concept')
    await expectApiError(d, 400, 'ERR_SCHEMA')
  })

  it('v0.2 endpoints are not marked concept', async () => {
    expect((await call('/v1/reports')).headers.get('x-meatspace-status')).toBeNull()
    expect((await call('/v1/cells')).headers.get('x-meatspace-status')).toBeNull()
  })

  it('error bodies stay ApiErrorBody everywhere', async () => {
    const res = await call('/v1/concept/nope')
    const body = await res.json<ApiErrorBody>()
    expect(res.status).toBe(404)
    expect(body.error.code).toBe('ERR_NOT_FOUND')
  })
})
