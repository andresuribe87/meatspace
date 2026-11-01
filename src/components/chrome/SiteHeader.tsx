/**
 * v0.2 site header: the status bar (brand, nav, the one primary key) over the status line (static facts built at
 * deploy from lab/reports). Sticky from 640px up; on phones it scrolls away and the nav folds into a Menu key.
 *
 * The header publishes its own height as --header-h on <html> (scroll-padding-top, the concept banner and the docs
 * index read it), so in-page jumps always land below it, whatever the header holds on this route.
 */
import { useEffect, useId, useLayoutEffect, useRef, useState, type MouseEvent } from 'react'

import { VERSION } from '../../../shared/constants'
import { capability } from '../../../shared/status'
import { Key, Num, StatusLine, type StatusLineItem } from '../../ds'
import { REPORT_INDEX } from '../../lib/reports'
import { linkHandler, type Route } from '../../lib/router'

export interface SiteHeaderProps {
  route: Route
  onNavigate: (to: string) => void
  /** Opens the gap-report request dialog (#request-report). */
  onRequestReport: () => void
  /** Show the status line (every route but /concept, where nothing measured belongs next to the simulation). */
  statusLine?: boolean
}

const NAV: readonly { label: string; href: string; routes: Route[] }[] = [
  { label: 'Reports', href: '/reports', routes: ['/reports', '/reports/:id'] },
  { label: 'Cells', href: '/cells', routes: ['/cells'] },
  { label: 'Docs', href: '/docs', routes: ['/docs'] },
]

const COUNTS = '/data/reports/index.json#/counts'

/** The status line facts (C-12): counts and dates from the generated report index, words from shared/status.ts. */
function statusLineItems(): StatusLineItem[] {
  const c = REPORT_INDEX.counts
  const heldout = c.heldout_episodes_future + c.heldout_episodes_interleaved
  return [
    { label: 'reports', value: <Num value={c.reported} digits={0} prov={`${COUNTS}/reported`} /> },
    { label: 'refused', value: <Num value={c.rejected} digits={0} prov={`${COUNTS}/rejected`} /> },
    {
      label: 'held-out episodes',
      value: <Num value={heldout.toLocaleString('en-US')} prov={`${COUNTS}/heldout_episodes_future + ${COUNTS}/heldout_episodes_interleaved`} />,
      hideOnPhone: true,
    },
    { label: 'twin trials', value: capability('MS-TT-SIM').status.toLowerCase(), word: true, hideOnPhone: true },
    { label: 'real cell', value: capability('MS-RV-SO101').status.toLowerCase(), word: true },
    { label: 'updated', value: <Num value={REPORT_INDEX.generated_at} prov="/data/reports/index.json#/generated_at" />, hideOnPhone: true, hideOnTablet: true },
  ]
}

export function SiteHeader({ route, onNavigate, onRequestReport, statusLine = true }: SiteHeaderProps) {
  const ref = useRef<HTMLElement>(null)
  const [menu, setMenu] = useState(false)
  const menuId = useId()
  const menuKeyId = useId()
  const go = linkHandler((to) => {
    setMenu(false)
    onNavigate(to)
  })

  // Close the phone menu on route change and on Escape.
  const [lastRoute, setLastRoute] = useState(route)
  if (lastRoute !== route) {
    setLastRoute(route)
    setMenu(false)
  }
  useEffect(() => {
    if (!menu) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // Focus inside the menu would fall to <body> once the menu hides: hand it back to the Menu key.
      if (document.getElementById(menuId)?.contains(document.activeElement)) document.getElementById(menuKeyId)?.focus()
      setMenu(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menu, menuId, menuKeyId])

  // --header-h follows the header's real height while it is sticky (0 when it scrolls away on phones).
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const root = document.documentElement
    const measure = () => {
      const sticky = getComputedStyle(el).position === 'sticky'
      root.style.setProperty('--header-h', sticky ? `${Math.ceil(el.getBoundingClientRect().height)}px` : '0px')
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [statusLine])

  const onBrand = (e: MouseEvent<HTMLAnchorElement>) => go(e)
  const request = () => {
    setMenu(false)
    onRequestReport()
  }

  return (
    <header ref={ref} className="z-[40] border-b border-line bg-bg sm:sticky sm:top-0">
      <div className="page-wrap flex h-12 items-center gap-[var(--s-4)]">
        <a href="/" onClick={onBrand} className="t-ui shrink-0 whitespace-nowrap no-underline">
          <b className="font-semibold">meatspace.sh</b> <span className="muted">// v{VERSION}</span>
        </a>
        <nav aria-label="Primary" className="ml-auto hidden items-center gap-[6px] md:flex">
          {NAV.map((n) => (
            <Key key={n.href} variant="ghost" size="sm" href={n.href} onClick={go} current={n.routes.includes(route)}>
              {n.label}
            </Key>
          ))}
          <Key variant="primary" size="sm" aria-haspopup="dialog" onClick={request} className="ml-[var(--s-2)]">
            Request a report
          </Key>
        </nav>
        <Key id={menuKeyId} variant="secondary" size="sm" className="ml-auto md:hidden" aria-expanded={menu} aria-controls={menuId} onClick={() => setMenu((m) => !m)}>
          Menu
        </Key>
      </div>
      <nav id={menuId} aria-label="Menu" hidden={!menu} className="border-t border-line md:hidden">
        <ul className="page-wrap flex flex-col gap-[var(--s-1)] py-[var(--s-3)]">
          {NAV.map((n) => (
            <li key={n.href}>
              <Key variant="ghost" href={n.href} onClick={go} current={n.routes.includes(route)}>
                {n.label}
              </Key>
            </li>
          ))}
          <li>
            <Key variant="ghost" href="/power" onClick={go} current={route === '/power'}>
              How many trials
            </Key>
          </li>
          <li className="pt-[var(--s-2)]">
            <Key variant="primary" aria-haspopup="dialog" onClick={request}>
              Request a report
            </Key>
          </li>
        </ul>
      </nav>
      {statusLine ? (
        <div className="border-t border-line">
          <div className="page-wrap">
            <StatusLine items={statusLineItems()} className="border-b-0 bg-transparent px-0" />
          </div>
        </div>
      ) : null}
    </header>
  )
}
