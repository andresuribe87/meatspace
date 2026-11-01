# Deploying meatspace.sh

One Worker (`meatspace`) carries everything: static assets (the SPA and the published Twin Gap Report files under `/data/reports/`), the `/v1` API, the `NetworkState` Durable Object (the v0.1 concept simulation), the D1 database (v0.1 waitlist and v0.2 requests) and two rate limiters. The apex `meatspace.sh` is attached as a Workers Custom Domain.

## 1. API token

Use an **account-owned** token (dashboard → Manage account → Account API tokens, or Terraform `cloudflare_account_token`). Wrangler accepts it as long as `CLOUDFLARE_ACCOUNT_ID` is also set, and it needs no user-level permissions. Minimum set:

| Resource | Permission group | Why |
| --- | --- | --- |
| Account | Workers Scripts Write | upload the Worker, static assets, Durable Object migration, bindings |
| Account | D1 Write | auto-provision `meatspace-waitlist`, apply migrations (`0001_waitlist`, `0002_requests`) |
| Account | Account Settings Read | wrangler account lookup |
| Account | Workers Tail Read | optional: `wrangler tail` when debugging |
| Zone `meatspace.sh` | Workers Routes Write | attach the Custom Domain |
| Zone `meatspace.sh` | Zone Read | resolve the zone for the Custom Domain |

Scope the zone policy to `meatspace.sh` only, and set an expiry. KV, R2, Pages and the other groups in the **Edit Cloudflare Workers** template are not used by this project.

Export it with your account ID (dashboard → Workers & Pages → right sidebar):

```sh
export CLOUDFLARE_API_TOKEN=…
export CLOUDFLARE_ACCOUNT_ID=…
```

## 2. Deploy

```sh
npm ci
npm run deploy
```

`npm run deploy` runs `npm run build`, then `wrangler deploy` on the build output, then `wrangler d1 migrations apply DB --remote`, then `npm run deploy:www` (the `meatspace-www` redirect Worker in `www/`, Custom Domain `www.meatspace.sh` → 301 to the apex).

`npm run build` starts with the `prebuild` step, `node scripts/sync-reports.ts` (Node 22.18 or later: it runs the TypeScript file directly). It reads every `lab/reports/<id>/report.json`, recomputes `content_sha256` and `results_sha256` exactly as the lab does, checks each `calibrated_twin.json` and `trace.json` against its own sha256 and against the report, and then:

- copies `report.json`, `report.md`, `calibrated_twin.json`, `trace.json` and the SVGs to `public/data/reports/<id>/`, plus `report.strict.json` for the two reports whose `report.json` holds Python's `NaN` / `Infinity`;
- writes `public/data/reports/index.json` and `shared/reports.generated.ts` (the same summaries, with a JSON-pointer provenance on every number).

**The build fails** on an unknown schema, a report whose hashes do not match its file, a trace made from another `report.json`, or a scan-ok candidate without a report. Nothing on the site is typed by hand from a report: to change a number, re-run the lab. `npm run dev` runs the same sync first (`predev`); `npm run check:reports` checks without writing.

`public/data/` is generated and ignored by git (`.gitignore`). Publish dates come from `lab/reports/published.json` (one `YYYY-MM-DD` per report id), not from git history, so a shallow clone builds the same site; a report without a date, or an ok report without its `trace.json`, fails the build (`MS_ALLOW_MISSING_TRACE=1` lets a report ship without Fig 1). `shared/reports.generated.ts` is committed so `tsc -b` works on a fresh clone; `test/unit/reports.test.ts` fails when it is stale.

Migrations: `0001_waitlist.sql` (v0.1 waitlist, kept and still written by `POST /v1/waitlist`) and `0002_requests.sql` (v0.2 `requests` table for `POST /v1/requests`). `npm run deploy` applies any that are new before it deploys the Worker (the v0.2 Worker writes to `requests`, so the table must exist first); to apply them alone, `npm run db:migrate:remote`.

On the first deploy, wrangler auto-provisions the D1 database `meatspace-waitlist` because `wrangler.jsonc` declares the binding without a `database_id`. It also creates the `NetworkState` SQLite Durable Object class (migration tag `v1`) and binds `meatspace.sh` as a Custom Domain, which creates the DNS record and certificate.

