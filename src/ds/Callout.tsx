import type { ReactNode } from 'react'

/** RFC 2119 register, encoded by the 2px left spine. */
export type CalloutRegister = 'must' | 'limitation' | 'note' | 'method' | 'ok'

const KEYWORD: Record<CalloutRegister, string> = {
  must: 'Must not',
  limitation: '▲ Limitation',
  note: 'Note',
  method: 'Method',
  ok: '■ Within tolerance',
}

const CLASS: Record<CalloutRegister, string> = {
  must: '',
  limitation: 'co--limit',
  note: 'co--note',
  method: 'co--note',
  ok: 'co--ok',
}

export interface CalloutProps {
  /** must = fg (normative), limitation = amber ▲, note / method = edge, ok = emerald ■ (measured values with the limit printed only). */
  register: CalloutRegister
  /** Keyword compartment text; defaults per register ("Must not", "▲ Limitation", ...). */
  keyword?: ReactNode
  /** Mono reference line under the body: where the statement comes from, e.g. "report.json · limitations[1]". */
  source?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * C-09 Callout: a 132px keyword compartment next to a sans body and a mono source line.
 * Stacks under a 560px container.
 *
 * @example <Callout register="limitation" source="report.json · limitations[1]">Open-loop, joint-space, contact-free…</Callout>
 */
export function Callout({ register, keyword, source, children, className = '' }: CalloutProps) {
  return (
    <div className="cq">
      <div className={`co ${CLASS[register]} ${className}`} role="note">
        <div className="kw">{keyword ?? KEYWORD[register]}</div>
        <div className="bd">
          {children}
          {source ? <span className="ref">{source}</span> : null}
        </div>
      </div>
    </div>
  )
}
