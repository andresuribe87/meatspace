import { expect, test, type Page } from '@playwright/test'

const VALUE_PROP =
  'Autonomous hardware sits idle in proprietary silos for most of its lifecycle, while software agents have zero native way to discover, rent, or task physical machines across vendor boundaries. meatspace.sh exposes idle robots and autonomous fleets as pay-per-minute API endpoints, handling cross-vendor command translation, safety sandboxing, and cryptographic proof of execution in a single call.'
const INSTALL_CMD = 'curl -sSL https://meatspace.sh/install.sh | sudo sh -s -- --protocol=mavlink --rtk-verify'
const TICKER_RE =
  /ACTIVE NODES: [\d,]+ \| AVAILABLE FLIGHT\/ACTUATION HRS: [\d,]+\.\d \| 24H SETTLED VOLUME: \$[\d,]+ USDC \| NETWORK LATENCY: \d+ms/

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
  await page.setExtraHTTPHeaders({ 'cf-connecting-ip': `10.0.${Math.floor(client / 250)}.${client % 250}` })
})

async function noHorizontalScroll(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
}

test.describe('zone A // status bar', () => {
  test('brand, live ticker and nav buttons', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('meatspace.sh', { exact: false }).first()).toBeVisible()
    await expect(page.getByText('// v0.1.4-alpha').first()).toBeVisible()
    const banner = page.getByRole('banner').first()
    await expect(banner).toContainText(TICKER_RE)
    for (const name of ['DOCS', 'CONNECT HARDWARE (meatspaced)', 'API KEYS']) {
      await expect(banner.getByRole('button', { name: new RegExp(`^\\[?\\s*${name.replace(/[()]/g, '\\$&')}\\s*\\]?$`) })).toBeVisible()
    }
    await expect(banner).toContainText('LIVE', { timeout: 10_000 })
  })
})

test.describe('zone B // thesis + install', () => {
  test('exact copy and one-click install copy', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^stdout to reality\.\s*$/)
    await expect(page.getByText('dispatch tasks to physical hardware.').first()).toBeVisible()
    const prop = page.locator('p', { hasText: 'Autonomous hardware sits idle' })
    await expect(prop).toHaveText(VALUE_PROP)
    await expect(page.getByText('# Register idle ROS 2 / MAVLink hardware node to the clearinghouse')).toBeVisible()
    await expect(page.getByText(INSTALL_CMD).first()).toBeVisible()
    await page.getByRole('button', { name: /copy/i }).first().click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(INSTALL_CMD)
  })
})

test.describe('zone B // dispatch console', () => {
  test('default sortie reproduces the handoff state machine, then the node is locked', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('tab', { name: /AERIAL_ISR_SORTIE/ })).toHaveAttribute('aria-selected', 'true')
    await execute(page).click()
    const log = consoleLog(page)
    await expect(log).toContainText('00ms')
    await expect(log).toContainText('Validating GeoJSON polygon against node firmware geofence...')
    await expect(log).toContainText('PASS')
    await expect(log).toContainText('Locking escrow ($42.50 USDC) & bidding on Node VTOL-260-TX-04...')
    await expect(log).toContainText('ACCEPTED')
    await expect(log).toContainText('Compiling intent to MAVLink waypoint primitive...')
    await expect(log).toContainText('DISPATCHED')
    await expect(log).toContainText(/Returning TPM-signed telemetry stream hash \(0x[0-9a-f]{4}\.\.\.[0-9a-f]{4}\)\./)
    for (const t of ['00ms', '140ms', '380ms', '800ms']) await expect(log).toContainText(t)

    // Node lock propagates to the orderbook for every viewer.
    await expect(row(page, 'VTOL-260-TX-04')).toContainText('TASKED', { timeout: 6_000 })

    // Re-dispatching the same node is rejected at ESCROW.
    await expect(execute(page)).toBeEnabled()
    await execute(page).click()
    await expect(log).toContainText('REJECTED')
    await expect(log).toContainText('ERR_NODE_BUSY')
  })

  test('client-side invalid JSON never hits the API', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /EDIT JSON/ }).click()
    const editor = page.getByRole('textbox').first()
    await editor.fill('{ "primitive": ')
    await execute(page).click()
    await expect(consoleLog(page)).toContainText('ERR_INVALID_JSON')
  })
})

