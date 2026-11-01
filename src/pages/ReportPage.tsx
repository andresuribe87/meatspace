/**
 * /reports/:id: one Twin Gap Report, rendered from its summary (in the bundle) and its files (report.json, trace.json,
 * fetched and checked against the sha256 recorded at build time). Variants: ok, refused (status unsupported), not run
 * (the compatibility scan failed), unknown id. No number is typed by hand.
 */
import { useEffect, useId, useState, type ReactNode } from 'react'

import { LAB_URL, ORIGIN } from '../../shared/constants'
import {
  changeReadingOf,
  intervalOfStat,
  JOINTS,
  readingOf,
  REPORT_INDEX_PATH,
  REPORT_SCHEMA,
  reportApiPaths,
  reportFileUrl,
  type DerivedServo,
  type HeldoutSet,
  type Joint,
  type OkReportSummary,
  type RejectedReportSummary,
  type ReportFileName,
  type ReportSummary,
  type SetMetrics,
  type Stat,
  type TwinGapReport,
  type TwinParamsJson,
  type TwinTrace,
} from '../../shared/reports'
import { useNoindex } from '../lib/noindex'
import { capability, type LampWord } from '../../shared/status'
import {
  Callout,
  CertificateHeader,
  CheckPoll,
  CIBars,
  CodeBlock,
  Ids,
  Key,
  LagReadout,
  Lamp,
  Num as DsNum,
  ProvenanceFrame,
  Reading,
  Ruler,
  ScopeStrips,
  Seal,
  SectionHeader,
  Table,
  TitleBlock,
  type CIBarRow,
  type NumProps,
  type PollRow,
  fmtElapsed,
  useElapsed,
} from '../ds'
import { getReportSummary, REPORT_INDEX, useReport, useTrace, type Loadable } from '../lib/reports'
import { linkHandler } from '../lib/router'
import type { RequestDialogKind } from './RequestDialogs'
import { SET_LABEL } from '../lib/findings'
import { Chg, Est, SetSwitch, StackTable, VerdictLamps } from './reportViews'

/** ds Num in the terminal face: a number is a mono island even inside prose (the audit's face rule). */
function Num(p: NumProps) {
  return <DsNum {...p} className={p.className ? `font-mono ${p.className}` : 'font-mono'} />
}

export interface ReportPageProps {
  id: string
  onNavigate: (to: string) => void
  onOpenDialog: (kind: RequestDialogKind) => void
}

const sha7 = (s: string) => s.slice(0, 7)
const sha12 = (s: string) => s.slice(0, 12)

/** Pointer into the index for one summary (by position), for counts and file sizes. */
function indexPtr(s: ReportSummary): string {
  const list = s.status === 'ok' ? REPORT_INDEX.reports : REPORT_INDEX.rejected
  const i = (list as ReportSummary[]).findIndex((r) => r.id === s.id)
  return `${REPORT_INDEX_PATH}#/${s.status === 'ok' ? 'reports' : 'rejected'}/${i}`
}

function Section({ numeral, eyebrow, title, description, children, id }: { numeral?: string; eyebrow: string; title: ReactNode; description?: ReactNode; children: ReactNode; id?: string }) {
  const hid = useId()
  return (
    <section id={id} aria-labelledby={hid} className="mt-[var(--s-8)] max-md:mt-[var(--s-7)]">
      <SectionHeader numeral={numeral} eyebrow={eyebrow} title={title} description={description} id={hid} />
      <div className="mt-[var(--s-5)]">{children}</div>
    </section>
  )
}

/** "1 frame" / "2 frames": plural from the value. */
const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many)

/**
 * Placeholder for a part that waits on a fetched file; errors say what failed and that the rest still stands. It
 * reserves about the final height (no layout jump when the file lands) and shows elapsed time, never a spinner.
 */
function Pending({ what, state, file, minHeight = 'min-h-[480px]' }: { what: string; state: Loadable<unknown>; file: string; minHeight?: string }) {
  const [startedAt] = useState(() => performance.now())
  const elapsed = useElapsed(state.state === 'loading' ? startedAt : null, 'perf', 100)
  if (state.state === 'error') {
    return (
      <Callout register="note" source={`${file} · ${state.kind}${state.status ? ` · HTTP ${state.status}` : ''}`}>
        {what} could not be loaded: {state.message} The headline numbers above come from the build and do not depend on it.
      </Callout>
    )
  }
  return (
    <div className={`grid ${minHeight} place-items-center border border-dashed border-line`} aria-busy="true">
      <p className="t-legend">
        loading {file} <span className="tabular">{fmtElapsed(elapsed)}</span>
      </p>
    </div>
  )
}

/** What each file's sha256 is tied to: only some are inside the hashed report (content_sha256). */
const FILE_COVER: Readonly<Record<ReportFileName, string>> = {
  'report.json': 'content_sha256 (its own fields)',
  'report.strict.json': 'derived from report.json at build',
  'report.md': 'not in content_sha256',
  'calibrated_twin.json': 'package.sha256 in report.json',
  'trace.json': 'its own sha256; checked against report.json',
  'heldout_episode.svg': 'not in content_sha256',
  'rmse_by_joint_future.svg': 'not in content_sha256',
  'rmse_by_joint.svg': 'not in content_sha256',
}

const FILE_WHAT: Readonly<Record<ReportFileName, string>> = {
  'report.json': 'the report: every number on this page',
  'report.strict.json': 'the same report, NaN and Infinity written as null (strict JSON)',
  'report.md': 'the report as text',
  'calibrated_twin.json': 'calibrated twin package: overrides for the Menagerie MJCF',
  'trace.json': 'the episode in Fig 1, per frame, with the baseline',
  'heldout_episode.svg': "the lab's plot of the same episode",
  'rmse_by_joint_future.svg': 'per-joint RMSE plot, future block',
  'rmse_by_joint.svg': 'per-joint RMSE plot, interleaved',
}

