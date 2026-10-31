/**
 * Pure dispatch logic shared by the Worker (authoritative) and the SPA (for previews / tests).
 *  - parseDispatchPayload(): structural validation of untrusted JSON -> typed payload or ERR_SCHEMA
 *  - planDispatch(): runs the VALIDATE -> ESCROW -> COMPILE state machine against a node snapshot.
 * The ATTEST step (hash + receipt) is appended by the Durable Object, which owns randomness and time.
 */
import { CANONICAL_RTL_RESERVE_PCT } from './constants'
import { centsToDecimal, formatUsd } from './format'
import { haversineKm, isLat, isLon } from './geo'
import { COMPILE_TARGETS, escrowCents, PRIMITIVES, primitiveForCategory, VALIDATE_MESSAGES } from './primitives'
import type {
  DispatchEvent,
  DispatchPayload,
  DispatchPhase,
  ErrorCode,
  GeoJsonPoint,
  GeoJsonPolygon,
  HardwareNode,
  PrimitiveId,
  Vec3Mm,
} from './types'

/** Console offsets from the handoff: 00ms / 140ms / 380ms / 800ms. */
export const PHASE_OFFSETS_MS: Readonly<Record<DispatchPhase, number>> = {
  VALIDATE: 0,
  ESCROW: 140,
  COMPILE: 380,
  ATTEST: 800,
}

export const MAX_BODY_BYTES = 16 * 1024
export const AGL_CEILING_LIMIT_M = 120
export const MIN_RTL_RESERVE_PCT = 20
/** Ground rovers keep a fixed return-to-dock reserve. */
export const GROUND_RESERVE_PCT = 20
export const MAX_DURATION_MIN = 240
export const MAX_SPEND_USDC = 10_000

/* ----------------------------------------------------------------------------
 * Structural validation
 * ------------------------------------------------------------------------- */

export type ParseResult =
  | { ok: true; payload: DispatchPayload }
  | { ok: false; code: 'ERR_SCHEMA'; message: string; path: string }

class SchemaError extends Error {
  readonly path: string
  constructor(path: string, message: string) {
    super(message)
    this.path = path
  }
}

type Obj = Record<string, unknown>

function obj(v: unknown, path: string): Obj {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SchemaError(path, 'expected object')
  return v as Obj
}

function str(v: unknown, path: string, max = 128): string {
  if (typeof v !== 'string' || v.length === 0) throw new SchemaError(path, 'expected non-empty string')
  if (v.length > max) throw new SchemaError(path, `string exceeds ${max} chars`)
  return v
}

function num(v: unknown, path: string, min: number, max: number, { exclusiveMin = false } = {}): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new SchemaError(path, 'expected finite number')
  if (exclusiveMin ? v <= min : v < min) throw new SchemaError(path, `must be ${exclusiveMin ? '>' : '>='} ${min}`)
  if (v > max) throw new SchemaError(path, `must be <= ${max}`)
  return v
}

function int(v: unknown, path: string, min: number, max: number): number {
  const n = num(v, path, min, max)
  if (!Number.isInteger(n)) throw new SchemaError(path, 'expected integer')
  return n
}

function strArray(v: unknown, path: string, maxItems = 16): string[] {
  if (!Array.isArray(v)) throw new SchemaError(path, 'expected array of strings')
  if (v.length === 0) throw new SchemaError(path, 'expected at least 1 item')
  if (v.length > maxItems) throw new SchemaError(path, `expected at most ${maxItems} items`)
  return v.map((x, i) => str(x, `${path}[${i}]`, 64))
}

function lonLat(v: unknown, path: string): [number, number] {
  if (!Array.isArray(v) || v.length !== 2) throw new SchemaError(path, 'expected [lon, lat]')
  const [lon, lat] = v
  if (!isLon(lon)) throw new SchemaError(`${path}[0]`, 'longitude must be within [-180, 180]')
  if (!isLat(lat)) throw new SchemaError(`${path}[1]`, 'latitude must be within [-90, 90]')
  return [lon, lat]
}

