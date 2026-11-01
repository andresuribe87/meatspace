import type { HTMLAttributes, ReactNode } from 'react'

import { CAPABILITY_STATUS, isCapabilityStatus, lampKindOf, type LampKind, type LampWord } from '../../shared/status'

interface LampCommon extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** 'sm' (18px) inside tables, ledgers and bezels; 'md' (20px) elsewhere. */
  size?: 'md' | 'sm'
  /** The verdict was computed from UNCAL (placeholder) inputs: renders dashed and unlit. */
  uncal?: boolean
  /** Lit (filled) variant, used by the concept banner. */
  lit?: boolean
}

export type LampProps = LampCommon &
  (
    | {
        /** A vocabulary word from shared/status.ts: LIVE, PREVIEW, PASS, MARGINAL, UNCAL, ARMED... Sets shape, colour and word. */
        status: LampWord
        /** Override the printed word (still real text), e.g. "1 joint marginal" with status MARGINAL. */
        children?: ReactNode
        kind?: undefined
      }
    | {
        status?: undefined
        /** Explicit lamp kind when the word is a phrase outside the vocabulary list ("cal matches ≤ 1 fr"). */
        kind: LampKind
        children: ReactNode
      }
  )

/**
 * C-02 Annunciator. A status lamp: CSS-drawn shape + a literal word + colour, never colour alone.
 * Every state comes from shared/status.ts. At most one lit amber lamp per panel.
 *
 * @example <Lamp status="PREVIEW" />  <Lamp status="PASS" uncal />  <Lamp kind="gap">1 joint marginal</Lamp>
 */
export function Lamp({ status, kind, children, size = 'md', uncal, lit, className = '', title, ...rest }: LampProps) {
  const k: LampKind = kind ?? lampKindOf(status!)
  const word = children ?? status?.toLowerCase()
  const meaning = status && isCapabilityStatus(status) ? CAPABILITY_STATUS[status].meaning : undefined
  return (
    <span
      className={['ann', `ann--${k}`, size === 'sm' ? 'ann--sm' : '', lit ? 'ann--lit' : '', className].filter(Boolean).join(' ')}
      data-status={status ?? k}
      data-uncal={uncal ? '' : undefined}
      title={title ?? (uncal ? 'Computed from placeholder numbers: not a measured verdict' : meaning)}
      {...rest}
    >
      <span>{word}</span>
    </span>
  )
}

/** Alias: the spec calls the lamp an annunciator. */
export const Annunciator = Lamp
