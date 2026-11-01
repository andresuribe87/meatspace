/**
 * /power: "How many real trials?" Wilson interval at n, trials to detect a gap at a given power, and a
 * two-rate comparison (Newcombe). All maths is in src/lib/power.ts (unit-tested); every figure on the page is
 * computed in the browser from the inputs and carries that provenance. Nothing is sent anywhere.
 */
import { useId, useState, type ReactNode } from 'react'

import { CodeBlock, Field, FieldGrid, Input, IntervalMeter, Key, Lamp, ModeSwitch, Num, Panel, Reading, Ruler, SectionHeader, Table } from '../ds'
import { alternative, newcombeDiff, nOneSample, nTwoSample, trialTier, wilsonInterval } from '../lib/power'

export interface PowerPageProps {
  onNavigate: (to: string) => void
}

const SRC = 'src/lib/power.ts'
const MEMO_RULES = 'docs/strategy/2026-11-01-pmf-memo.md#5-the-offer-v02'

const CONFIDENCE = [
  { value: '0.9', label: '90%' },
  { value: '0.95', label: '95%' },
  { value: '0.99', label: '99%' },
]
const POWER = [
  { value: '0.8', label: '80%' },
  { value: '0.9', label: '90%' },
]

/** Parse a percentage field ("50", "50%", "62.5"): a fraction in (0, 1), or an error string. */
function parsePct(s: string, { allowEdges = false } = {}): number | string {
  const v = Number(s.trim().replace(/%$/, ''))
  if (!s.trim() || !Number.isFinite(v)) return 'Expected a percentage, like 50.'
  if (allowEdges ? v < 0 || v > 100 : v <= 0 || v >= 100) return allowEdges ? 'Between 0 and 100.' : 'Between 0 and 100, not either end.'
  return v / 100
}

function parseCount(s: string, { min = 1, max = 100_000 } = {}): number | string {
  const v = Number(s.trim())
  if (!s.trim() || !Number.isInteger(v)) return 'Expected a whole number.'
  if (v < min || v > max) return `Between ${min} and ${max.toLocaleString('en-US')}.`
  return v
}

const pct = (v: number) => v * 100

/** Axis labels under a full-width IntervalMeter: ends and centre, set 4px below the track so nothing draws over them. */
function Scale({ ticks }: { ticks: [string, string, string] | string[] }) {
  return (
    <div className="t-legend tabular mt-[4px] flex justify-between" aria-hidden="true">
      {ticks.map((t) => (
        <span key={t}>{t}</span>
      ))}
    </div>
  )
}

function TierLamp({ n }: { n: number }) {
  const t = trialTier(n)
  if (t === 'not-verification') return <Lamp status="FAULT">not a verification</Lamp>
  if (t === 'smoke-test') return <Lamp status="GAP">smoke test</Lamp>
  return <Lamp kind="live">gap-claim size</Lamp>
}

function TierRule() {
  return (
    <p className="t-caption">
      Site rule: below <Num className="font-mono" value={50} digits={0} prov={MEMO_RULES} /> trials nothing is called verified; <Num className="font-mono" value={200} digits={0} prov={MEMO_RULES} />{' '}
      is the default for a gap claim.
    </p>
  )
}

/** Page section on the 10-division grid: inputs left, readings right. */
function Section({ id, numeral, eyebrow, title, description, children }: { id: string; numeral: string; eyebrow: string; title: ReactNode; description?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-[var(--s-9)] max-md:mt-[var(--s-8)]">
      <SectionHeader numeral={numeral} eyebrow={eyebrow} title={title} description={description} id={id} />
      {children}
    </section>
  )
}

/* ------------------------------------------------------------------------------------------------ */

