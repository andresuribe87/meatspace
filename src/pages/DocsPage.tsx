/**
 * /docs: MEATSPACE(1) rendered as a terminal man page. Same source as `curl https://meatspace.sh/docs`
 * (shared/manpage.ts); prose reflows on phones, tables and commands scroll inside their own box.
 */
import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

import {
  MAN_DATE,
  MAN_MANUAL,
  MAN_SECTIONS,
  MAN_TITLE,
  MAN_VERSION,
  manBlocks,
  manProse,
  manSlug,
  type CodeStyle,
  type ManBlock,
  type ManItem,
  type ManLeaf,
} from '../../shared/manpage'
import type { StepStatus } from '../../shared/types'
import { BracketButton, CopyButton } from '../components/ui'
import { PUBLIC_ORIGIN } from '../lib/payload'

export interface DocsPageProps {
  onNavigate: (to: string) => void
}

const DOC_TITLE = 'MEATSPACE(1) // meatspace.sh'
const CURL_DOCS = `curl ${PUBLIC_ORIGIN}/docs`

const SECTIONS = MAN_SECTIONS.map((s) => ({ title: s.title, slug: manSlug(s.title), blocks: manBlocks(s) }))
const SLUGS = SECTIONS.map((s) => s.slug)

/* ----------------------------------------------------------------------------
 * Inline formatting
 * ------------------------------------------------------------------------- */

const URL_RE = /(https:\/\/[^\s"'<>]*[^\s"'<>.,;:)])/

/** Absolute https URLs become real links; everything else stays plain text. */
function linkify(text: string): ReactNode {
  const parts = text.split(URL_RE)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <a key={i} href={part} className="text-fg underline decoration-muted underline-offset-[3px] hover:text-emerald hover:decoration-emerald">
        {part}
      </a>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  )
}

const OK_STATUS: ReadonlySet<string> = new Set<StepStatus>(['PASS', 'ACCEPTED', 'DISPATCHED', 'SIGNED'])
const BAD_STATUS: ReadonlySet<string> = new Set<StepStatus>(['FAIL', 'REJECTED'])

/** Dispatch trace line: muted offset, plain message, status in the console's colours. */
function consoleLine(line: string): ReactNode {
  const m = /^(\s*\d+ms)?(.*?)(\b[A-Z]+)?$/.exec(line)
  const [, offset = '', rest = '', status = ''] = m ?? []
  const known = OK_STATUS.has(status) || BAD_STATUS.has(status)
  return (
    <>
      {offset ? <span className="text-muted">{offset}</span> : null}
      {known ? rest : rest + status}
      {known ? <b className={`font-bold ${OK_STATUS.has(status) ? 'text-emerald' : 'text-amber'}`}>{status}</b> : null}
    </>
  )
}

/** Code lines joined with real newlines (copy-exact); commands emerald, the "$ " prompt muted and unselectable. */
function codeContent(lines: readonly string[], style: CodeStyle | undefined): ReactNode {
  let continued = false
  return lines.map((line, i) => {
    let node: ReactNode = line
    if (style === 'shell') node = <span className="text-emerald">{line}</span>
    else if (style === 'table') node = i === 0 ? <span className="text-muted">{line}</span> : line
    else if (style === 'console') node = consoleLine(line)
    else {
      const prompt = line.startsWith('$ ')
      if (prompt || continued) {
        node = (
          <>
            {prompt ? <span className="text-muted select-none">$ </span> : null}
            <span className="text-emerald">{prompt ? line.slice(2) : line}</span>
          </>
        )
      } else if (line.startsWith('# ')) node = <span className="text-muted">{line}</span>
      continued = (prompt || continued) && line.endsWith('\\')
    }
    return (
      <Fragment key={i}>
        {i > 0 ? '\n' : null}
        {node}
      </Fragment>
    )
  })
}

/* ----------------------------------------------------------------------------
 * Blocks
 * ------------------------------------------------------------------------- */

/** <pre> that becomes a focusable, labelled region only while it actually scrolls sideways. */
function ScrollPre({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLPreElement>(null)
  const [scrolls, setScrolls] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setScrolls(el.scrollWidth > el.clientWidth + 1)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    let live = true
    void document.fonts?.ready.then(() => {
      if (live) check()
    })
    return () => {
      live = false
      ro.disconnect()
    }
  }, [])
  return (
    <pre
      ref={ref}
      tabIndex={scrolls ? 0 : undefined}
      role={scrolls ? 'region' : undefined}
      aria-label={scrolls ? `${label} (scrolls horizontally)` : undefined}
      className="overflow-x-auto whitespace-pre"
    >
      {children}
    </pre>
  )
}

