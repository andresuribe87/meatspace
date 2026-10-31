// STUB — Zone B right column. Keep the exported props signature.
import type { PrimitiveId } from '../../shared/types'

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

export function DispatchConsole(_props: DispatchConsoleProps) {
  return <section>console</section>
}
