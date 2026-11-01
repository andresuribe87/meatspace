/**
 * Live network state for the SPA.
 *
 * A module-level singleton store owns ONE WebSocket to /v1/stream no matter how many components
 * call useNetwork(). The NetworkState Durable Object pushes a full NetworkSnapshot on connect and
 * every ~2 s while anyone is connected; the first paint uses the seed dataset so the handoff values
 * render before the socket opens.
 *
 * Lifecycle:
 *  - connects on first subscriber, disconnects shortly after the last one leaves (StrictMode safe);
 *  - exponential backoff with jitter (1 s, 2 s, 4 s, 8 s, ... capped at 15 s), reset by a good snapshot;
 *  - "ping" every 25 s while open, and a watchdog that recycles a socket that went silent;
 *  - closes (1000) while the tab is hidden so the Durable Object can idle, reconnects on return;
 *  - parks in 'offline' while navigator.onLine is false.
 */
import { useSyncExternalStore } from 'react'

import { seedSnapshot } from '../../shared/nodes'
import type { Category, HardwareNode, Interface, NetworkSnapshot, NetworkStats, NodeStatus, PowerSource, Vec3Mm } from '../../shared/types'

export type ConnectionState = 'connecting' | 'live' | 'reconnecting' | 'offline'

export interface NetworkState {
  snapshot: NetworkSnapshot
  connection: ConnectionState
  /**
   * Estimated server clock minus client clock (ms): server time ~= Date.now() + clockOffsetMs. Derived from
   * snapshot.ts (stamped when the server produced it) at receipt, so it includes the one-way delivery delay.
   * 0 until the first live snapshot.
   */
  clockOffsetMs: number
}

const PING_INTERVAL_MS = 25_000
/** No frame at all (snapshot or pong) for this long means the socket is dead. */
const SILENCE_LIMIT_MS = 2 * PING_INTERVAL_MS + 5_000
const BACKOFF_BASE_MS = 1_000
const BACKOFF_MAX_MS = 15_000
/** A seq this far below the last one means the server's counter was reset; accept and re-sync. */
const SEQ_RESET_WINDOW = 1_000
/** Clock offset smoothing: each sample moves the estimate this far; a jump beyond OFFSET_RESET_MS (clock change) is taken as is. */
const OFFSET_SMOOTHING = 0.25
const OFFSET_RESET_MS = 1_000

/* ----------------------------------------------------------------------------
 * Defensive decoding of server frames
 * ------------------------------------------------------------------------- */

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isStr = (v: unknown): v is string => typeof v === 'string'

const CATEGORIES: ReadonlySet<string> = new Set<Category>(['AERIAL', 'GROUND', 'MANIPULATOR'])
const INTERFACES: ReadonlySet<string> = new Set<Interface>(['MAVLink v2', 'ROS 2 Humble', 'VDA 5050', 'OPC UA'])
const POWER: ReadonlySet<string> = new Set<PowerSource>(['BATTERY', 'MAINS'])
const STATUSES: ReadonlySet<string> = new Set<NodeStatus>(['DOCKED', 'IDLE', 'CHARGING', 'TASKED'])

function decodeStats(v: unknown): NetworkStats | null {
  if (!isObj(v)) return null
  const { activeNodes, availableHrs, settled24hCents, latencyMs } = v
  if (!isNum(activeNodes) || !isNum(availableHrs) || !isNum(settled24hCents) || !isNum(latencyMs)) return null
  return { activeNodes, availableHrs, settled24hCents, latencyMs }
}

