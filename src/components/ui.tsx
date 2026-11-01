/**
 * Shared UI vocabulary, v0.1. Design system v1.0 "Instrument" lives in src/ds (API: src/ds/README.md);
 * its components are re-exported below so call sites can move one import at a time.
 * The v0.1 components in this file keep their markup unchanged until their pages move (v0.2):
 *   BracketButton -> Key (variant ghost keeps the [ ] brackets as CSS)   StatusTag -> Lamp (shared/status.ts)
 *   Panel         -> ds Panel (uncal prop)                               CopyButton -> CopyKey / CodeBlock
 *   Meter         -> IntervalMeter
 * Rules: 0px radius, 1px borders (line = structure, edge = control boundary), no shadows, palette tokens only.
 */
import { Check, Copy } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'

import { copyText } from '../lib/clipboard'

export {
  Callout,
  CertificateHeader,
  ChannelKeys,
  Check,
  CheckPoll,
  CIBars,
  CodeBlock,
  CommandLine,
  ConceptBanner,
  Console,
  CopyKey,
  CurlBlock,
  Dialog,
  Field,
  FieldGrid,
  Figure,
  Ids,
  Input,
  IntervalMeter,
  Key,
  LagReadout,
  Lamp,
  Ledger,
  ModeSwitch,
  Num,
  PowerSelector,
  ProvenanceFrame,
  Reading,
  RevisionTable,
  Ruler,
  ScopePlot,
  ScopeStrips,
  ScrollBox,
  Seal,
  SectionHeader,
  Select,
  SignalChain,
  SkipLink,
  StatusLine,
  Table,
  Tabs,
  Textarea,
  TitleBlock,
} from '../ds'

type Tone = 'default' | 'primary' | 'amber' | 'muted'

const TONES: Record<Tone, string> = {
  default: 'text-fg hover:text-emerald',
  primary: 'border border-emerald text-emerald hover:bg-emerald hover:text-bg',
  amber: 'border border-amber text-amber hover:bg-amber hover:text-bg',
  muted: 'text-muted hover:text-fg',
}

export interface BracketButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone
  /** Rendered as `[ LABEL ]`. */
  children: ReactNode
  /** Optional lucide icon element rendered before the label, inside the brackets. */
  icon?: ReactNode
}

/**
 * Terminal-style `[ LABEL ]` button. Disabled = muted, no hover.
 * @deprecated v0.1. Use `<Key variant="ghost">` (or primary / secondary / run / caution) from src/ds.
 */
export function BracketButton({ tone = 'default', className = '', children, icon, disabled, type, ...rest }: BracketButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      disabled={disabled}
      className={[
        'inline-flex items-center gap-1.5 whitespace-nowrap px-2 py-1 text-xs uppercase tracking-wider transition-none select-none',
        disabled ? 'cursor-not-allowed text-muted ' + (tone === 'primary' || tone === 'amber' ? 'border border-line' : '') : TONES[tone],
        className,
      ].join(' ')}
      {...rest}
    >
      <span aria-hidden="true">[</span>
      {icon}
      <span>{children}</span>
      <span aria-hidden="true">]</span>
    </button>
  )
}

export interface PanelProps {
  /** Header label, rendered uppercase muted, e.g. "ZONE C // LIVE HARDWARE ORDERBOOK". */
  title: ReactNode
  /** Right side of the header bar (filters, status, buttons). */
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  id?: string
  as?: 'section' | 'div' | 'aside'
}

/**
 * Bordered panel with a thin header bar.
 * @deprecated v0.1. Use `Panel` from src/ds (adds `uncal`, heading level and flush body).
 */
export function Panel({ title, actions, children, className = '', bodyClassName = '', id, as: Tag = 'section' }: PanelProps) {
  return (
    <Tag id={id} className={`border border-line bg-panel ${className}`}>
      <header className="flex min-h-9 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line px-3 py-1.5">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{title}</h2>
        {actions ? <div className="flex flex-wrap items-center gap-1">{actions}</div> : null}
      </header>
      <div className={bodyClassName}>{children}</div>
    </Tag>
  )
}

export interface CopyButtonProps {
  /** Text to copy, or a thunk evaluated on click. */
  text: string | (() => string)
  label?: string
  className?: string
  /** Accessible description of what is copied, e.g. "install command". */
  ariaLabel?: string
}

/**
 * `[ COPY ]` -> `[ COPIED ]` for 1.6s.
 * @deprecated v0.1. Use `CopyKey` (or `CodeBlock`, which copies exactly without the prompt) from src/ds.
 */
export function CopyButton({ text, label = 'COPY', className = '', ariaLabel }: CopyButtonProps) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle')
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const onClick = useCallback(async () => {
    const ok = await copyText(typeof text === 'function' ? text() : text)
    setState(ok ? 'copied' : 'error')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setState('idle'), 1600)
  }, [text])
  return (
    <BracketButton
      tone={state === 'copied' ? 'default' : 'muted'}
      className={`${state === 'copied' ? 'text-emerald hover:text-emerald' : ''} ${className}`}
      onClick={onClick}
      aria-label={ariaLabel ? `Copy ${ariaLabel}` : undefined}
      icon={state === 'copied' ? <Check size={12} strokeWidth={2} aria-hidden="true" /> : <Copy size={12} strokeWidth={2} aria-hidden="true" />}
    >
      <span aria-live="polite">{state === 'copied' ? 'COPIED' : state === 'error' ? 'COPY FAILED' : label}</span>
    </BracketButton>
  )
}

export type TagTone = 'emerald' | 'amber' | 'muted' | 'fg'

const TAG_TONES: Record<TagTone, string> = {
  emerald: 'text-emerald',
  amber: 'text-amber',
  muted: 'text-muted',
  fg: 'text-fg',
}

/**
 * Inline `[STATUS]` tag.
 * @deprecated v0.1. Use `<Lamp status="PREVIEW" />` from src/ds: shape + word + colour from shared/status.ts.
 */
export function StatusTag({ children, tone = 'muted', className = '' }: { children: ReactNode; tone?: TagTone; className?: string }) {
  return <span className={`whitespace-nowrap ${TAG_TONES[tone]} ${className}`}>[{children}]</span>
}

/**
 * 1px-bordered horizontal meter, 0..100.
 * @deprecated v0.1. Use `IntervalMeter` from src/ds (track + CI band + point).
 */
export function Meter({ value, tone = 'emerald', label, className = '' }: { value: number; tone?: 'emerald' | 'amber' | 'muted'; label: string; className?: string }) {
  const v = Math.max(0, Math.min(100, value))
  const fill = tone === 'amber' ? 'bg-amber' : tone === 'muted' ? 'bg-muted' : 'bg-emerald'
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.floor(v)}
      className={`h-2 w-16 shrink-0 border border-line bg-bg p-px ${className}`}
    >
      <div className={`h-full ${fill}`} style={{ width: `${v}%` }} />
    </div>
  )
}