function point(v: unknown, path: string): GeoJsonPoint {
  const o = obj(v, path)
  if (o.type !== 'Point') throw new SchemaError(`${path}.type`, 'expected "Point"')
  return { type: 'Point', coordinates: lonLat(o.coordinates, `${path}.coordinates`) }
}

function polygon(v: unknown, path: string): GeoJsonPolygon {
  const o = obj(v, path)
  if (o.type !== 'Polygon') throw new SchemaError(`${path}.type`, 'expected "Polygon"')
  const rings = o.coordinates
  if (!Array.isArray(rings) || rings.length === 0) throw new SchemaError(`${path}.coordinates`, 'expected array of linear rings')
  if (rings.length > 8) throw new SchemaError(`${path}.coordinates`, 'at most 8 rings')
  const out = rings.map((ring, r) => {
    const rp = `${path}.coordinates[${r}]`
    if (!Array.isArray(ring) || ring.length < 4) throw new SchemaError(rp, 'linear ring needs >= 4 positions')
    if (ring.length > 256) throw new SchemaError(rp, 'linear ring exceeds 256 positions')
    const pts = ring.map((p, i) => lonLat(p, `${rp}[${i}]`))
    const [f, l] = [pts[0], pts[pts.length - 1]]
    if (f[0] !== l[0] || f[1] !== l[1]) throw new SchemaError(rp, 'linear ring must be closed (first position == last)')
    return pts
  })
  return { type: 'Polygon', coordinates: out }
}

function vec3(v: unknown, path: string): Vec3Mm {
  if (!Array.isArray(v) || v.length !== 3) throw new SchemaError(path, 'expected [x, y, z] in mm')
  return [num(v[0], `${path}[0]`, 0, 10_000, { exclusiveMin: true }), num(v[1], `${path}[1]`, 0, 10_000, { exclusiveMin: true }), num(v[2], `${path}[2]`, 0, 10_000, { exclusiveMin: true })]
}

function literal<T extends string>(v: unknown, path: string, allowed: readonly T[]): T {
  if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) {
    throw new SchemaError(path, `expected one of ${allowed.map((a) => `"${a}"`).join(', ')}`)
  }
  return v as T
}

const PRIMITIVE_LIST = Object.keys(PRIMITIVES) as PrimitiveId[]
const NODE_ID_RE = /^[A-Z0-9][A-Z0-9-]{1,31}$/

export function parseDispatchPayload(input: unknown): ParseResult {
  try {
    const o = obj(input, '$')
    const primitive = literal(o.primitive, '$.primitive', PRIMITIVE_LIST)
    const def = PRIMITIVES[primitive]
    const node_id = str(o.node_id, '$.node_id', 32)
    if (!NODE_ID_RE.test(node_id)) throw new SchemaError('$.node_id', 'expected uppercase node id, e.g. "VTOL-260-TX-04"')
    const intent = literal(o.intent, '$.intent', [def.intent])
    const est_duration_min = num(o.est_duration_min, '$.est_duration_min', 0, MAX_DURATION_MIN, { exclusiveMin: true })
    const max_spend_usdc = num(o.max_spend_usdc, '$.max_spend_usdc', 0, MAX_SPEND_USDC, { exclusiveMin: true })
    const proofObj = obj(o.proof, '$.proof')
    const proof = {
      attestation: literal(proofObj.attestation, '$.proof.attestation', ['TPM2_QUOTE'] as const),
      artifacts: strArray(proofObj.artifacts, '$.proof.artifacts'),
    }
    const base = { node_id, est_duration_min, max_spend_usdc, proof }

    switch (primitive) {
      case 'AERIAL_ISR_SORTIE': {
        const c = obj(o.constraints, '$.constraints')
        return {
          ok: true,
          payload: {
            ...base,
            primitive,
            intent: intent as 'SCAN_CORRIDOR',
            geometry: polygon(o.geometry, '$.geometry'),
            constraints: {
              agl_floor_m: num(c.agl_floor_m, '$.constraints.agl_floor_m', 0, 10_000),
              agl_ceiling_m: num(c.agl_ceiling_m, '$.constraints.agl_ceiling_m', 0, 10_000),
              rtl_reserve_pct: num(c.rtl_reserve_pct, '$.constraints.rtl_reserve_pct', 0, 100),
            },
            sensors: strArray(o.sensors, '$.sensors'),
          },
        }
      }
      case 'SUBSTATION_THERMAL_SWEEP': {
        const t = obj(o.thresholds, '$.thresholds')
        return {
          ok: true,
          payload: {
            ...base,
            primitive,
            intent: intent as 'INSPECT_ASSET',
            site: point(o.site, '$.site'),
            assets: strArray(o.assets, '$.assets', 64),
            route: str(o.route, '$.route', 64),
            thresholds: {
              delta_t_alarm_c: num(t.delta_t_alarm_c, '$.thresholds.delta_t_alarm_c', 0, 500, { exclusiveMin: true }),
              emissivity: num(t.emissivity, '$.thresholds.emissivity', 0, 1, { exclusiveMin: true }),
            },
          },
        }
      }
      case 'AUTOMATED_CNC_SYNTHESIS': {
        const a = obj(o.artifact, '$.artifact')
        return {
          ok: true,
          payload: {
            ...base,
            primitive,
            intent: intent as 'FABRICATE_PART',
            site: point(o.site, '$.site'),
            artifact: {
              format: literal(a.format, '$.artifact.format', ['STEP', 'GCODE'] as const),
              uri: str(a.uri, '$.artifact.uri', 512),
              bbox_mm: vec3(a.bbox_mm, '$.artifact.bbox_mm'),
            },
            material: str(o.material, '$.material', 64),
            tolerance_mm: num(o.tolerance_mm, '$.tolerance_mm', 0, 10, { exclusiveMin: true }),
            qty: int(o.qty, '$.qty', 1, 10_000),
          },
        }
      }
    }
  } catch (e) {
    if (e instanceof SchemaError) return { ok: false, code: 'ERR_SCHEMA', message: `${e.path}: ${e.message}`, path: e.path }
    throw e
  }
}

