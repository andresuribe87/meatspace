import { Fragment, type ReactNode } from 'react'

/**
 * Product and part names never break at their hyphen ("SO- / 101"): wraps SO-100, SO-101 and part numbers (MS-TGR-1)
 * in a `nw` span. For text that arrives as a string (status scopes, man page prose); JSX text wraps its own names.
 * A non-breaking hyphen (U+2011) is not used: none of the self-hosted fonts has the glyph.
 */
const KEEP = /\b(?:SO-\d{3}|MS-[A-Z0-9]+(?:-[A-Z0-9]+)*)\b/g

export function nobr(text: string): ReactNode {
  const out: ReactNode[] = []
  let at = 0
  for (const m of text.matchAll(KEEP)) {
    const i = m.index ?? 0
    if (i > at) out.push(text.slice(at, i))
    out.push(
      <span key={i} className="nw">
        {m[0]}
      </span>,
    )
    at = i + m[0].length
  }
  if (!out.length) return text
  if (at < text.length) out.push(text.slice(at))
  return <Fragment>{out}</Fragment>
}
