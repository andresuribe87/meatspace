/**
 * /docs: MEATSPACE(1), the man page, in the Instrument design system. Same source as `curl https://meatspace.sh/docs`
 * (shared/manpage.ts): from md up, prose keeps the exact lines of the text page; below md the same words reflow.
 * Section index on the left (sticky from 1100px), ruler headings, commands on carbon screens that scroll inside
 * their own box. No syntax colours: only verdict words in console traces carry signal colour.
 */
import { Fragment, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'

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
import { CommandLine, CopyKey, Key, nobr, Ruler } from '../ds'
import { PUBLIC_ORIGIN } from '../lib/payload'

export interface DocsPageProps {
  onNavigate: (to: string) => void
}

const CURL_DOCS = `curl ${PUBLIC_ORIGIN}/docs`

const SECTIONS = MAN_SECTIONS.map((s) => ({ title: s.title, slug: manSlug(s.title), blocks: manBlocks(s) }))
const SLUGS = SECTIONS.map((s) => s.slug)

/* ----------------------------------------------------------------------------
 * Inline formatting
 * ------------------------------------------------------------------------- */

const URL_RE = /(https:\/\/[^\s"'<>]*[^\s"'<>.,;:)])/

/**
 * Absolute https URLs become real links; everything else stays plain text (product names kept whole: "SO-101").
 * `block`: a link alone on a preformatted line gets a 24px-tall target (WCAG 2.5.8), as it is not inside a sentence.
 */
function linkify(text: string, block = false): ReactNode {
  const parts = text.split(URL_RE)
  if (parts.length === 1) return nobr(text)
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <a key={i} href={part} className={block ? 'lnk inline-block max-w-full py-[4px] [overflow-wrap:anywhere]' : 'lnk'}>
        {part}
      </a>
    ) : (
      <Fragment key={i}>{nobr(part)}</Fragment>
    ),
  )
}

/** Verdict words that may carry signal colour in a console trace: emerald for agreement, amber for a refusal. */
const OK_WORDS: ReadonlySet<string> = new Set(['PASS', 'ACCEPTED', 'DISPATCHED', 'COMPILED', 'FOUND', 'QUEUED', 'OK'])
const WARN_WORDS: ReadonlySet<string> = new Set(['FAIL', 'REJECTED', 'REFUSED', 'UNSUPPORTED', 'NOT FOUND'])

/** Console trace line: muted offset, plain message, the trailing verdict word in signal colour. */
function consoleLine(line: string): ReactNode {
  const m = /^(\s*\+?\d+ms)?(.*?)(\b[A-Z][A-Z_]+)?$/.exec(line)
  const [, offset = '', rest = '', status = ''] = m ?? []
  const tone = OK_WORDS.has(status) ? 'ok' : WARN_WORDS.has(status) ? 'w' : null
  return (
    <>
      {offset ? <span className="p">{offset}</span> : null}
      {tone ? rest : rest + status}
      {tone ? <b className={tone}>{status}</b> : null}
    </>
  )
}

/** Code lines joined with real newlines (copy-exact). The "$ " prompt is muted and unselectable; comments muted. */
function codeContent(lines: readonly string[], style: CodeStyle | undefined): ReactNode {
  return lines.map((line, i) => {
    let node: ReactNode = line
    if (style === 'table') node = i === 0 ? <span className="c">{line}</span> : line
    else if (style === 'console') node = consoleLine(line)
    else if (style !== 'shell') {
      if (line.startsWith('$ ')) {
        node = (
          <>
            <span className="p">$ </span>
            {line.slice(2)}
          </>
        )
      } else if (line.startsWith('# ')) node = <span className="c">{line}</span>
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

/**
 * Carbon code screen whose <pre> becomes a scrollable, focusable, labelled region only while it actually scrolls
 * sideways. Otherwise it clips: a sub-pixel overflow would still make an `overflow: auto` box an unlabelled keyboard stop.
 */
function Screen({ label, name, children, copy }: { label: string; name?: string; children: ReactNode; copy?: string }) {
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
    <div className="code">
      {copy ? (
        <div className="code-h">
          <span className="t-legend">shell</span>
          <CopyKey text={copy} what={`${label} commands`} />
        </div>
      ) : null}
      <pre
        ref={ref}
        tabIndex={scrolls ? 0 : undefined}
        role={scrolls ? 'region' : undefined}
        aria-label={scrolls ? `${label}${name ? `: ${name.trim().slice(0, 48)}` : ''} (scrolls sideways)` : undefined}
        className={`whitespace-pre ${scrolls ? 'overflow-x-auto' : 'overflow-x-hidden'}`}
      >
        {children}
      </pre>
    </div>
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
    <p className="max-md:[overflow-wrap:anywhere]">
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 ? ' ' : null}
          <span className="md:block md:whitespace-pre">{linkify(line)}</span>
        </Fragment>
      ))}
    </p>
  )
}

