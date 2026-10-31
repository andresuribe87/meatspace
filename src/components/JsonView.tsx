/**
 * Lenient JSON syntax highlighter. Tokenises the source text and preserves every character
 * (whitespace included), so what is shown is exactly what is sent. Invalid / half-typed JSON still
 * renders: anything unrecognised falls through as plain text.
 *
 * Palette: keys fg, strings emerald, numbers amber, true/false/null + punctuation muted.
 */
import { memo, useMemo, type ReactNode } from 'react'

type TokenKind = 'key' | 'string' | 'number' | 'literal' | 'punct' | 'space' | 'text'

interface Token {
  kind: TokenKind
  text: string
}

const CLASS: Record<TokenKind, string | undefined> = {
  key: 'text-fg',
  string: 'text-emerald',
  number: 'text-amber',
  literal: 'text-muted',
  punct: 'text-muted',
  space: undefined,
  text: 'text-fg',
}

// 1: string (possibly unterminated at end of line)  2: number  3: literal  4: punctuation  5: whitespace  6: anything else
const TOKEN_RE = /("(?:[^"\\\n]|\\.)*"?)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(true|false|null)(?![\w-])|([{}[\],:])|(\s+)|([^\s"{}[\],:]+)/g

function tokenizeJson(src: string): Token[] {
  const out: Token[] = []
  let m: RegExpExecArray | null
  TOKEN_RE.lastIndex = 0
  while ((m = TOKEN_RE.exec(src)) !== null) {
    if (m[1] !== undefined) out.push({ kind: 'string', text: m[1] })
    else if (m[2] !== undefined) out.push({ kind: 'number', text: m[2] })
    else if (m[3] !== undefined) out.push({ kind: 'literal', text: m[3] })
    else if (m[4] !== undefined) out.push({ kind: 'punct', text: m[4] })
    else if (m[5] !== undefined) out.push({ kind: 'space', text: m[5] })
    else out.push({ kind: 'text', text: m[0] })
  }
  // A string followed (after optional whitespace) by ':' is an object key.
  for (let i = 0; i < out.length; i++) {
    if (out[i].kind !== 'string') continue
    let j = i + 1
    while (j < out.length && out[j].kind === 'space') j++
    if (j < out.length && out[j].kind === 'punct' && out[j].text === ':') out[i] = { kind: 'key', text: out[i].text }
  }
  return out
}

/** One-line JSON with a space after ':' and ',' so long values wrap at field boundaries. */
function compactJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map((x) => compactJson(x === undefined ? null : x)).join(', ')}]`
  if (typeof v === 'object' && v !== null) {
    const fields = Object.entries(v as Record<string, unknown>)
      .filter(([, x]) => x !== undefined)
      .map(([k, x]) => `${JSON.stringify(k)}: ${compactJson(x)}`)
    return `{${fields.join(', ')}}`
  }
  return JSON.stringify(v) ?? 'null'
}

export type JsonViewProps =
  | {
      /** Raw JSON source; rendered verbatim. */
      text: string
      value?: never
      compact?: never
    }
  | {
      /** A value to serialise first: pretty (2-space) by default, or one line with `compact`. */
      value: unknown
      compact?: boolean
      text?: never
    }

/** Inline token spans; wrap in <pre>/<code> at the call site. */
export const JsonView = memo(function JsonView(props: JsonViewProps): ReactNode {
  const source = props.text ?? (props.compact ? compactJson(props.value) : JSON.stringify(props.value, null, 2) ?? 'null')
  const tokens = useMemo(() => tokenizeJson(source), [source])
  return tokens.map((t, i) => {
    const cls = CLASS[t.kind]
    return cls ? (
      <span key={i} className={cls}>
        {t.text}
      </span>
    ) : (
      t.text
    )
  })
})
