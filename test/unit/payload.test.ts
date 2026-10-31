import { execFileSync } from 'node:child_process'

import { describe, expect, it } from 'vitest'

import { parseDispatchPayload } from '../../shared/dispatch'
import { SEED_NODES } from '../../shared/nodes'
import { buildPayload } from '../../shared/primitives'
import { curlCommand, formatPayload } from '../../src/lib/payload'

describe('formatPayload', () => {
  it.each(SEED_NODES.map((n) => [n.id, n] as const))('%s: round-trips to the same payload and parses', (_id, node) => {
    const p = buildPayload(node)
    const text = formatPayload(p)
    expect(JSON.parse(text)).toEqual(p)
    expect(parseDispatchPayload(JSON.parse(text)).ok).toBe(true)
  })

  it('keeps scalar arrays inline and nests objects with 2-space indent', () => {
    const text = formatPayload({ a: [1, 2], b: { c: 'x', d: [[0, 1], [2, 3]] }, e: [], f: {}, g: undefined })
    expect(text).toBe('{\n  "a": [1, 2],\n  "b": {\n    "c": "x",\n    "d": [\n      [0, 1],\n      [2, 3]\n    ]\n  },\n  "e": [],\n  "f": {}\n}')
  })

  it('the default aerial body stays compact', () => {
    expect(formatPayload(buildPayload(SEED_NODES[0])).split('\n').length).toBeLessThanOrEqual(34)
  })
})

describe('curlCommand', () => {
  it('produces a POSIX sh command whose -d argument is exactly the body, even with single quotes', () => {
    const body = formatPayload({ note: "it's a 'quoted' test", n: 1 })
    const cmd = curlCommand(body)
    // Replace curl with printf to capture the -d argument the shell actually passes.
    const script = cmd.replace(/^curl -sN -X POST \S+ \\\n {2}-H 'content-type: application\/json' \\\n {2}-d /, "printf '%s' ")
    expect(execFileSync('/bin/sh', ['-c', script], { encoding: 'utf8' })).toBe(body)
  })
})
