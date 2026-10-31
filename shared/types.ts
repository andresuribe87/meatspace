/**
 * Wire contract shared by the SPA (src/) and the Worker + Durable Object (worker/).
 * Everything here is plain data: no DOM, no Workers runtime types.
 */

export type Category = 'AERIAL' | 'GROUND' | 'MANIPULATOR'
export type Interface = 'MAVLink v2' | 'ROS 2 Humble' | 'VDA 5050' | 'OPC UA'
export type PowerSource = 'BATTERY' | 'MAINS'
export type NodeStatus = 'DOCKED' | 'IDLE' | 'CHARGING' | 'TASKED'

export type PrimitiveId = 'AERIAL_ISR_SORTIE' | 'SUBSTATION_THERMAL_SWEEP' | 'AUTOMATED_CNC_SYNTHESIS'
export type Intent = 'SCAN_CORRIDOR' | 'INSPECT_ASSET' | 'FABRICATE_PART'

/** [x, y, z] in millimetres. */
export type Vec3Mm = [number, number, number]

export interface HardwareNode {
  id: string
  category: Category
  /** Display chassis class, e.g. "Hybrid VTOL Fixed-Wing". */
  chassis: string
  iface: Interface
  /** Signed decimal degrees (WGS84). South / West are negative. */
  lat: number
  lon: number
  /** Human sector label shown in brackets, e.g. "Permian Basin". */
  sector: string
  /** Display string, e.g. "EO/IR + RTK-GPS". */
  sensors: string
  power: PowerSource
  /** BATTERY: state of charge %. MAINS: available duty headroom %. 0..100. */
  charge: number
  status: NodeStatus
  /** Spot rate in USDC cents per minute (integer). */
  rateCents: number
  /** Firmware geofence radius around the node's home position, km. */
  geofenceKm: number
  /** BATTERY nodes: % of charge consumed per minute of tasking. 0 for MAINS. */
  drainPctPerMin: number
  /** AERIAL only: minimum AGL floor enforced by firmware, metres. */
  minAglM?: number
  /** MANIPULATOR only: work envelope, mm. */
  envelopeMm?: Vec3Mm
  /** MANIPULATOR only: best achievable tolerance, mm. */
  minToleranceMm?: number
  /** Epoch ms when the current task lock releases; null when not TASKED. */
  taskedUntil: number | null
  /** Task id currently holding the lock; null when not TASKED. */
  taskId: string | null
}

export interface NetworkStats {
  activeNodes: number
  /** One decimal place. */
  availableHrs: number
  /** Rolling 24h settled volume, USDC cents (integer). */
  settled24hCents: number
  latencyMs: number
}

export interface NetworkSnapshot {
  /** Monotonic sequence number; clients drop snapshots with seq <= last seen. */
  seq: number
  /** Server epoch ms. */
  ts: number
  stats: NetworkStats
  nodes: HardwareNode[]
}

/** Server -> client WebSocket frames on /v1/stream. Client may send the text frame "ping" (auto-replied "pong"). */
export type StreamMessage = { type: 'snapshot'; data: NetworkSnapshot }

/* ----------------------------------------------------------------------------
 * Dispatch payloads (POST /v1/dispatch, application/json)
 * ------------------------------------------------------------------------- */

export interface GeoJsonPoint {
  type: 'Point'
  /** [lon, lat] */
  coordinates: [number, number]
}

export interface GeoJsonPolygon {
  type: 'Polygon'
  /** Linear rings of [lon, lat]; first ring is the exterior and must be closed. */
  coordinates: [number, number][][]
}

export interface ProofSpec {
  attestation: 'TPM2_QUOTE'
  artifacts: string[]
}

interface DispatchBase {
  primitive: PrimitiveId
  node_id: string
  intent: Intent
  est_duration_min: number
  max_spend_usdc: number
  proof: ProofSpec
}

export interface AerialIsrPayload extends DispatchBase {
  primitive: 'AERIAL_ISR_SORTIE'
  intent: 'SCAN_CORRIDOR'
  geometry: GeoJsonPolygon
  constraints: {
    agl_floor_m: number
    agl_ceiling_m: number
    rtl_reserve_pct: number
  }
  sensors: string[]
}

