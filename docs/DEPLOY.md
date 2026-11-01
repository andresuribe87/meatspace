# Deploying meatspace.sh

One Worker (`meatspace`) carries everything: static assets, the `/v1` API, the `NetworkState` Durable Object, the D1 waitlist and two rate limiters. The apex `meatspace.sh` is attached as a Workers Custom Domain.

## 1. API token

Use an **account-owned** token (dashboard → Manage account → Account API tokens, or Terraform `cloudflare_account_token`). Wrangler accepts it as long as `CLOUDFLARE_ACCOUNT_ID` is also set, and it needs no user-level permissions. Minimum set:

| Resource | Permission group | Why |
| --- | --- | --- |
| Account | Workers Scripts Write | upload the Worker, static assets, Durable Object migration, bindings |
| Account | D1 Write | auto-provision `meatspace-waitlist`, apply migrations |
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

`npm run deploy` runs `vite build`, then `wrangler deploy` on the build output, then `wrangler d1 migrations apply DB --remote`, then `npm run deploy:www` (the `meatspace-www` redirect Worker in `www/`, Custom Domain `www.meatspace.sh` → 301 to the apex).

On the first deploy, wrangler auto-provisions the D1 database `meatspace-waitlist` because `wrangler.jsonc` declares the binding without a `database_id`. It also creates the `NetworkState` SQLite Durable Object class (migration tag `v1`) and binds `meatspace.sh` as a Custom Domain, which creates the DNS record and certificate.

Precondition: neither `meatspace.sh` nor `www.meatspace.sh` may have an existing A/AAAA/CNAME record. A Custom Domain cannot be created over an existing record.

## 3. Verify

```sh
curl -s https://meatspace.sh/healthz                     # ok
curl -s https://meatspace.sh/v1/snapshot | head -c 300
curl -sN -X POST https://meatspace.sh/v1/dispatch \
  -H 'content-type: application/json' -d @- <<'JSON'
{"primitive":"SUBSTATION_THERMAL_SWEEP","node_id":"SPOT-SUB-44","intent":"INSPECT_ASSET","site":{"type":"Point","coordinates":[-95.201,29.731]},"assets":["XFMR-T1"],"route":"PATROL_LOOP_B","thresholds":{"delta_t_alarm_c":15,"emissivity":0.95},"est_duration_min":18,"max_spend_usdc":40,"proof":{"attestation":"TPM2_QUOTE","artifacts":["ROSBAG2_MCAP"]}}
JSON
curl -s https://meatspace.sh/docs | head -20
curl -s https://meatspace.sh/install.sh | sh -s -- --protocol=mavlink --rtk-verify   # inert dry run
```

## Operations

- **Waitlist rows:** `npx wrangler d1 execute DB --remote --command "SELECT kind, email, protocol, fleet_size, created_at FROM waitlist ORDER BY id DESC LIMIT 50"`
- **Reseeding network state:** static node fields (chassis, coordinates, rates, geofences, envelopes, …) come from `shared/nodes.ts` on every restart, so an edit there reaches the live instance with the next deploy. Only live fields persist in the Durable Object's storage (keys `snapshot` and `owners`): charge, status, task locks and their holders, ticker stats and `seq`. To reset those as well, add a migration that deletes `NetworkState` and re-creates it under a new class name, which wipes its storage.
- **Cost profile:** the DO only ticks (alarm every 2 s) while a WebSocket viewer is connected, a node is TASKED, or a battery node is CHARGING. Browsers close their socket when the tab is hidden. Once nobody is watching and every lock and charge cycle has finished, the DO goes idle.
- **Rate limits and lock quota:** `DISPATCH_LIMITER` 20/min and `WAITLIST_LIMITER` 5/min per client, where a client is an IPv4 address or an IPv6 /64 (namespace IDs `4701` and `4702` must be unique in the account). Each client may also hold at most 2 task locks at once (`MAX_ACTIVE_LOCKS_PER_CLIENT`); lock holders are stored as a truncated SHA-256 of the client network, never as an address.
