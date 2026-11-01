export interface CurlParts {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  url: string
  headers?: string[]
  /** Request body (JSON text), sent with -d. */
  data?: string
  /** Pipe stage, e.g. "jq .headline". */
  pipe?: string
}

/** Builds a copy-exact curl command, breaking at a backslash with a 4-space hanging indent past 76 columns. */
export function curlCommand({ method = 'GET', url, headers = [], data, pipe }: CurlParts): string {
  const q = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`
  const parts = ['curl -s' + (method !== 'GET' ? ` -X ${method}` : ''), url, ...headers.map((h) => `-H ${q(h)}`), ...(data ? [`-d ${q(data)}`] : [])]
  if (pipe) parts.push(`| ${pipe}`)
  const one = parts.join(' ')
  if (one.length <= 76) return one
  const [head, ...tail] = parts
  const lines = [`${head} ${tail.shift()}`]
  for (const p of tail) lines.push(`    ${p}`)
  return lines.join(' \\\n')
}
