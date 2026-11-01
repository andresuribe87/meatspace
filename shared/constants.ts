/**
 * Facts shared by the Worker, the SPA and the man page. wrangler.jsonc cannot import these, so
 * test/unit/config.test.ts asserts that its rate limiter bindings and package.json agree with them.
 */

export const VERSION = '0.2.0'

/** Canonical public origin (apex Workers Custom Domain). */
export const ORIGIN = 'https://meatspace.sh'
export const WS_ORIGIN = 'wss://meatspace.sh'
export const REPO_URL = 'https://github.com/andresuribe87/meatspace'
/**
 * Pinned commits for links into the repository, so a link cannot break when branches move (main does not hold
 * lab/ or the memo yet). Each sha is on GitHub; move LAB_REF forward once the v0.2 lab code is pushed.
 */
export const REPO_REFS = {
  /** First commit with lab/ and the published Twin Gap Reports. */
  lab: '2611ceaa14ab86a8529d920a85c73089842cbeee',
  /** The PMF memo, with the bar written down before the batch ran (its commit date is the proof). */
  memo: '05b56a18d1de75f087183f60c9c762b74c72afae',
  /** The SO-101 cell plan. */
  cellPlan: '78b9b7a0dd74cd8113834fdca893b5ac32d363bf',
} as const
export const LAB_URL = `${REPO_URL}/tree/${REPO_REFS.lab}/lab`
export const MEMO_URL = `${REPO_URL}/blob/${REPO_REFS.memo}/docs/strategy/2026-11-01-pmf-memo.md`
export const CELL_PLAN_URL = `${REPO_URL}/blob/${REPO_REFS.cellPlan}/docs/ops/so101-cell-plan.md`

/** A successful dispatch locks its node for this long. */
export const TASK_LOCK_MS = 30_000

/** Task locks one client (IPv4 address or IPv6 /64) may hold at once, so nobody can keep the whole orderbook TASKED. */
export const MAX_ACTIVE_LOCKS_PER_CLIENT = 2

/** NetworkState tick interval while anyone is watching (or a node is locked / charging). */
export const TICK_MS = 2_000

/** Workers Rate Limiting bindings (wrangler.jsonc), per client (IPv4 address or IPv6 /64) per 60 s window. */
export const RATE_LIMITS = {
  dispatchPerMin: 20,
  waitlistPerMin: 5,
  retryAfterS: 60,
} as const

/** POST /v1/waitlist body cap (dispatch uses MAX_BODY_BYTES in shared/dispatch.ts). */
export const WAITLIST_MAX_BYTES = 4 * 1024

/** RTL reserve (%) the canonical aerial payload requests ([ TASK NODE ] / default console payload). */
export const CANONICAL_RTL_RESERVE_PCT = 25