function decodeNode(v: unknown): HardwareNode | null {
  if (!isObj(v)) return null
  const n = v
  if (!isStr(n.id) || n.id.length === 0) return null
  if (!isStr(n.category) || !CATEGORIES.has(n.category)) return null
  if (!isStr(n.iface) || !INTERFACES.has(n.iface)) return null
  if (!isStr(n.power) || !POWER.has(n.power)) return null
  if (!isStr(n.status) || !STATUSES.has(n.status)) return null
  if (!isStr(n.chassis) || !isStr(n.sector) || !isStr(n.sensors)) return null
  if (!isNum(n.lat) || !isNum(n.lon) || !isNum(n.charge) || !isNum(n.rateCents)) return null
  if (!isNum(n.geofenceKm) || !isNum(n.drainPctPerMin)) return null
  if (!(n.taskedUntil === null || n.taskedUntil === undefined || isNum(n.taskedUntil))) return null
  if (!(n.taskId === null || n.taskId === undefined || isStr(n.taskId))) return null

  const node: HardwareNode = {
    id: n.id,
    category: n.category as Category,
    chassis: n.chassis,
    iface: n.iface as Interface,
    lat: n.lat,
    lon: n.lon,
    sector: n.sector,
    sensors: n.sensors,
    power: n.power as PowerSource,
    charge: n.charge,
    status: n.status as NodeStatus,
    rateCents: n.rateCents,
    geofenceKm: n.geofenceKm,
    drainPctPerMin: n.drainPctPerMin,
    taskedUntil: isNum(n.taskedUntil) ? n.taskedUntil : null,
    taskId: isStr(n.taskId) ? n.taskId : null,
  }
  if (isNum(n.minAglM)) node.minAglM = n.minAglM
  if (isNum(n.minToleranceMm)) node.minToleranceMm = n.minToleranceMm
  if (Array.isArray(n.envelopeMm) && n.envelopeMm.length === 3 && n.envelopeMm.every(isNum)) {
    node.envelopeMm = [...n.envelopeMm] as Vec3Mm
  }
  return node
}

/** StreamMessage -> NetworkSnapshot, or null when the frame is not a well-formed snapshot. */
export function decodeStreamMessage(raw: unknown): NetworkSnapshot | null {
  if (!isObj(raw) || raw.type !== 'snapshot' || !isObj(raw.data)) return null
  const d = raw.data
  if (!isNum(d.seq) || !isNum(d.ts)) return null
  const stats = decodeStats(d.stats)
  if (!stats || !Array.isArray(d.nodes)) return null
  const nodes = d.nodes.map(decodeNode).filter((n): n is HardwareNode => n !== null)
  // Drop individually malformed nodes, but never replace a good orderbook with an empty one.
  if (d.nodes.length > 0 && nodes.length === 0) return null
  return { seq: d.seq, ts: d.ts, stats, nodes }
}

/* ----------------------------------------------------------------------------
 * Singleton store
 * ------------------------------------------------------------------------- */

const hasDom = typeof window !== 'undefined' && typeof document !== 'undefined'
const isOffline = () => hasDom && navigator.onLine === false

let state: NetworkState = { snapshot: seedSnapshot(), connection: isOffline() ? 'offline' : 'connecting', clockOffsetMs: 0 }
const listeners = new Set<() => void>()

let running = false
let socket: WebSocket | null = null
let attempt = 0
let lastSeq = 0
/** The next snapshot is the first on a new socket: accept it whatever its seq (re-sync). */
let awaitingFirstFrame = true
/** True once any socket has dropped or been closed; selects 'reconnecting' over 'connecting'. */
let hasDropped = false
let lastFrameAt = 0
let hasClockOffset = false
let reconnectTimer: ReturnType<typeof setTimeout> | undefined
let pingTimer: ReturnType<typeof setInterval> | undefined
let stopTimer: ReturnType<typeof setTimeout> | undefined

function setState(next: Partial<NetworkState>): void {
  const snapshot = next.snapshot ?? state.snapshot
  const connection = next.connection ?? state.connection
  const clockOffsetMs = next.clockOffsetMs ?? state.clockOffsetMs
  if (snapshot === state.snapshot && connection === state.connection && clockOffsetMs === state.clockOffsetMs) return
  state = { snapshot, connection, clockOffsetMs }
  listeners.forEach((l) => l())
}

function estimateClockOffset(sample: number): number {
  const prev = state.clockOffsetMs
  if (!hasClockOffset || Math.abs(sample - prev) > OFFSET_RESET_MS) {
    hasClockOffset = true
    return sample
  }
  return Math.round(prev + (sample - prev) * OFFSET_SMOOTHING)
}

const pendingState = (): ConnectionState => (isOffline() ? 'offline' : hasDropped ? 'reconnecting' : 'connecting')

function streamUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}/v1/concept/stream`
}

function clearReconnect(): void {
  if (reconnectTimer !== undefined) clearTimeout(reconnectTimer)
  reconnectTimer = undefined
}

function stopPing(): void {
  if (pingTimer !== undefined) clearInterval(pingTimer)
  pingTimer = undefined
}

/** Intentional close (hidden tab, offline, unmount). Detaches handlers so no reconnect is scheduled. */
function closeSocket(): void {
  const s = socket
  if (!s) return
  socket = null
  stopPing()
  s.onopen = null
  s.onmessage = null
  s.onerror = null
  s.onclose = null
  try {
    s.close(1000, 'client idle')
  } catch {
    /* already closing */
  }
}

function scheduleReconnect(): void {
  if (!running || socket || reconnectTimer !== undefined) return
  if (isOffline() || document.hidden) return
  const base = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** Math.min(attempt, 10))
  // +/-25% jitter so a fleet of tabs does not reconnect in lockstep after a deploy.
  const delay = Math.min(BACKOFF_MAX_MS, Math.round(base * (0.75 + Math.random() * 0.5)))
  attempt += 1
  reconnectTimer = setTimeout(() => {
    reconnectTimer = undefined
    connect()
  }, delay)
}

function onFrame(data: unknown): void {
  const receivedAt = Date.now()
  lastFrameAt = receivedAt
  if (typeof data !== 'string' || data === 'pong') return
  let parsed: unknown
  try {
    parsed = JSON.parse(data)
  } catch {
    return
  }
  const snap = decodeStreamMessage(parsed)
  if (!snap) return
  const inOrder = snap.seq > lastSeq || snap.seq < lastSeq - SEQ_RESET_WINDOW
  if (!awaitingFirstFrame && !inOrder) return
  awaitingFirstFrame = false
  lastSeq = snap.seq
  attempt = 0
  setState({ snapshot: snap, connection: 'live', clockOffsetMs: estimateClockOffset(snap.ts - receivedAt) })
}

function connect(): void {
  if (!running || socket) return
  clearReconnect()
  if (isOffline()) {
    setState({ connection: 'offline' })
    return
  }
  if (document.hidden) return

  let s: WebSocket
  try {
    s = new WebSocket(streamUrl())
  } catch {
    hasDropped = true
    setState({ connection: pendingState() })
    scheduleReconnect()
    return
  }
  socket = s
  awaitingFirstFrame = true
  lastFrameAt = Date.now()

  s.onopen = () => {
    if (socket !== s) return
    lastFrameAt = Date.now()
    stopPing()
    pingTimer = setInterval(() => {
      if (socket !== s) return
      if (Date.now() - lastFrameAt > SILENCE_LIMIT_MS) {
        // Half-open connection (sleeping laptop, dead NAT mapping): recycle it.
        drop()
        return
      }
      if (s.readyState === WebSocket.OPEN) s.send('ping')
    }, PING_INTERVAL_MS)
  }
  s.onmessage = (ev: MessageEvent) => {
    if (socket === s) onFrame(ev.data)
  }
  // 'close' always follows 'error', so reconnection is driven from onclose alone.
  s.onclose = () => {
    if (socket !== s) return
    socket = null
    stopPing()
    hasDropped = true
    setState({ connection: pendingState() })
    scheduleReconnect()
  }
}

/** Unexpected loss: close and back off. */
function drop(): void {
  closeSocket()
  hasDropped = true
  setState({ connection: pendingState() })
  scheduleReconnect()
}

function onVisibility(): void {
  if (document.hidden) {
    clearReconnect()
    if (socket) {
      closeSocket()
      hasDropped = true
      setState({ connection: pendingState() })
    }
  } else {
    attempt = 0
    connect()
  }
}

function onOffline(): void {
  clearReconnect()
  closeSocket()
  hasDropped = true
  setState({ connection: 'offline' })
}

function onOnline(): void {
  attempt = 0
  setState({ connection: pendingState() })
  connect()
}

function start(): void {
  if (running || !hasDom) return
  running = true
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  setState({ connection: pendingState() })
  connect()
}

function stop(): void {
  if (!running) return
  running = false
  clearReconnect()
  closeSocket()
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  if (stopTimer !== undefined) {
    clearTimeout(stopTimer)
    stopTimer = undefined
  }
  start()
  return () => {
    listeners.delete(listener)
    if (listeners.size > 0 || stopTimer !== undefined) return
    // Deferred so StrictMode's synchronous unmount/remount (and route swaps) keep the same socket.
    stopTimer = setTimeout(() => {
      stopTimer = undefined
      if (listeners.size === 0) stop()
    }, 0)
  }
}

const getSnapshot = (): NetworkState => state

// Vite HMR: never leave an orphaned socket behind when this module is replaced.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (stopTimer !== undefined) clearTimeout(stopTimer)
    stop()
  })
}

/** Live snapshot + connection state. All callers share one socket. */
export function useNetwork(): NetworkState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
