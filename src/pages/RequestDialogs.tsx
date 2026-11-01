/**
 * The three request dialogs, reachable from any page (the page owns the hash deep links
 * #request-report, #request-pilot, #own-robot and passes `kind`):
 *   report    -> POST /v1/requests { kind: 'gap_report' }  Twin Gap Report on your dataset. Intake is live; a person runs it.
 *   pilot     -> POST /v1/requests { kind: 'pilot' }       Real-robot pilot. The real cell is a waitlist: nothing is built or charged.
 *   own-robot -> POST /v1/requests { kind: 'own_robot' }   Evaluation on robots you own. Software not built; we are asking.
 * Copy promises only what one person can keep.
 */
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'

import { capability } from '../../shared/status'
import { CodeBlock, Dialog, Field, FieldGrid, Input, Key, Lamp, Num, Panel, Select, Textarea, TitleBlock } from '../ds'
import { DATASET_ID_RE, EMAIL_RE, requestCurl, submitRequest, type RequestBody, type RequestResult } from '../lib/requestsClient'

export type RequestDialogKind = 'report' | 'pilot' | 'own-robot'

export interface RequestDialogsProps {
  kind: RequestDialogKind | null
  /** Called with the kind of the dialog that closed (idempotent; may fire twice for one close). */
  onClose: (kind: RequestDialogKind) => void
}

const PLAN = 'docs/ops/so101-cell-plan.md#status'
const MEMO_RULES = 'docs/strategy/2026-11-01-pmf-memo.md#5-the-offer-v02'
const NOTES_MAX = 500

type Opt = readonly [value: string, label: string]

const CHOOSE: Opt = ['', 'choose one']

const REPORT_ROBOTS: readonly Opt[] = [
  CHOOSE,
  ['so100', 'SO-100'],
  ['so101', 'SO-101'],
  ['other', 'other LeRobot arm (we will tell you if we have a twin)'],
  ['unsure', 'not sure'],
]
const PILOT_ROBOTS: readonly Opt[] = [
  CHOOSE,
  ['so101', 'SO-101'],
  ['so100', 'SO-100'],
  ['koch', 'Koch'],
  ['franka', 'Franka (DROID setup)'],
  ['bimanual', 'bimanual (ALOHA, YAM)'],
  ['other', 'other (say which in the notes)'],
]
const SIMULATORS: readonly Opt[] = [
  CHOOSE,
  ['mujoco', 'MuJoCo'],
  ['isaac', 'Isaac Sim / Isaac Lab'],
  ['genesis', 'Genesis'],
  ['maniskill', 'ManiSkill'],
  ['pybullet', 'PyBullet'],
  ['gazebo', 'Gazebo'],
  ['world_model', 'a world model'],
  ['none', 'none'],
]
const POLICY_FORMATS: readonly Opt[] = [
  CHOOSE,
  ['lerobot', 'LeRobot policy (ACT, Diffusion, SmolVLA, pi0)'],
  ['vla', 'other VLA (OpenVLA-style)'],
  ['rl', 'RL policy (ONNX, TorchScript)'],
  ['scripted', 'scripted or classical'],
  ['other', 'other'],
]
const CHECKPOINT: readonly Opt[] = [
  CHOOSE,
  ['yes', 'yes, today'],
  ['2_weeks', 'within 2 weeks'],
  ['1_month', 'within a month'],
  ['not_yet', 'not yet'],
]
const BUDGETS: readonly Opt[] = [
  CHOOSE,
  ['none', 'no budget yet'],
  ['lt_500', 'under $500'],
  ['500_1k', '$500 to $1k'],
  ['1k_5k', '$1k to $5k'],
  ['5k_10k', '$5k to $10k'],
  ['10k_25k', '$10k to $25k'],
  ['gt_25k', 'over $25k'],
]
const ROBOT_COUNTS: readonly Opt[] = [
  CHOOSE,
  ['1', '1'],
  ['2-5', '2 to 5'],
  ['6-20', '6 to 20'],
  ['21+', 'over 20'],
]

function Options({ opts }: { opts: readonly Opt[] }) {
  return (
    <>
      {opts.map(([v, l]) => (
        <option key={v || 'choose'} value={v} disabled={v === ''}>
          {l}
        </option>
      ))}
    </>
  )
}