/* ----------------------------------------------------------------------------
 * State machine
 * ------------------------------------------------------------------------- */

export interface PlanFailure {
  phase: DispatchPhase
  code: ErrorCode
  message: string
  httpStatus: 404 | 409 | 422
}

export interface DispatchPlan {
  /** Steps that completed (or failed) in order, with handoff timing offsets. */
  events: DispatchEvent[]
  /** HTTP status for the streamed response. */
  httpStatus: 200 | 404 | 409 | 422
  failure: PlanFailure | null
  escrowCents: number
  /** COMPILE output summary, present when the plan reaches COMPILE. */
  compiled: { artifact: string; count: number } | null
}

const km = (n: number) => n.toFixed(1)

/** Returns a failure for the VALIDATE phase, or null when every firmware envelope check passes. */
function validateAgainstNode(p: DispatchPayload, node: HardwareNode): Omit<PlanFailure, 'phase'> | null {
  const def = PRIMITIVES[p.primitive]
  if (node.category !== def.category) {
    return {
      code: 'ERR_PRIMITIVE_UNSUPPORTED',
      httpStatus: 422,
      message: `Node ${node.id} (${node.chassis}) does not support ${p.primitive}`,
    }
  }

  const outside = (lon: number, lat: number) => haversineKm(node.lat, node.lon, lat, lon)

  switch (p.primitive) {
    case 'AERIAL_ISR_SORTIE': {
      let worst = { d: 0, ring: 0, i: 0 }
      p.geometry.coordinates.forEach((ring, r) =>
        ring.forEach(([lon, lat], i) => {
          const d = outside(lon, lat)
          if (d > worst.d) worst = { d, ring: r, i }
        }),
      )
      if (worst.d > node.geofenceKm) {
        return {
          code: 'ERR_GEOFENCE',
          httpStatus: 422,
          message: `geometry.coordinates[${worst.ring}][${worst.i}] lies ${km(worst.d)} km from node home; firmware geofence radius ${km(node.geofenceKm)} km`,
        }
      }
      const { agl_floor_m: floor, agl_ceiling_m: ceil, rtl_reserve_pct: reserve } = p.constraints
      const minAgl = node.minAglM ?? 0
      if (floor < minAgl) {
        return { code: 'ERR_ALTITUDE_ENVELOPE', httpStatus: 422, message: `agl_floor_m ${floor} is below firmware minimum ${minAgl} m` }
      }
      if (ceil > AGL_CEILING_LIMIT_M) {
        return { code: 'ERR_ALTITUDE_ENVELOPE', httpStatus: 422, message: `agl_ceiling_m ${ceil} exceeds firmware ceiling ${AGL_CEILING_LIMIT_M} m` }
      }
      if (ceil <= floor) {
        return { code: 'ERR_ALTITUDE_ENVELOPE', httpStatus: 422, message: `agl_ceiling_m ${ceil} must be above agl_floor_m ${floor}` }
      }
      if (reserve < MIN_RTL_RESERVE_PCT) {
        return { code: 'ERR_RTL_RESERVE', httpStatus: 422, message: `rtl_reserve_pct ${reserve} is below firmware minimum ${MIN_RTL_RESERVE_PCT}%` }
      }
      return chargeCheck(node, p.est_duration_min, reserve)
    }
    case 'SUBSTATION_THERMAL_SWEEP': {
      const [lon, lat] = p.site.coordinates
      const d = outside(lon, lat)
      if (d > node.geofenceKm) {
        return {
          code: 'ERR_GEOFENCE',
          httpStatus: 422,
          message: `site lies ${km(d)} km from node home; firmware geofence radius ${km(node.geofenceKm)} km`,
        }
      }
      return chargeCheck(node, p.est_duration_min, GROUND_RESERVE_PCT)
    }
    case 'AUTOMATED_CNC_SYNTHESIS': {
      const [lon, lat] = p.site.coordinates
      const d = outside(lon, lat)
      if (d > node.geofenceKm) {
        return {
          code: 'ERR_SITE_MISMATCH',
          httpStatus: 422,
          message: `site lies ${km(d)} km from cell ${node.id}; fixed cells accept jobs within ${km(node.geofenceKm)} km`,
        }
      }
      const env = node.envelopeMm
      if (env) {
        const axis = ['x', 'y', 'z'] as const
        for (let i = 0; i < 3; i++) {
          if (p.artifact.bbox_mm[i] > env[i]) {
            return {
              code: 'ERR_WORK_ENVELOPE',
              httpStatus: 422,
              message: `artifact.bbox_mm ${axis[i]}=${p.artifact.bbox_mm[i]} exceeds cell envelope ${axis[i]}=${env[i]} mm`,
            }
          }
        }
      }
      const minTol = node.minToleranceMm ?? 0
      if (p.tolerance_mm < minTol) {
        return { code: 'ERR_TOLERANCE', httpStatus: 422, message: `tolerance_mm ${p.tolerance_mm} is tighter than cell capability ${minTol} mm` }
      }
      return null
    }
  }
}

