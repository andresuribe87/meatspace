/**
 * Waitlist panels for [ CONNECT HARDWARE (meatspaced) ] and [ API KEYS ]: a native modal <dialog> kept in sync with `kind`.
 * The native dialog provides the top layer, inert background, Esc handling and focus return to the opener.
 * The body only exists while open, so closing the panel resets the form.
 */
import { ChevronDown, X } from 'lucide-react'
import { Fragment, useEffect, useId, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from 'react'

import type { FleetSize, HardwareProtocol, WaitlistKind, WaitlistRequest } from '../../shared/types'
import { submitWaitlist } from '../lib/waitlistClient'
import { InstallSnippet } from './InstallSnippet'
import { BracketButton } from './ui'

export interface WaitlistPanelProps {
  /** null = closed. 'hardware' = [ CONNECT HARDWARE (meatspaced) ], 'api_keys' = [ API KEYS ]. */
  kind: WaitlistKind | null
  onClose: () => void
}

const TITLES: Record<WaitlistKind, string> = {
  hardware: 'meatspaced(8) // CONNECT HARDWARE',
  api_keys: 'API KEYS // ALPHA ACCESS',
}

const PROTOCOLS: readonly { value: HardwareProtocol; label: string }[] = [
  { value: 'mavlink', label: 'MAVLink v2' },
  { value: 'ros2', label: 'ROS 2' },
  { value: 'vda5050', label: 'VDA 5050' },
  { value: 'opcua', label: 'OPC UA' },
]

const FLEET_SIZES: readonly FleetSize[] = ['1', '2-10', '11-50', '51-250', '250+']

const HANDLE_MAX = 64
const DETAIL_MAX = 500
const EMAIL_MAX = 254

/** True when the pointer event landed on the ::backdrop (dispatched to the dialog itself, outside its box). */
function onBackdrop(e: MouseEvent<HTMLDialogElement>): boolean {
  if (e.target !== e.currentTarget) return false
  const r = e.currentTarget.getBoundingClientRect()
  return e.clientX < r.left || e.clientX >= r.right || e.clientY < r.top || e.clientY >= r.bottom
}

export function WaitlistPanel({ kind, onClose }: WaitlistPanelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const openKind = useRef<WaitlistKind | null>(null)
  const pressedBackdrop = useRef(false)
  const titleId = useId()

  useEffect(() => {
    openKind.current = kind
    const d = dialogRef.current
    if (!d) return
    if (kind) {
      if (!d.open) d.showModal()
      // Fine pointers go straight to the email field. On touch, focus goes to the first control ([ X ]) so the
      // on-screen keyboard doesn't cover the copy; this also re-homes focus when the kind switches while open.
      if (window.matchMedia('(pointer: fine)').matches) d.querySelector<HTMLInputElement>('input[name="email"]')?.focus()
      else if (!d.contains(document.activeElement)) d.querySelector<HTMLButtonElement>('button')?.focus()
    } else if (d.open) {
      d.close()
    }
  }, [kind])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(e) => {
        // Esc: let App own the state (it also clears the #connect / #api-keys hash); the effect then closes the dialog.
        e.preventDefault()
        onClose()
      }}
      onClose={(e) => {
        // Closed natively (e.g. a second Esc the browser refuses to cancel): sync App. The event is async, so
        // ignore it when the dialog was reopened in the meantime.
        if (openKind.current !== null && !e.currentTarget.open) onClose()
      }}
      onPointerDown={(e) => {
        pressedBackdrop.current = onBackdrop(e)
      }}
      onClick={(e) => {
        // Require press and release on the backdrop, so a text selection dragged out of an input doesn't close the panel.
        if (pressedBackdrop.current && onBackdrop(e)) onClose()
        pressedBackdrop.current = false
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto overscroll-contain border border-line bg-panel p-0 text-fg backdrop:bg-bg/80"
    >
      {kind ? <WaitlistBody key={kind} kind={kind} titleId={titleId} onClose={onClose} /> : null}
    </dialog>
  )
}

/* ----------------------------------------------------------------------------
 * Body
 * ------------------------------------------------------------------------- */

const INPUT =
  'block w-full border border-line bg-bg px-2 py-1.5 text-base text-fg placeholder:text-muted focus:border-emerald focus-visible:outline-hidden aria-invalid:border-amber sm:text-xs'

const Code = ({ children }: { children: string }) => <code className="text-emerald">{children}</code>

interface SpecRow {
  term: string
  desc: ReactNode
}

function SpecList({ rows }: { rows: readonly SpecRow[] }) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-xs leading-relaxed">
      {rows.map(({ term, desc }) => (
        <Fragment key={term}>
          <dt className="text-muted">{term}</dt>
          <dd className="text-fg/90">{desc}</dd>
        </Fragment>
      ))}
    </dl>
  )
}

