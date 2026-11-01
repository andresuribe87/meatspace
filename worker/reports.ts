import { findReport, FILE_CONTENT_TYPES, REPORT_FILE_NAMES, reportFileUrl, type ReportFileName, type ReportSummary } from '../shared/reports'
import { REPORT_INDEX } from '../shared/reports.generated'
import { ApiError, type AppContext } from './http'

/** Report files are immutable per sha256; the URL is not, so they revalidate after 5 minutes. */
export const FILE_CACHE = 'public, max-age=300'
/** `?sha256=<hash>` names one exact version: cache it for a year. */
export const FILE_CACHE_IMMUTABLE = 'public, max-age=31536000, immutable'

/**
 * Report files are data, never a page: an SVG or markdown file opened at its /v1 URL runs no script and cannot be
 * framed (the same bytes under /data/reports carry the site CSP from public/_headers).
 */
export const FILE_SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox",
  'x-frame-options': 'DENY',
}

export function getSummary(id: string): ReportSummary {
  const s = findReport(REPORT_INDEX, id)
  if (!s) throw new ApiError(404, 'ERR_REPORT_NOT_FOUND', `no report with id ${id}; ids are owner__name, see GET /v1/reports`)
  return s
}

const isFileName = (name: string): name is ReportFileName => (REPORT_FILE_NAMES as readonly string[]).includes(name)

/**
 * Serves one published file from the static assets, byte for byte, with a strong ETag (sha256 of the bytes, recorded
 * by the build), 304 on If-None-Match, and the file's content type. Only files the build recorded are fetched, so the
 * asset layer's SPA fallback can never be served as data.
 */
export async function serveFile(c: AppContext, s: ReportSummary, name: ReportFileName, what: string = name): Promise<Response> {
  const meta = s.files[name]
  if (!meta) {
    const why = s.status === 'unsupported' ? ` (the report was rejected: ${s.reason_short})` : ''
    throw new ApiError(404, 'ERR_FILE_NOT_FOUND', `report ${s.id} publishes no ${what}${why}`)
  }
  const etag = `"${meta.sha256}"`
  const pinned = c.req.query('sha256')
  // A pin names one exact version: never answer it with other bytes (a lab re-run changes the file, not the URL).
  if (pinned !== undefined && pinned !== meta.sha256) {
    throw new ApiError(404, 'ERR_FILE_NOT_FOUND', `report ${s.id} has no ${what} with sha256 ${pinned}; the published one is ${meta.sha256}`, {
      headers: { 'cache-control': 'no-store' },
    })
  }
  const headers: Record<string, string> = {
    etag,
    'cache-control': pinned === meta.sha256 ? FILE_CACHE_IMMUTABLE : FILE_CACHE,
    'x-meatspace-sha256': meta.sha256,
    ...FILE_SECURITY_HEADERS,
  }
  if (name === 'report.json' || name === 'report.strict.json') headers['x-meatspace-content-sha256'] = s.hashes.content_sha256
  const inm = c.req.header('if-none-match')
  if (inm && inm.split(',').some((t) => t.trim().replace(/^W\//, '') === etag)) return new Response(null, { status: 304, headers })
  const asset = await c.env.ASSETS.fetch(new Request(new URL(reportFileUrl(s.id, name), c.req.url), { method: 'GET' }))
  if (asset.status !== 200 || (asset.headers.get('content-type') ?? '').includes('text/html')) {
    await asset.body?.cancel()
    console.error('report file missing from the static assets', s.id, name, asset.status)
    throw new ApiError(500, 'ERR_INTERNAL', `${name} of ${s.id} is missing from this deploy`)
  }
  return new Response(asset.body, { status: 200, headers: { ...headers, 'content-type': FILE_CONTENT_TYPES[name] } })
}

export function handleReports(c: AppContext): Response {
  return c.json(REPORT_INDEX)
}

export function handleReport(c: AppContext): Promise<Response> {
  const s = getSummary(c.req.param('id') ?? '')
  return serveFile(c, s, s.json_file, 'report.json')
}

export function handleTwin(c: AppContext): Promise<Response> {
  return serveFile(c, getSummary(c.req.param('id') ?? ''), 'calibrated_twin.json', 'calibrated twin package')
}

export function handleTrace(c: AppContext): Promise<Response> {
  return serveFile(c, getSummary(c.req.param('id') ?? ''), 'trace.json', 'trace')
}

export function handleFile(c: AppContext): Promise<Response> {
  const s = getSummary(c.req.param('id') ?? '')
  const name = c.req.param('name') ?? ''
  if (!isFileName(name)) {
    throw new ApiError(404, 'ERR_FILE_NOT_FOUND', `no file ${name}; published names: ${Object.keys(s.files).join(', ')}`)
  }
  return serveFile(c, s, name)
}