function chargeCheck(node: HardwareNode, durationMin: number, reservePct: number): Omit<PlanFailure, 'phase'> | null {
  if (node.power !== 'BATTERY') return null
  const draw = node.drainPctPerMin * durationMin
  const required = draw + reservePct
  if (node.charge < required) {
    return {
      code: 'ERR_INSUFFICIENT_CHARGE',
      httpStatus: 422,
      message: `battery ${Math.floor(node.charge)}% < required ${required.toFixed(1)}% (est. draw ${draw.toFixed(1)}% + reserve ${reservePct}%)`,
    }
  }
  return null
}

/**
 * Charge (%) a battery node needs to pass ERR_INSUFFICIENT_CHARGE with its own canonical payload
 * (the one [ TASK NODE ] loads): draw for the primitive's default duration + reserve. 0 for mains cells.
 * The drift model sends IDLE nodes to their charger before they fall below it, and the orderbook
 * shows a node as available only at or above it, so "available" always means "dispatchable".
 */
export function canonicalChargeFloorPct(node: HardwareNode): number {
  if (node.power !== 'BATTERY') return 0
  const def = PRIMITIVES[primitiveForCategory(node.category)]
  const reserve = node.category === 'AERIAL' ? CANONICAL_RTL_RESERVE_PCT : GROUND_RESERVE_PCT
  return node.drainPctPerMin * def.estDurationMin + reserve
}

