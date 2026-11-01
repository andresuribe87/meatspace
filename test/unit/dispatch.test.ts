import { describe, expect, it } from 'vitest'

import { canonicalJson } from '../../shared/canonical'
import { MAX_ACTIVE_LOCKS_PER_CLIENT } from '../../shared/constants'
import { canonicalChargeFloorPct, MIN_DURATION_MIN, parseDispatchPayload, PHASE_OFFSETS_MS, planDispatch } from '../../shared/dispatch'
import { formatCoords, formatOffset, formatUsd, shortHash, tickerText } from '../../shared/format'
import { haversineKm } from '../../shared/geo'
import { SEED_NODES, SEED_STATS, seedSnapshot } from '../../shared/nodes'
import { buildPayload, defaultPayload, escrowCents, PRIMITIVE_IDS, PRIMITIVES } from '../../shared/primitives'
import type { DispatchPayload, HardwareNode } from '../../shared/types'

const node = (id: string): HardwareNode => {
  const n = seedSnapshot().nodes.find((x) => x.id === id)
  if (!n) throw new Error(id)
  return n
}

/** Round-trip through JSON like the wire does. */
const wire = (p: DispatchPayload) => JSON.parse(JSON.stringify(p)) as unknown

describe('handoff copy', () => {
  it('ticker matches the handoff verbatim at seed values', () => {
    expect(tickerText(SEED_STATS)).toBe(
      'ACTIVE NODES: 1,408 | AVAILABLE FLIGHT/ACTUATION HRS: 924.2 | 24H SETTLED VOLUME: $142,890 USDC | NETWORK LATENCY: 18ms',
    )
  })

  it('default aerial sortie escrows $42.50 on VTOL-260-TX-04 with the handoff step copy', () => {
    const p = defaultPayload('AERIAL_ISR_SORTIE', SEED_NODES)
    expect(p.node_id).toBe('VTOL-260-TX-04')
    const plan = planDispatch(p, node('VTOL-260-TX-04'), 0)
    expect(plan.httpStatus).toBe(200)
    expect(plan.escrowCents).toBe(4250)
    expect(plan.events.map((e) => (e.type === 'step' ? [formatOffset(e.t_ms), e.message, e.status] : null))).toEqual([
      ['00ms', 'Validating GeoJSON polygon against node firmware geofence...', 'PASS'],
      ['140ms', 'Checking $42.50 against max_spend_usdc on node VTOL-260-TX-04 (simulated; nothing is charged)...', 'ACCEPTED'],
      ['380ms', 'Compiling intent to MAVLink waypoint primitive...', 'DISPATCHED'],
    ])
    expect(PHASE_OFFSETS_MS.ATTEST).toBe(800)
  })

  it('spot rates from the handoff are present', () => {
    expect(SEED_NODES.map((n) => formatUsd(n.rateCents))).toEqual(expect.arrayContaining(['$3.40', '$1.85', '$0.90']))
  })
})

