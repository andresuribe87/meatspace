#!/usr/bin/env bash
# Regenerate every report of the candidate pool + INDEX.md (from lab/, with the venv or PY set).
# Selection rule (reports/candidates.json): every candidate whose compatibility scan passed is run, at its pinned sha,
# with the same configuration, and is listed in INDEX.md whatever its result. At most the first 200 episodes by index
# are loaded (compute cap). Measured: 62-65 min (3710 s, 3897 s) on a 4-vCPU Intel Xeon @ 2.80GHz (AVX-512) for 23 datasets; raise
# --time-limit on much slower machines so no fit hits the wall-clock safety limit (that would break bit-reproducibility).
set -uo pipefail
cd "$(dirname "$0")/.."
PY=${PY:-.venv/bin/python}
M=.cache/menagerie
LOG=${LOG:-.cache/run_all.log}
mkdir -p .cache
fail=0
while IFS=$'\t' read -r id sha twin; do
  out="reports/${id//\//__}"
  echo "=== $id @ $sha ($twin)" | tee -a "$LOG"
  if ! "$PY" -m meatspace_lab report --dataset "$id" --revision "$sha" --twin "$M/$twin" --out "$out/" \
       --max-episodes 200 >> "$LOG" 2>&1; then
    echo "FAILED: $id (see $LOG)" | tee -a "$LOG"
    fail=1
  fi
done < <("$PY" -c '
import json
for c in json.load(open("reports/candidates.json"))["candidates"]:
    if c["scan_verdict"] == "ok":
        print(c["dataset"], c["sha"], c["twin"], sep="\t")
')
"$PY" -m meatspace_lab index --reports reports
exit $fail