/* ------------------------------------------------------------------------------------------------
 * Shared form state
 * ---------------------------------------------------------------------------------------------- */

type Phase =
  | { s: 'idle' }
  | { s: 'sending'; startedAt: number }
  | { s: 'done'; requestId: string | null; status: string | null; email: string }
  | { s: 'error'; result: Extract<RequestResult, { ok: false }> }

type Values = Record<string, string>
type Errors = Record<string, string>

function useRequestForm(initial: Values) {
  const [values, setValues] = useState<Values>(initial)
  const [errors, setErrors] = useState<Errors>({})
  const [phase, setPhase] = useState<Phase>({ s: 'idle' })
  const set = (k: string) => (e: { target: { value: string } }) => {
    const v = e.target.value
    setValues((o) => ({ ...o, [k]: v }))
    setErrors((o) => {
      if (!o[k]) return o
      const n = { ...o }
      delete n[k]
      return n
    })
  }
  const reset = () => {
    setValues(initial)
    setErrors({})
    setPhase({ s: 'idle' })
  }
  return { values, errors, setErrors, phase, setPhase, set, reset }
}

type Form = ReturnType<typeof useRequestForm>

/** Validate, POST, and fold the result into phase + field errors (server `$.field` paths land on their field). */
async function send(form: Form, body: RequestBody, check: (v: Values) => Errors) {
  if (form.phase.s === 'sending') return
  const errs = check(form.values)
  form.setErrors(errs)
  if (Object.keys(errs).length) {
    form.setPhase({ s: 'idle' })
    requestAnimationFrame(() => document.querySelector<HTMLElement>('dialog[open] [aria-invalid="true"]')?.focus())
    return
  }
  form.setPhase({ s: 'sending', startedAt: performance.now() })
  const r = await submitRequest(body)
  if (r.ok) {
    form.setPhase({ s: 'done', requestId: r.requestId, status: r.status, email: body.email.trim().toLowerCase() })
    return
  }
  const field = r.path?.replace(/^\$\./, '').split(/[.[]/)[0]
  if (r.code === 'ERR_SCHEMA' && field && field in form.values) {
    form.setErrors({ [field]: r.message.replace(/^\$\.[\w.[\]]+:\s*/, '') })
  }
  form.setPhase({ s: 'error', result: r })
  requestAnimationFrame(() => document.querySelector<HTMLElement>('dialog[open] [role="alert"]')?.scrollIntoView({ block: 'nearest' }))
}

const required = (v: Values, keys: string[], e: Errors) => {
  for (const k of keys) if (!v[k]?.trim()) e[k] = 'Required.'
}
const checkEmail = (v: Values, e: Errors) => {
  if (!e.email && !EMAIL_RE.test(v.email.trim())) e.email = 'Expected an email address, like you@lab.edu.'
}
const checkNotes = (v: Values, e: Errors) => {
  if ((v.notes ?? '').length > NOTES_MAX) e.notes = `At most ${NOTES_MAX} characters.`
}

/* ------------------------------------------------------------------------------------------------
 * Shared pieces
 * ---------------------------------------------------------------------------------------------- */

function StatusRow({ children }: { children: ReactNode }) {
  return (
    <p className="t-ui">
      <span className="t-legend">status</span> {children}
    </p>
  )
}

/** Honeypot. Hidden from people and assistive tech (inert); scripted form fillers tend to fill it. */
function Honeypot({ value, onChange }: { value: string; onChange: (e: { target: { value: string } }) => void }) {
  return (
    <div className="sr" inert>
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" value={value} onChange={onChange} />
      </label>
    </div>
  )
}

function Notes({ form, label, placeholder }: { form: Form; label: ReactNode; placeholder: string }) {
  const n = (form.values.notes ?? '').length
  return (
    <Field label={label} full error={form.errors.notes} help={`optional · ${n} / ${NOTES_MAX}`}>
      <Textarea name="notes" maxLength={NOTES_MAX} value={form.values.notes} onChange={form.set('notes')} placeholder={placeholder} rows={3} />
    </Field>
  )
}

function EmailField({ form, placeholder = 'you@lab.edu' }: { form: Form; placeholder?: string }) {
  return (
    <Field label="email" required error={form.errors.email}>
      <Input type="email" name="email" autoComplete="email" inputMode="email" placeholder={placeholder} value={form.values.email} onChange={form.set('email')} />
    </Field>
  )
}

function Privacy() {
  return (
    <p className="t-caption">
      Andres reads every request and answers it himself. We store what you send so we can answer it. We don't share it. Ask in your reply and we delete it.
    </p>
  )
}

/**
 * Designed failure state. Every outcome resolves: network failure and the 10 s timeout, a 501 while intake is
 * not switched on, a non-JSON gateway page, a 429, a schema refusal. Each says whether anything was stored and
 * what to do next. No mailto, no spinner.
 */
function SendError({ phase }: { phase: Phase }) {
  if (phase.s !== 'error') return null
  const r = phase.result
  const field = r.code === 'ERR_SCHEMA'
  const lamp = field || r.code === 'ERR_RATE_LIMITED' ? 'gap' : 'fault'
  const word =
    r.code === 'ERR_UNREACHABLE'
      ? 'not sent · no answer'
      : r.code === 'ERR_NOT_BUILT'
        ? 'not stored · HTTP 501'
        : r.status
          ? `not stored · HTTP ${r.status}`
          : 'not sent'
  // The rate-limit message already says when to try again; a schema message loses its JSON path ("$.email: ").
  const message = field ? r.message.replace(/^\$\.[\w.[\]]+:\s*/, '') : r.message
  const next = r.code === 'ERR_RATE_LIMITED' ? '' : field ? 'Fix the marked field and send again.' : 'Your answers are still in the form. Try again later.'
  return (
    <div role="alert">
      <Panel
        as="div"
        heading="div"
        title="request not received"
        actions={
          <Lamp kind={lamp} size="sm">
            {word}
          </Lamp>
        }
      >
        <p className="t-caption">
          {message}
          {next ? ` ${next}` : ''}
        </p>
      </Panel>
    </div>
  )
}

/**
 * Polite live region, mounted for as long as the dialog is: a region inserted together with its text is often not
 * announced, so the receipt summary is written into this one.
 */
function Announce({ phase }: { phase: Phase }) {
  return (
    <p className="sr" role="status" aria-live="polite" aria-atomic="true">
      {phase.s === 'done' ? `Request received.${phase.requestId ? ` Request id ${phase.requestId}.` : ''} Status ${phase.status ?? 'received'}.` : ''}
    </p>
  )
}

function Receipt({ phase, word, lines }: { phase: Extract<Phase, { s: 'done' }>; word: ReactNode; lines: ReactNode }) {
  // The submit key unmounts with the form: put focus on the receipt, inside the modal, instead of letting it fall to <body>.
  const first = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    first.current?.focus()
  }, [])
  return (
    <div className="ds-stack">
      <p ref={first} tabIndex={-1} className="t-ui outline-none">
        <span className="t-legend">received</span> {word}
      </p>
      <TitleBlock
        label="Request receipt"
        fields={[
          { k: 'request id', v: phase.requestId ?? 'not returned', span: 3 },
          { k: 'status', v: phase.status ?? 'received', span: 3 },
          { k: 'reply to', v: phase.email, span: 6 },
        ]}
      />
      <p className="t-prose">{lines}</p>
    </div>
  )
}

