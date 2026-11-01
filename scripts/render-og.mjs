#!/usr/bin/env node
/**
 * Regenerates the raster brand assets in public/ with headless Chromium:
 *
 *   public/og.png                1200x630  Open Graph / Twitter card, from scripts/og.html (design system "Instrument").
 *                                          Every number and the trace on it come from lab/reports: the future-block
 *                                          table of lab/reports/INDEX.md and the hero report's trace.json. None is typed.
 *   public/apple-touch-icon.png  180x180   the favicon's ">_" glyph, unframed (iOS applies its own mask)
 *   public/favicon.ico           16/32/48  PNG-in-ICO fallback for clients that ignore the SVG icon
 *
 * public/favicon.svg is the source of truth for the glyph. Fonts are the self-hosted files in public/fonts.
 *
 *   node scripts/render-og.mjs
 *
 * Uses @playwright/test's Chromium (already a devDependency); it needs a Chromium build
 * (`npx playwright install chromium`, or PLAYWRIGHT_BROWSERS_PATH pointing at one).
 */
import { readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { chromium } from '@playwright/test'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = join(ROOT, 'public')
const OG_HTML = join(ROOT, 'scripts', 'og.html')
const FAVICON_SVG = join(PUBLIC, 'favicon.svg')

const BG = '#090A0C'
const EMERALD = '#10B981'
const OG_MAX_BYTES = 300 * 1024
const ICO_SIZES = [16, 32, 48]

const REPORTS = join(ROOT, 'lab', 'reports')
/** The hero: the official LeRobot SO-101 dataset (chosen for that reason, as on the home page). */
const HERO = 'lerobot/svla_so101_pickplace'
const HERO_JOINT = 'shoulder_lift'
const MINUS = '\u2212'

/** Rows of the markdown table under `## <heading>` in INDEX.md, as arrays of cell strings. */
function tableRows(md, heading) {
  const start = md.indexOf(`## ${heading}`)
  if (start < 0) throw new Error(`lab/reports/INDEX.md: no "## ${heading}" section`)
  const rest = md.slice(start).split('\n').slice(1)
  const out = []
  let seen = false
  for (const line of rest) {
    if (line.startsWith('## ')) break
    if (!line.startsWith('| ')) {
      if (seen && line.trim() === '') break
      continue
    }
    seen = true
    if (/^\|\s*-/.test(line) || /^\|\s*dataset\s*\|/.test(line)) continue
    out.push(line.split('|').slice(1, -1).map((c) => c.trim()))
  }
  return out
}

/** "-91% [-92, -91]" or "5.35 [5.14, 5.54]" -> { v: "−91", ci: "[−92, −91]" } (true minus on the card). */
function reading(cell) {
  const m = /^([+-]?[\d.]+)%?\s*\[([+-]?[\d.]+),\s*([+-]?[\d.]+)\]$/.exec(cell)
  if (!m) throw new Error(`INDEX.md: cannot read "${cell}" as value [lo, hi]`)
  const t = (x) => x.replace(/^-/, MINUS)
  return { v: t(m[1]), ci: `[${t(m[2])}, ${t(m[3])}]` }
}

/** Card facts from INDEX.md (future block) and the hero's trace.json. */
async function cardData() {
  const md = await readFile(join(REPORTS, 'INDEX.md'), 'utf8')
  const ok = tableRows(md, 'Future block')
  const refused = tableRows(md, 'Run but not reported')
  const name = (row) => /^\[([^\]]+)\]\(([^/)]+)\//.exec(row[0])
  const hero = ok.find((r) => name(r)?.[1] === HERO)
  if (!hero) throw new Error(`INDEX.md: ${HERO} is not in the future-block table`)
  const id = name(hero)[2]
  const [, , , , eps, stock, , , cal, , vsBase] = hero
  const n = eps.split('/')[2]
  const trace = JSON.parse(await readFile(join(REPORTS, id, 'trace.json'), 'utf8'))
  const series = trace.series?.[HERO_JOINT]
  if (!series) throw new Error(`${id}/trace.json: no series for ${HERO_JOINT}`)
  const s = reading(stock)
  const c = reading(cal)
  // The card's third reading is the change against the physics-free lag filter, not against stock: −91% vs stock is
  // the best of all 18 reports, and a share must not read as "calibration cuts error 91%". Ranges vs stock per robot
  // go in the footer, so the SO-100 results (down to no clear change) travel with the card.
  const d = reading(vsBase)
  const ranges = {}
  for (const row of ok) {
    const v = Number(/^([+-]?\d+)%/.exec(row[9])?.[1])
    if (!Number.isFinite(v)) throw new Error(`INDEX.md: cannot read the change vs stock of ${row[0]}`)
    const r = (ranges[row[1]] ??= { min: v, max: v })
    r.min = Math.min(r.min, v)
    r.max = Math.max(r.max, v)
  }
  const fmtPct = (v) => (v > 0 ? `+${v}` : v < 0 ? `${MINUS}${-v}` : '0')
  const range = (twin) => {
    if (!ranges[twin]) throw new Error(`INDEX.md: no future-block rows for ${twin}`)
    return `${fmtPct(ranges[twin].min)} to ${fmtPct(ranges[twin].max)}%`
  }
  return {
    text: {
      dataset: HERO,
      twin: hero[1],
      episode: `held-out ep ${String(trace.episode.index).padStart(2, '0')}`,
      joint: HERO_JOINT,
      stock: s.v,
      stock_ci: s.ci,
      cal: c.v,
      cal_ci: c.ci,
      change: d.v,
      change_ci: d.ci,
      n,
      n_ok: String(ok.length),
      n_refused: String(refused.length),
      n_run: String(ok.length + refused.length),
      range_so101: range('robotstudio_so101'),
      range_so100: range('trs_so_arm100'),
    },
    series: { real: series.real, stock: series.stock, cal: series.cal },
  }
}

