# Deploying meatspace.sh

One Worker (`meatspace`) carries everything: static assets, the `/v1` API, the `NetworkState` Durable Object, the D1 waitlist and two rate limiters. The apex `meatspace.sh` is attached as a Workers Custom Domain.

## 1. API token

Create a token at **dash.cloudflare.com → My Profile → API Tokens → Create Token**. Start from the **Edit Cloudflare Workers** template, then:

| Scope | Permission | Why |
| --- | --- | --- |
| Account → Workers Scripts | Edit | upload the Worker, Durable Object migrations |
| Account → D1 | Edit | auto-provision `meatspace-waitlist`, apply migrations |
| Account → Account Settings | Read | wrangler account lookup |
| Zone `meatspace.sh` → Workers Routes | Edit | attach the Custom Domain |
| Zone `meatspace.sh` → Zone | Read | resolve the zone for the Custom Domain |
| User → Memberships, User Details | Read | wrangler `whoami` (included in the template) |

Limit **Account Resources** to your account and **Zone Resources** to `meatspace.sh`.

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

`npm run deploy` runs `vite build`, then `wrangler deploy` on the build output, then `wrangler d1 migrations apply DB --remote`.

On the first deploy, wrangler auto-provisions the D1 database `meatspace-waitlist` because `wrangler.jsonc` declares the binding without a `database_id`. It also creates the `NetworkState` SQLite Durable Object class (migration tag `v1`) and binds `meatspace.sh` as a Custom Domain, which creates the DNS record and certificate.

Precondition: `meatspace.sh` must have no existing A/AAAA/CNAME record at the apex. A Custom Domain cannot be created over an existing record.

## 3. Verify

```sh
curl -s https://meatspace.sh/healthz                     # ok
curl -s https://meatspace.sh/v1/snapshot | head -c 300
curl -sN -X POST https://meatspace.sh/v1/dispatch \
  -H 'content-type: application/json' -d @- <<'JSON'
{"primitive":"SUBSTATION_THERMAL_SWEEP","node_id":"SPOT-SUB-44","intent":"INSPECT_ASSET","site":{"type":"Point","coordinates":[-95.19914,29.73262]},"assets":["XFMR-T1"],"route":"PATROL_LOOP_B","thresholds":{"delta_t_alarm_c":15,"emissivity":0.95},"est_duration_min":18,"max_spend_usdc":40,"proof":{"attestation":"TPM2_QUOTE","artifacts":["ROSBAG2_MCAP"]}}
JSON
curl -s https://meatspace.sh/docs | head -20
curl -s https://meatspace.sh/install.sh | sh -s -- --protocol=mavlink --rtk-verify   # inert dry run
```

## Operations

- **Waitlist rows:** `npx wrangler d1 execute DB --remote --command "SELECT kind, email, protocol, fleet_size, created_at FROM waitlist ORDER BY id DESC LIMIT 50"`
- **Reseeding network state:** the Durable Object persists its snapshot under the storage key `snapshot`, so editing `shared/nodes.ts` does not change a live instance. To reseed, add a migration that deletes `NetworkState` and re-creates it under a new class name, which wipes its storage.
- **Cost profile:** the DO only ticks (alarm every 2 s) while at least one WebSocket viewer is connected or a node is locked. Browsers close their socket when the tab is hidden. With nobody watching, the DO goes idle.
- **Rate limits:** `DISPATCH_LIMITER` 20/min/IP and `WAITLIST_LIMITER` 5/min/IP (namespace IDs `4701` and `4702` must be unique in the account).