export interface SubstationSweepPayload extends DispatchBase {
  primitive: 'SUBSTATION_THERMAL_SWEEP'
  intent: 'INSPECT_ASSET'
  site: GeoJsonPoint
  assets: string[]
  route: string
  thresholds: {
    delta_t_alarm_c: number
    emissivity: number
  }
}

export interface CncSynthesisPayload extends DispatchBase {
  primitive: 'AUTOMATED_CNC_SYNTHESIS'
  intent: 'FABRICATE_PART'
  site: GeoJsonPoint
  artifact: {
    format: 'STEP' | 'GCODE'
    uri: string
    bbox_mm: Vec3Mm
  }
  material: string
  tolerance_mm: number
  qty: number
}

export type DispatchPayload = AerialIsrPayload | SubstationSweepPayload | CncSynthesisPayload

/* ----------------------------------------------------------------------------
 * Dispatch response (application/x-ndjson, one DispatchEvent per line)
 * ------------------------------------------------------------------------- */

export type DispatchPhase = 'VALIDATE' | 'ESCROW' | 'COMPILE' | 'ATTEST'
export type StepStatus = 'PASS' | 'ACCEPTED' | 'DISPATCHED' | 'SIGNED' | 'FAIL' | 'REJECTED'

export type ErrorCode =
  | 'ERR_INVALID_JSON'
  | 'ERR_SCHEMA'
  | 'ERR_PAYLOAD_TOO_LARGE'
  | 'ERR_RATE_LIMITED'
  | 'ERR_NODE_NOT_FOUND'
  | 'ERR_PRIMITIVE_UNSUPPORTED'
  | 'ERR_GEOFENCE'
  | 'ERR_ALTITUDE_ENVELOPE'
  | 'ERR_RTL_RESERVE'
  | 'ERR_INSUFFICIENT_CHARGE'
  | 'ERR_WORK_ENVELOPE'
  | 'ERR_TOLERANCE'
  | 'ERR_SITE_MISMATCH'
  | 'ERR_NODE_BUSY'
  | 'ERR_SPEND_CAP'
  | 'ERR_INTERNAL'

export interface DispatchReceipt {
  task_id: string
  status: 'DISPATCHED'
  primitive: PrimitiveId
  node_id: string
  interface: Interface
  /** Decimal string, 2dp, e.g. "42.50". */
  escrow_usdc: string
  rate_usdc_per_min: string
  est_duration_min: number
  compiled: {
    target: Interface
    artifact: string
    count: number
  }
  /** "0x" + 64 lowercase hex chars (SHA-256). */
  telemetry_stream_hash: string
  attestation: 'TPM2_QUOTE'
  /** ISO-8601 UTC. */
  issued_at: string
  /** v0.1: hardware, settlement and attestation are simulated. */
  sandbox: true
}

export type DispatchEvent =
  | { type: 'step'; t_ms: number; phase: DispatchPhase; message: string; status: StepStatus }
  | { type: 'error'; t_ms: number; phase: DispatchPhase | null; code: ErrorCode; message: string; http_status: number }
  | { type: 'receipt'; t_ms: number; receipt: DispatchReceipt }

/** Non-streamed JSON error body (HTTP 400 / 404 / 413 / 429 / 500 before a stream starts). */
export interface ApiErrorBody {
  error: { code: ErrorCode; message: string; path?: string }
}

/* ----------------------------------------------------------------------------
 * Waitlist (POST /v1/waitlist, application/json)
 * ------------------------------------------------------------------------- */

export type WaitlistKind = 'api_keys' | 'hardware'
export type HardwareProtocol = 'mavlink' | 'ros2' | 'vda5050' | 'opcua'
export type FleetSize = '1' | '2-10' | '11-50' | '51-250' | '250+'

export interface WaitlistRequest {
  kind: WaitlistKind
  email: string
  /** Optional handle / org, <= 64 chars. */
  handle?: string
  /** Optional free text (use case / fleet description), <= 500 chars. */
  detail?: string
  /** hardware only. */
  protocol?: HardwareProtocol
  /** hardware only. */
  fleet_size?: FleetSize
  /** Honeypot: must be empty or absent. */
  website?: string
}

export interface WaitlistResponse {
  ok: true
  kind: WaitlistKind
}