/** Shell commands (no prompt in the source) get a copy key: they are meant to be pasted as written. */
function copyable(block: Extract<ManLeaf, { kind: 'code' }>): string | undefined {
  if (block.style === 'shell') return block.lines.join('\n')
  if (block.style === undefined && block.lines.some((l) => l.startsWith('$ '))) {
    return block.lines
      .filter((l) => !l.startsWith('# '))
      .map((l) => (l.startsWith('$ ') ? l.slice(2) : l))
      .join('\n')
  }
  return undefined
}

function Leaf({ block, label, depth }: { block: ManLeaf; label: string; depth: number }) {
  switch (block.kind) {
    case 'p':
      return <Prose text={block.text} depth={depth} />
    case 'pre':
      return (
        <pre className="break-words whitespace-pre-wrap">
          {block.lines.map((line, i) => (
            <span key={i} className="block" style={hang(line)}>
              {linkify(line, true) || ' '}
            </span>
          ))}
        </pre>
      )
    case 'code':
      if (block.style === 'table' && block.rows) return <TableLeaf block={block} label={label} />
      return (
        <Screen label={label} name={block.lines[0]} copy={copyable(block)}>
          {codeContent(block.lines, block.style)}
        </Screen>
      )
  }
}

/**
 * A column table: the exact text-page lines from md up; below md each row stacks (first cell in bold, then the others),
 * so no column is pushed off a phone screen.
 */
function TableLeaf({ block, label }: { block: Extract<ManLeaf, { kind: 'code' }>; label: string }) {
  const [head, ...rows] = block.rows ?? []
  return (
    <>
      <div className="max-md:hidden">
        <Screen label={label} name={block.lines[0]}>
          {codeContent(block.lines, block.style)}
        </Screen>
      </div>
      <dl className="border-t border-line md:hidden" aria-label={`${label}: ${head?.join(', ') ?? 'table'}`}>
        {rows.map((r, i) => (
          <div key={i} className="border-b border-line py-[var(--s-2)] [overflow-wrap:anywhere]">
            <dt className="font-semibold text-fg">
              {r[0]}
              {r.length > 2 ? <span className="muted"> · {nobr(r[1])}</span> : null}
            </dt>
            {r.slice(r.length > 2 ? 2 : 1).map((c, j) => (
              <dd key={j} className="muted">
                {nobr(c)}
              </dd>
            ))}
          </div>
        ))}
      </dl>
    </>
  )
}

