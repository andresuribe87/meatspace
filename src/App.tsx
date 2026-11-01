/**
 * The v0.2 app shell: skip link, site header (status bar + status line), the routed page, footer, and the three
 * request dialogs, which open from a hash on any page (#request-report, #request-pilot, #own-robot; the v0.1 hashes
 * #connect and #api-keys open #own-robot and #request-pilot). Titles, canonical URL and meta description follow the
 * route. Rarely visited, heavy pages (concept, design, power, docs) load on demand.
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'

import { ORIGIN } from '../shared/constants'
import { ChunkBoundary } from './components/chrome/ChunkBoundary'
import { clearChunkReloadFlag } from './lib/chunkReload'
import { NotFoundPage } from './components/chrome/NotFoundPage'
import { SiteFooter } from './components/chrome/SiteFooter'
import { SiteHeader } from './components/chrome/SiteHeader'
import { SkipLink } from './ds'
import { getReportSummary } from './lib/reports'
import { navigate, scrollToHash, useRoute, type RouteMatch } from './lib/router'
import { CellsPage } from './pages/CellsPage'
import { HomePage } from './pages/HomePage'
import { ReportPage } from './pages/ReportPage'
import { ReportsPage } from './pages/ReportsPage'
import { RequestDialogs, type RequestDialogKind } from './pages/RequestDialogs'

const ConceptPage = lazy(() => import('./pages/ConceptPage').then((m) => ({ default: m.ConceptPage })))
const DesignPage = lazy(() => import('./pages/DesignPage').then((m) => ({ default: m.DesignPage })))
const DocsPage = lazy(() => import('./pages/DocsPage').then((m) => ({ default: m.DocsPage })))
const PowerPage = lazy(() => import('./pages/PowerPage').then((m) => ({ default: m.PowerPage })))

/* ------------------------------------------------------------------------------------------------
 * Dialog hashes
 * ---------------------------------------------------------------------------------------------- */

const DIALOG_HASH: Record<RequestDialogKind, string> = {
  report: '#request-report',
  pilot: '#request-pilot',
  'own-robot': '#own-robot',
}
/** v0.1 deep links, kept: #connect (CONNECT HARDWARE) is now "own the robots", #api-keys is now the pilot request. */
const LEGACY_HASH: Record<string, string> = { '#connect': '#own-robot', '#api-keys': '#request-pilot' }

function dialogFromHash(hash: string): RequestDialogKind | null {
  for (const k of Object.keys(DIALOG_HASH) as RequestDialogKind[]) if (DIALOG_HASH[k] === hash) return k
  return null
}

/** Rewrites a legacy hash in place (replaceState) and returns the dialog it opens. */
function readDialogHash(): RequestDialogKind | null {
  const legacy = LEGACY_HASH[window.location.hash]
  if (legacy) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search + legacy)
  return dialogFromHash(window.location.hash)
}

/* ------------------------------------------------------------------------------------------------
 * Document head per route
 * ---------------------------------------------------------------------------------------------- */

const DESCRIPTION =
  "Twin Gap Reports: how far a robot's MuJoCo twin is from the real robot, measured on public LeRobot data and tested on held-out episodes. Real-robot verification by waitlist."
const CONCEPT_DESCRIPTION = 'The v0.1 concept of meatspace.sh: a simulated dispatch marketplace for idle industrial robots. Not a product.'

interface Head {
  title: string
  description: string
  canonical: string
}

function headFor(m: RouteMatch): Head {
  const canonical = `${ORIGIN}${m.route === '404' ? m.path : m.path}`
  switch (m.route) {
    case '/':
      return { title: 'meatspace.sh // stdout to reality.', description: DESCRIPTION, canonical: `${ORIGIN}/` }
    case '/reports':
      return { title: 'reports // meatspace.sh', description: DESCRIPTION, canonical }
    case '/reports/:id': {
      const s = m.params.id ? getReportSummary(m.params.id) : undefined
      if (!s) return { title: `no report for ${m.params.id ?? ''} // reports // meatspace.sh`, description: DESCRIPTION, canonical }
      return {
        title: `${s.dataset} x ${s.twin} // reports // meatspace.sh`,
        description:
          s.status === 'ok'
            ? `Twin Gap Report: ${s.dataset} replayed open-loop in the MuJoCo Menagerie ${s.twin} twin. Held-out sim-vs-real joint error of the stock twin, a physics-free baseline and a calibrated twin, with 95% intervals.`
            : `Twin Gap Report: ${s.dataset} was not reported. The reason is printed on the page.`,
        canonical,
      }
    }
    case '/cells':
      return { title: 'cells // meatspace.sh', description: DESCRIPTION, canonical }
    case '/power':
      return { title: 'how many real trials? // meatspace.sh', description: DESCRIPTION, canonical }
    case '/docs':
      return { title: 'MEATSPACE(1) // meatspace.sh', description: DESCRIPTION, canonical }
    case '/concept':
      return { title: 'CONCEPT (simulated) // meatspace.sh', description: CONCEPT_DESCRIPTION, canonical }
    case '/design':
      return { title: 'design // meatspace.sh', description: DESCRIPTION, canonical }
    default:
      return { title: '404 // meatspace.sh', description: DESCRIPTION, canonical: `${ORIGIN}/` }
  }
}

function setMeta(selector: string, attr: 'content' | 'href', value: string) {
  document.querySelector(selector)?.setAttribute(attr, value)
}

