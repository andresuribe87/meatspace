/**
 * Design system audit (meatspace.sh DS v1.0 "Instrument").
 *  1. Pure helpers behind the data-viz and the status vocabulary.
 *  2. The living reference (src/pages/DesignPage.tsx), mounted from src/ds/__harness__.tsx on a Vite dev
 *     server started here (it is not routed in the app yet): closed palette, faces by role, 0 radius, no
 *     shadows, gradients only where allowed, default-deny numbers, axe-core WCAG 2.2 AA at 1440 and 390,
 *     keyboard behaviour of the playheads, tabs and dialog, overflow and reduced motion.
 *  3. Product routes: no unprovenanced number and no template braces ever ship.
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { createServer, type Plugin, type ViteDevServer } from 'vite'

import { apiStatus, CAPABILITIES, CAPABILITY_STATUSES, fromApiStatus, LAMP_KINDS, lampKindOf } from '../shared/status'
import { digitsFor, fmt, fmtElapsed, fmtSigned, MINUS } from '../src/ds/format'
import { comb, contrast, deltaScale, linePath, newcombe, niceStep, step125, timebase, wilson, yScale } from '../src/ds/math'

/* ------------------------------------------------------------------------------------------------ */
/* Shared audit, run in the page. Dark palette everywhere; the paper palette only inside .theme-paper. */

const DARK: [number, number, number][] = [
  [9, 10, 12], // bg carbon
  [17, 19, 24], // panel
  [23, 26, 32], // raised
  [34, 38, 48], // line
  [107, 117, 136], // edge
  [226, 232, 240], // fg
  [136, 147, 162], // muted
  [92, 100, 111], // dim
  [16, 185, 129], // emerald
  [245, 158, 11], // amber
  [26, 29, 36], // grat
  [43, 48, 58], // grat-axis
  [0, 162, 206], // cyan, CH2 stock
  [176, 68, 154], // orchid, CH3 calibrated
]
const PAPER: [number, number, number][] = [
  [243, 241, 236],
  [251, 250, 247],
  [239, 236, 229],
  [217, 214, 206],
  [126, 131, 139],
  [11, 13, 16],
  [95, 101, 112],
  [138, 143, 151],
  [4, 120, 87],
  [146, 64, 14],
  [180, 83, 9],
  [0, 136, 175],
  [169, 9, 89],
  [230, 227, 220],
  [207, 203, 194],
]
/** The only places a background-image may appear: the ruler, the CONCEPT hatch and the select chevron. */
const GRADIENT_OK = '.ruler, .ann--concept, .concept, .ctl select'
/** Prose roles (Atkinson Hyperlegible Next). */
const PROSE = '.t-lede, .t-prose, .t-caption, .tlink, figcaption p.t-caption, .co > .bd, .chain p, .dsr-rules p, .dsr-taken p, .dsr-dodont > div, .dsr-check span, .tbl caption'
/** Terminal islands allowed inside prose. */
const MONO_ISLAND = 'code, kbd, samp, pre, .ann, .key, .ref, .t-legend, .h, .num'