describe('payload builders', () => {
  it.each(SEED_NODES.map((n) => [n.id]))('%s: canonical payload parses and plans to DISPATCHED', (id) => {
    const n = node(id)
    const p = buildPayload(n)
    const parsed = parseDispatchPayload(wire(p))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.payload).toEqual(p)
    const plan = planDispatch(parsed.payload, n, 0)
    expect(plan.failure).toBeNull()
    expect(plan.httpStatus).toBe(200)
    expect(plan.events).toHaveLength(3)
    expect(plan.escrowCents).toBe(escrowCents(n.rateCents, PRIMITIVES[p.primitive].estDurationMin))
    expect(plan.escrowCents).toBeLessThanOrEqual(Math.round(p.max_spend_usdc * 100))
  })

  it('every primitive has a default node in the dataset', () => {
    for (const p of PRIMITIVE_IDS) expect(() => defaultPayload(p, SEED_NODES)).not.toThrow()
  })

  it.each(SEED_NODES.filter((n) => n.category === 'AERIAL').map((n) => [n.id]))(
    '%s: aerial corridor starts and ends at the home pad, closed and inside the geofence',
    (id) => {
      const n = node(id)
      const p = buildPayload(n)
      if (p.primitive !== 'AERIAL_ISR_SORTIE') throw new Error('expected aerial')
      const ring = p.geometry.coordinates[0]
      expect(ring).toHaveLength(5)
      expect(ring[0]).toEqual([n.lon, n.lat])
      expect(ring[4]).toEqual([n.lon, n.lat])
      // 6 km east x 0.6 km north: the far corner is ~6.03 km out, inside the smallest aerial geofence (8 km).
      const far = Math.max(...ring.map(([lon, lat]) => haversineKm(n.lat, n.lon, lat, lon)))
      expect(far).toBeCloseTo(Math.hypot(6, 0.6), 1)
      expect(far).toBeLessThan(Math.min(...SEED_NODES.filter((x) => x.category === 'AERIAL').map((x) => x.geofenceKm)))
    },
  )

  it.each(SEED_NODES.filter((n) => n.category !== 'AERIAL').map((n) => [n.id]))('%s: site is exactly the node home position', (id) => {
    const n = node(id)
    const p = buildPayload(n)
    if (p.primitive === 'AERIAL_ISR_SORTIE') throw new Error('expected a site payload')
    expect(p.site).toEqual({ type: 'Point', coordinates: [n.lon, n.lat] })
  })

  it('QDR-SUB-44 sweeps its own site', () => {
    const p = buildPayload(node('QDR-SUB-44'))
    expect(p.primitive === 'SUBSTATION_THERMAL_SWEEP' && p.site.coordinates).toEqual([-95.201, 29.731])
  })
})