function IntervalAtN({ confidence }: { confidence: number }) {
  const [pS, setP] = useState('50')
  const [nS, setN] = useState('50')
  const p = parsePct(pS, { allowEdges: true })
  const n = parseCount(nS)
  const ok = typeof p === 'number' && typeof n === 'number'
  const r = ok ? wilsonInterval(p, n, confidence) : null
  const conf = `${pct(confidence).toFixed(0)}%`
  const prov = ok ? `${SRC}#wilsonInterval(p = ${p}, n = ${n}, confidence = ${confidence})` : ''
  return (
    <div className="g10">
      <div className="c-4">
        <FieldGrid>
          <Field label="success rate" suffix="%" error={typeof p === 'string' ? p : undefined} help="Observed, or the rate you expect.">
            <Input inputMode="decimal" value={pS} onChange={(e) => setP(e.target.value)} />
          </Field>
          <Field label="trials" suffix="trials" error={typeof n === 'string' ? n : undefined}>
            <Input inputMode="numeric" value={nS} onChange={(e) => setN(e.target.value)} />
          </Field>
        </FieldGrid>
      </div>
      <div className="c-6">
        <Panel title={<>success rate · <b>Wilson {conf}</b></>} heading="h3" actions={r && typeof n === 'number' ? <TierLamp n={n} /> : null}>
          {r && typeof n === 'number' ? (
            <div className="ds-stack">
              <Reading label="success rate" channel="real" value={pct(r.p)} digits={1} unit="%" ci={[pct(r.lo), pct(r.hi)]} ciLabel={conf} n={n} nLabel="trials" prov={prov} size="m" />
              <div>
                <IntervalMeter
                  value={r.p}
                  lo={r.lo}
                  hi={r.hi}
                  label={`${pct(r.p).toFixed(1)}% [${pct(r.lo).toFixed(1)}, ${pct(r.hi).toFixed(1)}], n = ${n}`}
                  className="block! w-full"
                />
                <Scale ticks={['0%', '50%', '100%']} />
              </div>
              <p className="t-caption">
                The interval is <Num className="font-mono" value={pct(r.hi - r.lo)} digits={1} unit=" points" prov={prov} /> wide. Any rate inside it is consistent with what you
                measured.
              </p>
              <TierRule />
            </div>
          ) : (
            <p className="t-caption">Fix the inputs to compute the interval.</p>
          )}
        </Panel>
      </div>
    </div>
  )
}

function TrialsForGap({ confidence, power }: { confidence: number; power: number }) {
  const [pS, setP] = useState('50')
  const [dS, setD] = useState('10')
  const p0 = parsePct(pS)
  const dRaw = parsePct(dS)
  const delta = typeof dRaw === 'number' && typeof p0 === 'number' && dRaw > Math.max(p0, 1 - p0) ? 'Larger than the room on either side of the rate.' : dRaw
  const ok = typeof p0 === 'number' && typeof delta === 'number'
  const p1 = ok ? alternative(p0, delta) : 0
  const one = ok ? nOneSample(p0, p1, confidence, power) : 0
  const two = ok ? nTwoSample(p0, p1, confidence, power) : 0
  const args = ok ? `p0 = ${p0}, p1 = ${Number(p1.toFixed(6))}, confidence = ${confidence}, power = ${power}` : ''
  const at = ok ? wilsonInterval(p0, one, confidence) : null
  const conf = `${pct(confidence).toFixed(0)}%`
  return (
    <div className="g10">
      <div className="c-4">
        <FieldGrid>
          <Field label="expected success" suffix="%" error={typeof p0 === 'string' ? p0 : undefined}>
            <Input inputMode="decimal" value={pS} onChange={(e) => setP(e.target.value)} />
          </Field>
          <Field label="smallest gap you care about" suffix="points" error={typeof delta === 'string' ? delta : undefined}>
            <Input inputMode="decimal" value={dS} onChange={(e) => setD(e.target.value)} />
          </Field>
        </FieldGrid>
      </div>
      <div className="c-6">
        <Panel title={<>trials needed · <b>{conf} two-sided, {pct(power).toFixed(0)}% power</b></>} heading="h3">
          {ok && at ? (
            <div className="ds-stack">
              <div className="ro-row">
                <Reading
                  label="against a known rate"
                  value={one}
                  digits={0}
                  ci={null}
                  n={null}
                  extra={<span className="nw">trials, one policy</span>}
                  prov={`${SRC}#nOneSample(${args})`}
                  size="m"
                />
                <Reading
                  label="two policies, each"
                  value={two}
                  digits={0}
                  ci={null}
                  n={null}
                  extra={<span className="nw">trials per policy</span>}
                  prov={`${SRC}#nTwoSample(${args})`}
                  size="m"
                />
              </div>
              <p className="t-caption">
                Detects <Num className="font-mono" value={pct(p1)} digits={1} unit="%" prov={`${SRC}#alternative(${p0}, ${delta})`} /> against{' '}
                <Num className="font-mono" value={pct(p0)} digits={1} unit="%" prov={`${SRC}#parsePct`} />. At <Num className="font-mono" value={one} digits={0} prov={`${SRC}#nOneSample(${args})`} /> trials, the{' '}
                {conf} interval around <Num className="font-mono" value={pct(p0)} digits={1} unit="%" prov={`${SRC}#parsePct`} /> is{' '}
                <span className="nw">
                  [<Num className="font-mono" value={pct(at.lo)} digits={1} prov={`${SRC}#wilsonInterval(p = ${p0}, n = ${one})`} />,{' '}
                  <Num className="font-mono" value={pct(at.hi)} digits={1} prov={`${SRC}#wilsonInterval(p = ${p0}, n = ${one})`} />]
                </span>
                . The intervals are the ones the result would carry; the sample sizes are no interval, so there is no n next to them.
              </p>
            </div>
          ) : (
            <p className="t-caption">Fix the inputs to compute the sample sizes.</p>
          )}
        </Panel>
      </div>
    </div>
  )
}

