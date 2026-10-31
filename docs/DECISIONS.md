# v0.1 implementation decisions

Choices made on top of [`handoff-v0.1.md`](./handoff-v0.1.md), confirmed with the product owner before build.

## Platform
- **All-in on Cloudflare.** One Worker serves the SPA from Workers Static Assets and the `/v1` API (Hono).
- **Durable Object `NetworkState`** (SQLite-backed, single global instance) owns live network state: ticker stats, node battery/duty drift, task locks, settled volume. It ticks every 2 s while a viewer is connected, a node is TASKED, or a battery node is CHARGING, pushing a full snapshot to every viewer over a hibernatable WebSocket (`/v1/stream`) on each tick and state change, and idles (no alarms) otherwise.
- **D1** stores waitlist sign-ups from `[ API KEYS ]` and `[ CONNECT HARDWARE (meatspaced) ]`.
- **Workers Rate Limiting** bindings throttle `POST /v1/dispatch` (20/min) and `POST /v1/waitlist` (5/min) per client, where a client is an IPv4 address or an IPv6 /64 (one subscriber's allocation, so rotating addresses inside it buys nothing).
- Custom domain: apex `meatspace.sh` via Workers Custom Domains.

## API is real, hardware is simulated
- `POST /v1/dispatch` is a real endpoint: the curl shown in the console works from any terminal. It validates the payload, runs the VALIDATE → ESCROW → COMPILE → ATTEST state machine against live node state, and streams `application/x-ndjson` events at the handoff's offsets (00 / 140 / 380 / 800 ms).
- Settlement, telemetry and attestation are simulated (`"sandbox": true` on every receipt). The site says so in the footer and docs.
- A successful dispatch locks the node (`TASKED`, amber) for 30 s for every viewer, and adds the escrow to 24H SETTLED VOLUME.
- On release a battery node goes `CHARGING`, then `DOCKED` at 95%; a fully charged `DOCKED` node occasionally (1% chance per 2 s tick) undocks to `IDLE`, and an `IDLE` node heads back to `CHARGING` 1% above the charge its own canonical payload needs. So `IDLE` and `DOCKED` always mean dispatchable, and the orderbook shows a node as available only when it is not `TASKED` and holds at least that charge. Mains cells go straight back to `IDLE`. While `TASKED` the simulated battery drains at 5x real time.
- **Per-client lock quota:** one client may hold at most 2 task locks at once (`ERR_LOCK_QUOTA`, HTTP 429 at ESCROW, with `retry-after`), so nobody can keep the whole 10-node orderbook `TASKED` within the rate limit. Clients are keyed like the rate limits (IPv4 address or IPv6 /64); the Durable Object stores only a truncated SHA-256 of that key, and never publishes lock holders.
- **Minimum billable duration:** `est_duration_min` must be at least 1 (pay-per-minute), which also rules out $0.00 escrows: a near-zero duration used to buy a 30 s lock for nothing. `max_spend_usdc` is compared with the escrow exactly as sent, never rounded.
- Failures are first-class: geofence, altitude envelope, RTL reserve, battery, work envelope, tolerance, busy node, lock quota, spend cap. HTTP status reflects the outcome (200 / 404 / 409 / 422 / 429) even though the body streams.

## Data
- 10 nodes (4 aerial, 3 ground, 3 manipulator/CNC), real industrial sites.
- The handoff's example coordinates were corrected where they were geographically wrong: `31.9686° N, 99.9018° W` is the geographic centre of Texas, not the Permian Basin, so the Permian node sits at Midland/Odessa (`31.9973° N, 102.0779° W`). The Rotterdam node sits at Europoort (`51.9496° N, 4.1453° E`) rather than the city centre.
- A fourth interface, `OPC UA`, is used for the 5-axis CNC cell (machine tools rarely speak ROS 2 / MAVLink / VDA 5050).
- The install snippet in the original handoff contained a pasted markdown-link artifact (`[https://…](https://…)`); it is rendered as the plain URL.
- `BATTERY / DUTY`: battery state of charge for mobile nodes; available duty headroom for mains-powered cells.
- Default console node `VTOL-260-TX-04` at `$3.40 / min × 12.5 min = $42.50` escrow, matching the handoff exactly.
- `[ TASK NODE ]` geometry is anchored at the node's home position, so the payload carries that node's own coordinates: ground and CNC `site` is the node position exactly, and the aerial corridor (6 km × 0.6 km, running east) has the home pad as its first and last vertex. Its far corner is ~6.03 km out, inside the smallest aerial geofence (8 km).

## Extras
- `GET /install.sh` serves an inert POSIX `sh` script: it parses flags, prints what it would do, and exits 0 without touching the host. `meatspaced` itself is not released.
- `/docs` is a man(1)-style API reference. `curl https://meatspace.sh/docs` returns the same page as plain text.
- Static OG card, favicon and meta tags.
- Palette is closed in Tailwind (`--color-*: initial`): only the seven handoff colours exist. Failures use amber, there is no red.
- Muted text `#64748B` is the handoff's own Text Muted and is kept, although it reaches only 3.9:1 on panels (`#111318`) and 4.2:1 on the background: it is used for labels and decoration, while essential data uses Text Primary `#E2E8F0` (15:1).
