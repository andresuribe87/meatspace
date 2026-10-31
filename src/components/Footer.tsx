// STUB. Keep the exported props signature.
import type { WaitlistKind } from '../../shared/types'

export interface FooterProps {
  onNavigate: (to: string) => void
  onOpenPanel: (kind: WaitlistKind) => void
}

export function Footer(_props: FooterProps) {
  return <footer>footer</footer>
}
