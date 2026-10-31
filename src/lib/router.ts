import { useEffect, useState } from 'react'

/** Known SPA routes. Anything else renders the terminal home. */
export type Route = '/' | '/docs'

function normalize(pathname: string): Route {
  const p = pathname.replace(/\/+$/, '') || '/'
  return p === '/docs' ? '/docs' : '/'
}

const listeners = new Set<() => void>()

/** pushState navigation; preserves #hash targets (e.g. "/#orderbook"). */
export function navigate(to: string): void {
  const url = new URL(to, window.location.href)
  if (url.pathname + url.search + url.hash !== window.location.pathname + window.location.search + window.location.hash) {
    window.history.pushState(null, '', url)
  }
  listeners.forEach((l) => l())
  if (url.hash) {
    requestAnimationFrame(() => document.getElementById(url.hash.slice(1))?.scrollIntoView({ block: 'start' }))
  } else {
    window.scrollTo({ top: 0 })
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => normalize(window.location.pathname))
  useEffect(() => {
    const update = () => setRoute(normalize(window.location.pathname))
    listeners.add(update)
    window.addEventListener('popstate', update)
    return () => {
      listeners.delete(update)
      window.removeEventListener('popstate', update)
    }
  }, [])
  return route
}
