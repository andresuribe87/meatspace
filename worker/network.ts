/**
 * NetworkState: the single global Durable Object that owns live network state (ticker stats,
 * node charge/duty drift, task locks, settled volume) and pushes snapshots to every viewer.
 */
import { DurableObject } from 'cloudflare:workers'

import { TASK_LOCK_MS } from '../shared/constants'
import { attestMessage, PHASE_OFFSETS_MS, planDispatch } from '../shared/dispatch'
import { centsToDecimal, shortHash } from '../shared/format'
import { seedSnapshot } from '../shared/nodes'
import type {
  DispatchEvent,
  DispatchPayload,
  DispatchReceipt,
  HardwareNode,
  NetworkSnapshot,
  StreamMessage,
} from '../shared/types'
import { driftNode, driftStats, round1, TICK_MS } from './drift'

const STORAGE_KEY = 'snapshot'
/** Ticks persist at most this often; dispatches, lock releases and going idle always persist. */
const PERSIST_EVERY_TICKS = 15

export interface DispatchResult {
  httpStatus: number
  events: DispatchEvent[]
  taskId: string | null
}

export class NetworkState extends DurableObject<Env> {
  private state: NetworkSnapshot
  private unsavedTicks = 0

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    // Re-runs on every wake from hibernation, so it only does a synchronous local read.
    this.state = restore(ctx.storage.kv.get<NetworkSnapshot>(STORAGE_KEY))
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'))
  }

  snapshot(): NetworkSnapshot {
    this.releaseExpired(Date.now())
    return this.view()
  }

  node(id: string): HardwareNode | null {
    return this.snapshot().nodes.find((n) => n.id === id) ?? null
  }

  async dispatch(payload: DispatchPayload): Promise<DispatchResult> {
    const now = Date.now()
    this.releaseExpired(now)
    const node = this.state.nodes.find((n) => n.id === payload.node_id)
    const plan = planDispatch(payload, node, now)
    if (!node || !plan.compiled) return { httpStatus: plan.httpStatus, events: plan.events, taskId: null }

    // Check-and-lock completes before the first await, so a concurrent dispatch already sees TASKED.
    const taskId = `tsk_${hex(crypto.getRandomValues(new Uint8Array(8)))}`
    node.status = 'TASKED'
    node.taskedUntil = now + TASK_LOCK_MS
    node.taskId = taskId
    this.state.stats.settled24hCents += plan.escrowCents
    this.commit(now)
    await this.ensureTicking()

    const attest = await attestEvents({
      taskId,
      issuedAt: new Date(now).toISOString(),
      payload,
      node,
      escrowCents: plan.escrowCents,
      compiled: plan.compiled,
    })
    return { httpStatus: plan.httpStatus, events: [...plan.events, ...attest], taskId }
  }

  /** GET /v1/stream (forwarded by the Worker): hibernatable WebSocket that receives every snapshot. */
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('expected a WebSocket upgrade', { status: 426, headers: { upgrade: 'websocket' } })
    }
    const data = this.snapshot()
    const { 0: client, 1: server } = new WebSocketPair()
    this.ctx.acceptWebSocket(server)
    server.send(frame(data))
    await this.ensureTicking()
    return new Response(null, { status: 101, webSocket: client })
  }

  webSocketMessage(): void {
    // Clients only send "ping", which the runtime auto-answers without waking the object; anything else is ignored.
  }

  /** Tick: drift, publish, and keep going only while someone is watching, a lock is pending or a node is on its charger. */
  async alarm(): Promise<void> {
    const now = Date.now()
    const released = this.releaseLocks(now)
    this.state.stats = driftStats(this.state.stats, Math.random)
    this.state.nodes = this.state.nodes.map((n) => driftNode(n, Math.random))
    this.state.seq++
    this.state.ts = now
    this.unsavedTicks++
    const keepTicking = this.shouldTick()
    if (released || !keepTicking || this.unsavedTicks >= PERSIST_EVERY_TICKS) this.persist()
    this.broadcast()
    if (keepTicking) await this.ctx.storage.setAlarm(now + TICK_MS)
  }

  /**
   * Returns true when at least one expired lock was released. Battery nodes return to their dock and recharge
   * (so the default demo node is dispatchable again within ~30 s); mains cells go straight back to IDLE.
   */
  private releaseLocks(now: number): boolean {
    let released = false
    for (const n of this.state.nodes) {
      if (n.status === 'TASKED' && n.taskedUntil !== null && n.taskedUntil <= now) {
        n.status = n.power === 'BATTERY' ? 'CHARGING' : 'IDLE'
        n.taskedUntil = null
        n.taskId = null
        released = true
      }
    }
    return released
  }

  /** Lazy lock release on access, so reads never show a lock past its expiry. */
  private releaseExpired(now: number): void {
    if (this.releaseLocks(now)) this.commit(now)
  }

  private commit(now: number): void {
    this.state.seq++
    this.state.ts = now
    this.persist()
    this.broadcast()
  }

  private persist(): void {
    this.ctx.storage.kv.put(STORAGE_KEY, this.view())
    this.unsavedTicks = 0
  }

  private broadcast(): void {
    const message = frame(this.view())
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(message)
      } catch {
        // The socket is closing; the runtime drops it from getWebSockets() shortly.
      }
    }
  }

  private shouldTick(): boolean {
    return this.ctx.getWebSockets().length > 0 || this.state.nodes.some((n) => n.status === 'TASKED' || n.status === 'CHARGING')
  }

  private async ensureTicking(): Promise<void> {
    if ((await this.ctx.storage.getAlarm()) === null) await this.ctx.storage.setAlarm(Date.now() + TICK_MS)
  }

  /** Published form: charge rounded to 0.1. The walk itself keeps full precision so small per-tick drains accumulate. */
  private view(): NetworkSnapshot {
    return {
      ...this.state,
      stats: { ...this.state.stats },
      nodes: this.state.nodes.map((n) => ({ ...n, charge: round1(n.charge) })),
    }
  }
}