function CompareRates({ confidence }: { confidence: number }) {
  const [aK, setAK] = useState('36')
  const [aN, setAN] = useState('50')
  const [bK, setBK] = useState('29')
  const [bN, setBN] = useState('50')
  const n1 = parseCount(aN)
  const n2 = parseCount(bN)
  const k1 = parseCount(aK, { min: 0, max: typeof n1 === 'number' ? n1 : 100_000 })
  const k2 = parseCount(bK, { min: 0, max: typeof n2 === 'number' ? n2 : 100_000 })
  const ok = [n1, n2, k1, k2].every((v) => typeof v === 'number')
  const r = ok ? newcombeDiff(k1 as number, n1 as number, k2 as number, n2 as number, confidence) : null
  const conf = `${pct(confidence).toFixed(0)}%`
  const prov = ok ? `${SRC}#newcombeDiff(${k1}, ${n1}, ${k2}, ${n2}, confidence = ${confidence})` : ''
  const nTotal = ok ? (n1 as number) + (n2 as number) : 0
  return (
    <div className="g10">
      <div className="c-4">
        <FieldGrid>
          <Field label="A: successes" error={typeof k1 === 'string' ? k1 : undefined} help="Example: the twin, or policy A.">
            <Input inputMode="numeric" value={aK} onChange={(e) => setAK(e.target.value)} />
          </Field>
          <Field label="A: trials" error={typeof n1 === 'string' ? n1 : undefined}>
            <Input inputMode="numeric" value={aN} onChange={(e) => setAN(e.target.value)} />
          </Field>
          <Field label="B: successes" error={typeof k2 === 'string' ? k2 : undefined} help="Example: the real robot, or policy B.">
            <Input inputMode="numeric" value={bK} onChange={(e) => setBK(e.target.value)} />
          </Field>
          <Field label="B: trials" error={typeof n2 === 'string' ? n2 : undefined}>
            <Input inputMode="numeric" value={bN} onChange={(e) => setBN(e.target.value)} />
          </Field>
        </FieldGrid>
        <p className="t-caption mt-[var(--s-3)]">The defaults are example inputs, not results. Replace them with yours.</p>
      </div>
      <div className="c-6">
        <Panel
          title={<>A − B · <b>Newcombe {conf}</b></>}
          heading="h3"
          actions={r ? r.decisive ? <Lamp status="GAP">interval excludes 0</Lamp> : <Lamp kind="planned">inconclusive · spans 0</Lamp> : null}
        >
          {r ? (
            <div className="ds-stack">
              <Reading
                label="difference A − B"
                value={pct(r.d)}
                digits={1}
                signed
                unit="pts"
                ci={[pct(r.lo), pct(r.hi)]}
                ciLabel={conf}
                n={nTotal}
                nLabel="trials in all"
                prov={prov}
                size="m"
              />
              <div>
                <IntervalMeter
                  value={r.d}
                  lo={r.lo}
                  hi={r.hi}
                  min={-1}
                  max={1}
                  label={`A minus B ${pct(r.d).toFixed(1)} points [${pct(r.lo).toFixed(1)}, ${pct(r.hi).toFixed(1)}]`}
                  className="block! w-full"
                />
                <Scale ticks={['−100', '0', '+100']} />
              </div>
              <p className="t-caption">
                {r.decisive
                  ? 'The interval excludes zero: at this confidence the two rates differ. The size of the difference is anywhere inside the interval.'
                  : 'The interval includes zero: these trials cannot tell the two rates apart. That is not evidence that they are equal.'}
              </p>
            </div>
          ) : (
            <p className="t-caption">Fix the inputs to compare the rates.</p>
          )}
        </Panel>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------------------------------ */

const FORMULAS = `# Wilson score interval for a rate p over n trials, z = z(1 - alpha/2)
center = (p + z^2/(2n)) / (1 + z^2/n)
half   = z / (1 + z^2/n) * sqrt( p(1-p)/n + z^2/(4n^2) )

# trials to detect p1 against a known rate p0 (one-sample test, normal approximation)
n = ( z(1-alpha/2) * sqrt(p0(1-p0)) + z(power) * sqrt(p1(1-p1)) )^2 / (p1 - p0)^2

# trials per arm to tell p1 from p2 (two-sample test, pooled variance under H0), pbar = (p1 + p2)/2
n = ( z(1-alpha/2) * sqrt(2 pbar(1-pbar)) + z(power) * sqrt(p1(1-p1) + p2(1-p2)) )^2 / (p1 - p2)^2

# difference d = p1 - p2 with Wilson bounds [l1, u1], [l2, u2] (Newcombe 1998, method 10)
lo = d - sqrt( (p1 - l1)^2 + (u2 - p2)^2 )
hi = d + sqrt( (u1 - p1)^2 + (p2 - l2)^2 )`

interface TableRow {
  n: number
  lo: number
  hi: number
  use: ReactNode
  how: string
}

function WhyTable() {
  const one = nOneSample(0.5, 0.6)
  const two = nTwoSample(0.5, 0.6)
  const rows: TableRow[] = [
    { n: 10, use: 'nothing', how: 'example' },
    { n: 50, use: 'a smoke test', how: 'site rule' },
    { n: one, use: 'detects a 10-point gap against a known rate', how: 'nOneSample(0.5, 0.6)' },
    { n: two, use: 'per policy: separates two real policies 10 points apart', how: 'nTwoSample(0.5, 0.6)' },
  ].map((r) => {
    const w = wilsonInterval(0.5, r.n)
    return { ...r, lo: w.lo, hi: w.hi }
  })
  return (
    <div className="ds-stack">
    <Table
      label="Trials and what they can show"
      stack
      rowKey={(r) => String(r.n)}
      rows={rows}
      columns={[
        {
          key: 'n',
          header: 'trials',
          align: 'right',
          cell: (r) => <Num className="font-mono" value={r.n} digits={0} prov={`${SRC}#${r.how === 'example' || r.how === 'site rule' ? 'input' : r.how}`} />,
        },
        {
          key: 'ci',
          header: '95% interval at 50%',
          align: 'right',
          cell: (r) => (
            <span className="nw">
              <Num className="font-mono" value={pct(r.lo)} digits={0} prov={`${SRC}#wilsonInterval(p = 0.5, n = ${r.n})`} />% to{' '}
              <Num className="font-mono" value={pct(r.hi)} digits={0} prov={`${SRC}#wilsonInterval(p = 0.5, n = ${r.n})`} />%
            </span>
          ),
        },
        { key: 'use', header: 'good for', wrap: true, cell: (r) => r.use },
      ]}
    />
      <p className="t-caption">
        Wilson 95% intervals at 50% success. Sample sizes: two-sided 95%, 80% power, 50% against 60% success. Computed on this page by
        src/lib/power.ts.
      </p>
    </div>
  )
}

/**
 * /power: "How many real trials?" calculator. Pure client-side maths with the formulas printed under it.
 */
export function PowerPage({ onNavigate }: PowerPageProps) {
  const [conf, setConf] = useState('0.95')
  const [pow, setPow] = useState('0.8')
  const confidence = Number(conf)
  const power = Number(pow)
  const hid = useId()
  const ten = newcombeDiff(7, 10, 3, 10)
  return (
    <main id="main" className="page-wrap pt-[var(--s-7)] pb-[var(--s-9)]">
      <header aria-labelledby={hid}>
        <p className="t-legend">calculator · runs in your browser, nothing is sent</p>
        <h1 id={hid} className="t-h1 mt-[var(--s-3)]">
          How many real trials?
        </h1>
        <p className="t-lede mt-[var(--s-4)] max-w-[60ch]">
          Ten trials each can't tell <Num className="font-mono" value={30} digits={0} unit="%" prov={`${SRC}#newcombeDiff(7, 10, 3, 10)`} /> from{' '}
          <Num className="font-mono" value={70} digits={0} unit="%" prov={`${SRC}#newcombeDiff(7, 10, 3, 10)`} />: the{' '}
          95% interval of the difference is{' '}
          <span className="nw">
            [<Num className="font-mono" value={pct(ten.lo)} digits={0} prov={`${SRC}#newcombeDiff(7, 10, 3, 10)`} />,{' '}
            <Num className="font-mono" value={pct(ten.hi)} digits={0} prov={`${SRC}#newcombeDiff(7, 10, 3, 10)`} />] points
          </span>
          . Here is how many it takes to say something.
        </p>
        <div className="ds-row mt-[var(--s-5)]">
          <span className="t-legend">confidence</span>
          <ModeSwitch label="Confidence, two-sided" options={CONFIDENCE} value={conf} onChange={setConf} />
          <span className="t-legend ml-[var(--s-4)]">power</span>
          <ModeSwitch label="Power" options={POWER} value={pow} onChange={setPow} />
        </div>
        <Ruler className="mt-[var(--s-6)]" />
      </header>

      <Section id="power-interval" numeral="01" eyebrow="interval at n" title="What a success rate at n trials can tell you." description="Wilson score interval. Better than the plain ± formula when n is small or the rate is near 0% or 100%.">
        <IntervalAtN confidence={confidence} />
      </Section>

      <Section id="power-n" numeral="02" eyebrow="trials needed" title="How many trials to detect a gap." description="For one policy against a rate you already know, and for two policies measured side by side.">
        <TrialsForGap confidence={confidence} power={power} />
      </Section>

      <Section id="power-compare" numeral="03" eyebrow="compare two rates" title="Is the sim-vs-real gap real?" description="Two measured rates, for example the twin and the real robot on the same task, or two checkpoints.">
        <CompareRates confidence={confidence} />
      </Section>

      <Section id="power-why" numeral="04" eyebrow="why 200 trials" title="Ten trials prove nothing. Fifty are a smoke test.">
        <WhyTable />
      </Section>

      <Section id="power-method" numeral="05" eyebrow="method" title="The formulas, as computed.">
        <div className="g10">
          <div className="c-6">
            <CodeBlock title={<>method · <b>src/lib/power.ts</b></>} code={FORMULAS} prompt="" what="formulas" />
          </div>
          <div className="c-4 ds-stack">
            <p className="t-prose">
              Normal quantiles come from Wichura's AS 241 algorithm. Sample sizes round up. The two-rate comparison treats the arms as independent: paired
              designs (the same initial states in sim and real) need a paired test, which is narrower.
            </p>
            <p className="t-caption">
              The functions are unit-tested against independent computations, including the worked example in Newcombe's paper.
            </p>
          </div>
        </div>
      </Section>

      <section aria-label="Request a pilot" className="mt-[var(--s-9)] border-t border-line pt-[var(--s-6)]">
        <div className="ds-row justify-between gap-[var(--s-4)]">
          <p className="t-prose max-w-[60ch]">
            Know your n? There is no real cell yet: pilot requests decide when the first one is built and what it runs.
          </p>
          <span className="ds-row">
            <Key variant="primary" href="#request-pilot">
              Request a pilot
            </Key>
            <Key
              variant="ghost"
              href="/cells"
              onClick={(e) => {
                if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
                e.preventDefault()
                onNavigate('/cells')
              }}
            >
              Cells
            </Key>
          </span>
        </div>
      </section>
    </main>
  )
}
