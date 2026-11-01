/**
 * /cells: a cell is a twin and a real robot built to match it, behind one API. Today: one planned cell
 * (so101-pick-v1) whose lanes read from shared/status.ts, the physical cell plan (docs/ops/so101-cell-plan.md,
 * gated on $3k committed, nothing purchased), and #twins, the calibrated twin packages the published reports ship.
 */
import { useId, type MouseEvent, type ReactNode } from 'react'

import { CELLS, cellWire } from '../../shared/api'
import { CELL_PLAN_URL } from '../../shared/constants'
import { capability, fromApiStatus, type CapabilityStatus } from '../../shared/status'
import { Callout, CurlBlock, Ids, Key, Lamp, Num, Panel, Ruler, SectionHeader, Table, TitleBlock, type Column } from '../ds'
import { pct, type OkReportSummary } from '../../shared/reports'
import { REPORT_INDEX } from '../../shared/reports.generated'
import { Chg, Est } from './reportViews'
import { nOneSample, nTwoSample, wilsonInterval } from '../lib/power'

export interface CellsPageProps {
  onNavigate: (to: string) => void
}

const PLAN = 'docs/ops/so101-cell-plan.md'
const MEMO = 'docs/strategy/2026-11-01-pmf-memo.md'
const ORIGIN = 'https://meatspace.sh'

/** In-app link: plain <a href> that routes through onNavigate on an unmodified left click. */
function useNav(onNavigate: (to: string) => void) {
  return (to: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    onNavigate(to)
  }
}

function Section({ id, numeral, eyebrow, title, description, children, anchor }: { id: string; numeral: string; eyebrow: ReactNode; title: ReactNode; description?: ReactNode; children: ReactNode; anchor?: string }) {
  return (
    <section id={anchor} aria-labelledby={id} className="mt-[var(--s-9)] max-md:mt-[var(--s-8)]">
      <SectionHeader numeral={numeral} eyebrow={eyebrow} title={title} description={description} id={id} />
      {children}
    </section>
  )
}

/* ------------------------------------------------------------------------------------------------ */

interface Lane {
  lane: string
  status: CapabilityStatus
  what: ReactNode
  where: ReactNode
}

/** The cell as the API describes it (GET /v1/cells): one source for the page and the wire. */
const CELL = cellWire(CELLS[0])
const laneStatus = (l: 'twin' | 'trials' | 'real'): CapabilityStatus => fromApiStatus(CELL.lanes[l].status) ?? 'PLANNED'

