/**
 * v0.2 app shell and the kept v0.1 demo:
 *  - /concept: the v0.1 dispatch sandbox still works end to end against the concept API (labelled, noindex).
 *  - /docs and /install.sh: the man page for browsers and curl; the inert installer.
 *  - Design system audit on every route: closed palette, faces by role, 0 radius, no shadows; axe WCAG 2.2 AA.
 *  - Phones: no sideways page scroll anywhere; the menu; joint tabs on the report page.
 * Product pages (home, reports, report, cells, requests, redirects): e2e/v02.spec.ts.
 */
import { expect, test, type Page } from '@playwright/test'

import { axe, designAudit, noHorizontalScroll, open, ROUTES } from './audit'

const consoleLog = (page: Page) => page.getByRole('log')
const execute = (page: Page) => page.getByRole('button', { name: /EXECUTE CALL/ })
const orderbook = (page: Page) => page.locator('#orderbook')
const row = (page: Page, id: string) => orderbook(page).locator('tbody tr').filter({ hasText: id })

/**
 * Each test is its own client: the Worker keys rate limits and the 2-lock quota on cf-connecting-ip,
 * which Cloudflare sets in production and local preview passes through.
 */
let client = 0
test.beforeEach(async ({ page }) => {
  client++
  await page.setExtraHTTPHeaders({ 'cf-connecting-ip': `10.1.${Math.floor(client / 250)}.${client % 250}` })
})

/* ------------------------------------------------------------------------------------------------ */

