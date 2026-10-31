import { describe, expect, it } from 'vitest'

import { parseDispatchPayload, PHASE_OFFSETS_MS, planDispatch } from '../../shared/dispatch'
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
      ['140ms', 'Locking escrow ($42.50 USDC) & bidding on Node VTOL-260-TX-04...', 'ACCEPTED'],
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

  it('aerial polygon is closed and inside the geofence', () => {
    const n = node('HLX-MR-31')
    const p = buildPayload(n)
    if (p.primitive !== 'AERIAL_ISR_SORTIE') throw new Error('expected aerial')
    const ring = p.geometry.coordinates[0]
    expect(ring[0]).toEqual(ring[ring.length - 1])
    for (const [lon, lat] of ring) expect(haversineKm(n.lat, n.lon, lat, lon)).toBeLessThan(n.geofenceKm)
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

  it('low battery -> ERR_INSUFFICIENT_CHARGE', () => {
    const n = { ...node('HLX-MR-31'), charge: 40 }
    expect(planDispatch(buildPayload(n), n, 0).failure?.code).toBe('ERR_INSUFFICIENT_CHARGE')
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
