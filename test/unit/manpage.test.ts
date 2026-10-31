import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { MAX_ACTIVE_LOCKS_PER_CLIENT } from '../../shared/constants'
import { MAX_BODY_BYTES, MAX_DURATION_MIN, MAX_SPEND_USDC, MIN_DURATION_MIN, parseDispatchPayload } from '../../shared/dispatch'
import { MAN_DATE, MAN_SECTIONS, MAN_TITLE, MAN_VERSION, MAN_WIDTH, manBlocks, manSlug, renderManText, type ManBlock } from '../../shared/manpage'
import { SEED_NODES } from '../../shared/nodes'
import { defaultPayload, PRIMITIVE_IDS, PRIMITIVES } from '../../shared/primitives'

const text = renderManText()
const lines = text.split('\n')
/** Prose is wrapped, so compare on collapsed whitespace. */
const flat = text.replace(/\s+/g, ' ')

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
    expect(MAN_VERSION).toBe('v0.1.4-alpha')
  })

  it('lists the sections in man-page order, flush left, bodies indented 7', () => {
    expect(MAN_SECTIONS.map((s) => s.title)).toEqual([
      'NAME',
      'SYNOPSIS',
      'DESCRIPTION',
      'ENDPOINTS',
      'PRIMITIVES',
      'DISPATCH LIFECYCLE',
      'RESPONSE FORMAT',
      'ERRORS',
      'SAFETY ENVELOPES',
      'PROOF OF PHYSICAL WORK',
      'RATE LIMITS',
      'STREAM',
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
    expect(lines[lines.indexOf('NAME') + 1]).toBe('       meatspace - dispatch tasks to physical hardware')
  })

  it('every section has structured blocks and a stable anchor', () => {
    for (const s of MAN_SECTIONS) expect(manBlocks(s).length).toBeGreaterThan(0)
    expect(MAN_SECTIONS.map((s) => manSlug(s.title))).toContain('proof-of-physical-work')
    expect(new Set(MAN_SECTIONS.map((s) => manSlug(s.title))).size).toBe(MAN_SECTIONS.length)
  })
})

