/**
 * /reports: every Twin Gap Report, both held-out sets, the refused datasets with their reasons, the candidates that
 * were never run, the bar, and the method. All numbers come from the generated report index (shared/reports.generated.ts).
 */
import { useId, useState, type ReactNode } from 'react'

import { LAB_URL, ORIGIN } from '../../shared/constants'
import type { HeldoutSet, NotRunCandidate, RejectedReportSummary } from '../../shared/reports'
import { capability } from '../../shared/status'
import { Callout, CodeBlock, CurlBlock, Ids, Key, Lamp, Num as DsNum, Ruler, SectionHeader, type Column, type NumProps } from '../ds'
import { REPORT_INDEX } from '../lib/reports'
import { linkHandler } from '../lib/router'
import type { RequestDialogKind } from './RequestDialogs'
import { notRunShort, SET_LABEL } from '../lib/findings'
import { BarBox, FamilyCompareTable, ReportIndexTable, SetSwitch, StackTable } from './reportViews'

/** ds Num in the terminal face: a number is a mono island even inside prose (the audit's face rule). */
function Num(p: NumProps) {
  return <DsNum {...p} className={p.className ? `font-mono ${p.className}` : 'font-mono'} />
}

export interface ReportsPageProps {
  onNavigate: (to: string) => void
  onOpenDialog: (kind: RequestDialogKind) => void
}

function Section({ numeral, eyebrow, title, description, children, id }: { numeral: string; eyebrow: string; title: ReactNode; description?: ReactNode; children: ReactNode; id?: string }) {
  const hid = useId()
  return (
    <section id={id} aria-labelledby={hid} className="mt-[var(--s-9)] max-md:mt-[var(--s-8)]">
      <SectionHeader numeral={numeral} eyebrow={eyebrow} title={title} description={description} id={hid} />
      <div className="mt-[var(--s-5)]">{children}</div>
    </section>
  )
}

const METHOD: readonly ReactNode[] = [
  'Load the dataset from the Hugging Face Hub at a pinned commit. Tabular data only, never video.',
  'Split the episodes three ways: fit, an interleaved held-out set (random episodes from the same period) and a future block (the last 20% by episode index, recorded after every fit episode).',
  'Check units from the encoder-tick lattice in the data, and the joint mapping against the twin, on the fit episodes only; then check that the held-out episodes agree. A dataset that fails is refused, with the reason.',
  'Replay every recorded command open-loop in the matching MuJoCo Menagerie twin, pinned to a commit. Contacts off, gripper excluded.',
  'Fit a calibrated twin on the fit episodes (gains, friction loss and one command delay shared by all joints), and a physics-free lag filter on the same episodes as a baseline.',
  'Report the stock, aligned-stock, baseline and calibrated models on both held-out sets, with 95% bootstrap intervals over episodes.',
]

const GLOSSARY: readonly [string, ReactNode][] = [
  ['stock twin', 'the Menagerie MJCF as published, with the documented joint mapping and no delay.'],
  ['aligned stock', 'stock dynamics plus a fitted command delay and joint ranges. It shows what alignment alone buys.'],
  ['baseline', 'a physics-free lag filter, three parameters per joint, fitted on the same episodes. "vs baseline" is what the MuJoCo physics adds.'],
  ['calibrated twin', 'aligned stock plus fitted dynamics: gains and friction loss per joint, armature fixed at stock.'],
  ['future block', 'the last 20% of episodes by index, recorded after every fit episode. The harder test.'],
  ['interleaved', 'random held-out episodes from the same period as the fit episodes.'],
  ['change', 'calibrated / reference - 1, paired by episode. Negative is better.'],
  ['lag', 'frames between a command and the state that reflects it. LeRobot reads the state before it sends the command, so an instantaneous actuator measures about 1 frame.'],
  ['intervals', '95% percentile bootstrap over whole episodes, fixed seed. With about 10 held-out episodes they are approximate and tend to run narrow.'],
]

