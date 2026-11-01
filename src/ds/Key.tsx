import type { AnchorHTMLAttributes, ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react'

import { fmtElapsed } from './format'
import { useElapsed } from './hooks'

/** primary: one per view, the brightest object on screen. run arms a measurement; caution changes a limit; ghost (alias quiet) is nav. */
export type KeyVariant = 'primary' | 'secondary' | 'run' | 'caution' | 'ghost' | 'quiet'

export interface KeyBusy {
  /** State word, e.g. "Running" or "Sending". */
  label?: string
  /** performance.now() when the operation started. The key shows elapsed time, never a spinner. */
  startedAt: number
}

interface KeyOwn {
  variant?: KeyVariant
  /** 'md' 36px (44 on coarse pointers), 'sm' 28px (40 on coarse pointers). */
  size?: 'md' | 'sm'
  /** Leading 8px square: the "run" glyph. */
  glyph?: boolean
  /** Busy state: `Running T+00:01.24`. Clicks are ignored while busy. */
  busy?: KeyBusy | null
  /** Marks the current page on a ghost nav key (aria-current="page"). */
  current?: boolean
  children: ReactNode
}

export type KeyProps =
  | (KeyOwn & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & { href?: undefined })
  | (KeyOwn & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> & { href: string })

function cls(variant: KeyVariant, size: 'md' | 'sm', extra?: string) {
  const v = variant === 'quiet' ? 'ghost' : variant
  return ['key', `key--${v}`, size === 'sm' ? 'key--sm' : '', extra].filter(Boolean).join(' ')
}

/**
 * C-01 Softkey. A native <button> (or <a> with `href`). Verb labels that name the operation
 * ("Request a report", "Run preflight"). State changes take 0ms; hover inverts.
 *
 * @example <Key variant="primary" onClick={open}>Request a report</Key>
 * @example <Key variant="run" glyph busy={{ startedAt }}>Run preflight</Key>
 * @example <Key variant="ghost" href="/reports" current>Reports</Key>
 */
export function Key(props: KeyProps) {
  const { variant = 'secondary', size = 'md', glyph, busy, current, children, className, ...rest } = props
  const elapsed = useElapsed(busy ? busy.startedAt : null)
  const body = busy ? (
    <>
      {glyph || variant === 'run' ? <span className="sq" aria-hidden="true" /> : null}
      <span>{busy.label ?? 'Running'}</span>
      <span className="t" aria-hidden="true">
        {fmtElapsed(elapsed)}
      </span>
    </>
  ) : (
    <>
      {glyph ? <span className="sq" aria-hidden="true" /> : null}
      {children}
    </>
  )
  const c = cls(variant, size, className)
  if (rest.href !== undefined) {
    const a = rest as AnchorHTMLAttributes<HTMLAnchorElement>
    return (
      <a {...a} className={c} aria-current={current ? 'page' : a['aria-current']} aria-busy={busy ? true : undefined}>
        {body}
      </a>
    )
  }
  const b = rest as ButtonHTMLAttributes<HTMLButtonElement>
  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (busy) {
      e.preventDefault()
      return
    }
    b.onClick?.(e)
  }
  return (
    <button
      {...b}
      type={b.type ?? 'button'}
      className={c}
      onClick={onClick}
      aria-current={current ? 'page' : b['aria-current']}
      aria-busy={busy ? true : undefined}
    >
      {body}
    </button>
  )
}

/** Alias for engineers who look for a Button. Same component. */
export const Button = Key