/** Static node data always comes from the current seed, so a deploy can change it; only live fields survive restarts. */
function restore(stored: NetworkSnapshot | undefined): NetworkSnapshot {
  const seed = seedSnapshot(Date.now())
  if (!stored) return seed
  const live = new Map(stored.nodes.map((n) => [n.id, n]))
  return {
    // Ticks since the last save were broadcast but not persisted; skip past them so clients never see seq go backwards.
    seq: stored.seq + PERSIST_EVERY_TICKS,
    ts: stored.ts,
    stats: stored.stats,
    nodes: seed.nodes.map((n) => {
      const s = live.get(n.id)
      return s ? { ...n, charge: s.charge, status: s.status, taskedUntil: s.taskedUntil, taskId: s.taskId } : n
    }),
  }
}

interface Attestation {
  taskId: string
  issuedAt: string
  payload: DispatchPayload
  node: HardwareNode
  escrowCents: number
  compiled: { artifact: string; count: number }
}

/** ATTEST step + receipt. The telemetry hash commits to the task, node, payload and issue time. */
async function attestEvents(a: Attestation): Promise<DispatchEvent[]> {
  const preimage = JSON.stringify({ task_id: a.taskId, node_id: a.node.id, payload: a.payload, issued_at: a.issuedAt })
  const hash = `0x${hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(preimage))))}`
  const receipt: DispatchReceipt = {
    task_id: a.taskId,
    status: 'DISPATCHED',
    primitive: a.payload.primitive,
    node_id: a.node.id,
    interface: a.node.iface,
    escrow_usdc: centsToDecimal(a.escrowCents),
    rate_usdc_per_min: centsToDecimal(a.node.rateCents),
    est_duration_min: a.payload.est_duration_min,
    compiled: { target: a.node.iface, artifact: a.compiled.artifact, count: a.compiled.count },
    telemetry_stream_hash: hash,
    attestation: 'TPM2_QUOTE',
    issued_at: a.issuedAt,
    sandbox: true,
  }
  const t_ms = PHASE_OFFSETS_MS.ATTEST
  return [
    { type: 'step', t_ms, phase: 'ATTEST', message: attestMessage(shortHash(hash)), status: 'SIGNED' },
    { type: 'receipt', t_ms, receipt },
  ]
}

const frame = (data: NetworkSnapshot) => JSON.stringify({ type: 'snapshot', data } satisfies StreamMessage)

const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