/** The curl equivalent, collapsed: a person reads the form, a terminal user opens this. */
function Terminal({ body }: { body: RequestBody }) {
  return (
    <details>
      <summary className="t-legend cursor-pointer py-1">same thing, from a terminal</summary>
      <CodeBlock
        className="mt-2"
        title={
          <>
            shell · <b>POST /v1/requests</b>
          </>
        }
        code={requestCurl(body)}
        what="request command"
      />
    </details>
  )
}

function Actions({ form, formId, submit, onClose }: { form: Form; formId: string; submit: string; onClose: () => void }) {
  if (form.phase.s === 'done') {
    return (
      <Key variant="primary" onClick={onClose}>
        Close
      </Key>
    )
  }
  return (
    <>
      <Key variant="ghost" onClick={onClose}>
        Cancel
      </Key>
      <Key variant="primary" type="submit" form={formId} busy={form.phase.s === 'sending' ? { label: 'Sending', startedAt: form.phase.startedAt } : null}>
        {submit}
      </Key>
    </>
  )
}

/* ------------------------------------------------------------------------------------------------
 * #request-report
 * ---------------------------------------------------------------------------------------------- */

const REPORT_INIT: Values = { dataset: '', robot: '', email: '', notes: '', website: '' }

function reportBody(v: Values): RequestBody {
  return { kind: 'gap_report', dataset: v.dataset, robot: v.robot, email: v.email, notes: v.notes, website: v.website }
}

