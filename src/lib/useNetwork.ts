// STUB — replaced by the console/stream implementation. Keep the exported signature.
import { seedSnapshot } from '../../shared/nodes'
import type { NetworkSnapshot } from '../../shared/types'

export type ConnectionState = 'connecting' | 'live' | 'reconnecting' | 'offline'

export interface NetworkState {
  snapshot: NetworkSnapshot
  connection: ConnectionState
}

const SEED = seedSnapshot()

export function useNetwork(): NetworkState {
  return { snapshot: SEED, connection: 'connecting' }
}
