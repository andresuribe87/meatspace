#!/usr/bin/env node
/**
 * Regenerates the raster brand assets in public/ with headless Chromium:
 *
 *   public/og.png                1200x630  Open Graph / Twitter card, from scripts/og.html
 *   public/apple-touch-icon.png  180x180   the favicon's ">_" glyph, unframed (iOS applies its own mask)
 *   public/favicon.ico           16/32/48  PNG-in-ICO fallback for clients that ignore the SVG icon
 *
 * public/favicon.svg is the source of truth for the glyph. Fonts come from the same
 * @fontsource-variable packages the SPA bundles, so run `npm install` first.
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
  const og = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
  await og.goto(pathToFileURL(OG_HTML).href)
  await og.evaluate(() => document.fonts.ready)
  const mono = await og.evaluate(() =>
    [...document.fonts].filter((f) => f.family.replace(/["']/g, '') === 'JetBrains Mono Variable').map((f) => f.status),
  )
  if (!mono.includes('loaded')) {
    throw new Error(`JetBrains Mono did not load (font status: ${mono.join(', ') || 'none'}); run npm install first`)
  }
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