function checkReport(v: Values): Errors {
  const e: Errors = {}
  required(v, ['dataset', 'robot', 'email'], e)
  if (!e.dataset && !DATASET_ID_RE.test(v.dataset.trim())) e.dataset = 'Expected owner/name, like lerobot/svla_so101_pickplace.'
  checkEmail(v, e)
  checkNotes(v, e)
  return e
}

function ReportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const form = useRequestForm(REPORT_INIT)
  const formId = useId()
  const close = () => {
    onClose()
    if (form.phase.s === 'done') form.reset()
  }
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void send(form, reportBody(form.values), checkReport)
  }
  return (
    <Dialog
      open={open}
      onClose={close}
      title="request // twin gap report"
      endpoint="POST /v1/requests"
      actions={<Actions form={form} formId={formId} submit="Request report" onClose={close} />}
    >
      <Announce phase={form.phase} />
      {form.phase.s === 'done' ? (
        <Receipt
          phase={form.phase}
          word={<Lamp status="ON REQUEST" size="sm" />}
          lines={
            <>
              Queued for a person. Andres will email <b>{form.phase.email}</b> when he has run it, or sooner if the dataset can't be mapped to a twin. Nothing
              ran yet.
            </>
          }
        />
      ) : (
        <form id={formId} noValidate onSubmit={onSubmit} className="ds-stack">
          <p className="t-prose">
            Send a LeRobot dataset from the Hugging Face Hub. We run the same pipeline as the published reports and email you the result. During v0.2 a
            person runs it: Andres, by hand.
          </p>
          <StatusRow>
            <Lamp status="LIVE" size="sm" /> intake ·{' '}
            <Lamp status="ON REQUEST" size="sm" /> the run itself, by hand
          </StatusRow>
          <FieldGrid>
            <Field label="dataset" required error={form.errors.dataset} help="Hugging Face Hub dataset ID, LeRobot format.">
              <Input
                name="dataset"
                placeholder="owner/name"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                value={form.values.dataset}
                onChange={form.set('dataset')}
              />
            </Field>
            <Field label="robot" required error={form.errors.robot}>
              <Select name="robot" value={form.values.robot} onChange={form.set('robot')}>
                <Options opts={REPORT_ROBOTS} />
              </Select>
            </Field>
            <EmailField form={form} />
            <Notes form={form} label="what do you want to know?" placeholder="e.g. is my shoulder lag real; does the twin match before I train in it" />
          </FieldGrid>
          <p className="t-caption">
            Same scope as the published reports: open-loop replay in joint space, contacts off. It measures the actuator model, not task success. If the
            units or the joint mapping can't be checked from the data, the report says so and stops.
          </p>
          <Honeypot value={form.values.website} onChange={form.set('website')} />
          <SendError phase={form.phase} />
          <Privacy />
          <Terminal body={reportBody({ ...form.values, dataset: form.values.dataset || 'owner/name', robot: form.values.robot || 'so101', email: form.values.email || 'you@example.com' })} />
        </form>
      )}
    </Dialog>
  )
}

/* ------------------------------------------------------------------------------------------------
 * #request-pilot
 * ---------------------------------------------------------------------------------------------- */

const PILOT_INIT: Values = { robot: '', simulator: '', policy_format: '', checkpoint_ready: '', deadline: '', budget: '', email: '', notes: '', website: '' }

function pilotBody(v: Values): RequestBody {
  return {
    kind: 'pilot',
    robot: v.robot,
    simulator: v.simulator,
    policy_format: v.policy_format,
    checkpoint_ready: v.checkpoint_ready,
    deadline: v.deadline,
    budget: v.budget,
    email: v.email,
    notes: v.notes,
    website: v.website,
  }
}

function checkPilot(v: Values): Errors {
  const e: Errors = {}
  required(v, ['robot', 'simulator', 'policy_format', 'checkpoint_ready', 'budget', 'email'], e)
  if (v.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(v.deadline)) e.deadline = 'Expected a date, YYYY-MM-DD.'
  checkEmail(v, e)
  checkNotes(v, e)
  return e
}

function PilotDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const form = useRequestForm(PILOT_INIT)
  const formId = useId()
  const close = () => {
    onClose()
    if (form.phase.s === 'done') form.reset()
  }
  const real = capability('MS-RV-SO101')
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void send(form, pilotBody(form.values), checkPilot)
  }
  return (
    <Dialog
      open={open}
      onClose={close}
      title="request // real-robot pilot"
      endpoint="POST /v1/requests"
      actions={<Actions form={form} formId={formId} submit="Join pilot waitlist" onClose={close} />}
    >
      <Announce phase={form.phase} />
      {form.phase.s === 'done' ? (
        <Receipt
          phase={form.phase}
          word={<Lamp status="WAITLIST" size="sm" />}
          lines={
            <>
              On the list. No cell exists yet and nothing was charged. Andres will email <b>{form.phase.email}</b> to talk scope.
            </>
          }
        />
      ) : (
        <form id={formId} noValidate onSubmit={onSubmit} className="ds-stack">
          <p className="t-prose">
            There is no real cell yet. This is a waitlist with questions, and the answers decide which cell we build first and when. Nothing is charged
            here.
          </p>
          <StatusRow>
            <Lamp status={real.status} size="sm" /> real <span className="nw">SO-101</span> cell: not built, nothing purchased. The build starts once{' '}
            <Num value="$3k" prov={PLAN} /> in pilots is committed. Other robots <Lamp status="ON REQUEST" size="sm" />
          </StatusRow>
          <ul className="t-caption list-[square] pl-[18px]">
            <li>You host your policy behind a server. We don't run your code or weights on our machines.</li>
            <li>
              Under <Num className="font-mono" value={50} digits={0} prov={MEMO_RULES} /> trials a result is a smoke test, not a verification. The default for a gap claim is{' '}
              <Num className="font-mono" value={200} digits={0} prov={MEMO_RULES} />.
            </li>
            <li>You would get real and twin success with intervals, the gap, video and the raw logs.</li>
          </ul>
          <FieldGrid>
            <Field label="robot" required error={form.errors.robot}>
              <Select name="robot" value={form.values.robot} onChange={form.set('robot')}>
                <Options opts={PILOT_ROBOTS} />
              </Select>
            </Field>
            <Field label="simulator" required error={form.errors.simulator}>
              <Select name="simulator" value={form.values.simulator} onChange={form.set('simulator')}>
                <Options opts={SIMULATORS} />
              </Select>
            </Field>
            <Field label="policy format" required error={form.errors.policy_format}>
              <Select name="policy_format" value={form.values.policy_format} onChange={form.set('policy_format')}>
                <Options opts={POLICY_FORMATS} />
              </Select>
            </Field>
            <Field label="checkpoint ready?" required error={form.errors.checkpoint_ready}>
              <Select name="checkpoint_ready" value={form.values.checkpoint_ready} onChange={form.set('checkpoint_ready')}>
                <Options opts={CHECKPOINT} />
              </Select>
            </Field>
            <Field label="deadline" error={form.errors.deadline} help="optional · a submission, a rebuttal, a demo">
              <Input type="date" name="deadline" value={form.values.deadline} onChange={form.set('deadline')} />
            </Field>
            <Field label="budget range" required error={form.errors.budget}>
              <Select name="budget" value={form.values.budget} onChange={form.set('budget')}>
                <Options opts={BUDGETS} />
              </Select>
            </Field>
            <EmailField form={form} />
            <Notes form={form} label="notes" placeholder="e.g. sim success to check: 0.62 and 0.71 on two checkpoints; an agent will call the API" />
          </FieldGrid>
          <Honeypot value={form.values.website} onChange={form.set('website')} />
          <SendError phase={form.phase} />
          <Privacy />
          <Terminal
            body={pilotBody({
              ...form.values,
              robot: form.values.robot || 'so101',
              simulator: form.values.simulator || 'mujoco',
              policy_format: form.values.policy_format || 'lerobot',
              checkpoint_ready: form.values.checkpoint_ready || 'yes',
              budget: form.values.budget || '1k_5k',
              email: form.values.email || 'you@example.com',
            })}
          />
        </form>
      )}
    </Dialog>
  )
}