/** 1-2-5 step at or above `raw`. */
function step125(raw) {
  const p = 10 ** Math.floor(Math.log10(raw))
  for (const m of [1, 2, 5, 10]) if (m * p >= raw) return m * p
  return 10 * p
}

/** Pack PNG images into a .ico container (PNG payloads are valid ICO entries on every current platform). */
function packIco(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(images.length, 4)
  const entries = []
  let offset = header.length + 16 * images.length
  for (const { size, png } of images) {
    const e = Buffer.alloc(16)
    e.writeUInt8(size >= 256 ? 0 : size, 0) // width (0 = 256)
    e.writeUInt8(size >= 256 ? 0 : size, 1) // height
    e.writeUInt8(0, 2) // palette size
    e.writeUInt8(0, 3) // reserved
    e.writeUInt16LE(1, 4) // colour planes
    e.writeUInt16LE(32, 6) // bits per pixel
    e.writeUInt32LE(png.length, 8)
    e.writeUInt32LE(offset, 12)
    offset += png.length
    entries.push(e)
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)])
}

/** Width/height from a PNG IHDR chunk. */
function pngSize(buf) {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

async function write(file, buf, expect) {
  const { width, height } = pngSize(expect.png ?? buf)
  if (width !== expect.width || height !== expect.height) {
    throw new Error(`${relative(ROOT, file)}: rendered ${width}x${height}, expected ${expect.width}x${expect.height}`)
  }
  await writeFile(file, buf)
  const { size } = await stat(file)
  console.log(`${relative(ROOT, file).padEnd(28)} ${String(expect.width).padStart(4)}x${String(expect.height).padEnd(4)} ${(size / 1024).toFixed(1).padStart(6)} KB`)
  return size
}

const browser = await chromium.launch()
try {
  // --- og.png -------------------------------------------------------------------------------
  const card = await cardData()
  const og = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
  await og.goto(pathToFileURL(OG_HTML).href)
  const all = [...card.series.real, ...card.series.stock, ...card.series.cal].filter(Number.isFinite)
  const st = step125((Math.max(...all) - Math.min(...all)) / 6)
  const scale = { min: Math.floor(Math.min(...all) / st) * st, max: Math.ceil(Math.max(...all) / st) * st }
  const missing = await og.evaluate(
    ({ text, series, scale }) => {
      const miss = []
      for (const el of document.querySelectorAll('[data-k]')) {
        const k = el.getAttribute('data-k')
        if (text[k] === undefined) miss.push(k)
        else el.textContent = text[k]
      }
      // Plot: 10 x divisions, y on a 1-2-5 grid that never clips. Real is solid and drawn last; twins are dashed under it.
      const svg = document.getElementById('plot')
      const W = 604
      const H = 196
      const NS = 'http://www.w3.org/2000/svg'
      const x = (i, n) => (i / (n - 1)) * (W - 1) + 0.5
      const y = (v) => H - 0.5 - ((v - scale.min) / (scale.max - scale.min)) * (H - 1)
      const line = (attrs) => {
        const el = document.createElementNS(NS, 'path')
        for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
        svg.appendChild(el)
      }
      const grid = []
      for (let i = 0; i <= 10; i++) grid.push(`M${((i / 10) * (W - 1) + 0.5).toFixed(1)} 0V${H}`)
      const ydivs = Math.round((scale.max - scale.min) / ((scale.max - scale.min) / 6))
      for (let j = 0; j <= ydivs; j++) grid.push(`M0 ${(0.5 + (j / ydivs) * (H - 1)).toFixed(1)}H${W}`)
      line({ d: grid.join(''), stroke: '#1a1d24', 'stroke-width': '1', fill: 'none' })
      line({ d: `M0 0.5H${W}M0 ${H - 0.5}H${W}M0.5 0V${H}M${W - 0.5} 0V${H}`, stroke: '#222630', 'stroke-width': '1', fill: 'none' })
      const path = (vals) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i, vals.length).toFixed(1)} ${y(v).toFixed(1)}`).join('')
      line({ d: path(series.stock), stroke: '#00a2ce', 'stroke-width': '2', 'stroke-dasharray': '8 4', fill: 'none' })
      line({ d: path(series.cal), stroke: '#b0449a', 'stroke-width': '4', 'stroke-dasharray': '6 3', fill: 'none' })
      line({ d: path(series.real), stroke: '#e2e8f0', 'stroke-width': '1.5', fill: 'none' })
      return miss
    },
    { text: card.text, series: card.series, scale },
  )
  if (missing.length) throw new Error(`scripts/og.html: no value for ${missing.join(', ')}`)
  await og.evaluate(() => document.fonts.ready)
  for (const family of ['JetBrains Mono Variable', 'Martian Mono Variable', 'Atkinson Hyperlegible Next Variable']) {
    const status = await og.evaluate((fam) => [...document.fonts].filter((f) => f.family.replace(/["']/g, '') === fam).map((f) => f.status), family)
    if (!status.includes('loaded')) throw new Error(`${family} did not load (font status: ${status.join(', ') || 'none'}); check public/fonts`)
  }
  if ((await og.content()).includes('{{')) throw new Error('scripts/og.html: template braces survived')
  const ogPng = await og.locator('#og').screenshot({ type: 'png', animations: 'disabled' })
  const ogBytes = await write(join(PUBLIC, 'og.png'), ogPng, { width: 1200, height: 630 })
  if (ogBytes > OG_MAX_BYTES) throw new Error(`public/og.png is ${ogBytes} bytes; keep it under ${OG_MAX_BYTES}`)
  await og.close()

  // --- apple-touch-icon.png -------------------------------------------------------------------
  const svg = await readFile(FAVICON_SVG, 'utf8')
  const glyph = /<path\b[^>]*\bid="glyph"[^>]*\bd="([^"]+)"/.exec(svg)?.[1]
  if (!glyph) throw new Error('public/favicon.svg: no <path id="glyph" d="..."> found')
  // 18-unit viewBox at 180px = exactly 10px per grid unit, so every edge lands on a pixel.
  const touch = await browser.newPage({ viewport: { width: 180, height: 180 }, deviceScaleFactor: 1 })
  await touch.setContent(
    `<!doctype html><html><body style="margin:0;background:${BG}">` +
      `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="-1 -1 18 18" shape-rendering="crispEdges" style="display:block">` +
      `<rect x="-1" y="-1" width="18" height="18" fill="${BG}"/><path fill="${EMERALD}" d="${glyph}"/></svg></body></html>`,
  )
  await write(join(PUBLIC, 'apple-touch-icon.png'), await touch.screenshot({ type: 'png' }), { width: 180, height: 180 })
  await touch.close()

  // --- favicon.ico ----------------------------------------------------------------------------
  const images = []
  for (const size of ICO_SIZES) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 })
    await page.goto(pathToFileURL(FAVICON_SVG).href)
    images.push({ size, png: await page.screenshot({ type: 'png' }) })
    await page.close()
  }
  for (const { size, png } of images) {
    const { width, height } = pngSize(png)
    if (width !== size || height !== size) throw new Error(`favicon.ico: ${size}px entry rendered ${width}x${height}`)
  }
  await write(join(PUBLIC, 'favicon.ico'), packIco(images), { png: images[images.length - 1].png, width: 48, height: 48 })
} finally {
  await browser.close()
}
