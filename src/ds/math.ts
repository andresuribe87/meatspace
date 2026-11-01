/**
 * Pure maths behind the data-viz (no DOM, no React). Unit-tested in e2e/design-audit.spec.ts.
 * Scales follow the oscilloscope rules: 1-2-5 steps, autoscale that never clips, and a timebase that
 * changes with the screen while the signal does not.
 */

/** Smallest 1-2-5 step ≥ v (v > 0). step125(0.9967) = 1, step125(1.2) = 2, step125(3) = 5. */
export function step125(v: number): number {
  if (!(v > 0) || !Number.isFinite(v)) return 1
  const p = 10 ** Math.floor(Math.log10(v))
  for (const m of [1, 2, 5, 10]) if (m * p >= v * (1 - 1e-9)) return m * p
  return 10 * p
}

/** 1-2-5 step that fits `range` into `divs` divisions. */
export function niceStep(range: number, divs: number): number {
  return step125(range / Math.max(1, divs))
}

/** Min and max over finite samples of one or more series. Returns [0, 1] when there is nothing to scale. */
export function extent(...series: (ArrayLike<number> | undefined)[]): [number, number] {
  let lo = Infinity
  let hi = -Infinity
  for (const s of series) {
    if (!s) continue
    for (let i = 0; i < s.length; i++) {
      const v = s[i]
      if (!Number.isFinite(v)) continue
      if (v < lo) lo = v
      if (v > hi) hi = v
    }
  }
  if (lo === Infinity) return [0, 1]
  if (lo === hi) return [lo - 0.5, hi + 0.5]
  return [lo, hi]
}

export interface Scale {
  /** Value at the bottom gridline. */
  min: number
  /** Value per division. */
  step: number
  divs: number
  /** Value at the top gridline. */
  max: number
}

/**
 * Y scale with `divs` divisions on a 1-2-5 step, centred on the data, that never clips:
 * the step grows until both extremes sit inside the grid.
 */
export function yScale(lo: number, hi: number, divs: number, pad = 1.1): Scale {
  let step = niceStep((hi - lo) * pad, divs)
  for (let guard = 0; guard < 8; guard++) {
    const mid = (hi + lo) / 2
    const min = Math.round(mid / step) * step - (step * divs) / 2
    const max = min + step * divs
    if (min <= lo && max >= hi) return { min, step, divs, max }
    step = step125(step * 1.0001 + step * 0.5)
  }
  const min = Math.floor(lo / step) * step
  return { min, step, divs, max: min + step * divs }
}

/** Largest |a[i] - ref[i]| over the samples both series have. */
export function maxAbsResidual(ref: ArrayLike<number>, ...series: (ArrayLike<number> | undefined)[]): number {
  let m = 0
  for (const s of series) {
    if (!s) continue
    const n = Math.min(s.length, ref.length)
    for (let i = 0; i < n; i++) {
      const d = Math.abs(s[i] - ref[i])
      if (Number.isFinite(d) && d > m) m = d
    }
  }
  return m
}

/**
 * Symmetric Δ scale on 1-2-5 from max |Δ| × 1.06, never clipped.
 * `halfDivs` divisions each side of zero (the hero Δ pane uses 3, a strip lane uses 1).
 */
export function deltaScale(maxAbs: number, halfDivs: number, tolerance = 0): { step: number; lim: number } {
  const need = Math.max(maxAbs * 1.06, tolerance * 1.06, 1e-6)
  const step = step125(need / halfDivs)
  return { step, lim: step * halfDivs }
}

/** Root-mean-square of (a - ref) over shared finite samples. */
export function rmse(a: ArrayLike<number>, ref: ArrayLike<number>): number {
  const n = Math.min(a.length, ref.length)
  let s = 0
  let k = 0
  for (let i = 0; i < n; i++) {
    const d = a[i] - ref[i]
    if (!Number.isFinite(d)) continue
    s += d * d
    k++
  }
  return k ? Math.sqrt(s / k) : NaN
}

/** Frames where |a - ref| exceeds the tolerance mask. */
export function countOutside(a: ArrayLike<number>, ref: ArrayLike<number>, tolerance: number): number {
  const n = Math.min(a.length, ref.length)
  let c = 0
  for (let i = 0; i < n; i++) if (Math.abs(a[i] - ref[i]) > tolerance) c++
  return c
}

/**
 * Timebase: the s/div a scope would pick for `spanS` seconds over `divs` divisions (1-2-5).
 * Small screens halve the divisions and the s/div roughly doubles: the trace keeps its shape.
 */
export function timebase(frames: number, fps: number, divs: number): { sPerDiv: number; spanS: number; fullS: number } {
  const spanS = Math.max(frames - 1, 1) / fps
  const sPerDiv = step125(spanS / divs)
  return { sPerDiv, spanS, fullS: sPerDiv * divs }
}

