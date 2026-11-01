import '../ds/reference.css'

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'

import { CAPABILITIES, CAPABILITY_STATUS, CAPABILITY_STATUSES, LAMPS, capability } from '../../shared/status'
import {
  Callout,
  CertificateHeader,
  Check,
  CheckPoll,
  CIBars,
  CodeBlock,
  CommandLine,
  Console,
  ConceptBanner,
  CurlBlock,
  Dialog,
  Field,
  FieldGrid,
  ChannelKeys,
  Ids,
  Input,
  IntervalMeter,
  Key,
  LagReadout,
  Lamp,
  Ledger,
  ModeSwitch,
  Num,
  Panel,
  PowerSelector,
  ProvenanceFrame,
  Reading,
  RevisionTable,
  Ruler,
  ScopePlot,
  ScopeStrips,
  Seal,
  SectionHeader,
  Select,
  SignalChain,
  StatusLine,
  Table,
  Tabs,
  Textarea,
  ALL_CHANNELS,
  fmt,
  type ChannelVisibility,
  type Column,
  type ConsoleEvent,
  type KeyBusy,
} from '../ds'
import { contrast } from '../ds/math'
import { SAMPLE_EPISODE, SAMPLE_FPS, SAMPLE_INDEX, SAMPLE_LAG, SAMPLE_RMSE, SAMPLE_RMSE_MEAN, type SampleIndexRow } from '../ds/sample'

/** Provenance of every ratio on this page: computed in the browser from the live tokens. */
const CONTRAST_PROV = 'computed in the page: WCAG 2.x contrast of the live tokens in src/index.css'

/* ------------------------------------------------------------------------------------------------ */

function Label({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <p className="dsr-label" style={style}>
      {children}
    </p>
  )
}

function Cell({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`dsr-cell ${className}`}>{children}</div>
}

/* ---------------------------------------------- 00 ---------------------------------------------- */

const RULES: [string, ReactNode][] = [
  [
    'No bare numbers.',
    <>
      A value ships as a reading: value, unit, 95% interval, <i>n</i>. Numbers are default-deny: a Num without provenance can only render as UNCAL, with a
      dashed amber underline. Nobody has to remember to flag a placeholder. The production build fails if one survives.
    </>,
  ],
  [
    'Reality is solid. Simulation is dashed.',
    'CH1 real is a solid 1.5px reference drawn last, inside a faint ±tolerance band. Twins are dashed channels underneath it, so where a twin agrees with the robot its dashes disappear behind the line. Dashed also marks anything not measured.',
  ],
  [
    'Colour is signal, never decoration.',
    'Emerald means agreement, pass or live. An amber outline with ▲ is a measured gap. An amber fill with ✕ is a fault or a refusal. Cyan and orchid draw data channels and nothing else. There is no red.',
  ],
  [
    'Two monospaces, one voice.',
    'Martian Mono is the readout face: display, H1/H2, readouts, 22px and up. JetBrains Mono is the terminal: UI, body, tables, code, legends, axes. Atkinson Hyperlegible Next carries prose, because a misread character in a sha or a unit is a defect.',
  ],
  [
    'Status is grammar.',
    'Every capability wears a lamp: live, preview, planned, waitlist, on request, concept, refused. One source of truth (shared/status.ts) drives the UI, the /v1 responses and the man page. Nothing is live until it works at that URL.',
  ],
  [
    'Change the timebase, not the signal.',
    'Small screens drop from 10 to 5 divisions and double the s/div. Traces are never squashed, smoothed or clipped. Δ scales autoscale on a 1-2-5 sequence. Verdict columns never drop off a phone.',
  ],
  [
    'Terminals don’t fade.',
    'State changes take 0ms. Nothing ticks unless it measures something. Anything that updates on its own can be paused and stops when hidden or under reduced motion. Busy controls show state and elapsed time, never a spinner.',
  ],
]

