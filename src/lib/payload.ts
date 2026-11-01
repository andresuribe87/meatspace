import { ORIGIN } from '../../shared/constants'

/** Public API origin shown in copyable curl commands (the SPA itself calls relative /v1 paths). */
export const PUBLIC_ORIGIN = ORIGIN

const isScalar = (v: unknown) => v === null || typeof v !== 'object'

function format(v: unknown, indent: string): string {
  const inner = `${indent}  `
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]'
    // Arrays of scalars (coordinate pairs, bboxes, tag lists) stay on one line.
    if (v.every(isScalar)) return `[${v.map((x) => JSON.stringify(x)).join(', ')}]`
    return `[\n${v.map((x) => inner + format(x, inner)).join(',\n')}\n${indent}]`
  }
  if (v !== null && typeof v === 'object') {
    const entries = Object.entries(v).filter(([, x]) => x !== undefined)
    if (entries.length === 0) return '{}'
    return `{\n${entries.map(([k, x]) => `${inner}${JSON.stringify(k)}: ${format(x, inner)}`).join(',\n')}\n${indent}}`
  }
  return JSON.stringify(v)
}

/**
 * Pretty JSON body exactly as shown in the console and sent on [ EXECUTE CALL ].
 * Like JSON.stringify(v, null, 2) but keeps scalar arrays inline, so a polygon reads as five lines, not thirty.
 */
export function formatPayload(value: unknown): string {
  return format(value, '')
}

/** Shell-safe curl command for a JSON body. Single quotes inside the body are escaped for POSIX sh. */
export function curlCommand(body: string, path = '/v1/concept/dispatch'): string {
  const quoted = `'${body.replace(/'/g, `'\\''`)}'`
  return [`curl -sN -X POST ${PUBLIC_ORIGIN}${path} \\`, `  -H 'content-type: application/json' \\`, `  -d ${quoted}`].join('\n')
}
