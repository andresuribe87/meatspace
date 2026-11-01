import { describe, expect, it } from 'vitest'

import { REPORT_INDEX } from '../../shared/reports.generated'
import { BAR, barByFamily, barResult, notHelped, notRunShort, rangeOver } from '../../src/lib/findings'
import { isAppPath, matchPath, redirectFor } from '../../src/lib/router'

describe('router: matching', () => {
  it('matches every v0.2 route, report ids decoded, anything else 404', () => {
    expect(matchPath('/').route).toBe('/')
    for (const p of ['/reports', '/cells', '/power', '/docs', '/concept', '/design'] as const) expect(matchPath(p).route).toBe(p)
    expect(matchPath('/reports/lerobot__svla_so101_pickplace')).toEqual({ route: '/reports/:id', params: { id: 'lerobot__svla_so101_pickplace' }, path: '/reports/lerobot__svla_so101_pickplace' })
    expect(matchPath('/reports/a%20b').params.id).toBe('a b')
    expect(matchPath('/reports/a/b/c').route).toBe('404')
    expect(matchPath('/nope').route).toBe('404')
  })

  it('redirects trailing slashes, /index.html, /twins and /reports/:owner/:name; canonical paths stay', () => {
    expect(redirectFor('/reports/')).toBe('/reports')
    expect(redirectFor('/cells//', '?a=1', '#twins')).toBe('/cells?a=1#twins')
    expect(redirectFor('/index.html')).toBe('/')
    expect(redirectFor('/twins', '?x=1')).toBe('/cells?x=1#twins')
    expect(redirectFor('/reports/lerobot/svla_so101_pickplace')).toBe('/reports/lerobot__svla_so101_pickplace')
    expect(redirectFor('/reports/lerobot/svla_so101_pickplace/')).toBe('/reports/lerobot__svla_so101_pickplace')
    for (const p of ['/', '/reports', '/reports/x__y', '/cells', '/docs', '/nope']) expect(redirectFor(p)).toBeNull()
  })

  it('routes only SPA paths through the client; API, data files and the installer go to the server', () => {
    expect(isAppPath('/reports/x__y')).toBe(true)
    expect(isAppPath('/cells#twins')).toBe(true)
    for (const p of ['/v1/reports', '/data/reports/x/report.json', '/install.sh', '/mcp', 'https://x.y/', '//x.y/']) expect(isAppPath(p)).toBe(false)
  })
})

describe('findings: read-outs of the report index', () => {
  it("applies the memo's bar by rule: change at or below -50% and lag within 1 frame", () => {
    const b = barResult(REPORT_INDEX)
    expect(b.rows).toHaveLength(REPORT_INDEX.reports.length)
    for (const r of b.rows) {
      const m = r.report.lag.median_frames
      expect(r.meets).toBe(r.report.future.vs_stock.mean <= BAR.change && Math.abs(m.calibrated! - m.real!) <= BAR.lagFrames)
    }
    expect(b.owners).toBe(new Set(b.met.map((r) => r.owner)).size)
    expect(b.prov).toContain('/data/reports/index.json')
  })

  it('reads "consistently" per robot family: met only when every dataset of the family meets the bar', () => {
    const fams = barByFamily(REPORT_INDEX)
    for (const b of Object.values(fams)) {
      expect(b.holds).toBe(b.rows.length > 0 && b.met.length === b.rows.length && b.met.length >= BAR.datasets && b.owners >= BAR.datasets)
      if (b.rows.some((r) => !r.meets)) expect(b.holds).toBe(false)
    }
    expect(fams.so101.rows.length + fams.so100.rows.length).toBe(REPORT_INDEX.reports.length)
  })

  it('summarises scan verdicts in plain words and flags the ones the scanner cut short', () => {
    expect(notRunShort("not a single SO arm: cannot map joint 'shoulder_pan' in names ['left_shoulder_pan', 'left_wrist_roll")).toEqual({
      short: 'Not a single SO arm: its joint names do not map onto the twin.',
      truncated: true,
    })
    expect(notRunShort('error: RemoteEntryNotFoundError: 404 Client Error. (Request ID: x)').short).toMatch(/not found on the Hub/)
    expect(notRunShort('unsupported units')).toEqual({ short: 'Units the pipeline cannot read from the data.', truncated: false })
    for (const n of REPORT_INDEX.not_run) expect(notRunShort(n.verdict).short.length).toBeGreaterThan(0)
  })

  it('names the reports where calibration does not clearly help from the lab labels, not by hand', () => {
    for (const r of notHelped(REPORT_INDEX)) {
      expect(r.future.gap_label !== 'closes most of the gap' || r.future.baseline_label !== 'beats the physics-free lag filter').toBe(true)
    }
  })

  it('ranges keep the report.json pointer of their min and max', () => {
    const r = rangeOver(REPORT_INDEX.reports, (x) => x.future.vs_stock.mean, '/headline/sets/future/calibrated_vs_stock/rel_change/mean')!
    expect(r.n).toBe(REPORT_INDEX.reports.length)
    expect(r.min.prov).toBe(`lab/reports/${r.min.id}/report.json#/headline/sets/future/calibrated_vs_stock/rel_change/mean`)
    expect(r.min.value).toBe(Math.min(...REPORT_INDEX.reports.map((x) => x.future.vs_stock.mean)))
  })
})
