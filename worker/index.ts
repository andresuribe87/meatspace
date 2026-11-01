/**
 * meatspace.sh Worker: the v0.2 /v1 API, /mcp (planned), /install.sh, /docs (man page for curl, SPA for browsers),
 * /healthz, and the v0.1 concept API under /v1/concept (the old v0.1 paths answer 308 to it).
 * Every other path is served by Workers Static Assets without invoking this Worker (run_worker_first), including the
 * report files under /data/reports, which /v1/reports/* also serves through the ASSETS binding.
 */
import { Hono, type MiddlewareHandler } from 'hono'

import { CELLS, cellWire, CONCEPT_ROUTES, ENDPOINTS, endpointWire, INDEX_ENDPOINTS } from '../shared/api'
import { renderManText } from '../shared/manpage'
import { REPORT_INDEX } from '../shared/reports.generated'
import { apiStatus, CAPABILITIES } from '../shared/status'
import { handleDispatch } from './dispatch'
import { ApiError, type AppContext, type AppEnv, apiHeaders, errorResponse, fromAssets, securityHeaders, textResponse } from './http'
import { INSTALL_SH } from './install'
import { ORIGIN, VERSION } from './meta'
import { handleFile, handleReport, handleReports, handleTrace, handleTwin } from './reports'
import { handleRequest } from './requests'
import { handleWaitlist } from './waitlist'

export { NetworkState } from './network'

const DOCS_TITLE = 'MEATSPACE(1) // meatspace.sh'

const API_INDEX = {
  name: 'meatspace.sh',
  version: VERSION,
  description: 'Twin-first sim-to-real verification. Twin Gap Reports and calibrated twins from public LeRobot data; real-robot runs by waitlist.',
  docs: `${ORIGIN}/docs`,
  reports: { count: REPORT_INDEX.counts.reported, rejected: REPORT_INDEX.counts.rejected, generated_at: REPORT_INDEX.generated_at, url: `${ORIGIN}/v1/reports` },
  capabilities: CAPABILITIES.map((c) => ({ part: c.part, name: c.name, status: apiStatus(c.status), scope: c.scope })),
  endpoints: INDEX_ENDPOINTS.map(endpointWire),
  concept: `${ORIGIN}/v1/concept`,
}

const CONCEPT_INDEX = {
  name: 'meatspace.sh v0.1 concept API',
  status: 'concept',
  concept: true,
  sandbox: true,
  description:
    'The v0.1 idea for meatspace.sh, kept for the record: a simulated dispatch marketplace. Nothing here is a product: no machine moves and nothing is charged. The v0.1 paths without /concept answer 308 Permanent Redirect to the same path under /v1/concept.',
  page: `${ORIGIN}/concept`,
  endpoints: ENDPOINTS.filter((e) => e.status === 'CONCEPT').map(endpointWire),
  current_api: `${ORIGIN}/v1`,
}

const PLANNED: Readonly<Record<string, string>> = {
  '/v1/trials':
    'POST /v1/trials is planned and not built. Hosted twin trials need a container host for MuJoCo, which this Worker is not, and the real lane needs the SO-101 cell, which is not purchased. Status: https://meatspace.sh/cells. Join the pilot waitlist: POST /v1/requests with {"kind":"pilot"} or https://meatspace.sh/#request-pilot',
  '/v1/trials/:id': 'Trial runs are planned and not built, so there are no trial ids yet. Status: https://meatspace.sh/cells',
  '/v1/cells/:id/twin':
    "A cell's own calibrated twin is planned: it will be fitted on our SO-101 unit, which is not purchased. Calibrated twins of the arms behind the published reports: GET /v1/reports/:id/twin. Status: https://meatspace.sh/cells",
  '/mcp': 'The MCP server is planned and not built. Reports are JSON today: GET https://meatspace.sh/v1/reports. Status: https://meatspace.sh/cells',
}

