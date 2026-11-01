import { useRef, type ReactNode } from 'react'

import type { LampWord } from '../../shared/status'
import { useOverflowA11y } from './hooks'
import { Key, type KeyBusy } from './Key'
import { Lamp } from './Lamp'

export interface ConsoleEvent {
  /** Real elapsed ms since the request started. Never staged offsets presented as real. */
  t: number
  /** Event name (fg). */
  event: string
  /** Payload text (muted), usually one NDJSON object. */
  payload?: string
  /** Verdict word, printed in caps. */
  verdict?: string
  /** ok = emerald (only for an ok verdict), warn = amber. Default muted. */
  tone?: 'ok' | 'warn'
}

export interface ConsoleProps {
  /** Header legend, e.g. <>preflight // <b>POST /v1/twin-reports</b></>. */
  title: ReactNode
  status?: LampWord
  events: ConsoleEvent[]
  /** Exit line printed after the events, e.g. { code: 0, summary: '5 events · 0.40 s · queued for a person, nothing ran' }. */
  exit?: { code: number; summary: ReactNode } | null
  /** Line shown when there are no events yet. */
  idle?: ReactNode
  /** Run key in the header. `busy` shows "Running T+…" with elapsed time. */
  run?: { label: string; onRun: () => void; busy?: KeyBusy | null; disabled?: boolean }
  /** Footer cells, e.g. ['5 events · elapsed 0.402 s', 'a person runs it']. */
  footer?: [ReactNode, ReactNode?]
  /** One-shot completion message for screen readers (the log itself is aria-live="off"). */
  announce?: string
  /** Accessible name of the log. */
  label?: string
  className?: string
}

/**
 * C-08 NDJSON console: one row per event, `+0212ms | event | payload | VERDICT`. role=log with
 * aria-live="off" (completion is announced once through `announce`). Times are real elapsed ms.
 */
export function Console({ title, status, events, exit, idle, run, footer, announce, label = 'Event stream', className = '' }: ConsoleProps) {
  const log = useRef<HTMLDivElement>(null)
  useOverflowA11y(log, `${label}, scrolls sideways`, null)
  return (
    <div className={`con ${className}`}>
      <div className="code-h">
        <span className="t-legend">{title}</span>
        <span className="ds-row">
          {status ? <Lamp status={status} size="sm" /> : null}
          {run ? (
            <Key variant="run" size="sm" glyph busy={run.busy} onClick={run.onRun} disabled={run.disabled}>
              {run.label}
            </Key>
          ) : null}
        </span>
      </div>
      <div ref={log} className="con-log" role="log" aria-live="off" aria-label={label}>
        <ol>
          {events.length === 0 && idle ? (
            <li>
              <span className="pl">{idle}</span>
            </li>
          ) : null}
          {events.map((e, i) => (
            <li key={i}>
              <span className="t">+{String(Math.round(e.t)).padStart(4, '0')}ms</span>
              <span className="ev">{e.event}</span>
              {e.payload ? <span className="pl">{e.payload} </span> : null}
              {e.verdict ? <span className={e.tone === 'ok' ? 'vok' : e.tone === 'warn' ? 'vw' : 'pl'}>{e.verdict.toUpperCase()}</span> : null}
            </li>
          ))}
          {exit ? (
            <li>
              <span className="t">exit {exit.code}</span>
              <span className="pl">{exit.summary}</span>
            </li>
          ) : null}
        </ol>
      </div>
      {footer ? (
        <div className="con-f">
          <span>{footer[0]}</span>
          {footer[1] ? <span>{footer[1]}</span> : null}
        </div>
      ) : null}
      <span className="sr" role="status">
        {announce ?? ''}
      </span>
    </div>
  )
}