test.describe('/concept // the v0.1 dispatch sandbox, labelled', () => {
  test('banner, noindex, title, and no status line', async ({ page }) => {
    await open(page, '/concept')
    await expect(page).toHaveTitle('CONCEPT (simulated) // meatspace.sh')
    await expect(page.getByRole('note', { name: 'Concept' })).toContainText(/simulated/i)
    expect(await page.locator('meta[name="robots"]').getAttribute('content')).toBe('noindex')
    await expect(page.getByRole('banner')).not.toContainText(/held-out episodes/i)
    // Leaving /concept restores indexing.
    await page.getByRole('banner').getByRole('link', { name: 'Reports' }).click()
    await expect(page).toHaveURL(/\/reports$/)
    expect(await page.locator('meta[name="robots"][content="noindex"]').count()).toBe(0)
  })

  test('default sortie runs the simulated state machine, then the node is locked', async ({ page }) => {
    await open(page, '/concept')
    await expect(page.getByRole('tab', { name: /AERIAL_ISR_SORTIE/ })).toHaveAttribute('aria-selected', 'true')
    await execute(page).click()
    const log = consoleLog(page)
    await expect(log).toContainText('Validating GeoJSON polygon against node firmware geofence...')
    await expect(log).toContainText('PASS')
    await expect(log).toContainText('ACCEPTED')
    await expect(log).toContainText('DISPATCHED')
    for (const t of ['00ms', '140ms', '380ms', '800ms']) await expect(log).toContainText(t)
    await expect(row(page, 'VTOL-260-TX-04')).toContainText('TASKED', { timeout: 6_000 })
    await expect(execute(page)).toBeEnabled()
    await execute(page).click()
    await expect(log).toContainText('REJECTED')
    await expect(log).toContainText('ERR_NODE_BUSY')
  })

  test('client-side invalid JSON never hits the API', async ({ page }) => {
    await open(page, '/concept')
    await page.getByRole('button', { name: /EDIT JSON/ }).click()
    await page.getByRole('tabpanel').getByRole('textbox').first().fill('{ "primitive": ')
    await execute(page).click()
    await expect(consoleLog(page)).toContainText('ERR_INVALID_JSON')
  })

  test('orderbook filters, and [ TASK NODE ] loads the node into the console', async ({ page }) => {
    await open(page, '/concept')
    const rows = orderbook(page).locator('tbody tr')
    await expect(rows).toHaveCount(10)
    for (const [name, n] of [
      [/Aerial\/VTOL/, 4],
      [/Ground\/Rover/, 3],
      [/Manipulator\/CNC/, 3],
      [/^\[?\s*All/, 10],
    ] as [RegExp, number][]) {
      await orderbook(page).getByRole('button', { name }).click()
      await expect(rows).toHaveCount(n)
    }
    await row(page, 'QDR-SUB-44').getByRole('button', { name: /TASK NODE/ }).click()
    await expect(page.getByRole('tab', { name: /SUBSTATION_THERMAL_SWEEP/ })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tabpanel')).toContainText('"node_id": "QDR-SUB-44"')
    await execute(page).click()
    await expect(consoleLog(page)).toContainText('Compiling intent to ROS 2 action goal...')
  })

  test('one client holds at most 2 task locks; the third is rejected', async ({ page }) => {
    await open(page, '/concept')
    for (const id of ['ORK-VTOL-09', 'QDR-GH-17']) {
      await row(page, id).getByRole('button', { name: /TASK NODE/ }).click()
      await execute(page).click()
      await expect(consoleLog(page)).toContainText('DISPATCHED')
    }
    await row(page, 'CNC-5AX-03').getByRole('button', { name: /TASK NODE/ }).click()
    await execute(page).click()
    await expect(consoleLog(page)).toContainText('ERR_LOCK_QUOTA')
  })
})

/* ------------------------------------------------------------------------------------------------ */

test.describe('docs and installer', () => {
  test('docs route in the browser, plain-text man page for curl', async ({ page, request }) => {
    await open(page, '/')
    await page.getByRole('banner').getByRole('link', { name: 'Docs' }).click()
    await expect(page).toHaveURL(/\/docs$/)
    await expect(page.getByText('MEATSPACE(1)').first()).toBeVisible()
    await expect(page).toHaveTitle('MEATSPACE(1) // meatspace.sh')
    const txt = await request.get('/docs', { headers: { accept: '*/*' } })
    expect(txt.headers()['content-type']).toContain('text/plain')
    expect(await txt.text()).toContain('MEATSPACE(1)')
  })

  test('install.sh is served as inert text', async ({ request }) => {
    const res = await request.get('/install.sh')
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('text/plain')
    expect((await res.text()).startsWith('#!/bin/sh')).toBe(true)
  })
})

/* ------------------------------------------------------------------------------------------------ */

test.describe('design system audit, every route', () => {
  test.describe.configure({ timeout: 60_000 })
  for (const r of ROUTES) {
    test(`palette, faces, radius, shadows and axe on ${r.path}`, async ({ page }) => {
      await open(page, r.path, r.ready)
      expect(await designAudit(page)).toEqual([])
      expect(await axe(page)).toEqual([])
    })
  }

  test('palette and axe with a request dialog open', async ({ page }) => {
    await open(page, '/#request-report')
    await expect(page.getByRole('dialog')).toBeVisible()
    expect(await designAudit(page)).toEqual([])
    expect(await axe(page)).toEqual([])
  })
})

/* ------------------------------------------------------------------------------------------------ */

test.describe('phones @mobile', () => {
  test.describe.configure({ timeout: 90_000 })
  // The desktop project runs every test; these assert the phone layout, so they run in the mobile project only.
  test.skip(({ isMobile }) => !isMobile, 'phone layout')

  test('no horizontal page scroll on any route @mobile', async ({ page }) => {
    for (const r of ROUTES) {
      await open(page, r.path, r.ready)
      await noHorizontalScroll(page)
    }
  })

  test('axe on the main routes at phone width @mobile', async ({ page }) => {
    for (const path of ['/', '/reports', '/reports/lerobot__svla_so101_pickplace', '/cells']) {
      await open(page, path)
      expect(await axe(page), path).toEqual([])
      expect(await designAudit(page), path).toEqual([])
    }
  })

  test('the nav folds into a menu that opens, routes and closes @mobile', async ({ page }) => {
    await open(page, '/')
    const banner = page.getByRole('banner')
    await expect(banner.getByRole('navigation', { name: 'Primary' })).toBeHidden()
    const menu = banner.getByRole('button', { name: 'Menu' })
    await expect(menu).toHaveAttribute('aria-expanded', 'false')
    await menu.click()
    await expect(menu).toHaveAttribute('aria-expanded', 'true')
    await banner.getByRole('navigation', { name: 'Menu' }).getByRole('link', { name: 'Cells' }).click()
    await expect(page).toHaveURL(/\/cells$/)
    await expect(menu).toHaveAttribute('aria-expanded', 'false')
    // The status line keeps reports, refused and real cell on phones.
    await expect(banner).toContainText(/reports/i)
    await expect(banner).toContainText(/real cell/i)
  })

  test('the hero proof panel follows the keys, and the report figure shows one joint behind tabs @mobile', async ({ page }) => {
    await open(page, '/')
    const keys = await page.getByRole('button', { name: 'Request a report on your dataset' }).boundingBox()
    const proof = await page.getByRole('article').first().boundingBox()
    expect(proof!.y).toBeGreaterThan(keys!.y)
    await open(page, '/reports/lerobot__svla_so101_pickplace')
    const tabs = page.getByRole('tablist', { name: 'Joint' })
    await expect(tabs).toBeVisible()
    await tabs.getByRole('tab', { selected: true }).focus()
    await page.keyboard.press('ArrowRight')
    expect(await tabs.locator('[role=tab][tabindex="0"]').count()).toBe(1)
    await noHorizontalScroll(page)
  })
})
