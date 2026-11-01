/**
 * v0.2 product pages: home, the report index, report pages (ok, refused, not run, unknown), cells, the request flow,
 * deep links, redirects, titles and the honesty rules. Expected values are read from the same generated index the
 * pages render (shared/reports.generated.ts), so a lab re-run changes the data, not these tests.
 */
import { createHash } from 'node:crypto'

import { expect, test, type Page } from '@playwright/test'

import { CELLS, cellWire } from '../shared/api'
import { pct } from '../shared/reports'
import { REPORT_INDEX } from '../shared/reports.generated'
import { capability, fromApiStatus } from '../shared/status'
import { fmt } from '../src/ds/format'
import { EXEMPT, numberAudit, open, ROUTES, wordAudit } from './audit'

const IX = REPORT_INDEX
const HERO = IX.reports.find((r) => r.id === IX.hero.id)!
const CAROLINE = IX.reports.find((r) => r.id === 'CarolinePascal__plug_socket_moved')!
const REFUSED = IX.rejected[0]
const NOT_RUN = IX.not_run[0]

let client = 0
test.beforeEach(async ({ page }) => {
  client++
  await page.setExtraHTTPHeaders({ 'cf-connecting-ip': `10.2.${Math.floor(client / 250)}.${client % 250}` })
})

const sline = (page: Page) => page.getByRole('banner').locator('.sline')

/* ------------------------------------------------------------------------------------------------ */

test.describe('honesty rules on every route', () => {
  test.describe.configure({ timeout: 90_000 })
  test('no unprovenanced number, no template braces, no banned words, "verified" and "signed" only in their rules', async ({ page }) => {
    for (const r of ROUTES) {
      await open(page, r.path, r.ready)
      const n = await numberAudit(page)
      expect(n.braces, r.path).toBe(false)
      if (EXEMPT.has(r.path)) continue
      expect(n.uncal, r.path).toEqual([])
      expect(n.bare, `${r.path}: data numbers typed outside <Num>`).toEqual([])
      expect(await wordAudit(page), r.path).toEqual([])
    }
  })

  test('titles and canonical URLs follow the route', async ({ page }) => {
    const want: [string, string, string][] = [
      ['/', 'meatspace.sh // stdout to reality.', 'https://meatspace.sh/'],
      ['/reports', 'reports // meatspace.sh', 'https://meatspace.sh/reports'],
      [`/reports/${HERO.id}`, `${HERO.dataset} x ${HERO.twin} // reports // meatspace.sh`, `https://meatspace.sh/reports/${HERO.id}`],
      ['/cells', 'cells // meatspace.sh', 'https://meatspace.sh/cells'],
      ['/power', 'how many real trials? // meatspace.sh', 'https://meatspace.sh/power'],
      ['/concept', 'CONCEPT (simulated) // meatspace.sh', 'https://meatspace.sh/concept'],
      ['/design', 'design // meatspace.sh', 'https://meatspace.sh/design'],
      ['/no-such-page', '404 // meatspace.sh', 'https://meatspace.sh/'],
    ]
    for (const [path, title, canonical] of want) {
      await page.goto(path)
      await expect(page).toHaveTitle(title)
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical)
    }
  })

  test('the terminal face is preloaded', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('link[rel="preload"][as="font"]')).toHaveAttribute('href', '/fonts/jetbrains-mono-latin-wght.woff2')
  })
})

/* ------------------------------------------------------------------------------------------------ */

