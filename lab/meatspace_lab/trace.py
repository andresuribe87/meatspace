"""Per-frame trace export for one representative held-out episode of a report (schema ``TRACE_SCHEMA``).

``export_trace`` re-runs exactly the replay that produced a committed ``report.json``, for one episode:

* the dataset is loaded at the report's pinned revision sha, and every data file's sha256 must equal the one the
  report recorded (``dataset.files``);
* units are detected on the report's FIT episodes, the sign gate runs on the fit episodes, and both must reproduce the
  report's ``units`` and ``mapping`` blocks;
* the twin directory's content sha256 must equal ``twin.twin_dir_content_sha256``;
* stock = the Menagerie MJCF as published; calibrated = the report's ``calibrated_twin.json`` (hash-checked against
  ``package.sha256``); baseline = the physics-free lag filter refitted on the fit episodes, which must reproduce
  ``fit.baseline`` (the fit is deterministic);
* the episode is ``plots.episode_index`` (the future-block episode with the median stock arm-mean RMSE, the one in
  ``heldout_episode.svg``).

The per-joint RMSE of every model over the full-resolution episode is then compared with that episode's row of
``report.json`` ``episodes`` (3 decimals there); a mismatch beyond ``RMSE_TOL`` raises. The written series are rounded
to 2 decimals (degrees) and, only if the file would exceed ``max_bytes``, decimated by an integer factor (every k-th
frame from frame 0, no filtering), which is recorded.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import mujoco
import numpy as np

from . import __version__, baseline, data, metrics, sysid, units
from .replay import EpisodeData, Replayer, replay_episodes
from .twin import Twin, canonical_json, load_package, nominal_mapping, resolve_signs, twin_content_sha256

TRACE_SCHEMA = "meatspace.twin-trace/v1"
TRACE_FILE = "trace.json"
MAX_BYTES = 150_000
DIGITS = 2
# report.json episode rows are rounded to 3 decimals; the calibrated package's parameters are rounded to
# twin.PRECISION (the report replayed the unrounded optimum), which moves an episode RMSE by far less than this.
RMSE_TOL = 0.002
MODELS = ("stock", "baseline", "calibrated")
SERIES = ("cmd", "real", "stock", "baseline", "cal")


class TraceError(RuntimeError):
    """The replay could not be reproduced from the committed report (wrong data, twin, package or code)."""


def _hash(obj: dict) -> str:
    return hashlib.sha256(canonical_json({k: v for k, v in obj.items() if k != "sha256"}).encode()).hexdigest()


def trace_sha256(trace: dict) -> str:
    """sha256 of the canonical JSON of the trace without its own ``sha256`` field."""
    return _hash(trace)


def _report_content_sha256(rep: dict) -> str:
    from .report import content_sha256

    return content_sha256(rep)


def snapshot_dir(cache_dir: str | Path, repo_id: str, sha: str) -> Path:
    """Where huggingface_hub keeps a dataset snapshot at a commit."""
    return Path(cache_dir) / f"datasets--{repo_id.replace('/', '--')}" / "snapshots" / sha


def load_dataset(rep: dict, cache_dir: str | Path, local: str | Path | None = None) -> data.Dataset:
    """The report's dataset at its pinned sha: a local copy if given, else the Hub cache, else the Hub."""
    d = rep["dataset"]
    root = Path(local) if local else snapshot_dir(cache_dir, d["id"], d["revision_sha"])
    if root.is_dir():
        return data.load_local(root, d["id"], d["revision_requested"], d["revision_sha"],
                               max_episodes=d["max_episodes_loaded"])
    return data.load_hub(d["id"], d["revision_sha"], cache_dir=cache_dir, max_episodes=d["max_episodes_loaded"])


def _check(cond: bool, what: str) -> None:
    if not cond:
        raise TraceError(what)


def _round(a: np.ndarray, k: int) -> list[float]:
    return [round(float(v), DIGITS) + 0.0 for v in np.asarray(a)[::k]]