const LIMITS: readonly string[] = [
  'Open-loop, joint-space, contact-free. When the real arm pushes on the table or an object, that shows up as twin error no actuator fit removes.',
  "The servo is modelled as MuJoCo's ideal PD position actuator. Fitted gains reproduce the dynamic lag and can miss static sag under gravity; reports flag the final-pose metric when they do.",
  'Individual gains are often identified only in combination with others. Read the natural frequency and damping ratio instead.',
  'One command delay, in whole frames, shared by all joints.',
  'One dataset is one robot and one setup. Transfer to other units of the same model is not tested.',
  'The twin is picked from the dataset name and card. Some SO-101 datasets declare robot_type so100_follower; those reports say so.',
]

export function ReportsPage({ onNavigate, onOpenDialog }: ReportsPageProps) {
  const go = linkHandler(onNavigate)
  const ix = REPORT_INDEX
  const c = ix.counts
  const [set, setSet] = useState<HeldoutSet>('future')
  const hid = useId()
  const cp = (k: keyof typeof c) => `${c.prov}/${k}`

  const refusedCols: Column<RejectedReportSummary>[] = [
    {
      key: 'dataset',
      header: 'dataset',
      lead: true,
      wrap: true,
      cell: (r) => (
        <a className="lnk" href={`/reports/${r.id}`} onClick={go}>
          <Ids>{r.dataset}</Ids>
        </a>
      ),
    },
    { key: 'twin', header: 'twin', cell: (r) => r.twin },
    { key: 'why', header: 'check', cell: (r) => <Lamp status="REFUSED" size="sm">{r.category}</Lamp> },
    {
      key: 'reason',
      header: 'reason (report.json, verbatim)',
      wrap: true,
      cell: (r) => (
        <span className="block max-w-[70ch]">
          <b className="font-medium">{r.reason_short}</b>
          <span className="mt-[2px] block text-[12px] text-muted">{r.reason}</span>
        </span>
      ),
    },
  ]

  const notRunCols: Column<NotRunCandidate>[] = [
    { key: 'dataset', header: 'dataset', lead: true, wrap: true, cell: (r) => <Ids>{r.dataset}</Ids> },
    {
      key: 'verdict',
      header: 'scan verdict',
      wrap: true,
      cell: (r) => {
        const n = notRunShort(r.verdict)
        return (
          <span className="block max-w-[80ch]">
            <b className="font-medium">{n.short}</b>
            <span className="mt-[2px] block text-[12px] text-muted [overflow-wrap:anywhere]">
              {r.verdict}
              {n.truncated ? '…' : ''}
            </span>
          </span>
        )
      },
    },
  ]

  return (
    <main id="main" className="flex-1">
      <div className="page-wrap pt-[var(--s-7)] pb-[var(--s-9)] max-md:pt-[var(--s-6)]">
        <header aria-labelledby={hid}>
          <p className="t-legend">reports · {capability('MS-TGR-1').part}</p>
          <h1 id={hid} className="t-h1 mt-[var(--s-3)]">
            Twin Gap Reports
          </h1>
          <div className="g10 mt-[var(--s-4)]">
            <div className="c-6 ds-stack">
              <p className="t-lede">
                How far each robot&rsquo;s published MuJoCo twin is from the real robot, measured on public LeRobot data, and how much of that gap a calibrated
                twin closes on episodes it never saw, against a physics-free baseline.
              </p>
              <p className="t-ui ds-row">
                <Lamp status={capability('MS-TGR-1').status} />
                <span>
                  <Num value={c.reported} digits={0} prov={cp('reported')} /> reports · <Num value={c.rejected} digits={0} prov={cp('rejected')} /> refused ·{' '}
                  <Num value={c.not_run} digits={0} prov={cp('not_run')} /> not run · updated <Num value={ix.generated_at} prov="/data/reports/index.json#/generated_at" />
                </span>
              </p>
            </div>
            <div className="c-4">
              <CurlBlock url={`${ORIGIN}/v1/reports`} pipe="jq .counts" status={capability('MS-TGR-1').status} what="reports command" />
            </div>
          </div>
          <Ruler className="mt-[var(--s-6)]" />
        </header>

        <Section
          id="findings"
          numeral="01"
          eyebrow="findings"
          title={
            <>
              The <span className="nw">SO-101</span> twin is too fast. The <span className="nw">SO-100</span> twin is close.
            </>
          }
          description="Ranges over each robot's datasets, read from the report index; every number carries the report field it came from."
        >
          <div className="grid grid-cols-1 gap-[var(--s-5)] xl:grid-cols-[minmax(0,6fr)_minmax(0,4fr)]">
            <FamilyCompareTable index={ix} />
            <BarBox index={ix} go={go} />
          </div>
        </Section>

        <Section
          id="index"
          numeral="02"
          eyebrow="reports"
          title={
            <>
              All&nbsp;<Num value={c.run} digits={0} prov={cp('run')} />
              &nbsp;runs, whatever their result.
            </>
          }
          description={<>{ix.selection_rule}</>}
        >
          <div className="mb-[var(--s-4)] flex flex-wrap items-center justify-between gap-[var(--s-3)]">
            <SetSwitch value={set} onChange={setSet} />
            <p className="t-caption">
              Showing the {SET_LABEL[set]}. Sort by any column. Refused datasets sit at the bottom with their reason.
            </p>
          </div>
          <ReportIndexTable
            index={ix}
            set={set}
            go={go}
            label={`Report index, ${SET_LABEL[set]}`}
            caption={
              <>
                Held-out, {SET_LABEL[set]}. RMSE: sim-vs-real joint trajectory error in degrees, mean over the 5 arm joints (gripper excluded) and over
                episodes, [95% bootstrap CI over episodes]. Change = calibrated / reference - 1, paired by episode; negative is better. Verdict rule:{' '}
                {ix.verdict_rule}
              </>
            }
          />
        </Section>

        <Section
          id="refused"
          numeral="03"
          eyebrow="refused"
          title={
            <>
              <Num value={c.rejected} digits={0} prov={cp('rejected')} />
              &nbsp;refused, <Num value={c.not_run} digits={0} prov={cp('not_run')} />
              &nbsp;not run.
            </>
          }
          description="We don't report a dataset whose units or joint mapping we can't check from the data. A guess would make the numbers look precise and mean nothing."
        >
          <StackTable label="Refused datasets" rows={ix.rejected} rowKey={(r) => r.id} columns={refusedCols} caption="Run, then refused before any number was published. The reason is report.json's own, verbatim; the bold line is a plain-words summary." />
          <div className="mt-[var(--s-6)]">
            <p className="t-legend mb-[var(--s-3)]">Not run: the compatibility scan failed</p>
            <StackTable
              label="Candidates not run"
              rows={ix.not_run}
              rowKey={(r) => r.dataset}
              columns={notRunCols}
              compact
              caption={<>{ix.pool} The bold line is a plain-words summary; under it, the scanner&rsquo;s own text (candidates.json), cut where the scanner cut it.</>}
            />
          </div>
        </Section>

        <Section id="method" numeral="04" eyebrow="method" title="Six steps, the same for every dataset.">
          <div className="g10">
            <ol className="c-6 border-t border-edge">
              {METHOD.map((m, i) => (
                <li key={i} className="grid grid-cols-[40px_minmax(0,1fr)] gap-[var(--s-3)] border-b border-line py-[var(--s-3)]">
                  <span className="t-legend pt-[3px]">{String(i + 1).padStart(2, '0')}</span>
                  <p className="t-caption text-fg!">{m}</p>
                </li>
              ))}
            </ol>
            <div className="c-4 ds-stack">
              <Callout register="method" source="lab/README.md · determinism">
                The pipeline is deterministic on a given machine: same dataset commit, same Menagerie commit, same package versions, same results hash. MuJoCo
                results can differ in the last bits across CPUs and compilers, so each report carries a results hash that ignores the environment.
              </Callout>
              <Callout register="note" source="every report.json · content_sha256">
                Every file is hashed (sha256) and the build refuses a report whose hashes do not match. Hashed, not signed: Ed25519 signing is planned.
              </Callout>
            </div>
          </div>
        </Section>

        <Section id="reading" numeral="05" eyebrow="reading the numbers" title="What each word means here.">
          <dl className="grid grid-cols-1 border-t border-edge md:grid-cols-[220px_minmax(0,1fr)]">
            {GLOSSARY.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="t-ui border-line pt-[var(--s-3)] font-semibold md:border-b md:pb-[var(--s-3)]">{k}</dt>
                <dd className="t-caption border-b border-line pb-[var(--s-3)] text-fg! md:pt-[var(--s-3)]">{v}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section id="limits" numeral="06" eyebrow="limits" title="What the method cannot see.">
          <div className="ds-stack">
            {LIMITS.map((l, i) => (
              <Callout key={i} register="limitation" source="lab/README.md · results and limits">
                {l}
              </Callout>
            ))}
          </div>
        </Section>

        <Section id="reproduce" numeral="07" eyebrow="reproduce" title="Run it yourself.">
          <div className="g10">
            <div className="c-4 ds-stack">
              <p className="t-prose">
                The lab code is in{' '}
                <a className="lnk" href={LAB_URL} rel="noopener">
                  the repository
                </a>
                , with a hash-pinned lock file. One report took <Num value={1.5} digits={1} prov="lab/README.md#timing" /> to{' '}
                <Num value={9} digits={0} prov="lab/README.md#timing" /> minutes on the lab&rsquo;s test server (lab/README.md, timing); the verify command compares
                yours with ours field by field.
              </p>
            </div>
            <div className="c-6">
              <CodeBlock
                title={
                  <>
                    shell · <b>lab/</b>
                  </>
                }
                what="reproduce commands"
                code={[
                  'cd lab',
                  'python3 -m venv .venv',
                  '.venv/bin/pip install --require-hashes -r requirements.lock',
                  'scripts/fetch_menagerie.sh',
                  '.venv/bin/python -m meatspace_lab report \\',
                  '    --dataset lerobot/svla_so101_pickplace \\',
                  `    --revision ${ix.reports.find((r) => r.id === ix.hero.id)?.revision_sha ?? ''} \\`,
                  '    --twin .cache/menagerie/robotstudio_so101 \\',
                  '    --out /tmp/repro/svla_so101/ --max-episodes 200',
                  '.venv/bin/python -m meatspace_lab verify \\',
                  '    reports/lerobot__svla_so101_pickplace/report.json \\',
                  '    /tmp/repro/svla_so101/report.json',
                ].join('\n')}
              />
            </div>
          </div>
        </Section>

        <section aria-label="Request a report" className="mt-[var(--s-9)] border-t border-line pt-[var(--s-6)]">
          <div className="flex flex-wrap items-center justify-between gap-[var(--s-4)]">
            <div className="ds-stack max-w-[64ch]">
              <p className="t-prose">Want this on your data? Send a LeRobot <span className="nw">SO-100</span> or <span className="nw">SO-101</span> dataset. A person runs the same pipeline by hand.</p>
              <p className="t-caption">
                One of these is your dataset and the mapping is wrong, or you want the report taken down? Say so in the same form and we fix it or remove it.
              </p>
            </div>
            <Key variant="primary" aria-haspopup="dialog" onClick={() => onOpenDialog('report')}>
              Request a report
            </Key>
          </div>
        </section>
      </div>
    </main>
  )
}

