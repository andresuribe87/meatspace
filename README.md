# meatspace.sh

`stdout to reality.` — dispatch tasks to physical hardware.

Autonomous hardware sits idle in proprietary silos for most of its lifecycle, while software agents have zero native way to discover, rent, or task physical machines across vendor boundaries. `meatspace.sh` exposes idle robots and autonomous fleets as pay-per-minute API endpoints, handling cross-vendor command translation, safety sandboxing, and cryptographic proof of execution in a single call.

> **v0.1.4-alpha is a live sandbox.** The API is real and the curl commands work, but the hardware, settlement and attestation behind them are simulated. Every receipt carries `"sandbox": true`.

```sh
curl -sN https://meatspace.sh/v1/nodes
curl https://meatspace.sh/docs            # man page, plain text
```

## Architecture

All of it runs on Cloudflare as a single Worker:

```
browser ──► Workers Static Assets (React SPA, /assets/*, /docs HTML)
        └─► Worker (Hono)  run_worker_first: /v1 /v1/* /install.sh /docs /healthz
              ├── /v1/snapshot /v1/nodes /v1/stats ──► NetworkState DO (RPC)
              ├── /v1/stream  (WebSocket) ──────────► NetworkState DO (hibernatable WS, 2 s ticks while watched)
              ├── POST /v1/dispatch ─► parse ─► DO.dispatch() (atomic check-and-lock) ─► NDJSON stream @ 0/140/380/800 ms
              ├── POST /v1/waitlist ─► D1 (meatspace-waitlist)
              └── /install.sh, /docs (text/plain for curl)
```

| Piece | Where |
| --- | --- |
| Wire contract, seed orderbook, pure dispatch state machine | `shared/` (imported by both SPA and Worker) |
| Worker routes, NDJSON streaming, waitlist, installer | `worker/` |
| `NetworkState` Durable Object (SQLite-backed, single global instance) | `worker/network.ts` |
| SPA (React 19, Tailwind v4, lucide) | `src/` |
| D1 schema | `migrations/` |
| Product handoff and implementation decisions | `docs/handoff-v0.1.md`, `docs/DECISIONS.md` |

The Tailwind palette is closed to the seven handoff colours (`bg`, `panel`, `line`, `fg`, `muted`, `emerald`, `amber`). Default colours, radii and shadows are removed in `src/index.css`. The e2e suite audits computed styles on the rendered page.

## API

| Method | Path | |
| --- | --- | --- |
| GET | `/v1` | endpoint index |
| GET | `/v1/snapshot` | stats + nodes in one document |
| GET | `/v1/nodes`, `/v1/nodes/:id` | orderbook |
| GET | `/v1/stats` | ticker stats |
| GET | `/v1/stream` | WebSocket, `{"type":"snapshot"}` frames every ~2 s |
| POST | `/v1/dispatch` | task a node, `application/x-ndjson` event stream |
| POST | `/v1/waitlist` | API key / hardware operator queue |
| GET | `/install.sh` | inert dry-run installer for `meatspaced` |
| GET | `/docs` | man page (HTML for browsers, text for curl) |

Full reference: [`/docs`](https://meatspace.sh/docs).

## Develop

```sh
npm install
npm run db:migrate:local   # local D1 schema
npm run dev                # Vite + workerd (DO, D1, rate limits all local)
```

```sh
npm run typecheck
npm test                   # vitest: worker project (workerd) + unit project (node, incl. install.sh under sh and dash)
npm run test:e2e           # Playwright against the production build in workerd, fresh state per run
npm run lint
```

## Deploy

See [`docs/DEPLOY.md`](./docs/DEPLOY.md). Short version: `CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… npm run deploy`.

## License

MIT
