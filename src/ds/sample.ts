/**
 * SAMPLE DATA for the design reference page only. PLACEHOLDER (UNCAL): shaped like Twin Gap Report v1,
 * not its values. It is deliberately exported without provenance, so every number drawn from it renders
 * UNCAL. Never import this from a product page, and never quote these numbers.
 * Replace with lab/reports/{id}/report.json (and its per-frame trace export) on real pages.
 */
import type { CIBarRow } from './viz/CIBars'
import type { Interval, JointTraces } from './viz/types'

export const SAMPLE_FPS = 30
const N = 300

export const SAMPLE_JOINTS = ['shoulder_pan', 'shoulder_lift', 'elbow_flex', 'wrist_flex', 'wrist_roll'] as const

/** Command keyframes [frame, degrees] per joint (synthetic). */
const KEYS: Record<(typeof SAMPLE_JOINTS)[number], [number, number][]> = {
  shoulder_pan: [[0, 2], [24, 2], [66, 26], [118, 26], [160, -21], [214, -21], [258, 2], [300, 2]],
  shoulder_lift: [[0, -96], [18, -96], [62, -42], [96, -30], [120, -30], [150, -58], [196, -36], [222, -36], [262, -96], [300, -96]],
  elbow_flex: [[0, 94], [18, 94], [62, 48], [96, 36], [120, 36], [150, 64], [196, 42], [222, 42], [262, 94], [300, 94]],
  wrist_flex: [[0, 62], [30, 62], [70, 76], [100, 82], [150, 70], [200, 79], [250, 62], [300, 62]],
  wrist_roll: [[0, 0], [40, 0], [80, 12], [140, 12], [176, -16], [230, -16], [270, 0], [300, 0]],
}
const SAG: Record<(typeof SAMPLE_JOINTS)[number], number> = { shoulder_pan: 0.2, shoulder_lift: -1.7, elbow_flex: 1.6, wrist_flex: -0.5, wrist_roll: 0.1 }

function rng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const minJerk = (s: number) => 10 * s ** 3 - 15 * s ** 4 + 6 * s ** 5

function command(keys: [number, number][]): Float64Array {
  const a = new Float64Array(N)
  for (let t = 0; t < N; t++) {
    let i = 0
    while (i < keys.length - 2 && t >= keys[i + 1][0]) i++
    const [t0, v0] = keys[i]
    const [t1, v1] = keys[i + 1]
    const s = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)))
    a[t] = v0 + (v1 - v0) * minJerk(s)
  }
  return a
}

function respond(
  a: Float64Array,
  { delay, alpha, sag = 0, stiction = 0, noise = 0, quant = 0, seed = 1 }: { delay: number; alpha: number; sag?: number; stiction?: number; noise?: number; quant?: number; seed?: number },
): Float64Array {
  const r = rng(seed)
  const y = new Float64Array(N)
  let s = a[0] + sag
  for (let t = 0; t < N; t++) {
    const u = a[Math.max(0, t - delay)] + sag
    const e = u - s
    if (Math.abs(e) > stiction) s += alpha * e
    let v = s + (noise ? (r() - 0.5) * 2 * noise : 0)
    if (quant) v = Math.round(v / quant) * quant
    y[t] = v
  }
  return y
}

/** Synthetic held-out episode, all joints. PLACEHOLDER. */
export const SAMPLE_EPISODE: JointTraces[] = SAMPLE_JOINTS.map((joint) => {
  const cmd = command(KEYS[joint])
  return {
    joint,
    cmd,
    real: respond(cmd, { delay: 3, alpha: 0.55, sag: SAG[joint], stiction: 0.22, noise: 0.05, quant: 360 / 4096, seed: 7 }),
    stock: respond(cmd, { delay: 0, alpha: 0.9 }),
    cal: respond(cmd, { delay: 3, alpha: joint === 'elbow_flex' ? 0.5 : 0.6, sag: SAG[joint] * (joint === 'elbow_flex' ? 0.45 : 0.85), seed: 3 }),
  }
})

const iv = (mean: number, lo: number, hi: number): Interval => ({ mean, lo, hi })

/** Per-joint held-out RMSE with 95% CIs. PLACEHOLDER. */
export const SAMPLE_RMSE: CIBarRow[] = [
  { joint: 'shoulder_pan', stock: iv(5.9, 5.31, 6.58), cal: iv(0.61, 0.54, 0.69), change: iv(-90, -91, -89) },
  { joint: 'shoulder_lift', stock: iv(6.55, 6.17, 6.96), cal: iv(1.37, 1.27, 1.47), change: iv(-79, -80, -78) },
  { joint: 'elbow_flex', stock: iv(4.97, 4.74, 5.21), cal: iv(2.29, 2.07, 2.52), change: iv(-54, -57, -51) },
  { joint: 'wrist_flex', stock: iv(3.71, 3.28, 4.18), cal: iv(0.58, 0.52, 0.65), change: iv(-84, -85, -83) },
  { joint: 'wrist_roll', stock: iv(4.17, 3.62, 4.86), cal: iv(0.5, 0.45, 0.56), change: iv(-88, -89, -87) },
]
export const SAMPLE_RMSE_MEAN: CIBarRow = { joint: 'arm mean', stock: iv(5.06, 4.71, 5.44), cal: iv(1.07, 1.0, 1.15), change: iv(-79, -80, -77) }

/** Command-to-state lag in frames. PLACEHOLDER. */
export const SAMPLE_LAG = { real: iv(3.98, 3.95, 4.02), stock: iv(0.81, 0.78, 0.84), cal: iv(3.8, 3.78, 3.82) }

/** Report index rows. PLACEHOLDER values; dataset names are the reports being finalized. */
export interface SampleIndexRow {
  id: string
  twin: string
  n?: number
  stock?: Interval
  cal?: Interval
  change?: Interval
  lag?: [number, number, number]
  refused?: string
}
export const SAMPLE_INDEX: SampleIndexRow[] = [
  { id: 'lerobot/svla_so101_pickplace', twin: 'robotstudio_so101', n: 10, stock: iv(5.06, 4.71, 5.44), cal: iv(1.07, 1.0, 1.15), change: iv(-79, -80, -77), lag: [3.98, 0.81, 3.8] },
  { id: 'IlyaGusev/so101_pick_gum', twin: 'robotstudio_so101', n: 31, stock: iv(4.4, 4.05, 4.79), cal: iv(1.32, 1.1, 1.58), change: iv(-70, -75, -64), lag: [3.3, 0.9, 3.28] },
  { id: 'lerobot/svla_so100_pickplace', twin: 'trs_so_arm100', n: 10, stock: iv(0.81, 0.55, 1.19), cal: iv(0.33, 0.3, 0.36), change: iv(-59, -72, -45), lag: [3.4, 3.28, 3.47] },
  {
    id: 'youliangtan/so100_strawberry_grape',
    twin: 'trs_so_arm100',
    refused: 'recorded range of motion does not fit the twin under the documented calibration convention (shoulder_pan)',
  },
]