def export_trace(report_dir: str | Path, twin_dir: str | Path, cache_dir: str | Path = ".cache/hf",
                 local: str | Path | None = None, nthread: int = 2, max_bytes: int = MAX_BYTES) -> dict:
    """Reproduce the report's replay for its representative future-block episode; return the trace dict."""
    report_dir = Path(report_dir)
    rep = json.loads((report_dir / "report.json").read_text())
    _check(rep.get("schema") == "meatspace.twin-gap-report/v2", f"unsupported report schema {rep.get('schema')!r}")
    _check(_report_content_sha256(rep) == rep.get("content_sha256"), "report.json content_sha256 mismatch (edited?)")
    _check(rep.get("status") == "ok", f"report status is {rep.get('status')!r}: an unsupported report has no replay")

    ds = load_dataset(rep, cache_dir, local)
    files = [{"path": f["path"], "sha256": f["sha256"]} for f in ds.files]
    want = [{"path": f["path"], "sha256": f["sha256"]} for f in rep["dataset"]["files"]]
    _check(ds.sha == rep["dataset"]["revision_sha"], "dataset revision sha differs from the report")
    _check(files == want, "dataset files (path + sha256) differ from the ones the report recorded")

    sp = rep["split"]
    raw = {e.index: e for e in ds.episodes}
    _check(set(sp["fit"]) | set(sp["interleaved_heldout"]) | set(sp["future_heldout"]) == set(raw),
           "loaded episodes differ from the report's split")
    verdict = units.detect_units(ds.names, np.concatenate([raw[i].state for i in sp["fit"]]))
    _check(json.loads(json.dumps(verdict.to_dict())) == {k: rep["units"][k] for k in verdict.to_dict()},
           "units verdict on the fit episodes differs from the report")

    twin = Twin(twin_dir, ds.fps)
    _check(twin.spec_def.name == rep["twin"]["id"], f"twin {twin.spec_def.name} is not the report's {rep['twin']['id']}")
    _check(twin_content_sha256(twin_dir) == rep["twin"]["twin_dir_content_sha256"],
           "twin directory content sha256 differs from the report (different Menagerie checkout?)")
    _check(abs(twin.timestep - rep["twin"]["timestep_used"]) < 1e-15 and twin.substeps == rep["twin"]["substeps_per_frame"],
           "replay timestep/substeps differ from the report")

    def eps(ids):
        return [EpisodeData(i, units.to_physical_degrees(raw[i].state, ds.names, verdict),
                            units.to_physical_degrees(raw[i].action, ds.action_names, verdict)) for i in ids]

    fit_eps = eps(sp["fit"])
    mapping = nominal_mapping(twin.spec_def, twin.base, verdict.zero_reference)
    mapping, _, why = resolve_signs(twin, mapping, np.concatenate([e.x for e in fit_eps]),
                                    rep["fit"]["config"]["offset_bound_deg"])
    _check(why is None and mapping.to_dict() == rep["mapping"], "joint mapping differs from the report")

    pkg, p_cal = load_package(report_dir / rep["package"]["file"])
    _check(pkg["sha256"] == rep["package"]["sha256"], "calibrated_twin.json is not the report's package")
    _check(p_cal.to_dict() == rep["fit"]["calibrated"]["params"], "package parameters differ from report fit.calibrated")
    stock = twin.stock.copy()
    _check(stock.to_dict() == rep["twin"]["stock_params"], "stock twin parameters differ from the report")

    bl = baseline.fit(fit_eps)
    _check(json.loads(json.dumps(bl.to_dict())) == rep["fit"]["baseline"], "refitted baseline differs from the report")

    pl = rep["plots"]
    k_ep, ep_set = int(pl["episode_index"]), pl["episode_set"]
    _check(ep_set == "future" and k_ep in sp["future_heldout"], "plots.episode_index is not a future-block episode")
    row = next(r for r in rep["episodes"] if r["episode"] == k_ep and r["set"] == ep_set)
    # the report picks the median of the future block by stock arm-mean RMSE: re-derive it from the table
    fut = [r for r in rep["episodes"] if r["set"] == "future"]
    order = sorted(fut, key=lambda r: float(np.mean(r["stock_rmse_deg"])))
    _check(order[len(order) // 2]["episode"] == k_ep or
           math.isclose(np.mean(order[len(order) // 2]["stock_rmse_deg"]), np.mean(row["stock_rmse_deg"]), abs_tol=1e-3),
           "plots.episode_index is not the median stock-RMSE future episode")

    (e,) = eps([k_ep])
    R = Replayer(twin, nthread=nthread)
    try:
        sim = {name: replay_episodes(R, [e], mapping, p, sysid.build_model(twin, p))[0]
               for name, p in (("stock", stock), ("calibrated", p_cal))}
    finally:
        R.close()
    sim["baseline"] = bl.predict(e)
    rmse = {name: metrics.episode_metrics(e.x, e.a, sim[name])["sim_vs_real_rmse"] for name in MODELS}
    worst = 0.0
    for name in MODELS:
        d = float(np.max(np.abs(rmse[name] - np.asarray(row[f"{name}_rmse_deg"]))))
        worst = max(worst, d)
        _check(d <= RMSE_TOL, f"{name} RMSE of episode {k_ep} differs from report.json by {d:.4f} deg "
                              f"(> {RMSE_TOL}): {np.round(rmse[name], 4).tolist()} vs {row[f'{name}_rmse_deg']}")

    J = list(units.ARM)
    T = e.n
    cols = {"cmd": e.a[:, :5], "real": e.x[:, :5], "stock": sim["stock"], "baseline": sim["baseline"],
            "cal": sim["calibrated"]}

    def build(k: int) -> dict:
        idx = np.arange(0, T, k)
        return {
            "schema": TRACE_SCHEMA,
            "report_id": report_dir.resolve().name,
            "dataset": {"id": rep["dataset"]["id"], "revision_sha": rep["dataset"]["revision_sha"]},
            "twin": {"id": rep["twin"]["id"], "menagerie_sha": rep["twin"]["menagerie_sha"]},
            "episode": {"index": k_ep, "set": ep_set, "frames": T,
                        "selection": "future-block held-out episode with the median stock-twin arm-mean RMSE "
                                     "(report.json plots.episode_index; the episode in heldout_episode.svg)"},
            "units": "deg",
            "fps": ds.fps,
            "decimation": k,
            "fps_series": ds.fps / k,
            "frame": idx.tolist(),
            "t": [round(float(i) / ds.fps, 4) + 0.0 for i in idx],
            "joints": J,
            "series_keys": {"cmd": "recorded command a[t]", "real": "recorded follower state x[t]",
                            "stock": "stock twin (Menagerie MJCF as published), open-loop replay",
                            "baseline": "physics-free lag filter (fit.baseline), same fit episodes",
                            "cal": "calibrated twin (calibrated_twin.json), open-loop replay"},
            "series": {j: {s: _round(cols[s][:, i], k) for s in SERIES} for i, j in enumerate(J)},
            "rmse_deg": {name: [round(float(v), 3) + 0.0 for v in rmse[name]] for name in MODELS},
            "rmse_definition": "per joint, RMSE of sim[t] - real[t] over t = 1..T-1 at full resolution (frames, not "
                               "the decimated series); equals report.json episodes[] for this episode",
            "check": {"report_episode_row": {f"{n}_rmse_deg": row[f"{n}_rmse_deg"] for n in MODELS},
                      "max_abs_diff_deg": round(worst, 5) + 0.0, "tolerance_deg": RMSE_TOL},
            "replay": rep["conventions"]["replay"],
            "provenance": {
                "report_file": "report.json",
                "report_content_sha256": rep["content_sha256"],
                "report_results_sha256": rep["results_sha256"],
                "dataset_revision_sha": rep["dataset"]["revision_sha"],
                "dataset_files_sha256": [f["sha256"] for f in rep["dataset"]["files"]],
                "package_file": rep["package"]["file"],
                "package_sha256": rep["package"]["sha256"],
                "twin_dir_content_sha256": rep["twin"]["twin_dir_content_sha256"],
                "episode_index": k_ep,
                "json_paths": {"episode": "/plots/episode_index", "rmse": f"/episodes/{rep['episodes'].index(row)}",
                               "baseline": "/fit/baseline", "replay": "/conventions/replay"},
                "exporter": f"meatspace_lab {__version__} export-trace",
                "mujoco": mujoco.__version__,
                "report_mujoco": rep["environment"]["mujoco"],
            },
        }

    k = 1
    while True:
        tr = build(k)
        tr["sha256"] = trace_sha256(tr)
        if len(json.dumps(tr, separators=(",", ":"))) <= max_bytes or k >= T:
            return tr
        k += 1


def write_trace(trace: dict, report_dir: str | Path) -> Path:
    out = Path(report_dir) / TRACE_FILE
    out.write_text(json.dumps(trace, separators=(",", ":")) + "\n")
    return out
