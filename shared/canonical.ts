/**
 * Canonical JSON: object keys sorted recursively (UTF-16 code unit order), no whitespace, arrays in order,
 * scalars exactly as JSON.stringify writes them. Undefined object members are dropped, as JSON.stringify does.
 * For values that came from JSON.parse this is the RFC 8785 (JCS) serialisation, so any client can reproduce it.
 */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v ?? null)).join(',')}]`
  if (value !== null && typeof value === 'object') {
    const o = value as Record<string, unknown>
    const members = Object.keys(o)
      .sort()
      .flatMap((k) => (o[k] === undefined ? [] : [`${JSON.stringify(k)}:${canonicalJson(o[k])}`]))
    return `{${members.join(',')}}`
  }
  return JSON.stringify(value)
}
