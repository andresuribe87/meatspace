import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { CELLS, ENDPOINTS, parseRequestBody, REQUEST_OPTIONS, type RequestBody } from '../../shared/api'
import { VERSION } from '../../shared/constants'
import { MAN_DATE, MAN_SECTIONS, MAN_TITLE, MAN_VERSION, MAN_WIDTH, manBlocks, manSlug, renderManText, type ManBlock } from '../../shared/manpage'
import { changeText, estText } from '../../shared/reports'
import { REPORT_INDEX } from '../../shared/reports.generated'
import { apiStatus, CAPABILITIES } from '../../shared/status'

const text = renderManText()
const lines = text.split('\n')
/** Prose is wrapped, so compare on collapsed whitespace. */
const flat = text.replace(/\s+/g, ' ')
const section = (title: string) => MAN_SECTIONS.find((s) => s.title === title)!.body
const flatSection = (title: string) => section(title).replace(/\s+/g, ' ')

const source = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8')

/** Every member of the ErrorCode union, read from the contract source so new codes cannot be missed. */
function errorCodes(): string[] {
  const union = /export type ErrorCode =([^]*?)\n\n/.exec(source('../../shared/types.ts'))?.[1] ?? ''
  return [...union.matchAll(/'(ERR_[A-Z_]+)'/g)].map((m) => m[1])
}

/** All verbatim (non-prose) lines of a block list, depth-first. */
function codeLines(blocks: readonly ManBlock[]): string[][] {
  return blocks.flatMap((b) => (b.kind === 'dl' ? b.items.flatMap((i) => codeLines(i.desc)) : b.kind === 'code' ? [[...b.lines]] : []))
}

/** Words the honesty rules keep off every page outside /concept (the man page is /docs). */
const BANNED = [/escrow/i, /usdc/i, /settlement/i, /attestation/i, /\btpm\b/i, /\bnodes\b/i, /\bfleets?\b/i, /our network/i, /\bverified\b/i, /coming soon/i, /clearinghouse/i]

describe('man page layout', () => {
  it('fits an 80-column terminal: <= 79 columns, printable ASCII, no trailing spaces, no tabs', () => {
    for (const line of lines) {
      expect(line.length, line).toBeLessThanOrEqual(MAN_WIDTH)
      expect(line, line).toMatch(/^[\x20-\x7e]*$/)
      expect(line, line).not.toMatch(/ $/)
    }
    expect(text.endsWith('\n')).toBe(true)
  })

  it('has the classic header and footer lines', () => {
    const header = lines[0]
    expect(header.startsWith(MAN_TITLE)).toBe(true)
    expect(header.endsWith(MAN_TITLE)).toBe(true)
    expect(header).toHaveLength(MAN_WIDTH)
    const centre = header.indexOf('meatspace.sh Manual')
    expect(Math.abs(centre - (MAN_WIDTH - 'meatspace.sh Manual'.length) / 2)).toBeLessThanOrEqual(1)

    const footer = lines[lines.length - 2]
    expect(footer.startsWith(MAN_VERSION)).toBe(true)
    expect(footer.endsWith(MAN_TITLE)).toBe(true)
    expect(footer).toContain(MAN_DATE)
    expect(MAN_VERSION).toBe(`v${VERSION}`)
    expect(VERSION).toBe('0.2.0')
  })

  it('lists the sections in man-page order, flush left, bodies indented 7', () => {
    expect(MAN_SECTIONS.map((s) => s.title)).toEqual([
      'NAME',
      'SYNOPSIS',
      'DESCRIPTION',
      'STATUS',
      'REPORTS',
      'TWIN PACKAGES',
      'REQUESTS',
      'ENDPOINTS',
      'ERRORS',
      'RATE LIMITS',
      'CONCEPT',
      'FILES',
      'BUGS',
      'SEE ALSO',
    ])
    for (const s of MAN_SECTIONS) {
      expect(lines).toContain(s.title)
      for (const l of s.body.split('\n')) expect(l.length, l).toBeLessThanOrEqual(MAN_WIDTH - 7)
    }
    const flushLeft = lines.slice(1, -2).filter((l) => /^\S/.test(l))
    expect(flushLeft).toEqual(MAN_SECTIONS.map((s) => s.title))
    expect(lines[lines.indexOf('NAME') + 1]).toBe('       meatspace - sim-to-real gap reports for robot twins')
  })

  it('every section has structured blocks and a stable anchor', () => {
    for (const s of MAN_SECTIONS) expect(manBlocks(s).length).toBeGreaterThan(0)
    expect(MAN_SECTIONS.map((s) => manSlug(s.title))).toContain('twin-packages')
    expect(new Set(MAN_SECTIONS.map((s) => manSlug(s.title))).size).toBe(MAN_SECTIONS.length)
  })
})

describe('man page honesty', () => {
  it('never uses the words kept for /concept, "verified" or "coming soon"', () => {
    for (const re of BANNED) expect(text, String(re)).not.toMatch(re)
  })

  it('says hashed, not signed, and that the replay is open-loop, joint-space and contact-free', () => {
    expect(flat).toContain('Hashed, not signed: Ed25519 signing is planned.')
    expect(flat).toContain('nothing is signed yet')
    expect(flat).not.toMatch(/\bsigned (manifest|bundle|report)/i)
    expect(flat).toContain('The replay is open-loop, in joint space, with contacts disabled: it measures the actuator model, not task success')
    expect(flat).toContain('Every candidate dataset in the pool is reported whatever its result')
  })
})

