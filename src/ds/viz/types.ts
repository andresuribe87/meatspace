/**
 * Data contracts for the data-viz primitives. Plain arrays in, so page engineers can feed
 * lab/reports/{id}/report.json (and its per-frame trace export) straight through.
 */

/** Fixed channels on every plot. CH1 real is the reference (solid, on top); twins are dashed underneath. */
export type Channel = 'real' | 'stock' | 'cal' | 'cmd'

export const CHANNEL_LABEL: Record<Channel, string> = {
  real: 'CH1 real',
  stock: 'CH2 stock',
  cal: 'CH3 calibrated',
  cmd: 'command a[t]',
}

/** Words used in aria-valuetext and tables. */
export const CHANNEL_WORD: Record<Channel, string> = {
  real: 'real',
  stock: 'stock',
  cal: 'calibrated',
  cmd: 'command',
}

/**
 * Per-frame traces of one joint over one episode, all the same length and frame rate.
 * real: measured follower state (the reference). stock / cal: open-loop twin replays. cmd: recorded command a[t].
 */
export interface Traces {
  real: ArrayLike<number>
  stock?: ArrayLike<number>
  cal?: ArrayLike<number>
  cmd?: ArrayLike<number>
}

export interface JointTraces extends Traces {
  /** Joint name as in report.json, e.g. "shoulder_lift". */
  joint: string
}

/** A point estimate with its 95% interval. */
export interface Interval {
  mean: number
  lo: number
  hi: number
}

export type ChannelVisibility = Record<Channel, boolean>

export const ALL_CHANNELS: ChannelVisibility = { real: true, stock: true, cal: true, cmd: true }