function useHead(m: RouteMatch) {
  const head = useMemo(() => headFor(m), [m])
  useEffect(() => {
    document.title = head.title
    setMeta('meta[name="description"]', 'content', head.description)
    setMeta('meta[property="og:description"]', 'content', head.description)
    setMeta('meta[name="twitter:description"]', 'content', head.description)
    setMeta('meta[property="og:title"]', 'content', head.title)
    setMeta('meta[name="twitter:title"]', 'content', head.title)
    setMeta('link[rel="canonical"]', 'href', head.canonical)
    setMeta('meta[property="og:url"]', 'content', head.canonical)
  }, [head])
}

/**
 * Route changes for keyboard and screen-reader users: after an in-app navigation, focus moves to the new page's H1
 * (or the page wrapper while a lazy page loads) and the new title is announced in a polite live region. Skipped on
 * the first load and when the URL targets a #fragment (scrollToHash handles that).
 */
function useRouteFocus(path: string, wrapper: RefObject<HTMLDivElement | null>) {
  const first = useRef(true)
  const [announce, setAnnounce] = useState('')
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const hash = window.location.hash
    const raf = requestAnimationFrame(() => {
      setAnnounce(document.title)
      if (hash && !dialogFromHash(hash)) return
      const h1 = document.querySelector<HTMLElement>('#main h1')
      const target = h1 ?? wrapper.current
      if (!target) return
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
      target.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(raf)
  }, [path, wrapper])
  return announce
}

/* ------------------------------------------------------------------------------------------------ */

function Loading({ what }: { what: string }) {
  return (
    <main id="main" aria-busy="true" className="page-wrap flex-1 pt-[var(--s-7)] pb-[var(--s-9)]">
      <p className="t-legend">loading {what}</p>
    </main>
  )
}

export default function App() {
  const m = useRoute()
  const [dialog, setDialog] = useState<RequestDialogKind | null>(() => readDialogHash())
  const wrapper = useRef<HTMLDivElement>(null)
  useHead(m)
  const announce = useRouteFocus(m.path, wrapper)
  useEffect(() => {
    // A page rendered: a later stale-chunk error may reload once again.
    const t = window.setTimeout(clearChunkReloadFlag, 30_000)
    return () => window.clearTimeout(t)
  }, [m.path])

  // Hash deep links open the dialogs on any page. Back/forward does not always fire hashchange (e.g. across a
  // pushState entry), so popstate re-syncs too; navigate() dispatches ms:hash for in-app links to a dialog hash.
  useEffect(() => {
    const sync = () => setDialog(readDialogHash())
    window.addEventListener('hashchange', sync)
    window.addEventListener('popstate', sync)
    window.addEventListener('ms:hash', sync)
    return () => {
      window.removeEventListener('hashchange', sync)
      window.removeEventListener('popstate', sync)
      window.removeEventListener('ms:hash', sync)
    }
  }, [])

  // A direct load of /cells#twins: the browser looked for #twins before React rendered it.
  useEffect(() => {
    const h = window.location.hash
    if (h && !dialogFromHash(h)) scrollToHash(h)
  }, [])

  const openDialog = useCallback((kind: RequestDialogKind) => {
    setDialog(kind)
    if (window.location.hash !== DIALOG_HASH[kind]) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search + DIALOG_HASH[kind])
  }, [])

  /**
   * Idempotent: Cancel and the native close event can both fire for one close. Per kind: when the hash moves from one
   * dialog to another, the first dialog's close event must not close the second or clear its hash.
   */
  const closeDialog = useCallback((kind: RequestDialogKind) => {
    setDialog((d) => (d === kind ? null : d))
    if (dialogFromHash(window.location.hash) === kind) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
  }, [])

  const onNavigate = useCallback((to: string) => {
    setDialog(null)
    navigate(to)
  }, [])

  const openReport = useCallback(() => openDialog('report'), [openDialog])

  let page
  switch (m.route) {
    case '/':
      page = <HomePage onNavigate={onNavigate} onOpenDialog={openDialog} />
      break
    case '/reports':
      page = <ReportsPage onNavigate={onNavigate} onOpenDialog={openDialog} />
      break
    case '/reports/:id':
      page = <ReportPage key={m.params.id} id={m.params.id ?? ''} onNavigate={onNavigate} onOpenDialog={openDialog} />
      break
    case '/cells':
      page = <CellsPage onNavigate={onNavigate} />
      break
    case '/power':
      page = (
        <Suspense fallback={<Loading what="/power" />}>
          <PowerPage onNavigate={onNavigate} />
        </Suspense>
      )
      break
    case '/docs':
      page = (
        <Suspense fallback={<Loading what="/docs" />}>
          <DocsPage onNavigate={onNavigate} />
        </Suspense>
      )
      break
    case '/concept':
      page = (
        <Suspense fallback={<Loading what="/concept" />}>
          <ConceptPage onNavigate={onNavigate} />
        </Suspense>
      )
      break
    case '/design':
      page = (
        <Suspense fallback={<Loading what="/design" />}>
          <DesignPage />
        </Suspense>
      )
      break
    default:
      page = <NotFoundPage path={m.path} onNavigate={onNavigate} />
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <SkipLink />
      <SiteHeader route={m.route} onNavigate={onNavigate} onRequestReport={openReport} statusLine={m.route !== '/concept'} />
      {/* A block wrapper: a page's <main class="page-wrap"> must not be a flex item with auto margins, or wide content (a long
          curl line) would size it past the viewport instead of scrolling inside its own box. */}
      <div ref={wrapper} className="min-w-0 flex-1 outline-none">
        <ChunkBoundary key={m.path}>{page}</ChunkBoundary>
      </div>
      <p id="route-announcer" className="sr" aria-live="polite" aria-atomic="true">
        {announce}
      </p>
      <SiteFooter onNavigate={onNavigate} />
      <RequestDialogs kind={dialog} onClose={closeDialog} />
    </div>
  )
}
