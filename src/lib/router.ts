import { useEffect, useState } from 'react'

/**
 * The SPA's routes (v0.2). Pure matching plus a tiny pushState router; no dependency.
 *
 *   /                 home
 *   /reports          Twin Gap Report index
 *   /reports/:id      one report (id = owner__name, the lab directory name)
 *   /cells            cells, lanes, #twins
 *   /power            how many real trials?
 *   /docs             MEATSPACE(1)
 *   /concept          v0.1, simulated, noindex
 *   /design           the design system reference
 *   anything else     404 (designed, in the system)
 *
 * Client-side redirects (replaceState, so the address bar shows the canonical path):
 *   trailing slashes, /index.html -> /, /twins -> /cells#twins, /reports/:owner/:name -> /reports/:owner__:name.
 */
export type Route = '/' | '/reports' | '/reports/:id' | '/cells' | '/power' | '/docs' | '/concept' | '/design' | '404'

export interface RouteMatch {
  route: Route
  /** Route params: `id` for /reports/:id (decoded). */
  params: { id?: string }
  /** The pathname that was matched (after redirects). */
  path: string
}

const STATIC: Readonly<Record<string, Route>> = {
  '/': '/',
  '/reports': '/reports',
  '/cells': '/cells',
  '/power': '/power',
  '/docs': '/docs',
  '/concept': '/concept',
  '/design': '/design',
}

function decode(s: string): string {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

/** Match a pathname (no redirects applied). */
export function matchPath(pathname: string): RouteMatch {
  const path = pathname || '/'
  const r = STATIC[path]
  if (r) return { route: r, params: {}, path }
  const m = /^\/reports\/([^/]+)$/.exec(path)
  if (m) return { route: '/reports/:id', params: { id: decode(m[1]) }, path }
  return { route: '404', params: {}, path }
}

/**
 * Where a URL should live, or null when it already is canonical. Takes and returns `pathname + search + hash`.
 * Pure, so the e2e and unit tests can check it without a browser.
 */
export function redirectFor(pathname: string, search = '', hash = ''): string | null {
  let p = pathname
  if (p === '/index.html') p = '/'
  if (p.length > 1 && p.endsWith('/')) p = p.replace(/\/+$/, '') || '/'
  if (p === '/twins') return `/cells${search}#twins`
  const owner = /^\/reports\/([^/]+)\/([^/]+)$/.exec(p)
  if (owner) p = `/reports/${owner[1]}__${owner[2]}`
  return p === pathname ? null : `${p}${search}${hash}`
}

const listeners = new Set<() => void>()

function current(): RouteMatch {
  return matchPath(window.location.pathname)
}

/** Apply a client-side redirect to the current URL (replaceState). Returns true when the URL changed. */
export function canonicalize(): boolean {
  const { pathname, search, hash } = window.location
  const to = redirectFor(pathname, search, hash)
  if (to === null) return false
  window.history.replaceState(window.history.state, '', to)
  return true
}

/** Scroll to `#id` once the page has rendered it (the sticky header is honoured through scroll-padding-top). */
export function scrollToHash(hash: string, attempts = 6): void {
  const id = decode(hash.replace(/^#/, ''))
  if (!id) return
  const tryScroll = (left: number) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ block: 'start' })
    else if (left > 0) requestAnimationFrame(() => tryScroll(left - 1))
  }
  requestAnimationFrame(() => tryScroll(attempts))
}

/** Hashes that open a dialog rather than scroll (see App.tsx). */
const DIALOG_HASHES = new Set(['#request-report', '#request-pilot', '#own-robot', '#connect', '#api-keys'])

/** pushState navigation; preserves #hash targets (e.g. "/cells#twins"). Same-origin paths only. */
export function navigate(to: string): void {
  const url = new URL(to, window.location.href)
  if (url.origin !== window.location.origin) {
    window.location.assign(url.href)
    return
  }
  const target = redirectFor(url.pathname, url.search, url.hash) ?? url.pathname + url.search + url.hash
  if (target !== window.location.pathname + window.location.search + window.location.hash) {
    window.history.pushState(null, '', target)
  }
  listeners.forEach((l) => l())
  const hash = new URL(target, window.location.href).hash
  if (hash && !DIALOG_HASHES.has(hash)) scrollToHash(hash)
  else if (!hash) window.scrollTo({ top: 0 })
  // Dialog hashes: App listens for this event as for a hashchange.
  if (hash && DIALOG_HASHES.has(hash)) window.dispatchEvent(new Event('ms:hash'))
}

/** The current route; re-renders on navigate() and on back/forward. Applies client-side redirects first. */
export function useRoute(): RouteMatch {
  const [m, setM] = useState<RouteMatch>(() => {
    canonicalize()
    return current()
  })
  useEffect(() => {
    const update = () => {
      canonicalize()
      setM((prev) => {
        const next = current()
        return prev.path === next.path ? prev : next
      })
    }
    listeners.add(update)
    window.addEventListener('popstate', update)
    return () => {
      listeners.delete(update)
      window.removeEventListener('popstate', update)
    }
  }, [])
  return m
}

/**
 * Click handler for in-app links: a plain <a href="/path"> routes through navigate() on an unmodified left click.
 * Leaves alone: modified clicks, other targets, downloads, other origins, and server-owned paths (/v1, /data, /install.sh,
 * /docs is SPA so it is routed).
 */
export function linkHandler(onNavigate: (to: string) => void) {
  return (e: { defaultPrevented: boolean; button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; currentTarget: EventTarget; preventDefault(): void }) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const a = e.currentTarget as HTMLAnchorElement
    const href = a.getAttribute('href')
    if (!href || !isAppPath(href) || a.target || a.hasAttribute('download')) return
    e.preventDefault()
    onNavigate(href)
  }
}

/** Same-origin path the SPA renders (not an API, data file or the installer). */
export function isAppPath(href: string): boolean {
  if (!href.startsWith('/') || href.startsWith('//')) return false
  return !/^\/(v1|data|mcp|install\.sh|healthz|fonts)(\/|$|\?|#)/.test(href) && !/\.[a-z0-9]{2,5}($|\?|#)/i.test(href.split('#')[0])
}
