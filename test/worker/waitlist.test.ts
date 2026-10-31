import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

import type { WaitlistRequest } from '../../shared/types'
import { expectApiError, ORIGIN, postJson, randomIp } from './helpers'

interface Row {
  kind: string
  email: string
  handle: string | null
  detail: string | null
  protocol: string | null
  fleet_size: string | null
  created_at: string
}

const signup = (body: unknown, { origin = ORIGIN, ip = randomIp() }: { origin?: string | null; ip?: string } = {}) =>
  postJson('/v1/waitlist', body, { ip, headers: origin ? { origin } : {} })

const rows = async (email: string) =>
  (await env.DB.prepare('SELECT * FROM waitlist WHERE email = ? ORDER BY id').bind(email).all<Row>()).results

async function expectOk(res: Response, kind: string) {
  expect(res.status).toBe(200)
  expect(res.headers.get('cache-control')).toBe('no-store')
  expect(res.headers.get('access-control-allow-origin')).toBeNull()
  expect(await res.json()).toEqual({ ok: true, kind })
}

describe('POST /v1/waitlist', () => {
  it('stores an API key sign-up, normalising the email', async () => {
    await expectOk(await signup({ kind: 'api_keys', email: '  Ada@Example.COM ', handle: ' ada ', detail: 'agent fleet' }), 'api_keys')
    const [row, ...rest] = await rows('ada@example.com')
    expect(rest).toEqual([])
    expect(row).toMatchObject({ kind: 'api_keys', email: 'ada@example.com', handle: 'ada', detail: 'agent fleet', protocol: null, fleet_size: null })
    expect(row.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('stores a hardware sign-up with protocol and fleet size', async () => {
    const body: WaitlistRequest = { kind: 'hardware', email: 'ops@fleet.example', protocol: 'ros2', fleet_size: '11-50' }
    await expectOk(await signup(body), 'hardware')
    expect(await rows('ops@fleet.example')).toMatchObject([{ kind: 'hardware', protocol: 'ros2', fleet_size: '11-50', handle: null }])
  })

  it('accepts requests without an Origin header (curl)', async () => {
    await expectOk(await signup({ kind: 'api_keys', email: 'cli@example.com' }, { origin: null }), 'api_keys')
  })

  it('a duplicate is still 200 and stays a single row', async () => {
    const body = { kind: 'api_keys', email: 'dup@example.com' }
    await expectOk(await signup(body), 'api_keys')
    await expectOk(await signup({ ...body, email: 'DUP@example.com', handle: 'second' }), 'api_keys')
    expect(await rows('dup@example.com')).toMatchObject([{ handle: null }])
  })

  it('the same email may join both lists', async () => {
    await expectOk(await signup({ kind: 'api_keys', email: 'both@example.com' }), 'api_keys')
    await expectOk(await signup({ kind: 'hardware', email: 'both@example.com' }), 'hardware')
    expect((await rows('both@example.com')).map((r) => r.kind)).toEqual(['api_keys', 'hardware'])
  })

  it('honeypot: answers 200 but stores nothing', async () => {
    await expectOk(await signup({ kind: 'hardware', email: 'bot@spam.example', website: 'https://spam.example' }), 'hardware')
    expect(await rows('bot@spam.example')).toEqual([])
  })

  it.each([['not-an-email'], ['a@b'], ['a b@c.de'], ['a@@b.co'], ['a@b..co'], ['@b.co'], [''], [42], [`${'x'.repeat(250)}@b.co`]])(
    'rejects email %j with 400 at $.email',
    async (email) => {
      const err = await expectApiError(await signup({ kind: 'api_keys', email }), 400, 'ERR_SCHEMA')
      expect(err.path).toBe('$.email')
    },
  )

  it.each([
    ['unknown kind', { kind: 'investor', email: 'a@b.co' }, '$.kind'],
    ['protocol on api_keys', { kind: 'api_keys', email: 'a@b.co', protocol: 'mavlink' }, '$.protocol'],
    ['fleet_size on api_keys', { kind: 'api_keys', email: 'a@b.co', fleet_size: '1' }, '$.fleet_size'],
    ['unknown protocol', { kind: 'hardware', email: 'a@b.co', protocol: 'canbus' }, '$.protocol'],
    ['unknown fleet size', { kind: 'hardware', email: 'a@b.co', fleet_size: '9000' }, '$.fleet_size'],
    ['long handle', { kind: 'api_keys', email: 'a@b.co', handle: 'h'.repeat(65) }, '$.handle'],
    ['long detail', { kind: 'api_keys', email: 'a@b.co', detail: 'd'.repeat(501) }, '$.detail'],
    ['non-string handle', { kind: 'api_keys', email: 'a@b.co', handle: 7 }, '$.handle'],
    ['array body', [], '$'],
  ])('rejects %s with 400 at %s', async (_, body, path) => {
    const err = await expectApiError(await signup(body), 400, 'ERR_SCHEMA')
    expect(err.path).toBe(path)
    expect(err.message.startsWith(`${path}: `)).toBe(true)
  })

  it('invalid JSON -> 400 ERR_INVALID_JSON', async () => {
    await expectApiError(await signup('{"kind":'), 400, 'ERR_INVALID_JSON')
  })

  it('body over 4 KB -> 413', async () => {
    await expectApiError(await signup({ kind: 'api_keys', email: 'big@example.com', detail: 'd'.repeat(5000) }), 413, 'ERR_PAYLOAD_TOO_LARGE')
  })

  it('cross-origin -> 403 ERR_FORBIDDEN and nothing stored', async () => {
    const res = await signup({ kind: 'api_keys', email: 'csrf@example.com' }, { origin: 'https://evil.example' })
    await expectApiError(res, 403, 'ERR_FORBIDDEN')
    expect(await rows('csrf@example.com')).toEqual([])
  })

  it('rate limit: the 6th request in a minute from one IP -> 429', async () => {
    const ip = randomIp()
    for (let i = 0; i < 5; i++) await expectOk(await signup({ kind: 'api_keys', email: `rl${i}@example.com` }, { ip }), 'api_keys')
    const res = await signup({ kind: 'api_keys', email: 'rl5@example.com' }, { ip })
    expect(res.headers.get('retry-after')).toBe('60')
    await expectApiError(res, 429, 'ERR_RATE_LIMITED')
  })
})
