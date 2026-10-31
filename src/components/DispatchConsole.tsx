/**
 * Zone B, right column: interactive curl / JSON dispatch console.
 *
 * Tabs pick the primitive; the request view shows the exact curl command that [ COPY CURL ] copies
 * (body syntax-highlighted, editable as raw JSON); [ EXECUTE CALL ] POSTs the draft to the real
 * /v1/dispatch and renders the NDJSON state machine as it streams in at the server's offsets.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'

import { formatOffset, formatUsd } from '../../shared/format'
import { PRIMITIVE_IDS, PRIMITIVES } from '../../shared/primitives'
import type { DispatchEvent, DispatchReceipt, PrimitiveId, StepStatus } from '../../shared/types'
import { executeDispatch } from '../lib/dispatchClient'
import { curlCommand, PUBLIC_ORIGIN } from '../lib/payload'
import { useNetwork } from '../lib/useNetwork'
import { JsonView } from './JsonView'
import { BracketButton, CopyButton, Panel, StatusTag } from './ui'

export interface DispatchConsoleProps {
  /** Active tab. */
  primitive: PrimitiveId
  onPrimitiveChange: (p: PrimitiveId) => void
  /** JSON request body text for the active tab (pretty-printed; may be user-edited and invalid). */
  draft: string
  onDraftChange: (text: string) => void
  /** Restore the active tab's default payload. */
  onReset: () => void
  /** Increments whenever [ TASK NODE ] (or reset) loads a payload: flash the payload, leave edit mode, clear stale output. */
  loadNonce: number
}

const TAB_ID = (p: PrimitiveId) => `dispatch-tab-${p}`
const PANEL_ID = 'dispatch-tabpanel'
const EDITOR_ID = 'dispatch-editor'
const TARGET_ID = 'dispatch-target'
const ENDPOINT = `${PUBLIC_ORIGIN}/v1/dispatch`

const OK_STATUSES: ReadonlySet<StepStatus> = new Set<StepStatus>(['PASS', 'ACCEPTED', 'DISPATCHED', 'SIGNED'])

type Run =
  | { phase: 'idle' }
  | {
      phase: 'running' | 'done' | 'aborted'
      id: number
      /** Epoch ms, for the echo timestamp. */
      startedAt: number
      events: DispatchEvent[]
      httpStatus: number | null
      elapsedMs: number | null
      /** Rejected client-side (invalid JSON): nothing was sent. */
      local: boolean
    }

const IDLE: Run = { phase: 'idle' }

type ParsedDraft = { ok: true; nodeId: string | null } | { ok: false; error: string }

