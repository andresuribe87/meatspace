"""Loading LeRobot-format datasets from the Hugging Face Hub at a pinned revision.

Only the tabular part is fetched (meta/info.json + data/**/*.parquet); videos are never
downloaded. The requested revision (branch, tag or sha) is resolved to an immutable commit
sha *before* anything is downloaded, and every file is fetched at that sha, so a report is
reproducible even if the dataset repo moves on. Each downloaded file's sha256 is recorded.

Supports LeRobot codebase v2.0/v2.1 (one parquet per episode) and v3.0 (many episodes per
parquet file): in both cases all rows are read and grouped by ``episode_index``.
"""

from __future__ import annotations

import hashlib
import json
import os
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import pyarrow.parquet as pq

SUPPORTED_CODEBASES = ("v2.0", "v2.1", "v3.0")
COLUMNS = ("action", "observation.state", "episode_index", "frame_index", "timestamp")


@dataclass
class Episode:
    index: int
    action: np.ndarray  # (T, D) float64, raw dataset units
    state: np.ndarray  # (T, D) float64, raw dataset units
    frame_index: np.ndarray
    timestamp: np.ndarray

    @property
    def n(self) -> int:
        return int(self.action.shape[0])


@dataclass
class Dataset:
    repo_id: str
    revision_requested: str
    sha: str
    info: dict
    episodes: list[Episode]
    files: list[dict] = field(default_factory=list)
    dropped: list[dict] = field(default_factory=list)
    timestamp_max_dev_s: float = float("nan")  # max |timestamp - frame_index/fps| over loaded episodes
    max_episodes: int | None = None

    @property
    def fps(self) -> float:
        return float(self.info["fps"])

    @property
    def names(self) -> list[str]:
        return list(_feature_names(self.info, "observation.state"))

    @property
    def action_names(self) -> list[str]:
        return list(_feature_names(self.info, "action"))

    @property
    def codebase_version(self) -> str:
        return str(self.info.get("codebase_version", "?"))

    @property
    def robot_type(self) -> str:
        return str(self.info.get("robot_type", "?"))

    @property
    def total_frames(self) -> int:
        return int(sum(e.n for e in self.episodes))


def _feature_names(info: dict, key: str) -> list[str]:
    feat = info.get("features", {}).get(key)
    if feat is None:
        raise ValueError(f"dataset has no '{key}' feature")
    names = feat.get("names")
    if isinstance(names, dict):  # some v2.0 datasets: {"motors": [...]}
        names = next(iter(names.values()))
    if not names:
        names = [f"{key}_{i}" for i in range(int(feat["shape"][0]))]
    return [str(n) for n in names]


def sha256_file(path: str | os.PathLike) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def resolve_revision(repo_id: str, revision: str = "main") -> str:
    """Resolve a branch/tag/sha to the immutable commit sha on the Hub."""
    from huggingface_hub import HfApi

    return HfApi().dataset_info(repo_id, revision=revision).sha


