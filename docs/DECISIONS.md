# v0.1 implementation decisions

Choices made on top of [`handoff-v0.1.md`](./handoff-v0.1.md), confirmed with the product owner before build.

## Platform
- **All-in on Cloudflare.** One Worker serves the SPA from Workers Static Assets and the `/v1` API (Hono).
- **Durable Object `NetworkState`** (SQLite-backed, single global instance) owns live network state: ticker stats, node battery/duty drift, task locks, settled volume. It pushes full snapshots to every viewer over a hibernatable WebSocket (`/v1/stream`) every 2 s while anyone is connected, and idles (no alarms) when nobody is.
- **D1** stores waitlist sign-ups from `[ API KEYS ]` and `[ CONNECT HARDWARE (meatspaced) ]`.
- **Workers Rate Limiting** bindings throttle `POST /v1/dispatch` (20/min/IP) and `POST /v1/waitlist` (5/min/IP).
- Custom domain: apex `meatspace.sh` via Workers Custom Domains.

## API is real, hardware is simulated
- `POST /v1/dispatch` is a real endpoint: the curl shown in the console works from any terminal. It validates the payload, runs the VALIDATE → ESCROW → COMPILE → ATTEST state machine against live node state, and streams `application/x-ndjson` events at the handoff's offsets (00 / 140 / 380 / 800 ms).
- Settlement, telemetry and attestation are simulated (`"sandbox": true` on every receipt). The site says so in the footer and docs.
- A successful dispatch locks the node (`TASKED`, amber) for 30 s for every viewer, and adds the escrow to 24H SETTLED VOLUME.
- Failures are first-class: geofence, altitude envelope, RTL reserve, battery, work envelope, tolerance, busy node, spend cap. HTTP status reflects the outcome (200 / 404 / 409 / 422) even though the body streams.

## Data
- 10 nodes (4 aerial, 3 ground, 3 manipulator/CNC), real industrial sites.
- The handoff's example coordinates were corrected where they were geographically wrong: `31.9686° N, 99.9018° W` is the geographic centre of Texas, not the Permian Basin, so the Permian node sits at Midland/Odessa (`31.9973° N, 102.0779° W`). The Rotterdam node sits at Europoort (`51.9496° N, 4.1453° E`) rather than the city centre.
- A fourth interface, `OPC UA`, is used for the 5-axis CNC cell (machine tools rarely speak ROS 2 / MAVLink / VDA 5050).
- The install snippet in the original handoff contained a pasted markdown-link artifact (`[https://…](https://…)`); it is rendered as the plain URL.
- `BATTERY / DUTY`: battery state of charge for mobile nodes; available duty headroom for mains-powered cells.
- Default console node `VTOL-260-TX-04` at `$3.40 / min × 12.5 min = $42.50` escrow, matching the handoff exactly.

## Extras
- `GET /install.sh` serves an inert POSIX `sh` script: it parses flags, prints what it would do, and exits 0 without touching the host. `meatspaced` itself is not released.
- `/docs` is a man(1)-style API reference. `curl https://meatspace.sh/docs` returns the same page as plain text.
- Static OG card, favicon and meta tags.
- Palette is closed in Tailwind (`--color-*: initial`): only the seven handoff colours exist. Failures use amber, there is no red.