/** Number of compiled primitives the COMPILE phase reports (deterministic). */
export function compiledCount(p: DispatchPayload): number {
  switch (p.primitive) {
    case 'AERIAL_ISR_SORTIE':
      // takeoff + 4 lawnmower legs per exterior edge + RTL
      return (p.geometry.coordinates[0].length - 1) * 4 + 2
    case 'SUBSTATION_THERMAL_SWEEP':
      // one inspection pose per asset + dock
      return p.assets.length + 1
    case 'AUTOMATED_CNC_SYNTHESIS':
      // roughing + finishing + probe cycle per part
      return p.qty * 3
  }
}

/**
 * Run VALIDATE -> ESCROW -> COMPILE for `payload` against `node` (undefined when unknown).
 * `now` is epoch ms, used only for lock-release messaging.
 */
export function planDispatch(payload: DispatchPayload, node: HardwareNode | undefined, now: number): DispatchPlan {
  const events: DispatchEvent[] = []
  const fail = (f: PlanFailure, status: 'FAIL' | 'REJECTED', stepMessage: string): DispatchPlan => {
    const t = PHASE_OFFSETS_MS[f.phase]
    events.push({ type: 'step', t_ms: t, phase: f.phase, message: stepMessage, status })
    events.push({ type: 'error', t_ms: t, phase: f.phase, code: f.code, message: f.message, http_status: f.httpStatus })
    return { events, httpStatus: f.httpStatus, failure: f, escrowCents: 0, compiled: null }
  }

  // VALIDATE
  const validateMsg = VALIDATE_MESSAGES[payload.primitive]
  if (!node) {
    return fail(
      { phase: 'VALIDATE', code: 'ERR_NODE_NOT_FOUND', httpStatus: 404, message: `node ${payload.node_id} is not registered with the clearinghouse` },
      'FAIL',
      validateMsg,
    )
  }
  const invalid = validateAgainstNode(payload, node)
  if (invalid) return fail({ phase: 'VALIDATE', ...invalid }, 'FAIL', validateMsg)
  events.push({ type: 'step', t_ms: PHASE_OFFSETS_MS.VALIDATE, phase: 'VALIDATE', message: validateMsg, status: 'PASS' })

  // ESCROW
  const escrow = escrowCents(node.rateCents, payload.est_duration_min)
  const escrowMsg = `Locking escrow (${formatUsd(escrow)} USDC) & bidding on Node ${node.id}...`
  if (node.status === 'TASKED') {
    const secs = node.taskedUntil ? Math.max(1, Math.ceil((node.taskedUntil - now) / 1000)) : null
    return fail(
      {
        phase: 'ESCROW',
        code: 'ERR_NODE_BUSY',
        httpStatus: 409,
        message: `node ${node.id} is executing ${node.taskId ?? 'another task'}${secs ? `; lock releases in ${secs}s` : ''}`,
      },
      'REJECTED',
      escrowMsg,
    )
  }
  const capCents = Math.round(payload.max_spend_usdc * 100)
  if (escrow > capCents) {
    return fail(
      { phase: 'ESCROW', code: 'ERR_SPEND_CAP', httpStatus: 422, message: `escrow ${formatUsd(escrow)} exceeds max_spend_usdc ${centsToDecimal(capCents)}` },
      'REJECTED',
      escrowMsg,
    )
  }
  events.push({ type: 'step', t_ms: PHASE_OFFSETS_MS.ESCROW, phase: 'ESCROW', message: escrowMsg, status: 'ACCEPTED' })

  // COMPILE
  const target = COMPILE_TARGETS[node.iface]
  events.push({ type: 'step', t_ms: PHASE_OFFSETS_MS.COMPILE, phase: 'COMPILE', message: target.message, status: 'DISPATCHED' })

  return {
    events,
    httpStatus: 200,
    failure: null,
    escrowCents: escrow,
    compiled: { artifact: target.artifact, count: compiledCount(payload) },
  }
}

/** ATTEST step copy: "Returning TPM-signed telemetry stream hash (0x9f8c...3a1b)." */
export function attestMessage(shortHashText: string): string {
  return `Returning TPM-signed telemetry stream hash (${shortHashText}).`
}
