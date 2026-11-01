import { runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { attestMessage, MAX_BODY_BYTES, parseDispatchPayload } from '../../shared/dispatch'
import { shortHash } from '../../shared/format'
import { SEED_NODES, SEED_STATS } from '../../shared/nodes'
import { buildPayload, defaultPayload } from '../../shared/primitives'
import type { AerialIsrPayload, DispatchEvent, DispatchReceipt, HardwareNode, SubstationSweepPayload } from '../../shared/types'
import { MAX_ACTIVE_LOCKS_PER_CLIENT, TASK_LOCK_MS as LOCK_MS } from '../../shared/constants'
import { call, expectApiError, network, postJson, randomIp, readNdjson, snapshot } from './helpers'

const NDJSON = 'application/x-ndjson; charset=utf-8'
const seedNode = (id: string) => SEED_NODES.find((n) => n.id === id) as HardwareNode
const defaultSortie = defaultPayload('AERIAL_ISR_SORTIE', SEED_NODES) as AerialIsrPayload

const dispatch = (body: unknown, ip = randomIp()) => postJson('/v1/concept/dispatch', body, { ip })

const steps = (events: DispatchEvent[]) =>
  events.flatMap((e) => (e.type === 'step' ? [{ t_ms: e.t_ms, phase: e.phase, status: e.status, message: e.message }] : []))

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** The man page's canonical JSON, written independently of shared/canonical.ts: keys sorted at every level. */
function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys)
  if (v === null || typeof v !== 'object') return v
  return Object.fromEntries(
    Object.entries(v)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([k, x]) => [k, sortKeys(x)]),
  )
}

/** telemetry_stream_hash recomputed from the receipt and the parsed request, per the man page. */
async function expectedHash(receipt: DispatchReceipt, body: unknown): Promise<string> {
  const parsed = parseDispatchPayload(JSON.parse(JSON.stringify(body)))
  if (!parsed.ok) throw new Error(parsed.message)
  const preimage = { issued_at: receipt.issued_at, node_id: receipt.node_id, payload: parsed.payload, task_id: receipt.task_id }
  return `0x${await sha256Hex(JSON.stringify(sortKeys(preimage)))}`
}

afterEach(() => {
  vi.restoreAllMocks()
})

// Tests in this file share one Durable Object and run in order: the first dispatch locks VTOL-260-TX-04.
describe('POST /v1/dispatch: success', () => {
  let receipt: DispatchReceipt

  it('streams VALIDATE -> ESCROW -> COMPILE -> ATTEST + receipt at the handoff offsets', async () => {
    const t0 = Date.now()
    const res = await dispatch(defaultSortie)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe(NDJSON)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.headers.get('access-control-allow-origin')).toBe('*')

    // Read state right away, well inside the first 2 s tick, so drift cannot blur the settled delta.
    const snap = await snapshot()
    const timed = await readNdjson(res, t0)
    const events = timed.map((t) => t.event)

    expect(steps(events)).toEqual([
      { t_ms: 0, phase: 'VALIDATE', status: 'PASS', message: 'Validating GeoJSON polygon against node firmware geofence...' },
      { t_ms: 140, phase: 'ESCROW', status: 'ACCEPTED', message: 'Checking $42.50 against max_spend_usdc on node VTOL-260-TX-04 (simulated; nothing is charged)...' },
      { t_ms: 380, phase: 'COMPILE', status: 'DISPATCHED', message: 'Compiling intent to MAVLink waypoint primitive...' },
      { t_ms: 800, phase: 'ATTEST', status: 'HASHED', message: expect.any(String) },
    ])
    expect(events).toHaveLength(5)
    const last = events[4]
    if (last.type !== 'receipt') throw new Error(`expected receipt, got ${last.type}`)
    receipt = last.receipt
    expect(last.t_ms).toBe(800)

    // Timing is really applied: each line arrives no earlier than its offset.
    for (const { event, at } of timed) expect(at).toBeGreaterThanOrEqual(event.t_ms - 20)
    expect(timed[timed.length - 1].at).toBeGreaterThanOrEqual(780)

    expect(receipt).toEqual({
      task_id: expect.stringMatching(/^tsk_[0-9a-f]{16}$/),
      status: 'DISPATCHED',
      primitive: 'AERIAL_ISR_SORTIE',
      node_id: 'VTOL-260-TX-04',
      interface: 'MAVLink v2',
      escrow_usdc: '42.50',
      rate_usdc_per_min: '3.40',
      est_duration_min: 12.5,
      compiled: { target: 'MAVLink v2', artifact: 'MISSION_ITEM_INT', count: 18 },
      telemetry_stream_hash: expect.stringMatching(/^0x[0-9a-f]{64}$/),
      issued_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
      sandbox: true,
    })
    expect(res.headers.get('x-meatspace-task-id')).toBe(receipt.task_id)
    expect(steps(events)[3].message).toBe(attestMessage(shortHash(receipt.telemetry_stream_hash)))

    // The hash commits to task, node, (validated) payload and issue time.
    expect(receipt.telemetry_stream_hash).toBe(await expectedHash(receipt, defaultSortie))

    // The node is locked for every viewer and the escrow lands in 24H SETTLED VOLUME.
    const node = snap.nodes.find((n) => n.id === 'VTOL-260-TX-04')
    expect(node).toMatchObject({ status: 'TASKED', taskId: receipt.task_id, taskedUntil: Date.parse(receipt.issued_at) + LOCK_MS })
    expect(snap.stats.settled24hCents).toBe(SEED_STATS.settled24hCents + 4250)
    expect(snap.seq).toBe(1)
  })

  it('a second dispatch to the locked node -> 409 ESCROW REJECTED / ERR_NODE_BUSY', async () => {
    const res = await dispatch(defaultSortie)
    expect(res.status).toBe(409)
    expect(res.headers.get('content-type')).toBe(NDJSON)
    expect(res.headers.get('x-meatspace-task-id')).toBeNull()
    const events = (await readNdjson(res)).map((t) => t.event)
    expect(steps(events).map((s) => [s.phase, s.status])).toEqual([
      ['VALIDATE', 'PASS'],
      ['ESCROW', 'REJECTED'],
    ])
    expect(events[2]).toMatchObject({ type: 'error', t_ms: 140, phase: 'ESCROW', code: 'ERR_NODE_BUSY', http_status: 409 })
    expect(events[2].type === 'error' && events[2].message).toMatch(new RegExp(`^node VTOL-260-TX-04 is executing ${receipt.task_id}; lock releases in \\d+s$`))
  })

  it('releases the lock lazily on the next read once taskedUntil has passed; the battery node goes back on charge', async () => {
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now + LOCK_MS + 1000)
    const node = (await snapshot()).nodes.find((n) => n.id === 'VTOL-260-TX-04')
    expect(node).toMatchObject({ status: 'CHARGING', taskedUntil: null, taskId: null })
  })
})

