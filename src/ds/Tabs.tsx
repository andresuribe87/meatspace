import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

import type { Channel, ChannelVisibility } from './viz/types'
import { CHANNEL_LABEL } from './viz/types'

export interface TabItem {
  id: string
  label: ReactNode
  /** Inline count, e.g. "n=10" (muted). */
  count?: ReactNode
  /** Panel content. Omit for a pure switcher (pass `controls`). */
  panel?: ReactNode
}

export interface TabsProps {
  /** Accessible name of the tab list. */
  label: string
  items: TabItem[]
  /** Controlled selection. */
  value?: string
  defaultValue?: string
  onChange?: (id: string) => void
  /** id of the element the tabs control when there are no panels (e.g. a plot). */
  controls?: string
  className?: string
  panelClassName?: string
}

/**
 * C-06 Tabs: 36px, muted, 2px fg underline when selected. Roving tabindex: Arrow keys, Home and End
 * move and select; only the selected tab is in the Tab order.
 *
 * @example <Tabs label="Split" items={[{ id: 'held', label: 'held-out', count: 'n=10', panel: <Table…/> }, …]} />
 */
export function Tabs({ label, items, value, defaultValue, onChange, controls, className = '', panelClassName = '' }: TabsProps) {
  const [inner, setInner] = useState(defaultValue ?? items[0]?.id)
  const sel = value ?? inner
  const base = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const pick = (id: string) => {
    if (value === undefined) setInner(id)
    onChange?.(id)
  }
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = items.findIndex((t) => t.id === sel)
    let n: number | null = null
    if (e.key === 'ArrowRight') n = (i + 1) % items.length
    else if (e.key === 'ArrowLeft') n = (i - 1 + items.length) % items.length
    else if (e.key === 'Home') n = 0
    else if (e.key === 'End') n = items.length - 1
    if (n === null) return
    e.preventDefault()
    pick(items[n].id)
    refs.current[n]?.focus()
  }
  const hasPanels = items.some((t) => t.panel !== undefined)
  const current = items.find((t) => t.id === sel)
  return (
    <>
      <div className={`tabs ${className}`} role="tablist" aria-label={label} onKeyDown={onKey}>
        {items.map((t, i) => {
          const on = t.id === sel
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[i] = el
              }}
              role="tab"
              type="button"
              id={`${base}-tab-${t.id}`}
              aria-selected={on}
              aria-controls={hasPanels ? `${base}-panel-${t.id}` : controls}
              tabIndex={on ? 0 : -1}
              onClick={() => pick(t.id)}
            >
              {t.label}
              {t.count != null ? <span className="muted"> {t.count}</span> : null}
            </button>
          )
        })}
      </div>
      {hasPanels && current ? (
        <div role="tabpanel" id={`${base}-panel-${current.id}`} aria-labelledby={`${base}-tab-${current.id}`} tabIndex={0} className={panelClassName}>
          {current.panel}
        </div>
      ) : null}
    </>
  )
}

export interface ModeOption {
  value: string
  label: ReactNode
  disabled?: boolean
  /** Why it is disabled, e.g. "No real cell yet". */
  title?: string
}

/**
 * C-06 Mode switch: a lamp group (`sim | real`) with aria-pressed. Real stays disabled with a title
 * until a cell exists.
 */
export function ModeSwitch({
  label,
  options,
  value,
  onChange,
  className = '',
}: {
  label: string
  options: ModeOption[]
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  return (
    <div className={`mode ${className}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} disabled={o.disabled} title={o.title} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/**
 * C-06 Probe keys: toggle a plot channel. 28px with the channel's line key; when off they dim to 35%
 * so the channel keeps its identity.
 */
export function ChannelKeys({
  value,
  onChange,
  channels = ['real', 'stock', 'cal'],
  label = 'Channels',
}: {
  value: ChannelVisibility
  onChange: (v: ChannelVisibility) => void
  channels?: Channel[]
  label?: string
}) {
  return (
    <span className="chkeys" role="group" aria-label={label}>
      {channels.map((c) => {
        const [ch, ...rest] = CHANNEL_LABEL[c].split(' ')
        return (
          <button key={c} className="chkey" type="button" aria-pressed={value[c]} onClick={() => onChange({ ...value, [c]: !value[c] })}>
            <i className={`sw sw--${c}`} aria-hidden="true" />
            {c === 'cmd' ? (
              CHANNEL_LABEL[c]
            ) : (
              <>
                <b>{ch}</b> {rest.join(' ')}
              </>
            )}
          </button>
        )
      })}
    </span>
  )
}