/** Hanging indent: the leading spaces stay in the text (copy-exact), wrapped lines keep the indent. */
function hang(line: string): CSSProperties | undefined {
  const n = line.length - line.trimStart().length
  return n ? { paddingLeft: `${n}ch`, textIndent: `-${n}ch` } : undefined
}

/**
 * Prose: from md up, the exact lines of the text page (so both read identically); below md the same
 * words reflow to the screen. Line spans are inline on phones and blocks on wider screens.
 */
function Prose({ text, depth }: { text: string; depth: number }) {
  const lines = manProse(text, depth)
  return (
    <p>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 ? ' ' : null}
          <span className="md:block md:whitespace-pre">{linkify(line)}</span>
        </Fragment>
      ))}
    </p>
  )
}

function Leaf({ block, label, depth }: { block: ManLeaf; label: string; depth: number }) {
  switch (block.kind) {
    case 'p':
      return <Prose text={block.text} depth={depth} />
    case 'pre':
      return (
        <pre className="whitespace-pre-wrap break-words">
          {block.lines.map((line, i) => (
            <span key={i} className="block" style={hang(line)}>
              {linkify(line) || ' '}
            </span>
          ))}
        </pre>
      )
    case 'code':
      return <ScrollPre label={label}>{codeContent(block.lines, block.style)}</ScrollPre>
  }
}

