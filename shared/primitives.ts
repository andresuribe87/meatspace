import { CANONICAL_RTL_RESERVE_PCT } from './constants'
import { offsetKm, round5 } from './geo'
import type {
  AerialIsrPayload,
  Category,
  CncSynthesisPayload,
  DispatchPayload,
  HardwareNode,
  Intent,
  Interface,
  PrimitiveId,
  SubstationSweepPayload,
} from './types'

export interface PrimitiveDef {
  id: PrimitiveId
  /** Tab sub-label, verbatim from the handoff. */
  summary: string
  category: Category
  intent: Intent
  defaultNodeId: string
  estDurationMin: number
}

export const PRIMITIVE_IDS: readonly PrimitiveId[] = [
  'AERIAL_ISR_SORTIE',
  'SUBSTATION_THERMAL_SWEEP',
  'AUTOMATED_CNC_SYNTHESIS',
]

export const PRIMITIVES: Readonly<Record<PrimitiveId, PrimitiveDef>> = {
  AERIAL_ISR_SORTIE: {
    id: 'AERIAL_ISR_SORTIE',
    summary: 'VTOL / Fixed-Wing thermal + EO/IR corridor scan',
    category: 'AERIAL',
    intent: 'SCAN_CORRIDOR',
    defaultNodeId: 'VTOL-260-TX-04',
    // 12.5 min x $3.40/min = $42.50 escrow (handoff default).
    estDurationMin: 12.5,
  },
  SUBSTATION_THERMAL_SWEEP: {
    id: 'SUBSTATION_THERMAL_SWEEP',
    summary: 'Quadruped / ROS 2 industrial rover inspection',
    category: 'GROUND',
    intent: 'INSPECT_ASSET',
    defaultNodeId: 'SPOT-SUB-44',
    estDurationMin: 18,
  },
  AUTOMATED_CNC_SYNTHESIS: {
    id: 'AUTOMATED_CNC_SYNTHESIS',
    summary: 'G-code / STEP file robotic cell dispatch',
    category: 'MANIPULATOR',
    intent: 'FABRICATE_PART',
    defaultNodeId: 'ARM-CELL-12',
    estDurationMin: 42,
  },
}

export function primitiveForCategory(category: Category): PrimitiveId {
  switch (category) {
    case 'AERIAL':
      return 'AERIAL_ISR_SORTIE'
    case 'GROUND':
      return 'SUBSTATION_THERMAL_SWEEP'
    case 'MANIPULATOR':
      return 'AUTOMATED_CNC_SYNTHESIS'
  }
}

/** Escrow = spot rate x estimated duration, rounded to the cent. */
export function escrowCents(rateCents: number, estDurationMin: number): number {
  return Math.round(rateCents * estDurationMin)
}

/** Spend cap suggested for a node: escrow + 15% headroom, rounded up to the next $5. */
export function suggestedMaxSpendUsd(rateCents: number, estDurationMin: number): number {
  const withHeadroom = (escrowCents(rateCents, estDurationMin) * 1.15) / 100
  return Math.ceil(withHeadroom / 5) * 5
}

/** Console copy for the COMPILE phase, keyed by node interface. */
export const COMPILE_TARGETS: Readonly<Record<Interface, { message: string; artifact: string }>> = {
  'MAVLink v2': {
    message: 'Compiling intent to MAVLink waypoint primitive...',
    artifact: 'MISSION_ITEM_INT',
  },
  'ROS 2 Humble': {
    message: 'Compiling intent to ROS 2 action goal...',
    artifact: 'action_goal',
  },
  'VDA 5050': {
    message: 'Compiling intent to VDA 5050 order primitive...',
    artifact: 'vda5050/order',
  },
  'OPC UA': {
    message: 'Compiling intent to G-code toolpath primitive (OPC UA)...',
    artifact: 'gcode/iso6983',
  },
}

/** Console copy for the VALIDATE phase, keyed by primitive. */
export const VALIDATE_MESSAGES: Readonly<Record<PrimitiveId, string>> = {
  AERIAL_ISR_SORTIE: 'Validating GeoJSON polygon against node firmware geofence...',
  SUBSTATION_THERMAL_SWEEP: 'Validating GeoJSON point against node firmware geofence...',
  AUTOMATED_CNC_SYNTHESIS: 'Validating STEP bounding box against cell work envelope...',
}