describe('state machine failures', () => {
  it('unknown node -> VALIDATE FAIL 404', () => {
    const p = { ...defaultPayload('AERIAL_ISR_SORTIE', SEED_NODES), node_id: 'NOPE-01' }
    const plan = planDispatch(p, undefined, 0)
    expect(plan.httpStatus).toBe(404)
    expect(plan.events.at(-1)).toMatchObject({ type: 'error', code: 'ERR_NODE_NOT_FOUND', phase: 'VALIDATE' })
  })

  it('primitive/category mismatch -> 422', () => {
    const p = { ...defaultPayload('AERIAL_ISR_SORTIE', SEED_NODES), node_id: 'ARM-CELL-12' }
    const plan = planDispatch(p, node('ARM-CELL-12'), 0)
    expect(plan.failure?.code).toBe('ERR_PRIMITIVE_UNSUPPORTED')
  })

  it('polygon outside geofence -> ERR_GEOFENCE', () => {
    const p = defaultPayload('AERIAL_ISR_SORTIE', SEED_NODES)
    if (p.primitive !== 'AERIAL_ISR_SORTIE') throw new Error('expected aerial')
    p.geometry.coordinates[0][2] = [-101.5, 32.4]
    const plan = planDispatch(p, node('VTOL-260-TX-04'), 0)
    expect(plan.failure).toMatchObject({ code: 'ERR_GEOFENCE', phase: 'VALIDATE', httpStatus: 422 })
    expect(plan.events[0]).toMatchObject({ type: 'step', status: 'FAIL', t_ms: 0 })
  })

  it('busy node -> ESCROW REJECTED 409 at 140ms', () => {
    const n = { ...node('VTOL-260-TX-04'), status: 'TASKED' as const, taskedUntil: 25_000, taskId: 'tsk_x' }
    const plan = planDispatch(defaultPayload('AERIAL_ISR_SORTIE', SEED_NODES), n, 1_000)
    expect(plan.httpStatus).toBe(409)
    expect(plan.events[1]).toMatchObject({ type: 'step', phase: 'ESCROW', status: 'REJECTED', t_ms: 140 })
    expect(plan.events[2]).toMatchObject({ type: 'error', code: 'ERR_NODE_BUSY' })
  })

  it('spend cap below escrow -> ERR_SPEND_CAP', () => {
    const p = { ...defaultPayload('AERIAL_ISR_SORTIE', SEED_NODES), max_spend_usdc: 42.49 }
    expect(planDispatch(p, node('VTOL-260-TX-04'), 0).failure?.code).toBe('ERR_SPEND_CAP')
    expect(planDispatch({ ...p, max_spend_usdc: 42.5 }, node('VTOL-260-TX-04'), 0).failure).toBeNull()
  })

  it('the spend cap is compared exactly, never rounded: 37.799 does not cover a $37.80 escrow', () => {
    const p = defaultPayload('AUTOMATED_CNC_SYNTHESIS', SEED_NODES)
    const plan = planDispatch({ ...p, max_spend_usdc: 37.799 }, node('ARM-CELL-12'), 0)
    expect(plan.failure).toMatchObject({ phase: 'ESCROW', code: 'ERR_SPEND_CAP', httpStatus: 422, message: 'price $37.80 exceeds max_spend_usdc 37.799' })
    expect(planDispatch({ ...p, max_spend_usdc: 37.8 }, node('ARM-CELL-12'), 0).escrowCents).toBe(3780)
    expect(planDispatch({ ...p, max_spend_usdc: 37.8 }, node('ARM-CELL-12'), 0).failure).toBeNull()
  })

  it(`a client already holding ${MAX_ACTIVE_LOCKS_PER_CLIENT} locks -> ESCROW REJECTED 429 / ERR_LOCK_QUOTA`, () => {
    const p = defaultPayload('AERIAL_ISR_SORTIE', SEED_NODES)
    const plan = planDispatch(p, node('VTOL-260-TX-04'), 1_000, { clientActiveLocks: 2, clientNextReleaseAt: 13_200 })
    expect(plan.httpStatus).toBe(429)
    expect(plan.events[1]).toMatchObject({ type: 'step', phase: 'ESCROW', status: 'REJECTED', t_ms: 140 })
    expect(plan.failure).toEqual({
      phase: 'ESCROW',
      code: 'ERR_LOCK_QUOTA',
      httpStatus: 429,
      message: 'client already holds 2 active task locks (limit 2); retry when one releases in 13s',
      retryAfterS: 13,
    })
    expect(planDispatch(p, node('VTOL-260-TX-04'), 1_000, { clientActiveLocks: 1 }).failure).toBeNull()
    // A busy node is reported as busy, whoever asks.
    const busy = { ...node('VTOL-260-TX-04'), status: 'TASKED' as const, taskedUntil: 25_000, taskId: 'tsk_x' }
    expect(planDispatch(p, busy, 1_000, { clientActiveLocks: 2 }).failure?.code).toBe('ERR_NODE_BUSY')
  })

  it('low battery -> ERR_INSUFFICIENT_CHARGE, with the charge floored like the orderbook shows it', () => {
    const n = { ...node('HLX-MR-31'), charge: 61.9 }
    expect(planDispatch(buildPayload(n), n, 0).failure).toMatchObject({
      code: 'ERR_INSUFFICIENT_CHARGE',
      message: 'battery 61% < required 62.5% (est. draw 37.5% + reserve 25%)',
    })
  })

  it('canonicalChargeFloorPct is exactly the charge the canonical payload needs', () => {
    const floors = Object.fromEntries(SEED_NODES.map((n) => [n.id, canonicalChargeFloorPct(n)]))
    expect(floors).toEqual({
      'VTOL-260-TX-04': 56.25,
      'ORK-VTOL-09': 52.5,
      'HLX-MR-31': 62.5,
      'VTOL-180-AB-11': 56.25,
      'QDR-SUB-44': expect.closeTo(41.6),
      'QDR-GH-17': expect.closeTo(39.8),
      'AMR-V50-08': expect.closeTo(34.4),
      'ARM-CELL-12': 0,
      'CNC-5AX-03': 0,
      'ARM-CELL-27': 0,
    })
    for (const n of SEED_NODES.filter((x) => x.power === 'BATTERY')) {
      const at = { ...n, charge: canonicalChargeFloorPct(n) }
      expect(planDispatch(buildPayload(at), at, 0).failure, n.id).toBeNull()
      const below = { ...n, charge: canonicalChargeFloorPct(n) - 0.01 }
      expect(planDispatch(buildPayload(below), below, 0).failure?.code, n.id).toBe('ERR_INSUFFICIENT_CHARGE')
    }
  })

  it('the VALIDATE step names the check that failed; geometry failures keep the handoff line', () => {
    const validateStep = (p: DispatchPayload, n: HardwareNode | undefined) => planDispatch(p, n, 0).events[0]
    const sortie = defaultPayload('AERIAL_ISR_SORTIE', SEED_NODES)
    if (sortie.primitive !== 'AERIAL_ISR_SORTIE') throw new Error('expected aerial')
    const vtol = node('VTOL-260-TX-04')
    const cnc = defaultPayload('AUTOMATED_CNC_SYNTHESIS', SEED_NODES)
    if (cnc.primitive !== 'AUTOMATED_CNC_SYNTHESIS') throw new Error('expected cnc')
    const arm = node('ARM-CELL-12')
    const sweep = buildPayload(node('QDR-SUB-44'))
    if (sweep.primitive !== 'SUBSTATION_THERMAL_SWEEP') throw new Error('expected sweep')
    const cases: [DispatchPayload, HardwareNode | undefined, string][] = [
      [{ ...sortie, node_id: 'NOPE-01' }, undefined, 'Resolving node NOPE-01 in the simulator...'],
      [{ ...sortie, node_id: 'ARM-CELL-12' }, arm, 'Resolving node ARM-CELL-12 capabilities for AERIAL_ISR_SORTIE...'],
      [{ ...sortie, constraints: { ...sortie.constraints, agl_floor_m: 10 } }, vtol, 'Validating altitude band against node firmware envelope...'],
      [{ ...sortie, constraints: { ...sortie.constraints, rtl_reserve_pct: 10 } }, vtol, 'Validating battery reserve against node firmware RTL envelope...'],
      [sortie, { ...vtol, charge: 50 }, 'Validating battery reserve against node firmware RTL envelope...'],
      [sweep, { ...node('QDR-SUB-44'), charge: 30 }, 'Validating battery reserve against node firmware return-to-dock envelope...'],
      [{ ...cnc, tolerance_mm: 0.001 }, arm, 'Validating tolerance against cell capability...'],
      [{ ...cnc, site: { type: 'Point', coordinates: [9.2, 48.9] } }, arm, 'Validating site against cell location...'],
      [{ ...cnc, artifact: { ...cnc.artifact, bbox_mm: [700, 80, 35] } }, arm, 'Validating STEP bounding box against cell work envelope...'],
      [{ ...sweep, site: { type: 'Point', coordinates: [-95.3, 29.8] } }, node('QDR-SUB-44'), 'Validating GeoJSON point against node firmware geofence...'],
    ]
    for (const [p, n, message] of cases) expect(validateStep(p, n)).toMatchObject({ phase: 'VALIDATE', status: 'FAIL', message })
    expect(validateStep(sortie, vtol)).toMatchObject({ status: 'PASS', message: 'Validating GeoJSON polygon against node firmware geofence...' })
  })

  it('oversized part -> ERR_WORK_ENVELOPE', () => {
    const p = buildPayload(node('ARM-CELL-12'))
    if (p.primitive !== 'AUTOMATED_CNC_SYNTHESIS') throw new Error('expected cnc')
    p.artifact.bbox_mm = [700, 80, 35]
    expect(planDispatch(p, node('ARM-CELL-12'), 0).failure?.code).toBe('ERR_WORK_ENVELOPE')
  })
})

