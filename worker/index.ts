// STUB — replaced by the Worker implementation.
import { DurableObject } from 'cloudflare:workers'

export class NetworkState extends DurableObject<Env> {}

export default {
  fetch() {
    return new Response('stub', { status: 501 })
  },
} satisfies ExportedHandler<Env>
