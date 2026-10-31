/**
 * meatspace.sh Worker: /v1 API, /install.sh, /docs (man page for curl, SPA for browsers) and /healthz.
 * Every other path is served by Workers Static Assets without invoking this Worker (run_worker_first).
 */
import { Hono } from 'hono'

import { renderManText } from '../shared/manpage'
import { handleDispatch } from './dispatch'
import { ApiError, type AppEnv, apiHeaders, errorResponse, fromAssets, securityHeaders, textResponse } from './http'
import { INSTALL_SH } from './install'
import { ORIGIN, VERSION } from './meta'
import { handleWaitlist } from './waitlist'

export { NetworkState } from './network'

const DOCS_TITLE = 'MEATSPACE(1) // meatspace.sh'

const ENDPOINTS = [
  { method: 'GET', path: '/v1', description: 'This index.' },
  { method: 'GET', path: '/v1/snapshot', description: 'Full network snapshot: ticker stats and the live hardware orderbook.' },
  { method: 'GET', path: '/v1/nodes', description: 'Live hardware orderbook.' },
  { method: 'GET', path: '/v1/nodes/:id', description: 'One node by NODE_ID.' },
  { method: 'GET', path: '/v1/stats', description: 'Ticker stats: active nodes, available hours, 24h settled volume, latency.' },
  { method: 'GET', path: '/v1/stream', description: 'WebSocket. Pushes {"type":"snapshot"} frames every ~2 s; send "ping" for "pong".' },
  {
    method: 'POST',
    path: '/v1/dispatch',
    description: 'Task a node. Streams application/x-ndjson events: VALIDATE, ESCROW, COMPILE, ATTEST, then a receipt.',
  },
  { method: 'POST', path: '/v1/waitlist', description: 'Join the API key or hardware waitlist. Same-origin only.' },
] as const

const API_INDEX = { name: 'meatspace.sh', version: VERSION, sandbox: true, docs: `${ORIGIN}/docs`, endpoints: ENDPOINTS }

/** Paths this Worker owns, with the methods each accepts (HEAD is served by the GET handler). */
const ALLOW: Readonly<Record<string, string>> = {
  '/healthz': 'GET, HEAD',
  '/install.sh': 'GET, HEAD',
  '/docs': 'GET, HEAD',
  '/v1': 'GET, HEAD',
  '/v1/snapshot': 'GET, HEAD',
  '/v1/nodes': 'GET, HEAD',
  '/v1/nodes/:id': 'GET, HEAD',
  '/v1/stats': 'GET, HEAD',
  '/v1/stream': 'GET',
  '/v1/dispatch': 'POST',
  '/v1/waitlist': 'POST',
}

const network = (env: Env) => env.NETWORK.getByName('global')

const app = new Hono<AppEnv>()

app.use(securityHeaders)
app.use('/v1/*', apiHeaders)

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

app.get('/v1', (c) => c.json(API_INDEX))

app.get('/v1/snapshot', async (c) => c.json(await network(c.env).snapshot()))

app.get('/v1/nodes', async (c) => {
  const { nodes, ts } = await network(c.env).snapshot()
  return c.json({ nodes, ts })
})

app.get('/v1/nodes/:id', async (c) => {
  const id = c.req.param('id')
  const node = await network(c.env).node(id)
  if (!node) throw new ApiError(404, 'ERR_NODE_NOT_FOUND', `node ${id} is not registered with the clearinghouse`)
  return c.json(node)
})

app.get('/v1/stats', async (c) => {
  const { stats, ts } = await network(c.env).snapshot()
  return c.json({ stats, ts })
})

app.get('/v1/stream', (c) => {
  if (c.req.header('upgrade')?.toLowerCase() !== 'websocket') {
    throw new ApiError(426, 'ERR_UPGRADE_REQUIRED', '/v1/stream is a WebSocket endpoint; send "Upgrade: websocket"', {
      headers: { upgrade: 'websocket' },
    })
  }
  return network(c.env).fetch(c.req.raw)
})

app.post('/v1/dispatch', handleDispatch)

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
