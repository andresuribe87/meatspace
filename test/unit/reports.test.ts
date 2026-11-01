import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

import {
  canonical,
  contentSha256,
  loadReports,
  nonstandardTokens,
  parseLabJson,
  plan,
  selfSha256,
  shortReason,
  staleness,
  strictText,
  SyncError,
  toValue,
} from '../../scripts/sync-reports'
import {
  baselineVerdict,
  changeReadingOf,
  changeText,
  estText,
  gapVerdict,
  intervalOf,
  pct,
  pyFixed,
  readingOf,
  traceRmse,
  type Est,
  type OkReportSummary,
  type TwinTrace,
} from '../../shared/reports'
import { REPORT_INDEX } from '../../shared/reports.generated'
import { CAPABILITIES } from '../../shared/status'
import { fetchReport, fetchTrace, getReportSummary, ReportFetchError, twinPackageUrl } from '../../src/lib/reports'

const LAB = 'lab/reports'
const labJson = (id: string, name = 'report.json') => toValue(parseLabJson(readFileSync(join(LAB, id, name), 'utf8')))

/** Resolve `lab/reports/<id>/report.json#/a/b/0` against the lab file. */
function resolve(prov: string): unknown {
  const m = /^lab\/reports\/([^/]+)\/(report\.json)#(.*)$/.exec(prov)
  if (!m) throw new Error(`not a report pointer: ${prov}`)
  let v: unknown = labJson(m[1], m[2])
  for (const part of m[3].split('/').slice(1)) v = (v as Record<string, unknown>)[part.replace(/~1/g, '/').replace(/~0/g, '~')]
  return v
}

const tmp: string[] = []
afterAll(() => tmp.forEach((d) => rmSync(d, { recursive: true, force: true })))

describe('status truth (shared/status.ts)', () => {
  it('says exactly what is built', () => {
    expect(Object.fromEntries(CAPABILITIES.map((c) => [c.part, c.status]))).toEqual({
      'MS-TGR-1': 'LIVE',
      'MS-TWIN-PKG': 'LIVE',
      'MS-TGR-REQ': 'ON REQUEST',
      'MS-TT-SIM': 'PLANNED',
      'MS-RV-SO101': 'WAITLIST',
      'MS-MCP': 'PLANNED',
      'MS-CONCEPT': 'CONCEPT',
    })
  })
})

