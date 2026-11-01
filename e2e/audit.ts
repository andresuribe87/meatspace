/**
 * Shared page audits for the v0.2 e2e specs (e2e/app.spec.ts, e2e/v02.spec.ts). The palette / faces / radius / shadow
 * rules are the design system's own (the same checks as e2e/design-audit.spec.ts, which runs them on the reference).
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

/** Every SPA route of v0.2, with a stable thing to wait for. */
export const ROUTES: readonly { path: string; ready: string }[] = [
  { path: '/', ready: 'h1' },
  { path: '/reports', ready: 'h1' },
  { path: '/reports/lerobot__svla_so101_pickplace', ready: 'h1' },
  { path: '/reports/CarolinePascal__plug_socket_moved', ready: 'h1' },
  { path: '/reports/siyavash__so101_test', ready: 'h1' },
  { path: '/cells', ready: 'h1' },
  { path: '/power', ready: 'h1' },
  { path: '/docs', ready: 'h1' },
  { path: '/concept', ready: 'h1' },
  { path: '/design', ready: '#ds-voice' },
  { path: '/no-such-page', ready: 'h1' },
]

/** /concept is the labelled simulation and /design shows the concept banner and sample data: both are exempt from the word and number rules. */
export const EXEMPT = new Set(['/concept', '/design'])

const DARK: [number, number, number][] = [
  [9, 10, 12],
  [17, 19, 24],
  [23, 26, 32],
  [34, 38, 48],
  [107, 117, 136],
  [226, 232, 240],
  [136, 147, 162],
  [92, 100, 111],
  [16, 185, 129],
  [245, 158, 11],
  [26, 29, 36],
  [43, 48, 58],
  [0, 162, 206],
  [176, 68, 154],
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
const GRADIENT_OK = '.ruler, .ann--concept, .concept, .ctl select'
const PROSE = '.t-lede, .t-prose, .t-caption, .tlink, figcaption p.t-caption, .co > .bd, .chain p, .dsr-rules p, .dsr-taken p, .dsr-dodont > div, .dsr-check span, .tbl caption'
const MONO_ISLAND = 'code, kbd, samp, pre, .ann, .key, .ref, .t-legend, .h, .num'

/** Closed palette, faces by role, 0 radius, no shadows or blur, gradients only where allowed. Returns violations. */
export async function designAudit(page: Page): Promise<string[]> {
  return page.evaluate(
    ({ DARK, PAPER, GRADIENT_OK, PROSE, MONO_ISLAND }) => {
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
          if (inProse && !sans) out.push(`${desc}: prose role must be Atkinson Hyperlegible Next, got ${cs.fontFamily.slice(0, 40)}`)
          else if (!inProse && !mono) out.push(`${desc}: terminal text must be JetBrains Mono or Martian Mono, got ${cs.fontFamily.slice(0, 40)}`)
        }
      }
      return out
    },
    { DARK, PAPER, GRADIENT_OK, PROSE, MONO_ISLAND },
  )
}

/** axe-core WCAG 2.2 AA; returns a readable summary of violations. */
export async function axe(page: Page): Promise<string[]> {
  const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  // No exemptions: links alone on a preformatted line (the man page's SEE ALSO) are given a 24px target instead.
  return res.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).slice(0, 4).join(' | ')}`)
}

/**
 * Honesty rules on rendered text: outside /concept and /design the concept words never appear; "verified" only inside the
 * n >= 50 rule; "signed" only as "not signed" / "nothing is signed". Returns the offending sentences.
 */
export async function wordAudit(page: Page): Promise<string[]> {
  const text = await page.evaluate(() => document.body.innerText)
  const bad: string[] = []
  const sentences = text.split(/(?<=[.:;!?])\s+|\n+/)
  for (const s of sentences) {
    if (/\b(escrow|USDC|settlement|attestation|TPM|fleet|nodes)\b|our network/i.test(s)) bad.push(s.trim().slice(0, 160))
    if (/\bverified\b/i.test(s) && !/\b50\b/.test(s)) bad.push(s.trim().slice(0, 160))
    if (/\bsigned\b/i.test(s) && !/\b(not signed|nothing is signed)\b/i.test(s)) bad.push(s.trim().slice(0, 160))
  }
  return bad
}

/**
 * Every rendered number carries provenance, and no template braces ship. `bare` catches data-shaped numbers typed
 * outside <Num> (which a `.num` query cannot see): sample sizes ("n = 23"), two-decimal degree readings ("0.68°") and
 * changes with an interval ("−28% ["). Method constants ("last 20%", "±1.0° mask", "95%") are not data and pass, and
 * neither does lab text quoted verbatim under [data-verbatim="<report.json pointer>"].
 */
export async function numberAudit(page: Page): Promise<{ uncal: string[]; braces: boolean; withProv: number; bare: string[] }> {
  return page.evaluate(() => {
    const bare: string[] = []
    const DATA = [/\bn = \d/, /(?<![±\d.])\d+\.\d{2}\s?°/, /[−-]\d+%\s?\[/]
    // [data-verbatim]: lab text quoted as written (the verdict), carrying its own report.json pointer.
    const SKIP = '.num, code, pre, svg, script, style, title, [aria-hidden="true"], .sr, .tip, [data-verbatim]'
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const t = n.textContent ?? ''
      if (!/\d/.test(t)) continue
      const el = n.parentElement
      if (!el || el.closest(SKIP) || el.closest('[hidden]')) continue
      if (DATA.some((re) => re.test(t))) bare.push(t.trim().slice(0, 80))
    }
    return {
      uncal: [...document.querySelectorAll('.num:not([data-prov])')].map((x) => x.textContent ?? ''),
      braces: document.documentElement.outerHTML.includes('{{'),
      withProv: document.querySelectorAll('.num[data-prov]').length,
      bare,
    }
  })
}

export async function noHorizontalScroll(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }))
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
}

/** Load a route and wait for its content, fonts and (where present) the trace plot. */
export async function open(page: Page, path: string, ready = 'h1') {
  await page.goto(path)
  await expect(page.locator(ready).first()).toBeVisible({ timeout: 15_000 })
  await page.evaluate(() => document.fonts.ready)
  // Lazy routes render a busy <main> first, and the report pages wait on their files: audit only the finished page.
  await expect(page.locator('main[aria-busy="true"], main [aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 })
}
