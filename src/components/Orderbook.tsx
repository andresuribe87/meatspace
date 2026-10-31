// STUB — Zone C. Keep the exported props signature.
import type { HardwareNode } from '../../shared/types'

export interface OrderbookProps {
  nodes: HardwareNode[]
  /** node_id currently loaded in the dispatch console (highlight that row). */
  targetNodeId: string | null
  /** [ TASK NODE ] handler. */
  onTaskNode: (node: HardwareNode) => void
}

export function Orderbook(_props: OrderbookProps) {
  return <section>orderbook</section>
}