describe('sync-reports', () => {
  it('shared/reports.generated.ts is up to date with lab/reports (and public/data/reports, once synced)', () => {
    const stale = staleness(plan())
    expect(stale.filter((p) => !p.startsWith('public/'))).toEqual([])
    if (existsSync('public/data/reports/index.json')) expect(stale).toEqual([])
  })

  it('reproduces the lab hashes byte for byte (Python canonical JSON)', () => {
    for (const r of [...REPORT_INDEX.reports, ...REPORT_INDEX.rejected]) {
      const node = parseLabJson(readFileSync(join(LAB, r.id, 'report.json'), 'utf8'))
      expect(contentSha256(node), r.id).toBe(r.hashes.content_sha256)
    }
    // Python keeps 1.0 and 1e-05 as written and sorts keys by code point
    expect(canonical(parseLabJson('{"b": 1.0, "a": [1e-05, NaN, "x\\u00e9"], "B": null}'))).toBe('{"B":null,"a":[1e-05,NaN,"x\\u00e9"],"b":1.0}')
  })

  it('fails on an edited report, an unknown schema and a stale trace', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ms-sync-'))
    tmp.push(dir)
    const id = 'lerobot__svla_so101_pickplace'
    cpSync(join(LAB, id), join(dir, id), { recursive: true })
    // Publish dates live in lab data, not git: without one the build stops.
    expect(() => loadReports(dir)).toThrow(/published\.json is missing/)
    writeFileSync(join(dir, 'published.json'), JSON.stringify({ schema: 'meatspace.published/v1', dates: {} }))
    expect(() => loadReports(dir)).toThrow(/no publish date for lerobot__svla_so101_pickplace/)
    cpSync(join(LAB, 'published.json'), join(dir, 'published.json'))
    expect(loadReports(dir)[0].published).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    const file = join(dir, id, 'report.json')
    const original = readFileSync(file, 'utf8')
    writeFileSync(file, original.replace('"mean": 0.4583', '"mean": 0.4183'))
    expect(() => loadReports(dir)).toThrow(/content_sha256 does not match/)
    writeFileSync(file, original.replace('meatspace.twin-gap-report/v2', 'meatspace.twin-gap-report/v9'))
    expect(() => loadReports(dir)).toThrow(/unknown schema/)
    writeFileSync(file, original)
    const trace = JSON.parse(readFileSync(join(dir, id, 'trace.json'), 'utf8')) as TwinTrace
    const traceText = readFileSync(join(dir, id, 'trace.json'), 'utf8')
    trace.provenance.report_content_sha256 = '0'.repeat(64)
    writeFileSync(join(dir, id, 'trace.json'), JSON.stringify(trace))
    expect(() => loadReports(dir)).toThrow(SyncError)
    // An edited sample, with the trace's own hash recomputed, is caught by the RMSE cross-check against report.json.
    const edited = JSON.parse(traceText) as TwinTrace
    const j = edited.joints[0]
    edited.series[j].real = edited.series[j].real.map((v, i) => (i === 100 ? v + 25 : v))
    const node = parseLabJson(JSON.stringify(edited))
    edited.sha256 = selfSha256(node)
    writeFileSync(join(dir, id, 'trace.json'), JSON.stringify(edited))
    expect(() => loadReports(dir)).toThrow(/edited sample/)
    // A missing trace fails closed (unless explicitly allowed).
    rmSync(join(dir, id, 'trace.json'))
    expect(() => loadReports(dir)).toThrow(/no trace\.json/)
  })

  it('reads NaN / Infinity as null and writes a strict copy that changes nothing else', () => {
    const text = '{"a": NaN, "b": [Infinity, -Infinity, 1.5], "c": "NaN stays"}'
    const node = parseLabJson(text)
    expect(toValue(node)).toEqual({ a: null, b: [null, null, 1.5], c: 'NaN stays' })
    expect(strictText(text, nonstandardTokens(node))).toBe('{"a": null, "b": [null, null, 1.5], "c": "NaN stays"}')
    const strict = REPORT_INDEX.reports.filter((r) => r.json_file === 'report.strict.json').map((r) => r.id)
    expect(strict.sort()).toEqual(['CarolinePascal__plug_socket_moved', 'xsatvik__mixer_on_off_new_1'])
  })

  it('derives one plain sentence per rejection reason by a fixed rule', () => {
    expect(shortReason("twin robotstudio_so101 has no documented mapping for zero reference 'calibration_zero_pose'")).toEqual({
      short: 'Legacy-calibrated SO-101 data: there is no documented joint mapping onto the robotstudio_so101 twin.',
      category: 'mapping',
    })
    expect(shortReason("recorded range of motion does not fit the twin's joint range under the documented ... for: shoulder_lift [-88.68, 38.24]").category).toBe('mapping')
    expect(shortReason('Units could not be verified; no sim comparison is reported. x').category).toBe('units')
  })
})

