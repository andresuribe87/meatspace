// STUB. Keep the exported props signature.
import type { WaitlistKind } from '../../shared/types'

export interface WaitlistPanelProps {
  /** null = closed. 'hardware' = [ CONNECT HARDWARE (meatspaced) ], 'api_keys' = [ API KEYS ]. */
  kind: WaitlistKind | null
  onClose: () => void
}

export function WaitlistPanel(_props: WaitlistPanelProps) {
  return null
}
