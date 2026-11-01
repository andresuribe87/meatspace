# meatspace.sh

`stdout to reality.` Twin-first sim-to-real verification for robotics researchers and AI agents.

meatspace.sh measures how far a robot's simulation twin is from the real robot. A **Twin Gap Report** replays a public LeRobot dataset open-loop in the matching MuJoCo Menagerie twin, measures command-to-state lag and per-joint sim-vs-real error, fits a calibrated twin on some episodes and reports the error on held-out episodes (a chronological future block and an interleaved set), with 95% bootstrap intervals, next to a physics-free lag-filter baseline. Every candidate dataset is reported whatever its result; the ones that fail a unit or mapping check are listed with the reason.

Scope, plainly: the replay is open-loop, in joint space, with contacts disabled. It measures the actuator model, not task success, contact or vision.

```sh
curl -s https://meatspace.sh/v1/reports | jq '.counts'
curl -s https://meatspace.sh/v1/reports/lerobot__svla_so101_pickplace | jq .headline.sets.future
curl -s https://meatspace.sh/v1/reports/lerobot__svla_so101_pickplace/twin -o calibrated_twin.json
curl https://meatspace.sh/docs            # MEATSPACE(1), plain text
```

## Status (v0.2.0)

One source of truth, `shared/status.ts`, drives the site's lamps, `GET /v1` and the man page.

| Capability | Status |
| --- | --- |
| Twin Gap Reports (public LeRobot SO-100 / SO-101 data) | LIVE |
| Calibrated twin packages (`calibrated_twin.json` per report) | LIVE |
| A gap report on your dataset (`POST /v1/requests`, run by hand) | ON REQUEST |
| Hosted twin trials (`POST /v1/trials` answers 501) | PLANNED |
| Real SO-101 cell (nothing purchased; gated on $3k committed) | WAITLIST |
| MCP server for agents | PLANNED |
| v0.1 industrial dispatch (simulated, `/concept`, `/v1/concept`) | CONCEPT |

Files carry sha256 hashes. Nothing is signed yet (Ed25519 signing is planned), and no result is called verified: that word is kept for real-robot results with n of at least 50, and none exist.

## Where the numbers come from

```
lab/ (Python, MuJoCo)                       scripts/sync-reports.ts (prebuild, predev)         site + API
python -m meatspace_lab report       ──►    recompute content/results sha256, check     ──►    public/data/reports/<id>/*   (static)
python -m meatspace_lab export-trace        package + trace hashes; fail on mismatch           shared/reports.generated.ts  (SPA + Worker)
lab/reports/<id>/{report.json, ...}         copy files, write index + summaries                GET /v1/reports[/:id[/twin|/trace|/files/:name]]
```

- `lab/` is the Python tooling that produces every report (`lab/README.md`: method, statistics, reproducibility; `lab/reports/INDEX.md`: every result).
- `scripts/sync-reports.ts` verifies and publishes them. A number on the site is a field of a summary in `shared/reports.generated.ts`, and every such field carries a JSON pointer into the report file it came from (`lab/reports/<id>/report.json#/headline/sets/future/stock`), which the design system's `<Num prov>` / `<Reading prov>` render as provenance.
- `trace.json` (schema `meatspace.twin-trace/v1`) holds one representative held-out episode per report, per frame: command, real state and the stock, baseline and calibrated replays. `export-trace` re-runs the report's replay to write it and refuses unless the result matches `report.json`.

## Architecture

All of it runs on Cloudflare as a single Worker:

```
browser ──► Workers Static Assets (React SPA, /assets/*, /fonts/*, /data/reports/** report files)
        └─► Worker (Hono)  run_worker_first: /v1 /v1/* /mcp /mcp/* /install.sh /docs /healthz (+ trailing-slash 301s)
              ├── GET /v1                         index: every endpoint, its status, the capability behind it
              ├── GET /v1/reports[/:id/...]       generated summaries; files through the ASSETS binding, ETag = sha256
              ├── GET /v1/cells[/:id]             one planned cell, lane statuses from shared/status.ts
              ├── POST /v1/requests ─► D1 (requests): gap report / pilot / own robot, same-origin, 5/min, honeypot
              ├── POST /v1/trials, /mcp, ...      501 ERR_NOT_IMPLEMENTED, pointing to /cells
              ├── /v1/concept/* ─► NetworkState DO: the v0.1 simulation (v0.1 paths answer 308 here)
              └── /install.sh (inert), /docs (text/plain for curl)

www.meatspace.sh ──► meatspace-www Worker (www/) ──► 301 https://meatspace.sh/<path>?<query>
```

| Piece | Where |
| --- | --- |
| Report data contract: types, provenance and Reading helpers | `shared/reports.ts` |
| Generated report index (do not edit) | `shared/reports.generated.ts` |
| API contract: endpoint registry, cells, request fields and validation | `shared/api.ts` |
| Status vocabulary and capability ledger | `shared/status.ts` |
| Man page (`/docs`, `curl /docs`) | `shared/manpage.ts` |
| Client report access (`useReportIndex`, `fetchReport`, `useTrace`, ...) | `src/lib/reports.ts` |
| Worker routes | `worker/` (`reports.ts`, `requests.ts`, `index.ts`) |
| D1 schema | `migrations/` (`0001_waitlist.sql`, `0002_requests.sql`) |
| Design system "Instrument" | `src/ds/` (`src/ds/README.md`) |
| Strategy and decisions | `docs/strategy/2026-11-01-pmf-memo.md`, `docs/DECISIONS.md` |

## API

| Method | Path | Status | |
| --- | --- | --- | --- |
| GET | `/v1` | live | endpoint index with statuses |
| GET | `/v1/reports` | live | every report: summaries, counts, the rejected list with reasons |
| GET | `/v1/reports/:id` | live | one report.json (strict JSON) |
| GET | `/v1/reports/:id/twin` | live | calibrated twin package |
| GET | `/v1/reports/:id/trace` | live | one held-out episode, per frame |
| GET | `/v1/reports/:id/files/:name` | live | any published file, byte for byte |
| GET | `/v1/cells`, `/v1/cells/:id` | live | cells and lane statuses (twin planned, trials planned, real waitlist) |
| POST | `/v1/requests` | live | `kind`: `gap_report` (run by hand), `pilot` (waitlist), `own_robot` |
| POST | `/v1/trials` | planned | 501 |
| GET | `/v1/trials/:id`, `/v1/cells/:id/twin`, `/mcp` | planned | 501 |
| * | `/v1/concept/*` | concept | the v0.1 simulation; see `/concept`. The v0.1 paths (`/v1/dispatch`, `/v1/stream`, ...) answer 308 to it |
| GET | `/install.sh` | live | inert dry run for the planned `meatspaced` |
| GET | `/docs` | live | man page (HTML for browsers, text for curl) |

Full reference: [`/docs`](https://meatspace.sh/docs).

## Develop

Node 22.18 or later (the report sync runs a TypeScript file directly).

```sh
npm install
npm run db:migrate:local   # local D1 schema (waitlist + requests)
npm run dev                # syncs lab/reports, then Vite + workerd (DO, D1, rate limits all local)
```

```sh
npm run typecheck
npm test                   # vitest: worker project (workerd) + unit project (node)
npm run test:e2e           # Playwright against the production build in workerd, fresh state per run
npm run lint
npm run check:reports      # is the published data in sync with lab/reports?
cd lab && .venv/bin/python -m pytest -q   # the lab's own tests
```

## Deploy

See [`docs/DEPLOY.md`](./docs/DEPLOY.md). Short version: `CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… npm run deploy`. The build refuses to publish a report whose hashes do not match its file.

## License

MIT