def _episode_files(info: dict, max_episodes: int | None) -> set[str] | None:
    """v2.x per-episode parquet paths of episodes 0..max_episodes-1, or None (no restriction)."""
    tpl = info.get("data_path")
    if max_episodes is None or str(info.get("codebase_version")) not in ("v2.0", "v2.1") or not tpl \
            or "episode_index" not in tpl:
        return None
    total = info.get("total_episodes")
    if total is not None and int(total) <= int(max_episodes):
        return None  # the cap does not truncate: load every file, exactly as without it
    cs = int(info.get("chunks_size", 1000))
    return {tpl.format(episode_chunk=i // cs, episode_index=i) for i in range(int(max_episodes))}


def download(repo_id: str, sha: str, cache_dir: str | os.PathLike, max_episodes: int | None = None) -> Path:
    """Download meta/info.json and the data parquet files at exactly ``sha``.

    With ``max_episodes`` on a v2.x dataset (one parquet per episode), only the files of episodes
    0..max_episodes-1 are fetched; v3.0 files hold many episodes and are always fetched whole.
    """
    from huggingface_hub import hf_hub_download, snapshot_download

    patterns = ["meta/info.json", "data/**/*.parquet", "data/*.parquet"]
    if max_episodes is not None:
        info = json.loads(Path(hf_hub_download(repo_id, "meta/info.json", repo_type="dataset", revision=sha,
                                               cache_dir=str(cache_dir))).read_text())
        wanted = _episode_files(info, max_episodes)
        if wanted is not None:
            patterns = ["meta/info.json"] + sorted(wanted)
    local = snapshot_download(repo_id=repo_id, repo_type="dataset", revision=sha, allow_patterns=patterns,
                              cache_dir=str(cache_dir))
    return Path(local)


def _list_column(table, name: str) -> np.ndarray:
    col = table.column(name).combine_chunks()
    flat = col.flatten().to_numpy(zero_copy_only=False)
    return np.asarray(flat, dtype=np.float64).reshape(len(col), -1)


def load_local(
    root: str | os.PathLike,
    repo_id: str = "local",
    revision_requested: str = "local",
    sha: str = "local",
    min_frames: int = 60,
    max_episodes: int | None = None,
) -> Dataset:
    """Load a LeRobot dataset directory (as laid out on the Hub)."""
    root = Path(root)
    info = json.loads((root / "meta" / "info.json").read_text())
    cb = str(info.get("codebase_version", "?"))
    if cb not in SUPPORTED_CODEBASES:
        raise ValueError(f"unsupported LeRobot codebase_version {cb!r} (supported: {SUPPORTED_CODEBASES})")
    files = sorted(p for p in (root / "data").rglob("*.parquet"))
    wanted = _episode_files(info, max_episodes)
    if wanted is not None:  # same file set as download(max_episodes=...), whatever else is cached
        files = [p for p in files if str(p.relative_to(root)) in wanted]
    if not files:
        raise ValueError(f"no parquet files under {root / 'data'}")
    acts, sts, eps, fis, tss = [], [], [], [], []
    file_records = []
    for p in files:
        t = pq.read_table(p, columns=list(COLUMNS))
        acts.append(_list_column(t, "action"))
        sts.append(_list_column(t, "observation.state"))
        eps.append(t.column("episode_index").to_numpy().astype(np.int64).reshape(-1))
        fis.append(t.column("frame_index").to_numpy().astype(np.int64).reshape(-1))
        tss.append(np.asarray(t.column("timestamp").to_numpy(), dtype=np.float64).reshape(-1))
        file_records.append(
            {"path": str(p.relative_to(root)), "sha256": sha256_file(p), "bytes": p.stat().st_size}
        )
    A = np.concatenate(acts)
    S = np.concatenate(sts)
    E = np.concatenate(eps)
    F = np.concatenate(fis)
    TS = np.concatenate(tss)
    fps = float(info["fps"])
    episodes: list[Episode] = []
    dropped: list[dict] = []
    for ep in np.unique(E):
        sel = np.flatnonzero(E == ep)
        order = sel[np.argsort(F[sel], kind="stable")]
        fi, ts = F[order], TS[order]
        reason = None
        if len(order) < min_frames:
            reason = f"too short ({len(order)} < {min_frames} frames)"
        elif not np.array_equal(fi, np.arange(len(fi))):
            reason = "frame_index not contiguous from 0"
        else:
            # NOTE: in every dataset seen so far timestamps are written as frame_index/fps (nominal), so this
            # check cannot fire and real loop timing is unobservable; report.py records the deviation.
            dt = np.diff(ts)
            if np.any(np.abs(dt - 1.0 / fps) > 0.25 / fps):
                reason = f"timestamp jitter > 25% of a frame (max |dt-1/fps| = {np.max(np.abs(dt - 1 / fps)):.4f}s)"
        a, s = A[order], S[order]
        if reason is None and (not np.all(np.isfinite(a)) or not np.all(np.isfinite(s))):
            reason = "non-finite values"
        if reason is not None:
            dropped.append({"episode": int(ep), "reason": reason})
            continue
        episodes.append(Episode(int(ep), a, s, fi, ts))
    if max_episodes is not None:
        episodes = episodes[:max_episodes]
    dev = max((float(np.max(np.abs(e.timestamp - e.frame_index / fps))) for e in episodes), default=float("nan"))
    return Dataset(repo_id, revision_requested, sha, info, episodes, file_records, dropped, dev, max_episodes)


def load_hub(
    repo_id: str,
    revision: str = "main",
    cache_dir: str | os.PathLike = ".cache/hf",
    min_frames: int = 60,
    max_episodes: int | None = None,
) -> Dataset:
    sha = resolve_revision(repo_id, revision)
    root = download(repo_id, sha, cache_dir, max_episodes)
    return load_local(root, repo_id, revision, sha, min_frames=min_frames, max_episodes=max_episodes)