function parseDraft(draft: string): ParsedDraft {
  try {
    const v: unknown = JSON.parse(draft)
    const nodeId = typeof v === 'object' && v !== null && typeof (v as { node_id?: unknown }).node_id === 'string' ? (v as { node_id: string }).node_id : null
    return { ok: true, nodeId }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/** Shell-escape exactly like curlCommand() so the highlighted view matches the copied text. */
const shellQuoteBody = (body: string) => body.replace(/'/g, `'\\''`)

function utcClock(ms: number): string {
  return `${new Date(ms).toISOString().slice(11, 19)}Z`
}

/* ----------------------------------------------------------------------------
 * Output rows
 * ------------------------------------------------------------------------- */

const ROW = 'grid grid-cols-[5ch_minmax(0,1fr)] gap-x-3'

function Offset({ ms }: { ms: number }) {
  return <span className="text-right whitespace-pre text-muted tabular">{formatOffset(ms).padStart(5, ' ')}</span>
}

const HASH_RE = /0x[0-9a-fA-F]{2,}(?:\.\.\.|…)[0-9a-fA-F]{2,}/

/** ATTEST copy with the short telemetry hash in emerald, e.g. "(0x9f8c...3a1b)". */
function AttestMessage({ message }: { message: string }) {
  const m = HASH_RE.exec(message)
  if (!m) return <>{message}</>
  return (
    <>
      {message.slice(0, m.index)}
      <span className="text-emerald">{m[0]}</span>
      {message.slice(m.index + m[0].length)}
    </>
  )
}

function StepRow({ ev }: { ev: Extract<DispatchEvent, { type: 'step' }> }) {
  const attest = ev.phase === 'ATTEST'
  return (
    <div className={ROW}>
      <Offset ms={ev.t_ms} />
      <span className="text-fg wrap-anywhere">
        {attest ? (
          <AttestMessage message={ev.message} />
        ) : (
          <>
            {ev.message} <b className={`font-bold ${OK_STATUSES.has(ev.status) ? 'text-emerald' : 'text-amber'}`}>{ev.status}</b>
          </>
        )}
      </span>
    </div>
  )
}

function ErrorRow({ ev }: { ev: Extract<DispatchEvent, { type: 'error' }> }) {
  return (
    <div className={ROW}>
      <span aria-hidden="true" />
      <span className="text-amber wrap-anywhere">
        error {ev.code}: {ev.message}
      </span>
    </div>
  )
}

function ReceiptBlock({ receipt }: { receipt: DispatchReceipt }) {
  return (
    <div className="mt-2">
      <div className="text-muted">── receipt ──</div>
      <pre className="mt-1 text-[11px] leading-[1.55] whitespace-pre-wrap wrap-anywhere">
        <code>
          <JsonView value={receipt} compact />
        </code>
      </pre>
    </div>
  )
}

function escrowLabel(r: DispatchReceipt): string {
  const n = Number(r.escrow_usdc)
  return Number.isFinite(n) ? formatUsd(Math.round(n * 100)) : `$${r.escrow_usdc}`
}

function Cursor({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`cursor-blink inline-block h-[1.15em] w-[0.6em] translate-y-[0.2em] bg-fg/70 ${className}`} />
}

function OutputLines({ run }: { run: Exclude<Run, { phase: 'idle' }> }) {
  const receipt = run.events.find((e): e is Extract<DispatchEvent, { type: 'receipt' }> => e.type === 'receipt')?.receipt
  const lastError = [...run.events].reverse().find((e): e is Extract<DispatchEvent, { type: 'error' }> => e.type === 'error')

  return (
    <>
      <div className="mb-1 flex flex-wrap justify-between gap-x-3 text-muted">
        <span className="wrap-anywhere">$ curl -sN -X POST {ENDPOINT}</span>
        <time dateTime={new Date(run.startedAt).toISOString()} className="tabular">
          [{utcClock(run.startedAt)}]
        </time>
      </div>

      {run.events.map((ev, i) =>
        ev.type === 'step' ? <StepRow key={i} ev={ev} /> : ev.type === 'error' ? <ErrorRow key={i} ev={ev} /> : <ReceiptBlock key={i} receipt={ev.receipt} />,
      )}

      {run.phase === 'running' ? (
        <div className={ROW}>
          <span aria-hidden="true" />
          <Cursor />
        </div>
      ) : null}

      {run.phase === 'aborted' ? <div className="mt-1 text-muted">^C aborted by client</div> : null}

      {run.phase === 'done' && run.local ? <div className={`${ROW} text-muted`}><span aria-hidden="true" />request not sent</div> : null}

      {run.phase === 'done' && !run.local ? (
        receipt && !lastError ? (
          <div className="mt-2 text-emerald wrap-anywhere">
            exit 0 · task {receipt.task_id} · escrow {escrowLabel(receipt)} USDC locked
          </div>
        ) : (
          <div className="mt-2 text-amber">exit {lastError && lastError.http_status > 0 ? lastError.http_status : run.httpStatus || 1}</div>
        )
      ) : null}
    </>
  )
}

function ResponseStatus({ run }: { run: Run }) {
  if (run.phase === 'idle') return <span className="text-muted">—</span>
  if (run.phase === 'running') return <span className="text-amber">streaming...</span>
  if (run.phase === 'aborted') return <span className="text-muted">aborted</span>
  if (run.local) return <span className="text-amber">not sent</span>
  const ms = run.elapsedMs !== null ? <span className="text-muted"> · {Math.round(run.elapsedMs)}ms</span> : null
  if (!run.httpStatus) return <span className="text-amber">no response{ms}</span>
  const ok = run.httpStatus >= 200 && run.httpStatus < 300 && !run.events.some((e) => e.type === 'error')
  return (
    <span className="tabular">
      <span className={ok ? 'text-emerald' : 'text-amber'}>HTTP {run.httpStatus}</span>
      {ms}
    </span>
  )
}

/* ----------------------------------------------------------------------------
 * Console
 * ------------------------------------------------------------------------- */

export function DispatchConsole({ primitive, onPrimitiveChange, draft, onDraftChange, onReset, loadNonce }: DispatchConsoleProps) {
  const { snapshot } = useNetwork()
  const [editing, setEditing] = useState(false)
  const [run, setRun] = useState<Run>(IDLE)
  const running = run.phase === 'running'

  const runSeq = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const tabRefs = useRef<Partial<Record<PrimitiveId, HTMLButtonElement | null>>>({})
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const execWrapRef = useRef<HTMLSpanElement>(null)
  const abortWrapRef = useRef<HTMLSpanElement>(null)
  const restoreFocusToExec = useRef(false)
  /** Nonce at mount: a payload loaded before this console mounted must not flash. */
  const [mountNonce] = useState(loadNonce)
  const prevKey = useRef({ primitive, loadNonce })

  const parsed = useMemo(() => parseDraft(draft), [draft])
  const node = parsed.ok && parsed.nodeId ? snapshot.nodes.find((n) => n.id === parsed.nodeId) : undefined

  /** Invalidate the current run (late events are ignored) and cancel its request. */
  const cancelRun = useCallback(() => {
    runSeq.current += 1
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const abort = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  // Tab switch or a freshly loaded payload: drop the in-flight call and stale output.
  useEffect(() => {
    const prev = prevKey.current
    if (prev.primitive === primitive && prev.loadNonce === loadNonce) return
    prevKey.current = { primitive, loadNonce }
    cancelRun()
    setRun(IDLE)
    if (prev.loadNonce !== loadNonce) setEditing(false)
  }, [primitive, loadNonce, cancelRun])

  // Unmount: never leave a request streaming into a dead component.
  useEffect(() => () => cancelRun(), [cancelRun])

  // Escape aborts while a call is streaming.
  useEffect(() => {
    if (!running) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        e.preventDefault()
        abort()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [running, abort])

  // Keep keyboard focus sensible while [ EXECUTE CALL ] is disabled: hop to [ ABORT ] and back.
  useEffect(() => {
    if (!restoreFocusToExec.current) return
    if (running) {
      abortWrapRef.current?.querySelector('button')?.focus()
    } else {
      const active = document.activeElement
      if (!active || active === document.body || abortWrapRef.current?.contains(active)) execWrapRef.current?.querySelector('button')?.focus()
      restoreFocusToExec.current = false
    }
  }, [running])

  // Entering edit mode focuses the editor.
  useEffect(() => {
    if (editing) editorRef.current?.focus()
  }, [editing])

  const execute = useCallback(async () => {
    if (abortRef.current) return
    const id = ++runSeq.current
    const startedAt = Date.now()
    const t0 = performance.now()
    restoreFocusToExec.current = !!execWrapRef.current?.contains(document.activeElement)
    logRef.current?.scrollTo({ top: 0 })

    try {
      JSON.parse(draft)
    } catch (e) {
      restoreFocusToExec.current = false
      setRun({
        phase: 'done',
        id,
        startedAt,
        events: [{ type: 'error', t_ms: 0, phase: null, code: 'ERR_INVALID_JSON', message: e instanceof Error ? e.message : String(e), http_status: 400 }],
        httpStatus: null,
        elapsedMs: null,
        local: true,
      })
      return
    }

    const ac = new AbortController()
    abortRef.current = ac
    setRun({ phase: 'running', id, startedAt, events: [], httpStatus: null, elapsedMs: null, local: false })
    const update = (fn: (r: Exclude<Run, { phase: 'idle' }>) => Run) => {
      if (runSeq.current !== id) return
      setRun((r) => (r.phase === 'idle' || r.id !== id ? r : fn(r)))
    }

    try {
      const { httpStatus } = await executeDispatch(draft, (ev) => update((r) => ({ ...r, events: [...r.events, ev] })), ac.signal)
      update((r) => ({ ...r, phase: 'done', httpStatus, elapsedMs: performance.now() - t0 }))
    } catch (e) {
      if (ac.signal.aborted) {
        update((r) => ({ ...r, phase: 'aborted', elapsedMs: performance.now() - t0 }))
      } else {
        const message = e instanceof Error ? e.message : String(e)
        update((r) => ({
          ...r,
          phase: 'done',
          elapsedMs: performance.now() - t0,
          events: [...r.events, { type: 'error', t_ms: 0, phase: null, code: 'ERR_INTERNAL', message: `client error: ${message}`, http_status: 0 }],
        }))
      }
    } finally {
      if (abortRef.current === ac) abortRef.current = null
    }
  }, [draft])

  const onTabKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const i = PRIMITIVE_IDS.indexOf(primitive)
    let next: number | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % PRIMITIVE_IDS.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + PRIMITIVE_IDS.length) % PRIMITIVE_IDS.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = PRIMITIVE_IDS.length - 1
    if (next === null) return
    e.preventDefault()
    const p = PRIMITIVE_IDS[next]
    onPrimitiveChange(p)
    const el = tabRefs.current[p]
    el?.focus()
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }

  const onEditorKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      void execute()
    } else if (e.key === 'Escape' && !running) {
      e.preventDefault()
      setEditing(false)
    }
  }

  const flash = loadNonce !== mountNonce

  return (
    <Panel
      title={
        <>
          API SANDBOX // <span className="normal-case">POST /v1/dispatch</span>
        </>
      }
      className="flex h-full min-w-0 flex-col"
      bodyClassName="flex min-h-0 flex-1 flex-col"
    >
      {/* Primitive tabs */}
      <div role="tablist" aria-label="Robotics primitives" onKeyDown={onTabKeyDown} className="flex overflow-x-auto border-b border-line md:grid md:grid-cols-3 md:overflow-visible">
        {PRIMITIVE_IDS.map((p) => {
          const active = p === primitive
          return (
            <button
              key={p}
              ref={(el) => {
                tabRefs.current[p] = el
              }}
              type="button"
              role="tab"
              id={TAB_ID(p)}
              aria-selected={active}
              aria-controls={PANEL_ID}
              tabIndex={active ? 0 : -1}
              onClick={() => onPrimitiveChange(p)}
              className={[
                'min-w-0 shrink-0 border-t-2 border-r border-line px-3 py-2 text-left transition-none last:border-r-0 focus-visible:-outline-offset-2',
                active ? 'border-t-emerald bg-panel text-emerald' : 'border-t-transparent bg-bg text-muted hover:text-fg',
              ].join(' ')}
            >
              <span className="block text-xs font-medium tracking-wide whitespace-nowrap">{p}</span>
              <span className="mt-1 hidden text-[11px] leading-snug text-muted md:block">{PRIMITIVES[p].summary}</span>
            </button>
          )
        })}
      </div>

      <div role="tabpanel" id={PANEL_ID} aria-labelledby={TAB_ID(primitive)} className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4">
        {/* REQUEST */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p id={TARGET_ID} className="min-w-0 text-[11px] text-muted">
              <span className="tracking-[0.14em]">REQUEST</span>
              <span aria-hidden="true"> · </span>
              {parsed.ok ? (
                <>
                  target: <span className="text-fg">{parsed.nodeId ?? '—'}</span>
                  {node ? (
                    <>
                      {' · '}
                      {node.iface}
                      {node.status === 'TASKED' ? (
                        <>
                          {' '}
                          <StatusTag tone="amber">TASKED</StatusTag>
                        </>
                      ) : null}
                    </>
                  ) : parsed.nodeId ? (
                    <span className="text-amber"> · not in orderbook</span>
                  ) : null}
                </>
              ) : (
                <span className="text-amber wrap-anywhere">invalid JSON: {parsed.error}</span>
              )}
            </p>
            <div className="-mr-2 flex flex-wrap items-center">
              <BracketButton tone="muted" onClick={() => setEditing((v) => !v)} aria-pressed={editing} aria-controls={editing ? EDITOR_ID : undefined}>
                {editing ? 'DONE' : 'EDIT JSON'}
              </BracketButton>
              <BracketButton tone="muted" onClick={onReset}>
                RESET
              </BracketButton>
              <CopyButton text={() => curlCommand(draft)} label="COPY CURL" ariaLabel="curl command" />
            </div>
          </div>

          <div key={flash ? `flash-${loadNonce}` : 'initial'} className={`h-64 border border-line bg-bg ${flash ? 'flash-emerald' : ''}`}>
            {editing ? (
              <textarea
                ref={editorRef}
                id={EDITOR_ID}
                value={draft}
                onChange={(e) => onDraftChange(e.target.value)}
                onKeyDown={onEditorKeyDown}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="off"
                aria-label="Request body (JSON)"
                aria-invalid={!parsed.ok}
                aria-describedby={TARGET_ID}
                className="block h-full w-full resize-none bg-bg p-3 text-xs leading-[1.6] whitespace-pre text-fg focus-visible:-outline-offset-1"
              />
            ) : (
              <pre tabIndex={0} aria-label="curl request" className="h-full overflow-auto p-3 text-xs leading-[1.6] focus-visible:-outline-offset-1">
                <code>
                  <span className="text-muted select-none">$ </span>
                  <span className="text-fg">curl -sN -X POST {ENDPOINT}</span>
                  <span className="text-muted"> \</span>
                  {'\n  '}
                  <span className="text-fg">-H </span>
                  <span className="text-emerald">'content-type: application/json'</span>
                  <span className="text-muted"> \</span>
                  {'\n  '}
                  <span className="text-fg">-d </span>
                  <span className="text-muted">'</span>
                  <JsonView text={shellQuoteBody(draft)} />
                  <span className="text-muted">'</span>
                </code>
              </pre>
            )}
          </div>
        </div>

        {/* EXECUTE */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span ref={execWrapRef} className="inline-flex">
            <BracketButton tone="primary" onClick={() => void execute()} disabled={running}>
              {running ? 'EXECUTING...' : 'EXECUTE CALL'}
            </BracketButton>
          </span>
          {running ? (
            <span ref={abortWrapRef} className="inline-flex">
              <BracketButton tone="amber" onClick={abort}>
                ABORT
              </BracketButton>
            </span>
          ) : null}
          <span className="ml-auto text-[11px] text-muted">{running ? 'esc to abort' : editing ? 'ctrl+enter to execute' : null}</span>
        </div>

        {/* RESPONSE */}
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="flex items-center justify-between gap-3 text-[11px]">
            <span className="tracking-[0.14em] text-muted">RESPONSE</span>
            <ResponseStatus run={run} />
          </div>
          <div className="relative min-h-72 flex-1 border border-line bg-bg">
            <div
              ref={logRef}
              role="log"
              aria-live="polite"
              aria-label="Dispatch output"
              tabIndex={0}
              className="absolute inset-0 overflow-y-auto p-3 text-xs leading-[1.6] focus-visible:-outline-offset-1"
            >
              {run.phase === 'idle' ? (
                <>
                  <p className="text-muted">press [ EXECUTE CALL ] to dispatch against the live sandbox</p>
                  <p className="mt-1 text-muted">
                    <span aria-hidden="true">$ </span>
                    <Cursor />
                  </p>
                </>
              ) : (
                <OutputLines run={run} />
              )}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  )
}
