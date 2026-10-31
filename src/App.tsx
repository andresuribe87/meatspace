import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { buildPayload, defaultPayload, PRIMITIVE_IDS, primitiveForCategory } from '../shared/primitives'
import { SEED_NODES } from '../shared/nodes'
import type { HardwareNode, PrimitiveId, WaitlistKind } from '../shared/types'
import { ArchitectureStrip } from './components/ArchitectureStrip'
import { DispatchConsole } from './components/DispatchConsole'
import { Footer } from './components/Footer'
import { Orderbook } from './components/Orderbook'
import { StatusBar } from './components/StatusBar'
import { Thesis } from './components/Thesis'
import { WaitlistPanel } from './components/WaitlistPanel'
import { formatPayload } from './lib/payload'
import { navigate, useRoute, type Route } from './lib/router'
import { useNetwork } from './lib/useNetwork'
import { DocsPage } from './pages/DocsPage'

function initialDrafts(): Record<PrimitiveId, string> {
  return Object.fromEntries(PRIMITIVE_IDS.map((p) => [p, formatPayload(defaultPayload(p, SEED_NODES))])) as Record<PrimitiveId, string>
}

/** Best-effort node_id extraction from the (possibly user-edited) JSON draft. */
function draftNodeId(draft: string): string | null {
  try {
    const v = JSON.parse(draft) as { node_id?: unknown }
    return typeof v.node_id === 'string' ? v.node_id : null
  } catch {
    return null
  }
}

/** '/' matches index.html, so a direct load and a client-side return read the same. */
const TITLES: Record<Route, string> = {
  '/': 'meatspace.sh // stdout to reality.',
  '/docs': 'MEATSPACE(1) // meatspace.sh',
}

const PANEL_HASH: Record<WaitlistKind, string> = { hardware: '#connect', api_keys: '#api-keys' }

function panelFromHash(hash: string): WaitlistKind | null {
  if (hash === PANEL_HASH.hardware) return 'hardware'
  if (hash === PANEL_HASH.api_keys) return 'api_keys'
  return null
}

export default function App() {
  const route = useRoute()
  const { snapshot, connection, clockOffsetMs } = useNetwork()

  const [primitive, setPrimitive] = useState<PrimitiveId>('AERIAL_ISR_SORTIE')
  const [drafts, setDrafts] = useState<Record<PrimitiveId, string>>(initialDrafts)
  const [loadNonce, setLoadNonce] = useState(0)
  const [panel, setPanel] = useState<WaitlistKind | null>(() => panelFromHash(window.location.hash))
  const consoleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.title = TITLES[route]
  }, [route])

  // Deep links: meatspace.sh/#connect and /#api-keys open the waitlist panels. Back/forward does not always fire
  // hashchange (e.g. returning across a pushState entry), so popstate re-syncs the panel too.
  useEffect(() => {
    const onHash = () => setPanel(panelFromHash(window.location.hash))
    window.addEventListener('hashchange', onHash)
    window.addEventListener('popstate', onHash)
    return () => {
      window.removeEventListener('hashchange', onHash)
      window.removeEventListener('popstate', onHash)
    }
  }, [])

  const openPanel = useCallback((kind: WaitlistKind) => {
    setPanel(kind)
    if (window.location.hash !== PANEL_HASH[kind]) window.history.replaceState(null, '', PANEL_HASH[kind])
  }, [])

  const closePanel = useCallback(() => {
    setPanel(null)
    if (panelFromHash(window.location.hash)) window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }, [])

  const onNavigate = useCallback((to: string) => {
    setPanel(null)
    navigate(to)
  }, [])

  /** Zone C -> Zone B: load the node's canonical payload into its primitive's tab and bring the console into view. */
  const taskNode = useCallback((node: HardwareNode) => {
    const p = primitiveForCategory(node.category)
    setPrimitive(p)
    setDrafts((d) => ({ ...d, [p]: formatPayload(buildPayload(node)) }))
    setLoadNonce((n) => n + 1)
    const el = consoleRef.current
    if (el) {
      const top = el.getBoundingClientRect().top
      // Height the sticky status bar covers (--header-h, set as html scroll-padding-top, which scrollIntoView honours).
      const headerH = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0
      // Only scroll when the console is not already comfortably on screen.
      if (top < headerH || top > window.innerHeight * 0.5) {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
      }
    }
  }, [])

  const resetDraft = useCallback(() => {
    setDrafts((d) => ({ ...d, [primitive]: formatPayload(defaultPayload(primitive, SEED_NODES)) }))
    setLoadNonce((n) => n + 1)
  }, [primitive])

  const onDraftChange = useCallback((text: string) => setDrafts((d) => ({ ...d, [primitive]: text })), [primitive])

  const targetNodeId = useMemo(() => draftNodeId(drafts[primitive]), [drafts, primitive])

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <StatusBar stats={snapshot.stats} connection={connection} route={route} onNavigate={onNavigate} onOpenPanel={openPanel} />

      {route === '/docs' ? (
        <DocsPage onNavigate={onNavigate} />
      ) : (
        <main id="main" className="mx-auto w-full max-w-[1600px] flex-1 space-y-4 px-4 py-4 sm:space-y-6 sm:px-6 sm:py-6">
          {/* Zone B: split hero */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <Thesis />
            <div ref={consoleRef} className="min-w-0">
              <DispatchConsole
                primitive={primitive}
                onPrimitiveChange={setPrimitive}
                draft={drafts[primitive]}
                onDraftChange={onDraftChange}
                onReset={resetDraft}
                loadNonce={loadNonce}
              />
            </div>
          </div>

          {/* Zone C */}
          <Orderbook nodes={snapshot.nodes} targetNodeId={targetNodeId} onTaskNode={taskNode} clockOffsetMs={clockOffsetMs} />

          {/* Zone D */}
          <ArchitectureStrip />
        </main>
      )}

      <Footer onNavigate={onNavigate} onOpenPanel={openPanel} />
      <WaitlistPanel kind={panel} onClose={closePanel} />
    </div>
  )
}
