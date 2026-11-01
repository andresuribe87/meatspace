/**
 * Number formatting rules of the design system (pure, no DOM).
 * - On screen, signed values use a true minus (U+2212). Copyable blocks and JSON use ASCII: pass `ascii`.
 * - Fixed precision per field; never round toward the flattering side. Rounding is Python's (`pyFixed`: exact value,
 *   ties to even), because every report number was first printed by the lab in Python: the site prints the same digits.
 * - Ranges in prose use "to"; intervals print as `[lo, hi]` with the unit once.
 */

import { pyFixed } from '../../shared/reports'

/** True minus sign. */
export const MINUS = '−'
/** Non-breaking space: "n = 10", "133 ms" and "95% [a, b]" never break across lines. */
export const NBSP = ' '

/** Fixed-precision number with a true minus on screen (`ascii` for copyable text). */
export function fmt(v: number, digits = 2, ascii = false): string {
  if (!Number.isFinite(v)) return 'n/a'
  const s = pyFixed(Math.abs(v), digits)
  // −0.00 prints as 0.00: a sign on a zero reading is noise.
  const neg = v < 0 && Number(s) !== 0
  return (neg ? (ascii ? '-' : MINUS) : '') + s
}

/** Signed change: always carries + or − (e.g. Δ +0.73, −79%). */
export function fmtSigned(v: number, digits = 2, ascii = false): string {
  if (!Number.isFinite(v)) return 'n/a'
  const s = pyFixed(Math.abs(v), digits)
  if (Number(s) === 0) return s
  return (v < 0 ? (ascii ? '-' : MINUS) : '+') + s
}

/** `[lo, hi]` interval, unit printed by the caller once. */
export function fmtInterval(lo: number, hi: number, digits = 2, ascii = false): string {
  return `[${fmt(lo, digits, ascii)}, ${fmt(hi, digits, ascii)}]`
}

/** Frames to milliseconds at a frame rate. */
export function framesToMs(frames: number, fps: number): number {
  return (frames / fps) * 1000
}

/** Seconds label for an axis or a cursor: 2 decimals under 10 s, else 1. */
export function fmtSeconds(s: number): string {
  return s.toFixed(Math.abs(s) < 10 ? 2 : 1)
}

/** Elapsed time for busy keys: `T+00:01.24` (mm:ss.cc). */
export function fmtElapsed(ms: number): string {
  const t = Math.max(0, ms)
  const m = Math.floor(t / 60000)
  const s = (t % 60000) / 1000
  return `T+${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`
}

/** Decimal digits needed to print a step without losing it (1 -> 0, 0.5 -> 1, 0.25 -> 2). */
export function digitsFor(step: number): number {
  if (!Number.isFinite(step) || step <= 0) return 0
  for (let d = 0; d <= 6; d++) if (Math.abs(Math.round(step * 10 ** d) - step * 10 ** d) < 1e-9) return d
  return 6
}