function planned(route: string) {
  return (c: AppContext) => {
    // Counted as a demand signal: method and route only, nothing about the caller.
    console.log(JSON.stringify({ event: 'planned_endpoint', method: c.req.method, route }))
    throw new ApiError(501, 'ERR_NOT_IMPLEMENTED', PLANNED[route], { headers: { link: `<${ORIGIN}/cells>; rel="help"`, 'cache-control': 'no-store' } })
  }
}

/** Paths this Worker owns, with the methods each accepts (HEAD is served by the GET handler). */
const ALLOW: Readonly<Record<string, string>> = {
  '/healthz': 'GET, HEAD',
  '/install.sh': 'GET, HEAD',
  '/docs': 'GET, HEAD',
  '/v1': 'GET, HEAD',
  '/v1/reports': 'GET, HEAD',
  '/v1/reports/:id': 'GET, HEAD',
  '/v1/reports/:id/twin': 'GET, HEAD',
  '/v1/reports/:id/trace': 'GET, HEAD',
  '/v1/reports/:id/files/:name': 'GET, HEAD',
  '/v1/cells': 'GET, HEAD',
  '/v1/cells/:id': 'GET, HEAD',
  '/v1/cells/:id/twin': 'GET, HEAD',
  '/v1/requests': 'POST',
  '/v1/trials': 'POST',
  '/v1/trials/:id': 'GET, HEAD',
  '/v1/concept': 'GET, HEAD',
  '/v1/waitlist': 'POST',
  ...Object.fromEntries(
    CONCEPT_ROUTES.map((r) => [`/v1/concept${r.sub}`, r.method === 'POST' ? 'POST' : r.method === 'WS' ? 'GET' : 'GET, HEAD']),
  ),
}

const network = (env: Env) => env.NETWORK.getByName('global')

const app = new Hono<AppEnv>()

app.use(securityHeaders)
app.use('/v1/*', apiHeaders) // also matches /v1 itself

/** Every concept response says so in a header (bodies keep their v0.1 shape for the /concept page and old scripts). */
const conceptHeader: MiddlewareHandler<AppEnv> = async (c, next) => {
  await next()
  if (c.res.status !== 101) c.res.headers.set('x-meatspace-status', 'concept')
}
app.use('/v1/concept/*', conceptHeader) // also matches /v1/concept
app.use('/v1/waitlist', conceptHeader)
for (const r of CONCEPT_ROUTES) app.use(`/v1${r.sub}`, conceptHeader)

// run_worker_first sends the trailing-slash forms here too (assets would answer with the SPA shell).
for (const path of ['/docs', '/install.sh', '/healthz']) {
  app.all(`${path}/`, (c) => c.redirect(`${path}${new URL(c.req.url).search}`, 301))
}

app.get('/healthz', () => textResponse('ok', 'no-store'))

app.get('/install.sh', () => textResponse(INSTALL_SH, 'public, max-age=300'))

/** Browsers (Accept includes text/html) get the SPA route; curl and ?format=txt get the plain-text man page. */
app.get('/docs', async (c) => {
  const html = c.req.query('format') !== 'txt' && (c.req.header('accept') ?? '').includes('text/html')
  const res = html ? docsHtml(await fromAssets(c)) : textResponse(renderManText(), 'public, max-age=300')
  res.headers.append('vary', 'accept')
  return res
})

/** The SPA shell is shared with "/": point its canonical URL, og:url and title at /docs so crawlers don't fold it into the home page. */
function docsHtml(res: Response): Response {
  const url = `${ORIGIN}/docs`
  return new HTMLRewriter()
    .on('link[rel="canonical"]', { element: (e) => void e.setAttribute('href', url) })
    .on('meta[property="og:url"]', { element: (e) => void e.setAttribute('content', url) })
    .on('title', { element: (e) => void e.setInnerContent(DOCS_TITLE) })
    .transform(res)
}

/* ---- v0.2 ---------------------------------------------------------------------------------- */

app.get('/v1', (c) => c.json(API_INDEX))

app.get('/v1/reports', handleReports)
app.get('/v1/reports/:id', handleReport)
app.get('/v1/reports/:id/twin', handleTwin)
app.get('/v1/reports/:id/trace', handleTrace)
app.get('/v1/reports/:id/files/:name', handleFile)