function DefList({ items, label, depth }: { items: readonly ManItem[]; label: string; depth: number }) {
  return (
    <dl>
      {items.map((it, i) => (
        <div key={i} className={i > 0 ? 'mt-[1lh]' : undefined}>
          <dt className="font-bold whitespace-pre-wrap text-fg">{it.term}</dt>
          <dd className="pl-[4ch] sm:pl-[7ch]">
            <Blocks blocks={it.desc} label={`${label}: ${it.term}`} depth={depth + 1} />
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** One blank line (1lh) between blocks, as in the text page; `tight` blocks follow directly. */
function Blocks({ blocks, label, depth = 0 }: { blocks: readonly ManBlock[]; label: string; depth?: number }) {
  return blocks.map((b, i) => (
    <div key={i} className={i > 0 && !b.tight ? 'mt-[1lh]' : undefined}>
      {b.kind === 'dl' ? <DefList items={b.items} label={label} depth={depth} /> : <Leaf block={b} label={label} depth={depth} />}
    </div>
  ))
}

/* ----------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------- */

/** Section whose heading most recently scrolled past the reading line (below the sticky status bar). */
function useActiveSection(): string {
  const [active, setActive] = useState(SLUGS[0])
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const line = Math.min(160, window.innerHeight * 0.3)
      let current = SLUGS[0]
      for (const slug of SLUGS) {
        const el = document.getElementById(slug)
        if (el && el.getBoundingClientRect().top <= line) current = slug
      }
      // Short trailing sections never reach the reading line: at the bottom, the last one is current.
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      setActive(atBottom && window.scrollY > 0 ? SLUGS[SLUGS.length - 1] : current)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [])
  return active
}

/** Header / footer line: left, centre, right. The repeated title on the right is decorative in the h1. */
function ManLine({ left, centre, right, as: Tag = 'div', id }: { left: string; centre: string; right: string; as?: 'h1' | 'div'; id?: string }) {
  const decorative = Tag === 'h1'
  return (
    <Tag id={id} className="flex flex-wrap justify-between gap-x-[2ch] font-normal text-muted">
      <span>{left}</span> <span>{centre}</span>{' '}
      <span aria-hidden={decorative || undefined} className={decorative ? 'max-[379px]:hidden' : undefined}>
        {right}
      </span>
    </Tag>
  )
}

const LINK_BUTTON = 'inline-flex items-center gap-1.5 whitespace-nowrap px-2 py-1 text-xs uppercase tracking-wider text-fg hover:text-emerald'

export function DocsPage({ onNavigate }: DocsPageProps) {
  const active = useActiveSection()

  useEffect(() => {
    const previous = document.title
    document.title = DOC_TITLE
    return () => {
      document.title = previous
    }
  }, [])

  // Deep links (/docs#errors): the browser tried to scroll before the SPA rendered the target.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (id && SLUGS.includes(id)) document.getElementById(id)?.scrollIntoView({ block: 'start' })
  }, [])

  return (
    <main id="main" className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto grid w-full max-w-[79ch] grid-cols-1 gap-y-4 text-xs leading-5 sm:text-sm sm:leading-6 xl:w-auto xl:max-w-none xl:grid-cols-[24ch_79ch] xl:justify-center xl:gap-x-[6ch]">
        <div className="-mx-2 flex flex-wrap items-center justify-between gap-y-1 xl:col-start-2">
          <BracketButton onClick={() => onNavigate('/')}>
            <span aria-hidden="true">←</span> BACK
          </BracketButton>
          <div className="flex flex-wrap items-center">
            <a href="/docs?format=txt" className={LINK_BUTTON} aria-label="RAW plain-text man page">
              <span aria-hidden="true">[</span>
              <span>RAW</span>
              <span aria-hidden="true">]</span>
            </a>
            <CopyButton text={CURL_DOCS} label="COPY curl meatspace.sh/docs" className="normal-case!" />
          </div>
        </div>

        <nav aria-label="Manual sections" className="border-y border-line py-2 xl:col-start-1 xl:row-span-2 xl:row-start-1 xl:border-0 xl:py-0">
          <div className="xl:sticky xl:top-14">
            <p className="mb-2 hidden text-[11px] tracking-[0.14em] text-muted xl:block">SECTIONS</p>
            <ul className="flex flex-wrap gap-x-[2ch] gap-y-1 text-xs xl:block xl:space-y-1">
              {SECTIONS.map((s) => (
                <li key={s.slug}>
                  <a
                    href={`#${s.slug}`}
                    aria-current={active === s.slug ? 'location' : undefined}
                    className={active === s.slug ? 'text-emerald' : 'text-muted hover:text-fg'}
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <article aria-labelledby="man-title" className="min-w-0 xl:col-start-2">
          <header>
            <ManLine as="h1" id="man-title" left={MAN_TITLE} centre={MAN_MANUAL} right={MAN_TITLE} />
          </header>

          {SECTIONS.map((s) => (
            <section key={s.slug} id={s.slug} aria-labelledby={`${s.slug}-title`} className="mt-[1lh] scroll-mt-28 sm:scroll-mt-24 xl:scroll-mt-14">
              <h2 id={`${s.slug}-title`} className="font-bold text-fg">
                {s.title}
              </h2>
              <div className="pl-[3ch] sm:pl-[7ch]">
                <Blocks blocks={s.blocks} label={s.title} />
              </div>
            </section>
          ))}

          <footer className="mt-[1lh]">
            <ManLine left={MAN_VERSION} centre={MAN_DATE} right={MAN_TITLE} />
          </footer>
        </article>
      </div>
    </main>
  )
}