describe('schema validation', () => {
  it('rejects non-objects, wrong intent, open rings and bad coordinates with a JSON path', () => {
    expect(parseDispatchPayload(null)).toMatchObject({ ok: false, path: '$' })
    const p = wire(defaultPayload('AERIAL_ISR_SORTIE', SEED_NODES)) as Record<string, unknown>
    expect(parseDispatchPayload({ ...p, intent: 'INSPECT_ASSET' })).toMatchObject({ ok: false, path: '$.intent' })
    const geometry = { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1]]] }
    expect(parseDispatchPayload({ ...p, geometry })).toMatchObject({ ok: false, path: '$.geometry.coordinates[0]' })
    const bad = { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 95], [0, 0]]] }
    expect(parseDispatchPayload({ ...p, geometry: bad })).toMatchObject({ ok: false, path: '$.geometry.coordinates[0][2][1]' })
    expect(parseDispatchPayload({ ...p, node_id: 'lower-case' })).toMatchObject({ ok: false, path: '$.node_id' })
    expect(parseDispatchPayload({ ...p, est_duration_min: 0 })).toMatchObject({ ok: false, path: '$.est_duration_min' })
  })

  it(`est_duration_min must be at least the ${MIN_DURATION_MIN}-minute billable minimum`, () => {
    expect(MIN_DURATION_MIN).toBe(1)
    const p = wire(defaultPayload('AERIAL_ISR_SORTIE', SEED_NODES)) as Record<string, unknown>
    expect(parseDispatchPayload({ ...p, est_duration_min: 0.99 })).toEqual({
      ok: false,
      code: 'ERR_SCHEMA',
      message: '$.est_duration_min: must be >= 1',
      path: '$.est_duration_min',
    })
    expect(parseDispatchPayload({ ...p, est_duration_min: 1 }).ok).toBe(true)
    // The cheapest node for its 1-minute minimum still escrows a real amount.
    expect(Math.min(...SEED_NODES.map((n) => escrowCents(n.rateCents, MIN_DURATION_MIN)))).toBeGreaterThan(0)
  })

  it('drops unknown fields', () => {
    const p = defaultPayload('AERIAL_ISR_SORTIE', SEED_NODES)
    if (p.primitive !== 'AERIAL_ISR_SORTIE') throw new Error('expected aerial')
    expect(parseDispatchPayload({ ...p, note: 'x', constraints: { ...p.constraints, extra: 1 } })).toEqual({ ok: true, payload: p })
  })
})