async function designAudit(page: Page, opts: { legacyProse?: string } = {}): Promise<string[]> {
  return page.evaluate(
    ({ DARK, PAPER, GRADIENT_OK, PROSE, MONO_ISLAND, legacyProse }) => {
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
      const ok = (css: string, paper: boolean) => {
        if (!css || css === 'transparent' || css === 'rgba(0, 0, 0, 0)') return true
        const [r, g, b, a] = rgba(css)
        if (a < 0.04) return true
        const tol = Math.min(48, 4 / a)
        const allowed = paper ? [...DARK, ...PAPER] : DARK
        return allowed.some(([R, G, B]) => Math.abs(r - R) <= tol && Math.abs(g - G) <= tol && Math.abs(b - B) <= tol)
      }
      const out: string[] = []
      for (const el of document.querySelectorAll<HTMLElement>('body *')) {
        if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue
        const cs = getComputedStyle(el)
        if (cs.display === 'none') continue
        const paper = !!el.closest('.theme-paper')
        const desc = `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${String(el.className).slice(0, 60)}`
        for (const prop of ['color', 'background-color', 'border-top-color', 'border-bottom-color', 'border-left-color', 'border-right-color', 'outline-color'] as const) {
          const v = cs.getPropertyValue(prop)
          const borderProp = prop.startsWith('border-') ? prop.replace('-color', '-width') : null
          if (borderProp && cs.getPropertyValue(borderProp) === '0px') continue
          if (prop === 'outline-color' && cs.outlineStyle === 'none') continue
          if (!ok(v, paper)) out.push(`${desc}: ${prop} ${v}`)
        }
        for (const corner of ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius']) {
          if (cs.getPropertyValue(corner) !== '0px') out.push(`${desc}: ${corner} ${cs.getPropertyValue(corner)}`)
        }
        if (cs.backgroundImage !== 'none' && !cs.backgroundImage.startsWith('url(') && !el.matches(GRADIENT_OK)) out.push(`${desc}: background-image ${cs.backgroundImage.slice(0, 80)}`)
        if (cs.boxShadow !== 'none') out.push(`${desc}: box-shadow ${cs.boxShadow}`)
        if (cs.textShadow !== 'none') out.push(`${desc}: text-shadow ${cs.textShadow}`)
        if (cs.filter !== 'none' || cs.backdropFilter !== 'none') out.push(`${desc}: filter/blur`)
        const hasOwnText = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim())
        if (hasOwnText) {
          const mono = /JetBrains Mono|Martian Mono/.test(cs.fontFamily)
          const sans = /Atkinson Hyperlegible Next/.test(cs.fontFamily)
          const prose = el.closest(PROSE)
          const island = el.closest(MONO_ISLAND)
          const inProse = !!prose && !(island && prose.contains(island))
          if (legacyProse && el.closest(legacyProse)) {
            if (!sans && el.tagName !== 'CODE') out.push(`${desc}: legacy prose must be sans`)
          } else if (inProse && !sans) out.push(`${desc}: prose role must be Atkinson Hyperlegible Next, got ${cs.fontFamily.slice(0, 40)}`)
          else if (!inProse && !mono) out.push(`${desc}: terminal text must be JetBrains Mono or Martian Mono, got ${cs.fontFamily.slice(0, 40)}`)
        }
      }
      return out
    },
    { DARK, PAPER, GRADIENT_OK, PROSE, MONO_ISLAND, legacyProse: opts.legacyProse ?? '' },
  )
}

/* ------------------------------------------------------------------------------------------------ */

