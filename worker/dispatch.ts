import { MAX_BODY_BYTES, parseDispatchPayload } from '../shared/dispatch'
import type { DispatchEvent } from '../shared/types'
import { ApiError, type AppContext, clientKey, rateLimit, readJson } from './http'

/**
 * POST /v1/dispatch. Pre-stream failures are plain JSON errors; once the Durable Object has run the
 * state machine, the outcome streams as NDJSON with each event released at its handoff offset.
 */
export async function handleDispatch(c: AppContext): Promise<Response> {
  const startedAt = Date.now()
  await rateLimit(c.env.DISPATCH_LIMITER, c.req.raw)
  const parsed = parseDispatchPayload(await readJson(c.req.raw, MAX_BODY_BYTES))
  if (!parsed.ok) throw new ApiError(400, parsed.code, parsed.message, { path: parsed.path })

  const result = await c.env.NETWORK.getByName('global').dispatch(parsed.payload, await clientKey(c.req.raw))
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  c.executionCtx.waitUntil(writeTimed(writable, result.events, startedAt))

  const headers = new Headers({ 'content-type': 'application/x-ndjson; charset=utf-8' })
  if (result.taskId) headers.set('x-meatspace-task-id', result.taskId)
  if (result.retryAfterS) headers.set('retry-after', String(result.retryAfterS))
  return new Response(readable, { status: result.httpStatus, headers })
}

/** Writes one JSON line per event at `startedAt + t_ms`, then closes the stream. */
async function writeTimed(writable: WritableStream<Uint8Array>, events: readonly DispatchEvent[], startedAt: number): Promise<void> {
  const writer = writable.getWriter()
  const encoder = new TextEncoder()
  try {
    for (const event of events) {
      const delay = startedAt + event.t_ms - Date.now()
      if (delay > 0) await scheduler.wait(delay)
      await writer.write(encoder.encode(`${JSON.stringify(event)}\n`))
    }
    await writer.close()
  } catch {
    // The client disconnected mid-stream; the task is already locked and there is no one left to tell.
  }
}
