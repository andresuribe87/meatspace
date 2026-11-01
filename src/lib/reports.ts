/**
 * Client access to the Twin Gap Reports.
 *
 * - The index (summaries, counts, aggregates, rejected list) is compiled into the bundle from
 *   shared/reports.generated.ts, which the build writes from lab/reports: `useReportIndex()` is synchronous.
 * - Full files (report.json, trace.json, calibrated_twin.json) are static assets under /data/reports/<id>/, fetched on
 *   demand, checked against the sha256 the index recorded (when the browser offers SubtleCrypto), and cached per URL.
 *
 * Fetchers throw `ReportFetchError`; the hooks fold every outcome into `Loadable<T>` and never throw.
 * Types and pure helpers (verdict words, Reading adapters, provenance strings): shared/reports.ts.
 */
import { useEffect, useState } from 'react'

import {
  findReport,
  REPORT_INDEX_PATH,
  reportApiPaths,
  reportFileUrl,
  type CalibratedTwinPackage,
  type OkReportSummary,
  type ReportFileName,
  type ReportIndex,
  type ReportSummary,
  type TwinGapReport,
  type TwinTrace,
} from '../../shared/reports'
import { REPORT_INDEX } from '../../shared/reports.generated'

export { REPORT_INDEX }

/** Every report summary, counts and aggregates. Synchronous: the data ships in the bundle. */
export function useReportIndex(): ReportIndex {
  return REPORT_INDEX
}

/** Summary of one report (ok or rejected), or undefined for an unknown id. */
export function getReportSummary(id: string): ReportSummary | undefined {
  return findReport(REPORT_INDEX, id)
}

/** The report featured on the home page (status ok, guaranteed by the build). */
export function heroReport(): OkReportSummary {
  return REPORT_INDEX.reports.find((r) => r.id === REPORT_INDEX.hero.id)!
}

/** Static URL of a published file, or null when the report does not publish it. */
export function reportFileHref(id: string, name: ReportFileName): string | null {
  const s = getReportSummary(id)
  return s?.files[name] ? reportFileUrl(id, name) : null
}

/** Download URL of the calibrated twin package (null for a rejected report: it has none). */
export function twinPackageUrl(id: string): string | null {
  return reportFileHref(id, 'calibrated_twin.json')
}

/** Absolute API URLs for one report, for curl blocks (`origin` defaults to https://meatspace.sh). */
export function reportApiUrls(id: string, origin = 'https://meatspace.sh') {
  const p = reportApiPaths(id)
  return { report: origin + p.report, twin: origin + p.twin, trace: origin + p.trace, file: (name: ReportFileName) => origin + p.file(name) }
}

export { REPORT_INDEX_PATH }

/* ------------------------------------------------------------------------------------------------
 * Fetching
 * ---------------------------------------------------------------------------------------------- */

export type ReportFetchErrorKind = 'not_found' | 'network' | 'http' | 'parse' | 'integrity'

export class ReportFetchError extends Error {
  readonly kind: ReportFetchErrorKind
  /** HTTP status, 0 when the server was not reached. */
  readonly status: number

  constructor(kind: ReportFetchErrorKind, message: string, status = 0) {
    super(message)
    this.name = 'ReportFetchError'
    this.kind = kind
    this.status = status
  }
}

export interface FetchOptions {
  signal?: AbortSignal
  fetch?: typeof fetch
}

const cache = new Map<string, Promise<unknown>>()

async function sha256Hex(bytes: ArrayBuffer): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) return null // not a secure context: skip the check rather than fail
  const d = new Uint8Array(await subtle.digest('SHA-256', bytes))
  return Array.from(d, (b) => b.toString(16).padStart(2, '0')).join('')
}

