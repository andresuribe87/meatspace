/**
 * Facts shared by the Worker, the SPA and the man page. wrangler.jsonc cannot import these, so
 * test/unit/config.test.ts asserts that its rate limiter bindings and package.json agree with them.
 */

export const VERSION = '0.1.4-alpha'

/** Canonical public origin (apex Workers Custom Domain). */
export const ORIGIN = 'https://meatspace.sh'
export const WS_ORIGIN = 'wss://meatspace.sh'
export const REPO_URL = 'https://github.com/andresuribe87/meatspace'

/** A successful dispatch locks its node for this long. */
export const TASK_LOCK_MS = 30_000

/** NetworkState tick interval while anyone is watching (or a node is locked / charging). */
export const TICK_MS = 2_000

/** Workers Rate Limiting bindings (wrangler.jsonc), per client IP per 60 s window. */
export const RATE_LIMITS = {
  dispatchPerMin: 20,
  waitlistPerMin: 5,
  retryAfterS: 60,
} as const

/** POST /v1/waitlist body cap (dispatch uses MAX_BODY_BYTES in shared/dispatch.ts). */
export const WAITLIST_MAX_BYTES = 4 * 1024