describe('POST /v1/dispatch: lock release without viewers', () => {
  it('the tick alarm releases the lock, recharges the node to DOCKED, then stops rescheduling', async () => {
    const node = 'QDR-SUB-44'
    const res = await dispatch(buildPayload(seedNode(node)))
    expect(res.status).toBe(200)
    await res.arrayBuffer()

    const stub = network()
    expect(await runInDurableObject(stub, (_, state) => state.storage.getAlarm())).not.toBeNull()

    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + LOCK_MS + 1000)
    expect(await runDurableObjectAlarm(stub)).toBe(true)
    vi.restoreAllMocks()

    const released = (await snapshot()).nodes.find((n) => n.id === node)
    expect(released).toMatchObject({ status: 'CHARGING', taskId: null, taskedUntil: null })
    // Still charging: the object keeps ticking with no viewers so curl-only traffic sees the node recover.
    expect(await runInDurableObject(stub, (_, state) => state.storage.getAlarm())).not.toBeNull()

    for (let i = 0; i < 60 && (await snapshot()).nodes.find((n) => n.id === node)?.status === 'CHARGING'; i++) {
      expect(await runDurableObjectAlarm(stub)).toBe(true)
    }
    expect((await snapshot()).nodes.find((n) => n.id === node)).toMatchObject({ status: 'DOCKED' })
    // No sockets, no locks, nothing charging: the object goes fully idle.
    expect(await runInDurableObject(stub, (_, state) => state.storage.getAlarm())).toBeNull()
  })

  it('a mains cell returns straight to IDLE on release', async () => {
    const res = await dispatch(buildPayload(seedNode('CNC-5AX-03')))
    expect(res.status).toBe(200)
    await res.arrayBuffer()
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + LOCK_MS + 1000)
    expect((await snapshot()).nodes.find((n) => n.id === 'CNC-5AX-03')).toMatchObject({ status: 'IDLE', taskId: null })
  })
})

