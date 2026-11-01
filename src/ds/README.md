# src/ds: design system v1.0 "Instrument" (rev B)

The component library for meatspace.sh v0.2. Everything is typed React 19, styled only through tokens
(`src/index.css` + `src/ds/instrument.css`), 0 radius, no shadows, and accessible by construction.

- Import from `src/ds` (barrel): `import { Key, Lamp, Num, Reading, ScopePlot } from '../ds'`.
- Status words come from `shared/status.ts` (also used by `/v1` and the man page). New states go there or nowhere.
- Living reference: `src/pages/DesignPage.tsx` (export `DesignPage`; not routed yet: mount it at `/design`).
  Dev harness without the router: `src/ds/__harness__.tsx` (used by `e2e/design-audit.spec.ts`).
- Audit: `e2e/design-audit.spec.ts` (palette, faces, radius, shadows, gradients, default-deny numbers, axe-core
  WCAG 2.2 AA at 1440 and 390, keyboard, overflow, reduced motion) and the palette test in `e2e/app.spec.ts`.

## The seven rules

1. **No bare numbers.** A value ships as a reading: value, unit, 95% interval, *n*. `<Num>` is default-deny: without
   `prov` it renders UNCAL (dashed amber underline, no `data-prov`) and the e2e audit fails the build.
2. **Reality is solid. Simulation is dashed.** CH1 real is a solid 1.5px line drawn last inside a ±tolerance band. Twins
   are dashed underneath. Dashed also marks anything not measured.
3. **Colour is signal, never decoration.** Emerald = agreement, pass, live. Amber outline + ▲ = measured gap. Amber
   fill + ✕ = fault or refusal. Cyan and orchid draw data channels only. No red.
4. **Two monospaces, one voice.** Martian Mono = readouts, display, H1/H2 (22px and up). JetBrains Mono = terminal
   (UI, body, tables, code, legends, axes). Atkinson Hyperlegible Next = prose only.
5. **Status is grammar.** Every capability wears a lamp: LIVE, PREVIEW, PLANNED, WAITLIST, ON REQUEST, CONCEPT, REFUSED.
   Nothing is LIVE until it works at that URL. The Twin Gap Report reads PREVIEW until v1 is published.
6. **Change the timebase, not the signal.** Under a 560px container plots drop to 5 divisions and the s/div doubles.
   Never squash, smooth or clip a trace. Δ scales are 1-2-5. Verdict columns never drop off a phone.
7. **Terminals don't fade.** State changes take 0ms. Nothing ticks unless it measures something. Busy controls show
   elapsed time, never a spinner. Anything that updates on its own pauses when hidden and under reduced motion.

## Voice and numbers (short)

- Tag the status of every claim. Planned things in the future or conditional tense. Never "coming soon".
- Say what was measured, on what, and what it does not show, next to the result.
- Plain words, short sentences, no hype, no exclamation marks, no emoji. Periods, colons, parentheses; ranges use "to".
- "verified" only for a real-robot result with n ≥ 50. "signed" only after Ed25519 ships ("hashed" until then).
  Outside `/concept`: never escrow, USDC, settlement, attestation, TPM, nodes, fleet, "our network".
- Numbers: `4.93 deg [4.64, 5.25]`, unit once, *n* wherever an interval appears. True minus (−79%) on screen
  (`fmt`), ASCII in copyable blocks and JSON (`fmt(v, d, true)` / `<Num ascii>`). Report numbers come from
  `report.json` through the build, never typed by hand. Readouts proportional; tables, axes, code tabular.
  "n = 10", "133 ms", "95% [a, b]" never break (`nw` utility or U+00A0).

## Tokens (Tailwind v4, `src/index.css`)

