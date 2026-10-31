import { WAITLIST_MAX_BYTES } from '../shared/constants'
import type { FleetSize, HardwareProtocol, WaitlistKind, WaitlistResponse } from '../shared/types'
import { ApiError, type AppContext, rateLimit, readJson } from './http'

const KINDS: readonly WaitlistKind[] = ['api_keys', 'hardware']
const PROTOCOLS: readonly HardwareProtocol[] = ['mavlink', 'ros2', 'vda5050', 'opcua']
const FLEET_SIZES: readonly FleetSize[] = ['1', '2-10', '11-50', '51-250', '250+']
/** One @, no whitespace, at least one dot in the domain and no empty labels. */
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

const INSERT_SQL = `INSERT INTO waitlist (kind, email, handle, detail, protocol, fleet_size, country)
VALUES (?, ?, ?, ?, ?, ?, ?)
ON CONFLICT (kind, email) DO NOTHING`

interface Signup {
  kind: WaitlistKind
  email: string
  handle: string | null
  detail: string | null
  protocol: HardwareProtocol | null
  fleet_size: FleetSize | null
  /** Honeypot tripped: acknowledge, never store. */
  bot: boolean
}

/** POST /v1/waitlist. Always answers 200 for valid input, so it never reveals whether an email is already listed. */
export async function handleWaitlist(c: AppContext): Promise<Response> {
  await rateLimit(c.env.WAITLIST_LIMITER, c.req.raw)
  const origin = c.req.header('origin')
  if (origin !== undefined && origin !== new URL(c.req.url).origin) {
    throw new ApiError(403, 'ERR_FORBIDDEN', 'cross-origin sign-ups are not accepted')
  }
  const s = parseSignup(await readJson(c.req.raw, WAITLIST_MAX_BYTES))
  if (!s.bot) {
    try {
      await c.env.DB.prepare(INSERT_SQL).bind(s.kind, s.email, s.handle, s.detail, s.protocol, s.fleet_size, country(c.req.raw)).run()
    } catch (err) {
      console.error('waitlist insert failed', err)
      throw new ApiError(500, 'ERR_INTERNAL', 'could not record the sign-up; try again later')
    }
  }
  return c.json({ ok: true, kind: s.kind } satisfies WaitlistResponse)
}

const invalid = (path: string, message: string) => new ApiError(400, 'ERR_SCHEMA', `${path}: ${message}`, { path })

/** Absent, null and blank optional fields all mean "not provided". */
const isBlank = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '')

function oneOf<T extends string>(v: unknown, path: string, allowed: readonly T[]): T {
  if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) {
    throw invalid(path, `expected one of ${allowed.map((a) => `"${a}"`).join(', ')}`)
  }
  return v as T
}

function optionalText(v: unknown, path: string, max: number): string | null {
  if (isBlank(v)) return null
  if (typeof v !== 'string') throw invalid(path, 'expected string')
  const t = v.trim()
  if (t.length > max) throw invalid(path, `must be at most ${max} chars`)
  return t
}

function hardwareOnly<T extends string>(o: Record<string, unknown>, key: string, kind: WaitlistKind, allowed: readonly T[]): T | null {
  const v = o[key]
  if (isBlank(v)) return null
  if (kind !== 'hardware') throw invalid(`$.${key}`, 'only allowed when kind is "hardware"')
  return oneOf(v, `$.${key}`, allowed)
}

function parseEmail(v: unknown): string {
  if (typeof v !== 'string' || v.trim() === '') throw invalid('$.email', 'expected non-empty string')
  const email = v.trim().toLowerCase()
  if (email.length > 254) throw invalid('$.email', 'must be at most 254 chars')
  if (!EMAIL_RE.test(email)) throw invalid('$.email', 'expected an email address')
  return email
}

function parseSignup(input: unknown): Signup {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) throw invalid('$', 'expected object')
  const o = input as Record<string, unknown>
  const kind = oneOf(o.kind, '$.kind', KINDS)
  return {
    kind,
    email: parseEmail(o.email),
    handle: optionalText(o.handle, '$.handle', 64),
    detail: optionalText(o.detail, '$.detail', 500),
    protocol: hardwareOnly(o, 'protocol', kind, PROTOCOLS),
    fleet_size: hardwareOnly(o, 'fleet_size', kind, FLEET_SIZES),
    bot: o.website !== undefined && o.website !== null && o.website !== '',
  }
}

function country(req: Request): string | null {
  const cf = req.cf as IncomingRequestCfProperties | undefined
  return typeof cf?.country === 'string' ? cf.country : null
}
