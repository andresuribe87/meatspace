import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

import { REQUEST_MAX_BYTES, type RequestReceipt } from '../../shared/api'
import { call, expectApiError, ORIGIN, postJson, randomIp } from './helpers'

interface Row {
  id: string
  kind: string
  email: string
  dataset: string | null
  payload: string
  source: string | null
  created_at: string
}

const send = (body: unknown, { origin = ORIGIN, ip = randomIp() }: { origin?: string | null; ip?: string } = {}) =>
  postJson('/v1/requests', body, { ip, headers: origin ? { origin } : {} })

const rows = async (email: string) => (await env.DB.prepare('SELECT * FROM requests WHERE email = ? ORDER BY created_at, id').bind(email).all<Row>()).results

async function receipt(res: Response): Promise<RequestReceipt> {
  const text = await res.text()
  expect(res.status, text).toBe(202)
  expect(res.headers.get('cache-control')).toBe('no-store')
  expect(res.headers.get('access-control-allow-origin')).toBeNull()
  return JSON.parse(text) as RequestReceipt
}

const GAP = { kind: 'gap_report', dataset: 'lerobot/svla_so101_pickplace', robot: 'so101', email: 'Ada@Lab.EDU' }

describe('POST /v1/requests: gap_report', () => {
  it('stores the request and answers 202 with an on_request receipt (run by hand, nothing charged)', async () => {
    const r = await receipt(await send({ ...GAP, own_data: true, visibility: 'public', publish: false, notes: '  is my shoulder lag real ', source: '/reports' }))
    expect(r).toMatchObject({ ok: true, kind: 'gap_report', status: 'on_request', run: 'manual', charged: false })
    expect(r.request_id).toMatch(/^gr_[0-9a-f]{16}$/)
    expect(r.message).toContain('by hand')
    const [row, ...rest] = await rows('ada@lab.edu')
    expect(rest).toEqual([])
    expect(row).toMatchObject({ id: r.request_id, kind: 'gap_report', email: 'ada@lab.edu', dataset: 'lerobot/svla_so101_pickplace', source: '/reports' })
    expect(JSON.parse(row.payload)).toEqual({
      dataset: 'lerobot/svla_so101_pickplace',
      robot: 'so101',
      own_data: true,
      visibility: 'public',
      publish: false,
      notes: 'is my shoulder lag real',
    })
    expect(row.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('a repeat (same email and dataset, any case) gets the same id and stays one row with the latest answers', async () => {
    const body = { ...GAP, email: 'dup@lab.edu' }
    const a = await receipt(await send({ ...body, notes: 'first' }))
    const b = await receipt(await send({ ...body, email: 'DUP@lab.edu', dataset: 'LeRobot/svla_so101_pickplace', notes: 'second' }))
    expect(b.request_id).toBe(a.request_id)
    const all = await rows('dup@lab.edu')
    expect(all).toHaveLength(1)
    expect(JSON.parse(all[0].payload).notes).toBe('second')
    // another dataset is another request
    const c = await receipt(await send({ ...body, dataset: 'IlyaGusev/so101_pick_gum' }))
    expect(c.request_id).not.toBe(a.request_id)
    expect(await rows('dup@lab.edu')).toHaveLength(2)
  })

  it('accepts exactly what src/lib/requestsClient.ts sends (empty honeypot, optional notes)', async () => {
    const r = await receipt(await send({ kind: 'gap_report', dataset: 'jccj/so100_block_in_cup', robot: 'so100', email: 'client@lab.edu', notes: 'hi', website: '' }))
    expect(r.status).toBe('on_request')
    expect(await rows('client@lab.edu')).toHaveLength(1)
  })

  it('accepts requests without an Origin header (curl)', async () => {
    await receipt(await send({ ...GAP, email: 'curl@lab.edu' }, { origin: null }))
    expect(await rows('curl@lab.edu')).toHaveLength(1)
  })
})

describe('POST /v1/requests: pilot and own_robot', () => {
  it('pilot -> waitlist, nothing charged', async () => {
    const r = await receipt(
      await send({
        kind: 'pilot',
        robot: 'so101',
        simulator: 'mujoco',
        policy_format: 'lerobot',
        checkpoint_ready: '2_weeks',
        budget: '1k_5k',
        deadline: '2027-01-15',
        deadline_reason: 'conference',
        trials: '200',
        agent: true,
        email: 'pilot@lab.edu',
        website: '',
      }),
    )
    expect(r).toMatchObject({ ok: true, kind: 'pilot', status: 'waitlist', charged: false })
    expect(r.request_id).toMatch(/^pl_[0-9a-f]{16}$/)
    expect(r).not.toHaveProperty('run')
    const [row] = await rows('pilot@lab.edu')
    expect(row.dataset).toBeNull()
    expect(JSON.parse(row.payload)).toMatchObject({ robot: 'so101', deadline: '2027-01-15', agent: true, trials: '200' })
  })

  it('own_robot -> planned; multi-selects are de-duplicated', async () => {
    const r = await receipt(
      await send({ kind: 'own_robot', robot: '2x Franka FR3', robot_count: '2-5', eval_cost: '2 people-days per checkpoint', pain: ['resets', 'labeling', 'resets'], call: true, email: 'owner@co.example' }),
    )
    expect(r).toMatchObject({ kind: 'own_robot', status: 'planned', charged: false })
    expect(r.request_id).toMatch(/^or_[0-9a-f]{16}$/)
    expect(JSON.parse((await rows('owner@co.example'))[0].payload)).toMatchObject({ pain: ['resets', 'labeling'], call: true })
  })
})

describe('POST /v1/requests: refusals', () => {
  it('honeypot: answers 202 like any request and stores nothing', async () => {
    const r = await receipt(await send({ ...GAP, email: 'bot@spam.example', website: 'http://spam.example' }))
    expect(r.ok).toBe(true)
    expect(await rows('bot@spam.example')).toEqual([])
  })

  it.each([
    [[], '$', 'expected object'],
    [{ email: 'a@b.co' }, '$.kind', 'expected one of "gap_report", "pilot", "own_robot"'],
    [{ ...GAP, kind: 'trial' }, '$.kind', 'expected one of'],
    [{ ...GAP, email: undefined }, '$.email', 'expected non-empty string'],
    [{ ...GAP, email: 'not-an-email' }, '$.email', 'expected an email address'],
    [{ ...GAP, dataset: 'svla_so101_pickplace' }, '$.dataset', 'expected owner/name'],
    [{ ...GAP, dataset: undefined }, '$.dataset', 'required'],
    [{ ...GAP, robot: 'franka' }, '$.robot', 'expected one of "so100", "so101", "other", "unsure"'],
    [{ ...GAP, publish: 'yes' }, '$.publish', 'expected true or false'],
    [{ ...GAP, revision: 'main; rm -rf' }, '$.revision', 'expected a commit sha, branch or tag'],
    [{ ...GAP, notes: 'x'.repeat(501) }, '$.notes', 'must be at most 500 chars'],
    [{ ...GAP, budget: '1k_5k' }, '$.budget', 'unknown field for kind "gap_report"'],
    [{ kind: 'pilot', robot: 'so101', simulator: 'mujoco', policy_format: 'lerobot', checkpoint_ready: 'yes', email: 'a@b.co' }, '$.budget', 'required'],
    [
      { kind: 'pilot', robot: 'so101', simulator: 'mujoco', policy_format: 'lerobot', checkpoint_ready: 'yes', budget: 'none', deadline: '2027-02-30', email: 'a@b.co' },
      '$.deadline',
      'expected a date, YYYY-MM-DD',
    ],
    [{ kind: 'own_robot', robot: 'x', robot_count: '2-5', eval_cost: 'y', pain: ['resets', 'coffee'], email: 'a@b.co' }, '$.pain[1]', 'expected one of'],
  ])('%j -> 400 ERR_SCHEMA at %s', async (body, path, message) => {
    const err = await expectApiError(await send(body), 400, 'ERR_SCHEMA')
    expect(err.path).toBe(path)
    expect(err.message).toContain(`${path}: ${message}`)
  })

  it('rejects invalid JSON and bodies over the cap', async () => {
    await expectApiError(await send('{"kind":'), 400, 'ERR_INVALID_JSON')
    await expectApiError(await send({ ...GAP, notes: 'x'.repeat(REQUEST_MAX_BYTES) }), 413, 'ERR_PAYLOAD_TOO_LARGE')
  })

  it("refuses another site's origin with 403, and sends no CORS headers (no preflight either)", async () => {
    const res = await send({ ...GAP, email: 'xorigin@lab.edu' }, { origin: 'https://evil.example' })
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
    await expectApiError(res, 403, 'ERR_FORBIDDEN')
    expect(await rows('xorigin@lab.edu')).toEqual([])
    const pre = await call('/v1/requests', { method: 'OPTIONS', headers: { origin: 'https://agent.example' } })
    expect(pre.headers.get('access-control-allow-origin')).toBeNull()
    await expectApiError(pre, 405, 'ERR_METHOD_NOT_ALLOWED')
  })

  it('is rate-limited per client, shared with the v0.1 waitlist', async () => {
    const ip = randomIp()
    for (let i = 0; i < 4; i++) expect((await send({ ...GAP, email: `rl${i}@lab.edu` }, { ip })).status).toBe(202)
    expect((await postJson('/v1/waitlist', { kind: 'api_keys', email: 'rl-wait@lab.edu' }, { ip, headers: { origin: ORIGIN } })).status).toBe(200)
    const res = await send({ ...GAP, email: 'rl5@lab.edu' }, { ip })
    expect(res.headers.get('retry-after')).toBe('60')
    await expectApiError(res, 429, 'ERR_RATE_LIMITED')
    expect(await rows('rl5@lab.edu')).toEqual([])
  })

  it('GET /v1/requests -> 405 allow POST', async () => {
    const res = await call('/v1/requests')
    expect(res.headers.get('allow')).toBe('POST')
    await expectApiError(res, 405, 'ERR_METHOD_NOT_ALLOWED')
  })
})