app.get('/v1/cells', (c) => c.json({ cells: CELLS.map(cellWire) }))
app.get('/v1/cells/:id/twin', planned('/v1/cells/:id/twin'))
app.get('/v1/cells/:id', (c) => {
  const id = c.req.param('id')
  const cell = CELLS.find((x) => x.id === id)
  if (!cell) throw new ApiError(404, 'ERR_CELL_NOT_FOUND', `no cell ${id}; see GET /v1/cells`)
  return c.json(cellWire(cell))
})

app.post('/v1/requests', handleRequest)

app.post('/v1/trials', planned('/v1/trials'))
app.get('/v1/trials/:id', planned('/v1/trials/:id'))
app.all('/mcp', planned('/mcp'))
app.all('/mcp/*', planned('/mcp'))

/* ---- v0.1 concept (simulated), at /v1/concept/*; the old /v1/* paths redirect there ------------- */

app.get('/v1/concept', (c) => c.json(CONCEPT_INDEX))

/**
 * The v0.1 paths (/v1/dispatch, /v1/stream, ...) answer 308 Permanent Redirect to /v1/concept/*, any method: the
 * concept's words stay under /concept, and `curl -L` (method and body kept by 308) still works for old scripts.
 */
for (const r of CONCEPT_ROUTES) {
  {
    app.all(`/v1${r.sub}`, (c) => {
      const url = new URL(c.req.url)
      const to = `${url.pathname.replace(/^\/v1\//, '/v1/concept/')}${url.search}`
      return c.json(
        { moved: true, location: `${ORIGIN}${to}`, status: 'concept', message: `${url.pathname} moved to ${to}: the v0.1 API is a simulation and lives under /v1/concept.` },
        308,
        { location: to, 'cache-control': 'no-store' },
      )
    })
  }
}

for (const prefix of ['/v1/concept']) {
  app.get(`${prefix}/snapshot`, async (c) => c.json(await network(c.env).snapshot()))

  app.get(`${prefix}/nodes`, async (c) => {
    const { nodes, ts } = await network(c.env).snapshot()
    return c.json({ nodes, ts })
  })

  app.get(`${prefix}/nodes/:id`, async (c) => {
    const id = c.req.param('id')
    const node = await network(c.env).node(id)
    if (!node) throw new ApiError(404, 'ERR_NODE_NOT_FOUND', `node ${id} does not exist in the simulator`)
    return c.json(node)
  })

  app.get(`${prefix}/stats`, async (c) => {
    const { stats, ts } = await network(c.env).snapshot()
    return c.json({ stats, ts })
  })

  app.get(`${prefix}/stream`, (c) => {
    if (c.req.header('upgrade')?.toLowerCase() !== 'websocket') {
      throw new ApiError(426, 'ERR_UPGRADE_REQUIRED', `${c.req.path} is a WebSocket endpoint; send "Upgrade: websocket"`, {
        headers: { upgrade: 'websocket' },
      })
    }
    return network(c.env).fetch(c.req.raw)
  })

  app.post(`${prefix}/dispatch`, handleDispatch)
}

app.post('/v1/waitlist', handleWaitlist)

// Registered after the real handlers, so these only match a known path with the wrong method.
for (const [path, allow] of Object.entries(ALLOW)) {
  app.all(path, (c) => {
    throw new ApiError(405, 'ERR_METHOD_NOT_ALLOWED', `${c.req.method} is not allowed on ${c.req.path}; allowed: ${allow}`, {
      headers: { allow },
    })
  })
}

app.notFound((c) => {
  const path = c.req.path
  if (path === '/v1' || path.startsWith('/v1/')) {
    return errorResponse(new ApiError(404, 'ERR_NOT_FOUND', `no such endpoint: ${c.req.method} ${path}; see GET /v1`))
  }
  return fromAssets(c)
})

app.onError((err) => {
  if (err instanceof ApiError) return errorResponse(err)
  console.error('unhandled error', err)
  return errorResponse(new ApiError(500, 'ERR_INTERNAL', 'internal error'))
})

export default { fetch: app.fetch } satisfies ExportedHandler<Env>