const HARDWARE_SPEC: readonly SpecRow[] = [
  {
    term: 'NAME',
    desc: (
      <>
        <Code>meatspaced</Code> - edge daemon for meatspace.sh hardware nodes
      </>
    ),
  },
  {
    term: 'DOES',
    desc: (
      <ul>
        {[
          'registers an idle ROS 2 / MAVLink / VDA 5050 / OPC UA node with the clearinghouse',
          'enforces firmware safety envelopes locally, before motor spin-up',
          'signs telemetry with the node TPM',
        ].map((line) => (
          <li key={line} className="pl-[2ch] -indent-[2ch]">
            <span aria-hidden="true" className="text-muted">
              -{' '}
            </span>
            {line}
          </li>
        ))}
      </ul>
    ),
  },
  { term: 'STATUS', desc: <span className="text-amber">v0.1 is not yet released; join the operator queue</span> },
]

const API_KEYS_SPEC: readonly SpecRow[] = [
  { term: 'STATUS', desc: <span className="text-amber">keys are issued to the alpha cohort</span> },
  {
    term: 'TODAY',
    desc: (
      <>
        the sandbox API (<Code>POST /v1/dispatch</Code>) works without a key
      </>
    ),
  },
  { term: 'LIMITS', desc: '20 dispatches / min / IP; hardware, settlement and attestation are simulated' },
]

function Field({ id, label, hint, className = '', children }: { id: string; label: string; hint?: 'required' | 'optional'; className?: string; children: ReactNode }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-[11px] tracking-[0.14em] text-muted uppercase">
        {label}
        {/* "required" is already announced from the attribute. */}
        {hint ? (
          <span className="tracking-normal normal-case" aria-hidden={hint === 'required' ? 'true' : undefined}>
            {' '}
            ({hint})
          </span>
        ) : null}
      </label>
      {children}
    </div>
  )
}

function Select<T extends string>({
  id,
  name,
  value,
  options,
  onChange,
}: {
  id: string
  name: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="relative">
      <select id={id} name={name} value={value} onChange={(e) => onChange(e.target.value as T)} className={`${INPUT} appearance-none pr-7`}>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-bg text-fg">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={12} strokeWidth={2} aria-hidden="true" className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-muted" />
    </div>
  )
}

interface FormError {
  code: string
  message: string
  /** True when the error is about the email field (focus + aria-invalid). */
  email: boolean
}