test.describe('chrome', () => {
  test('status line: static facts from the index, lifecycle words from shared/status.ts, nothing live', async ({ page }) => {
    await open(page, '/')
    const s = sline(page)
    await expect(s.locator('.num[data-prov$="/counts/reported"]')).toHaveText(String(IX.counts.reported))
    await expect(s.locator('.num[data-prov$="/counts/rejected"]')).toHaveText(String(IX.counts.rejected))
    await expect(s).toContainText(capability('MS-TT-SIM').status.toLowerCase())
    await expect(s).toContainText(capability('MS-RV-SO101').status.toLowerCase())
    await expect(s).toContainText(IX.generated_at)
    await expect(s.locator('.ann')).toHaveCount(0)
  })

  test('nav marks the current page; brand goes home; the primary key opens the report request', async ({ page }) => {
    await open(page, '/reports')
    const nav = page.getByRole('banner').getByRole('navigation', { name: 'Primary' })
    await expect(nav.getByRole('link', { name: 'Reports' })).toHaveAttribute('aria-current', 'page')
    await nav.getByRole('button', { name: 'Request a report' }).click()
    await expect(page.getByRole('dialog', { name: /twin gap report/i })).toBeVisible()
    await expect(page).toHaveURL(/#request-report$/)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
    expect(new URL(page.url()).hash).toBe('')
    await page.getByRole('banner').getByRole('link', { name: /meatspace\.sh/ }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('sticky header height is published as --header-h, so in-page jumps land below it', async ({ page }) => {
    await open(page, '/cells#twins')
    const h = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')))
    const header = await page.getByRole('banner').boundingBox()
    expect(Math.abs(h - header!.height)).toBeLessThanOrEqual(1)
    await expect.poll(() => page.locator('#twins').evaluate((el) => Math.round(el.getBoundingClientRect().top))).toBeGreaterThanOrEqual(Math.floor(header!.height) - 2)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  })

  test('footer links Concept and Design, which are not in the nav', async ({ page }) => {
    await open(page, '/')
    const foot = page.getByRole('contentinfo')
    await foot.getByRole('link', { name: 'Design' }).click()
    await expect(page).toHaveURL(/\/design$/)
    await expect(page.locator('#ds-voice')).toBeVisible({ timeout: 15_000 })
    await page.getByRole('contentinfo').getByRole('link', { name: 'Concept' }).click()
    await expect(page).toHaveURL(/\/concept$/)
  })
})

/* ------------------------------------------------------------------------------------------------ */

test.describe('home', () => {
  test('hero: claim, status row from shared/status.ts, keys', async ({ page }) => {
    await open(page, '/')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^stdout to reality\.\s*$/)
    await expect(page.getByText('sim-to-real gaps,')).toBeVisible()
    const row = page.locator('p', { hasText: 'real SO-101 cell' }).first()
    const words = await row.locator('.ann').evaluateAll((els) => els.map((e) => e.getAttribute('data-status')))
    expect(words).toEqual([capability('MS-TGR-1').status, capability('MS-TT-SIM').status, capability('MS-RV-SO101').status])
  })

  test('proof panel: the hero report drawn from its trace.json, readings with provenance', async ({ page }) => {
    await open(page, '/')
    const proof = page.getByRole('article').first()
    await expect(proof).toContainText(`${HERO.dataset} x ${HERO.twin}`)
    const stock = proof.locator(`.ro-v .num[data-prov="${HERO.future.rmse_deg.stock.prov}"]`)
    await expect(stock).toHaveText(fmt(HERO.future.rmse_deg.stock.mean))
    await expect(proof.locator(`.ro-v .num[data-prov="${HERO.future.rmse_deg.calibrated.prov}"]`)).toHaveText(fmt(HERO.future.rmse_deg.calibrated.mean))
    await expect(proof.locator(`.ro-v .num[data-prov="${HERO.future.vs_stock.prov}"]`)).toHaveText(fmt(pct(HERO.future.vs_stock.mean), 0))
    // The plot: real, stock and calibrated of one future-block episode, a keyboard playhead.
    const slider = proof.getByRole('slider', { name: new RegExp(`^Playhead, \\w+, future-block ep ${HERO.trace!.episode}$`) })
    await expect(slider).toBeVisible()
    await slider.focus()
    await page.keyboard.press('Home')
    await expect(slider).toHaveAttribute('aria-valuenow', '0')
    await expect(slider).toHaveAttribute('aria-valuetext', /real .+ degrees; stock .+, delta .+; calibrated .+, delta .+/)
    await expect(proof.locator('.scope svg[role="img"]')).toHaveAttribute('aria-label', /stock twin and calibrated twin/)
    // Joint tabs switch the plotted joint.
    await proof.getByRole('tab', { name: 'wrist_roll' }).click()
    await expect(proof.getByRole('slider', { name: /^Playhead, wrist_roll,/ })).toBeVisible()
    // Every figure has a table view.
    await proof.getByRole('button', { name: 'Table' }).click()
    await expect(proof.getByRole('table')).toContainText('wrist_roll')
    await proof.getByRole('link', { name: 'Open report' }).click()
    await expect(page).toHaveURL(new RegExp(`/reports/${HERO.id}$`))
  })

  test('findings: SO-101 and SO-100 ranges come from the index aggregates', async ({ page }) => {
    await open(page, '/')
    for (const f of ['so101', 'so100'] as const) {
      const a = IX.aggregates[f]
      const vs = page.locator(`.num[data-prov="${a.future.vs_baseline.prov}"]`).first()
      await expect(vs).toHaveText(fmt(pct(a.future.vs_baseline.min), 0))
      await expect(page.locator(`.num[data-prov="${a.lag.real_ms.prov}"]`).first()).toHaveText(fmt(a.lag.real_ms.min, 0))
    }
    // Where calibration does not clearly help, the page names the datasets (chosen by the lab's labels).
    await expect(page.getByRole('main')).toContainText(CAROLINE.dataset)
  })

  test('compact index lists every report and every refusal', async ({ page }) => {
    await open(page, '/')
    const t = page.getByRole('table', { name: 'Published reports, future block' })
    await expect(t.locator('tbody tr')).toHaveCount(IX.reports.length + IX.rejected.length)
    await expect(t.locator('tbody tr.refused')).toHaveCount(IX.rejected.length)
  })

  test('start-here keys open each dialog; text links use the hash deep links', async ({ page }) => {
    await open(page, '/')
    await page.getByRole('link', { name: 'Need numbers from a real robot? Request a pilot.' }).click()
    await expect(page.getByRole('dialog', { name: /real-robot pilot/i })).toBeVisible()
    await expect(page).toHaveURL(/#request-pilot$/)
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Evaluate on your own robot' }).click()
    await expect(page.getByRole('dialog', { name: /evaluate on your own robot/i })).toBeVisible()
    await expect(page).toHaveURL(/#own-robot$/)
  })
})

/* ------------------------------------------------------------------------------------------------ */

test.describe('/reports', () => {
  test('every run, both held-out sets, sortable, refused at the bottom', async ({ page }) => {
    await open(page, '/reports')
    let t = page.getByRole('table', { name: /Report index, future block/ })
    await expect(t.locator('tbody tr')).toHaveCount(IX.reports.length + IX.rejected.length)
    await expect(t.locator('tbody tr.refused')).toHaveCount(IX.rejected.length)
    // Sort by change vs stock: the best (most negative) first, then reversed.
    const best = [...IX.reports].sort((a, b) => a.future.vs_stock.mean - b.future.vs_stock.mean)
    await t.getByRole('button', { name: 'vs stock' }).click()
    await expect(t.locator('tbody tr').first()).toContainText(best[0].dataset)
    await expect(t.locator('th[aria-sort="ascending"]')).toHaveCount(1)
    await t.getByRole('button', { name: 'vs stock' }).click()
    await expect(t.locator('tbody tr').first()).toContainText(best[best.length - 1].dataset)
    // The interleaved set.
    await page.getByRole('group', { name: 'Held-out set' }).getByRole('button', { name: 'interleaved' }).click()
    t = page.getByRole('table', { name: /Report index, interleaved/ })
    await expect(t.locator(`.num[data-prov="${HERO.interleaved.rmse_deg.stock.prov}"]`).first()).toHaveText(`${fmt(HERO.interleaved.rmse_deg.stock.mean)}°`)
  })

  test('refusals with reasons, candidates not run, and the bar computed from the index', async ({ page }) => {
    await open(page, '/reports')
    const refused = page.getByRole('table', { name: 'Refused datasets' })
    await expect(refused.locator('tbody tr')).toHaveCount(IX.rejected.length)
    await expect(refused).toContainText(REFUSED.reason)
    await expect(page.getByRole('table', { name: 'Candidates not run' }).locator('tbody tr')).toHaveCount(IX.not_run.length)
    // The bar per robot family, with the memo's "consistently": met only when every dataset of the family meets it.
    const bar = page.getByRole('list', { name: 'The bar, per robot' })
    for (const family of ['so101', 'so100'] as const) {
      const rows = IX.reports.filter((r) => r.family === family)
      const met = rows.filter((r) => {
        const m = r.lag.median_frames
        return r.future.vs_stock.mean <= -0.5 && m.real != null && m.calibrated != null && Math.abs(m.calibrated - m.real) <= 1
      })
      const item = bar.getByRole('listitem').filter({ hasText: family === 'so101' ? 'SO-101' : 'SO-100' })
      await expect(item).toContainText(`met on ${met.length} of ${rows.length} datasets`)
      const holds = met.length === rows.length && met.length >= 3 && new Set(met.map((r) => r.owner)).size >= 3
      await expect(item.locator('.ann')).toHaveText(holds ? 'met' : 'not met')
    }
    await expect(page.getByRole('main')).toContainText('consistently across')
  })
})

/* ------------------------------------------------------------------------------------------------ */

test.describe('/reports/:id', () => {
  test.describe.configure({ timeout: 60_000 })

  test('certificate, headline from the index, held-out set switch', async ({ page }) => {
    await open(page, `/reports/${HERO.id}`)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(`${HERO.dataset} x ${HERO.twin}`)
    await expect(page.getByRole('group', { name: 'Title block' })).toContainText(HERO.revision_sha.slice(0, 7))
    await expect(page.getByRole('group', { name: 'Calibrated twin record' })).toContainText('calibrated_twin.json')
    const head = page.locator('.cert-headline')
    await expect(head.locator(`.num[data-prov="${HERO.future.rmse_deg.stock.prov}"]`).first()).toHaveText(fmt(HERO.future.rmse_deg.stock.mean))
    await page.getByRole('group', { name: 'Held-out set' }).getByRole('button', { name: 'interleaved' }).click()
    await expect(head.locator(`.num[data-prov="${HERO.interleaved.rmse_deg.stock.prov}"]`).first()).toHaveText(fmt(HERO.interleaved.rmse_deg.stock.mean))
    await expect(page.getByRole('list', { name: 'Report checks' })).toContainText(/signing/i)
  })

  test('figures render from report.json and trace.json, each with a table view', async ({ page }) => {
    await open(page, `/reports/${HERO.id}`)
    const fig1 = page.getByRole('figure', { name: /Fig 1/ })
    const slider = fig1.getByRole('slider', { name: /all joints/ })
    await expect(slider).toBeVisible()
    const text = (await slider.getAttribute('aria-valuetext')) ?? ''
    for (const j of ['shoulder_pan', 'shoulder_lift', 'elbow_flex', 'wrist_flex', 'wrist_roll']) expect(text).toContain(`${j}: real`)
    for (const name of [/Fig 1/, /Fig 2/, /Fig 3/]) {
      const fig = page.getByRole('figure', { name }).first()
      await fig.getByRole('button', { name: 'Table' }).click()
      await expect(fig.locator('table')).toBeVisible()
    }
    // The physics-free baseline is reported per joint and for the plotted episode.
    await expect(page.getByRole('table', { name: /Per-joint held-out RMSE/ })).toContainText('baseline')
    await expect(page.locator('#episode table.tbl').last()).toContainText('baseline')
    await expect(page.getByText(/could not be loaded/)).toHaveCount(0)
  })

  test('limitations unedited, fitted parameters, provenance hashes', async ({ page, request }) => {
    await open(page, `/reports/${HERO.id}`)
    const rep = await (await request.get(`/v1/reports/${HERO.id}`)).json()
    await page.getByRole('button', { name: /Show all \d+ limitations/ }).click()
    await expect(page.locator('#limitations .co')).toHaveCount(rep.limitations.length)
    await expect(page.locator('#limitations')).toContainText(rep.limitations[rep.limitations.length - 1].slice(0, 60))
    await expect(page.getByRole('table', { name: 'Fitted parameters' })).toContainText('shoulder_pan')
    const prov = page.getByRole('group', { name: 'Provenance' }).last()
    await expect(prov).toContainText(HERO.hashes.content_sha256)
    await expect(prov).toContainText(HERO.hashes.results_sha256)
    await expect(page.getByRole('main')).toContainText('Hashed, not signed')
  })

  test('downloads are the published bytes, matching the sha256 on the page', async ({ page, request }) => {
    await open(page, `/reports/${HERO.id}`)
    const files = page.getByRole('table', { name: 'Published files' })
    for (const name of ['report.json', 'calibrated_twin.json', 'trace.json'] as const) {
      const link = files.getByRole('link', { name: `Download ${name}` })
      const href = await link.getAttribute('href')
      const res = await request.get(href!)
      expect(res.status(), name).toBe(200)
      const sha = createHash('sha256').update(await res.body()).digest('hex')
      expect(sha).toBe(HERO.files[name]!.sha256)
      await expect(files.locator('tr', { hasText: name }).first()).toContainText(sha.slice(0, 12))
    }
    await expect(page.locator('pre').filter({ hasText: `https://meatspace.sh/v1/reports/${HERO.id}/twin` }).first()).toBeVisible()
  })

  test('a report whose lab JSON holds NaN still renders (strict copy) with a worse-than-baseline verdict', async ({ page }) => {
    await open(page, `/reports/${CAROLINE.id}`)
    await expect(page.locator('.cert-headline')).toContainText(/worse than baseline/i)
    await expect(page.getByRole('table', { name: /Per-joint held-out RMSE/ })).toBeVisible({ timeout: 15_000 })
  })

  test('refused, not run and unknown ids', async ({ page }) => {
    await open(page, `/reports/${REFUSED.id}`)
    await expect(page.locator('.ann[data-status="REFUSED"]').first()).toBeVisible()
    await expect(page.getByRole('main')).toContainText(REFUSED.reason)
    await expect(page.getByRole('figure')).toHaveCount(0)

    await open(page, `/reports/${NOT_RUN.dataset.replace('/', '__')}`)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(`No report for ${NOT_RUN.dataset}.`)
    await expect(page.getByRole('main')).toContainText('compatibility scan failed')

    await open(page, '/reports/nobody__nothing')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('No report for nobody/nothing.')
    await page.getByRole('main').getByRole('button', { name: 'Request a report' }).click()
    await expect(page.getByRole('dialog', { name: /twin gap report/i })).toBeVisible()
  })
})

/* ------------------------------------------------------------------------------------------------ */

test.describe('redirects and 404', () => {
  test('client-side redirects land on the canonical path', async ({ page }) => {
    const cases: [string, RegExp][] = [
      ['/reports/', /\/reports$/],
      [`/reports/${HERO.owner}/${HERO.name}`, new RegExp(`/reports/${HERO.id}$`)],
      [`/reports/${HERO.id.toLowerCase().replace('lerobot', 'LEROBOT')}`, new RegExp(`/reports/${HERO.id}$`)],
      ['/twins', /\/cells#twins$/],
      ['/index.html', /\/$/],
    ]
    for (const [from, to] of cases) {
      await page.goto(from)
      await expect(page, from).toHaveURL(to)
    }
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/stdout to reality/)
  })

  test('unknown paths get a designed 404 in the system', async ({ page }) => {
    await open(page, '/nothing/here')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('404 // no such path.')
    await expect(page.getByRole('main').locator('pre')).toContainText('curl -s https://meatspace.sh/v1')
    await page.getByRole('main').getByRole('link', { name: 'Home' }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('back and forward move between routes', async ({ page }) => {
    await open(page, '/')
    await page.getByRole('banner').getByRole('link', { name: 'Reports' }).click()
    await expect(page).toHaveURL(/\/reports$/)
    await page.getByRole('table', { name: /Report index/ }).getByRole('link', { name: HERO.dataset }).click()
    await expect(page).toHaveURL(new RegExp(`/reports/${HERO.id}$`))
    await page.goBack()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Twin Gap Reports')
    await page.goBack()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/stdout to reality/)
    await page.goForward()
    await expect(page).toHaveURL(/\/reports$/)
  })
})

/* ------------------------------------------------------------------------------------------------ */

test.describe('cells, power, design', () => {
  test('cell lanes read their status from shared/status.ts; #twins lists every package', async ({ page }) => {
    await open(page, '/cells')
    const lanes = page.getByRole('table', { name: 'Lanes of so101-pick-v1' })
    const words = await lanes.locator('.ann').evaluateAll((els) => els.map((e) => e.getAttribute('data-status')))
    // The page and GET /v1/cells say the same thing: the cell's own twin is planned (our unit is not purchased).
    const wire = cellWire(CELLS[0]).lanes
    expect(words).toEqual([wire.twin.status, wire.trials.status, wire.real.status].map((w) => fromApiStatus(w)))
    expect(words[0]).toBe('PLANNED')
    const twins = page.locator('#twins')
    for (const r of IX.reports) await expect(twins.locator(`a[href$="/v1/reports/${r.id}/twin"]`).first()).toBeAttached()
  })

  test('power calculator and the design reference load on demand', async ({ page }) => {
    await open(page, '/power')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/trials/i)
    await open(page, '/design', '#ds-voice')
    await expect(page.locator('#ds-system')).toBeVisible()
  })
})

/* ------------------------------------------------------------------------------------------------ */

test.describe('requests', () => {
  test('POST /v1/requests round trip from the dialog: a receipt with a request id, nothing charged', async ({ page }) => {
    await open(page, '/#request-report')
    const dialog = page.getByRole('dialog', { name: /twin gap report/i })
    await expect(dialog).toBeVisible()
    await dialog.getByLabel(/dataset/i).fill('lerobot/svla_so101_pickplace')
    await dialog.getByLabel(/robot/i).selectOption('so101')
    await dialog.getByLabel(/email/i).fill(`e2e+${Date.now()}@example.com`)
    const posted = page.waitForResponse((r) => r.url().endsWith('/v1/requests') && r.request().method() === 'POST')
    await dialog.getByRole('button', { name: 'Request report' }).click()
    const res = await posted
    expect(res.status()).toBe(202)
    const body = await res.json()
    expect(body).toMatchObject({ ok: true, kind: 'gap_report', status: 'on_request', charged: false })
    await expect(dialog.getByRole('status')).toContainText(body.request_id)
  })

  test('the API answers the same body from a terminal; planned endpoints answer 501', async ({ request }) => {
    const res = await request.post('/v1/requests', {
      data: { kind: 'pilot', email: `e2e+${Date.now()}@example.com`, robot: 'so101', simulator: 'mujoco', policy_format: 'lerobot', checkpoint_ready: 'yes', budget: '500_1k' },
    })
    expect(res.status()).toBe(202)
    const body = await res.json()
    expect(body.request_id).toMatch(/^pl_[0-9a-f]{16}$/)
    expect(body).toMatchObject({ status: 'waitlist', charged: false })
    const trials = await request.post('/v1/trials', { data: {} })
    expect(trials.status()).toBe(501)
    expect((await trials.json()).error.code).toBe('ERR_NOT_IMPLEMENTED')
  })

  test('legacy v0.1 hashes open the new dialogs: #connect -> #own-robot, #api-keys -> #request-pilot', async ({ page }) => {
    await page.goto('/#connect')
    await expect(page.getByRole('dialog', { name: /evaluate on your own robot/i })).toBeVisible()
    await expect(page).toHaveURL(/#own-robot$/)
    await page.goto('/cells#api-keys')
    await expect(page.getByRole('dialog', { name: /real-robot pilot/i })).toBeVisible()
    await expect(page).toHaveURL(/\/cells#request-pilot$/)
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/\/cells$/)
  })
})

/* ------------------------------------------------------------------------------------------------ */

test.describe('layout at awkward widths', () => {
  test.describe.configure({ timeout: 120_000 })
  test.skip(({ isMobile }) => !!isMobile, 'desktop project sets its own viewports')

  test('report headline readings never overprint each other (1100, 1280, 1366, 1440)', async ({ page }) => {
    for (const width of [1100, 1280, 1366, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await open(page, `/reports/${HERO.id}`)
      const boxes = await page.locator('.cert-headline > *').evaluateAll((els) =>
        els.map((el) => {
          const cell = el.getBoundingClientRect()
          // The widest descendant: a reading's value (with its stacked tolerance) must stay inside its own cell.
          let right = cell.left
          for (const d of el.querySelectorAll('*')) right = Math.max(right, d.getBoundingClientRect().right)
          return { left: cell.left, right: cell.right, top: cell.top, contentRight: right }
        }),
      )
      expect(boxes.length, String(width)).toBeGreaterThanOrEqual(4)
      for (const b of boxes) expect(b.contentRight, `${width}: content overflows its cell`).toBeLessThanOrEqual(b.right + 1)
    }
  })

  test('the home synopsis keeps its status lamps visible from 1100 to 1440', async ({ page }) => {
    for (const width of [1100, 1280, 1366, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await open(page, '/')
      const lamps = page.locator('table:has(th:text-is("status")) tbody .ann')
      await expect(lamps.first(), String(width)).toBeVisible()
      for (const box of await lamps.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()))) {
        const wrap = await page.locator('table:has(th:text-is("status"))').evaluate((t) => t.parentElement!.getBoundingClientRect())
        expect(box.right, `${width}: a status lamp is scrolled out of view`).toBeLessThanOrEqual(wrap.right + 1)
      }
    }
  })

  test('no sideways page scroll at 360 and 320 (400% zoom) on any route', async ({ page }) => {
    for (const [width, height] of [
      [360, 740],
      [320, 640],
    ]) {
      await page.setViewportSize({ width, height })
      for (const r of ROUTES) {
        await open(page, r.path, r.ready)
        const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
        expect(sw, `${r.path} at ${width}`).toBeLessThanOrEqual(iw)
      }
    }
  })
})

/* ------------------------------------------------------------------------------------------------ */

test.describe('accessibility details', () => {
  test('a route change moves focus to the new page and announces its title', async ({ page }) => {
    await open(page, '/')
    await page.getByRole('banner').getByRole('link', { name: 'Reports' }).first().click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Twin Gap Reports')
    await expect(page.locator('h1')).toBeFocused()
    await expect(page.locator('#route-announcer')).toHaveText('reports // meatspace.sh')
  })

  test('switching from one dialog hash to another opens the second and keeps its hash', async ({ page }) => {
    await page.goto('/#request-report')
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.evaluate(() => (window.location.hash = '#request-pilot'))
    await expect(page.locator('dialog[open]')).toHaveCount(1)
    await expect(page.getByRole('dialog', { name: /pilot/i })).toBeVisible()
    await expect(page).toHaveURL(/#request-pilot$/)
  })

  test('the dialog close key says what it shows; required fields are not reported invalid before input', async ({ page }) => {
    await page.goto('/#request-pilot')
    const dialog = page.getByRole('dialog', { name: /pilot/i })
    await expect(dialog.getByRole('button', { name: 'Esc, close dialog' })).toBeVisible()
    for (const name of ['robot', 'simulator', 'budget range']) {
      const select = dialog.getByRole('combobox', { name: new RegExp(`^${name}$`, 'i') })
      await expect(select).toHaveAttribute('aria-invalid', 'false')
    }
    // The submit key is pinned to the bottom of the dialog, on screen without scrolling.
    const key = dialog.getByRole('button', { name: 'Join pilot waitlist' })
    const box = await key.boundingBox()
    expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height)
  })

  test('a stale lazy chunk does not blank the app', async ({ page }) => {
    await open(page, '/')
    await page.route('**/assets/PowerPage-*.js', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html></html>' }))
    await page.getByRole('contentinfo').getByRole('link', { name: 'Power' }).click()
    // Either the one reload brings the page back, or the panel says what happened; never an empty #root.
    await expect(page.locator('#root')).not.toBeEmpty()
    await expect(page.locator('main h1')).toBeVisible({ timeout: 15_000 })
  })

  test('v0.1 API paths redirect to /v1/concept', async ({ request }) => {
    const res = await request.get('/v1/stats', { maxRedirects: 0 })
    expect(res.status()).toBe(308)
    expect(res.headers()['location']).toBe('/v1/concept/stats')
  })
})