describe('man page content matches the contract', () => {
  it('documents every ErrorCode', () => {
    const codes = errorCodes()
    expect(codes.length).toBeGreaterThanOrEqual(20)
    const errors = MAN_SECTIONS.find((s) => s.title === 'ERRORS')!.body
    for (const c of codes) expect(errors, c).toMatch(new RegExp(`^${c}\\s+\\d{3}\\s`, 'm'))
  })

  it('documents every endpoint of the API contract', () => {
    const endpoints = MAN_SECTIONS.find((s) => s.title === 'ENDPOINTS')!.body
    for (const e of [
      'GET /v1/snapshot',
      'GET /v1/nodes',
      'GET /v1/nodes/:id',
      'GET /v1/stats',
      'GET /v1/stream',
      'POST /v1/dispatch',
      'POST /v1/waitlist',
      'GET /install.sh',
      'GET /docs',
      'GET /healthz',
    ]) {
      expect(endpoints.split('\n'), e).toContain(e)
    }
  })

  it('quotes the value proposition and primitive summaries verbatim', () => {
    expect(flat).toContain(
      'Autonomous hardware sits idle in proprietary silos for most of its lifecycle, while software agents have zero native way to discover, rent, or task physical machines across vendor boundaries. meatspace.sh exposes idle robots and autonomous fleets as pay-per-minute API endpoints, handling cross-vendor command translation, safety sandboxing, and cryptographic proof of execution in a single call.',
    )
    for (const id of PRIMITIVE_IDS) {
      expect(text).toContain(`       ${id}\n              ${PRIMITIVES[id].summary}\n`)
      expect(flat).toContain(`Intent ${PRIMITIVES[id].intent}`)
    }
  })

  it('includes the handoff console trace for the default sortie', () => {
    for (const step of [
      '00ms Validating GeoJSON polygon against node firmware geofence... PASS',
      '140ms Locking escrow ($42.50 USDC) & bidding on Node VTOL-260-TX-04... ACCEPTED',
      '380ms Compiling intent to MAVLink waypoint primitive... DISPATCHED',
      '800ms Returning TPM-signed telemetry stream hash (0x9f8c...3a1b).',
    ]) {
      expect(flat).toContain(step)
    }
  })

  it('interpolates the shared limits', () => {
    expect(flat).toContain(`at most ${MAX_BODY_BYTES} bytes`)
    expect(flat).toContain(`>= ${MIN_DURATION_MIN}, <= ${MAX_DURATION_MIN}; billable minutes`)
    expect(flat).toContain(`> 0, <= ${MAX_SPEND_USDC}`)
    expect(flat).toContain('20 requests per minute per client')
    expect(flat).toContain('5 requests per minute per client')
    expect(flat).toContain('A client is an IPv4 address or an IPv6 /64')
    expect(flat).toContain('retry-after: 60')
    expect(flat).toContain(`A client may also hold at most ${MAX_ACTIVE_LOCKS_PER_CLIENT} task locks at once`)
  })

  it('documents the reviewed semantics: spend cap, ts, hash recipe, redirects, node status', () => {
    expect(flat).toContain('The cap is compared exactly as sent: against the default sortie\'s $42.50 escrow, 42.499 is rejected and 42.5 accepted.')
    expect(flat).toContain('ts is when the server produced the frame')
    expect(flat).toContain('read time for GET')
    expect(flat).toContain('canonical JSON of the object {issued_at, node_id, payload, task_id}')
    expect(flat).toContain('unknown fields are dropped')
    expect(flat).toContain('/docs/, /install.sh/ and /healthz/ redirect (301)')
    expect(flat).toContain('exposes the x-meatspace-task-id and retry-after headers')
    expect(flat).toContain('an IDLE or DOCKED node always passes the battery check with its default payload')
    expect(flat).toContain('"Resolving node NOPE-404 in clearinghouse registry..."')
  })

  it('documents the node_id pattern the parser enforces', () => {
    expect(source('../../shared/dispatch.ts')).toContain('const NODE_ID_RE = /^[A-Z0-9][A-Z0-9-]{1,31}$/')
    expect(text).toContain('^[A-Z0-9][A-Z0-9-]{1,31}$')
  })

  it('example payloads are the console defaults and pass the parser', () => {
    const blocks = manBlocks(MAN_SECTIONS.find((s) => s.title === 'PRIMITIVES')!)
    const examples = codeLines(blocks)
      .filter((l) => l[0] === '{')
      .map((l) => JSON.parse(l.join('\n')) as unknown)
    expect(examples).toEqual(PRIMITIVE_IDS.map((id) => defaultPayload(id, SEED_NODES)))
    for (const e of examples) expect(parseDispatchPayload(e).ok).toBe(true)
  })

  it('JSON examples elsewhere parse', () => {
    const blocks = MAN_SECTIONS.flatMap((s) => codeLines(manBlocks(s)))
    const json = blocks.filter((l) => l[0] === '{' && l.length > 1)
    expect(json.length).toBeGreaterThanOrEqual(5)
    for (const l of json) expect(() => JSON.parse(l.join('\n'))).not.toThrow()
  })

  it('per-node limits come from the seed orderbook', () => {
    const safety = MAN_SECTIONS.find((s) => s.title === 'SAFETY ENVELOPES')!.body
    for (const n of SEED_NODES) {
      const row = safety.split('\n').find((l) => l.startsWith(`${n.id} `))
      expect(row, n.id).toBeDefined()
      expect(row).toContain(`${n.geofenceKm.toFixed(1)} km`)
      if (n.minToleranceMm !== undefined) expect(row!.trimEnd().endsWith(` ${n.minToleranceMm}`)).toBe(true)
    }
  })

  it('names the sandbox caveat and the project links', () => {
    expect(flat).toContain('"sandbox": true')
    expect(text).toContain('meatspaced(8)')
    expect(text).toContain('https://github.com/andresuribe87/meatspace')
  })
})