function CellPanel({ go }: { go: (to: string) => (e: MouseEvent<HTMLAnchorElement>) => void }) {
  const lanes: Lane[] = [
    {
      lane: 'cell twin',
      status: laneStatus('twin'),
      what: (
        <>
          The cell&rsquo;s own twin, calibrated on our <span className="nw">SO-101</span> unit the way the reports calibrate other people&rsquo;s arms. Not built: the unit is not
          purchased.
        </>
      ),
      where: <code>GET /v1/cells/:id/twin</code>,
    },
    {
      lane: 'hosted twin trials',
      status: laneStatus('trials'),
      what: <>Your policy server against the hosted twin, with sim success and a Wilson interval. Not built: MuJoCo needs a container host.</>,
      where: <code>POST /v1/trials</code>,
    },
    {
      lane: 'real cell',
      status: laneStatus('real'),
      what: <>A physical <span className="nw">SO-101</span> matched to the twin. Not built and nothing purchased. Pilot requests decide when it is.</>,
      where: (
        <a className="lnk" href="#request-pilot">
          request a pilot
        </a>
      ),
    },
  ]
  const cols: Column<Lane>[] = [
    { key: 'lane', header: 'lane', lead: true, cell: (r) => <b>{r.lane}</b> },
    { key: 'status', header: 'status', cell: (r) => <Lamp status={r.status} size="sm" /> },
    { key: 'where', header: 'where', cell: (r) => r.where },
    // Full width when stacked (phones): a description squeezed beside the lamp runs to ten short lines.
    { key: 'what', header: 'what it is', wrap: true, className: 'full', cell: (r) => r.what },
  ]
  return (
    <Panel
      title={
        <>
          cell · <b>so101-pick-v1</b>
        </>
      }
      actions={
        <span className="ds-row t-legend">
          real cell <Lamp status={laneStatus('real')} size="sm" />
        </span>
      }
    >
      <div className="ds-stack">
        <TitleBlock
          label="Cell so101-pick-v1"
          fields={[
            { k: 'cell', v: 'so101-pick-v1', span: 2 },
            { k: 'robot', v: 'SO-101 arm (LeRobot)', span: 2 },
            { k: 'task', v: 'SO101_PICK_PLACE_CUBE', span: 2 },
            { k: 'twin', v: 'MuJoCo Menagerie robotstudio_so101; to be calibrated on our unit once it exists', span: 3 },
            { k: 'policy', v: 'runs on your server; never on our machines', span: 3 },
          ]}
        />
        <Table label="Lanes of so101-pick-v1" rows={lanes} rowKey={(r) => r.lane} columns={cols} stack />
        <p className="t-caption">
          Calibrated twin packages of the published datasets <Lamp status={capability('MS-TWIN-PKG').status} size="sm" /> are a separate thing: each models
          the arm that recorded one dataset, not this cell. Download them from{' '}
          <a className="lnk" href="#twins">
            #twins
          </a>
          .
        </p>
        <p className="t-caption">
          Other robots (Franka, bimanual, your arm) <Lamp status="ON REQUEST" size="sm" />: say which in the{' '}
          <a className="lnk" href="#request-pilot">
            pilot form
          </a>
          . Requests decide what is built after <span className="nw">SO-101</span>. Statuses come from one file, shared with{' '}
          <a className="lnk" href="/docs" onClick={go('/docs')}>
            the manual
          </a>{' '}
          and the API.
        </p>
      </div>
    </Panel>
  )
}

/* ------------------------------------------------------------------------------------------------ */