const PROOF = { attestation: 'TPM2_QUOTE' as const }

function aerialPayload(node: HardwareNode): AerialIsrPayload {
  const def = PRIMITIVES.AERIAL_ISR_SORTIE
  // 6 km x 0.6 km E-W corridor, centred 2 km north of the node's home pad.
  const sw = offsetKm(node.lat, node.lon, 1.7, -3)
  const se = offsetKm(node.lat, node.lon, 1.7, 3)
  const ne = offsetKm(node.lat, node.lon, 2.3, 3)
  const nw = offsetKm(node.lat, node.lon, 2.3, -3)
  return {
    primitive: 'AERIAL_ISR_SORTIE',
    node_id: node.id,
    intent: 'SCAN_CORRIDOR',
    geometry: { type: 'Polygon', coordinates: [[sw, se, ne, nw, sw]] },
    constraints: { agl_floor_m: Math.max(60, node.minAglM ?? 0), agl_ceiling_m: 120, rtl_reserve_pct: CANONICAL_RTL_RESERVE_PCT },
    sensors: ['EO', 'LWIR'],
    est_duration_min: def.estDurationMin,
    max_spend_usdc: suggestedMaxSpendUsd(node.rateCents, def.estDurationMin),
    proof: { ...PROOF, artifacts: ['MCAP', 'RTK_LOG', 'SENSOR_FRAMES'] },
  }
}

function substationPayload(node: HardwareNode): SubstationSweepPayload {
  const def = PRIMITIVES.SUBSTATION_THERMAL_SWEEP
  return {
    primitive: 'SUBSTATION_THERMAL_SWEEP',
    node_id: node.id,
    intent: 'INSPECT_ASSET',
    site: { type: 'Point', coordinates: offsetKm(node.lat, node.lon, 0.18, 0.18) },
    assets: ['XFMR-T1', 'XFMR-T2', 'BRKR-138KV-A', 'BUS-138KV-N'],
    route: 'PATROL_LOOP_B',
    thresholds: { delta_t_alarm_c: 15, emissivity: 0.95 },
    est_duration_min: def.estDurationMin,
    max_spend_usdc: suggestedMaxSpendUsd(node.rateCents, def.estDurationMin),
    proof: { ...PROOF, artifacts: ['ROSBAG2_MCAP', 'RADIOMETRIC_FRAMES'] },
  }
}

function cncPayload(node: HardwareNode): CncSynthesisPayload {
  const def = PRIMITIVES.AUTOMATED_CNC_SYNTHESIS
  return {
    primitive: 'AUTOMATED_CNC_SYNTHESIS',
    node_id: node.id,
    intent: 'FABRICATE_PART',
    site: { type: 'Point', coordinates: [round5(node.lon), round5(node.lat)] },
    artifact: { format: 'STEP', uri: 'r2://meatspace-jobs/bracket-7075-t6.step', bbox_mm: [120, 80, 35] },
    material: 'AL-7075-T6',
    tolerance_mm: Math.max(0.01, node.minToleranceMm ?? 0),
    qty: 4,
    est_duration_min: def.estDurationMin,
    max_spend_usdc: suggestedMaxSpendUsd(node.rateCents, def.estDurationMin),
    proof: { ...PROOF, artifacts: ['SPINDLE_LOG', 'CMM_REPORT'] },
  }
}

/** Canonical payload for tasking `node` with its category's primitive. */
export function buildPayload(node: HardwareNode): DispatchPayload {
  switch (node.category) {
    case 'AERIAL':
      return aerialPayload(node)
    case 'GROUND':
      return substationPayload(node)
    case 'MANIPULATOR':
      return cncPayload(node)
  }
}

/** Default payload per tab: the handoff's default node for that primitive. */
export function defaultPayload(primitive: PrimitiveId, nodes: readonly HardwareNode[]): DispatchPayload {
  const node = nodes.find((n) => n.id === PRIMITIVES[primitive].defaultNodeId)
  if (!node) throw new Error(`default node ${PRIMITIVES[primitive].defaultNodeId} missing from dataset`)
  return buildPayload(node)
}
