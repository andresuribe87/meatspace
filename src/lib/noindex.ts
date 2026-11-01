import { useEffect } from 'react'

/**
 * <meta name="robots" content="noindex"> while the calling page is mounted; restores whatever robots meta was there
 * before. Used by /concept (a simulation), the 404 page and report ids that have no report (not run, unknown), so a
 * soft 404 is never indexed.
 */
export function useNoindex(active = true): void {
  useEffect(() => {
    if (!active) return
    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    const created = !meta
    const previous = meta?.getAttribute('content') ?? null
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'robots'
      document.head.appendChild(meta)
    }
    meta.content = 'noindex'
    return () => {
      if (created) meta.remove()
      else if (previous !== null) meta.setAttribute('content', previous)
    }
  }, [active])
}