function CellPlan() {
  const p = (anchor: string) => `${PLAN}#${anchor}`
  return (
    <div className="g10">
      <div className="c-5 ds-stack">
        <p className="t-prose">
          The plan for the first physical cell is written down, priced and not started. <b>Nothing is purchased.</b> The build starts only once at least{' '}
          <Num className="font-mono" value="$3k" prov={p('status')} /> in pilots is committed.
        </p>
        <p className="t-prose">
          Before buying, we would ask two existing <span className="nw">SO-101</span> evaluation sites (Armnet and RobotReplica) whether they can run a fixed-scene batch within about two
          weeks. If one can, the first pilots run there, against a twin we calibrate for that cell.
        </p>
        <Callout register="limitation" source={`${PLAN} · 3. Reset approach`}>
          The site does not call the reset automatic until it runs with at most <Num className="font-mono" value={1} digits={0} prov={p('3-reset-approach-staged')} /> human
          intervention per <Num className="font-mono" value={50} digits={0} prov={p('3-reset-approach-staged')} /> episodes over{' '}
          <Num className="font-mono" value={200} digits={0} prov={p('3-reset-approach-staged')} /> consecutive episodes. Until then a person resets the scene, and the price says so.
        </Callout>
      </div>
      <div className="c-5">
        <Panel
          title={
            <>
              so101-pick-v1 · <b>plan</b>
            </>
          }
          heading="h3"
          actions={<Lamp status={capability('MS-RV-SO101').status} size="sm" />}
        >
          <TitleBlock
            label="Cell plan summary"
            fields={[
              { k: 'gate', v: <>build after <Num className="font-mono" value="$3k" prov={p('status')} /> committed</>, span: 3 },
              { k: 'purchased', v: 'nothing', span: 3 },
              { k: 'minimal build', v: <><Num className="font-mono" value="$473.77" prov={p('1d-totals')} /> + small parts</>, span: 3 },
              { k: 'recommended', v: <>about <Num className="font-mono" value="$1.04k" prov={p('1d-totals')} /></>, span: 3 },
              { k: 'prices', v: <>checked <Num className="font-mono" value="2026-11-01" prov={p('status')} />, USD, before shipping and tax</>, span: 6 },
              { k: 'scene', v: 'one 25 mm cube, one bin, fixed lights, 3 cameras', span: 6 },
              { k: 'reset', v: 'by a person first; a gravity funnel and a scripted pick later', span: 6 },
              {
                k: 'success label',
                v: (
                  <>
                    overhead camera, checked against <Num className="font-mono" value={200} digits={0} prov={p('3-reset-approach-staged')} /> human-labeled episodes
                  </>
                ),
                span: 6,
              },
              { k: 'safety', v: 'e-stop cuts the follower supply; per-step motion cap; every clamp counted in the report', span: 6 },
            ]}
          />
        </Panel>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------------------------------ */

const RUN_STEPS: ReactNode[] = [
  <>You host your policy behind a server. We never run your code or weights on our machines.</>,
  <>The cell calls your server over the network. The twin injects the latency the real cell measured, so sim and real see the same delay.</>,
  <>You get real and twin success with Wilson intervals, the gap with its interval, and the minimum detectable effect.</>,
  <>
    No result is labeled verified below <Num className="font-mono" value={50} digits={0} prov={`${MEMO}#5-the-offer-v02`} /> trials. The default for a gap claim is{' '}
    <Num className="font-mono" value={200} digits={0} prov={`${MEMO}#5-the-offer-v02`} />.
  </>,
  <>Safety clamps are counted and reported, because a clamp changes the outcome.</>,
  <>Every run would ship video, MCAP, a LeRobotDataset v3 export and a manifest of artifact hashes. Signing the manifest (Ed25519) is planned; until then it is hashed.</>,
]

function HowARunWillWork() {
  return (
    <div className="g10">
      <ol className="c-6 ds-stack list-none p-0">
        {RUN_STEPS.map((s, i) => (
          <li key={i} className="grid grid-cols-[40px_minmax(0,1fr)] gap-[var(--s-3)] border-t border-line pt-[var(--s-3)]">
            <span className="t-legend">{String(i + 1).padStart(2, '0')}</span>
            <span className="t-prose">{s}</span>
          </li>
        ))}
      </ol>
      <div className="c-4">
        <WhyTrials />
      </div>
    </div>
  )
}

function WhyTrials() {
  const one = nOneSample(0.5, 0.6)
  const two = nTwoSample(0.5, 0.6)
  const rows = [
    { n: 10, use: 'nothing' },
    { n: 50, use: 'a smoke test' },
    { n: one, use: 'a 10-point gap against a known rate' },
    { n: two, use: 'per policy: two policies 10 points apart' },
  ]
  const prov = (n: number) => `src/lib/power.ts#wilsonInterval(p = 0.5, n = ${n})`
  return (
    <Panel
      title={
        <>
          why <b>200 trials</b>
        </>
      }
      heading="h3"
      flush
    >
      <Table
        label="Trials and what they can show"
        compact
        rows={rows}
        rowKey={(r) => String(r.n)}
        columns={[
          { key: 'n', header: 'trials', align: 'right', cell: (r) => <Num className="font-mono" value={r.n} digits={0} prov={r.n === one ? 'src/lib/power.ts#nOneSample(0.5, 0.6)' : r.n === two ? 'src/lib/power.ts#nTwoSample(0.5, 0.6)' : 'src/lib/power.ts#input'} /> },
          {
            key: 'ci',
            header: '95% at 50%',
            align: 'right',
            cell: (r) => {
              const w = wilsonInterval(0.5, r.n)
              return (
                <span className="nw">
                  <Num className="font-mono" value={w.lo * 100} digits={0} prov={prov(r.n)} /> to <Num className="font-mono" value={w.hi * 100} digits={0} prov={prov(r.n)} />%
                </span>
              )
            },
          },
          { key: 'use', header: 'good for', wrap: true, cell: (r) => r.use },
        ]}
      />
      <p className="t-caption px-[var(--s-3)] py-[var(--s-3)]">
        Wilson score intervals. Sample sizes: two-sided 95%, 80% power, 50% against 60% success.{' '}
        <a className="lnk" href="/power">
          How many real trials?
        </a>
      </p>
    </Panel>
  )
}

/* ------------------------------------------------------------------------------------------------ */

/** One family line: "SO-101 · 5 reports · vs stock −91% to −76% · vs baseline −46% to −21%" (future block, from the index). */
function FamilyLine({ family }: { family: 'so101' | 'so100' }) {
  const a = REPORT_INDEX.aggregates[family]
  const range = (r: { min: number; max: number; prov: string }) => (
    <span className="nw">
      <Num className="font-mono" value={pct(r.min)} digits={0} signed unit="%" prov={r.prov} /> to <Num className="font-mono" value={pct(r.max)} digits={0} signed unit="%" prov={r.prov} />
    </span>
  )
  return (
    <li className="t-ui border-t border-line pt-[var(--s-2)]">
      <b>{a.robot}</b> <span className="muted">· {a.twin} ·</span> <Num className="font-mono" value={a.reports} digits={0} prov={`${REPORT_INDEX.counts.prov.replace(/\/$/, '')}/${family}`} /> reports. Calibrated
      vs stock {range(a.future.vs_stock)}; vs baseline {range(a.future.vs_baseline)}.
    </li>
  )
}

function TwinPackages({ go }: { go: (to: string) => (e: MouseEvent<HTMLAnchorElement>) => void }) {
  const rows = REPORT_INDEX.reports.filter((r) => r.hashes.package_sha256)
  const cols: Column<OkReportSummary>[] = [
    {
      key: 'report',
      header: 'report',
      lead: true,
      sort: (r) => r.dataset.toLowerCase(),
      cell: (r) => (
        <a className="lnk" href={`/reports/${r.id}`} onClick={go(`/reports/${r.id}`)}>
          <Ids>{r.dataset}</Ids>
        </a>
      ),
    },
    { key: 'twin', header: 'twin', sort: (r) => r.twin, cell: (r) => r.twin },
    {
      key: 'cal',
      header: 'held-out rmse, calibrated',
      align: 'right',
      sort: (r) => r.future.rmse_deg.calibrated.mean,
      cell: (r) => <Est e={r.future.rmse_deg.calibrated} stacked />,
    },
    {
      key: 'n',
      header: 'held-out',
      align: 'right',
      sort: (r) => r.future.n_episodes,
      cell: (r) => <Num className="font-mono" value={r.future.n_episodes} digits={0} prov={`${r.prov}#/headline/sets/future/n_episodes`} />,
    },
    { key: 'stock', header: 'vs stock', align: 'right', sort: (r) => r.future.vs_stock.mean, cell: (r) => <Chg c={r.future.vs_stock} stacked /> },
    { key: 'base', header: 'vs baseline', align: 'right', sort: (r) => r.future.vs_baseline.mean, cell: (r) => <Chg c={r.future.vs_baseline} stacked /> },
    {
      key: 'sha',
      header: 'package sha256',
      cell: (r) => <Num className="font-mono" value={(r.hashes.package_sha256 ?? '').slice(0, 12)} prov={`${r.prov}#/package/sha256`} />,
    },
    {
      key: 'dl',
      header: 'download',
      cell: (r) => (
        <a className="lnk" href={`/v1/reports/${r.id}/twin`} download={`${r.id}.calibrated_twin.json`}>
          calibrated_twin.json
        </a>
      ),
    },
  ]
  const first = rows.find((r) => r.id === REPORT_INDEX.hero.id) ?? rows[0]
  return (
    <div className="ds-stack">
      <div className="g10">
        <p className="t-prose c-6">
          Each report ships a calibrated twin package for the robot that recorded the data. It is a model of that unit, not of the robot model in general:
          parameter overrides for the MuJoCo Menagerie twin at a pinned commit, the joint mapping, the command delay and the replay options. Its sha256 is
          printed here and in the report. Hashed, not signed.
        </p>
        <div className="c-4 ds-stack">
          <p className="t-caption">
            <Lamp status={capability('MS-TWIN-PKG').status} size="sm" /> {capability('MS-TWIN-PKG').scope}
          </p>
          <ul className="ds-stack" aria-label="By robot, future block">
            <FamilyLine family="so101" />
            <FamilyLine family="so100" />
          </ul>
        </div>
      </div>
      <Table
        label="Calibrated twin packages"
        rows={rows}
        rowKey={(r) => r.id}
        columns={cols}
        stack
        initialSort={{ key: 'twin', dir: 'ascending' }}
      />
      <p className="t-caption">
        Held-out numbers are on the future block: the last 20% of each dataset's episodes, recorded after every episode the fit saw. RMSE in degrees, mean
        over the 5 arm joints, 95% bootstrap interval over episodes. Change is calibrated over reference minus 1, paired by episode; negative is better.
        Baseline is a physics-free lag filter fitted on the same episodes: "vs baseline" is what the MuJoCo physics adds. Replay is open-loop and
        joint-space with contacts off, so it measures the actuator model, not task success. Refused datasets have no package and are listed on{' '}
        <a className="lnk" href="/reports" onClick={go('/reports')}>
          /reports
        </a>
        .
      </p>
      {first ? (
        <CurlBlock
          path="/v1/reports/:id/twin"
          url={`${ORIGIN}/v1/reports/${first.id}/twin`}
          pipe="jq .sha256"
          status={capability('MS-TWIN-PKG').status}
          what="twin package command"
        />
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------------------------------------ */

/**
 * /cells: cells as twin + real pairs. Lanes read from shared/status.ts; #twins lists the calibrated twin packages.
 */
export function CellsPage({ onNavigate }: CellsPageProps) {
  const go = useNav(onNavigate)
  const hid = useId()
  const real = capability('MS-RV-SO101')
  return (
    <main id="main" className="page-wrap pt-[var(--s-7)] pb-[var(--s-9)]">
      <header aria-labelledby={hid}>
        <p className="t-legend">cells · twin + real</p>
        <h1 id={hid} className="t-h1 mt-[var(--s-3)]">
          Cells
        </h1>
        <div className="g10 mt-[var(--s-4)]">
          <div className="c-6 ds-stack">
            <p className="t-lede">
              A cell is a sim twin and a real robot built to match it, behind one API. None is running yet. Today the twins come from the published reports,
              and the real cell is a waitlist.
            </p>
            <p className="t-ui ds-row">
              <span>run your sim policy on a real robot. get the delta.</span>
              <Lamp status={real.status} size="sm" />
            </p>
          </div>
          <div className="c-4">
            <CurlBlock url={`${ORIGIN}/v1/cells`} pipe="jq ." what="cells command" />
          </div>
        </div>
        <Ruler className="mt-[var(--s-6)]" />
      </header>

      <Section
        id="cells-cells"
        numeral="01"
        eyebrow="cells"
        title="One cell, three lanes."
        description="A lane is LIVE only when it works at its URL. None of this cell's lanes does yet: its twin, the trials and the real arm are all still to build."
      >
        <CellPanel go={go} />
      </Section>

      <Section id="cells-plan" numeral="02" eyebrow="the real SO-101 cell" title="Planned, priced, not bought." description={
          <>
            From the{' '}
            <a className="lnk" href={CELL_PLAN_URL} rel="noopener">
              cell plan
            </a>{' '}
            (docs/ops/so101-cell-plan.md). Prices are from the linked shop pages on the day checked.
          </>
        }
      >
        <CellPlan />
      </Section>

      <Section
        id="cells-run"
        numeral="03"
        eyebrow="how a cell run will work"
        title="Your policy, our twin, then our arm."
        description={
          <>
            <Lamp status={capability('MS-TT-SIM').status} size="sm" /> Nothing in this section runs yet. It is written in the future tense on purpose.
          </>
        }
      >
        <HowARunWillWork />
      </Section>

      <Section
        id="cells-twins"
        anchor="twins"
        numeral="04"
        eyebrow="twin packages"
        title="Calibrated twins you can download today."
        description="One package per published report, whatever its result."
      >
        <TwinPackages go={go} />
      </Section>

      <section aria-label="Request a pilot" className="mt-[var(--s-9)] border-t border-line pt-[var(--s-6)]">
        <div className="ds-row justify-between gap-[var(--s-4)]">
          <p className="t-prose max-w-[60ch]">Want the first real cell to fit your work? Pilot requests decide which cell is built first and when. Nothing is charged.</p>
          <Key variant="primary" href="#request-pilot">
            Request a pilot
          </Key>
        </div>
      </section>
    </main>
  )
}
