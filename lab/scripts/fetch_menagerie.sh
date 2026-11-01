#!/usr/bin/env bash
# Fetch the MuJoCo Menagerie twins at the commit the committed reports were made with.
set -euo pipefail
cd "$(dirname "$0")/.."
SHA=${MENAGERIE_SHA:-b0655057a9df2abe39ea7fc989914ba6f248301c}
DIR=.cache/menagerie
if [ ! -d "$DIR/.git" ]; then
  git clone -q --filter=blob:none --no-checkout https://github.com/google-deepmind/mujoco_menagerie.git "$DIR"
fi
git -C "$DIR" sparse-checkout set trs_so_arm100 robotstudio_so101
if ! git -C "$DIR" cat-file -e "$SHA^{commit}" 2>/dev/null; then
  if ! git -C "$DIR" fetch -q origin "$SHA"; then
    echo "error: cannot fetch Menagerie commit $SHA from origin (network? sha rewritten upstream?)" >&2
    exit 1
  fi
fi
git -C "$DIR" checkout -q "$SHA"
echo "menagerie @ $(git -C "$DIR" rev-parse HEAD)"