test.describe('design system // pure helpers', () => {
  test('1-2-5 steps and scales that never clip', () => {
    expect(step125(0.9967)).toBe(1)
    expect(step125(1.2)).toBe(2)
    expect(step125(3)).toBe(5)
    expect(step125(7)).toBe(10)
    expect(step125(0.03)).toBeCloseTo(0.05)
    expect(niceStep(80, 8)).toBe(10)
    for (const [lo, hi, divs] of [
      [-97.3, -28.1, 8],
      [0.2, 0.31, 4],
      [-21.4, 26.9, 4],
      [3, 3, 8],
    ] as const) {
      const s = yScale(lo, hi, divs)
      expect(s.min).toBeLessThanOrEqual(lo)
      expect(s.max).toBeGreaterThanOrEqual(hi)
      expect(step125(s.step)).toBeCloseTo(s.step)
    }
    const d = deltaScale(5.9, 3, 1)
    expect(d.lim).toBeGreaterThanOrEqual(5.9 * 1.06)
    expect(d.lim).toBe(d.step * 3)
    expect(deltaScale(0.2, 1, 1).lim).toBeGreaterThanOrEqual(1)
    // Change the timebase, not the signal: 10 s at 10 divisions is 1 s/div; at 5 divisions it doubles.
    expect(timebase(300, 30, 10).sPerDiv).toBe(1)
    expect(timebase(300, 30, 5).sPerDiv).toBe(2)
    expect(digitsFor(0.25)).toBe(2)
  })

  test('gap comb ticks only outside the mask, at most one per 3 px', () => {
    const ref = Array.from({ length: 100 }, () => 0)
    const a = Array.from({ length: 100 }, (_, i) => (i >= 50 ? 2 : 0.5))
    const ticks = comb(a, ref, 1, 1)
    expect(ticks.every(([i]) => i >= 50)).toBe(true)
    expect(ticks.length).toBe(17) // stride 3 over frames 51..99, starting at a multiple of 3
    expect(comb(a, ref, 1, 10).length).toBe(50)
  })

  test('long traces decimate per pixel column without losing peaks', () => {
    const n = 20000
    const v = Array.from({ length: n }, (_, i) => (i === 12345 ? 99 : Math.sin(i / 50)))
    const d = linePath(n, (i) => v[i], (i) => (i / (n - 1)) * 400, (y) => 100 - y)
    expect(d.split(/[ML]/).length).toBeLessThan(1700)
    expect(d).toContain(' 1.0') // y(99) = 1.0: the spike survives
  })

  test('number formatting: true minus on screen, ASCII when copied', () => {
    expect(fmt(-79, 0)).toBe(`${MINUS}79`)
    expect(fmt(-79, 0, true)).toBe('-79')
    expect(fmt(-0.001, 2)).toBe('0.00')
    expect(fmtSigned(0.73)).toBe('+0.73')
    expect(fmtSigned(-1.5, 1)).toBe(`${MINUS}1.5`)
    expect(fmtElapsed(1240)).toBe('T+00:01.24')
    expect(contrast('#e2e8f0', '#090a0c')).toBeCloseTo(16.07, 1)
    expect(contrast('#8893a2', '#171a20')).toBeGreaterThanOrEqual(4.5)
    expect(contrast('#6b7588', '#171a20')).toBeGreaterThanOrEqual(3)
  })

  test('Wilson and Newcombe intervals', () => {
    const [lo, hi] = wilson(144, 200)
    expect(lo).toBeCloseTo(0.654, 2)
    expect(hi).toBeCloseTo(0.777, 2)
    const r = wilson(116, 200)
    const [dd, dlo, dhi] = newcombe(0.58, r, 0.72, [lo, hi])
    expect(dd).toBeCloseTo(-0.14, 5)
    expect(dlo).toBeLessThan(dd)
    expect(dhi).toBeGreaterThan(dd)
    expect(dhi).toBeLessThan(0)
  })

  test('status vocabulary is closed and round-trips through the API form', () => {
    expect([...CAPABILITY_STATUSES]).toEqual(['LIVE', 'PREVIEW', 'PLANNED', 'WAITLIST', 'ON REQUEST', 'CONCEPT', 'REFUSED'])
    for (const s of CAPABILITY_STATUSES) {
      expect(fromApiStatus(apiStatus(s))).toBe(s)
      expect(LAMP_KINDS).toContain(lampKindOf(s))
    }
    expect(apiStatus('ON REQUEST')).toBe('on_request')
    expect(lampKindOf('MARGINAL')).toBe('gap')
    expect(lampKindOf('UNCAL')).toBe('uncal')
    // Nothing is LIVE until it works at that URL; the Twin Gap Report stays PREVIEW until v1 is published.
    expect(CAPABILITIES.find((c) => c.part === 'MS-TGR-1')?.status).toBe('PREVIEW')
  })
})

