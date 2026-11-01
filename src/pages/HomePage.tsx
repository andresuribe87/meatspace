/**
 * Home (/): twin-first sim-to-real verification. Hero with the proof panel (the featured report's held-out episode,
 * drawn from its trace.json, and its headline readings), then the findings by robot family, what you get, scope,
 * status, where to start, the API and who runs it. Every number comes from the generated report index or a fetched
 * report file and carries its provenance.
 */
import { useId, useState, type ReactNode } from 'react'

import { ENDPOINTS } from '../../shared/api'
import { LAB_URL, ORIGIN } from '../../shared/constants'
import { changeReadingOf, readingOf, reportApiPaths, type Joint, type TwinTrace } from '../../shared/reports'
import { capability, type CapabilityPart } from '../../shared/status'
import {
  Callout,
  CodeBlock,
  CommandLine,
  framesToMs,
  Ids,
  Key,
  Lamp,
  Ledger,
  Num as DsNum,
  Panel,
  ProvenanceFrame,
  Reading,
  RevisionTable,
  ScopePlot,
  ScrollBox,
  SectionHeader,
  SignalChain,
  Tabs,
  fmtElapsed,
  useElapsed,
  type NumProps,
} from '../ds'
import { count } from '../lib/findings'
import { heroReport, REPORT_INDEX, useTrace } from '../lib/reports'
import { linkHandler } from '../lib/router'
import type { RequestDialogKind } from './RequestDialogs'
import { FamilyPanel, ReportIndexTable } from './reportViews'

/** ds Num in the terminal face: a number is a mono island even inside prose (the audit's face rule). */
function Num(p: NumProps) {
  return <DsNum {...p} className={p.className ? `font-mono ${p.className}` : 'font-mono'} />
}

export interface HomePageProps {
  onNavigate: (to: string) => void
  onOpenDialog: (kind: RequestDialogKind) => void
}

type Go = ReturnType<typeof linkHandler>

const sha7 = (s: string) => s.slice(0, 7)

/* ------------------------------------------------------------------------------------------------
 * Hero, left: claim, status, keys, synopsis
 * ---------------------------------------------------------------------------------------------- */

/** Synopsis rows: endpoint status from shared/api.ts (which reads shared/status.ts); the "what" is short copy. */
const SYNOPSIS: readonly { method: string; path: string; what: string }[] = [
  { method: 'GET', path: '/v1/reports', what: 'every published report' },
  { method: 'GET', path: '/v1/reports/:id/twin', what: 'calibrated twin package' },
  { method: 'GET', path: '/v1/reports/:id/trace', what: 'one held-out episode, per frame' },
  { method: 'POST', path: '/v1/requests', what: 'request a report, run by hand' },
  { method: 'POST', path: '/v1/trials', what: 'policy on a twin or a cell' },
  { method: 'GET', path: '/docs', what: 'man meatspace' },
]

