"""Compatibility scan of a Hub dataset without downloading all of it (meta + first data file)."""

from __future__ import annotations

import json

import numpy as np
import pyarrow.parquet as pq

from . import units
from .data import SUPPORTED_CODEBASES, _feature_names, _list_column, resolve_revision


def scan(repo_id: str, revision: str = "main", cache_dir: str = ".cache/hf") -> dict:
    from huggingface_hub import HfApi, hf_hub_download

    out: dict = {"dataset": repo_id, "revision_requested": revision}
    try:
        sha = resolve_revision(repo_id, revision)
        out["sha"] = sha
        info = json.loads(open(hf_hub_download(repo_id, "meta/info.json", repo_type="dataset",
                                               revision=sha, cache_dir=cache_dir)).read())
        out.update({k: info.get(k) for k in ("codebase_version", "robot_type", "fps", "total_episodes",
                                             "total_frames")})
        if info.get("codebase_version") not in SUPPORTED_CODEBASES:
            out["verdict"] = f"unsupported codebase {info.get('codebase_version')}"
            return out
        names = _feature_names(info, "observation.state")
        out["names"] = names
        try:
            units.map_names(names)
        except ValueError as e:
            out["verdict"] = f"not a single SO arm: {e}"
            return out
        files = sorted(f for f in HfApi().list_repo_files(repo_id, repo_type="dataset", revision=sha)
                       if f.startswith("data/") and f.endswith(".parquet"))
        out["n_data_files"] = len(files)
        S = []
        for f in files[: 3]:
            t = pq.read_table(hf_hub_download(repo_id, f, repo_type="dataset", revision=sha, cache_dir=cache_dir),
                              columns=["observation.state"])
            S.append(_list_column(t, "observation.state"))
        S = np.concatenate(S)
        v = units.detect_units(names, S)
        out["units"] = {"supported": v.supported, "reason": v.reason, "convention": v.convention,
                        "kinds": [e.kind for e in v.encodings], "range_ticks": [e.range_ticks for e in v.encodings]}
        out["verdict"] = "ok" if v.supported else "unsupported units"
    except Exception as e:  # noqa: BLE001 - scan is best-effort reporting
        out["verdict"] = f"error: {type(e).__name__}: {e}"
    return out