async function fetchFile<T>(id: string, name: ReportFileName, opts: FetchOptions): Promise<T> {
  const summary = getReportSummary(id)
  if (!summary) throw new ReportFetchError('not_found', `No report with id ${id}.`, 404)
  const meta = summary.files[name]
  if (!meta) throw new ReportFetchError('not_found', `Report ${id} publishes no ${name}.`, 404)
  const url = reportFileUrl(id, name)
  const f = opts.fetch ?? fetch
  let res: Response
  try {
    // no-cache: always revalidate (a 304 when unchanged). A copy cached before a deploy that re-ran this report
    // would otherwise fail the sha256 check against the new bundle.
    res = await f(url, { signal: opts.signal, cache: 'no-cache', headers: { accept: 'application/json' } })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new ReportFetchError('network', `Could not load ${name}: the network request failed.`)
  }
  if (!res.ok) throw new ReportFetchError(res.status === 404 ? 'not_found' : 'http', `${url} answered HTTP ${res.status}.`, res.status)
  // The asset layer answers unknown paths with the SPA shell (200 text/html): never parse that as data.
  if ((res.headers.get('content-type') ?? '').includes('text/html')) throw new ReportFetchError('not_found', `${url} is not published.`, 404)
  const bytes = await res.arrayBuffer()
  const hash = await sha256Hex(bytes)
  if (hash !== null && hash !== meta.sha256) {
    throw new ReportFetchError('integrity', `${name} does not match the sha256 recorded at build time (${meta.sha256.slice(0, 12)}).`, res.status)
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as T
  } catch {
    throw new ReportFetchError('parse', `${name} is not valid JSON.`, res.status)
  }
}

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key) as Promise<T> | undefined
  if (hit) return hit
  const p = load()
  cache.set(key, p)
  p.catch(() => cache.delete(key)) // failures are retried on the next call
  return p
}

/** report.json (the strict-JSON copy where the lab file holds NaN / Infinity). */
export function fetchReport(id: string, opts: FetchOptions = {}): Promise<TwinGapReport> {
  const s = getReportSummary(id)
  const name = s?.json_file ?? 'report.json'
  return opts.fetch ? fetchFile(id, name, opts) : cached(`${id}/${name}`, () => fetchFile<TwinGapReport>(id, name, {}))
}

/** trace.json: per-frame command, real, stock, baseline and calibrated series of one held-out episode. */
export function fetchTrace(id: string, opts: FetchOptions = {}): Promise<TwinTrace> {
  return opts.fetch ? fetchFile(id, 'trace.json', opts) : cached(`${id}/trace.json`, () => fetchFile<TwinTrace>(id, 'trace.json', {}))
}

/** calibrated_twin.json, schema meatspace.calibrated-twin/v1. */
export function fetchTwinPackage(id: string, opts: FetchOptions = {}): Promise<CalibratedTwinPackage> {
  return opts.fetch
    ? fetchFile(id, 'calibrated_twin.json', opts)
    : cached(`${id}/calibrated_twin.json`, () => fetchFile<CalibratedTwinPackage>(id, 'calibrated_twin.json', {}))
}

/* ------------------------------------------------------------------------------------------------
 * Hooks
 * ---------------------------------------------------------------------------------------------- */

export type Loadable<T> =
  | { state: 'loading' }
  | { state: 'ready'; data: T }
  | { state: 'error'; kind: ReportFetchErrorKind; message: string; status: number }

const LOADERS = { report: fetchReport, trace: fetchTrace, twin: fetchTwinPackage } as const
type LoaderKind = keyof typeof LOADERS
type Loaded<K extends LoaderKind> = Awaited<ReturnType<(typeof LOADERS)[K]>>

/** `id` null: the build knows there is nothing to load (unknown report, or no such file). */
function useLoad<K extends LoaderKind>(kind: K, id: string | null): Loadable<Loaded<K>> {
  const [st, setSt] = useState<{ id: string | null; value: Loadable<Loaded<K>> }>({ id, value: { state: 'loading' } })
  useEffect(() => {
    if (id === null) return
    let live = true
    ;(LOADERS[kind](id) as Promise<Loaded<K>>).then(
      (data) => live && setSt({ id, value: { state: 'ready', data } }),
      (e: unknown) => {
        if (!live) return
        const err = e instanceof ReportFetchError ? e : new ReportFetchError('network', e instanceof Error ? e.message : String(e))
        setSt({ id, value: { state: 'error', kind: err.kind, message: err.message, status: err.status } })
      },
    )
    return () => {
      live = false
    }
  }, [kind, id])
  if (id === null) return { state: 'error', kind: 'not_found', message: 'Not published for this report.', status: 404 }
  return st.id === id ? st.value : { state: 'loading' }
}

/** Full report.json of one report; `not_found` for an unknown id without a request. */
export function useReport(id: string): Loadable<TwinGapReport> {
  return useLoad('report', getReportSummary(id) ? id : null)
}

/** trace.json of an ok report; `not_found` for a rejected report or one without a trace. */
export function useTrace(id: string): Loadable<TwinTrace> {
  return useLoad('trace', getReportSummary(id)?.files['trace.json'] ? id : null)
}

/** calibrated_twin.json of an ok report; `not_found` for a rejected report. */
export function useTwinPackage(id: string): Loadable<CalibratedTwinPackage> {
  return useLoad('twin', getReportSummary(id)?.files['calibrated_twin.json'] ? id : null)
}