Precondition: neither `meatspace.sh` nor `www.meatspace.sh` may have an existing A/AAAA/CNAME record. A Custom Domain cannot be created over an existing record.

### Publishing new or re-run reports

```sh
cd lab
.venv/bin/python -m meatspace_lab report --dataset owner/name --revision <sha> \
    --twin .cache/menagerie/<twin> --out reports/owner__name/ --max-episodes 200
.venv/bin/python -m meatspace_lab export-trace reports/owner__name/   # trace.json (re-runs and checks the replay)
.venv/bin/python -m meatspace_lab index --reports reports             # INDEX.md
cd .. && npm run sync:reports && npm test                             # then commit lab/reports and deploy
```

A new report directory needs its candidate in `lab/reports/candidates.json` (every scan-ok candidate must have a report). `scripts/run_all.sh` regenerates all of them, traces included.

## 3. Check the deploy

```sh
curl -s https://meatspace.sh/healthz                                  # ok
curl -s https://meatspace.sh/v1 | jq '.endpoints[] | [.method, .path, .status]' -c
curl -s https://meatspace.sh/v1/reports | jq '.counts'
curl -sI https://meatspace.sh/v1/reports/lerobot__svla_so101_pickplace | grep -i -E 'etag|cache-control'
curl -s https://meatspace.sh/v1/reports/lerobot__svla_so101_pickplace/trace | jq '.episode'
curl -s -X POST https://meatspace.sh/v1/trials | jq -r .error.code     # ERR_NOT_IMPLEMENTED
curl -s https://meatspace.sh/v1/cells | jq -c '.cells[] | [.id, .twin, .trials, .real]'
curl -s https://meatspace.sh/docs | head -20
curl -s https://meatspace.sh/install.sh | sh                          # inert dry run
curl -s https://meatspace.sh/v1/concept/snapshot | head -c 200        # v0.1 simulation (also at /v1/snapshot)
```

Do not post a test request to `/v1/requests` in production unless you delete it afterwards: every row is someone the founder will email.

## Operations

- **Requests (v0.2):** `npx wrangler d1 execute DB --remote --command "SELECT id, kind, email, dataset, payload, created_at FROM requests ORDER BY created_at DESC LIMIT 50"`. `id` is `gr_` / `pl_` / `or_` + 16 hex of sha256(kind, email, dataset), so a repeated request is one row holding the latest answers (`updated_at` is set on a repeat). Gap reports are run by hand; nothing in the API runs them.
- **Waitlist rows (v0.1):** `npx wrangler d1 execute DB --remote --command "SELECT kind, email, protocol, fleet_size, created_at FROM waitlist ORDER BY id DESC LIMIT 50"`. These people were promised contact before the v0.2 cohort opens.
- **Demand for planned endpoints:** every 501 logs one line `{"event":"planned_endpoint","method":…,"route":…}` (no caller data). Count them in Workers Logs (observability is on) or with `npx wrangler tail --format json | grep planned_endpoint`.
- **Concept simulation state:** the v0.1 simulation behind `/v1/concept/*` still runs in the `NetworkState` Durable Object (the v0.1 paths answer 308 to `/v1/concept/*`). Static fields (chassis, coordinates, rates, geofences, envelopes, …) come from `shared/nodes.ts` on every restart, so an edit there reaches the live instance with the next deploy. Only live fields persist in the Durable Object's storage (keys `snapshot` and `owners`): charge, status, task locks and their holders, ticker stats and `seq`. To reset those as well, add a migration that deletes `NetworkState` and re-creates it under a new class name, which wipes its storage.
- **Cost profile:** the DO only ticks (alarm every 2 s) while a WebSocket viewer is connected, a node is TASKED, or a battery node is CHARGING. Browsers close their socket when the tab is hidden. Once nobody is watching and every lock and charge cycle has finished, the DO goes idle.
- **Rate limits and lock quota:** `DISPATCH_LIMITER` 20/min (concept dispatch) and `WAITLIST_LIMITER` 5/min (shared by `POST /v1/requests` and `POST /v1/waitlist`) per client, where a client is an IPv4 address or an IPv6 /64 (namespace IDs `4701` and `4702` must be unique in the account). Each client may also hold at most 2 task locks at once (`MAX_ACTIVE_LOCKS_PER_CLIENT`); lock holders are stored as a truncated SHA-256 of the client network, never as an address.
