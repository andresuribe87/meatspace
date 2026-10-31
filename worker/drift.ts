/**
 * Telemetry drift applied on every NetworkState tick. Pure functions over an injectable RNG.
 * Every walk is small, mean-reverting and clamped so the ticker reads like live telemetry, never jumpy.
 */
import { TICK_MS } from '../shared/constants'
import { canonicalChargeFloorPct } from '../shared/dispatch'
import { SEED_STATS } from '../shared/nodes'
import type { HardwareNode, NetworkStats, NodeStatus } from '../shared/types'

export { TICK_MS }
/**
 * The simulation runs ~5x real time while a node is TASKED, so a 30 s lock drains ~2.5 minutes' worth of battery:
 * enough to see the bar move, little enough that the default demo node survives several back-to-back re-dispatches.
 */
const SIM_SPEEDUP = 5
/** Dock charge rate, % per tick (~30 s from a typical post-task level back to DOCKED). */
const CHARGE_PER_TICK = 1
/** CHARGING turns DOCKED at this charge. */
const DOCKED_AT_PCT = 95
/** A fully charged DOCKED node leaves its dock with this probability per tick (~200 s on average). */
const UNDOCK_PER_TICK = 0.01
/** IDLE nodes head back to the charger this far above the charge their own canonical payload needs. */
const IDLE_MARGIN_PCT = 1

export type Rng = () => number

const SETTLED_FLOOR_CENTS = 13_500_000

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const uniform = (rng: Rng, min: number, max: number) => min + rng() * (max - min)
const randInt = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1))
export const round1 = (v: number) => Math.round(v * 10) / 10

/** One step of a clamped random walk pulled back toward `target` by fraction `k` of the gap. */
function walk(v: number, step: number, target: number, k: number, min: number, max: number): number {
  return clamp(v + step + (target - v) * k, min, max)
}

export function driftStats(s: NetworkStats, rng: Rng): NetworkStats {
  const settled = s.settled24hCents + (rng() < 0.35 ? randInt(rng, 200, 6000) : 0)
  return {
    activeNodes: Math.round(walk(s.activeNodes, randInt(rng, -2, 2), SEED_STATS.activeNodes, 0.1, 1380, 1440)),
    availableHrs: round1(walk(s.availableHrs, uniform(rng, -0.4, 0.4), SEED_STATS.availableHrs, 0.05, 880, 970)),
    // Settlements older than 24h roll out of the window: shed 1% of the excess over baseline per tick.
    settled24hCents: Math.max(SETTLED_FLOOR_CENTS, settled - Math.round((settled - SEED_STATS.settled24hCents) * 0.01)),
    latencyMs: Math.round(walk(s.latencyMs, randInt(rng, -2, 2), SEED_STATS.latencyMs, 0.2, 12, 26)),
  }
}

export function driftNode(n: HardwareNode, rng: Rng): HardwareNode {
  return n.power === 'BATTERY' ? driftBattery(n, rng) : { ...n, charge: driftHeadroom(n.charge, n.status, rng) }
}

/** A task lock ends: battery nodes go back on charge, mains cells straight back to IDLE. */
export function releaseNode(n: HardwareNode): HardwareNode {
  return { ...n, status: n.power === 'BATTERY' ? 'CHARGING' : 'IDLE', taskedUntil: null, taskId: null }
}

/**
 * Battery cycle: TASKED -> CHARGING -> DOCKED -> (occasionally) IDLE -> CHARGING. IDLE and DOCKED nodes always
 * hold at least canonicalChargeFloorPct(), so a node the orderbook shows as available can run its canonical payload.
 */
function driftBattery(n: HardwareNode, rng: Rng): HardwareNode {
  switch (n.status) {
    case 'DOCKED':
      if (n.charge < 100) return { ...n, charge: Math.min(100, n.charge + 0.3) }
      return { ...n, status: rng() < UNDOCK_PER_TICK ? 'IDLE' : 'DOCKED' }
    case 'CHARGING': {
      const charge = Math.min(100, n.charge + CHARGE_PER_TICK)
      return { ...n, charge, status: charge >= DOCKED_AT_PCT ? 'DOCKED' : 'CHARGING' }
    }
    case 'IDLE': {
      const charge = n.charge - 0.02
      return { ...n, charge, status: charge < canonicalChargeFloorPct(n) + IDLE_MARGIN_PCT ? 'CHARGING' : 'IDLE' }
    }
    case 'TASKED':
      return { ...n, charge: Math.max(5, n.charge - n.drainPctPerMin * (TICK_MS / 60_000) * SIM_SPEEDUP) }
  }
}

/** Mains cells report duty headroom: it decays toward 35% under load and eases back into the idle band afterwards. */
function driftHeadroom(v: number, status: NodeStatus, rng: Rng): number {
  if (status === 'TASKED') return v + (35 - v) * 0.1
  if (v < 80) return v + (90 - v) * 0.1
  return clamp(v + uniform(rng, -0.5, 0.5), 80, 100)
}