test.describe('zone C // orderbook', () => {
  test('category filters', async ({ page }) => {
    await page.goto('/')
    const rows = orderbook(page).locator('tbody tr')
    await expect(rows).toHaveCount(10)
    const counts: [RegExp, number][] = [
      [/Aerial\/VTOL/, 4],
      [/Ground\/Rover/, 3],
      [/Manipulator\/CNC/, 3],
      [/^\[?\s*All/, 10],
    ]
    for (const [name, n] of counts) {
      await orderbook(page).getByRole('button', { name }).click()
      await expect(rows).toHaveCount(n)
    }
  })

  test('columns match the handoff', async ({ page }) => {
    await page.goto('/')
    const headers = (await orderbook(page).locator('thead th').allInnerTexts()).map((h) => h.trim())
    expect(headers).toEqual([
      'NODE_ID',
      'CHASSIS_CLASS',
      'INTERFACE',
      'COORDINATES /SECTOR',
      'PAYLOAD / SENSORS',
      'BATTERY / DUTY',
      'SPOT_RATE',
      'ACTION',
    ])
    await expect(row(page, 'SPOT-SUB-44')).toContainText('29.7310° N, 95.2010° W')
    await expect(row(page, 'SPOT-SUB-44')).toContainText('[Houston Ship Channel]')
    await expect(row(page, 'SPOT-SUB-44')).toContainText('$1.85 / min')
  })

  test('[ TASK NODE ] loads the node into the matching console tab and executes', async ({ page }) => {
    await page.goto('/')
    await row(page, 'SPOT-SUB-44').getByRole('button', { name: /TASK NODE/ }).click()
    await expect(page.getByRole('tab', { name: /SUBSTATION_THERMAL_SWEEP/ })).toHaveAttribute('aria-selected', 'true')
    const panel = page.getByRole('tabpanel')
    await expect(panel).toContainText('"node_id": "SPOT-SUB-44"')
    await expect(panel).toContainText('[-95.201, 29.731]')
    await expect(row(page, 'SPOT-SUB-44')).toHaveAttribute('aria-current', 'true')
    await execute(page).click()
    const log = consoleLog(page)
    await expect(log).toContainText('Validating GeoJSON point against node firmware geofence...')
    await expect(log).toContainText('Locking escrow ($33.30 USDC) & bidding on Node SPOT-SUB-44...')
    await expect(log).toContainText('Compiling intent to ROS 2 action goal...')
    await expect(log).toContainText(/Returning TPM-signed telemetry stream hash/)

    await row(page, 'ARM-CELL-12').getByRole('button', { name: /TASK NODE/ }).click()
    await expect(page.getByRole('tab', { name: /AUTOMATED_CNC_SYNTHESIS/ })).toHaveAttribute('aria-selected', 'true')
    await expect(consoleLog(page)).not.toContainText('SPOT-SUB-44')
    await execute(page).click()
    await expect(consoleLog(page)).toContainText('Locking escrow ($37.80 USDC) & bidding on Node ARM-CELL-12...')
    await expect(consoleLog(page)).toContainText('ACCEPTED')
    await expect(consoleLog(page)).toContainText(/Returning TPM-signed telemetry stream hash/)
  })

  test('one client holds at most 2 task locks; the third is rejected at ESCROW', async ({ page }) => {
    await page.goto('/')
    for (const id of ['ORK-VTOL-09', 'QDR-B2-17']) {
      await row(page, id).getByRole('button', { name: /TASK NODE/ }).click()
      await execute(page).click()
      await expect(consoleLog(page)).toContainText(/Returning TPM-signed telemetry stream hash/)
    }
    await row(page, 'CNC-5AX-03').getByRole('button', { name: /TASK NODE/ }).click()
    await execute(page).click()
    await expect(consoleLog(page)).toContainText('REJECTED')
    await expect(consoleLog(page)).toContainText('ERR_LOCK_QUOTA')
    await expect(row(page, 'CNC-5AX-03').getByRole('button', { name: /TASK NODE/ })).toBeEnabled()
  })
})

test.describe('zone D // architecture strip', () => {
  test('three boxes with verbatim copy', async ({ page }) => {
    await page.goto('/')
    for (const text of [
      'Translates high-level agent JSON schemas (SCAN_CORRIDOR, INSPECT_ASSET) into deterministic MAVLink waypoints and ROS 2 action goals without exposing raw actuator controls.',
      'Enforces hard local geofences, minimum altitude floors, and battery RTL reserves at the edge daemon (meatspaced) before motor spin-up.',
      'Hardware TPM cryptographic signatures attached to raw MCAP/ROS bags, RTK-GPS flight logs, and sensor frames to guarantee zero synthetic spoofing.',
    ]) {
      await expect(page.getByText(text, { exact: true })).toBeVisible()
    }
  })
})

test.describe('docs, installer, waitlist', () => {
  test('docs route and plain-text man page', async ({ page, request }) => {
    await page.goto('/')
    await page.getByRole('banner').getByRole('button', { name: /DOCS/ }).click()
    await expect(page).toHaveURL(/\/docs$/)
    await expect(page.getByText('MEATSPACE(1)').first()).toBeVisible()
    await page.goto('/docs')
    await expect(page.getByText('MEATSPACE(1)').first()).toBeVisible()
    const txt = await request.get('/docs', { headers: { accept: '*/*' } })
    expect(txt.headers()['content-type']).toContain('text/plain')
    expect(await txt.text()).toContain('MEATSPACE(1)')
  })

  test('install.sh is served as inert text', async ({ request }) => {
    const res = await request.get('/install.sh')
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('text/plain')
    const body = await res.text()
    expect(body.startsWith('#!/bin/sh')).toBe(true)
    expect(body).toContain('meatspaced')
  })

  test('API KEYS waitlist round-trip and #connect deep link', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('banner').getByRole('button', { name: /API KEYS/ }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByLabel(/email/i).fill(`e2e+${Date.now()}@example.com`)
    await dialog.getByRole('button', { name: /REQUEST KEY/ }).click()
    await expect(dialog).toContainText(/queued/i)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()

    await page.goto('/#connect')
    await expect(page.getByRole('dialog')).toContainText(/CONNECT HARDWARE/i)
  })
})

test.describe('design system audit', () => {
  test('closed palette, faces by role, 0px radius, gradients only where allowed, no shadows', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('banner').first()).toContainText('LIVE', { timeout: 10_000 })
    const violations = await page.evaluate(() => {
      // Design system v1.0 "Instrument" closed palette (src/index.css). #64748B muted is gone (3.90 on panel).
      const ALLOWED = [
        [9, 10, 12], // bg carbon
        [17, 19, 24], // panel
        [23, 26, 32], // raised
        [34, 38, 48], // line (structure only)
        [107, 117, 136], // edge (control boundary)
        [226, 232, 240], // fg
        [136, 147, 162], // muted
        [92, 100, 111], // dim (disabled, decoration)
        [16, 185, 129], // emerald
        [245, 158, 11], // amber
        [26, 29, 36], // grat
        [43, 48, 58], // grat-axis
        [0, 162, 206], // cyan, CH2 stock (data only)
        [176, 68, 154], // orchid, CH3 calibrated (data only)
      ]
      // background-image only on the ruler, the CONCEPT hatch and the select chevron.
      const GRADIENT_OK = '.ruler, .ann--concept, .concept, .ctl select'
      // Prose roles are Atkinson Hyperlegible Next; terminal islands inside prose stay mono.
      const PROSE = '.t-lede, .t-prose, .t-caption, .tlink, .co > .bd, .chain p, .tbl caption'
      const MONO_ISLAND = 'code, kbd, samp, pre, .ann, .key, .ref, .t-legend, .num'
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 1
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      const rgba = (css: string): [number, number, number, number] => {
        ctx.clearRect(0, 0, 1, 1)
        ctx.fillStyle = '#000'
        ctx.fillStyle = css
        ctx.fillRect(0, 0, 1, 1)
        const d = ctx.getImageData(0, 0, 1, 1).data
        return [d[0], d[1], d[2], d[3] / 255]
      }
      const ok = (css: string) => {
        if (!css || css === 'transparent' || css === 'rgba(0, 0, 0, 0)') return true
        const [r, g, b, a] = rgba(css)
        if (a < 0.04) return true
        const tol = Math.min(48, 4 / a)
        return ALLOWED.some(([R, G, B]) => Math.abs(r - R) <= tol && Math.abs(g - G) <= tol && Math.abs(b - B) <= tol)
      }
      const valueProp = [...document.querySelectorAll('p')].find((p) => p.textContent?.startsWith('Autonomous hardware sits idle'))
      const out: string[] = []
      for (const el of document.querySelectorAll<HTMLElement>('body *')) {
        if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue
        const cs = getComputedStyle(el)
        if (cs.display === 'none') continue
        const desc = `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${String(el.className).slice(0, 60)}`
        for (const prop of ['color', 'background-color', 'border-top-color', 'border-bottom-color', 'border-left-color', 'border-right-color', 'outline-color'] as const) {
          const v = cs.getPropertyValue(prop)
          const borderProp = prop.startsWith('border-') ? prop.replace('-color', '-width') : null
          if (borderProp && cs.getPropertyValue(borderProp) === '0px') continue
          if (prop === 'outline-color' && cs.outlineStyle === 'none') continue
          if (!ok(v)) out.push(`${desc}: ${prop} ${v}`)
        }
        for (const corner of ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius']) {
          if (cs.getPropertyValue(corner) !== '0px') out.push(`${desc}: ${corner} ${cs.getPropertyValue(corner)}`)
        }
        if (cs.backgroundImage !== 'none' && !cs.backgroundImage.startsWith('url(') && !el.matches(GRADIENT_OK)) out.push(`${desc}: background-image ${cs.backgroundImage}`)
        if (cs.boxShadow !== 'none') out.push(`${desc}: box-shadow ${cs.boxShadow}`)
        if (cs.textShadow !== 'none') out.push(`${desc}: text-shadow ${cs.textShadow}`)
        const hasOwnText = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim())
        if (hasOwnText) {
          const mono = /JetBrains Mono|Martian Mono/.test(cs.fontFamily)
          const sans = /Atkinson Hyperlegible Next/.test(cs.fontFamily)
          const prose = el.closest(PROSE)
          const island = el.closest(MONO_ISLAND)
          // v0.1 value prop: prose without a role class until the v0.2 hero replaces it.
          const inProp = valueProp?.contains(el) ?? false
          const isCode = el.tagName === 'CODE'
          if (inProp) {
            if (!isCode && !sans) out.push(`${desc}: value prop must be Atkinson Hyperlegible Next`)
          } else if (prose && !(island && prose.contains(island))) {
            if (!sans) out.push(`${desc}: prose role must be Atkinson Hyperlegible Next, got ${cs.fontFamily}`)
          } else if (!mono) out.push(`${desc}: font-family ${cs.fontFamily}`)
        }
      }
      return out
    })
    expect(violations).toEqual([])
  })
})

test.describe('responsive @mobile', () => {
  test('status bar keeps the exact handoff labels on phones @mobile', async ({ page }) => {
    await page.goto('/')
    const labels = (await page.getByRole('banner').getByRole('button').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim())
    expect(labels).toEqual(['[ DOCS ]', '[ CONNECT HARDWARE (meatspaced) ]', '[ API KEYS ]'])
  })

  test('no horizontal page scroll on home and docs @mobile', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await noHorizontalScroll(page)
    await page.goto('/docs')
    await expect(page.getByText('MEATSPACE(1)').first()).toBeVisible()
    await noHorizontalScroll(page)
  })

  test('task node from the table on a phone @mobile', async ({ page }) => {
    await page.goto('/')
    await row(page, 'AMR-V50-08').getByRole('button', { name: /TASK NODE/ }).click()
    await expect(page.getByRole('tab', { name: /SUBSTATION_THERMAL_SWEEP/ })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tabpanel')).toContainText('"node_id": "AMR-V50-08"')
    await noHorizontalScroll(page)
  })
})