function Synopsis() {
  return (
    <div className="@container">
      <p className="t-legend mb-[6px]">Synopsis</p>
      <ScrollBox label="Synopsis">
        <table className="tbl tbl--compact">
          <thead>
            <tr>
              <th scope="col">method</th>
              <th scope="col">path</th>
              {/* The status column never drops off: the description goes first when the column is narrow. */}
              <th scope="col" className="@max-[548px]:hidden">
                what
              </th>
              <th scope="col" className="r">
                status
              </th>
            </tr>
          </thead>
          <tbody>
            {SYNOPSIS.map((s) => {
              const e = ENDPOINTS.find((x) => x.method === s.method && x.path === s.path)
              return (
                <tr key={s.method + s.path}>
                  <td>{s.method}</td>
                  <td>
                    <code>{s.path}</code>
                  </td>
                  <td className="muted @max-[548px]:hidden">{s.what}</td>
                  <td className="r">{e ? <Lamp status={e.status} size="sm" /> : null}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </ScrollBox>
    </div>
  )
}

function StatusRow() {
  const items: [ReactNode, CapabilityPart][] = [
    ['Twin Gap Reports', 'MS-TGR-1'],
    ['twin trials', 'MS-TT-SIM'],
    ['real SO-101 cell', 'MS-RV-SO101'],
  ]
  return (
    <p className="t-ui flex flex-wrap items-center gap-x-[18px] gap-y-[8px]">
      {items.map(([label, part]) => (
        <span key={part} className="inline-flex items-center gap-[8px]">
          {label} <Lamp status={capability(part).status} />
        </span>
      ))}
    </p>
  )
}

/* ------------------------------------------------------------------------------------------------
 * Hero, right: the proof panel
 * ---------------------------------------------------------------------------------------------- */

/** The joint whose stock-twin error on this episode is the median of the five: shown first, not the most flattering one. */
function medianJoint(t: TwinTrace): Joint {
  const order = t.joints.map((j, i) => [j, t.rmse_deg.stock[i]] as const).sort((a, b) => a[1] - b[1])
  return order[Math.floor(order.length / 2)][0]
}

/** Busy state of the scope: the plot's own height (no jump) and elapsed time, never a spinner. */
function ScopeLoading() {
  const [startedAt] = useState(() => performance.now())
  const elapsed = useElapsed(startedAt, 'perf', 100)
  return (
    <div className="scope-f grid h-[399px] place-items-center" aria-busy="true">
      <p className="t-legend">
        loading trace.json <span className="tabular">{fmtElapsed(elapsed)}</span>
      </p>
    </div>
  )
}

function ScopeSlot({ id, trace, joint, setJoint }: { id: string; trace: ReturnType<typeof useTrace>; joint: Joint | null; setJoint: (j: Joint) => void }) {
  const plotId = useId()
  if (trace.state === 'loading') return <ScopeLoading />
  if (trace.state === 'error') {
    return (
      <div className="p-[var(--s-3)]">
        <Callout register="note" source={`${reportApiPaths(id).trace} · ${trace.kind}`}>
          The held-out episode could not be drawn: {trace.message} The numbers below do not depend on it.
        </Callout>
      </div>
    )
  }
  const t = trace.data
  const j = joint ?? medianJoint(t)
  const s = t.series[j]
  return (
    <>
      <Tabs label="Joint" items={t.joints.map((x) => ({ id: x, label: x }))} value={j} onChange={(v) => setJoint(v as Joint)} controls={plotId} />
      <div id={plotId}>
        <ScopePlot
          key={j}
          joint={j}
          traces={{ real: s.real, stock: s.stock, cal: s.cal, cmd: s.cmd }}
          fps={t.fps_series}
          episode={`future-block ep ${t.episode.index}`}
          prov={`lab/reports/${id}/trace.json#/series/${j}`}
        />
      </div>
    </>
  )
}

function ProofPanel({ go }: { go: Go }) {
  const h = heroReport()
  const trace = useTrace(h.id)
  const [joint, setJoint] = useState<Joint | null>(null)
  const s = h.future
  const api = reportApiPaths(h.id)
  const lagPtr = `${h.lag.prov}/median_over_joints_frames`
  const lag = h.lag.median_frames
  const lagCell = (label: string, v: number | null, key: 'real' | 'stock' | 'calibrated') =>
    v == null ? null : (
      <span className="nw">
        {label} <Num value={v} prov={`${lagPtr}/${key}`} /> fr (<Num value={framesToMs(v, h.fps)} digits={0} prov={`${lagPtr}/${key} × 1000 / ${h.fps} fps`} /> ms)
      </span>
    )
  return (
    <Panel
      as="article"
      heading="h2"
      flush
      className="self-start"
      title={
        <>
          Twin gap report // <b>{h.dataset} x {h.twin}</b>
        </>
      }
      actions={<Lamp status={capability('MS-TGR-1').status} size="sm" />}
    >
      <CommandLine command={`curl -s ${ORIGIN}${api.report} | jq .headline`} label="Report command" />
      <ScopeSlot id={h.id} trace={trace} joint={joint} setJoint={setJoint} />
      <div className="cq">
        <div className="ro-row">
          <Reading label="stock twin · rmse" channel="stock" unit="°" size="m" nLabel="held-out eps" {...readingOf(s.rmse_deg.stock)} />
          <Reading label="calibrated · rmse" channel="cal" unit="°" size="m" nLabel="held-out eps" {...readingOf(s.rmse_deg.calibrated)} />
          <Reading
            label="change vs stock"
            size="m"
            {...changeReadingOf(s.vs_stock)}
            nLabel={
              <>
                · <Num value={s.vs_stock.improved} digits={0} prov={s.vs_stock.prov} /> improved
              </>
            }
          />
          <Reading
            label="vs baseline"
            size="m"
            {...changeReadingOf(s.vs_baseline)}
            nLabel={
              <>
                · <Num value={s.vs_baseline.improved} digits={0} prov={s.vs_baseline.prov} /> improved
              </>
            }
          />
        </div>
      </div>
      <div className="border-t border-line px-[var(--s-3)] py-[var(--s-2)]">
        <p className="t-legend">command → state lag · median of 5 joints · interleaved set</p>
        <p className="t-ui mt-[4px] flex flex-wrap gap-x-[var(--s-4)] gap-y-[2px]">
          {lagCell('real', lag.real, 'real')}
          {lagCell('stock twin', lag.stock, 'stock')}
          {lagCell('calibrated', lag.calibrated, 'calibrated')}
        </p>
      </div>
      <div className="px-[var(--s-3)] pb-[var(--s-3)]">
        <ProvenanceFrame
          cells={[
            {
              k: 'held-out rmse',
              v: (
                <>
                  <Num value={s.rmse_deg.stock.mean} prov={s.rmse_deg.stock.prov} /> → <Num value={s.rmse_deg.calibrated.mean} prov={s.rmse_deg.calibrated.prov} />°
                  · <span className="nw">n = <Num value={s.n_episodes} digits={0} prov={`${h.prov}#/headline/sets/future/n_episodes`} /></span>
                </>
              ),
            },
            { k: 'dataset', datum: 'R', v: <Ids>{`${h.dataset} @ ${sha7(h.revision_sha)}`}</Ids> },
            { k: 'twin', datum: 'T', v: <Ids>{`${h.twin} · menagerie @ ${sha7(h.menagerie_sha)} · mujoco ${h.mujoco}`}</Ids> },
            {
              k: 'report',
              v: (
                <>
                  sha256 <Num value={h.hashes.content_sha256.slice(0, 12)} prov={`${h.prov}#/content_sha256`} />
                </>
              ),
            },
          ]}
        />
      </div>
      <p className="t-caption px-[var(--s-3)]">
        One future-block held-out episode
        {trace.state === 'ready' ? (
          <>
            {' '}
            (<Num value={trace.data.episode.index} digits={0} prov={`lab/reports/${h.id}/trace.json#/episode/index`} />)
          </>
        ) : null}
        : the one with the median stock-twin error. {REPORT_INDEX.hero.why} Joint-space, open-loop, contacts off: this measures the actuator model, not task
        success.
      </p>
      <div className="ds-row p-[var(--s-3)]">
        <Key variant="secondary" size="sm" href={`/reports/${h.id}`} onClick={go}>
          Open report
        </Key>
        <Key variant="ghost" size="sm" href={api.report}>
          report.json
        </Key>
        <Key variant="ghost" size="sm" href={api.twin}>
          calibrated_twin.json
        </Key>
        <Key variant="ghost" size="sm" href={api.trace}>
          trace.json
        </Key>
      </div>
    </Panel>
  )
}

/* ------------------------------------------------------------------------------------------------
 * Sections
 * ---------------------------------------------------------------------------------------------- */

function Section({ numeral, eyebrow, title, description, children, id }: { numeral: string; eyebrow: string; title: ReactNode; description?: ReactNode; children: ReactNode; id?: string }) {
  const hid = useId()
  return (
    <section id={id} aria-labelledby={hid} className="mt-[var(--s-9)] max-md:mt-[var(--s-8)]">
      <SectionHeader numeral={numeral} eyebrow={eyebrow} title={title} description={description} id={hid} />
      <div className="mt-[var(--s-5)]">{children}</div>
    </section>
  )
}

const FACTS: readonly { body: ReactNode; source: string; href: string }[] = [
  {
    body: (
      <>
        More than <Num value={100} digits={0} prov="https://arxiv.org/html/2503.24278v2" /> human-hours for about{' '}
        <Num value="2,500" prov="https://arxiv.org/html/2503.24278v2" /> real rollouts, for one OpenVLA comparison.
      </>
    ),
    source: 'AutoEval, arXiv 2503.24278',
    href: 'https://arxiv.org/html/2503.24278v2',
  },
  {
    body: <>CoRL 2026 asks for real-robot results, or convincing evidence that sim results transfer.</>,
    source: 'CoRL 2026 call for papers',
    href: 'https://2026.corl.org/contributions/call-for-papers',
  },
  {
    body: (
      <>
        Same props, same task, same model: measured success can swing from <Num value={0} digits={0} unit="%" prov="https://arxiv.org/html/2510.17950v1" /> to{' '}
        <Num value={100} digits={0} unit="%" prov="https://arxiv.org/html/2510.17950v1" /> between runs, its authors report.
      </>
    ),
    source: 'RoboChallenge, arXiv 2510.17950',
    href: 'https://arxiv.org/html/2510.17950v1',
  },
]

function Deliverable({ part, title, children, action }: { part: CapabilityPart; title: string; children: ReactNode; action: ReactNode }) {
  const c = capability(part)
  return (
    <div className="flex min-w-0 flex-col gap-[var(--s-3)] p-[var(--s-4)]">
      <div className="flex items-center justify-between gap-[var(--s-2)]">
        <span className="t-legend">{c.part}</span>
        <Lamp status={c.status} size="sm" />
      </div>
      <h3 className="t-h3">{title}</h3>
      <p className="t-caption">{children}</p>
      <div className="mt-auto pt-[var(--s-2)]">{action}</div>
    </div>
  )
}

/** One start-here card. On md+ the cards share row tracks (subgrid), so the three keys and footnotes line up. */
function Card({ title, children, action, small }: { title: string; children: ReactNode; action: ReactNode; small: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-[var(--s-3)] p-[var(--s-4)] md:row-span-4 md:grid md:grid-rows-subgrid">
      <h3 className="t-legend text-fg!">{title}</h3>
      <p className="t-caption text-fg!">{children}</p>
      <div className="pt-[var(--s-1)]">{action}</div>
      <p className="t-legend mt-auto normal-case! tracking-normal!">{small}</p>
    </div>
  )
}

const API_CODE = (id: string) =>
  [
    '# every published report: id and future-block change vs stock (negative = better)',
    `curl -s ${ORIGIN}/v1/reports | jq '.reports[] | {id, change: .future.vs_stock.mean}'`,
    '# one calibrated twin package',
    `curl -s ${ORIGIN}/v1/reports/${id}/twin -o calibrated_twin.json`,
    '# the episode on this page, per frame: command, real, stock, baseline, calibrated',
    `curl -s ${ORIGIN}/v1/reports/${id}/trace | jq .rmse_deg`,
    '# cells, and what is built',
    `curl -s ${ORIGIN}/v1/cells`,
    '# request a report on your dataset (a person runs it)',
    `curl -s -X POST ${ORIGIN}/v1/requests \\`,
    "    -H 'content-type: application/json' \\",
    `    -d '{"kind":"gap_report","dataset":"owner/name","robot":"so101","email":"you@example.com"}'`,
    '# the manual, as plain text',
    `curl ${ORIGIN}/docs`,
  ].join('\n')

const INDEX_CAPTION = (
  <>
    Future block, held-out. RMSE: sim-vs-real joint error in degrees, mean of the 5 arm joints and over episodes, [95% CI]. Change = calibrated / reference -
    1, paired by episode; negative is better. Baseline: a physics-free lag filter fitted on the same episodes. Both hold-out sets, the method and the refusals in
    full: /reports.
  </>
)

/* ------------------------------------------------------------------------------------------------ */

export function HomePage({ onNavigate, onOpenDialog }: HomePageProps) {
  const go = linkHandler(onNavigate)
  const ix = REPORT_INDEX
  const h = heroReport()
  const c = ix.counts
  const hid = useId()
  return (
    <main id="main" className="flex-1">
      <div className="page-wrap">
        {/* Hero: split, proof panel above the fold on desktop, directly after the keys on phones. */}
        {/* Two columns only from 1280px: below that the display H1 would get a column too narrow for it (4 lines at 1100). */}
        <section aria-labelledby={hid} className="grid grid-cols-1 gap-[var(--s-6)] pt-[var(--s-7)] min-[1280px]:grid-cols-[minmax(0,4.3fr)_minmax(0,5.7fr)] min-[1280px]:gap-[var(--s-7)] max-md:pt-[var(--s-6)]">
          <div className="flex min-w-0 flex-col gap-[var(--s-5)]">
            <h1 id={hid} className="t-display">
              stdout to reality.
              <span aria-hidden="true" className="ml-[0.06em] inline-block h-[0.08em] w-[0.5em] bg-emerald align-baseline" />
            </h1>
            <p className="-mt-[6px] font-[family-name:var(--font-display)] text-[22px] leading-tight text-muted max-md:text-[18px]">
              sim-to-real gaps, <span className="text-fg">measured.</span>
            </p>
            <p className="t-lede">
              We replay real robot logs in the robot&rsquo;s published MuJoCo twin and report, joint by joint, how far the twin is from the robot. Then we fit a
              calibrated twin on some of the episodes and test it on the ones it never saw, with confidence intervals.
            </p>
            <StatusRow />
            <div className="flex flex-wrap gap-[10px]">
              <Key variant="primary" aria-haspopup="dialog" onClick={() => onOpenDialog('report')}>
                Request a report on your dataset
              </Key>
              <Key variant="secondary" href="/reports" onClick={go}>
                Read the reports
              </Key>
            </div>
            <div className="grid gap-[4px]">
              <a className="tlink" href="#request-pilot">
                Need numbers from a real robot? Request a pilot.
              </a>
              <a className="tlink" href="#own-robot">
                Own the robots? Evaluate on your own robot.
              </a>
            </div>
            <Synopsis />
          </div>
          <ProofPanel go={go} />
        </section>

        <Section numeral="01" eyebrow="the problem" title="Sim results are claims. Real runs are the evidence, and they are expensive.">
          <ol className="grid grid-cols-1 border-t border-edge md:grid-cols-3">
            {FACTS.map((f, i) => (
              <li key={i} className="min-w-0 border-line py-[var(--s-4)] max-md:border-b md:border-r md:px-[var(--s-4)] md:first:pl-0 md:last:border-r-0">
                <p className="t-prose">{f.body}</p>
                <a className="t-legend mt-[10px] block normal-case! tracking-normal! hover:text-fg!" href={f.href} rel="noopener">
                  {f.source}
                </a>
              </li>
            ))}
          </ol>
          <p className="t-prose mt-[var(--s-5)] max-w-[62ch]">
            A sim result means something only if the twin behaves like the robot. That is the first thing we measure. It needs public robot logs and no hardware.
          </p>
        </Section>

        <Section
          numeral="02"
          eyebrow="published reports"
          title={
            <>
              <Num value={c.reported} digits={0} prov={`${c.prov}/reported`} />
              &nbsp;datasets measured. <Num value={c.rejected} digits={0} prov={`${c.prov}/rejected`} />
              &nbsp;refused.
            </>
          }
          description={
            <>
              Every candidate whose compatibility scan passed was run with one configuration and is listed whatever its result:{' '}
              <Num value={c.run} digits={0} prov={`${c.prov}/run`} /> run, <Num value={c.reported} digits={0} prov={`${c.prov}/reported`} /> reported,{' '}
              <Num value={c.rejected} digits={0} prov={`${c.prov}/rejected`} /> refused with the reason.
            </>
          }
        >
          <p className="t-prose max-w-[70ch]">
            The two arms behave differently, and the reports say so. Numbers are on held-out episodes only: the future block is the last 20% of each dataset,
            recorded after every episode the fit saw. Change is calibrated against a reference, paired by episode, with a 95% bootstrap interval; negative is
            better.
          </p>
          <div className="mt-[var(--s-5)] grid grid-cols-1 gap-[var(--s-5)] xl:grid-cols-2">
            <FamilyPanel index={ix} family="so101" go={go} />
            <FamilyPanel index={ix} family="so100" go={go} />
          </div>
          {/* The full table stacks into tall cards under a 760px container; below that width the two-column phone table reads better. */}
          <div className="mt-[var(--s-6)] max-[825px]:hidden">
            <ReportIndexTable index={ix} set="future" go={go} compact label="Published reports, future block" caption={INDEX_CAPTION} />
          </div>
          <div className="mt-[var(--s-6)] min-[825px]:hidden">
            <ReportIndexTable index={ix} set="future" go={go} mini label="Published reports, future block, phone" caption={INDEX_CAPTION} />
          </div>
          <div className="mt-[var(--s-4)]">
            <Key variant="secondary" href="/reports" onClick={go}>
              All reports and the method
            </Key>
          </div>
        </Section>

        <Section numeral="03" eyebrow="what you get" title="A report, a calibrated twin, and a way to ask for yours.">
          <div className="grid grid-cols-1 border border-line md:grid-cols-3 md:divide-x md:divide-line max-md:divide-y max-md:divide-line">
            <Deliverable
              part="MS-TGR-1"
              title="Twin Gap Report"
              action={
                <Key variant="ghost" size="sm" href={`/reports/${h.id}`} onClick={go}>
                  Read one
                </Key>
              }
            >
              Lag and joint error of the stock MuJoCo twin against the real robot, a calibrated twin and a physics-free baseline, on two held-out sets, with 95%
              intervals. report.json, report.md and every file hashed (sha256).
            </Deliverable>
            <Deliverable
              part="MS-TWIN-PKG"
              title="Calibrated twin package"
              action={
                <Key variant="ghost" size="sm" href="/cells#twins" onClick={go}>
                  All <Num value={c.reported} digits={0} prov={`${c.prov}/reported`} /> packages
                </Key>
              }
            >
              calibrated_twin.json: fitted gains, friction and command delay as overrides for the Menagerie model, with the joint mapping. It models the arm that
              recorded the data, not the robot model in general.
            </Deliverable>
            <Deliverable
              part="MS-TGR-REQ"
              title="A report on your dataset"
              action={
                <Key variant="ghost" size="sm" aria-haspopup="dialog" onClick={() => onOpenDialog('report')}>
                  Request a report
                </Key>
              }
            >
              Send a LeRobot <span className="nw">SO-100</span> or <span className="nw">SO-101</span> dataset from the Hugging Face Hub. The intake works today; a person runs the same pipeline by hand and sends you
              the result.
            </Deliverable>
          </div>
        </Section>

        <Section numeral="04" eyebrow="scope" title="What a report measures, and what it does not.">
          <div className="grid grid-cols-1 border border-line md:grid-cols-2 md:divide-x md:divide-line max-md:divide-y max-md:divide-line">
            <div className="p-[var(--s-4)]">
              <p className="mb-[var(--s-3)]">
                <Lamp kind="pass">measures</Lamp>
              </p>
              <ul className="t-caption text-fg! divide-y divide-line">
                <li className="py-[6px]">command to state lag per joint, in frames and ms</li>
                <li className="py-[6px]">sim-vs-real joint RMSE per joint: mean, p90, 95% interval</li>
                <li className="py-[6px]">the same for a physics-free lag filter, so you can see what the physics adds</li>
                <li className="py-[6px]">fitted gains, friction loss and command delay, with an identifiability check</li>
                <li className="py-[6px]">held-out change, paired by episode, on a future block and an interleaved set</li>
              </ul>
            </div>
            <div className="p-[var(--s-4)]">
              <p className="mb-[var(--s-3)]">
                <Lamp status="SCOPE">does not show</Lamp>
              </p>
              <ul className="t-caption text-fg! divide-y divide-line">
                <li className="py-[6px]">task success. No policy runs.</li>
                <li className="py-[6px]">contact, grasping or vision. Contacts are off in the replay.</li>
                <li className="py-[6px]">other units of the same model. One dataset is one robot.</li>
                <li className="py-[6px]">that your policy transfers. That takes real trials.</li>
              </ul>
            </div>
          </div>
          <p className="t-prose mt-[var(--s-4)] max-w-[70ch]">
            None of this is hard. The point is to do it the same way for every dataset, publish it whatever it says, and keep the held-out numbers.
          </p>
        </Section>

        <Section
          numeral="05"
          eyebrow="status"
          title="What works today, and what does not."
          description="One file holds every status word on this site, in the API and in the manual. Nothing is live until it works at its URL."
        >
          <Ledger />
          <div className="mt-[var(--s-6)]">
            <SignalChain
              steps={[
                {
                  index: `01 measure · ${capability('MS-TGR-1').part}`,
                  status: capability('MS-TGR-1').status,
                  title: 'Measure the twin',
                  body: (
                    <>
                      Replay a LeRobot dataset in the matching MuJoCo Menagerie twin, fit a calibrated twin on some episodes and report it on the ones it never saw.{' '}
                      <b><span className="nw">SO-100</span> and <span className="nw">SO-101</span> arms today.</b>
                    </>
                  ),
                },
                {
                  index: `02 trial · ${capability('MS-TT-SIM').part}`,
                  status: capability('MS-TT-SIM').status,
                  title: 'Run on the twin',
                  body: (
                    <>
                      Point a hosted twin at your policy server and get sim success with a Wilson interval, with the real cell&rsquo;s measured latency injected.{' '}
                      <b>Not built.</b>
                    </>
                  ),
                },
                {
                  index: `03 verify · ${capability('MS-RV-SO101').part}`,
                  status: capability('MS-RV-SO101').status,
                  title: 'Check on the real robot',
                  body: (
                    <>
                      The same request with <code>&quot;mode&quot;: &quot;real&quot;</code> would run on a physical <span className="nw">SO-101</span> cell matched to the twin.{' '}
                      <b>The cell is not built and nothing is purchased. Pilot requests decide when it is.</b>
                    </>
                  ),
                },
              ]}
            />
          </div>
          <div className="mt-[var(--s-5)]">
            <CodeBlock
              title={
                <>
                  planned request // <b>POST /v1/trials</b> answers 501 today
                </>
              }
              status={capability('MS-TT-SIM').status}
              what="planned trials request"
              code={[
                `curl -s -X POST ${ORIGIN}/v1/trials \\`,
                "    -H 'content-type: application/json' \\",
                `    -d '{"cell":"so101-pick-v1","mode":"sim","policy":{"server":"grpc://your-host:port","protocol":"lerobot-async"},"n_trials":200,"max_spend_usd":400}'`,
              ].join('\n')}
              output={'# 501 {"error":{"code":"ERR_NOT_IMPLEMENTED","message":"POST /v1/trials is planned and not built. ..."}}'}
            />
            <p className="t-caption mt-[var(--s-3)]">
              Changing &quot;mode&quot; from &quot;sim&quot; to &quot;real&quot; would be the whole difference, on purpose: same request, same report schema, same spend
              cap. See{' '}
              <a className="lnk" href="/cells" onClick={go}>
                /cells
              </a>{' '}
              and{' '}
              <a className="lnk" href="/power" onClick={go}>
                how many real trials
              </a>{' '}
              a claim needs.
            </p>
          </div>
        </Section>

        <Section numeral="06" eyebrow="start here" title="Pick the one that fits.">
          <div className="grid grid-cols-1 border border-line md:grid-cols-3 md:grid-rows-[auto_1fr_auto_auto] md:divide-x md:divide-line max-md:divide-y max-md:divide-line">
            <Card
              title="I have a dataset"
              small="Free for public datasets. Run by hand during v0.2."
              action={
                <Key variant="primary" size="sm" aria-haspopup="dialog" onClick={() => onOpenDialog('report')}>
                  Request a report
                </Key>
              }
            >
              Send a LeRobot dataset ID. We run the gap report on it and send it back.
            </Card>
            <Card
              title="I need real-robot numbers"
              small="Waitlist. Nothing is charged through this form."
              action={
                <Key variant="secondary" size="sm" aria-haspopup="dialog" onClick={() => onOpenDialog('pilot')}>
                  Request a pilot
                </Key>
              }
            >
              Tell us the robot, the simulator, the policy and the deadline. There is no real cell yet. This waitlist decides which one we build first.
            </Card>
            <Card
              title="I own the robots"
              small="Not built. We are asking first."
              action={
                <Key variant="secondary" size="sm" aria-haspopup="dialog" onClick={() => onOpenDialog('own-robot')}>
                  Evaluate on your own robot
                </Key>
              }
            >
              If evals eat your week, tell us how. We are deciding whether to build eval software that runs on your own hardware.
            </Card>
          </div>
          <p className="t-caption mt-[var(--s-3)]">
            Building an agent that needs real rollouts? Reports are JSON today. An MCP server is planned <Lamp status={capability('MS-MCP').status} size="sm" />. Say
            so in the pilot form.
          </p>
        </Section>

        <Section numeral="07" eyebrow="api" title="Every page here is also a curl." description="No keys. Limits are per network: an IPv4 address or an IPv6 /64. JSON everywhere, plain text at /docs. Planned endpoints answer 501 and say so.">
          <CodeBlock title={<>shell · <b>meatspace.sh/v1</b></>} code={API_CODE(h.id)} what="API commands" />
        </Section>

        <Section numeral="08" eyebrow="who" title="One person reads the requests.">
          <div className="g10">
            <p className="c-5 t-prose">
              meatspace.sh is run by Andres Uribe. He reads every request and answers it himself, by email and sometimes on a call. The lab code behind every
              report is in{' '}
              <a className="lnk" href={LAB_URL} rel="noopener">
                the repository
              </a>
              .
            </p>
            <p className="c-5 t-prose muted">
              Where this started: v0.1 of this site pitched a marketplace for idle industrial robots. It was a simulation. It is still here, labelled, at{' '}
              <a className="lnk" href="/concept" onClick={go}>
                /concept
              </a>
              .
            </p>
          </div>
          <div className="mt-[var(--s-5)]">
            <RevisionTable
              rows={[
                {
                  rev: 'v0.2.0',
                  date: ix.generated_at,
                  change: (
                    <>
                      Rebuilt around Twin Gap Reports: <Num value={count(c.run)} prov={`${c.prov}/run`} /> datasets run, all published. Withdrew the invented
                      traction numbers and the v0.1 claims about payments and tamper-proof telemetry.
                    </>
                  ),
                },
                { rev: 'v0.1.4-alpha', date: '2026-10-31', change: 'Industrial dispatch sandbox, simulated end to end. Now at /concept, labelled.' },
              ]}
            />
          </div>
        </Section>
      </div>
      <div className="h-[var(--s-9)]" />
    </main>
  )
}