function Files({ s }: { s: ReportSummary }) {
  const ptr = indexPtr(s)
  const rows = (Object.keys(FILE_WHAT) as ReportFileName[]).filter((n) => s.files[n]).map((n) => ({ name: n, meta: s.files[n]! }))
  return (
    <StackTable
      label="Published files"
      rows={rows}
      rowKey={(r) => r.name}
      columns={[
        { key: 'name', header: 'file', lead: true, cell: (r) => <code>{r.name}</code> },
        { key: 'what', header: 'what', wrap: true, className: 'muted', cell: (r) => FILE_WHAT[r.name] },
        {
          key: 'size',
          header: 'size',
          align: 'right',
          cell: (r) => <Num value={r.meta.bytes / 1024} digits={1} unit=" KB" prov={`${ptr}/files/${r.name}/bytes (÷ 1024)`} />,
        },
        { key: 'sha', header: 'sha256', cell: (r) => <Num value={sha12(r.meta.sha256)} prov={`${ptr}/files/${r.name}/sha256`} /> },
        { key: 'cover', header: 'tied to', wrap: true, className: 'muted', cell: (r) => FILE_COVER[r.name] },
        {
          key: 'get',
          header: 'download',
          cell: (r) => (
            <Key variant="ghost" size="sm" href={reportFileUrl(s.id, r.name)} download={r.name} aria-label={`Download ${r.name}`}>
              Download
            </Key>
          ),
        },
      ]}
      caption="Served byte for byte; the sha256 is the ETag the API sends, so a download can be checked against this table. report.json, the twin package and the trace are tied to the hashed report and checked at every build. report.md and the SVG plots are the lab's renderings: their sha256 here is recorded at build, but nothing inside report.json covers them, so read the numbers from report.json."
    />
  )
}

function CurlCommands({ s }: { s: ReportSummary }) {
  const p = reportApiPaths(s.id)
  const lines =
    s.status === 'ok'
      ? [
          '# the report (strict JSON), and its headline',
          `curl -s ${ORIGIN}${p.report} | jq .headline.verdict`,
          '# the calibrated twin package',
          `curl -s ${ORIGIN}${p.twin} \\`,
          '    -o calibrated_twin.json',
          '# the episode in Fig 1, per frame',
          `curl -s ${ORIGIN}${p.trace} | jq .rmse_deg`,
          '# check what you downloaded against the hash on this page',
          `curl -s ${ORIGIN}${p.file('report.json')} | sha256sum`,
        ]
      : [`curl -s ${ORIGIN}${p.report} | jq '{status, reason}'`, `curl -s ${ORIGIN}${p.file('report.md')}`]
  return <CodeBlock title={<>shell · <b>GET /v1/reports/:id</b></>} status={capability('MS-TGR-1').status} code={lines.join('\n')} what="report commands" />
}

