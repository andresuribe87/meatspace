import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

interface FieldCtx {
  id: string
  describedBy: string | undefined
  invalid: boolean
  disabled: boolean
  required: boolean
}

const Ctx = createContext<FieldCtx | null>(null)

export interface FieldProps {
  /** Caps legend label above the control. Never use placeholder text as the label. */
  label: ReactNode
  /** Shows a muted "required" hint and sets `required` on the control. */
  required?: boolean
  /** 12px muted help line. */
  help?: ReactNode
  /** Error text that says what to do. Turns the edge amber, prefixes ▲ and sets aria-invalid + aria-describedby. */
  error?: ReactNode
  /** Unit cell before the value (`hf://`, `$`). The unit is part of the control. */
  prefix?: ReactNode
  /** Unit cell after the value (`USD cap`, `trials`). Read out as part of the description. */
  suffix?: ReactNode
  /** Dashed dim edge. */
  disabled?: boolean
  /** Span both columns of a FieldGrid. */
  full?: boolean
  id?: string
  className?: string
  /** One control: <Input>, <Select> or <Textarea>. */
  children: ReactNode
}

/**
 * C-05 Field: label above, 40px control on carbon with a 1px edge border, unit cells, help or error below.
 *
 * @example <Field label="trials" suffix="trials" error={n < 50 ? 'below n = 50 the result is labelled a smoke test' : undefined}><Input inputMode="numeric" value={n} onChange={…} /></Field>
 */
export function Field({ label, required, help, error, prefix, suffix, disabled, full, id, className = '', children }: FieldProps) {
  const auto = useId()
  const cid = id ?? `f${auto}`
  const helpId = `${cid}-help`
  const sufId = `${cid}-suf`
  const describedBy = [error || help ? helpId : null, suffix ? sufId : null].filter(Boolean).join(' ') || undefined
  const only = Children.toArray(children)[0]
  const area = isValidElement(only) && only.type === Textarea
  return (
    <Ctx.Provider value={{ id: cid, describedBy, invalid: !!error, disabled: !!disabled, required: !!required }}>
      <div className={`field ${full ? 'full' : ''} ${className}`}>
        <label htmlFor={cid}>
          {label}
          {required ? <span className="req">required</span> : null}
        </label>
        <div className={['ctl', area ? 'ctl--area' : '', error ? 'is-error' : '', disabled ? 'is-disabled' : ''].filter(Boolean).join(' ')}>
          {prefix ? (
            <span className="pre" aria-hidden="true">
              {prefix}
            </span>
          ) : null}
          {children}
          {suffix ? (
            <span className="suf" id={sufId}>
              {suffix}
            </span>
          ) : null}
        </div>
        {error ? (
          <span className="help err" id={helpId}>
            {error}
          </span>
        ) : help ? (
          <span className="help" id={helpId}>
            {help}
          </span>
        ) : null}
      </div>
    </Ctx.Provider>
  )
}

function useField() {
  const f = useContext(Ctx)
  if (!f) throw new Error('Input, Select and Textarea must sit inside a <Field>.')
  return f
}

/** Text input bound to its Field (id, aria-describedby, aria-invalid, disabled, required). */
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const f = useField()
  return (
    <input
      id={f.id}
      aria-describedby={f.describedBy}
      aria-invalid={f.invalid || undefined}
      disabled={f.disabled}
      required={f.required}
      {...props}
    />
  )
}

/** Native select with a drawn chevron and a 34px right pad with ellipsis. */
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const f = useField()
  return (
    <select
      id={f.id}
      aria-describedby={f.describedBy}
      aria-invalid={f.invalid || undefined}
      disabled={f.disabled}
      required={f.required}
      {...props}
    />
  )
}

/** Multi-line text, same edge and focus as the other controls. */
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const f = useField()
  return (
    <textarea
      id={f.id}
      aria-describedby={f.describedBy}
      aria-invalid={f.invalid || undefined}
      disabled={f.disabled}
      required={f.required}
      rows={4}
      {...props}
    />
  )
}

export interface CheckProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  type?: 'checkbox' | 'radio'
  label: ReactNode
}

/** 16px square LED checkbox or radio that fills fg when on. The label wraps the input. */
export function Check({ type = 'checkbox', label, className = '', ...rest }: CheckProps) {
  return (
    <label className={`check ${className}`}>
      <input type={type} {...rest} />
      {label}
    </label>
  )
}

/** Two-column field grid (one column under a 560px container). */
export function FieldGrid({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className="cq">
      <div className={`field-grid ${className}`}>{children}</div>
    </div>
  )
}
