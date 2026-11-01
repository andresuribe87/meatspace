import { useEffect, useId, useRef, type ReactNode } from 'react'

import { Key } from './Key'

export interface DialogProps {
  open: boolean
  /** Called on Esc, the close key, a Cancel submit or a backdrop click. Set open=false in response. */
  onClose: () => void
  /** Sticky header legend, e.g. "request // real-robot pilot". */
  title: ReactNode
  /** Endpoint hint in the footer, e.g. "POST /v1/pilots" (printed as "-> POST /v1/pilots"). */
  endpoint?: string
  /** Footer keys: ghost Cancel, then the one primary. */
  actions?: ReactNode
  /** Close when the backdrop is clicked. Default true. */
  closeOnBackdrop?: boolean
  children: ReactNode
  className?: string
}

/**
 * C-11 Dialog: native <dialog> with showModal(), an 84% carbon scrim (no blur), sticky header with a
 * ghost [ Esc ] key, body and a footer with the endpoint hint and actions. Esc closes and focus
 * returns to the opener. Copy promises only what one person can keep; nothing is charged.
 *
 * @example <Dialog open={open} onClose={() => setOpen(false)} title="request // real-robot pilot" endpoint="POST /v1/pilots" actions={…}>…</Dialog>
 */
export function Dialog({ open, onClose, title, endpoint, actions, closeOnBackdrop = true, children, className = '' }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      d.showModal()
    } else if (!open && d.open) {
      d.close()
    }
  }, [open])

  useEffect(() => {
    const d = ref.current
    if (!d) return
    const onNativeClose = () => {
      const el = opener.current
      opener.current = null
      if (el?.isConnected) el.focus({ preventScroll: true })
      onCloseRef.current()
    }
    d.addEventListener('close', onNativeClose)
    return () => d.removeEventListener('close', onNativeClose)
  }, [])

  return (
    <dialog
      ref={ref}
      className={`dlg ${className}`}
      aria-labelledby={titleId}
      onClick={(e) => {
        // A click on the ::backdrop is dispatched to the dialog itself, outside its box.
        if (!closeOnBackdrop || e.target !== e.currentTarget) return
        const r = e.currentTarget.getBoundingClientRect()
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.currentTarget.close()
      }}
    >
      <div className="dlg-h">
        <h2 id={titleId} className="t-legend" style={{ color: 'var(--text)' }}>
          {title}
        </h2>
        <Key variant="ghost" size="sm" aria-label="Close" onClick={() => ref.current?.close()}>
          Esc
        </Key>
      </div>
      <div className="dlg-b ds-stack">{children}</div>
      {endpoint || actions ? (
        <div className="dlg-f">
          <span className="t-legend">{endpoint ? `-> ${endpoint}` : ''}</span>
          <span className="ds-row">{actions}</span>
        </div>
      ) : null}
    </dialog>
  )
}