function SystemSection() {
  return (
    <section id="ds-system" className="dsr-sec" aria-labelledby="ds-system-h">
      <div className="t-legend" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', paddingBottom: 8 }}>
        <span>meatspace.sh · design system v1.0 · rev B</span>
        <span>instrument · sheet 00 · living reference</span>
      </div>
      <Ruler />
      <div className="g10" style={{ marginTop: 'var(--s-7)', alignItems: 'end' }}>
        <div className="c-6">
          <h1 id="ds-system-h" className="dsr-cover-h">
            An instrument for the gap between a simulated robot and a real one.
          </h1>
        </div>
        <div className="c-4">
          <Seal
            word="system record"
            label="System calibration record"
            lamp={
              <Lamp status="ISSUED" size="sm">
                rev B
              </Lamp>
            }
            rows={[
              ['System', 'meatspace.sh DS v1.0 (Instrument, converged)'],
              ['Faces', 'Martian Mono · JetBrains Mono · Atkinson Hyperlegible Next (OFL)'],
              ['Text', '≥ 4.5:1 on carbon, panel and raised'],
              ['Edges', '≥ 3:1 on every surface (#6B7588)'],
              ['Channels', 'CH1 real · CH2 stock · CH3 calibrated · cmd'],
              ['Radius', '0'],
            ]}
          />
        </div>
      </div>
      <div className="g10" style={{ marginTop: 'var(--s-6)' }}>
        <p className="c-5 t-lede">
          meatspace.sh measures one thing: how far a robot’s simulated twin drifts from the robot, and how much of that drift a calibrated twin removes. So the
          interface is built like the bench equipment that takes that measurement. Reality is the reference trace. Every number is a reading with a unit, an
          interval and an <i>n</i>. Anything not measured says so, in the same visual language as everything else.
        </p>
        <p className="c-5 t-prose muted">
          The founder’s identity carries over: carbon, emerald, amber, square corners, a monospace voice and <span className="nw">stdout to reality.</span>{' '}
          JetBrains Mono stays the terminal face. Martian Mono becomes the readout face. Prose moves to a sans built for legibility. The traction ticker and
          the withdrawn claims are gone, and the components make it hard to bring them back.
        </p>
      </div>

      <h2 className="t-legend" style={{ margin: 'var(--s-8) 0 var(--s-3)' }}>
        Seven rules
      </h2>
      <ol className="dsr-rules">
        {RULES.map(([h, p], i) => (
          <li key={h}>
            <b aria-hidden="true">{String(i + 1).padStart(2, '0')}</b>
            <h3>{h}</h3>
            <p>{p}</p>
          </li>
        ))}
      </ol>

      <div className="g10" style={{ marginTop: 'var(--s-7)' }}>
        <div className="c-6">
          <h2 className="t-legend" style={{ marginBottom: 'var(--s-3)' }}>
            Revisions <span className="note-tag" style={{ marginLeft: 8 }}>C-22 revision table</span>
          </h2>
          <RevisionTable
            label="Design system revisions"
            rows={[
              { rev: 'A', date: '2026-11-01', change: 'Instrument proposed, alongside Specification and Telemetry.' },
              {
                rev: 'B',
                date: '2026-11-01',
                change:
                  'Converged. JetBrains Mono restored as the terminal face, Martian Mono kept for readouts, serif replaced by Atkinson. Edge #5C646F to #6B7588. Orchid #E652A3 to #B0449A, violet removed. Default-deny numbers, small multiples, gap comb, fault state, slider playhead, forced colours, PREVIEW status.',
              },
              {
                rev: 'B.1',
                date: '2026-11-01',
                change:
                  'Ported to the codebase (src/ds). Hollow lamps, the real-channel key and the seal fold drawn with borders instead of shadows and gradients, so the no-shadow audit holds.',
              },
            ]}
          />
        </div>
        <div className="c-4">
          <h2 className="t-legend" style={{ marginBottom: 'var(--s-3)' }}>
            Taken from the other two directions
          </h2>
          <ul className="dsr-taken">
            <li>
              <Lamp status="SIM" size="sm">
                spec
              </Lamp>
              <p>default-deny number, provenance frame, title block, revision table, datasheet table, vernier lag ruler, RFC 2119 callouts, part numbers, the edge token, forced colours</p>
            </li>
            <li>
              <Lamp status="SIM" size="sm">
                tlm
              </Lamp>
              <p>gap comb in the Δ pane, real drawn with its band, small multiples on one playhead, slider ARIA, fault by fill, check poll, power selector (planned), elapsed time instead of spinners, PREVIEW</p>
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------------------- 01 ---------------------------------------------- */

type SwatchKind = 's' | 'l' | 't' | 'c'
const SURFACES: [string, string, string, SwatchKind][] = [
  ['--color-bg', 'carbon', 'bg / screen', 's'],
  ['--color-panel', 'panel', 'panel', 's'],
  ['--color-raised', 'raised', 'raised · hover, selected, input well', 's'],
  ['--color-line', 'line', 'hairline · structure only', 'l'],
  ['--color-edge', 'edge', 'control edge · ≥ 3:1', 'l'],
  ['--color-grat-axis', 'grat-axis', 'graticule axis · decorative', 'l'],
  ['--color-fg', 'fg', 'text', 't'],
  ['--color-muted', 'muted', 'muted text · replaces #64748B', 't'],
  ['--color-dim', 'dim', 'disabled + decoration only', 't'],
]
const SIGNALS: [string, string, string, SwatchKind][] = [
  ['--color-emerald', 'emerald', 'agreement · pass · live', 't'],
  ['--color-amber', 'amber', 'gap · uncal · fault', 't'],
  ['--color-ch-stock', 'cyan', 'CH2 stock twin · data only', 'c'],
  ['--color-ch-cal', 'orchid', 'CH3 calibrated · data only', 'c'],
]

function readTokens(): Record<string, string> {
  const cs = getComputedStyle(document.documentElement)
  const out: Record<string, string> = {}
  for (const [v] of [...SURFACES, ...SIGNALS]) out[v] = cs.getPropertyValue(v).trim()
  return out
}

function Ratio({ v }: { v: number }) {
  return <Num value={v} prov={CONTRAST_PROV} />
}

function Swatches({ items, tokens }: { items: [string, string, string, SwatchKind][]; tokens: Record<string, string> }) {
  const bg = tokens['--color-bg']
  const panel = tokens['--color-panel']
  const raised = tokens['--color-raised']
  const fg = tokens['--color-fg']
  const muted = tokens['--color-muted']
  const ok = (h: string | undefined) => !!h && /^#[0-9a-f]{3,8}$/i.test(h)
  return (
    <div className="dsr-swatches">
      {items.map(([v, name, role, kind]) => {
        const hex = tokens[v]
        const ready = ok(hex) && ok(bg) && ok(panel) && ok(raised)
        return (
          <div key={v} className="dsr-swatch">
            <div className="chip" aria-hidden="true" style={kind === 'l' ? { background: panel } : { background: hex }}>
              {kind === 'l' ? <i style={{ borderTopColor: hex }} /> : null}
            </div>
            <div className="meta">
              <b>
                {name} {hex?.toUpperCase()}
              </b>
              <span>{role}</span>
              {ready ? (
                kind === 's' ? (
                  <span className="cr">
                    fg on it <Ratio v={contrast(fg, hex)} /> · muted <Ratio v={contrast(muted, hex)} />
                  </span>
                ) : (
                  <span className="cr">
                    carbon · panel · raised <Ratio v={contrast(hex, bg)} /> · <Ratio v={contrast(hex, panel)} /> · <Ratio v={contrast(hex, raised)} />
                  </span>
                )
              ) : null}
              {ready && (name === 'emerald' || name === 'amber') ? (
                <span className="cr">
                  carbon on fill <Ratio v={contrast(bg, hex)} />
                </span>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Channel key demo: the four strokes, then agreement vs gap. Shapes only, drawn from tokens. */
function ChannelDemo() {
  const mj = (s: number) => 10 * s ** 3 - 15 * s ** 4 + 6 * s ** 5
  const vx = 440
  const vw = 170
  const curve = (yb: number, off: number) => {
    let d = ''
    for (let i = 0; i <= 60; i++) {
      const x = vx + (i / 60) * vw
      const y = yb - 22 * mj(Math.min(1, Math.max(0, (i - 10 - off) / 30)))
      d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
    }
    return d
  }
  const band = (yb: number) => {
    let u = ''
    let l = ''
    for (let i = 0; i <= 60; i++) {
      const x = vx + (i / 60) * vw
      const y = yb - 22 * mj(Math.min(1, Math.max(0, (i - 10) / 30)))
      u += `${i ? 'L' : 'M'}${x.toFixed(1)} ${(y - 2.5).toFixed(1)}`
    }
    for (let i = 60; i >= 0; i--) {
      const x = vx + (i / 60) * vw
      const y = yb - 22 * mj(Math.min(1, Math.max(0, (i - 10) / 30)))
      l += `L${x.toFixed(1)} ${(y + 2.5).toFixed(1)}`
    }
    return u + l + 'Z'
  }
  const rows: ['real' | 'stock' | 'cal' | 'cmd', string, number][] = [
    ['real', 'CH1 real · solid 1.5 on top, ±1° band', 1.5],
    ['stock', 'CH2 stock twin · dash 8 4', 2],
    ['cal', 'CH3 calibrated · dash 6 3', 2],
    ['cmd', 'command a[t] · dot 1 3', 1],
  ]
  return (
    <svg
      viewBox="0 0 620 150"
      className="viz"
      style={{ width: '100%', height: 'auto', display: 'block' }}
      role="img"
      aria-label="Channel styles: CH1 real solid line inside a tolerance band, CH2 stock dashed 8 4, CH3 calibrated dashed 6 3, command dotted. Where a twin agrees its dashes disappear behind the real line; where it does not, the gap shows."
    >
      {rows.map(([k, l, w], i) => {
        const y = 18 + i * 24
        return (
          <g key={k}>
            {k === 'real' ? <rect x={0} y={y - 5} width={120} height={10} className="f-mask" /> : null}
            <line x1={0} x2={120} y1={y} y2={y} className={`tr tr-${k}`} strokeWidth={w} />
            <text x={134} y={y + 4} className="lbl-t" style={{ fontSize: 11.5 }}>
              {l}
            </text>
          </g>
        )
      })}
      <text x={vx} y={12} style={{ fontSize: 10, letterSpacing: '.08em' }}>
        AGREE
      </text>
      <text x={vx} y={82} style={{ fontSize: 10, letterSpacing: '.08em' }}>
        GAP
      </text>
      <path d={band(56)} className="f-mask" />
      <path d={curve(56, 0.4)} className="tr tr-cal" strokeWidth={2} />
      <path d={curve(56, 0)} className="tr tr-real" strokeWidth={1.5} />
      <path d={band(140)} className="f-mask" />
      <path d={curve(140, -7)} className="tr tr-stock" strokeWidth={2} />
      <path d={curve(140, 0)} className="tr tr-real" strokeWidth={1.5} />
    </svg>
  )
}

function TokensSection() {
  const tokens = useMemo(() => readTokens(), [])
  return (
    <section id="ds-tokens" className="dsr-sec" aria-labelledby="ds-tokens-h">
      <SectionHeader
        numeral="01"
        eyebrow="foundations"
        id="ds-tokens-h"
        title="Tokens: a closed palette, three faces, one grid"
        description="Founder values kept verbatim. Every addition was measured. The ratios below are computed in the page from the live tokens, against carbon, panel and raised, so they carry provenance."
      />
      <Label>
        <b>Colour</b> · surfaces, lines, text
      </Label>
      <Swatches items={SURFACES} tokens={tokens} />
      <Label style={{ marginTop: 'var(--s-5)' }}>
          <b>Colour</b> · signal and channels
      </Label>
      <Swatches items={SIGNALS} tokens={tokens} />

      <div className="g10" style={{ marginTop: 'var(--s-5)' }}>
        <Cell className="c-6">
          <Label>
            <b>Channels</b> · line style is the second encoding, always
          </Label>
          <ChannelDemo />
        </Cell>
        <Cell className="c-4">
          <Label>
            <b>Validation</b>
          </Label>
          <ul className="dsr-list t-ui" style={{ gap: 8 }}>
            <li>
              Channel pair on carbon, panel, raised: <b>CVD worst ΔE 10.0</b> (deutan, target 8), normal-vision ΔE 26.7, both ≥ 3:1.
            </li>
            <li>With emerald and amber in the set, the worst pair is the founder’s emerald/amber (protan ΔE 8.9). Orchid no longer reads as emerald (was ΔE 6.0).</li>
            <li>Status colours never draw series. Text never wears a series colour.</li>
            <li>Paper pair #0088AF / #A90959: CVD ΔE 13.7, 3.62 / 6.48 on paper.</li>
          </ul>
        </Cell>
      </div>

      <Label style={{ marginTop: 'var(--s-7)' }}>
          <b>Type</b> · role is the face: readout, terminal, prose · samples are glyphs, not readings
      </Label>
      <div className="dsr-type">
        <div>
          <p className="meta">
            <b>display · t-display</b>
            <br />
            Martian Mono 300 · 76/0.98 · wdth 87.5 · −0.035em
            <br />
            phone 50
          </p>
          <p className="ex t-display">stdout to reality.</p>
        </div>
        <div>
          <p className="meta">
            <b>readout xl · Reading size=&quot;xl&quot;</b>
            <br />
            Martian Mono 250 · 112 · wdth 112.5
            <br />° full size, alpha units .42em
          </p>
          <p className="ex">
            <span className="ro-v xl">
              <span className="n">1.07</span>
              <span className="deg">°</span>
              <span className="tol" aria-hidden="true">
                <span>+0.08</span>
                <span>−0.07</span>
              </span>
            </span>
          </p>
        </div>
        <div>
          <p className="meta">
            <b>readout l / m / s</b>
            <br />
            64 · 40 · 26, proportional digits
          </p>
          <p className="ex ds-row" style={{ gap: 28, alignItems: 'baseline' }}>
            <span className="ro-v l">
              <span className="n">133</span>
              <span className="uu sp">ms</span>
            </span>
            <span className="ro-v m">
              <span className="n">−79</span>
              <span className="uu">%</span>
            </span>
            <span className="ro-v s">
              <span className="n">3.98</span>
              <span className="uu sp">fr</span>
            </span>
          </p>
        </div>
        <div>
          <p className="meta">
            <b>h1 / h2 · t-h1, t-h2</b>
            <br />
            Martian Mono 350 / 380 · 48 / 30 · wdth 87.5
          </p>
          <p className="ex">
            <span className="t-h1" style={{ display: 'block' }}>
              Twin Gap Reports
            </span>
            <span className="t-h2" style={{ display: 'block', marginTop: 8 }}>
              Measure the twin. Run on the twin.
            </span>
          </p>
        </div>
        <div>
          <p className="meta">
            <b>h3 · body · ui · code</b>
            <br />
            JetBrains Mono 600/400 · 16 · 14 · 13 · 13/1.7
            <br />
            &quot;zero&quot; on, &quot;calt&quot; off
          </p>
          <p className="ex">
            <span className="t-h3" style={{ display: 'block' }}>
              Held-out episodes
            </span>
            <span className="t-body" style={{ display: 'block' }}>
              curl -s https://meatspace.sh/v1/reports -&gt; 200 OK, 0 errors, &lt;= 5 req/min
            </span>
          </p>
        </div>
        <div>
          <p className="meta">
            <b>legend · annunciator</b>
            <br />
            JetBrains Mono 500/600 · 11 / 10.5 · caps +0.08em
          </p>
          <p className="ex ds-row">
            <span className="t-legend">ch1 real · 10.0°/div · m 1.00 s/div</span>
            <Lamp status="PREVIEW" />
          </p>
        </div>
        <div>
          <p className="meta">
            <b>lede · prose · caption</b>
            <br />
            Atkinson Hyperlegible Next 400 · 20 · 17 · 14.5
            <br />
            prose only, max 70ch
          </p>
          <p className="ex">
            <span className="t-lede" style={{ display: 'block', maxWidth: '60ch' }}>
              We replay real robot logs in the robot’s published MuJoCo twin and report, joint by joint, how far the twin is from the robot.
            </span>
            <span className="t-caption" style={{ display: 'block', marginTop: 6 }}>
              Il1| O0 rn/m 5S 8B: a misread character in a sha or a unit is a defect.
            </span>
          </p>
        </div>
      </div>

      <div className="g10" style={{ marginTop: 'var(--s-7)' }}>
        <Cell className="c-4">
          <Label>
            <b>Space</b> · 4px base
          </Label>
          <div className="dsr-spacing">
            {[4, 8, 12, 16, 24, 32, 48, 64, 96, 128].map((v, i) => (
              <div key={v}>
                <i style={{ width: v }} aria-hidden="true" />
                <span>
                  s-{i + 1} · {v}px
                </span>
              </div>
            ))}
          </div>
        </Cell>
        <Cell className="c-3">
          <Label>
            <b>Grid</b> · the page is a graticule
          </Label>
          <ul className="dsr-list t-ui">
            <li>desktop: 10 divisions, gutter 24, margin 48, max 1440</li>
            <li>≤ 1100: margin 32, spans go full width</li>
            <li>≤ 700: 5 divisions, gutter 16, margin 16</li>
            <li>plots: 10 x-div × 8 y-div; 5 x-div under a 560px container, s/div doubles</li>
            <li>radius 0 everywhere. No shadows, no blur.</li>
          </ul>
        </Cell>
        <Cell className="c-3">
          <Label>
            <b>Motion + layers</b>
          </Label>
          <ul className="dsr-list t-ui">
            <li>state change: 0ms, no transitions</li>
            <li>blink (armed lamp, stream cursor): 1000ms steps(1)</li>
            <li>trace sweep 1200ms linear: deferred to v0.3</li>
            <li>reduced motion: all of the above off</li>
            <li>z: plot 10 · sticky 40 · popover 60 · dialog 80</li>
          </ul>
        </Cell>
      </div>
    </section>
  )
}

/* ---------------------------------------------- 02 ---------------------------------------------- */

const PREFLIGHT: Omit<ConsoleEvent, 't'>[] = [
  { event: 'resolve', payload: '{"dataset":"lerobot/svla_so101_pickplace","hub":"found"}', verdict: 'found', tone: 'ok' },
  { event: 'info', payload: '{"codebase":"v3.0","robot_type":"so100_follower","fps":30,"episodes":50}', verdict: 'pass', tone: 'ok' },
  { event: 'twin', payload: '{"twin":"robotstudio_so101","from":"robot_type + name"}', verdict: 'likely', tone: 'ok' },
  { event: 'units', payload: '{"checked":"on download","unverifiable":"report stops"}', verdict: 'note' },
  { event: 'queue', payload: '{"request":"rq_demo","run":"by hand","signed":false}', verdict: 'queued', tone: 'ok' },
]

/** C-08 demo: rows print as the timers fire and each carries this page's real elapsed ms (not staged offsets). */
function ConsoleDemo() {
  const [events, setEvents] = useState<ConsoleEvent[]>([])
  const [busy, setBusy] = useState<KeyBusy | null>(null)
  const [done, setDone] = useState<{ ms: number } | null>(null)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])
  const run = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
    const t0 = performance.now()
    setEvents([])
    setDone(null)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      const t = performance.now() - t0
      setEvents(PREFLIGHT.map((e) => ({ ...e, t })))
      setDone({ ms: t })
      return
    }
    setBusy({ startedAt: t0 })
    PREFLIGHT.forEach((e, k) => {
      timers.current.push(
        window.setTimeout(() => {
          const t = performance.now() - t0
          setEvents((prev) => [...prev, { ...e, t }])
          if (k === PREFLIGHT.length - 1) {
            setBusy(null)
            setDone({ ms: t })
          }
        }, 180 + k * 230),
      )
    })
  }
  return (
    <Console
      title={
        <>
          preflight // <b>POST /v1/twin-reports</b>
        </>
      }
      status="SIM"
      events={events}
      idle="Press Run: a sample stream prints with this page’s real elapsed times."
      exit={done ? { code: 0, summary: `${events.length} events · ${(done.ms / 1000).toFixed(2)} s · sample, nothing ran` } : null}
      run={{ label: done ? 'Run again' : 'Run', onRun: run, busy }}
      footer={[done ? `${events.length} events · elapsed ${(done.ms / 1000).toFixed(3)} s` : 'sample stream · times are elapsed, not staged', 'no report is run here · a person runs it']}
      announce={done ? `Preflight finished: ${events.length} events.` : ''}
      label="Preflight stream"
    />
  )
}

const INDEX_COLS: Column<SampleIndexRow>[] = [
  { key: 'id', header: 'dataset', lead: true, sort: (r) => r.id, cell: (r) => <Ids>{r.id}</Ids> },
  { key: 'twin', header: 'twin', cell: (r) => r.twin },
  { key: 'n', header: 'held-out', align: 'right', sort: (r) => (r.refused ? null : (r.n ?? null)), cell: (r) => r.n },
  {
    key: 'stock',
    header: 'stock rmse',
    align: 'right',
    sort: (r) => r.stock?.mean ?? null,
    cell: (r) =>
      r.stock ? (
        <>
          <Num value={r.stock.mean} placeholder />
          <span className="ci">
            {' '}
            [{fmt(r.stock.lo)}, {fmt(r.stock.hi)}]
          </span>
        </>
      ) : null,
  },
  {
    key: 'cal',
    header: 'calibrated rmse',
    align: 'right',
    sort: (r) => r.cal?.mean ?? null,
    cell: (r) =>
      r.cal ? (
        <>
          <Num value={r.cal.mean} placeholder />
          <span className="ci">
            {' '}
            [{fmt(r.cal.lo)}, {fmt(r.cal.hi)}]
          </span>
        </>
      ) : null,
  },
  {
    key: 'chg',
    header: 'change [95% CI]',
    align: 'right',
    sort: (r) => r.change?.mean ?? null,
    cell: (r) =>
      r.change ? (
        <>
          <Num value={r.change.mean} digits={0} placeholder />%
          <span className="ci">
            {' '}
            [{fmt(r.change.lo, 0)}, {fmt(r.change.hi, 0)}]
          </span>
        </>
      ) : null,
  },
  { key: 'lag', header: 'lag real / stock / cal', className: 'muted', cell: (r) => r.lag?.map((v) => v.toFixed(2)).join(' / ') },
  {
    key: 'bar',
    header: 'bar',
    cell: (r) => {
      const met = !!r.change && !!r.lag && r.change.mean <= -50 && Math.abs(r.lag[2] - r.lag[0]) <= 1
      return met ? <Lamp status="MET" size="sm" uncal /> : <Lamp status="BELOW BAR" size="sm" />
    },
  },
]

const COMPONENTS: [string, string, string, string][] = [
  ['C-01', 'Softkey', 'Key', 'Arms or submits one action. Never two primaries in one view.'],
  ['C-02', 'Annunciator', 'Lamp', 'Lamp, word and colour from shared/status.ts. Never colour alone, never a glyph lamp.'],
  ['C-03', 'Num', 'Num', 'Renders a value with its source. Without one it can only render as UNCAL.'],
  ['C-04', 'Readout', 'Reading', 'Value, unit, interval, n. Never a bare number, never a stat tile.'],
  ['C-05', 'Field', 'Field, Input, Select, Textarea, Check', 'Unit lives in the control. Errors say what to do.'],
  ['C-06', 'Tabs · mode · probe keys', 'Tabs, ModeSwitch, ChannelKeys', 'Roving tabindex. Real mode stays disabled until a cell exists.'],
  ['C-07', 'Code / curl', 'CodeBlock, CurlBlock, CopyKey', 'Copy-exact. Planned endpoints say PLANNED.'],
  ['C-08', 'NDJSON console', 'Console', 'Shows real elapsed time. Never staged offsets presented as real.'],
  ['C-09', 'Callout', 'Callout', 'RFC 2119 register: method, limitation, must not, within tolerance.'],
  ['C-10', 'Report table', 'Table, ScrollBox', 'Includes refused rows. Sortable headers carry aria-sort.'],
  ['C-11', 'Dialog', 'Dialog', 'Native dialog, Esc closes, focus returns. Never charges.'],
  ['C-12', 'Status line', 'StatusLine', 'Static facts built from files. No LIVE dot, no traction.'],
  ['C-14', 'Capability ledger', 'Ledger', 'Part numbers plus lifecycle, from shared/status.ts.'],
  ['C-15', 'Calibration seal', 'Seal', 'A record of a fit, with its package hash.'],
  ['C-16', 'Concept banner', 'ConceptBanner', 'Marks /concept on every scroll position.'],
  ['C-17', 'Instrument screen', 'ScopePlot, ScopeStrips', 'Bezel scale annotations, playhead slider, table view.'],
  ['C-18', 'Ruler', 'Ruler', 'The only ornament. Never inside a panel.'],
  ['C-19', 'Signal chain', 'SignalChain', 'Explains the steps with their status, no marketing.'],
  ['C-20', 'Title block · provenance frame', 'TitleBlock, ProvenanceFrame, CertificateHeader', 'dataset@rev, twin@sha, split, method under every headline.'],
  ['C-21', 'Check poll', 'CheckPoll', 'Maps the report checks: units, mapping, split, held-out, contact, signing.'],
  ['C-22', 'Revision table', 'RevisionTable', 'Records what changed, including what was withdrawn.'],
  ['C-23', 'Power selector', 'PowerSelector, IntervalMeter', 'Planned. Wilson and Newcombe, n tags. Needs the real cell.'],
  ['C-24', 'Characteristics table', 'Table', 'Datasheet table view: symbol and conditions per row.'],
  ['Fig', 'Figures', 'Figure, CIBars, LagReadout', 'Header, UNCAL lamp while placeholders exist, table view, sans caption.'],
]

function ComponentsSection() {
  const [mode, setMode] = useState('sim')
  const [ch, setCh] = useState<ChannelVisibility>({ ...ALL_CHANNELS, cal: false })
  const [busy, setBusy] = useState<KeyBusy | null>(null)
  const [dlg, setDlg] = useState(false)
  const [trials, setTrials] = useState('20')
  const busyTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(busyTimer.current), [])
  const runPreflight = () => {
    setBusy({ startedAt: performance.now() })
    window.clearTimeout(busyTimer.current)
    busyTimer.current = window.setTimeout(() => setBusy(null), 2400)
  }
  const n = Number(trials)
  return (
    <section id="ds-components" className="dsr-sec" aria-labelledby="ds-components-h">
      <SectionHeader
        numeral="02"
        eyebrow="front panel"
        id="ds-components-h"
        title="Components, with every state"
        description="Named after the parts of a bench instrument, written in the site’s vocabulary. Every one is a typed React component in src/ds; the API reference is src/ds/README.md."
      />
      <div className="g10">
        <Cell className="c-5">
          <Label>
            <b>C-01</b> Key · 36px, 44px on coarse pointers
          </Label>
          <div className="ds-stack">
            <div className="ds-row">
              <Key variant="primary">Request a report</Key>
              <Key variant="primary" className="is-hover" tabIndex={-1} aria-hidden="true">
                hover
              </Key>
              <Key variant="primary" className="is-focus" tabIndex={-1} aria-hidden="true">
                focus
              </Key>
              <Key variant="primary" disabled>
                disabled
              </Key>
            </div>
            <div className="ds-row">
              <Key variant="secondary">Read the reports</Key>
              <Key variant="secondary" className="is-hover" tabIndex={-1} aria-hidden="true">
                hover
              </Key>
              <Key variant="run" glyph busy={busy} onClick={runPreflight}>
                Run preflight
              </Key>
              <Key variant="caution">Raise cap</Key>
            </div>
            <div className="ds-row">
              <Key variant="ghost" href="#ds-components">
                Docs
              </Key>
              <Key variant="ghost" href="#ds-components" current>
                Reports
              </Key>
              <Key variant="secondary" size="sm">
                Small
              </Key>
            </div>
            <p className="t-caption">
              One primary per view: the brightest object on screen. Hover inverts with no transition. Press Run preflight: a busy key shows its state and the
              elapsed time, never a spinner. Ghost keys keep the v0.1 [ brackets ].
            </p>
          </div>
        </Cell>
        <Cell className="c-5">
          <Label>
            <b>C-02</b> Lamp · shape + word + colour, never colour alone
          </Label>
          <div className="ds-stack">
            <div className="ds-row">
              <span className="t-legend" style={{ width: 84 }}>
                available
              </span>
              {CAPABILITY_STATUSES.map((s) => (
                <Lamp key={s} status={s} />
              ))}
            </div>
            <div className="ds-row">
              <span className="t-legend" style={{ width: 84 }}>
                verdict
              </span>
              <Lamp status="PASS" />
              <Lamp status="WITHIN TOL" />
              <Lamp status="MARGINAL" />
              <Lamp status="OUT OF TOL" />
              <Lamp status="FAULT" />
            </div>
            <div className="ds-row">
              <span className="t-legend" style={{ width: 84 }}>
                data / run
              </span>
              <Lamp status="UNCAL" />
              <Lamp status="PASS" uncal>
                pass · on uncal
              </Lamp>
              <Lamp status="ARMED" />
              <Lamp status="SIM" />
              <Lamp status="REAL" />
            </div>
            <p className="t-caption">
              Lamps are drawn in CSS, so no status depends on a glyph a font might lack. Dashed means not measured. A verdict computed from UNCAL numbers stays
              dashed. At most one lit amber lamp per panel. The vocabulary lives in shared/status.ts:
            </p>
            <Table
              label="Capability status vocabulary"
              compact
              rows={[...CAPABILITY_STATUSES]}
              rowKey={(s) => s}
              columns={[
                { key: 'w', header: 'word', cell: (s) => <Lamp status={s} size="sm" /> },
                { key: 'api', header: '/v1', cell: (s) => <code>{CAPABILITY_STATUS[s].api}</code> },
                { key: 'shape', header: 'lamp', cell: (s) => LAMPS[CAPABILITY_STATUS[s].kind].shape },
                { key: 'm', header: 'meaning', wrap: true, cell: (s) => CAPABILITY_STATUS[s].meaning },
              ]}
            />
          </div>
        </Cell>

        <Cell className="c-5">
          <Label>
            <b>C-03</b> Num · default-deny provenance <Lamp status="UNCAL" size="sm" />
          </Label>
          <div className="ds-stack">
            <div className="ds-row" style={{ gap: 28, alignItems: 'baseline' }}>
              <span className="t-ui">
                no prov:{' '}
                <span className="ro-v s">
                  <Num className="n" value={5.06} placeholder />
                  <span className="deg">°</span>
                </span>
              </span>
              <span className="t-ui">
                with prov:{' '}
                <span className="ro-v s">
                  <Num
                    className="n"
                    value={contrast('#e2e8f0', '#090a0c')}
                    prov={{
                      ref: 'src/index.css#--color-fg/--color-bg',
                      reading: 'fg on carbon, WCAG 2.x contrast ratio',
                      field: '--color-fg (#E2E8F0) on --color-bg (#090A0C)',
                      file: 'src/index.css',
                      report: 'computed in the browser by src/ds/math.ts contrast()',
                    }}
                  />
                  <span className="uu sp">:1</span>
                </span>
              </span>
            </div>
            <pre className="code" style={{ padding: '10px 14px', fontSize: 12.5, lineHeight: 1.6, overflowX: 'auto', margin: 0 }} tabIndex={0} role="region" aria-label="Num usage">
              {'<Num value={h.stock.mean} prov={ref} />'}
              <span className="muted">{'  // plain, data-prov'}</span>
              {'\n<Num value={5.06} />'}
              <span className="muted">{'                       // UNCAL'}</span>
            </pre>
            <p className="t-caption">
              A number without a source can only render as a placeholder: dashed amber underline, no <code>data-prov</code>. The e2e audit fails the build if a
              product page renders one, and the panel holding it must show UNCAL. The “with prov” value is computed here from the live tokens; press it to open
              its provenance.
            </p>
          </div>
        </Cell>
        <Cell className="c-5">
          <Label>
            <b>C-04</b> Reading · replaces the stat tile <Lamp status="UNCAL" size="sm" />
          </Label>
          <div className="ds-stack">
            <div className="ds-row" style={{ gap: 40, alignItems: 'flex-start' }}>
              <Reading label="calibrated · rmse" channel="cal" value={1.07} unit="°" ci={[1.0, 1.15]} n={10} nLabel="held-out episodes" tolerance placeholder />
              <Reading label="lag · real" value={133} digits={0} unit="ms" ci={null} n={10} size="m" ciPrefix={<><Num value={3.98} placeholder /> fr · 30 fps</>} placeholder />
            </div>
            <p className="t-caption">
              Legend with channel key, then value, then 95% interval, then <i>n</i>. The degree sign stays full size; only alphabetic units shrink. “n = 10”,
              “133 ms” and “95% [a, b]” never break across lines. The stacked tolerance is a display variant at 40px and up; the bracket form is always printed
              too.
            </p>
          </div>
        </Cell>

        <Cell className="c-5">
          <Label>
            <b>C-05</b> Field · the unit is part of the control
          </Label>
          <FieldGrid>
            <Field label="dataset" required prefix="hf://" help="Hugging Face Hub ID, LeRobot format">
              <Input defaultValue="lerobot/svla_so101_pickplace" />
            </Field>
            <Field label="max spend" prefix="$" suffix="USD cap" help="An agent key cannot raise it.">
              <Input defaultValue="400" inputMode="numeric" />
            </Field>
            <Field label="trials" suffix="trials" error={n < 50 ? 'below n = 50 the result is labelled a smoke test' : undefined} help="50 or more for a verification.">
              <Input value={trials} onChange={(e) => setTrials(e.target.value)} inputMode="numeric" />
            </Field>
            <Field label="robot">
              <Select defaultValue="SO-101">
                <option>SO-101</option>
                <option>SO-100</option>
                <option>Koch</option>
              </Select>
            </Field>
            <Field label="server" prefix="grpc://" disabled>
              <Input defaultValue="planned" />
            </Field>
            <div className="field">
              <span className="lbl">options</span>
              <Check label="An agent will call this API" defaultChecked />
              <Check type="radio" name="dsr-dep" label="deposit: yes" defaultChecked />
            </div>
            <Field label="notes" full help="Plain text. Andres reads it.">
              <Textarea placeholder="What do you need measured?" />
            </Field>
          </FieldGrid>
        </Cell>
        <Cell className="c-5">
          <Label>
            <b>C-06</b> Tabs · mode switch · probe keys
          </Label>
          <div className="ds-stack">
            <Tabs
              label="Split"
              items={[
                { id: 'held', label: 'held-out', count: 'n=10', panel: <p className="t-caption" style={{ paddingTop: 8 }}>Episodes the fit never saw.</p> },
                { id: 'train', label: 'train', count: 'n=40', panel: <p className="t-caption" style={{ paddingTop: 8 }}>Episodes the calibrated twin was fitted on.</p> },
                { id: 'params', label: 'parameters', panel: <p className="t-caption" style={{ paddingTop: 8 }}>kp, kv, armature, friction loss, zero offset, delay.</p> },
              ]}
            />
            <div className="ds-row">
              <ModeSwitch
                label="Run mode"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'sim', label: 'sim' },
                  { value: 'real', label: 'real', disabled: true, title: 'No real cell yet' },
                ]}
              />
              <span className="t-caption">real stays disabled until a cell exists</span>
            </div>
            <ChannelKeys value={ch} onChange={setCh} />
            <p className="t-caption">Tabs rove with the arrow keys, Home and End. Probe keys toggle a channel and dim when off, so the channel keeps its identity.</p>
          </div>
        </Cell>

        <Cell className="c-5">
          <Label>
            <b>C-07</b> CodeBlock · CurlBlock · copy-exact <Lamp status="UNCAL" size="sm" />
          </Label>
          <div className="ds-stack">
            <CodeBlock
              title={
                <>
                  shell · <b>GET /v1/reports/:id</b>
                </>
              }
              status="PREVIEW"
              what="report headline command"
              code={"curl -s https://meatspace.sh/v1/reports/lerobot__svla_so101_pickplace \\\n    | jq -c '.headline | {stock: .stock.mean, cal: .calibrated.mean}'"}
              output={
                <>
                  {'# {"stock":'}
                  <Num value={5.06} ascii placeholder />
                  {',"cal":'}
                  <Num value={1.07} ascii placeholder />
                  {'}'}
                </>
              }
            />
            <CurlBlock
              method="POST"
              url="https://meatspace.sh/v1/trials"
              data='{"cell":"so101-pick-v1","mode":"sim","n_trials":200,"max_spend_usd":400}'
              status="PLANNED"
              output={'# 501 {"error":"not_built","status":"planned"}'}
            />
            <p className="t-caption">
              Muted prompt and comments, no syntax colours. The $ is not selectable and Copy copies the command without it. Long commands break at a backslash with
              a 4-space hanging indent. Planned endpoints say PLANNED and answer 501.
            </p>
          </div>
        </Cell>
        <Cell className="c-5">
          <Label>
            <b>C-08</b> Console · NDJSON preflight
          </Label>
          <ConsoleDemo />
        </Cell>

        <Cell className="c-5">
          <Label>
            <b>C-09</b> Callout · RFC 2119 register
          </Label>
          <div className="ds-stack">
            <Callout register="method" source="report.json · split, headline">
              Episodes are the unit of independence. Every interval is a percentile bootstrap over whole episodes.
            </Callout>
            <Callout register="limitation" source="report.json · limitations[1]">
              Open-loop, joint-space, contact-free. Contact with the table shows up as twin error that no actuator calibration can remove.
            </Callout>
            <Callout register="must" source="copy deck · word discipline">
              A twin result must not be called verified. “Verified” is reserved for a real-robot result with at least 50 trials.
            </Callout>
            <Callout register="ok" source="C-09 · emerald register">
              Used only when a measured value, not a placeholder, sits inside its stated limit, with the limit printed next to it.
            </Callout>
          </div>
        </Cell>
        <Cell className="c-5">
          <Label>
            <b>C-11</b> Dialog · native &lt;dialog&gt;, focus returns to the opener
          </Label>
          <div className="ds-stack">
            <div className="ds-row">
              <Key variant="secondary" onClick={() => setDlg(true)}>
                Request a pilot
              </Key>
              <span className="t-caption">Opens the pilot waitlist dialog. Demo: nothing is sent.</span>
            </div>
            <p className="t-caption">84% carbon scrim, no blur. Two-column field grid, one column under 560px. Footer shows the endpoint, then Cancel and the primary.</p>
            <Label>
              <b>C-14</b> Ledger · part number + lifecycle, from shared/status.ts
            </Label>
            <Ledger />
          </div>
        </Cell>

        <Cell className="c-10">
          <Label>
            <b>C-10</b> Table · report index · sortable, refused row, stacks on a phone <Lamp status="UNCAL" size="sm" />
          </Label>
          <Table
            label="Report index"
            stack
            columns={INDEX_COLS}
            rows={SAMPLE_INDEX}
            rowKey={(r) => r.id}
            rowClassName={(r) => (r.refused ? 'refused' : undefined)}
            span={(r) =>
              r.refused
                ? {
                    from: 2,
                    content: (
                      <>
                        <Lamp status="REFUSED" size="sm" style={{ marginRight: 10 }} />
                        {r.refused}
                      </>
                    ),
                  }
                : null
            }
            caption="RMSE in degrees, mean of 5 arm joints, held-out. Lag in frames. The bar: change at or below −50% and calibrated lag within 1 frame of real. Sample rows."
          />
        </Cell>

        <Cell className="c-5">
          <Label>
            <b>C-12</b> StatusLine · static facts, built at deploy <Lamp status="UNCAL" size="sm" />
          </Label>
          <div className="cq">
            <StatusLine
              items={[
                { label: 'reports', value: <Num value="5" placeholder /> },
                { label: 'refused', value: <Num value="1" placeholder /> },
                { label: 'held-out episodes', value: <Num value="71" placeholder />, hideOnPhone: true },
                { label: 'twin trials', value: 'planned', word: true, hideOnPhone: true },
                { label: 'real cell', value: 'waitlist', word: true },
              ]}
            />
          </div>
          <p className="t-caption" style={{ marginTop: 10 }}>
            Replaces the ticker. No LIVE dot, no traction numbers, nothing ticks. Phones keep reports, refused and real cell.
          </p>
        </Cell>
        <Cell className="c-5">
          <Label>
            <b>C-15 · C-16</b> Seal · concept banner
          </Label>
          <div className="ds-stack">
            <ConceptBanner sticky={false} backHref="#ds-system" />
            <p className="t-caption">Sticky, full width, on every scroll position of /concept, and nowhere else.</p>
            <Seal
              word="twin record"
              rows={[
                ['Fit on', '40 train episodes, seed 0'],
                ['Params', 'kp, kv, armature, friction loss, zero offset, one command delay'],
                ['Package', 'calibrated_twin.json'],
              ]}
            />
          </div>
        </Cell>

        <Cell className="c-10">
          <Label>
            <b>C-19</b> Signal chain · the steps with their status
          </Label>
          <SignalChain
            steps={[
              {
                index: `01 measure · ${capability('MS-TGR-1').part}`,
                status: capability('MS-TGR-1').status,
                title: capability('MS-TGR-1').name,
                body: (
                  <>
                    Give us a LeRobot dataset. We replay its recorded commands in the matching MuJoCo Menagerie twin, measure lag and per-joint error, fit a
                    calibrated twin on train episodes and report how it does on held-out ones. <b>SO-100 and SO-101 arms today.</b>
                  </>
                ),
              },
              {
                index: `02 trial · ${capability('MS-TT-SIM').part}`,
                status: capability('MS-TT-SIM').status,
                title: 'Twin trials',
                body: (
                  <>
                    Point a hosted twin at your policy server and get sim success with a Wilson interval. <b>Not built.</b>
                  </>
                ),
              },
              {
                index: `03 verify · ${capability('MS-RV-SO101').part}`,
                status: capability('MS-RV-SO101').status,
                title: capability('MS-RV-SO101').name,
                body: (
                  <>
                    The same request with “mode”: “real” runs on a physical SO-101 cell matched to the twin. <b>The cell is not built. Pilot requests decide when it is.</b>
                  </>
                ),
              },
            ]}
          />
        </Cell>

        <Cell className="c-5">
          <Label>
            <b>C-23</b> PowerSelector · <Lamp status="PLANNED" size="sm" /> needs the real cell
          </Label>
          <PowerSelector twin={0.72} real={0.58} />
        </Cell>
        <Cell className="c-5">
          <Label>
            <b>Interval meter</b> · inside C-23 and live tables
          </Label>
          <div className="ds-stack t-ui">
            <div className="ds-row">
              <IntervalMeter value={0.72} lo={0.65} hi={0.78} channel="cal" label="example: calibrated twin 72% [65, 78]" />
              <span>example · calibrated twin 72% [65, 78]</span>
            </div>
            <div className="ds-row">
              <IntervalMeter value={0.58} lo={0.51} hi={0.65} channel="real" label="example: real cell 58% [51, 65]" />
              <span>example · real cell 58% [51, 65]</span>
            </div>
            <p className="t-caption">Hairline track, CI band in the series colour at 35%, 8px square point. Verdicts change only when decisive, never below n = 50.</p>
          </div>
        </Cell>
      </div>

      <Label style={{ marginTop: 'var(--s-7)' }}>
          <b>Index</b> · every component, its export, its rule
      </Label>
      <Table
        label="Component index"
        rows={COMPONENTS}
        rowKey={(r) => r[0] + r[1]}
        columns={[
          { key: 'id', header: 'id', className: 'muted', cell: (r) => r[0] },
          { key: 'c', header: 'component', cell: (r) => r[1] },
          { key: 'e', header: 'src/ds export', cell: (r) => <code>{r[2]}</code> },
          { key: 'r', header: 'rule', wrap: true, cell: (r) => r[3] },
        ]}
      />

      <Dialog
        open={dlg}
        onClose={() => setDlg(false)}
        title="request // real-robot pilot"
        endpoint="POST /v1/pilots"
        actions={
          <>
            <Key variant="ghost" onClick={() => setDlg(false)}>
              Cancel
            </Key>
            <Key variant="primary" onClick={() => setDlg(false)}>
              Join pilot waitlist
            </Key>
          </>
        }
      >
        <p className="t-prose">There is no real cell yet. This is a waitlist with questions, and the answers decide which cell we build first and when. Nothing is charged here.</p>
        <p className="t-ui">
          <span className="t-legend">status</span> <Lamp status="WAITLIST" size="sm" /> real SO-101 cell, not built. Other robots on request.
        </p>
        <FieldGrid>
          <Field label="robot" required>
            <Select defaultValue="SO-101">
              <option>SO-101</option>
              <option>SO-100</option>
              <option>Koch</option>
              <option>other</option>
            </Select>
          </Field>
          <Field label="simulator" required>
            <Select defaultValue="MuJoCo">
              <option>MuJoCo</option>
              <option>Isaac Sim / Isaac Lab</option>
              <option>Genesis</option>
              <option>none</option>
            </Select>
          </Field>
          <Field label="trials you need" help="Under 50 trials a result is a smoke test, not a verification.">
            <Select defaultValue="200">
              <option>50</option>
              <option>200</option>
              <option>400 or more</option>
              <option>not sure</option>
            </Select>
          </Field>
          <Field label="email" required>
            <Input type="email" placeholder="you@lab.edu" autoComplete="email" />
          </Field>
        </FieldGrid>
        <p className="t-caption">Andres reads every request and answers it himself. Demo dialog: nothing is sent from this page.</p>
      </Dialog>
    </section>
  )
}

/* ---------------------------------------------- 03 ---------------------------------------------- */

const CHAR_ROWS: [string, ReactNode, string, number, [number, number], number | null, string][] = [
  ['rmse, stock twin', <>ε<sub>stock</sub></>, 'held-out, open-loop', 5.06, [4.71, 5.44], 5.61, 'deg'],
  ['rmse, calibrated', <>ε<sub>cal</sub></>, 'held-out, fitted on train', 1.07, [1.0, 1.15], 1.18, 'deg'],
  ['change', 'Δε', 'paired by episode', -79, [-80, -77], null, '%'],
  ['lag, real', <>L<sub>real</sub></>, 'median over joints', 3.98, [3.95, 4.02], null, 'fr'],
  ['lag, stock', <>L<sub>stock</sub></>, 'median over joints', 0.81, [0.78, 0.84], null, 'fr'],
  ['lag, calibrated', <>L<sub>cal</sub></>, 'median over joints', 3.8, [3.78, 3.82], null, 'fr'],
]

function DataVizSection() {
  const ep = SAMPLE_EPISODE
  const lift = ep.find((j) => j.joint === 'shoulder_lift')!
  return (
    <section id="ds-dataviz" className="dsr-sec" aria-labelledby="ds-dataviz-h">
      <SectionHeader
        numeral="03"
        eyebrow="applied · /reports/:id · data-viz"
        id="ds-dataviz-h"
        title="The Twin Gap Report, laid out as a calibration certificate"
        description="Title block, checks, headline, then three figures that answer three questions. Every number here is SAMPLE data passed without provenance, so it renders UNCAL: that is the honesty mechanism working, not a style."
      />

      <article className="pnl" aria-label="Twin Gap Report sample">
        <div className="pnl-h">
          <span className="ds-row">
            <span className="t-legend">
              <b>Twin gap report</b> · v1 · sample layout
            </span>
            <Lamp status="UNCAL" />
            <span className="t-legend">placeholder numbers</span>
          </span>
          <Key variant="ghost" size="sm" href="#ds-paper">
            Export · paper
          </Key>
        </div>
        <CertificateHeader
          level={3}
          eyebrow="reports / lerobot/svla_so101_pickplace"
          title={<Ids>lerobot/svla_so101_pickplace x robotstudio_so101</Ids>}
          meta="owner lerobot · robot_type so100_follower · 30 fps · 50 episodes · 40 train / 10 held-out · units range_m100_100 (verified from the data)"
          fields={[
            { k: 'document', v: 'Twin Gap Report' },
            { k: 'schema', v: 'twin-gap-report/v1' },
            { k: 'status', v: <Lamp status={CAPABILITIES[0].status} size="sm" /> },
            { k: 'dataset', v: 'lerobot/svla_so101_pickplace @ f641879', span: 3 },
            { k: 'twin', v: 'robotstudio_so101 · MuJoCo Menagerie @ b065505 · mujoco 3.17.0', span: 3 },
            { k: 'split', v: 'seed 0 · 20% held out · fit never sees it', span: 3 },
            { k: 'intervals', v: '95% percentile bootstrap over episodes, 10,000 resamples', span: 4 },
            { k: 'content sha256', v: <Num value="0000…0000" placeholder />, span: 2 },
          ]}
          seal={
            <Seal
              word="twin record"
              label="Twin calibration record"
              rows={[
                ['Fit on', '40 train episodes'],
                [
                  'Delay',
                  <>
                    <Num value="1" placeholder /> frame, shared by all joints
                  </>,
                ],
                ['Params', 'kp, kv, armature, friction loss, zero offset'],
                [
                  'kp',
                  <>
                    998 → <Num value="15" placeholder /> to <Num value="51" placeholder /> N m/rad
                  </>,
                ],
                ['Package', 'calibrated_twin.json'],
                ['sha256', <Num key="s" value="0000…0000" placeholder />],
              ]}
            />
          }
        />
        <div className="cert">
          <div className="cert-headline">
            <Reading label="held-out rmse · stock twin" channel="stock" value={5.06} unit="°" ci={[4.71, 5.44]} n={10} extra="· p90 5.61°" tolerance placeholder />
            <Reading label="held-out rmse · calibrated" channel="cal" value={1.07} unit="°" ci={[1.0, 1.15]} n={10} extra="· p90 1.18°" tolerance placeholder />
            <Reading label="change · paired by episode" value={-79} digits={0} unit="%" ci={[-80, -77]} n={10} nLabel="· 10/10 improved" placeholder />
            <div className="ro">
              <div className="ro-l t-legend">verdict</div>
              <div className="vlamps">
                <Lamp status="PASS" uncal>
                  CI excludes zero
                </Lamp>
                <Lamp status="MARGINAL">1 joint marginal</Lamp>
                <Lamp status="PLANNED">1 of 3 owners</Lamp>
              </div>
              <p className="ro-n" style={{ marginTop: 4 }}>
                Verdicts computed from UNCAL numbers stay unlit (dashed).
              </p>
            </div>
          </div>
        </div>
        <div style={{ padding: '0 var(--s-4) var(--s-4)' }}>
          <ProvenanceFrame
            cells={[
              {
                k: 'held-out rmse',
                v: (
                  <>
                    <Num value={5.06} placeholder /> → <Num value={1.07} placeholder />°{' '}
                    <span className="nw">
                      [<Num value={1.0} placeholder />, <Num value={1.15} placeholder />]
                    </span>
                  </>
                ),
              },
              { k: 'dataset', datum: 'R', v: <Ids>lerobot/svla_so101_pickplace @ f641879</Ids> },
              { k: 'twin', datum: 'T', v: 'robotstudio_so101 @ b065505' },
              { k: 'split · method', v: '40 / 10 · bootstrap' },
            ]}
          />
        </div>
        <div style={{ padding: '0 var(--s-4) var(--s-4)' }}>
          <p className="dsr-label">
            Checks before the report is issued <span className="note-tag">C-21 CheckPoll · from report.json</span>
          </p>
          <CheckPoll
            rows={[
              { check: 'units', why: 'range_m100_100, recovered from the encoder-tick lattice of observation.state', status: 'GO' },
              { check: 'mapping', why: 'documented sign used. The flipped sign also fits the recorded range, so sign is not identified by range.', status: 'CAUTION' },
              { check: 'split', why: 'seeded permutation, 20% of episodes held out, never seen by the fit', status: 'GO' },
              { check: 'held-out', why: 'n = 10 episodes. Intervals are approximate and tend to run narrow.', status: 'SCOPE' },
              { check: 'contact', why: 'contacts off in the replay, gripper excluded from every metric', status: 'SCOPE' },
              { check: 'signing', why: 'files are hashed (sha256). Ed25519 signing is planned.', status: 'PLANNED' },
            ]}
            result={{ check: 'report', why: 'issued with caveats: 2 go · 1 caution · 2 scope · 1 planned', status: 'ISSUED' }}
          />
        </div>
      </article>

      <div className="dsr-two" style={{ marginTop: 'var(--s-5)' }}>
        <Panel
          as="div"
          heading="div"
          title={
            <>
              Twin gap report // <b>lerobot/svla_so101_pickplace x robotstudio_so101</b>
            </>
          }
          uncal
          flush
        >
          <CommandLine command="curl -s https://meatspace.sh/v1/reports/lerobot__svla_so101_pickplace | jq .headline" label="Report command" />
          <ScopePlot joint="shoulder_lift" traces={lift} fps={SAMPLE_FPS} episode="held-out ep 07" initialFrame={150} uncalLamp={false} />
          <div className="ro-row">
            <Reading label="stock twin · rmse" channel="stock" value={5.06} unit="°" ci={[4.71, 5.44]} n={10} nLabel="held-out eps" size="m" placeholder />
            <Reading label="calibrated · rmse" channel="cal" value={1.07} unit="°" ci={[1.0, 1.15]} n={10} nLabel="held-out eps" size="m" placeholder />
            <Reading label="change" value={-79} digits={0} unit="%" ci={[-80, -77]} n={10} nLabel="· 10/10 improved" size="m" placeholder />
            <Reading label="lag · real" value={3.98} unit="fr" ci={[3.95, 4.02]} n={10} ciPrefix="(133 ms) ·" size="m" placeholder />
          </div>
          <ProvenanceFrame
            cells={[
              {
                k: 'held-out rmse',
                v: (
                  <>
                    <Num value={5.06} placeholder /> → <Num value={1.07} placeholder />° · <span className="nw">n = 10</span>
                  </>
                ),
              },
              { k: 'dataset', datum: 'R', v: <Ids>lerobot/svla_so101_pickplace @ f641879</Ids> },
              { k: 'twin', datum: 'T', v: <Ids>robotstudio_so101 · menagerie @ b065505 · mujoco 3.17.0</Ids> },
              {
                k: 'report',
                v: (
                  <>
                    sha256 <Num value="000000000000" placeholder />
                  </>
                ),
              },
            ]}
          />
          <p className="t-caption" style={{ padding: 'var(--s-3) var(--s-3) var(--s-4)' }}>
            C-17 ScopePlot: one held-out episode, one joint. Joint-space, open-loop, no contact: this measures the actuator model, not task success. Focus the plot
            and use the arrow keys; the playhead reads every channel and its Δ.
          </p>
        </Panel>
        <div className="ds-stack">
          <Callout register="must" source="copy deck · word discipline">
            A twin result must not be called verified. “Verified” is reserved for a real-robot result with at least 50 trials.
          </Callout>
          <Callout register="method" source="report.json · split, headline">
            With ten held-out episodes the intervals are approximate, and the report says so where the number is printed, not in a footnote.
          </Callout>
          <Callout register="limitation" source="report.json · limitations[1]">
            Open-loop, joint-space, contact-free. When the real arm pushes on the table or an object, that shows up as twin error that no actuator calibration can
            remove.
          </Callout>
        </div>
      </div>

      <div style={{ marginTop: 'var(--s-5)' }}>
        <ScopeStrips
          joints={ep}
          fps={SAMPLE_FPS}
          episode="held-out episode 07"
          defaultJoint="shoulder_lift"
          initialFrame={123}
          caption="Open-loop replay of one held-out episode. The recorded command drives each twin; the real follower’s measured state is the reference, drawn on top inside its ±1.0° mask. Each strip has a Δ lane: amber ticks mark the frames where a twin leaves the mask, so you can see where the gap is, not just how big. Sample signal."
        />
      </div>

      <div className="dsr-two" style={{ marginTop: 'var(--s-5)' }}>
        <CIBars rows={SAMPLE_RMSE} summary={SAMPLE_RMSE_MEAN} n={10} />
        <LagReadout
          fps={SAMPLE_FPS}
          real={SAMPLE_LAG.real}
          stock={SAMPLE_LAG.stock}
          cal={SAMPLE_LAG.cal}
          n={10}
          caption="The timing diagram (wide screens) delays a unit step by each channel’s measured lag, with a cursor at the 50% crossing. The vernier puts the same lags on one scale, frames over ms; amber marks the gap between stock and real. An ideal actuator measures 1 frame, because LeRobot reads the state before it sends the command."
        />
      </div>

      <div style={{ marginTop: 'var(--s-5)' }}>
        <Panel title={<><b>Table 1</b> · characteristics · held-out</>} heading="h3" uncal flush actions={<span className="note-tag">C-24 datasheet</span>}>
          <Table
            label="Characteristics"
            caption="Held-out, n = 10 episodes, mean over the 5 arm joints. Interval: 95% percentile bootstrap over episodes. Sample values."
            rows={CHAR_ROWS}
            rowKey={(r) => r[0]}
            columns={[
              { key: 'p', header: 'parameter', cell: (r) => r[0] },
              { key: 's', header: 'symbol', cell: (r) => r[1] },
              { key: 'c', header: 'conditions', className: 'muted', cell: (r) => r[2] },
              { key: 'm', header: 'mean', align: 'right', cell: (r) => <Num value={r[3]} digits={Number.isInteger(r[3]) ? 0 : 2} placeholder /> },
              { key: 'ci', header: '95% CI', className: 'ci', cell: (r) => `[${fmt(r[4][0], Number.isInteger(r[3]) ? 0 : 2)}, ${fmt(r[4][1], Number.isInteger(r[3]) ? 0 : 2)}]` },
              { key: 'p90', header: 'p90', align: 'right', className: 'muted', cell: (r) => (r[5] == null ? 'n/a' : fmt(r[5])) },
              { key: 'u', header: 'unit', className: 'muted', cell: (r) => r[6] },
            ]}
          />
        </Panel>
      </div>

      <div className="g10" id="ds-paper" style={{ marginTop: 'var(--s-7)', alignItems: 'start' }}>
        <div className="c-3 ds-stack">
          <p className="t-legend">paper theme · exports and print</p>
          <p className="t-caption">
            The same components, re-resolved from the paper tokens (<code>.theme-paper</code>, <code>[data-theme=paper]</code>). The channel pair is re-stepped
            for paper (#0088AF, #A90959, CVD ΔE 13.7) and the status inks darkened to pass AA on the sheet. Printed reports carry the sha256 in the footer.
          </p>
        </div>
        <div className="c-7 theme-paper" style={{ background: 'var(--bg)', padding: 'var(--s-4)', color: 'var(--text)' }}>
          <CIBars rows={SAMPLE_RMSE} summary={SAMPLE_RMSE_MEAN} n={10} title="per-joint rmse · held-out · 95% CI · paper export" />
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------------------- 04 ---------------------------------------------- */

function VoiceSection() {
  const dd = (good: ReactNode, bad: ReactNode, k: number) => (
    <div className="dsr-dodont" key={k}>
      <div>
        <p className="h">
          <Lamp kind="live" size="sm">
            do
          </Lamp>
        </p>
        {good}
      </div>
      <div>
        <p className="h">
          <Lamp kind="gap" size="sm">
            don’t
          </Lamp>
        </p>
        {bad}
      </div>
    </div>
  )
  return (
    <section id="ds-voice" className="dsr-sec" aria-labelledby="ds-voice-h">
      <SectionHeader
        numeral="04"
        eyebrow="voice · numbers · accessibility"
        id="ds-voice-h"
        title="Written as if a skeptical reviewer will check it"
        description="Precise, plain, technical, slightly dry. The design system and the copy deck share one rule: the status of every claim is visible."
      />
      <div className="g10">
        <div className="c-5 ds-stack">
          {dd(
            <>
              Twin trials <Lamp status="PLANNED" size="sm" />. Point a hosted twin at your policy server and get sim success with a Wilson interval. Not built.
            </>,
            'Run your policy in our hosted twin. Coming soon.',
            0,
          )}
          {dd('Joint-space, open-loop, no contact: this measures the actuator model, not task success.', 'Validated sim-to-real transfer. Verified twin.', 1)}
          {dd('The cell is not built. Pilot requests decide when it is.', 'Up to 92% more accurate twins. Trusted by leading labs.', 2)}
          <ul className="dsr-list t-ui" style={{ marginTop: 'var(--s-4)' }}>
            <li>
              <b>status</b>: tag every claim. Planned features in the future or conditional tense. Never “coming soon”.
            </li>
            <li>
              <b>numbers</b>: value, then [lo, hi], unit once, <i>n</i> wherever an interval appears: 4.93 deg [4.64, 5.25], n = 10. Signed changes use a true
              minus (−79%) on screen and ASCII in copyable blocks and JSON. Report numbers come from report.json through the build, never typed by hand.
            </li>
            <li>
              <b>figures</b>: readouts proportional; tables, axes and code tabular. Slashed zero in mono, never in prose. ° full size; ms, fr, %, eps shrink and
              keep their case.
            </li>
            <li>
              <b>words</b>: “verified” only for a real-robot result with n ≥ 50. “signed” only after Ed25519 ships; until then “hashed”. “live” only for what
              works at that URL.
            </li>
            <li>
              <b>punctuation</b>: periods, colons, parentheses. Ranges use “to”. No dash asides. No exclamation marks, no emoji, no robot puns.
            </li>
            <li>
              <b>scope</b>: say what was measured, on what, and what it does not show, next to the result. Every page has a copyable command or a JSON twin.
            </li>
          </ul>
        </div>
        <div className="c-5">
          <ul className="dsr-check">
            <li>
              <b>contrast</b>
              <span>Text ≥ 4.5:1 on carbon, panel and raised (muted is 5.59 at worst). Control edges ≥ 3:1 on every surface (3.76 at worst). Channels ≥ 3:1 on the screen.</span>
            </li>
            <li>
              <b>focus</b>
              <span>2px fg outline, 2px offset, on everything focusable, including the primary key and the plot playhead.</span>
            </li>
            <li>
              <b>plots</b>
              <span>The playhead is role=slider with aria-valuetext giving every channel and its Δ. Arrows, shift, page up/down, home, end. Every figure has a table view.</span>
            </li>
            <li>
              <b>colour</b>
              <span>Never alone: lamps add shape and word, channels add dash patterns and direct labels.</span>
            </li>
            <li>
              <b>motion</b>
              <span>Nothing auto-updates without a pause (WCAG 2.2.2). Live content stops when the tab is hidden and under reduced motion.</span>
            </li>
            <li>
              <b>targets</b>
              <span>36px keys, 44px on coarse pointers. Dialogs work from the keyboard, close on Esc and return focus.</span>
            </li>
            <li>
              <b>forced colours</b>
              <span>Borders, lamps and focus map to system colours. Placeholder underlines stay visible.</span>
            </li>
            <li>
              <b>zoom + reflow</b>
              <span>Usable at 200% and at 320px wide. Tables scroll inside their own focusable box, never the page.</span>
            </li>
          </ul>
        </div>
      </div>
      <p className="t-legend dsr-foot">
        <span>meatspace.sh // stdout to reality.</span>
        <span>The system is the site. If a page breaks a rule here, the page is wrong.</span>
      </p>
    </section>
  )
}

/* ------------------------------------------------------------------------------------------------ */

const SECTIONS: [string, string][] = [
  ['ds-system', 'System'],
  ['ds-tokens', 'Tokens'],
  ['ds-components', 'Components'],
  ['ds-dataviz', 'Data-viz'],
  ['ds-voice', 'Voice + access'],
]

/**
 * Living reference of design system v1.0 "Instrument": tokens with live contrast, type, every component in
 * its states, the report data-viz on SAMPLE data (rendered UNCAL on purpose), voice and the seven rules.
 * Not routed yet: mount it at /design (the router lives in src/lib/router.ts).
 */
export function DesignPage() {
  return (
    <main id="main" className="dsr page-wrap">
      <nav className="dsr-index" aria-label="Design reference sections">
        <span className="brand">
          meatspace.sh <span>// design system v1.0</span>
        </span>
        {SECTIONS.map(([id, label], i) => (
          <a key={id} href={`#${id}`}>
            <b>{String(i).padStart(2, '0')}</b>
            {label}
          </a>
        ))}
      </nav>
      <SystemSection />
      <TokensSection />
      <ComponentsSection />
      <DataVizSection />
      <VoiceSection />
    </main>
  )
}
