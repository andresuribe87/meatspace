import { env } from 'cloudflare:workers'
import { expect, it } from 'vitest'

it('D1 migrations applied', async () => {
  const r = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='waitlist'").first<{ name: string }>()
  expect(r?.name).toBe('waitlist')
})