/* ------------------------------------------------------------------------------------------------ */

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Design reference</title></head><body><div id="root"></div><script type="module" src="/src/ds/__harness__.tsx"></script></body></html>`

let server: ViteDevServer | undefined
let designUrl = ''

async function openReference(page: Page, width = 1440): Promise<string[]> {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setViewportSize({ width, height: 900 })
  await page.goto(designUrl)
  await expect(page.locator('#ds-voice')).toBeVisible({ timeout: 20_000 })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(150)
  return errors
}

test.describe('design system // reference page', () => {
  test.describe.configure({ timeout: 90_000 })

  test.beforeAll(async () => {
    const harness: Plugin = {
      name: 'ds-harness',
      configureServer(s) {
        s.middlewares.use(async (req, res, next) => {
          if (req.url !== '/__design') return next()
          res.setHeader('content-type', 'text/html')
          res.end(await s.transformIndexHtml('/__design', HTML))
        })
      },
    }
    server = await createServer({
      root: ROOT,
      configFile: false,
      plugins: [react(), tailwindcss(), harness],
      cacheDir: 'node_modules/.vite-design-audit',
      optimizeDeps: { include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'], noDiscovery: true },
      server: { port: 5299, strictPort: false, host: '127.0.0.1' },
      logLevel: 'error',
      clearScreen: false,
    })
    await server.listen()
    designUrl = `${server.resolvedUrls!.local[0]}__design`
  })

  test.afterAll(async () => {
    await server?.close()
  })

  test('renders every section, loads only first-party fonts and logs no errors', async ({ page }) => {
    const errors = await openReference(page)
    for (const id of ['ds-system', 'ds-tokens', 'ds-components', 'ds-dataviz', 'ds-voice']) await expect(page.locator(`#${id}`)).toBeVisible()
    const fonts = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family))
    expect(fonts).toEqual(expect.arrayContaining(['JetBrains Mono Variable', 'Martian Mono Variable', 'Atkinson Hyperlegible Next Variable']))
    expect(await page.content()).not.toContain('{{')
    expect(errors).toEqual([])
  })

  for (const width of [1440, 390]) {
    test(`closed palette, faces by role, 0 radius, no shadows, gradients only where allowed at ${width}`, async ({ page }) => {
      await openReference(page, width)
      expect(await designAudit(page)).toEqual([])
    })

    test(`axe-core WCAG 2.2 AA at ${width}`, async ({ page }) => {
      await openReference(page, width)
      const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
      const summary = res.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).slice(0, 4).join(' | ')}`)
      expect(summary).toEqual([])
    })
  }

  test('default-deny numbers: every UNCAL number sits in a panel with exactly one UNCAL lamp', async ({ page }) => {
    await openReference(page)
    const report = await page.evaluate(() => {
      const SCOPE = '.pnl, .fig, .dsr-cell'
      const bad: string[] = []
      const nums = [...document.querySelectorAll<HTMLElement>('.num')]
      for (const n of nums) {
        if (n.hasAttribute('data-prov')) {
          if (!n.getAttribute('data-prov')!.trim()) bad.push(`empty data-prov: ${n.textContent}`)
          continue
        }
        const scope = n.closest(SCOPE)
        if (!scope) bad.push(`UNCAL number outside any panel: ${n.textContent}`)
        else if (![...scope.querySelectorAll('.ann--uncal')].some((l) => l.closest(SCOPE) === scope)) bad.push(`UNCAL number in a panel without an UNCAL lamp: ${n.textContent}`)
      }
      for (const scope of document.querySelectorAll(SCOPE)) {
        const own = [...scope.querySelectorAll('.ann--uncal')].filter((l) => l.closest(SCOPE) === scope)
        if (own.length > 1) bad.push(`${own.length} UNCAL lamps in one panel: ${scope.textContent?.slice(0, 60)}`)
      }
      return { bad, uncal: nums.filter((n) => !n.hasAttribute('data-prov')).length, prov: nums.filter((n) => n.hasAttribute('data-prov')).length }
    })
    expect(report.bad).toEqual([])
    // Sample data renders UNCAL by construction; the ratios computed from the live tokens carry provenance.
    expect(report.uncal).toBeGreaterThan(20)
    expect(report.prov).toBeGreaterThan(20)
  })

  test('no horizontal page scroll at 390; scroll boxes that overflow are focusable and named', async ({ page }) => {
    await openReference(page, 390)
    const r = await page.evaluate(() => {
      const bad: string[] = []
      for (const el of document.querySelectorAll<HTMLElement>('.tbl-wrap, pre, .con-log, .cmdline')) {
        if (el.scrollWidth <= el.clientWidth + 1) continue
        if (el.tabIndex !== 0 || !el.getAttribute('aria-label')) bad.push(`${el.className}: overflows but is not focusable and named`)
      }
      return { scrollW: document.documentElement.scrollWidth, W: window.innerWidth, bad }
    })
    expect(r.scrollW).toBeLessThanOrEqual(r.W)
    expect(r.bad).toEqual([])
  })

  test('scope playhead is a keyboard slider whose value text reads every channel', async ({ page }) => {
    await openReference(page)
    const slider = page.getByRole('slider', { name: 'Playhead, shoulder_lift, held-out ep 07' })
    await slider.focus()
    await expect(slider).toHaveAttribute('aria-valuenow', '150')
    await page.keyboard.press('ArrowRight')
    await expect(slider).toHaveAttribute('aria-valuenow', '151')
    await page.keyboard.press('Shift+ArrowRight')
    await expect(slider).toHaveAttribute('aria-valuenow', '166')
    await page.keyboard.press('PageUp')
    await expect(slider).toHaveAttribute('aria-valuenow', '196')
    await page.keyboard.press('End')
    await expect(slider).toHaveAttribute('aria-valuenow', '299')
    await page.keyboard.press('Home')
    await expect(slider).toHaveAttribute('aria-valuenow', '0')
    const text = await slider.getAttribute('aria-valuetext')
    expect(text).toMatch(/^t 0\.00 s, frame 0; real .+ degrees; stock .+, delta .+; calibrated .+, delta .+$/)
    // The tooltip shows on focus.
    await expect(page.locator('.scope .tip')).toBeVisible()
    const box = await slider.boundingBox()
    const ring = await slider.evaluate((el) => getComputedStyle(el).outlineWidth)
    expect(box!.width).toBeGreaterThan(300)
    expect(ring).toBe('2px')
  })

  test('small multiples share one playhead that reads every joint; joint tabs rove on phones', async ({ page }) => {
    await openReference(page)
    const slider = page.getByRole('slider', { name: /all joints/ })
    await slider.focus()
    await page.keyboard.press('ArrowLeft')
    await expect(slider).toHaveAttribute('aria-valuenow', '122')
    const text = (await slider.getAttribute('aria-valuetext')) ?? ''
    for (const j of ['shoulder_pan', 'shoulder_lift', 'elbow_flex', 'wrist_flex', 'wrist_roll']) expect(text).toContain(`${j}: real`)

    await page.setViewportSize({ width: 390, height: 844 })
    const tabs = page.getByRole('tablist', { name: 'Joint' })
    await expect(tabs).toBeVisible()
    const selected = tabs.getByRole('tab', { selected: true })
    await expect(selected).toHaveText('shoulder_lift')
    await selected.focus()
    await page.keyboard.press('ArrowRight')
    await expect(tabs.getByRole('tab', { selected: true })).toHaveText('elbow_flex')
    await expect(tabs.getByRole('tab', { name: 'elbow_flex' })).toBeFocused()
    expect(await tabs.locator('[role=tab][tabindex="0"]').count()).toBe(1)
  })

  test('tabs rove with arrow keys, Home and End', async ({ page }) => {
    await openReference(page)
    const list = page.getByRole('tablist', { name: 'Split' })
    await list.getByRole('tab', { selected: true }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(list.getByRole('tab', { selected: true })).toContainText('train')
    await page.keyboard.press('End')
    await expect(list.getByRole('tab', { selected: true })).toContainText('parameters')
    await expect(page.getByRole('tabpanel')).toContainText('kp, kv')
    await page.keyboard.press('Home')
    await expect(list.getByRole('tab', { selected: true })).toContainText('held-out')
    expect(await list.locator('[role=tab][tabindex="0"]').count()).toBe(1)
  })

  test('dialog is native, closes on Esc and returns focus to the opener', async ({ page }) => {
    await openReference(page)
    const opener = page.getByRole('button', { name: 'Request a pilot' })
    await opener.click()
    const dialog = page.getByRole('dialog', { name: /request \/\/ real-robot pilot/i })
    await expect(dialog).toBeVisible()
    expect(await dialog.evaluate((d) => d.tagName === 'DIALOG' && (d as HTMLDialogElement).open)).toBe(true)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(opener).toBeFocused()
  })

  test('every figure has a table view toggled by an aria-pressed key', async ({ page }) => {
    await openReference(page)
    for (const name of [/Fig 1/, /Fig 2/, /Fig 3/]) {
      const fig = page.getByRole('figure', { name }).first()
      const key = fig.getByRole('button', { name: 'Table' })
      await key.click()
      await expect(fig.getByRole('button', { name: 'Chart' })).toHaveAttribute('aria-pressed', 'true')
      await expect(fig.locator('table')).toBeVisible()
    }
  })

  test('busy keys show elapsed time, never a spinner; reduced motion stops the armed lamp', async ({ page }) => {
    await openReference(page)
    const run = page.getByRole('button', { name: /Run preflight/ })
    await run.click()
    const busy = page.locator('.key[aria-busy="true"]').first()
    await expect(busy).toContainText(/Running/)
    await expect(busy.locator('.t')).toHaveText(/^T\+\d\d:\d\d\.\d\d$/)
    await expect(busy.locator('.t')).toHaveAttribute('aria-hidden', 'true')
    expect(await page.locator('[role=progressbar], .spinner, [class*=spin]').count()).toBe(0)

    const armed = page.locator('.ann--armed').first()
    expect(await armed.evaluate((el) => getComputedStyle(el, '::before').animationName)).toBe('blink')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(await armed.evaluate((el) => getComputedStyle(el, '::before').animationName)).toBe('none')
  })
})

/* ------------------------------------------------------------------------------------------------ */

test.describe('design system // product routes', () => {
  for (const path of ['/', '/docs']) {
    test(`no unprovenanced number and no template braces on ${path}`, async ({ page }) => {
      await page.goto(path)
      await expect(page.locator('#main')).toBeVisible()
      const r = await page.evaluate(() => ({
        uncal: [...document.querySelectorAll('.num:not([data-prov])')].map((n) => n.textContent),
        braces: document.documentElement.outerHTML.includes('{{'),
      }))
      expect(r.uncal).toEqual([])
      expect(r.braces).toBe(false)
    })
  }
})