function Credit({ s, onOpenDialog }: { s: ReportSummary; onOpenDialog: (k: RequestDialogKind) => void }) {
  const cite = `meatspace.sh Twin Gap Report, ${s.dataset} x ${s.twin}, ${s.published}, sha256 ${s.hashes.content_sha256}. ${ORIGIN}/reports/${s.id}`
  return (
    <div className="g10">
      <div className="c-4 ds-stack">
        <p className="t-prose">
          Data:{' '}
          <a className="lnk" href={s.dataset_url} rel="noopener">
            <Ids>{s.dataset}</Ids>
          </a>{' '}
          by {s.owner} on the Hugging Face Hub, at commit {sha7(s.revision_sha)}. Twin: {s.twin} from{' '}
          <a className="lnk" href={`https://github.com/google-deepmind/mujoco_menagerie/tree/${s.menagerie_sha}`} rel="noopener">
            MuJoCo Menagerie
          </a>{' '}
          at {sha7(s.menagerie_sha)}.
        </p>
        <p className="t-caption">
          Your dataset? If the mapping is wrong, or you want this report taken down, say so through{' '}
          <button type="button" className="lnk" onClick={() => onOpenDialog('report')}>
            the request form
          </button>
          . We fix it or remove it.
        </p>
      </div>
      <div className="c-6">
        <CodeBlock title="cite as" prompt="" code={cite} what="citation" className="code--wrap" />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------------------------------
 * ok report
 * ---------------------------------------------------------------------------------------------- */

/** The check poll, from the build-time summary only: no lamp waits on (or guesses ahead of) a fetched file. */
function checks(s: OkReportSummary): { rows: PollRow[]; result: PollRow } {
  const { units, mapping, split } = s.checks
  const conv = s.converged
  const rows: PollRow[] = [
    {
      check: 'units',
      why: `${s.units}, read from the encoder-tick lattice of the fit episodes${units.heldout_agrees === false ? '; the held-out episodes disagree' : units.heldout_agrees ? '; the held-out episodes agree' : ''} (report.json units.reason)`,
      status: !units.supported || units.heldout_agrees === false ? 'CAUTION' : 'GO',
    },
    {
      check: 'mapping',
      why: mapping.sign_ambiguous
        ? `documented sign used. On ${mapping.sign_ambiguous} of ${mapping.joints} joints the flipped sign also fits the recorded range, so sign is not identified by range alone.`
        : 'documented joint mapping; the recorded range fits the twin with the documented sign only',
      status: mapping.sign_ambiguous ? 'CAUTION' : 'GO',
    },
    {
      check: 'split',
      why: `future block = last 20% of episodes by index; interleaved drawn with a fixed seed; ${split.overlap} ${plural(split.overlap, 'episode')} overlap the fit`,
      status: split.overlap ? 'CAUTION' : 'GO',
    },
    {
      check: 'held-out',
      why: (
        <>
          <span className="nw">
            n = <Num value={s.future.n_episodes} digits={0} prov={`${s.prov}#/headline/sets/future/n_episodes`} />
          </span>{' '}
          future-block and <Num value={s.interleaved.n_episodes} digits={0} prov={`${s.prov}#/headline/sets/interleaved/n_episodes`} /> interleaved episodes.
          Intervals are approximate and tend to run narrow.
        </>
      ),
      status: 'SCOPE',
    },
    { check: 'contact', why: 'contacts disabled in the replay; gripper excluded from every metric', status: 'SCOPE' },
    { check: 'fit', why: conv ? 'the calibrated fit converged' : 'the calibrated fit did not converge within its budget', status: conv ? 'GO' : 'CAUTION' },
    { check: 'signing', why: 'files are hashed (sha256). Ed25519 signing is planned.', status: 'PLANNED' },
  ]
  const n = (w: LampWord) => rows.filter((r) => r.status === w).length
  const parts = (['GO', 'CAUTION', 'SCOPE', 'PLANNED'] as LampWord[]).filter((w) => n(w)).map((w) => `${n(w)} ${w.toLowerCase()}`)
  return { rows, result: { check: 'report', why: `published with ${parts.join(' · ')}`, status: 'ISSUED' } }
}

function Headline({ s, set }: { s: OkReportSummary; set: HeldoutSet }) {
  const x = s[set]
  return (
    <div className="cert">
      <div className="cert-headline">
        <Reading label="held-out rmse · stock twin" channel="stock" unit="°" tolerance nLabel="held-out episodes" {...readingOf(x.rmse_deg.stock)} />
        <Reading label="held-out rmse · calibrated" channel="cal" unit="°" tolerance nLabel="held-out episodes" {...readingOf(x.rmse_deg.calibrated)} />
        <Reading
          label="change vs stock · paired"
          {...changeReadingOf(x.vs_stock)}
          nLabel={
            <>
              · <Num value={x.vs_stock.improved} digits={0} prov={x.vs_stock.prov} /> improved
            </>
          }
        />
        <div className="ro">
          <div className="ro-l t-legend">verdict · {SET_LABEL[set]}</div>
          <VerdictLamps s={x} />
          <Reading
            label="vs lag-filter baseline"
            size="s"
            {...changeReadingOf(x.vs_baseline)}
            nLabel={
              <>
                · <Num value={x.vs_baseline.improved} digits={0} prov={x.vs_baseline.prov} /> improved
              </>
            }
          />
        </div>
      </div>
      <p className="t-caption border-t border-line px-[var(--s-4)] py-[var(--s-3)]">
        <span className="t-legend mr-[var(--s-2)]">lab verdict, verbatim</span>
        <span data-verbatim={x.verdict_prov}>{x.verdict}</span>
      </p>
    </div>
  )
}

function rmseRow(m: SetMetrics, j: Joint | 'arm_mean'): CIBarRow | null {
  const stock = intervalOfStat(m.stock.sim_vs_real_rmse_deg[j])
  const cal = intervalOfStat(m.calibrated.sim_vs_real_rmse_deg[j])
  const change = intervalOfStat(m.improvement_calibrated_vs_stock[j]?.rel_change, true)
  if (!stock || !cal || !change) return null
  return { joint: j === 'arm_mean' ? 'arm mean' : j, stock, cal, change }
}

function StatCell({ st, prov, digits = 2 }: { st: Stat | undefined; prov: string; digits?: number }) {
  if (!st || st.mean == null || st.ci95[0] == null || st.ci95[1] == null) return <span className="muted">n/a</span>
  return <Est e={{ mean: st.mean, ci95: [st.ci95[0], st.ci95[1]], n: st.n ?? 0, prov }} digits={digits} stacked />
}

function ChgCell({ st, prov }: { st: Stat | undefined; prov: string }) {
  if (!st || st.mean == null || st.ci95[0] == null || st.ci95[1] == null) return <span className="muted">n/a</span>
  return <Chg c={{ mean: st.mean, ci95: [st.ci95[0], st.ci95[1]], prov }} stacked />
}

/** Table 1: every model per joint, with the change against stock and against the lag filter. */
function JointTable({ id, m, set }: { id: string; m: SetMetrics; set: HeldoutSet }) {
  const base = `lab/reports/${id}/report.json#/metrics/${set}`
  type Row = { j: Joint | 'arm_mean' }
  const rows: Row[] = [...JOINTS.map((j) => ({ j })), { j: 'arm_mean' as const }]
  const model = (k: 'stock' | 'aligned_stock' | 'baseline' | 'calibrated', label: string) => ({
    key: k,
    header: label,
    align: 'right' as const,
    cell: (r: Row) => <StatCell st={m[k].sim_vs_real_rmse_deg[r.j]} prov={`${base}/${k}/sim_vs_real_rmse_deg/${r.j}`} />,
  })
  return (
    <StackTable
      label={`Per-joint held-out RMSE, ${SET_LABEL[set]}`}
      rows={rows.slice(0, -1)}
      summary={rows[rows.length - 1]}
      rowKey={(r) => r.j}
      columns={[
        { key: 'joint', header: 'joint', lead: true, cell: (r) => (r.j === 'arm_mean' ? <b>arm mean</b> : r.j) },
        model('stock', 'stock'),
        model('aligned_stock', 'aligned stock'),
        model('baseline', 'baseline'),
        model('calibrated', 'calibrated'),
        {
          key: 'vs_stock',
          header: 'cal vs stock',
          align: 'right',
          cell: (r) => <ChgCell st={m.improvement_calibrated_vs_stock[r.j]?.rel_change} prov={`${base}/improvement_calibrated_vs_stock/${r.j}/rel_change`} />,
        },
        {
          key: 'vs_base',
          header: 'cal vs baseline',
          align: 'right',
          cell: (r) => <ChgCell st={m.improvement_calibrated_vs_baseline[r.j]?.rel_change} prov={`${base}/improvement_calibrated_vs_baseline/${r.j}/rel_change`} />,
        },
      ]}
      caption={
        <>
          Held-out, {SET_LABEL[set]},{' '}
          <span className="nw">
            n = <Num value={m.n_episodes} digits={0} prov={`${base}/n_episodes`} />
          </span>{' '}
          episodes. Sim-vs-real joint RMSE in degrees, mean over episodes [95% CI]. Change = calibrated / reference -
          1, paired by episode; negative is better. A positive change against the baseline means the lag filter does better on that joint.
        </>
      }
    />
  )
}

/** Table 2: the episode in Fig 1, per joint, for every model in trace.json (the baseline is not drawn in Fig 1). */
function EpisodeTable({ id, t }: { id: string; t: TwinTrace }) {
  const p = (k: 'stock' | 'baseline' | 'calibrated', i: number) => `lab/reports/${id}/trace.json#/rmse_deg/${k}/${i}`
  return (
    <Table
      label="RMSE of the episode in Fig 1"
      compact
      rows={t.joints.map((j, i) => ({ j, i }))}
      rowKey={(r) => r.j}
      columns={[
        { key: 'joint', header: 'joint', cell: (r) => r.j },
        { key: 'stock', header: 'stock', align: 'right', cell: (r) => <Num value={t.rmse_deg.stock[r.i]} unit="°" prov={p('stock', r.i)} /> },
        { key: 'baseline', header: 'baseline', align: 'right', cell: (r) => <Num value={t.rmse_deg.baseline[r.i]} unit="°" prov={p('baseline', r.i)} /> },
        { key: 'cal', header: 'calibrated', align: 'right', cell: (r) => <Num value={t.rmse_deg.calibrated[r.i]} unit="°" prov={p('calibrated', r.i)} /> },
      ]}
      caption="This one episode, full frame rate, degrees. The physics-free lag filter is not drawn in Fig 1; its replay is in trace.json under series.*.baseline."
    />
  )
}

/** One interpretive line about lag, chosen by rule (copy deck 4.5), never by hand. */
function LagNote({ s }: { s: OkReportSummary }) {
  const m = s.lag.median_frames
  const ptr = `${s.lag.prov}/median_over_joints_frames`
  if (m.real == null || m.stock == null || m.calibrated == null) return null
  const f = (k: 'real' | 'stock' | 'calibrated') => <Num value={m[k]} prov={`${ptr}/${k}`} />
  if (m.stock < 1.5)
    return (
      <p className="t-prose">
        The stock twin answers its command within about one frame ({f('stock')} frames, median over joints): its actuators are much stiffer than the real
        servos, which lag {f('real')} frames. The calibrated twin lags {f('calibrated')}.
      </p>
    )
  if (Math.abs(m.stock - m.real) <= 0.5)
    return (
      <p className="t-prose">
        The stock twin&rsquo;s lag ({f('stock')} frames, median over joints) already matches the real robot&rsquo;s ({f('real')}) within half a frame. Most of the
        gain here is elsewhere.
      </p>
    )
  return (
    <p className="t-prose">
      Median over joints: real {f('real')} frames, stock twin {f('stock')}, calibrated {f('calibrated')}.
    </p>
  )
}

function LagTable({ s }: { s: OkReportSummary }) {
  const L = s.lag
  const p = (j: Joint, k: 'real' | 'stock' | 'calibrated') => `${L.prov}/per_joint_ms/${j}/${k}`
  const v = (j: Joint, k: 'real' | 'stock' | 'calibrated') => {
    const x = L.per_joint_ms[j][k]
    return x == null ? <span className="muted">n/a</span> : <Num value={x} digits={0} unit=" ms" prov={p(j, k)} />
  }
  return (
    <Table
      label="Lag per joint"
      compact
      rows={JOINTS.map((j) => ({ j }))}
      rowKey={(r) => r.j}
      columns={[
        { key: 'joint', header: 'joint', cell: (r) => r.j },
        { key: 'real', header: 'real', align: 'right', cell: (r) => v(r.j, 'real') },
        { key: 'stock', header: 'stock', align: 'right', cell: (r) => v(r.j, 'stock') },
        { key: 'cal', header: 'calibrated', align: 'right', cell: (r) => v(r.j, 'calibrated') },
      ]}
      caption={
        <>
          Interleaved held-out set, command to state, ms per joint. Worst joint mismatch: stock{' '}
          {L.max_mismatch_ms.stock == null ? 'n/a' : <Num value={L.max_mismatch_ms.stock} digits={1} unit=" ms" prov={`${L.prov}/max_abs_mismatch_vs_real_ms/stock`} />}, calibrated{' '}
          {L.max_mismatch_ms.calibrated == null ? 'n/a' : <Num value={L.max_mismatch_ms.calibrated} digits={1} unit=" ms" prov={`${L.prov}/max_abs_mismatch_vs_real_ms/calibrated`} />}.
        </>
      }
    />
  )
}

interface IdParam {
  param: string
  joint: string
  identified_alone?: boolean
  at_bound?: boolean
}

function ParamsTable({ id, rep }: { id: string; rep: TwinGapReport }) {
  const stock = (rep.twin as { stock_params?: TwinParamsJson }).stock_params
  const cal = rep.fit?.calibrated
  if (!stock || !cal) return <p className="t-caption">This report has no fitted parameters.</p>
  const fp = cal.params
  const ident = (cal.identifiability.parameters as IdParam[] | undefined) ?? []
  const derived = cal.identifiability.derived as Record<Joint, DerivedServo>
  const base = `lab/reports/${id}/report.json#`
  const flag = (param: string, j: Joint) => {
    const r = ident.find((x) => x.param === param && x.joint === j)
    if (!r) return null
    if (r.at_bound) return <Lamp status="CAUTION" size="sm">at bound</Lamp>
    if (r.identified_alone === false) return <Lamp status="SCOPE" size="sm">in combination</Lamp>
    return null
  }
  const pair = (k: 'kp' | 'kv' | 'frictionloss', i: number, j: Joint, digits: number) => (
    <span className="inline-flex flex-wrap items-center justify-end gap-[6px]">
      <span className="nw">
        <Num value={stock[k][i]} digits={digits} prov={`${base}/twin/stock_params/${k}/${i}`} /> →{' '}
        <Num value={fp[k][i]} digits={digits} prov={`${base}/fit/calibrated/params/${k}/${i}`} />
      </span>
      {flag(k, j)}
    </span>
  )
  const dv = (j: Joint, k: 'natural_freq_hz' | 'damping_ratio', digits: number) => {
    const d = derived?.[j]?.[k]
    if (!d) return <span className="muted">n/a</span>
    const prov = `${base}/fit/calibrated/identifiability/derived/${j}/${k}`
    return (
      <>
        <Num value={d.value} digits={digits} prov={prov} />
        <small className="block text-[10.5px] text-muted">
          [<Num value={d.ci95[0]} digits={digits} prov={prov} />, <Num value={d.ci95[1]} digits={digits} prov={prov} />]
        </small>
      </>
    )
  }
  return (
    <StackTable
      label="Fitted parameters"
      rows={JOINTS.map((j, i) => ({ j, i }))}
      rowKey={(r) => r.j}
      columns={[
        { key: 'joint', header: 'joint', lead: true, cell: (r) => r.j },
        { key: 'kp', header: 'kp, N m/rad', align: 'right', cell: (r) => pair('kp', r.i, r.j, 1) },
        { key: 'kv', header: 'kv, N m s/rad', align: 'right', cell: (r) => pair('kv', r.i, r.j, 3) },
        { key: 'fl', header: 'friction loss, N m', align: 'right', cell: (r) => pair('frictionloss', r.i, r.j, 3) },
        { key: 'nf', header: 'natural freq, Hz', align: 'right', cell: (r) => dv(r.j, 'natural_freq_hz', 2) },
        { key: 'dr', header: 'damping ratio', align: 'right', cell: (r) => dv(r.j, 'damping_ratio', 2) },
      ]}
      caption={
        <>
          Stock → fitted, armature fixed at stock, command delay <Num value={fp.delay_frames ?? 0} digits={0} prov={`${base}/fit/calibrated/params/delay_frames`} />{' '}
          {plural(fp.delay_frames ?? 0, 'frame')} shared by all joints. &ldquo;In combination&rdquo;: the fit pins this gain only together with others (marginal over conditional std of 10 or
          more), so its value is not meaningful alone. Natural frequency and damping ratio are identified; 95% intervals from a linearised episode bootstrap.
        </>
      }
    />
  )
}

function Limitations({ id, items }: { id: string; items: string[] }) {
  const [all, setAll] = useState(false)
  const shown = all ? items : items.slice(0, 4)
  return (
    <div className="ds-stack">
      {shown.map((l, i) => (
        <Callout key={i} register="limitation" source={`report.json · limitations[${i}]`}>
          {l}
        </Callout>
      ))}
      {items.length > 4 ? (
        <Key variant="ghost" aria-expanded={all} aria-controls={`lim-${id}`} onClick={() => setAll((a) => !a)}>
          {all ? 'Show fewer' : `Show all ${items.length} limitations`}
        </Key>
      ) : null}
    </div>
  )
}

function ProvenanceBlock({ s, rep }: { s: OkReportSummary | RejectedReportSummary; rep: TwinGapReport | null }) {
  const env = rep?.environment
  const prov = s.prov
  return (
    <div className="ds-stack">
      <TitleBlock
        label="Provenance"
        fields={[
          { k: 'dataset', v: <Ids>{`${s.dataset} @ ${s.revision_sha}`}</Ids>, span: 6 },
          {
            k: 'data files',
            v: rep ? (
              <>
                <Num value={rep.dataset.files.length} digits={0} prov={`${prov}#/dataset/files`} /> {plural(rep.dataset.files.length, 'file')}, sha256 each, in
                report.json
              </>
            ) : (
              'sha256 each, in report.json'
            ),
            span: 2,
          },
          { k: 'twin', v: <Ids>{`${s.twin} · MuJoCo Menagerie @ ${s.menagerie_sha}`}</Ids>, span: 4 },
          {
            k: 'environment',
            v: env ? `python ${env.python} · mujoco ${env.mujoco} · numpy ${env.numpy} · scipy ${env.scipy} · meatspace_lab ${env.meatspace_lab}` : `mujoco ${s.mujoco}`,
            span: 4,
          },
          { k: 'code sha256', v: env ? <Num value={sha12(env.code_sha256)} prov={`${prov}#/environment/code_sha256`} /> : 'in report.json', span: 2 },
          { k: 'content sha256', v: <Num value={s.hashes.content_sha256} prov={`${prov}#/content_sha256`} />, span: 6 },
          { k: 'results sha256', v: <Num value={s.hashes.results_sha256} prov={`${prov}#/results_sha256`} />, span: 6 },
          ...(s.hashes.package_sha256 ? [{ k: 'twin package sha256', v: <Num value={s.hashes.package_sha256} prov={`${prov}#/package/sha256`} />, span: 6 as const }] : []),
          ...(s.hashes.trace_sha256 ? [{ k: 'trace sha256', v: <Num value={s.hashes.trace_sha256} prov={`lab/reports/${s.id}/trace.json#/sha256`} />, span: 6 as const }] : []),
        ]}
      />
      <p className="t-caption">
        These hashes let you check that what you downloaded is what we ran. content_sha256 covers the whole report (recompute it over report.json, not the
        strict copy); results_sha256 covers the results only and is the same on any machine. Hashed, not signed: Ed25519 signing is planned.
      </p>
    </div>
  )
}

function OkReport({ s, onNavigate, onOpenDialog }: { s: OkReportSummary; onNavigate: (to: string) => void; onOpenDialog: (k: RequestDialogKind) => void }) {
  const go = linkHandler(onNavigate)
  const rep = useReport(s.id)
  const trace = useTrace(s.id)
  const [set, setSet] = useState<HeldoutSet>('future')
  const r = rep.state === 'ready' ? rep.data : null
  const stockKp = (r?.twin as { stock_params?: TwinParamsJson } | undefined)?.stock_params?.kp
  const fitKp = r?.fit?.calibrated.params.kp
  const poll = checks(s)
  const x = s[set]
  const api = reportApiPaths(s.id)
  const e = s.episodes
  const ep = `${s.prov}#/split`

  return (
    <>
      <CertificateHeader
        bare
        eyebrow={
          <>
            <a className="lnk" href="/reports" onClick={go}>
              reports
            </a>{' '}
            / <Ids>{s.dataset}</Ids>
          </>
        }
        title={
          <>
            <Ids>{s.dataset}</Ids> x <span className="nw">{s.twin}</span>
          </>
        }
        meta={
          <>
            owner {s.owner} · robot_type {s.robot_type} · <Num value={s.fps} digits={0} prov={`${s.prov}#/dataset/fps`} /> fps ·{' '}
            <Num value={e.total} digits={0} prov={`${s.prov}#/dataset/episodes_total`} /> episodes · <Num value={e.fit} digits={0} prov={`${ep}/fit`} /> fit /{' '}
            <Num value={e.interleaved} digits={0} prov={`${ep}/interleaved_heldout`} /> interleaved / <Num value={e.future} digits={0} prov={`${ep}/future_heldout`} />{' '}
            future · units {s.units}, read from the data
          </>
        }
        fields={[
          { k: 'document', v: 'Twin Gap Report' },
          { k: 'status', v: <Lamp status={capability('MS-TGR-1').status} size="sm" /> },
          { k: 'schema', v: REPORT_SCHEMA.replace('meatspace.', ''), span: 2 },
          { k: 'published', v: <Num value={s.published} prov={`${indexPtr(s)}/published`} />, span: 2 },
          {
            k: 'dataset',
            v: (
              <a className="lnk" href={s.dataset_url} rel="noopener">
                <Ids>{`${s.dataset} @ ${sha7(s.revision_sha)}`}</Ids>
              </a>
            ),
            span: 3,
          },
          { k: 'twin', v: <Ids>{`${s.twin} · MuJoCo Menagerie @ ${sha7(s.menagerie_sha)} · mujoco ${s.mujoco}`}</Ids>, span: 3 },
          { k: 'split', v: 'future block = last 20% by index · interleaved by seeded draw · the fit never sees either', span: 3 },
          { k: 'robot', v: `${s.robot} · recording ${s.recording_convention}`, span: 3 },
          { k: 'intervals', v: '95% percentile bootstrap over episodes, fixed seed', span: 4 },
          { k: 'content sha256', v: <Num value={sha12(s.hashes.content_sha256)} prov={`${s.prov}#/content_sha256`} />, span: 2 },
        ]}
        seal={
          <Seal
            word="twin record"
            label="Calibrated twin record"
            lamp={<Lamp status={capability('MS-TWIN-PKG').status} size="sm" />}
            rows={[
              [
                'fit on',
                <>
                  <Num value={e.fit} digits={0} prov={`${ep}/fit`} /> episodes
                </>,
              ],
              [
                'delay',
                <>
                  <Num value={s.command_delay_frames} digits={0} prov={`${s.prov}#/fit/calibrated/params/delay_frames`} /> {plural(s.command_delay_frames, 'frame')}, all
                  joints
                </>,
              ],
              ['params', 'kp, kv, friction loss per joint; armature fixed'],
              [
                'kp',
                stockKp && fitKp ? (
                  <>
                    <Num value={stockKp[0]} digits={0} prov={`${s.prov}#/twin/stock_params/kp/0`} /> →{' '}
                    <Num value={Math.min(...fitKp)} digits={1} prov={`${s.prov}#/fit/calibrated/params/kp`} /> to{' '}
                    <Num value={Math.max(...fitKp)} digits={1} prov={`${s.prov}#/fit/calibrated/params/kp`} unit=" N m/rad" />
                  </>
                ) : rep.state === 'error' ? (
                  `not loaded (report.json · ${rep.kind})`
                ) : (
                  'loading report.json'
                ),
              ],
              [
                'bandwidth',
                <>
                  <Num value={s.natural_freq_hz.min} digits={1} prov={s.natural_freq_hz.prov} /> to{' '}
                  <Num value={s.natural_freq_hz.max} digits={1} prov={s.natural_freq_hz.prov} /> Hz
                </>,
              ],
              ['converged', s.converged ? 'yes' : 'no'],
              [
                'package',
                <a key="p" className="lnk" href={reportFileUrl(s.id, 'calibrated_twin.json')} download="calibrated_twin.json">
                  calibrated_twin.json
                </a>,
              ],
              ['sha256', s.hashes.package_sha256 ? <Num key="s" value={sha12(s.hashes.package_sha256)} prov={`${s.prov}#/package/sha256`} /> : 'n/a'],
            ]}
          />
        }
      />

      <div className="mt-[var(--s-4)] flex flex-wrap items-center justify-between gap-[var(--s-3)]">
        <SetSwitch value={set} onChange={setSet} />
        <p className="t-caption">
          Future block: the last 20% of episodes, recorded after every fit episode. Interleaved: random episodes from the same period.
        </p>
      </div>
      <div className="mt-[var(--s-3)] border border-line bg-[var(--surface)]">
        <Headline s={s} set={set} />
        <div className="px-[var(--s-4)] pb-[var(--s-4)]">
          <ProvenanceFrame
            cells={[
              {
                k: 'held-out rmse',
                v: (
                  <>
                    <Num value={x.rmse_deg.stock.mean} prov={x.rmse_deg.stock.prov} /> → <Num value={x.rmse_deg.calibrated.mean} prov={x.rmse_deg.calibrated.prov} />°{' '}
                    <span className="nw">
                      [<Num value={x.rmse_deg.calibrated.ci95[0]} prov={x.rmse_deg.calibrated.prov} />,{' '}
                      <Num value={x.rmse_deg.calibrated.ci95[1]} prov={x.rmse_deg.calibrated.prov} />]
                    </span>
                  </>
                ),
              },
              { k: 'dataset', datum: 'R', v: <Ids>{`${s.dataset} @ ${sha7(s.revision_sha)}`}</Ids> },
              { k: 'twin', datum: 'T', v: <Ids>{`${s.twin} @ ${sha7(s.menagerie_sha)}`}</Ids> },
              {
                k: 'split · method',
                v: (
                  <>
                    <Num value={e.fit} digits={0} prov={`${ep}/fit`} /> / <Num value={x.n_episodes} digits={0} prov={`${s.prov}#/headline/sets/${set}/n_episodes`} /> ·
                    bootstrap
                  </>
                ),
              },
            ]}
          />
        </div>
      </div>

      <div className="mt-[var(--s-5)]">
        <p className="t-legend mb-[var(--s-3)]">checks before the report is published · from report.json</p>
        <CheckPoll rows={poll.rows} result={poll.result} />
      </div>

      <Section id="episode" numeral="01" eyebrow="held-out episode" title="One episode, every joint, real against both twins.">
        {trace.state === 'ready' ? (
          <div className="ds-stack">
            <ScopeStrips
              number={1}
              joints={trace.data.joints.map((j) => ({ joint: j, real: trace.data.series[j].real, stock: trace.data.series[j].stock, cal: trace.data.series[j].cal, cmd: trace.data.series[j].cmd }))}
              rmse={Object.fromEntries(trace.data.joints.map((j, i) => [j, { stock: trace.data.rmse_deg.stock[i], cal: trace.data.rmse_deg.calibrated[i] }]))}
              fps={trace.data.fps_series}
              episode={`${trace.data.episode.set === 'future' ? 'future-block' : 'interleaved'} episode ${trace.data.episode.index}`}
              prov={`lab/reports/${s.id}/trace.json#/series`}
              caption={
                <>
                  Open-loop replay of the {trace.data.episode.set === 'future' ? 'future-block' : 'interleaved'} held-out episode with the median stock-twin error.
                  The recorded command (dotted) drives each twin; the real follower&rsquo;s measured state is the reference, drawn on top inside its ±1.0° mask.
                  Each strip has a Δ lane: amber ticks mark the frames where a twin leaves the mask.
                  {trace.data.decimation > 1 ? ` One frame in ${trace.data.decimation} is drawn (trace.json decimation); the RMSE table uses every frame.` : ''}
                </>
              }
            />
            <div className="g10 items-start">
              <div className="c-5">
                <EpisodeTable id={s.id} t={trace.data} />
              </div>
              <div className="c-5 ds-stack">
                <p className="t-legend">the baseline, on this episode</p>
                <p className="t-prose">
                  The physics-free lag filter is the yardstick: it learns only a delay, a smoothing factor and a bias per joint. Where the calibrated twin beats it, the MuJoCo
                  physics is earning its keep; where it does not, a filter would have done.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <Pending what="The held-out episode" state={trace} file="trace.json" minHeight="min-h-[820px] max-md:min-h-[420px]" />
        )}
      </Section>

      <Section
        id="joints"
        numeral="02"
        eyebrow="per joint"
        title="Where the error is, and what the physics adds."
        description={<>Showing the {SET_LABEL[set]}. Switch the held-out set above.</>}
      >
        {r?.metrics ? (
          <div className="ds-stack">
            <div className="grid grid-cols-1 gap-[var(--s-5)] xl:grid-cols-2">
              <CIBars
                rows={JOINTS.map((j) => rmseRow(r.metrics![set], j)).filter((v): v is CIBarRow => v != null)}
                summary={rmseRow(r.metrics[set], 'arm_mean') ?? undefined}
                n={r.metrics[set].n_episodes}
                prov={`lab/reports/${s.id}/report.json#/metrics/${set}`}
                title={`per-joint rmse\u00a0· ${SET_LABEL[set]}\u00a0· 95%\u00a0CI`}
              />
              {(() => {
                const li = r.metrics.interleaved
                const real = intervalOfStat(li.real.lag_frames.arm_mean)
                const stock = intervalOfStat(li.stock.lag_frames.arm_mean)
                const cal = intervalOfStat(li.calibrated.lag_frames.arm_mean)
                return real && stock && cal ? (
                  <LagReadout
                    fps={s.fps}
                    real={real}
                    stock={stock}
                    cal={cal}
                    n={li.n_episodes}
                    prov={`lab/reports/${s.id}/report.json#/metrics/interleaved`}
                    title={'command to state lag\u00a0· mean of joints\u00a0· interleaved'}
                    caption={
                      <>
                        Frames, with ms at {s.fps} fps; mean over the 5 joints, interleaved held-out set. LeRobot reads the state before it sends the command, so an
                        instantaneous actuator measures about 1 frame. The calibrated twin should sit on the real robot, not on 1.
                      </>
                    }
                  />
                ) : (
                  <p className="t-caption">Lag could not be measured on this dataset.</p>
                )
              })()}
            </div>
            <JointTable id={s.id} m={r.metrics[set]} set={set} />
            <div className="g10 items-start">
              <div className="c-5">
                <LagTable s={s} />
              </div>
              <div className="c-5 ds-stack">
                <p className="t-legend">lag, read plainly</p>
                <LagNote s={s} />
                <p className="t-caption">
                  Lag is the delay between a command and the first state that reflects it, per joint, on the interleaved held-out set. It includes LeRobot&rsquo;s
                  observe-then-act step, so an instantaneous actuator measures about one frame.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <Pending what="Per-joint results" state={rep} file="report.json" />
        )}
      </Section>

      <Section id="parameters" numeral="03" eyebrow="fitted parameters" title="What the calibration changed.">
        {r ? <ParamsTable id={s.id} rep={r} /> : <Pending what="Fitted parameters" state={rep} file="report.json" />}
      </Section>

      <Section id="limitations" numeral="04" eyebrow="limitations" title="What this report cannot see." description="From report.json, unedited.">
        {r ? <Limitations id={s.id} items={r.limitations} /> : <Pending what="Limitations" state={rep} file="report.json" />}
      </Section>

      <Section id="twin" numeral="05" eyebrow="use the calibrated twin" title="One robot, not the model.">
        <div className="g10">
          <div className="c-4 ds-stack">
            <p className="t-prose">
              calibrated_twin.json holds parameter overrides for the Menagerie MJCF, the joint mapping and the command delay. It models the one arm that recorded
              this dataset, not the {s.robot} in general.
            </p>
            <p className="t-caption">
              The lab tool writes a calibrated MJCF from it (<code>python -m meatspace_lab export-twin</code>, in{' '}
              <a className="lnk" href={LAB_URL} rel="noopener">
                lab/
              </a>
              ). All packages:{' '}
              <a className="lnk" href="/cells#twins" onClick={go}>
                /cells#twins
              </a>
              .
            </p>
          </div>
          <div className="c-6">
            <CodeBlock
              title={
                <>
                  shell · <b>GET /v1/reports/:id/twin</b>
                </>
              }
              status={capability('MS-TWIN-PKG').status}
              what="twin package command"
              code={[
                `curl -s ${ORIGIN}${api.twin} \\`,
                '    -o calibrated_twin.json',
                `python -m meatspace_lab export-twin --twin .cache/menagerie/${s.twin} \\`,
                `    --package calibrated_twin.json --out ${s.twin}_calibrated.xml`,
              ].join('\n')}
            />
          </div>
        </div>
      </Section>

      <Section id="files" numeral="06" eyebrow="files" title="Everything behind this page.">
        <div className="ds-stack">
          <Files s={s} />
          <CurlCommands s={s} />
        </div>
      </Section>

      <Section id="provenance" numeral="07" eyebrow="provenance" title="What was run, exactly.">
        <ProvenanceBlock s={s} rep={r} />
      </Section>

      <Section id="cite" numeral="08" eyebrow="credit and cite" title="Whose data this is.">
        <Credit s={s} onOpenDialog={onOpenDialog} />
      </Section>
    </>
  )
}

/* ------------------------------------------------------------------------------------------------
 * refused, not run, unknown
 * ---------------------------------------------------------------------------------------------- */

function RefusedReport({ s, onNavigate, onOpenDialog }: { s: RejectedReportSummary; onNavigate: (to: string) => void; onOpenDialog: (k: RequestDialogKind) => void }) {
  const go = linkHandler(onNavigate)
  return (
    <>
      <CertificateHeader
        bare
        eyebrow={
          <>
            <a className="lnk" href="/reports" onClick={go}>
              reports
            </a>{' '}
            / <Ids>{s.dataset}</Ids>
          </>
        }
        title={
          <>
            <Ids>{s.dataset}</Ids> x <span className="nw">{s.twin}</span>
          </>
        }
        meta={`owner ${s.owner} · robot_type ${s.robot_type} · not reported`}
        fields={[
          { k: 'document', v: 'Twin Gap Report' },
          { k: 'status', v: <Lamp status="REFUSED" size="sm" /> },
          { k: 'schema', v: REPORT_SCHEMA.replace('meatspace.', ''), span: 2 },
          { k: 'published', v: <Num value={s.published} prov={`${indexPtr(s)}/published`} />, span: 2 },
          {
            k: 'dataset',
            v: (
              <a className="lnk" href={s.dataset_url} rel="noopener">
                <Ids>{`${s.dataset} @ ${sha7(s.revision_sha)}`}</Ids>
              </a>
            ),
            span: 3,
          },
          { k: 'twin', v: <Ids>{`${s.twin} · MuJoCo Menagerie @ ${sha7(s.menagerie_sha)}`}</Ids>, span: 3 },
        ]}
      />
      <div className="mt-[var(--s-5)] ds-stack">
        <Callout register="must" keyword="Not reported" source="report.json · reason">
          <b>{s.reason_short}</b> {s.reason}
        </Callout>
        <p className="t-prose max-w-[70ch]">
          No sim numbers are published for this dataset. We publish the refusal so the method&rsquo;s limits are visible: a guess at units or joint conventions
          would make the numbers look precise and mean nothing.
        </p>
        <p className="t-caption">
          If you recorded this dataset and can share its calibration file, we can try again:{' '}
          <button type="button" className="lnk" onClick={() => onOpenDialog('report')}>
            request a report
          </button>
          .
        </p>
      </div>
      <Section id="files" eyebrow="files" title="What was published.">
        <div className="ds-stack">
          <Files s={s} />
          <CurlCommands s={s} />
        </div>
      </Section>
      <Section id="provenance" eyebrow="provenance" title="What was run, exactly.">
        <ProvenanceBlock s={s} rep={null} />
      </Section>
      <Section id="cite" eyebrow="credit" title="Whose data this is.">
        <Credit s={s} onOpenDialog={onOpenDialog} />
      </Section>
    </>
  )
}

function NoReport({ id, onNavigate, onOpenDialog }: { id: string; onNavigate: (to: string) => void; onOpenDialog: (k: RequestDialogKind) => void }) {
  const go = linkHandler(onNavigate)
  const hid = useId()
  const dataset = id.includes('__') ? id.replace('__', '/') : id
  const nr = REPORT_INDEX.not_run.find((c) => c.dataset === dataset)
  useNoindex()
  return (
    <section aria-labelledby={hid}>
      <p className="t-legend">
        <a className="lnk" href="/reports" onClick={go}>
          reports
        </a>{' '}
        / <span className="normal-case">{id}</span>
      </p>
      <h1 id={hid} className="cert-h1 mt-[var(--s-3)]">
        <Ids>{`No report for ${dataset}.`}</Ids>
      </h1>
      <Ruler className="mt-[var(--s-5)]" />
      <div className="mt-[var(--s-5)] max-w-[72ch] ds-stack">
        {nr ? (
          <Callout register="note" keyword="Not run" source="lab/reports/candidates.json · scan verdict">
            This dataset was in the candidate pool, but its compatibility scan failed, so no report was run: {nr.verdict}
          </Callout>
        ) : (
          <p className="t-lede">We have not run this dataset.</p>
        )}
        <div className="ds-row">
          <Key variant="primary" aria-haspopup="dialog" onClick={() => onOpenDialog('report')}>
            Request a report
          </Key>
          <Key variant="secondary" href="/reports" onClick={go}>
            Read the reports
          </Key>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------------------------------------ */

export function ReportPage({ id, onNavigate, onOpenDialog }: ReportPageProps) {
  const s = getReportSummary(id)
  // An id typed in another case (/reports/ilyagusev__so101_pick_gum) resolves to the one report it names.
  const fold = s ? null : [...REPORT_INDEX.reports, ...REPORT_INDEX.rejected].find((r) => r.id.toLowerCase() === id.toLowerCase())
  useEffect(() => {
    if (!fold) return
    // Deferred: on a direct load this effect runs before the router (in a parent) has subscribed to popstate.
    const t = window.setTimeout(() => {
      window.history.replaceState(window.history.state, '', `/reports/${fold.id}${window.location.search}${window.location.hash}`)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }, 0)
    return () => window.clearTimeout(t)
  }, [fold])

  return (
    <main id="main" className="flex-1">
      <div className="page-wrap pt-[var(--s-6)] pb-[var(--s-9)]">
        {s?.status === 'ok' ? (
          <OkReport s={s} onNavigate={onNavigate} onOpenDialog={onOpenDialog} />
        ) : s ? (
          <RefusedReport s={s} onNavigate={onNavigate} onOpenDialog={onOpenDialog} />
        ) : fold ? null : (
          <NoReport id={id} onNavigate={onNavigate} onOpenDialog={onOpenDialog} />
        )}
        {s ? (
          <section aria-label="Request a report" className="mt-[var(--s-9)] border-t border-line pt-[var(--s-6)]">
            <div className="flex flex-wrap items-center justify-between gap-[var(--s-4)]">
              <p className="t-prose max-w-[60ch]">Run this on your data: send a LeRobot <span className="nw">SO-100</span> or <span className="nw">SO-101</span> dataset. A person runs the same pipeline by hand.</p>
              <Key variant="primary" aria-haspopup="dialog" onClick={() => onOpenDialog('report')}>
                Request a report
              </Key>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  )
}