function WaitlistBody({ kind, titleId, onClose }: { kind: WaitlistKind; titleId: string; onClose: () => void }) {
  const hardware = kind === 'hardware'
  const uid = useId()
  const ids = {
    email: `${uid}-email`,
    handle: `${uid}-handle`,
    protocol: `${uid}-protocol`,
    fleet: `${uid}-fleet`,
    detail: `${uid}-detail`,
    detailCount: `${uid}-detail-count`,
    website: `${uid}-website`,
    feedback: `${uid}-feedback`,
  }

  const [email, setEmail] = useState('')
  const [handle, setHandle] = useState('')
  const [protocol, setProtocol] = useState<HardwareProtocol>('mavlink')
  const [fleet, setFleet] = useState<FleetSize>('1')
  const [detail, setDetail] = useState('')
  const [website, setWebsite] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<FormError | null>(null)
  const [queued, setQueued] = useState<string | null>(null)

  const emailRef = useRef<HTMLInputElement>(null)
  const doneRef = useRef<HTMLDivElement>(null)

  // After success the form (and the focused submit button) is gone: put focus on [ CLOSE ].
  useEffect(() => {
    if (queued) doneRef.current?.querySelector('button')?.focus()
  }, [queued])

  const fail = (err: FormError) => {
    setError(err)
    if (err.email) emailRef.current?.focus()
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (pending) return
    const value = email.trim()
    const validity = emailRef.current?.validity
    if (value === '' || validity?.valueMissing) return fail({ code: 'ERR_SCHEMA', message: '$.email: expected non-empty string', email: true })
    if (validity?.typeMismatch) return fail({ code: 'ERR_SCHEMA', message: '$.email: expected an email address', email: true })

    const req: WaitlistRequest = { kind, email: value, website }
    if (handle.trim()) req.handle = handle.trim()
    if (detail.trim()) req.detail = detail.trim()
    if (hardware) {
      req.protocol = protocol
      req.fleet_size = fleet
    }

    setError(null)
    setPending(true)
    const res = await submitWaitlist(req)
    setPending(false)
    if (res.ok) setQueued(value.toLowerCase())
    else fail({ code: res.code, message: res.message, email: res.message.startsWith('$.email') })
  }

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 flex min-h-9 items-center justify-between gap-3 border-b border-line bg-panel py-1 pr-1 pl-3">
        <h2 id={titleId} className="text-[11px] font-medium tracking-[0.14em] text-fg">
          {TITLES[kind]}
        </h2>
        <BracketButton tone="muted" aria-label="Close" onClick={onClose}>
          <X size={14} strokeWidth={2} aria-hidden="true" className="block" />
        </BracketButton>
      </div>

      <div className="space-y-4 px-3 py-4 sm:px-4">
        <SpecList rows={hardware ? HARDWARE_SPEC : API_KEYS_SPEC} />

        {hardware ? <InstallSnippet /> : null}

        {queued ? null : (
          <form noValidate onSubmit={onSubmit} aria-busy={pending} aria-describedby={error ? ids.feedback : undefined} className="relative grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field id={ids.email} label="EMAIL" hint="required">
              <input
                ref={emailRef}
                id={ids.email}
                name="email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={EMAIL_MAX}
                placeholder={hardware ? 'ops@fleet.example' : 'dev@agent.example'}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error?.email) setError(null)
                }}
                aria-invalid={error?.email ? 'true' : undefined}
                aria-describedby={error?.email ? ids.feedback : undefined}
                className={INPUT}
              />
            </Field>
            <Field id={ids.handle} label="HANDLE / ORG" hint="optional">
              <input
                id={ids.handle}
                name="handle"
                type="text"
                autoComplete="organization"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={HANDLE_MAX}
                placeholder={hardware ? 'acme-robotics' : 'agent-lab'}
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className={INPUT}
              />
            </Field>

            {hardware ? (
              <>
                <Field id={ids.protocol} label="PROTOCOL">
                  <Select id={ids.protocol} name="protocol" value={protocol} options={PROTOCOLS} onChange={setProtocol} />
                </Field>
                <Field id={ids.fleet} label="FLEET SIZE">
                  <Select id={ids.fleet} name="fleet_size" value={fleet} options={FLEET_SIZES.map((f) => ({ value: f, label: f }))} onChange={setFleet} />
                </Field>
              </>
            ) : null}

            <Field id={ids.detail} label="DETAIL" hint="optional" className="sm:col-span-2">
              <textarea
                id={ids.detail}
                name="detail"
                rows={3}
                maxLength={DETAIL_MAX}
                placeholder={hardware ? 'chassis / sector / duty window' : 'agent framework / use case'}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                aria-describedby={ids.detailCount}
                className={`${INPUT} min-h-[4.75rem] resize-y leading-relaxed`}
              />
              <span id={ids.detailCount} className="self-end text-[11px] text-muted tabular">
                {detail.length}/{DETAIL_MAX}
                <span className="sr-only"> characters</span>
              </span>
            </Field>

            {/* Honeypot: invisible to people and assistive tech; bots that fill it are acknowledged but not stored. */}
            <div aria-hidden="true" className="sr-only">
              <label htmlFor={ids.website}>Website</label>
              <input id={ids.website} name="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 sm:col-span-2">
              <span className="text-[11px] text-muted">
                <span aria-hidden="true">→ </span>POST /v1/waitlist
              </span>
              <BracketButton type="submit" tone="primary" disabled={pending}>
                {hardware ? 'REGISTER INTEREST' : 'REQUEST KEY'}
              </BracketButton>
            </div>
          </form>
        )}

        <div id={ids.feedback} aria-live="polite" className="text-xs leading-relaxed wrap-anywhere empty:hidden">
          {queued ? (
            <p className="text-emerald">
              queued: {queued} // we will reach out before the v0.2 cohort opens
            </p>
          ) : pending ? (
            <p className="text-muted">sending...</p>
          ) : error ? (
            <p className="text-amber">
              error {error.code}: {error.message}
            </p>
          ) : null}
        </div>

        {queued ? (
          <div ref={doneRef}>
            <BracketButton onClick={onClose}>CLOSE</BracketButton>
          </div>
        ) : null}
      </div>
    </div>
  )
}
