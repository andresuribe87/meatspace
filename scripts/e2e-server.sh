#!/bin/sh
# Serve the production build (Worker + DO + D1 in workerd) on a fresh local state dir.
set -eu
PORT="${1:-4173}"
STATE=".wrangler/state-e2e"
rm -rf "$STATE"
CI=1 npx wrangler d1 migrations apply DB --local --persist-to "$STATE" >/dev/null
MS_STATE_DIR="$STATE" exec npx vite preview --port "$PORT" --strictPort