describe('POST /v1/dispatch: state-machine failures stream with the matching HTTP status', () => {
  it('unknown node -> 404 VALIDATE FAIL / ERR_NODE_NOT_FOUND', async () => {
    const res = await dispatch({ ...defaultSortie, node_id: 'NOPE-404' })
    expect(res.status).toBe(404)
    expect(res.headers.get('content-type')).toBe(NDJSON)
    const events = (await readNdjson(res)).map((t) => t.event)
    expect(events).toEqual([
      { type: 'step', t_ms: 0, phase: 'VALIDATE', status: 'FAIL', message: 'Resolving node NOPE-404 in the simulator...' },
      {
        type: 'error',
        t_ms: 0,
        phase: 'VALIDATE',
        code: 'ERR_NODE_NOT_FOUND',
        message: 'node NOPE-404 does not exist in the simulator',
        http_status: 404,
      },
    ])
  })

  it('geometry outside the firmware geofence -> 422 ERR_GEOFENCE', async () => {
    // Orkney node, Pilbara corridor.
    const pilbara = buildPayload(seedNode('HLX-MR-31')) as AerialIsrPayload
    const res = await dispatch({ ...buildPayload(seedNode('ORK-VTOL-09')), geometry: pilbara.geometry })
    expect(res.status).toBe(422)
    const events = (await readNdjson(res)).map((t) => t.event)
    expect(steps(events)).toEqual([{ t_ms: 0, phase: 'VALIDATE', status: 'FAIL', message: 'Validating GeoJSON polygon against node firmware geofence...' }])
    expect(events[1]).toMatchObject({ type: 'error', phase: 'VALIDATE', code: 'ERR_GEOFENCE', http_status: 422 })
  })

  it('a failed dispatch leaves state untouched', async () => {
    const before = await snapshot()
    const res = await dispatch({ ...buildPayload(seedNode('ARM-CELL-12')), tolerance_mm: 0.001 })
    expect(res.status).toBe(422)
    expect(steps((await readNdjson(res)).map((t) => t.event))).toEqual([
      { t_ms: 0, phase: 'VALIDATE', status: 'FAIL', message: 'Validating tolerance against cell capability...' },
    ])
    const after = await snapshot()
    expect(after.stats.settled24hCents).toBe(before.stats.settled24hCents)
    expect(after.nodes.find((n) => n.id === 'ARM-CELL-12')?.status).toBe('IDLE')
  })
})

describe('POST /v1/dispatch: pre-stream errors are JSON', () => {
  it('invalid JSON -> 400 ERR_INVALID_JSON', async () => {
    await expectApiError(await dispatch('{"primitive":'), 400, 'ERR_INVALID_JSON')
  })

  it('empty body -> 400 ERR_INVALID_JSON', async () => {
    await expectApiError(await call('/v1/concept/dispatch', { method: 'POST' }), 400, 'ERR_INVALID_JSON')
  })

  it('schema violation -> 400 ERR_SCHEMA with the JSON path', async () => {
    const err = await expectApiError(await dispatch({ ...defaultSortie, est_duration_min: -1 }), 400, 'ERR_SCHEMA')
    expect(err).toEqual({ code: 'ERR_SCHEMA', message: '$.est_duration_min: must be >= 1', path: '$.est_duration_min' })
  })

  it('est_duration_min below the 1-minute billable minimum -> 400 ERR_SCHEMA', async () => {
    const err = await expectApiError(await dispatch({ ...defaultSortie, est_duration_min: 0.5 }), 400, 'ERR_SCHEMA')
    expect(err.path).toBe('$.est_duration_min')
  })

  it('accepts JSON sent without a JSON content-type (curl -d)', async () => {
    const res = await call('/v1/concept/dispatch', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: JSON.stringify({ ...defaultSortie, node_id: 'NOPE-404' }),
    })
    expect(res.status).toBe(404)
    await res.arrayBuffer()
  })

  it('declared oversize body -> 413 ERR_PAYLOAD_TOO_LARGE', async () => {
    const body = JSON.stringify({ ...defaultSortie, pad: 'x'.repeat(MAX_BODY_BYTES) })
    await expectApiError(await dispatch(body), 413, 'ERR_PAYLOAD_TOO_LARGE')
  })

  it('streamed oversize body without content-length -> 413', async () => {
    const chunk = new TextEncoder().encode('x'.repeat(4096))
    let sent = 0
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent++ < 8) controller.enqueue(chunk)
        else controller.close()
      },
    })
    const res = await call('/v1/concept/dispatch', { method: 'POST', body })
    await expectApiError(res, 413, 'ERR_PAYLOAD_TOO_LARGE')
  })

  it('rate limit: the 21st request in a minute from one IP -> 429 with retry-after', async () => {
    const ip = randomIp()
    for (let i = 0; i < 20; i++) await expectApiError(await dispatch('{', ip), 400, 'ERR_INVALID_JSON')
    const res = await dispatch('{', ip)
    expect(res.headers.get('retry-after')).toBe('60')
    await expectApiError(res, 429, 'ERR_RATE_LIMITED')
  })
})

