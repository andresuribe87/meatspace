/**
 * "How many real trials?" (/power). Pure functions, no DOM: unit-tested in test/unit/power.test.ts.
 *
 * - wilsonInterval: Wilson score interval for a success rate (Wilson 1927).
 * - newcombeDiff: Newcombe's hybrid score interval for a difference of two independent rates (Newcombe 1998, method 10).
 * - nOneSample: trials to detect p1 against a known rate p0 (one-sample test of a proportion, normal approximation).
 * - nTwoSample: trials per arm to tell two measured rates apart (two-sample test, pooled variance under H0).
 * - zQuantile: inverse standard normal CDF (Wichura 1988, AS 241 PPND16, about 1e-16 relative accuracy).
 *
 * Rates are fractions in [0, 1]. Confidence is two-sided. Sample sizes round up.
 */

/**
 * Inverse of the standard normal CDF: the z with P(Z <= z) = p. AS 241 (PPND16).
 * zQuantile(0.975) = 1.959963984540054.
 */
export function zQuantile(p: number): number {
  if (!(p > 0 && p < 1)) {
    if (p === 0) return -Infinity
    if (p === 1) return Infinity
    return NaN
  }
  const q = p - 0.5
  if (Math.abs(q) <= 0.425) {
    const r = 0.180625 - q * q
    return (
      (q *
        (((((((r * 2509.0809287301227 + 33430.57558358813) * r + 67265.7709270087) * r + 45921.95393154987) * r +
          13731.69376550946) *
          r +
          1971.5909503065513) *
          r +
          133.14166789178438) *
          r +
          3.3871328727963665)) /
      (((((((r * 5226.495278852546 + 28729.085735721943) * r + 39307.89580009271) * r + 21213.794301586597) * r +
        5394.196021424751) *
        r +
        687.1870074920579) *
        r +
        42.31333070160091) *
        r +
        1)
    )
  }
  let r = q < 0 ? p : 1 - p
  r = Math.sqrt(-Math.log(r))
  let x: number
  if (r <= 5) {
    r -= 1.6
    x =
      (((((((r * 0.0007745450142783414 + 0.022723844989269184) * r + 0.2417807251774506) * r + 1.2704582524523684) * r +
        3.6478483247632045) *
        r +
        5.769497221460691) *
        r +
        4.630337846156546) *
        r +
        1.4234371107496835) /
      (((((((r * 1.0507500716444169e-09 + 0.0005475938084995345) * r + 0.015198666563616457) * r + 0.14810397642748008) * r +
        0.6897673349851) *
        r +
        1.6763848301838038) *
        r +
        2.053191626637759) *
        r +
        1)
  } else {
    r -= 5
    x =
      (((((((r * 2.0103343992922881e-07 + 2.7115555687434876e-05) * r + 0.0012426609473880784) * r + 0.026532189526576124) * r +
        0.29656057182850487) *
        r +
        1.7848265399172913) *
        r +
        5.463784911164114) *
        r +
        6.657904643501103) /
      (((((((r * 2.0442631033899397e-15 + 1.421511758316446e-07) * r + 1.8463183175100548e-05) * r + 0.0007868691311456133) * r +
        0.014875361290850615) *
        r +
        0.1369298809227358) *
        r +
        0.599832206555888) *
        r +
        1)
  }
  return q < 0 ? -x : x
}

/** Two-sided critical value for a confidence level (0.95 -> 1.959963984540054). */
export function zTwoSided(confidence: number): number {
  return zQuantile(1 - (1 - confidence) / 2)
}

export interface Interval {
  /** Point estimate (the observed rate). */
  p: number
  lo: number
  hi: number
}

/**
 * Wilson score interval for an observed rate `p` (= k / n) over `n` trials. `p` may be fractional
 * (an expected rate), which is what the calculator asks for. Bounds are clamped to [0, 1].
 */
export function wilsonInterval(p: number, n: number, confidence = 0.95): Interval {
  if (!(n > 0)) return { p, lo: 0, hi: 1 }
  const z = zTwoSided(confidence)
  const z2 = z * z
  const d = 1 + z2 / n
  const c = (p + z2 / (2 * n)) / d
  const h = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / d
  return { p, lo: Math.max(0, c - h), hi: Math.min(1, c + h) }
}

export interface DiffInterval {
  /** p1 - p2. */
  d: number
  lo: number
  hi: number
  /** The interval excludes 0: the two rates differ at this confidence. */
  decisive: boolean
}

/** Newcombe hybrid score interval for p1 - p2 from two independent arms (k1 of n1, k2 of n2). */
export function newcombeDiff(k1: number, n1: number, k2: number, n2: number, confidence = 0.95): DiffInterval {
  const a = wilsonInterval(k1 / n1, n1, confidence)
  const b = wilsonInterval(k2 / n2, n2, confidence)
  const d = a.p - b.p
  const lo = d - Math.sqrt((a.p - a.lo) ** 2 + (b.hi - b.p) ** 2)
  const hi = d + Math.sqrt((a.hi - a.p) ** 2 + (b.p - b.lo) ** 2)
  return { d, lo, hi, decisive: lo > 0 || hi < 0 }
}

/**
 * Trials needed to detect a true rate p1 against a known rate p0 (one-sample test of a proportion),
 * two-sided at `confidence`, with `power`:
 *   n = ( z_{1-a/2} sqrt(p0 (1 - p0)) + z_{power} sqrt(p1 (1 - p1)) )^2 / (p1 - p0)^2, rounded up.
 * 0.5 vs 0.6 at 95% / 80%: 194.
 */
export function nOneSample(p0: number, p1: number, confidence = 0.95, power = 0.8): number {
  const delta = p1 - p0
  if (!delta) return Infinity
  const za = zTwoSided(confidence)
  const zb = zQuantile(power)
  const n = (za * Math.sqrt(p0 * (1 - p0)) + zb * Math.sqrt(p1 * (1 - p1))) ** 2 / delta ** 2
  return Math.ceil(n - 1e-9)
}

/**
 * Trials per arm to tell two rates p1 and p2 apart (two-sample test of proportions, pooled variance under H0),
 * two-sided at `confidence`, with `power`:
 *   n = ( z_{1-a/2} sqrt(2 pbar (1 - pbar)) + z_{power} sqrt(p1 (1 - p1) + p2 (1 - p2)) )^2 / (p1 - p2)^2,
 *   pbar = (p1 + p2) / 2, rounded up. 0.5 vs 0.6 at 95% / 80%: 388 per arm.
 */
export function nTwoSample(p1: number, p2: number, confidence = 0.95, power = 0.8): number {
  const delta = p1 - p2
  if (!delta) return Infinity
  const za = zTwoSided(confidence)
  const zb = zQuantile(power)
  const pbar = (p1 + p2) / 2
  const n = (za * Math.sqrt(2 * pbar * (1 - pbar)) + zb * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2 / delta ** 2
  return Math.ceil(n - 1e-9)
}

/** The alternative rate for "a gap of `delta` from `p0`": moves toward 0.5 when p0 + delta would leave [0, 1]. */
export function alternative(p0: number, delta: number): number {
  const up = p0 + delta
  return up <= 1 ? up : p0 - delta
}

/** Label a trial count the way the site does: below 50 is not a verification; 200 is the default for a gap claim. */
export function trialTier(n: number): 'not-verification' | 'smoke-test' | 'gap-claim' {
  if (n < 50) return 'not-verification'
  if (n < 200) return 'smoke-test'
  return 'gap-claim'
}
