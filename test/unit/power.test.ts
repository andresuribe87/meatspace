import { describe, expect, it } from 'vitest'

import { alternative, newcombeDiff, nOneSample, nTwoSample, trialTier, wilsonInterval, zQuantile, zTwoSided } from '../../src/lib/power'

describe('zQuantile (AS 241)', () => {
  it('matches reference quantiles of the standard normal', () => {
    // Reference values: scipy.stats.norm.ppf.
    const ref: [number, number][] = [
      [0.5, 0],
      [0.8, 0.841621233572914],
      [0.9, 1.2815515655446],
      [0.95, 1.64485362695147],
      [0.975, 1.95996398454005],
      [0.995, 2.5758293035489],
      [0.9995, 3.29052673149190],
      [1e-10, -6.36134090240406],
      [0.025, -1.95996398454005],
    ]
    for (const [p, z] of ref) expect(zQuantile(p)).toBeCloseTo(z, 12)
  })

  it('is antisymmetric and handles the edges', () => {
    for (const p of [0.01, 0.2, 0.42, 0.49]) expect(zQuantile(p)).toBeCloseTo(-zQuantile(1 - p), 13)
    expect(zQuantile(0)).toBe(-Infinity)
    expect(zQuantile(1)).toBe(Infinity)
    expect(Number.isNaN(zQuantile(1.5))).toBe(true)
    expect(zTwoSided(0.95)).toBeCloseTo(1.959963984540054, 13)
    expect(zTwoSided(0.99)).toBeCloseTo(2.5758293035489, 12)
  })
})

describe('wilsonInterval', () => {
  it('gives the published table: 50% success at n = 10 and n = 50', () => {
    const a = wilsonInterval(0.5, 10)
    expect(a.lo).toBeCloseTo(0.236593090512564, 10)
    expect(a.hi).toBeCloseTo(0.763406909487436, 10)
    const b = wilsonInterval(0.5, 50)
    expect(b.lo).toBeCloseTo(0.366445143, 8)
    expect(b.hi).toBeCloseTo(0.633554857, 8)
  })

  it('matches an independent computation off-centre and stays inside [0, 1]', () => {
    // Python, z = scipy.stats.norm.ppf(0.975): 144 / 200 -> (0.6540769541, 0.7776311023).
    const r = wilsonInterval(144 / 200, 200)
    expect(r.lo).toBeCloseTo(0.6540769541, 9)
    expect(r.hi).toBeCloseTo(0.7776311023, 9)
    const zero = wilsonInterval(0, 20)
    expect(zero.lo).toBeCloseTo(0, 12)
    expect(zero.hi).toBeCloseTo(0.161125, 5)
    const all = wilsonInterval(1, 20)
    expect(all.hi).toBeCloseTo(1, 12)
    expect(all.lo).toBeCloseTo(1 - 0.161125, 5)
  })

  it('narrows as n grows and widens with confidence', () => {
    const w = (n: number, c = 0.95) => {
      const r = wilsonInterval(0.3, n, c)
      return r.hi - r.lo
    }
    expect(w(50)).toBeLessThan(w(10))
    expect(w(200)).toBeLessThan(w(50))
    expect(w(200, 0.99)).toBeGreaterThan(w(200, 0.95))
    expect(wilsonInterval(0.4, 0)).toEqual({ p: 0.4, lo: 0, hi: 1 })
  })
})

describe('sample sizes', () => {
  it('one sample: 50% against 60%, two-sided 95%, 80% power = 194 trials', () => {
    expect(nOneSample(0.5, 0.6)).toBe(194)
    // Same formula, by hand: (1.959964 * 0.5 + 0.841621 * sqrt(0.24))^2 / 0.01 = 193.85
    expect(nOneSample(0.5, 0.4)).toBe(194)
    expect(nOneSample(0.5, 0.6, 0.95, 0.9)).toBe(259)
    expect(nOneSample(0.5, 0.5)).toBe(Infinity)
  })

  it('two samples: 50% against 60% = 388 per arm; symmetric in its arguments', () => {
    expect(nTwoSample(0.5, 0.6)).toBe(388)
    expect(nTwoSample(0.6, 0.5)).toBe(388)
    // Pooled-variance formula, computed independently in Python: 0.7 vs 0.8 -> 293.15 -> 294 per arm.
    expect(nTwoSample(0.7, 0.8)).toBe(294)
    expect(nTwoSample(0.3, 0.3)).toBe(Infinity)
  })

  it('needs more trials for smaller gaps, more power and more confidence', () => {
    expect(nTwoSample(0.5, 0.55)).toBeGreaterThan(nTwoSample(0.5, 0.6))
    expect(nTwoSample(0.5, 0.6, 0.95, 0.9)).toBeGreaterThan(nTwoSample(0.5, 0.6, 0.95, 0.8))
    expect(nTwoSample(0.5, 0.6, 0.99, 0.8)).toBeGreaterThan(nTwoSample(0.5, 0.6, 0.95, 0.8))
  })

  it('picks the alternative inside [0, 1]', () => {
    expect(alternative(0.5, 0.1)).toBeCloseTo(0.6, 12)
    expect(alternative(0.95, 0.1)).toBeCloseTo(0.85, 12)
  })
})

describe('newcombeDiff', () => {
  it('matches Newcombe (1998) method 10 on his worked example 56/70 vs 48/80', () => {
    // Newcombe, Stat Med 17:873-890, table II: 0.2000, 95% CI 0.0524 to 0.3339.
    const r = newcombeDiff(56, 70, 48, 80)
    expect(r.d).toBeCloseTo(0.2, 12)
    expect(r.lo).toBeCloseTo(0.0524, 4)
    expect(r.hi).toBeCloseTo(0.3339, 4)
    expect(r.decisive).toBe(true)
  })

  it('ten trials each cannot tell 30% from 70%', () => {
    const r = newcombeDiff(7, 10, 3, 10)
    expect(r.d).toBeCloseTo(0.4, 12)
    expect(r.lo).toBeLessThan(0)
    expect(r.decisive).toBe(false)
  })

  it('is antisymmetric', () => {
    const a = newcombeDiff(30, 50, 20, 50)
    const b = newcombeDiff(20, 50, 30, 50)
    expect(b.d).toBeCloseTo(-a.d, 12)
    expect(b.lo).toBeCloseTo(-a.hi, 12)
    expect(b.hi).toBeCloseTo(-a.lo, 12)
  })
})

describe('trialTier', () => {
  it('follows the site rules: under 50 is not a verification, 200 is the default for a gap claim', () => {
    expect(trialTier(10)).toBe('not-verification')
    expect(trialTier(49)).toBe('not-verification')
    expect(trialTier(50)).toBe('smoke-test')
    expect(trialTier(199)).toBe('smoke-test')
    expect(trialTier(200)).toBe('gap-claim')
  })
})