describe('canonicalJson', () => {
  it('sorts object keys at every level, keeps array order and writes no whitespace', () => {
    expect(canonicalJson({ b: 1, a: [3, { d: null, c: 'x' }, 1], e: { z: true, y: -0.5 } })).toBe('{"a":[3,{"c":"x","d":null},1],"b":1,"e":{"y":-0.5,"z":true}}')
  })

  it('matches JSON.stringify on scalars and drops undefined members', () => {
    expect(canonicalJson('é"\n')).toBe(JSON.stringify('é"\n'))
    expect(canonicalJson(1e21)).toBe('1e+21')
    expect(canonicalJson(12.5)).toBe('12.5')
    expect(canonicalJson({ a: undefined, b: 2 })).toBe('{"b":2}')
    expect(canonicalJson([undefined])).toBe('[null]')
  })

  it('is independent of key insertion order', () => {
    const p = defaultPayload('SUBSTATION_THERMAL_SWEEP', SEED_NODES)
    const reversed = Object.fromEntries(Object.entries(p).reverse())
    expect(canonicalJson(reversed)).toBe(canonicalJson(p))
  })
})

describe('format', () => {
  it('formats coordinates, money, offsets and hashes', () => {
    expect(formatCoords(31.9973, -102.0779)).toBe('31.9973° N, 102.0779° W')
    expect(formatCoords(-22.6936, 117.7932)).toBe('22.6936° S, 117.7932° E')
    expect(formatUsd(14_289_000)).toBe('$142,890.00')
    expect(formatUsd(90)).toBe('$0.90')
    expect(formatOffset(0)).toBe('00ms')
    expect(formatOffset(800)).toBe('800ms')
    expect(shortHash('0x9f8c' + '0'.repeat(56) + '3a1b')).toBe('0x9f8c...3a1b')
  })
})