Closed palette (Tailwind defaults removed). v0.1 names kept; one value changed (`muted` #64748B → #8893A2).

| Utility name | Hex | Use |
|---|---|---|
| `bg` | #090A0C | carbon page / screen |
| `panel` | #111318 | panels |
| `raised` | #171A20 | hover row, selected, input well |
| `line` | #222630 | hairline: structure only, never a control edge |
| `edge` | #6B7588 | every control boundary (≥ 3:1 on all surfaces) |
| `fg` / `muted` / `dim` | #E2E8F0 / #8893A2 / #5C646F | text / secondary text / disabled + decoration only |
| `emerald` / `amber` | #10B981 / #F59E0B | signal only |
| `ch-stock` / `ch-cal` | #00A2CE / #B0449A | data channels only, never text |
| `grat` / `grat-axis` | #1A1D24 / #2B303A | graticule (decorative) |

- Migration rule: interactive borders use `border-edge`, not `border-line`.
- Semantic CSS variables for hand-written CSS/SVG: `--bg --surface --raised --line --edge --text --muted --dim --ok --warn
  --ok-wash --warn-wash --mask-wash --ch-real --ch-stock --ch-cal --ch-cmd --grat --grat-axis --grat-frame --focus`.
  `.theme-paper` / `[data-theme=paper]` re-resolve them for exports and print: the same components render on paper.
- Type roles (utilities): `t-display t-h1 t-h2 t-h3 t-readout t-body t-ui t-code t-legend t-lede t-prose t-caption`,
  plus `tabular`, `nw`, `skip-link`. One role per element; never mix families. Role utilities sit in the utilities
  layer, so a component class cannot override them: give a heading its own full declaration instead of `t-h1 + x`.
- Sizes: `text-legend text-ann text-ui text-code text-body text-caption text-h3 text-prose text-lede text-h2 text-h1
  text-display text-ro-s/m/l/xl`. Spacing: 4px base (`--s-1..--s-10` = 4 8 12 16 24 32 48 64 96 128).
- Layout helpers (component layer): `.page-wrap` (max 1440, margin 48/32/16), `.g10` + `.c-2..c-8, .c-10`
  (10 divisions, 5 under 700px), `.ds-row`, `.ds-stack`, `.cq` (container-query root), `.sr`, `.lnk`, `.tlink`.
- Breakpoints: `sm` 640, `md` 700, `lg` 1100. Containers: `@plot` 560, `@mock` 760, `@strip` 900, `@hero` 1000.
- Motion: 0ms state changes; `animate-blink` (armed lamp, stream cursor) only. Reduced motion turns every animation off.
  Forced-colours block maps borders, lamps and focus to system colours. Focus: 2px fg outline, 2px offset, everywhere.

### Fonts

Self-hosted latin subsets in `public/fonts` (copied byte-for-byte from the pinned `@fontsource-variable/*` 5.3.0
devDependencies), declared in `src/index.css`, SIL OFL 1.1 (licences next to them). 117.7 KB total:
JetBrains Mono 40.4 + Martian Mono 38.5 + Atkinson Hyperlegible Next 34.0 + `ms-glyphs.woff2` 4.8 (Δ δ μ σ Σ → ≤ ≥ ■ ▲ ✕ ✓
box drawing, registered under the JetBrains family with its own `unicode-range`). Preload only the terminal face:
`<link rel="preload" href="/fonts/jetbrains-mono-latin-wght.woff2" as="font" type="font/woff2" crossorigin>`.

## Components

Every component below is exported from `src/ds`. Props marked *req* are required.

### Lamp (C-02 annunciator), alias `Annunciator`

`status` *(LampWord)* or `kind` *(LampKind)* + `children` · `size: 'md'|'sm'` · `uncal` (verdict computed from
placeholders: dashed, unlit) · `lit` (concept banner).

```tsx
<Lamp status="PREVIEW" />
<Lamp status="PASS" uncal />                 // dashed while the inputs are UNCAL
<Lamp status="MARGINAL">1 joint marginal</Lamp>
<Lamp status={capability('MS-TGR-1').status} size="sm" />
```
Do: keep the word literal. Don't: put a LIVE lamp on anything simulated or static; invent words; use more than one lit
amber lamp per panel. The lamp is CSS; the word is real text, so colour is never the only signal.

### Num (C-03), the honesty primitive

`value` *req* (number | string) · `digits` (2) · `signed` · `ascii` · `unit` · `prov` (string field path / URL, or a
`Provenance` object) · `placeholder` (acknowledged sample: silences the dev warning, still UNCAL).

```tsx
<Num value={h.stock.mean} prov={`lab/reports/${id}/report.json#/headline/sets/interleaved/stock/mean`} />
<Num value={x} prov={{ ref, reading: '4.93 deg [4.64, 5.25] held-out, n = 10', dataset: 'lerobot/… @ f641879', twin: '… @ b065505 · mujoco 3.17.0', report: 'sha256 …' }} />
```
A `Provenance` object turns the number into a button that opens a provenance popover (Esc closes, focus returns).
Without `prov`: `data-uncal`, dashed amber underline, dev console warning, and the production audit fails. A panel
that holds an UNCAL number must show exactly one UNCAL lamp (`Panel uncal`, `Figure` without `prov`). Cited
numbers (papers) carry their URL as `prov`. Don't round toward the flattering side.

### Reading (C-04 readout), alias `Readout`

`label` *req* · `value` *req* · `unit` ('°' full size; 'ms' 'fr' '%' 'eps' shrink to .42em) · `ci` *req*
(`[lo, hi]` or `null`) · `n` *req* (number or `null`) · `nLabel` · `channel` (line key) · `size: 'xl'|'l'|'m'|'s'` ·
`digits` · `signed` · `tolerance` (stacked ± display, xl/l/m) · `ciLabel` ('95%') · `ciPrefix` · `extra` · `prov` · `placeholder`.

```tsx
<Reading label="held-out rmse · calibrated" channel="cal" value={c.mean} unit="°" ci={c.ci95} n={c.n}
  nLabel="held-out episodes" prov={p('calibrated/mean')} tolerance />
```
Don't show a value without its interval and *n*; don't colour the value by verdict. In a row: `<div className="ro-row">`.

### Key (C-01 softkey), alias `Button`

`variant: 'primary'|'secondary'|'run'|'caution'|'ghost'|'quiet'` · `size: 'md'|'sm'` · `glyph` (run square) ·
`busy: { label?, startedAt }` (shows `Running T+00:01.24`, ignores clicks, `aria-busy`) · `current` (nav,
`aria-current=page`) · `href` (renders `<a>`) · all native button/anchor props.

```tsx
<Key variant="primary" onClick={openRequest}>Request a report</Key>
<Key variant="run" glyph busy={busy ? { startedAt } : null} onClick={run}>Run preflight</Key>
<Key variant="ghost" href="/reports" current>Reports</Key>
```
One primary per view. Verb labels that name the operation. Ghost keeps the v0.1 `[ ]` as CSS pseudo-elements
(screen readers hear only the label). Icon-only keys need `aria-label`. Never a spinner, never "Contact sales".

### Field, Input, Select, Textarea, Check, FieldGrid (C-05)

`Field`: `label` *req* · `required` · `help` · `error` (amber edge, ▲, `aria-invalid` + `aria-describedby`) ·
`prefix` / `suffix` (unit cells; suffix is read as description) · `disabled` (dashed) · `full` (spans a FieldGrid).
Exactly one `Input` / `Select` / `Textarea` child; it picks up id, describedby, invalid, disabled, required.
`Check`: `type: 'checkbox'|'radio'`, `label`. `FieldGrid`: 2 columns, 1 under a 560px container.

```tsx
<FieldGrid>
  <Field label="trials" suffix="trials" error={n < 50 ? 'below n = 50 the result is labelled a smoke test' : undefined}>
    <Input inputMode="numeric" value={n} onChange={…} />
  </Field>
  <Field label="robot" required><Select>…</Select></Field>
</FieldGrid>
```
Don't use placeholder text as the label. Errors say what to do.

### Tabs, ModeSwitch, ChannelKeys (C-06)

`Tabs`: `label` *req* · `items: { id, label, count?, panel? }[]` *req* · `value`/`defaultValue`/`onChange` ·
`controls` (id, when there are no panels). Roving tabindex: arrows, Home, End.
`ModeSwitch`: `label`, `options: { value, label, disabled?, title? }[]`, `value`, `onChange` (aria-pressed). Real
stays disabled with a title until a cell exists. `ChannelKeys`: `value: ChannelVisibility`, `onChange`, `channels`.

### Table, ScrollBox (C-10, C-22, C-24)

`Table<R>`: `columns: Column<R>[]` *req* · `rows` *req* · `rowKey` *req* · `label` *req* (scroll-region name) ·
`caption` (sans: method, units, n) · `rowClassName` ('refused' mutes a row) · `span(row)` (collapse cells from
column `from` into one, for REFUSED + reason) · `summary` (row on an edge rule) · `stack` (labelled cards on a
≤ 760px container: the report index never scrolls sideways) · `compact` · `initialSort`.
`Column<R>`: `key`, `header`, `cell(row)`, `align: 'right'` for numbers, `sort(row)` (null sorts last; header becomes a
button in `th[aria-sort]`), `label` (stack label), `lead` (stack: full-width first line), `wrap`.
`ScrollBox`: any sideways-scrolling content; focusable and named only while it overflows.

```tsx
<Table label="Report index" stack rows={reports} rowKey={(r) => r.id} columns={cols}
  rowClassName={(r) => (r.refused ? 'refused' : undefined)}
  span={(r) => (r.refused ? { from: 2, content: <><Lamp status="REFUSED" size="sm" /> {r.reason}</> } : null)} />
```

### CodeBlock, CurlBlock, CommandLine, CopyKey, curlCommand (C-07)

`CodeBlock`: `title` *req* · `code` *req* (exact ASCII text that Copy copies; continuation lines after `\` print
as written) · `status` (endpoint lamp) · `output` (muted, may hold `<Num ascii>`) · `prompt` ('$ ') · `what` (names
the copy key and scroll region). `CurlBlock`: `method`, `url` *req*, `headers`, `data`, `pipe`, `status`, `output`;
breaks at 76 columns with a 4-space hanging indent. `CommandLine`: one-line `$ …` strip (proof panel).
Planned endpoints show `status="PLANNED"` and their 501 body as `output`. No syntax colours.

### Console (C-08)

`title` *req* · `events: { t, event, payload?, verdict?, tone? }[]` *req* (`t` = real elapsed ms since the request,
never staged) · `status` · `exit` · `idle` · `run: { label, onRun, busy?, disabled? }` · `footer: [left, right]` ·
`announce` (one-shot screen-reader message; the log itself is `role=log aria-live=off`) · `label`.
Under reduced motion, print the whole stream at once.

### Callout (C-09)

`register: 'must'|'limitation'|'note'|'method'|'ok'` *req* · `keyword` · `source` (mono reference line) · `children`.
`ok` (emerald) only for a measured value inside its stated limit, with the limit printed. Feed `report.json`
`limitations[]` through `register="limitation"` with `source="report.json · limitations[i]"`.

### Dialog (C-11)

`open` *req* · `onClose` *req* · `title` *req* · `endpoint` ('POST /v1/pilots') · `actions` (ghost Cancel, then the
primary) · `closeOnBackdrop` · `children`. Native `<dialog>` + `showModal()`, 84% carbon scrim, Esc closes, focus
returns to the opener. Hash deep links (`#request-report`, `#request-pilot`, `#own-robot`) belong to the page. Copy
promises only what one person can keep; nothing is charged.

### Panel, SectionHeader, Ruler, Figure

`Panel`: `title` *req* (wrap key words in `<b>`) · `heading: 'h2'|'h3'|'h4'|'div'` · `actions` · `uncal` (exactly
one UNCAL lamp) · `flush` · `as` · `id`. `SectionHeader`: `numeral`, `eyebrow`, `title` *req*, `description`,
`level`, `id` (renders the ruler). `Ruler` (C-18): the only ornament, under section heads and certificate headers,
never inside a panel. `Figure`: `number`, `title` *req*, `uncal`, `controls`, `table` (every figure has a table
view; the `[ Table ]` key is aria-pressed), `caption` (method + rule), `keys` (keyboard hint), `padded`.

### Certificate blocks (C-15, C-20, C-21)

`CertificateHeader`: `eyebrow`, `title` *req* (use `<Ids>`), `meta`, `fields: TitleField[]` *req*, `seal`, `level` (1).
`TitleBlock`: `fields: { k, v, span?: 1|2|3|4|6 }[]` (6-column grid, rows should sum to 6; 2 columns on phones).
`ProvenanceFrame`: `symbol` ('ε'), `cells: { k, v, datum?: 'R'|'T' }[]` (reflows, never truncates).
`CheckPoll`: `rows: { check, why, status, kind?, word? }[]`, `result` (raised row). Map from `report.json`
`mapping_checks` / `units` / `split`: UNITS, MAPPING, SPLIT, HELD-OUT, CONTACT, SIGNING with GO / CAUTION / SCOPE / PLANNED.
`Seal`: `word`, `rows: [k, v][]`, `lamp`, `label`. `Ids`: inserts `<wbr>` after `/` and `_` in ids.

### Blocks (C-12, C-14, C-16, C-19, C-22, C-23)

`StatusLine`: `items: { label, value, word?, hideOnPhone? }[]` (static facts built at deploy from `lab/reports`;
no LIVE dot, nothing ticks). `Ledger`: defaults to `CAPABILITIES` from `shared/status.ts`. `SignalChain`:
`steps: { index, status, title, body }[]`. `ConceptBanner`: `/concept` only (sticky by default). `RevisionTable`:
`rows: { rev, date, change }[]` (record withdrawals in plain words; never restate withdrawn numbers).
`IntervalMeter`: `value lo hi min max channel label`. `PowerSelector` (C-23, PLANNED): `twin`, `real`, `options`,
`defaultN`; ships only with a real cell. `SkipLink`: first focusable element of every page (`href="#main"`).

## Data-viz

All plots are hand-rolled SVG, redrawn at container width (ResizeObserver), coloured through token classes
(`.tr-real .tr-stock .tr-cal .tr-cmd`, `.f-mask`, `.comb`), so the paper theme re-resolves them. Text never wears a
series colour; status colours never draw a series. Without `prov` a figure shows UNCAL, its numbers render UNCAL
and its verdicts stay dashed. Long traces are decimated per pixel column (min/max), never smoothed.

Data contracts (`src/ds/viz/types.ts`): `Traces { real, stock?, cal?, cmd? }` (per-frame arrays, same length and fps;
`real` is the reference), `JointTraces = Traces & { joint }`, `Interval { mean, lo, hi }`.

### ScopePlot (C-17 hero instrument screen)

`joint` *req* · `traces` *req* · `fps` *req* · `tolerance` (1.0°) · `height` (300) · `initialFrame` · `episode` ·
`prov` · `uncalLamp` (turn off inside a `Panel uncal`) · `tableView` · `channels` · `label`.
Main pane 64% + Δ = SIM − REAL pane 36% with the mask band and amber gap comb; 1-2-5 autoscale that never clips;
10 → 5 x-divisions under 560px (s/div doubles); bezel prints `°/div · Δ °/div`, `M s/div · fps`, mask result.
Playhead: `role=slider`, keys ←/→ 1 frame, Shift ×15, PageUp/PageDown 1 s, Home/End; `aria-valuetext` reads every
channel and its Δ; tooltip on hover or focus.

### ScopeStrips (Fig 1, small multiples on one playhead)

`joints: JointTraces[]` *req* · `fps` *req* · `tolerance` · `episode` · `prov` · `initialFrame` · `defaultJoint` ·
`number` · `title` · `caption` · `id`. One strip per joint with its own °/div and Δ lane, shared slider playhead
reading every joint, frame flag, at-cursor side table (▲ amber outside the mask). Side table drops below under 900px;
one strip behind a roving joint tab switch under 560px.

### CIBars (Fig 2)

`rows: { joint, stock: Interval, cal: Interval, change: Interval }[]` *req* (`change` in percent, paired by episode,
from report.json) · `summary` (arm mean) · `passRatio` (0.5) · `n` · `prov` · `number` · `title` · `caption`.
PASS when `cal.hi < passRatio × stock.mean`, else MARGINAL ▲. Under 560px: `name | change | verdict` over a full bar.

```tsx
const m = report.metrics.interleaved
const iv = (x: { mean: number; ci95: [number, number] }) => ({ mean: x.mean, lo: x.ci95[0], hi: x.ci95[1] })
const pct = (x: { mean: number; ci95: [number, number] }) => ({ mean: x.mean * 100, lo: x.ci95[0] * 100, hi: x.ci95[1] * 100 })
const row = (j: string) => ({
  joint: j === 'arm_mean' ? 'arm mean' : j,
  stock: iv(m.stock.sim_vs_real_rmse_deg[j]),
  cal: iv(m.calibrated.sim_vs_real_rmse_deg[j]),
  change: pct(m.improvement_calibrated_vs_stock[j].rel_change),
})
<CIBars rows={JOINTS.map(row)} summary={row('arm_mean')} n={m.n_episodes} prov={`lab/reports/${id}/report.json#/metrics/interleaved`} />
```

### LagReadout (Fig 3)

`fps` *req* · `real` / `stock` / `cal` *req* (`Interval`, frames) · `matchTolerance` (1 frame) · `n` · `prov` ·
`number` · `title` · `caption`. Big readout (frames + ms), "cal matches ≤ 1 fr" lamp, timing diagram (≥ 560px) and
vernier (all widths). From report.json: `iv(m.real.lag_frames.arm_mean)` etc. (that field is the arm mean: say
"mean of joints" in `title`).

### Hooks and helpers

`useContainerWidth(ref)`, `usePlayhead(frames, fps, home, geomRef)`, `useOverflowA11y(ref, name)`,
`useElapsed(startedAt)` (pauses when hidden), `useReducedMotion()`, `useFocusReturn(open)`.
Format: `fmt`, `fmtSigned`, `fmtInterval`, `fmtElapsed`, `fmtSeconds`, `framesToMs`, `digitsFor`, `MINUS`, `NBSP`.
Maths (`dsMath` or `src/ds/math.ts`): `step125`, `niceStep`, `yScale`, `deltaScale`, `timebase`, `comb`, `rmse`,
`countOutside`, `extent`, `maxAbsResidual`, `wilson`, `newcombe`, `linePath`, `bandPath`, `contrast`.

## shared/status.ts

`CAPABILITY_STATUSES`, `CapabilityStatus`, `CAPABILITY_STATUS[s] → { api, kind, meaning }`, `apiStatus(s)` /
`fromApiStatus(api)` (wire form `live|preview|planned|waitlist|on_request|concept|refused`), `VERDICTS`, `STATES`,
`LampWord`, `lampKindOf(word)`, `LAMPS` (shape, tone, filled, dashed), `CAPABILITIES` (part numbers MS-TGR-1,
MS-TT-SIM, MS-RV-SO101, MS-MCP with their status and scope line), `capability(part)`. Changing a status is a one-line
edit there; the lamps, `/v1` and the man page follow.

## For page engineers: what is not done here

- Route `/design` to `DesignPage` (`src/lib/router.ts`), and exempt it from the banned-word audit like `/concept`
  (it shows the concept banner).
- Add the font preload line above to `index.html`, and `/fonts/*` cache headers in `public/_headers`.
- Fig 1 / ScopePlot need a per-frame trace export (real, stock, cal, cmd per joint) from `lab`; `report.json` has none yet.
- `src/ds/sample.ts` is SAMPLE data for the reference only. Never import it from a product page.
- v0.1 utilities kept until their call sites go: `.ticker-track`, `.flash-emerald` (delete with the ticker and the
  dispatch console), `.cursor-blink` (= `animate-blink`). v0.1 `ui.tsx` components are marked `@deprecated`.