/* ------------------------------------------------------------------------------------------------
 * #own-robot
 * ---------------------------------------------------------------------------------------------- */

const OWN_INIT: Values = { robot: '', robot_count: '', eval_cost: '', email: '', notes: '', website: '' }

function ownBody(v: Values): RequestBody {
  return { kind: 'own_robot', robot: v.robot, robot_count: v.robot_count, eval_cost: v.eval_cost, email: v.email, notes: v.notes, website: v.website }
}

function checkOwn(v: Values): Errors {
  const e: Errors = {}
  required(v, ['robot', 'robot_count', 'eval_cost', 'email'], e)
  checkEmail(v, e)
  checkNotes(v, e)
  return e
}

function OwnRobotDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const form = useRequestForm(OWN_INIT)
  const formId = useId()
  const close = () => {
    onClose()
    if (form.phase.s === 'done') form.reset()
  }
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void send(form, ownBody(form.values), checkOwn)
  }
  return (
    <Dialog
      open={open}
      onClose={close}
      title="evaluate on your own robot"
      endpoint="POST /v1/requests"
      actions={<Actions form={form} formId={formId} submit="Send answers" onClose={close} />}
    >
      <Announce phase={form.phase} />
      {form.phase.s === 'done' ? (
        <Receipt
          phase={form.phase}
          word={<Lamp status="PLANNED" size="sm" />}
          lines={
            <>
              Noted. Andres will email <b>{form.phase.email}</b> to set up a call. The software does not exist yet: your answers decide whether it gets
              built.
            </>
          }
        />
      ) : (
        <form id={formId} noValidate onSubmit={onSubmit} className="ds-stack">
          <p className="t-prose">
            You own the robots and running evals eats your week. We are deciding whether to build software for that. It would run on your machine and handle
            the eval queue, resets, safety clamps, success labels and the report. It does not exist. We want to know what it would have to do before we write
            it.
          </p>
          <StatusRow>
            <Lamp status="PLANNED" size="sm" /> meatspaced, a local eval runner and safety supervisor. Not released.
          </StatusRow>
          <FieldGrid>
            <Field label="robot" required error={form.errors.robot}>
              <Input name="robot" placeholder="e.g. Franka FR3, SO-101" value={form.values.robot} onChange={form.set('robot')} />
            </Field>
            <Field label="how many robots" required error={form.errors.robot_count}>
              <Select name="robot_count" value={form.values.robot_count} onChange={form.set('robot_count')}>
                <Options opts={ROBOT_COUNTS} />
              </Select>
            </Field>
            <Field label="what one eval costs today" required full error={form.errors.eval_cost} help="People-hours, robot-hours or money, as you count it.">
              <Input name="eval_cost" placeholder="e.g. 2 people-days for 200 trials per checkpoint" value={form.values.eval_cost} onChange={form.set('eval_cost')} />
            </Field>
            <EmailField form={form} placeholder="you@company.com" />
            <Notes form={form} label="notes" placeholder="e.g. resets take most of the time; we use LeRobot and ROS 2" />
          </FieldGrid>
          <Honeypot value={form.values.website} onChange={form.set('website')} />
          <SendError phase={form.phase} />
          <Privacy />
          <Terminal
            body={ownBody({
              ...form.values,
              robot: form.values.robot || 'Franka FR3',
              robot_count: form.values.robot_count || '2-5',
              eval_cost: form.values.eval_cost || '2 people-days per checkpoint',
              email: form.values.email || 'you@example.com',
            })}
          />
        </form>
      )}
    </Dialog>
  )
}

/* ------------------------------------------------------------------------------------------------ */

/**
 * The three request dialogs. Mount once per page; `kind` opens one (the page maps #request-report,
 * #request-pilot and #own-robot to it), `onClose` fires on Esc, Cancel, Close or a backdrop click.
 */
export function RequestDialogs({ kind, onClose }: RequestDialogsProps) {
  return (
    <>
      <ReportDialog open={kind === 'report'} onClose={() => onClose('report')} />
      <PilotDialog open={kind === 'pilot'} onClose={() => onClose('pilot')} />
      <OwnRobotDialog open={kind === 'own-robot'} onClose={() => onClose('own-robot')} />
    </>
  )
}