/**
 * Gap comb: x positions (frame indices) of amber ticks for the part of a residual outside the mask,
 * at most one tick per `minPx` pixels. Returns [frame, residual] pairs for out-of-mask frames only.
 */
export function comb(a: ArrayLike<number>, ref: ArrayLike<number>, tolerance: number, pxPerFrame: number, minPx = 3): [number, number][] {
  const stride = Math.max(1, Math.ceil(minPx / Math.max(pxPerFrame, 1e-9)))
  const n = Math.min(a.length, ref.length)
  const out: [number, number][] = []
  for (let i = 0; i < n; i += stride) {
    const d = a[i] - ref[i]
    if (Math.abs(d) > tolerance) out.push([i, d])
  }
  return out
}

/** Wilson score interval for k successes in n trials (95% by default). */
export function wilson(k: number, n: number, z = 1.96): [number, number] {
  if (!n) return [0, 1]
  const p = k / n
  const d = 1 + (z * z) / n
  const c = (p + (z * z) / (2 * n)) / d
  const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d
  return [Math.max(0, c - h), Math.min(1, c + h)]
}

/**
 * Newcombe hybrid score interval for p1 - p2, from each arm's point estimate and Wilson interval.
 * Returns [difference, lo, hi].
 */
export function newcombe(p1: number, ci1: [number, number], p2: number, ci2: [number, number]): [number, number, number] {
  const d = p1 - p2
  const lo = d - Math.sqrt((p1 - ci1[0]) ** 2 + (ci2[1] - p2) ** 2)
  const hi = d + Math.sqrt((ci1[1] - p1) ** 2 + (p2 - ci2[0]) ** 2)
  return [d, lo, hi]
}

/**
 * Path builder with per-pixel-column min/max decimation (no smoothing): long traces stay a few
 * thousand points at most and keep every peak. `x(i)` and `y(v)` map to pixels.
 */
export function linePath(n: number, value: (i: number) => number, x: (i: number) => number, y: (v: number) => number): string {
  if (n <= 0) return ''
  const parts: string[] = []
  const width = Math.abs(x(n - 1) - x(0))
  if (n <= width * 2 + 2) {
    let started = false
    for (let i = 0; i < n; i++) {
      const v = value(i)
      if (!Number.isFinite(v)) {
        started = false
        continue
      }
      parts.push(`${started ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
      started = true
    }
    return parts.join('')
  }
  let col = Math.floor(x(0))
  let iMin = -1
  let iMax = -1
  let started = false
  const flush = () => {
    if (iMin < 0) return
    const [a, b] = iMin <= iMax ? [iMin, iMax] : [iMax, iMin]
    parts.push(`${started ? 'L' : 'M'}${x(a).toFixed(1)} ${y(value(a)).toFixed(1)}`)
    started = true
    if (b !== a) parts.push(`L${x(b).toFixed(1)} ${y(value(b)).toFixed(1)}`)
  }
  for (let i = 0; i < n; i++) {
    const v = value(i)
    if (!Number.isFinite(v)) continue
    const c = Math.floor(x(i))
    if (c !== col) {
      flush()
      col = c
      iMin = iMax = -1
    }
    if (iMin < 0 || v < value(iMin)) iMin = i
    if (iMax < 0 || v > value(iMax)) iMax = i
  }
  flush()
  return parts.join('')
}

/** Closed band path around a series (±tolerance), decimated per pixel column like linePath. */
export function bandPath(values: ArrayLike<number>, tolerance: number, x: (i: number) => number, y: (v: number) => number): string {
  const n = values.length
  if (!n) return ''
  const cols: { x: number; lo: number; hi: number }[] = []
  for (let i = 0; i < n; i++) {
    const v = values[i]
    if (!Number.isFinite(v)) continue
    const xi = x(i)
    const last = cols[cols.length - 1]
    if (last && Math.floor(last.x) === Math.floor(xi) && n > 2 * Math.abs(x(n - 1) - x(0))) {
      last.lo = Math.min(last.lo, v)
      last.hi = Math.max(last.hi, v)
    } else cols.push({ x: xi, lo: v, hi: v })
  }
  if (!cols.length) return ''
  let d = ''
  cols.forEach((c, k) => (d += `${k ? 'L' : 'M'}${c.x.toFixed(1)} ${y(c.hi + tolerance).toFixed(1)}`))
  for (let k = cols.length - 1; k >= 0; k--) d += `L${cols[k].x.toFixed(1)} ${y(cols[k].lo - tolerance).toFixed(1)}`
  return d + 'Z'
}

/** WCAG 2.x relative luminance of a #rgb / #rrggbb colour. */
export function luminance(hex: string): number {
  let h = hex.replace('#', '').trim()
  if (h.length === 3) h = [...h].map((c) => c + c).join('')
  const n = parseInt(h.slice(0, 6), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((v) => {
      const c = v / 255
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0)
}

/** WCAG 2.x contrast ratio between two hex colours. */
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}