describe('man page content matches the contract', () => {
  it('documents every ErrorCode', () => {
    const codes = errorCodes()
    expect(codes).toEqual(expect.arrayContaining(['ERR_NOT_IMPLEMENTED', 'ERR_REPORT_NOT_FOUND', 'ERR_CELL_NOT_FOUND', 'ERR_FILE_NOT_FOUND']))
    const errors = section('ERRORS')
    for (const c of codes) expect(errors, c).toMatch(new RegExp(`^${c}\\s+\\d{3}\\s`, 'm'))
  })

  it('documents every non-concept endpoint of the registry, and the concept API as one group', () => {
    const endpoints = section('ENDPOINTS').split('\n')
    for (const e of ENDPOINTS.filter((x) => x.status !== 'CONCEPT')) expect(endpoints, `${e.method} ${e.path}`).toContain(`${e.method} ${e.path}`)
    expect(endpoints).toContain('GET /v1/concept, /v1/concept/*')
    const concept = flatSection('CONCEPT')
    for (const alias of ENDPOINTS.filter((e) => e.alias_of && !e.path.includes('nodes'))) expect(concept, alias.path).toContain(alias.path)
    expect(concept).toContain('POST /v1/waitlist')
    expect(flatSection('ENDPOINTS')).toContain('Planned. Run a policy on a cell twin or real robot. Answers 501.')
  })

  it('the STATUS table is the capability ledger, word for word', () => {
    const status = section('STATUS')
    for (const c of CAPABILITIES) expect(status, c.part).toMatch(new RegExp(`^${apiStatus(c.status)}\\s+${c.name}\\s`, 'm'))
    expect(flatSection('STATUS')).toContain(`${CELLS[0].id} twin planned, trials planned, real waitlist`)
  })

  it('report numbers come from the generated index, not from the manual', () => {
    const hero = REPORT_INDEX.reports.find((r) => r.id === REPORT_INDEX.hero.id)!
    const reports = flatSection('REPORTS')
    expect(reports).toContain(`${REPORT_INDEX.counts.reported} reports`)
    expect(reports).toContain(`${REPORT_INDEX.counts.rejected} more were run and rejected`)
    expect(reports).toContain(`stock twin ${estText(hero.future.rmse_deg.stock)}`)
    expect(reports).toContain(`calibrated twin ${estText(hero.future.rmse_deg.calibrated)}`)
    expect(reports).toContain(`change vs stock ${changeText(hero.future.vs_stock)}`)
    expect(reports).toContain(hero.future.verdict)
    const a = REPORT_INDEX.aggregates.so101
    expect(reports).toContain(`real arms lag ${Math.round(a.lag.real_ms.min)} to ${Math.round(a.lag.real_ms.max)} ms`)
    expect(reports).toContain(`${Math.round(-a.future.vs_stock.max * 100)}% to ${Math.round(-a.future.vs_stock.min * 100)}% lower than stock`)
    // no hand-typed percentages: every % in REPORTS is either a rule of the method or generated
    const generated = new Set([...reports.matchAll(/[-+]?\d+%/g)].map((m) => m[0]))
    for (const ruleNumber of ['20%', '95%', '-50%', '-20%']) generated.delete(ruleNumber)
    const allowed = new Set<string>()
    const add = (v: number) => {
      const r = Math.round(v * 100)
      for (const s of [`${r}%`, `${-r}%`, `${r > 0 ? '+' : ''}${r}%`]) allowed.add(s)
    }
    for (const r of REPORT_INDEX.reports) for (const s of ['future', 'interleaved'] as const) for (const k of ['vs_stock', 'vs_baseline'] as const) [r[s][k].mean, ...r[s][k].ci95].forEach(add)
    for (const g of generated) expect(allowed, g).toContain(g)
  })

  it('every request field it lists exists in the contract, and the example request parses', () => {
    const req = flatSection('REQUESTS')
    for (const [kind, fields] of Object.entries(REQUEST_OPTIONS)) {
      expect(req).toContain(`kind "${kind}"`)
      for (const f of Object.keys(fields)) expect(req, `${kind}.${f}`).toContain(f)
    }
    const blocks = manBlocks(MAN_SECTIONS.find((s) => s.title === 'REQUESTS')!)
    const [example] = codeLines(blocks).filter((l) => l[0] === '{').map((l) => JSON.parse(l.join('\n')) as RequestBody)
    expect(parseRequestBody(example)).toMatchObject({ ok: true, request: { kind: 'gap_report' } })
  })

  it('JSON examples parse', () => {
    const blocks = MAN_SECTIONS.flatMap((s) => codeLines(manBlocks(s)))
    const json = blocks.filter((l) => l[0] === '{' && l.length > 1)
    expect(json.length).toBeGreaterThanOrEqual(2)
    for (const l of json) expect(() => JSON.parse(l.join('\n'))).not.toThrow()
  })

  it('interpolates the shared limits', () => {
    expect(flat).toContain('5 per minute per client, shared with /v1/waitlist')
    expect(flat).toContain('20 per minute per client; 2 simulated task locks')
    expect(flat).toContain('A client is an IPv4 address or an IPv6 /64')
    expect(flat).toContain('retry-after: 60')
    expect(flat).toContain('(at most 4096 bytes)')
  })

  it('names the project links and the planned runner', () => {
    expect(text).toContain('meatspaced(8)')
    expect(text).toContain('https://github.com/andresuribe87/meatspace')
    expect(text).toContain('https://github.com/google-deepmind/mujoco_menagerie')
    expect(flat).toContain('python -m meatspace_lab export-twin')
  })
})
