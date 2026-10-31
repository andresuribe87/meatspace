// STUB — Zone A. Keep the exported props signature.
import type { NetworkStats, WaitlistKind } from '../../shared/types'
import type { Route } from '../lib/router'
import type { ConnectionState } from '../lib/useNetwork'

export interface StatusBarProps {
  stats: NetworkStats
  connection: ConnectionState
  route: Route
  onNavigate: (to: string) => void
  onOpenPanel: (kind: WaitlistKind) => void
}

export function StatusBar(_props: StatusBarProps) {
  return <header>meatspace.sh // v0.1.4-alpha</header>
}
