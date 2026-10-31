import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { RATE_LIMITS, VERSION } from '../../shared/constants'

/** Strip // and /* *\/ comments outside strings, then parse. */
function parseJsonc(text: string): unknown {
  let out = ''
  for (let i = 0, inStr = false; i < text.length; i++) {
    const c = text[i]
    if (inStr) {
      out += c
      if (c === '\\') out += text[++i]
      else if (c === '"') inStr = false
    } else if (c === '"') {
      inStr = true
      out += c
    } else if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++
      out += '\n'
    } else if (c === '/' && text[i + 1] === '*') {
      i = text.indexOf('*/', i + 2) + 1
    } else out += c
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1'))
}

interface WranglerConfig {
  ratelimits: { name: string; namespace_id: string; simple: { limit: number; period: number } }[]
  assets: { run_worker_first: string[] }
}

const wrangler = parseJsonc(readFileSync('wrangler.jsonc', 'utf8')) as WranglerConfig
const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }

describe('config stays in sync with shared/constants.ts', () => {
  it('rate limiter bindings match RATE_LIMITS', () => {
    const byName = Object.fromEntries(wrangler.ratelimits.map((r) => [r.name, r.simple]))
    expect(byName.DISPATCH_LIMITER).toEqual({ limit: RATE_LIMITS.dispatchPerMin, period: 60 })
    expect(byName.WAITLIST_LIMITER).toEqual({ limit: RATE_LIMITS.waitlistPerMin, period: 60 })
    expect(RATE_LIMITS.retryAfterS).toBe(60)
    expect(new Set(wrangler.ratelimits.map((r) => r.namespace_id)).size).toBe(wrangler.ratelimits.length)
  })

  it('package.json version matches VERSION', () => {
    expect(pkg.version).toBe(VERSION)
  })

  it('every Worker route is listed in run_worker_first, trailing-slash redirects included', () => {
    expect([...wrangler.assets.run_worker_first].sort()).toEqual(
      ['/v1', '/v1/*', '/install.sh', '/docs', '/healthz', '/install.sh/', '/docs/', '/healthz/'].sort(),
    )
  })
})