function DefList({ items, label, depth }: { items: readonly ManItem[]; label: string; depth: number }) {
  return (
    <dl>
      {items.map((it, i) => (
        <div key={i} className={i > 0 ? 'mt-[1lh]' : undefined}>
          <dt className="font-semibold whitespace-pre-wrap text-fg">{it.term}</dt>
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

/** man(1) header / footer line: left, centre, right. Decorative: the H1 above carries the title. */
function ManLine({ left, centre, right }: { left: string; centre: string; right: string }) {
  return (
    <p className="t-legend flex flex-wrap justify-between gap-x-[2ch]" aria-hidden="true">
      <span>{left}</span>
      <span>{centre}</span>
      <span className="max-[379px]:hidden">{right}</span>
    </p>
  )
}

export function DocsPage({ onNavigate }: DocsPageProps) {
  const active = useActiveSection()

  // Deep links (/docs#errors): the browser tried to scroll before the SPA rendered the target.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (id && SLUGS.includes(id)) document.getElementById(id)?.scrollIntoView({ block: 'start' })
  }, [])

  const onBack = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    onNavigate('/')
  }

  return (
    <main id="main" className="page-wrap pt-[var(--s-6)] pb-[var(--s-9)]">
      <div className="mx-auto grid max-w-[calc(79ch+24ch+6ch)] grid-cols-1 gap-y-[var(--s-5)] lg:grid-cols-[24ch_minmax(0,79ch)] lg:gap-x-[6ch]">
        <header className="min-w-0 lg:col-start-2">
          <div className="ds-row justify-between">
            <Key variant="ghost" size="sm" href="/" onClick={onBack}>
              Home
            </Key>
            <span className="ds-row">
              <Key variant="ghost" size="sm" href="/docs?format=txt" aria-label="Raw plain-text man page">
                Raw
              </Key>
              <CopyKey text={CURL_DOCS} what="curl command for the manual" />
            </span>
          </div>
          <p className="t-legend mt-[var(--s-5)]">manual · the same text as curl, rendered</p>
          <h1 id="man-title" className="t-h1 mt-[var(--s-2)]">
            {MAN_TITLE}
          </h1>
          <div className="code mt-[var(--s-4)]">
            <CommandLine command={CURL_DOCS} label="Manual as plain text" />
          </div>
          <div className="mt-[var(--s-5)]">
            <ManLine left={MAN_TITLE} centre={MAN_MANUAL} right={MAN_TITLE} />
            <Ruler className="mt-[var(--s-2)]" />
          </div>
        </header>

        <nav aria-label="Manual sections" className="min-w-0 border-y border-line py-[var(--s-3)] lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:border-0 lg:py-0">
          <div className="lg:sticky lg:top-[calc(var(--header-h)+var(--s-5))]">
            <p className="t-legend mb-[var(--s-3)]">sections</p>
            <ul className="t-ui flex flex-wrap gap-x-[2ch] lg:block">
              {SECTIONS.map((s, i) => (
                <li key={s.slug}>
                  <a
                    href={`#${s.slug}`}
                    aria-current={active === s.slug ? 'location' : undefined}
                    className={`inline-block py-[3px] lg:flex lg:gap-[1.5ch] lg:border-l-2 lg:pl-[1.5ch] ${
                      active === s.slug ? 'text-fg lg:border-fg' : 'text-muted hover:text-fg lg:border-transparent'
                    }`}
                  >
                    <span className="tabular hidden lg:inline" aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* The manual is the plain-text page (curl /docs) rendered as written: its figures are generated from the report
            index by shared/manpage.ts, never typed, and the whole text carries that one provenance. */}
        <article
          aria-labelledby="man-title"
          className="t-ui min-w-0 text-fg lg:col-start-2"
          data-verbatim="shared/manpage.ts (MEATSPACE(1), figures from /data/reports/index.json)"
        >
          {SECTIONS.map((s) => (
            <section key={s.slug} id={s.slug} aria-labelledby={`${s.slug}-title`} className="mt-[var(--s-6)] scroll-mt-[calc(var(--header-h)+var(--s-4))] first:mt-0">
              <h2 id={`${s.slug}-title`} className="t-h3 tracking-[0.04em]">
                {s.title}
              </h2>
              <Ruler className="mt-[var(--s-2)] mb-[var(--s-4)]" />
              <div className="pl-[2ch] sm:pl-[7ch]">
                <Blocks blocks={s.blocks} label={s.title} />
              </div>
            </section>
          ))}

          <footer className="mt-[var(--s-7)]">
            <Ruler className="mb-[var(--s-2)]" />
            <ManLine left={MAN_VERSION} centre={MAN_DATE} right={MAN_TITLE} />
          </footer>
        </article>
      </div>
    </main>
  )
}