describe('POST /v1/dispatch: telemetry_stream_hash recipe', () => {
  it('is reproducible from the receipt and the parsed request: unknown fields dropped, key order irrelevant', async () => {
    const payload = buildPayload(seedNode('AMR-V50-08')) as SubstationSweepPayload
    const body = {
      note: 'not in the schema',
      ...Object.fromEntries(Object.entries(payload).reverse()),
      thresholds: { emissivity: payload.thresholds.emissivity, vendor_extra: true, delta_t_alarm_c: payload.thresholds.delta_t_alarm_c },
    }
    const res = await dispatch(body)
    expect(res.status).toBe(200)
    const last = (await readNdjson(res)).at(-1)?.event
    if (last?.type !== 'receipt') throw new Error('expected a receipt')
    expect(last.receipt.telemetry_stream_hash).toBe(await expectedHash(last.receipt, body))
    expect(last.receipt.telemetry_stream_hash).toBe(await expectedHash(last.receipt, payload))
  })
})

describe('POST /v1/dispatch: per-client lock quota', () => {
  const lock = async (id: string, ip: string) => {
    const res = await dispatch(buildPayload(seedNode(id)), ip)
    expect(res.status, id).toBe(200)
    await res.arrayBuffer()
  }

  async function expectQuotaRejection(res: Response) {
    expect(res.status).toBe(429)
    expect(res.headers.get('content-type')).toBe(NDJSON)
    expect(res.headers.get('x-meatspace-task-id')).toBeNull()
    const retryAfter = Number(res.headers.get('retry-after'))
    expect(retryAfter).toBeGreaterThanOrEqual(1)
    expect(retryAfter).toBeLessThanOrEqual(LOCK_MS / 1000)
    const events = (await readNdjson(res)).map((t) => t.event)
    expect(steps(events).map((s) => [s.phase, s.status])).toEqual([
      ['VALIDATE', 'PASS'],
      ['ESCROW', 'REJECTED'],
    ])
    expect(events[2]).toMatchObject({ type: 'error', t_ms: 140, phase: 'ESCROW', code: 'ERR_LOCK_QUOTA', http_status: 429 })
    expect(events[2].type === 'error' && events[2].message).toBe(
      `client already holds ${MAX_ACTIVE_LOCKS_PER_CLIENT} active task locks (limit ${MAX_ACTIVE_LOCKS_PER_CLIENT}); retry when one releases in ${retryAfter}s`,
    )
  }

  it(`a client already holding ${MAX_ACTIVE_LOCKS_PER_CLIENT} locks -> 429 ESCROW REJECTED / ERR_LOCK_QUOTA; other clients are unaffected`, async () => {
    const ip = randomIp()
    await lock('ORK-VTOL-09', ip)
    await lock('QDR-GH-17', ip)
    await expectQuotaRejection(await dispatch(buildPayload(seedNode('ARM-CELL-27')), ip))
    const after = await snapshot()
    expect(after.nodes.find((n) => n.id === 'ARM-CELL-27')?.status).toBe('IDLE')
    // Lock holders are never published: nodes carry exactly their seed fields.
    for (const n of after.nodes) expect(Object.keys(n).sort()).toEqual(Object.keys(seedNode(n.id)).sort())
    // The node is free, so a different client gets it.
    await lock('ARM-CELL-27', randomIp())
  })

  it('once one of its locks releases, the client can lock again', async () => {
    const ip = randomIp()
    await lock('VTOL-180-AB-11', ip)
    await lock('ARM-CELL-12', ip)
    await expectQuotaRejection(await dispatch(buildPayload(seedNode('HLX-MR-31')), ip))
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + LOCK_MS + 1000)
    await lock('HLX-MR-31', ip)
  })

  it('addresses in one IPv6 /64 share the quota', async () => {
    const prefix = randomIp().replace(/::1$/, '')
    const longhand = prefix
      .split(':')
      .map((g) => g.padStart(4, '0'))
      .join(':')
    await lock('ORK-VTOL-09', `${prefix}::1`)
    await lock('QDR-GH-17', `${longhand}:0000:0000:0000:0002`)
    await expectQuotaRejection(await dispatch(buildPayload(seedNode('ARM-CELL-27')), `${prefix}:ffff:ffff:ffff:fffe`))
  })

  it('addresses in one IPv6 /64 share the dispatch rate limit; the neighbouring /64 does not', async () => {
    const prefix = randomIp().replace(/::1$/, '')
    for (let i = 1; i <= 20; i++) await expectApiError(await dispatch('{', `${prefix}:${i.toString(16)}::1`), 400, 'ERR_INVALID_JSON')
    const res = await dispatch('{', `${prefix}::abcd`)
    expect(res.headers.get('retry-after')).toBe('60')
    await expectApiError(res, 429, 'ERR_RATE_LIMITED')
    const groups = prefix.split(':')
    const neighbour = [...groups.slice(0, 3), (parseInt(groups[3], 16) ^ 1).toString(16)].join(':')
    await expectApiError(await dispatch('{', `${neighbour}::1`), 400, 'ERR_INVALID_JSON')
  })
})
