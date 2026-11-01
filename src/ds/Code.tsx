import { useEffect, useRef, useState, type ReactNode } from 'react'

import type { LampWord } from '../../shared/status'
import { copyText } from '../lib/clipboard'
import { curlCommand } from './curl'
import { useOverflowA11y } from './hooks'
import { Key } from './Key'
import { Lamp } from './Lamp'

/** Ghost "Copy" key: copies the exact text and reads "Copied" for 1.6 s. */
export function CopyKey({ text, what, size = 'sm' }: { text: string | (() => string); what?: string; size?: 'sm' | 'md' }) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle')
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const onClick = async () => {
    const ok = await copyText(typeof text === 'function' ? text() : text)
    setState(ok ? 'copied' : 'error')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setState('idle'), 1600)
  }
  return (
    <Key variant="ghost" size={size} onClick={onClick} aria-label={what ? `Copy ${what}` : undefined}>
      <span aria-live="polite">{state === 'copied' ? 'Copied' : state === 'error' ? 'Copy failed' : 'Copy'}</span>
    </Key>
  )
}

export interface CodeBlockProps {
  /** Header legend, e.g. <>shell · <b>GET /v1/reports/:id</b></>. */
  title: ReactNode
  /** Status lamp for the endpoint (planned endpoints say PLANNED). */
  status?: LampWord
  /**
   * The command(s), exactly as they should be copied (ASCII, no prompt). Lines that continue a previous line
   * ending in a backslash are printed as written (keep the 4-space hanging indent). Lines starting with # are comments.
   */
  code: string
  /** Shell prompt shown before each command line; muted and not selectable. Default "$ ". Pass "" for none. */
  prompt?: string
  /** Output under the command (muted, like a comment). May hold <Num> for figures. */
  output?: ReactNode
  /** Accessible name for the copy key and the scroll region, e.g. "report request command". */
  what?: string
  copy?: boolean
  className?: string
}

/**
 * C-07 Code block: carbon screen, 36px header (title, status lamp, ghost Copy), pre at 13/1.7.
 * No syntax colours. Copy-exact: copies `code` without the prompt.
 *
 * @example <CodeBlock title={<>shell · <b>GET /v1/reports</b></>} status="PREVIEW" code="curl -s https://meatspace.sh/v1/reports" what="reports command" />
 */
export function CodeBlock({ title, status, code, prompt = '$ ', output, what = 'command', copy = true, className = '' }: CodeBlockProps) {
  const pre = useRef<HTMLPreElement>(null)
  useOverflowA11y(pre, `Code, ${what}, scrolls sideways`)
  const lines = code.split('\n')
  return (
    <div className={`code ${className}`}>
      <div className="code-h">
        <span className="t-legend">{title}</span>
        <span className="ds-row">
          {status ? <Lamp status={status} size="sm" /> : null}
          {copy ? <CopyKey text={code} what={what} /> : null}
        </span>
      </div>
      <pre ref={pre}>
        {lines.map((l, i) => {
          const cont = i > 0 && lines[i - 1].trimEnd().endsWith('\\')
          const comment = !cont && l.trimStart().startsWith('#')
          return (
            <span key={i}>
              {i ? '\n' : null}
              {comment ? (
                <span className="c">{l}</span>
              ) : (
                <>
                  {!cont && prompt ? <span className="p">{prompt}</span> : null}
                  {l}
                </>
              )}
            </span>
          )
        })}
        {output ? (
          <>
            {'\n'}
            <span className="c">{output}</span>
          </>
        ) : null}
      </pre>
    </div>
  )
}

export interface CurlBlockProps {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Full URL, e.g. https://meatspace.sh/v1/reports/lerobot__svla_so101_pickplace */
  url: string
  /** Path shown in the header; defaults to the URL path. */
  path?: string
  headers?: string[]
  /** Request body (JSON text), sent with -d. */
  data?: string
  /** Pipe stage, e.g. "jq .headline". */
  pipe?: string
  status?: LampWord
  output?: ReactNode
  what?: string
  className?: string
}

/**
 * C-07 Curl block: a CodeBlock whose command is built from method + URL, titled `shell · METHOD path`.
 *
 * @example <CurlBlock url="https://meatspace.sh/v1/reports/x" pipe="jq .headline" status="PREVIEW" />
 */
export function CurlBlock({ method = 'GET', url, path, headers, data, pipe, status, output, what, className }: CurlBlockProps) {
  const p = path ?? new URL(url).pathname
  return (
    <CodeBlock
      className={className}
      title={
        <>
          shell · <b>{`${method} ${p}`}</b>
        </>
      }
      status={status}
      code={curlCommand({ method, url, headers, data, pipe })}
      output={output}
      what={what ?? `${method} ${p} command`}
    />
  )
}

/**
 * One-line command strip (the proof panel's `$ curl … | jq .headline`): muted unselectable prompt, scrolls
 * sideways inside its own box and becomes focusable and named when it overflows.
 */
export function CommandLine({ command, prompt = '$ ', label = 'Command' }: { command: string; prompt?: string; label?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useOverflowA11y(ref, `${label}, scrolls sideways`)
  return (
    <div ref={ref} className="cmdline">
      {prompt ? <span className="p">{prompt}</span> : null}
      {command}
    </div>
  )
}