describe('the generated index', () => {
  const ok = REPORT_INDEX.reports

  it('counts every candidate whatever its result', () => {
    expect(REPORT_INDEX.counts).toMatchObject({ candidates: 30, run: 23, reported: 18, rejected: 5, not_run: 7, so101: 5, so100: 13 })
    expect(REPORT_INDEX.reports.length + REPORT_INDEX.rejected.length).toBe(REPORT_INDEX.counts.run)
    expect(REPORT_INDEX.not_run).toHaveLength(7)
    for (const r of REPORT_INDEX.rejected) {
      expect(r.reason.length, r.id).toBeGreaterThan(10)
      expect(resolve(r.reason_prov)).toBe(r.reason)
      expect(r.files['calibrated_twin.json']).toBeUndefined()
      expect(r.files['trace.json']).toBeUndefined()
    }
    expect(REPORT_INDEX.hero.id).toBe('lerobot__svla_so101_pickplace')
    expect(REPORT_INDEX.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('every number carries a pointer that resolves to exactly that number in report.json', () => {
    let checked = 0
    const est = (e: Est) => {
      const v = resolve(e.prov) as { mean: number; ci95: [number, number]; n?: number }
      expect(v.mean, e.prov).toBe(e.mean)
      expect(v.ci95, e.prov).toEqual(e.ci95)
      checked++
    }
    for (const r of ok) {
      for (const s of ['future', 'interleaved'] as const) {
        Object.values(r[s].rmse_deg).forEach(est)
        for (const c of [r[s].vs_stock, r[s].vs_baseline]) {
          const v = resolve(c.prov) as { mean: number; ci95: [number, number] }
          expect([v.mean, ...v.ci95]).toEqual([c.mean, ...c.ci95])
          checked++
        }
        expect(resolve(r[s].verdict_prov)).toBe(r[s].verdict)
      }
      expect(resolve(r.lag.prov)).toMatchObject({ per_joint_ms: r.lag.per_joint_ms })
    }
    expect(checked).toBe(ok.length * 2 * 6)
  })

  it('aggregates name the report and pointer of their min and max', () => {
    for (const fam of Object.values(REPORT_INDEX.aggregates)) {
      for (const range of [fam.future.vs_stock, fam.future.vs_baseline, fam.interleaved.vs_baseline]) {
        expect(resolve(`lab/reports/${range.min_id}/report.json#${range.pointer}`)).toBe(range.min)
        expect(resolve(`lab/reports/${range.max_id}/report.json#${range.pointer}`)).toBe(range.max)
      }
    }
  })

  it('matches the published findings: SO-101 lag and gap, SO-100 modest gains and the contact-heavy exceptions', () => {
    const a = REPORT_INDEX.aggregates.so101
    expect(a.reports).toBe(5)
    expect(Math.round(a.lag.real_ms.min)).toBe(112)
    expect(Math.round(a.lag.real_ms.max)).toBe(179)
    expect(a.lag.median_frames_stock.max).toBeLessThan(1)
    expect([Math.round(-a.future.vs_stock.max * 100), Math.round(-a.future.vs_stock.min * 100)]).toEqual([76, 91])
    expect(a.future_gap_labels).toEqual({ 'closes most of the gap': 5 })
    const b = REPORT_INDEX.aggregates.so100
    expect(b.reports).toBe(13)
    const byId = (id: string) => ok.find((r) => r.id === id)!
    expect(byId('CarolinePascal__plug_socket_moved').future.baseline_label).toBe('is WORSE than the physics-free lag filter')
    expect(byId('Chojins__chess_game_001_blue_stereo').future.gap_label).toBe('no clear change')
  })

  it('files are listed with the sha256 of the lab bytes the build copies', async () => {
    const { createHash } = await import('node:crypto')
    for (const r of [...ok.slice(0, 3), ...REPORT_INDEX.rejected.slice(0, 1)]) {
      for (const [name, meta] of Object.entries(r.files)) {
        if (name === 'report.strict.json') continue // generated by the build; its hash is checked in the worker tests
        const bytes = readFileSync(join(LAB, r.id, name))
        expect(createHash('sha256').update(bytes).digest('hex'), `${r.id}/${name}`).toBe(meta!.sha256)
        expect(bytes.byteLength).toBe(meta!.bytes)
      }
    }
  })
})

describe('shared/reports helpers', () => {
  const hero = REPORT_INDEX.reports.find((r) => r.id === REPORT_INDEX.hero.id) as OkReportSummary

  it('formats like the lab (change text, estimate text, percent without float noise)', () => {
    expect(changeText({ mean: -0.9143, ci95: [-0.9191, -0.9093] })).toBe('-91% [-92, -91]')
    expect(changeText({ mean: 0.0094, ci95: [-0.0127, 0.0371] })).toBe('+1% [-1, +4]')
    expect(estText({ mean: 0.4583, ci95: [0.4385, 0.4812] })).toBe('0.46 [0.44, 0.48]')
    expect(pct(-0.9143)).toBe(-91.43)
  })

  it('adapts summaries to ds Reading and Interval props', () => {
    const r = readingOf(hero.future.rmse_deg.calibrated)
    expect(r).toEqual({ value: hero.future.rmse_deg.calibrated.mean, ci: hero.future.rmse_deg.calibrated.ci95, n: 10, prov: hero.future.rmse_deg.calibrated.prov })
    const c = changeReadingOf(hero.future.vs_stock)
    expect(c).toMatchObject({ unit: '%', signed: true, n: 10, prov: hero.future.vs_stock.prov })
    expect(c.value).toBeCloseTo(hero.future.vs_stock.mean * 100, 6)
    expect(intervalOf(hero.future.vs_stock, true).lo).toBeCloseTo(hero.future.vs_stock.ci95[0] * 100, 6)
  })

  it('maps lab verdict labels to status words, never to "verified"', () => {
    expect(gapVerdict('closes most of the gap')).toBe('MET')
    expect(gapVerdict('closes part of the gap')).toBe('BELOW BAR')
    expect(gapVerdict('no clear change')).toBe('GAP')
    expect(gapVerdict('calibration makes the twin WORSE')).toBe('FAULT')
    expect(baselineVerdict('beats the physics-free lag filter')).toBe('PASS')
    expect(baselineVerdict('is WORSE than the physics-free lag filter')).toBe('FAULT')
  })

  it('traceRmse recomputes the lab RMSE from trace.json within rounding', () => {
    for (const r of REPORT_INDEX.reports) {
      const tr = JSON.parse(readFileSync(join(LAB, r.id, 'trace.json'), 'utf8')) as TwinTrace
      if (tr.decimation !== 1) continue
      traceRmse(tr, 'cal').forEach((v, j) => expect(Math.abs(v - tr.rmse_deg.calibrated[j]), `${r.id} ${j}`).toBeLessThan(0.01))
      traceRmse(tr, 'stock').forEach((v, j) => expect(Math.abs(v - tr.rmse_deg.stock[j]), `${r.id} ${j}`).toBeLessThan(0.01))
    }
  })
})

describe('src/lib/reports (client)', () => {
  const id = 'lerobot__svla_so101_pickplace'
  const bytes = readFileSync(join(LAB, id, 'report.json'))
  const fake =
    (body: BodyInit, type = 'application/json', status = 200): typeof fetch =>
    async () =>
      new Response(body, { status, headers: { 'content-type': type } })

  it('fetches report.json and checks it against the sha256 recorded at build time', async () => {
    const rep = await fetchReport(id, { fetch: fake(bytes) })
    expect(rep.content_sha256).toBe(getReportSummary(id)!.hashes.content_sha256)
    const tampered = Buffer.from(bytes.toString('utf8').replace('"mean": 0.4583', '"mean": 0.4183'))
    await expect(fetchReport(id, { fetch: fake(tampered) })).rejects.toMatchObject({ kind: 'integrity' })
  })

  it('never parses the SPA shell as data, and reports unknown ids and missing files without a request', async () => {
    await expect(fetchReport(id, { fetch: fake('<!doctype html>', 'text/html') })).rejects.toMatchObject({ kind: 'not_found' })
    await expect(fetchReport('nobody__nothing', { fetch: fake('{}') })).rejects.toBeInstanceOf(ReportFetchError)
    await expect(fetchTrace('siyavash__so101_test', { fetch: fake('{}') })).rejects.toMatchObject({ kind: 'not_found' })
    await expect(fetchReport(id, { fetch: fake('nope', 'text/plain', 503) })).rejects.toMatchObject({ kind: 'http', status: 503 })
  })

  it('gives package URLs only for reports that have one', () => {
    expect(twinPackageUrl(id)).toBe(`/data/reports/${id}/calibrated_twin.json`)
    expect(twinPackageUrl('siyavash__so101_test')).toBeNull()
  })
})

describe('rounding: the site prints the lab digits', () => {
  it('pyFixed rounds like Python format(): exact value, ties to even', () => {
    expect(pyFixed(-46.5, 0)).toBe('-46')
    expect(pyFixed(-34.5, 0)).toBe('-34')
    expect(pyFixed(28.5, 0)).toBe('28')
    expect(pyFixed(3.5, 0)).toBe('4')
    expect(pyFixed(100 * -0.285, 0)).toBe('-28') // -28.499999999999996
    expect(pyFixed(0.125, 2)).toBe('0.12')
    expect(pyFixed(0.465, 2)).toBe('0.47') // 0.46500000000000002...: not a tie
    expect(pyFixed(1.005, 2)).toBe('1.00')
  })

  it("every change on the site matches the lab's own verdict text, for every report and both sets", () => {
    for (const r of REPORT_INDEX.reports) {
      for (const set of ['future', 'interleaved'] as const) {
        const x = r[set]
        // The lab's verdict quotes both changes in its own format, e.g. "(-91% [-92, -91] vs stock)".
        expect(x.verdict, `${r.id} ${set}`).toContain(changeText(x.vs_stock))
        expect(x.verdict, `${r.id} ${set}`).toContain(changeText(x.vs_baseline))
        // The ds formatter (true minus on screen) gives the same digits.
        const ds = (v: number) => {
          const t = pyFixed(Math.abs(pct(v)), 0)
          return Number(t) === 0 ? t : `${v < 0 ? '-' : '+'}${t}`
        }
        // (A zero prints unsigned on screen, "+0" in the lab: same digits.)
        expect(`${ds(x.vs_stock.mean)}%`).toBe(changeText(x.vs_stock).split(' ')[0].replace(/^\+0%$/, '0%'))
      }
    }
  })
})
