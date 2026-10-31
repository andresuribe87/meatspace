import { runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'

import { SEED_NODES, SEED_STATS } from '../../shared/nodes'
import { buildPayload } from '../../shared/primitives'
import { TASK_LOCK_MS, TICK_MS } from '../../shared/constants'
import type { HardwareNode, NetworkSnapshot, NetworkStats, StreamMessage } from '../../shared/types'
import { driftNode, driftStats, type Rng } from '../../worker/drift'
import { call, network, postJson, snapshot } from './helpers'

const seedNode = (id: string) => ({ ...(SEED_NODES.find((n) => n.id === id) as HardwareNode) })

/** Deterministic RNG (mulberry32) so drift runs are reproducible. */
function seeded(seed: number): Rng {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function expectStatsInBounds(s: NetworkStats) {
  expect(Number.isInteger(s.activeNodes)).toBe(true)
  expect(s.activeNodes).toBeGreaterThanOrEqual(1380)
  expect(s.activeNodes).toBeLessThanOrEqual(1440)
  expect(Math.round(s.availableHrs * 10) / 10).toBe(s.availableHrs)
  expect(s.availableHrs).toBeGreaterThanOrEqual(880)
  expect(s.availableHrs).toBeLessThanOrEqual(970)
  expect(Number.isInteger(s.settled24hCents)).toBe(true)
  expect(s.settled24hCents).toBeGreaterThanOrEqual(13_500_000)
  expect(Number.isInteger(s.latencyMs)).toBe(true)
  expect(s.latencyMs).toBeGreaterThanOrEqual(12)
  expect(s.latencyMs).toBeLessThanOrEqual(26)
}

describe('drift model', () => {
  it('keeps ticker stats bounded and smooth over a simulated day', () => {
    const rng = seeded(1)
    let s: NetworkStats = { ...SEED_STATS }
    for (let i = 0; i < 43_200; i++) {
      const next = driftStats(s, rng)
      expectStatsInBounds(next)
      expect(Math.abs(next.activeNodes - s.activeNodes)).toBeLessThanOrEqual(6)
      expect(Math.abs(next.availableHrs - s.availableHrs)).toBeLessThanOrEqual(5)
      expect(Math.abs(next.latencyMs - s.latencyMs)).toBeLessThanOrEqual(4)
      s = next
    }
  })

  it('mean-reverts from the edges of each band', () => {
    const rng = seeded(2)
    let s: NetworkStats = { activeNodes: 1440, availableHrs: 970, settled24hCents: 16_000_000, latencyMs: 26 }
    for (let i = 0; i < 300; i++) s = driftStats(s, rng)
    expect(Math.abs(s.activeNodes - SEED_STATS.activeNodes)).toBeLessThan(15)
    expect(Math.abs(s.availableHrs - SEED_STATS.availableHrs)).toBeLessThan(15)
    expect(Math.abs(s.latencyMs - SEED_STATS.latencyMs)).toBeLessThanOrEqual(4)
    expect(s.settled24hCents).toBeLessThan(14_600_000)
  })

  it('never lets settled volume fall below the floor', () => {
    expect(driftStats({ ...SEED_STATS, settled24hCents: 13_400_000 }, () => 0.99).settled24hCents).toBe(13_500_000)
  })

  it('battery: DOCKED charges to 100, CHARGING docks at 95, IDLE drains slowly and starts charging below 30', () => {
    const rng = seeded(3)
    expect(driftNode({ ...seedNode('VTOL-260-TX-04'), charge: 94 }, rng).charge).toBeCloseTo(94.3)
    expect(driftNode({ ...seedNode('VTOL-260-TX-04'), charge: 99.9 }, rng).charge).toBe(100)
    expect(driftNode({ ...seedNode('VTOL-260-TX-04'), status: 'CHARGING', charge: 94.6 }, rng)).toMatchObject({ status: 'DOCKED' })
    expect(driftNode({ ...seedNode('VTOL-260-TX-04'), status: 'CHARGING', charge: 50 }, rng)).toMatchObject({ status: 'CHARGING', charge: 51 })
    expect(driftNode(seedNode('SPOT-SUB-44'), rng).charge).toBeCloseTo(77.98)
    expect(driftNode({ ...seedNode('SPOT-SUB-44'), charge: 30.01 }, rng)).toMatchObject({ status: 'CHARGING' })
  })

  it('battery: TASKED drains at 10x real time and never below 5%', () => {
    const tasked = { ...seedNode('VTOL-260-TX-04'), status: 'TASKED' as const }
    // 2.5 %/min x (2 s / 60 s) x 10
    expect(driftNode(tasked, Math.random).charge).toBeCloseTo(94 - 2.5 * (2 / 60) * 10)
    expect(driftNode({ ...tasked, charge: 5.5 }, Math.random).charge).toBe(5)
  })

  it('mains: idle headroom walks within [80, 100], decays toward 35 under load and recovers smoothly', () => {
    const rng = seeded(4)
    let n = seedNode('ARM-CELL-12')
    for (let i = 0; i < 5000; i++) {
      n = driftNode(n, rng)
      expect(n.charge).toBeGreaterThanOrEqual(80)
      expect(n.charge).toBeLessThanOrEqual(100)
    }
    let load: HardwareNode = { ...seedNode('ARM-CELL-12'), status: 'TASKED' }
    for (let i = 0; i < 15; i++) load = driftNode(load, rng)
    expect(load.charge).toBeGreaterThan(35)
    expect(load.charge).toBeLessThan(50)
    let idle: HardwareNode = { ...load, status: 'IDLE' }
    for (let i = 0; i < 40; i++) {
      const next = driftNode(idle, rng)
      expect(next.charge).toBeGreaterThanOrEqual(Math.min(idle.charge, 80))
      expect(next.charge - idle.charge).toBeLessThan(5)
      idle = next
    }
    expect(idle.charge).toBeGreaterThanOrEqual(80)
  })

  it('never changes static node data', () => {
    const rng = seeded(5)
    for (const seed of SEED_NODES) {
      const { charge: _c, status: _s, ...fixed } = driftNode({ ...seed }, rng)
      const { charge: _c2, status: _s2, ...expected } = seed
      expect(fixed).toEqual(expected)
    }
  })
})

describe('NetworkState ticks', () => {
  it('a tick with nobody watching drifts, publishes and does not reschedule', async () => {
    const stub = network()
    const before = await snapshot()
    expect(before.seq).toBe(0)
    await runInDurableObject(stub, (_, state) => state.storage.setAlarm(Date.now() + 60_000))
    expect(await runDurableObjectAlarm(stub)).toBe(true)

    const after = await snapshot()
    expect(after.seq).toBe(1)
    expectStatsInBounds(after.stats)
    expect(after.nodes.find((n) => n.id === 'VTOL-260-TX-04')?.charge).toBe(94.3)
    expect(await runInDurableObject(stub, (_, state) => state.storage.getAlarm())).toBeNull()
  })

  it('publishes charge rounded to 0.1 and persists the published form', async () => {
    const stub = network()
    for (let i = 0; i < 3; i++) await runInDurableObject(stub, (instance) => instance.alarm())
    const snap = await snapshot()
    for (const n of snap.nodes) expect(Math.round(n.charge * 10) / 10).toBe(n.charge)
    const stored = await runInDurableObject(stub, (_, state) => state.storage.kv.get<NetworkSnapshot>('snapshot'))
    expect(stored?.seq).toBe(snap.seq)
    expect(stored?.stats).toEqual(snap.stats)
  })
})

/** Collects WebSocket text frames so tests can await the next one matching a predicate. */
function inbox(ws: WebSocket) {
  const frames: string[] = []
  let wake: (() => void) | null = null
  ws.addEventListener('message', (e) => {
    frames.push(e.data as string)
    wake?.()
  })
  return async function next(match: (frame: string) => boolean = () => true, timeoutMs = 4000): Promise<string> {
    const deadline = Date.now() + timeoutMs
    for (;;) {
      const i = frames.findIndex(match)
      if (i >= 0) return frames.splice(0, i + 1)[i]
      if (Date.now() > deadline) throw new Error(`no matching frame within ${timeoutMs}ms; got ${frames.length}`)
      await Promise.race([new Promise<void>((r) => (wake = r)), scheduler.wait(100)])
    }
  }
}

const snapshotFrame = (frame: string) => (JSON.parse(frame) as StreamMessage).data

describe('GET /v1/stream', () => {
  it('upgrades, sends a snapshot immediately, answers ping, and pushes ticks and dispatches', async () => {
    const res = await call('/v1/stream', { headers: { upgrade: 'websocket' } })
    expect(res.status).toBe(101)
    const ws = res.webSocket
    if (!ws) throw new Error('no webSocket on 101 response')
    const next = inbox(ws)
    ws.accept()

    const first = JSON.parse(await next()) as StreamMessage
    expect(first.type).toBe('snapshot')
    expect(first.data).toEqual(await snapshot())

    const stub = network()
    expect(await runInDurableObject(stub, (_, state) => state.storage.getAlarm())).not.toBeNull()

    ws.send('ping')
    expect(await next((f) => f === 'pong')).toBe('pong')

    // A tick reaches the viewer and, with a viewer connected, the tick loop keeps going.
    expect(await runDurableObjectAlarm(stub)).toBe(true)
    const ticked = snapshotFrame(await next((f) => f.startsWith('{') && snapshotFrame(f).seq > first.data.seq))
    expectStatsInBounds(ticked.stats)
    expect(await runInDurableObject(stub, (_, state) => state.storage.getAlarm())).not.toBeNull()

    // A dispatch is broadcast right away, before its NDJSON stream finishes.
    const dispatch = await postJson('/v1/dispatch', buildPayload(seedNode('QDR-B2-17')))
    expect(dispatch.status).toBe(200)
    const taskId = dispatch.headers.get('x-meatspace-task-id')
    const locked = snapshotFrame(await next((f) => f.startsWith('{') && snapshotFrame(f).nodes.some((n) => n.taskId === taskId)))
    expect(locked.nodes.find((n) => n.id === 'QDR-B2-17')?.status).toBe('TASKED')
    await dispatch.arrayBuffer()

    ws.close(1000, 'done')
  })
})

describe('demo availability', () => {
  const required = 2.5 * 12.5 + 25 // default sortie draw on VTOL-260-TX-04 + 25% RTL reserve
  const LOCK_TICKS = TASK_LOCK_MS / TICK_MS
  const run = (n: HardwareNode, status: HardwareNode['status'], ticks: number, rng: Rng) => {
    let x: HardwareNode = { ...n, status }
    for (let t = 0; t < ticks; t++) x = driftNode(x, rng)
    return x
  }

  it('re-dispatching the default node every ~30 s after release never trips its charge check', () => {
    const rng = seeded(9)
    let n = seedNode('VTOL-260-TX-04')
    for (let cycle = 0; cycle < 50; cycle++) {
      expect(n.charge).toBeGreaterThanOrEqual(required)
      n = run(n, 'TASKED', LOCK_TICKS, rng)
      n = run(n, 'CHARGING', LOCK_TICKS, rng)
    }
  })

  it('even after being hammered back-to-back, the default node is dispatchable again within ~30 s', () => {
    const rng = seeded(10)
    let n = seedNode('VTOL-260-TX-04')
    while (n.charge >= required) n = run(n, 'TASKED', LOCK_TICKS, rng)
    n = run(n, 'CHARGING', LOCK_TICKS, rng)
    expect(n.charge).toBeGreaterThanOrEqual(required)
  })
})
