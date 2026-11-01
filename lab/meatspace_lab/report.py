"""Twin Gap Report pipeline and writers (report.json, report.md, SVG plots, calibrated twin package)."""

from __future__ import annotations

import hashlib
import json
import platform
import subprocess
import time
from pathlib import Path

import mujoco
import numpy as np

from . import REPORT_SCHEMA, __version__, audit, baseline, kinematics, metrics, plots, sysid, units
from .data import Dataset
from .metrics import _r
from .replay import EpisodeData, Replayer, replay_episodes
from .twin import (Twin, TwinParams, canonical_json, make_package, menagerie_sha, nominal_mapping, resolve_signs,
                   twin_content_sha256)

MENAGERIE_REPO = "https://github.com/google-deepmind/mujoco_menagerie"
SETS = ("fit", "interleaved", "future")  # evaluation sets; the last two are held out
HELDOUT = ("interleaved", "future")
SET_TITLE = {
    "future": "Future block (held out: the last 20% of episodes by index, recorded after every fit episode)",
    "interleaved": "Interleaved held-out (random episodes from the same period as the fit episodes)",
    "fit": "Fit episodes (used by the fit)",
}
MODELS = ("stock", "aligned_stock", "baseline", "calibrated")
ALIGNMENT_CONVENTION = {
    "lerobot-legacy": (
        "Legacy LeRobot (ManipulatorRobot.teleop_step, `main_*` names): the goal a[t] is WRITTEN to the follower "
        "first and the follower state x[t] is READ afterwards (a few ms later), so x[t] may already contain a few ms "
        "of response to a[t] (act-then-observe)."),
    "lerobot-motorsbus": (
        "Current LeRobot (record_loop, `*.pos` names): x[t] is READ first (robot.get_observation), then the leader "
        "or policy is read and a[t] is SENT, so x[t] cannot reflect a[t] (observe-then-act)."),
    "replay": (
        "Replay (identical for both conventions): q_sim[0]=x[0] (zero velocity); for t=0..T-2 apply ctrl=a[t-d] "
        "(d = fitted integer command delay, stock d=0) for the whole frame, step `substeps` physics steps (timestep set "
        "so substeps*timestep = 1/fps exactly), record q_sim[t+1]; sim and real are compared at the same index "
        "t=1..T-1. The real sub-frame send-to-read offset (legacy: a[t] sent a few ms BEFORE x[t] is read; current: "
        "a[t] sent a few ms AFTER) is not modelled; it is absorbed by the fitted dynamics/delay, and it shifts lags "
        "between the two conventions by a fraction of a frame in opposite directions."),
}
LAG_DEFINITION = (
    "lag = argmin_L Var(a[t] - y[t+L]) over a fixed window t in [0, T-10), parabolic sub-frame refinement; y = real "
    "or sim state. Includes the 1-frame sampling offset: in the replay and in observe-then-act (current LeRobot) "
    "recordings an instantaneous actuator measures 1.0 frame; in act-then-observe (legacy) recordings it would "
    "measure ~0, and a realistic servo measures its delay minus the few-ms write-to-read gap. Lags are therefore "
    "directly comparable between sim and real within one dataset, and only approximately (fraction of a frame) "
    "across codebases. Also reported in ms, since datasets differ in fps. Joints with command std < 1 deg in an "
    "episode are skipped.")

STATIC_LIMITATIONS = [
    "Open-loop joint-space replay only: contacts are disabled in simulation, objects/table are not modelled; "
    "episodes where the real arm pushes on the world show up as sim-vs-real error that no actuator calibration can remove.",
    "Gripper excluded from all metrics (object contact); it is driven by a linear map of its 0-100 range onto the MJCF jaw range.",
    "The servo is modelled as MuJoCo's ideal PD position actuator with a torque limit (stock forcerange); the real "
    "STS3215 firmware (P-only position loop, acceleration profile, deadband) is approximated, not reproduced. The fitted "
    "kp is therefore a bandwidth parameter of that model, not the servo's static stiffness (compare the gravity-sag "
    "audit).",
    "Fitted per joint: kp, kv, frictionloss; shared: integer command delay. Armature is fixed at the stock value "
    "(only the bandwidth kp/I_eff is identifiable from position trajectories); the identifiable combinations "
    "(natural frequency, damping ratio) are reported with CIs.",
    "Zero offsets are NOT fitted: the twin uses the documented calibration convention (sign checked per joint). In "
    "v1 fitted offsets were unidentified, went to their +-20 deg bounds and degraded forward-kinematic plausibility. "
    "A robot whose calibration zero differs from the convention is therefore modelled with a wrong gravity load.",
    "Joint limits: a stock MJCF limit that the fit episodes cross by > 0.5 deg is released (no stop); others stay at "
    "stock. Held-out motion past a non-released stock limit is clipped by the twin (fraction reported).",
    "Command delay is an integer number of frames shared by all joints.",
    "Dataset timestamps are nominal (frame_index/fps); real control-loop timing, jitter and overruns are unobservable "
    "and unmodelled.",
    "One dataset = one physical robot and setup: the calibrated twin is a model of that robot, not of the robot type; "
    "transfer to other units is not tested here.",
]


# ------------------------------------------------------------------------------------------- environment


def _code_sha256() -> str:
    h = hashlib.sha256()
    for p in sorted(Path(__file__).parent.glob("*.py")):
        h.update(p.name.encode())
        h.update(p.read_bytes())
    return h.hexdigest()


def _blas() -> list[dict]:
    import ctypes
    import glob
    import os

    import numpy
    import scipy

    out = []
    for pkg in (numpy, scipy):
        for lib in sorted(glob.glob(os.path.join(os.path.dirname(pkg.__file__), "..", f"{pkg.__name__}.libs", "*openblas*"))):
            rec = {"package": pkg.__name__, "lib": os.path.basename(lib)}
            try:
                dll = ctypes.CDLL(lib)
                for key, syms in (("corename", ("scipy_openblas_get_corename64_", "scipy_openblas_get_corename",
                                                "openblas_get_corename")),
                                  ("config", ("scipy_openblas_get_config64_", "scipy_openblas_get_config",
                                              "openblas_get_config"))):
                    for s in syms:
                        if hasattr(dll, s):
                            f = getattr(dll, s)
                            f.restype = ctypes.c_char_p
                            rec[key] = f().decode()
                            break
            except OSError:
                pass
            out.append(rec)
    return out


def _cpu() -> str:
    try:
        for line in Path("/proc/cpuinfo").read_text().splitlines():
            if line.startswith("model name"):
                return line.split(":", 1)[1].strip()
    except OSError:
        pass
    return platform.processor() or "unknown"


def _env() -> dict:
    """Software + hardware identity. Hashed into content_sha256 (not into results_sha256)."""
    from importlib.metadata import version

    def v(name):
        try:
            return version(name)
        except Exception:  # noqa: BLE001
            return None

    return {"python": platform.python_version(), "mujoco": mujoco.__version__, "numpy": v("numpy"),
            "scipy": v("scipy"), "pandas": v("pandas"), "pyarrow": v("pyarrow"), "huggingface_hub": v("huggingface_hub"),
            "meatspace_lab": __version__, "code_sha256": _code_sha256(),
            "platform": {"machine": platform.machine(), "system": platform.system(), "cpu": _cpu()},
            "blas": _blas()}


def _git() -> dict:
    root = Path(__file__).resolve().parent
    try:
        sha = subprocess.run(["git", "-C", str(root), "rev-parse", "HEAD"], capture_output=True, text=True,
                             check=True).stdout.strip()
        st = subprocess.run(["git", "-C", str(root), "status", "--porcelain", "--", "."], capture_output=True,
                            text=True, check=True).stdout.strip()
        return {"commit": sha, "lab_code_dirty_or_untracked": bool(st)}
    except Exception:  # noqa: BLE001
        return {"commit": None}


HASH_EXCLUDE = ("volatile", "content_sha256", "results_sha256")


def content_sha256(report: dict) -> str:
    """Everything except `volatile`: results AND the software/hardware environment that produced them."""
    body = {k: v for k, v in report.items() if k not in HASH_EXCLUDE}
    return hashlib.sha256(canonical_json(body).encode()).hexdigest()


# optimizer-path diagnostics: how the fit got there (screen losses of NON-selected delays, gain-grid losses, evaluation
# counts, scipy's status text). A different BLAS kernel can change them while every result stays identical (observed:
# svla_so101 on an OpenBLAS Haswell vs SkylakeX kernel), so they are in content_sha256 but not in results_sha256.
DIAGNOSTIC_KEYS = ("delay_screen_mse_deg2", "gain_grid_mse_deg2_by_delay", "n_simulated_rollout_sets", "optimizer_status")


def _strip_diagnostics(rep: dict) -> dict:
    out = dict(rep)
    if isinstance(rep.get("fit"), dict):
        out["fit"] = {k: ({kk: vv for kk, vv in v.items() if kk not in DIAGNOSTIC_KEYS} if isinstance(v, dict) else v)
                      for k, v in rep["fit"].items()}
    return out


def results_sha256(report: dict) -> str:
    """Everything except `volatile`, `environment` and the optimizer-path diagnostics: the same whenever the results
    (metrics, CIs, fitted parameters, split, texts) are, on any interpreter/CPU."""
    body = {k: v for k, v in _strip_diagnostics(report).items() if k not in HASH_EXCLUDE + ("environment",)}
    return hashlib.sha256(canonical_json(body).encode()).hexdigest()


def _finish(rep: dict, t0: float) -> dict:
    rep = json.loads(json.dumps(rep))  # plain JSON types only, so the hashes equal the on-disk file's
    rep["content_sha256"] = content_sha256(rep)
    rep["results_sha256"] = results_sha256(rep)
    rep["volatile"] = {"runtime_s": round(time.monotonic() - t0, 1), "git": _git()}
    return rep


# --------------------------------------------------------------------------------------------- metrics


def _episodes(ds: Dataset, verdict: units.UnitsVerdict, ids=None) -> list[EpisodeData]:
    keep = None if ids is None else set(ids)
    return [EpisodeData(e.index, units.to_physical_degrees(e.state, ds.names, verdict),
                        units.to_physical_degrees(e.action, ds.action_names, verdict))
            for e in ds.episodes if keep is None or e.index in keep]


def _stack(ms: list[dict], key: str) -> np.ndarray:
    return np.stack([m[key] for m in ms])


def _static_rmse(e: EpisodeData, xs: np.ndarray, min_frames: int = 10) -> np.ndarray:
    """Per-joint RMSE over the real robot's quasi-static frames (gravity-sag dominated; needs physics)."""
    mask = audit.static_frames(e.x, e.a)
    mask[0] = False
    if mask.sum() < min_frames:
        return np.full(5, np.nan)
    return metrics.rmse(xs[mask], e.x[mask, :5])


def _twin_block(ms: list[dict], static: np.ndarray, fps: float, seed: int) -> dict:
    J = list(units.ARM)
    lag = _stack(ms, "sim_lag_frames")
    return {
        "sim_vs_real_rmse_deg": metrics.summarize_per_joint(_stack(ms, "sim_vs_real_rmse"), J, seed),
        "static_frame_rmse_deg": metrics.summarize_per_joint(static, J, seed + 5),
        "sim_tracking_rmse_deg": metrics.summarize_per_joint(_stack(ms, "sim_tracking_rmse"), J, seed + 10),
        "lag_frames": metrics.summarize_per_joint(lag, J, seed + 20),
        "lag_ms": metrics.summarize_per_joint(lag * 1000.0 / fps, J, seed + 20),
        "final_pose_gap_deg": metrics.summarize_per_joint(_stack(ms, "final_pose_gap"), J, seed + 30),
    }


def _real_block(ms: list[dict], fps: float, seed: int) -> dict:
    J = list(units.ARM)
    lag = _stack(ms, "real_lag_frames")
    return {
        "real_tracking_rmse_deg": metrics.summarize_per_joint(_stack(ms, "real_tracking_rmse"), J, seed + 40),
        "lag_frames": metrics.summarize_per_joint(lag, J, seed + 50),
        "lag_ms": metrics.summarize_per_joint(lag * 1000.0 / fps, J, seed + 50),
    }


def _improvement(ref: list[dict], new: list[dict], seed: int) -> dict:
    s = _stack(ref, "sim_vs_real_rmse")
    c = _stack(new, "sim_vs_real_rmse")
    out = {"arm_mean": metrics.paired_improvement(s.mean(1), c.mean(1), seed)}
    for k, j in enumerate(units.ARM):
        out[j] = metrics.paired_improvement(s[:, k], c[:, k], seed + k + 1)
    return out


def _outside_range(twin: Twin, mapping, p: TwinParams, eps: list[EpisodeData]) -> dict:
    """Fraction of recorded states of `eps` outside this twin's joint range (its own range)."""
    lim = np.rad2deg(twin.base.jnt_range[twin.jid[:5]] if p.jnt_range is None else p.jnt_range)
    X = np.concatenate([e.x[:, :5] for e in eps]) * mapping.sign + mapping.offset_deg + p.offset_deg
    return dict(zip(units.ARM, [_r(v, 4) for v in ((X < lim[:, 0]) | (X > lim[:, 1])).mean(0)]))


def _novelty(fit_eps: list[EpisodeData], eps: list[EpisodeData], margin: float = 2.0) -> dict:
    """Fraction of states of `eps` outside the fit episodes' state range +- margin (new workspace)."""
    F = np.concatenate([e.x[:, :5] for e in fit_eps])
    lo, hi = F.min(0) - margin, F.max(0) + margin
    X = np.concatenate([e.x[:, :5] for e in eps])
    return dict(zip(units.ARM, [_r(v, 4) for v in ((X < lo) | (X > hi)).mean(0)]))


def _gap_label(c: dict) -> str:
    m, (lo, hi) = c["mean"], c["ci95"]
    if m is None:
        return "n/a"
    if hi is not None and hi < 0:
        if m <= -0.5:
            return "closes most of the gap"
        if m <= -0.2:
            return "closes part of the gap"
        return "small improvement; most of the gap remains"
    if lo is not None and lo > 0:
        return "calibration makes the twin WORSE"
    return "no clear change"


def _base_label(c: dict) -> str:
    m, (lo, hi) = c["mean"], c["ci95"]
    if m is None:
        return "n/a"
    if hi is not None and hi < 0:
        return "beats the physics-free lag filter"
    if lo is not None and lo > 0:
        return "is WORSE than the physics-free lag filter"
    return "no clear difference from the physics-free lag filter"


def _pct(c: dict) -> str:
    m, (lo, hi) = c["mean"], c["ci95"]
    if m is None:
        return "n/a"
    return f"{100 * m:+.0f}% [{100 * lo:+.0f}, {100 * hi:+.0f}]" if lo is not None else f"{100 * m:+.0f}%"


def _set_headline(m: dict) -> dict:
    imp = m["improvement_calibrated_vs_stock"]["arm_mean"]
    impb = m["improvement_calibrated_vs_baseline"]["arm_mean"]
    calib = m["calibrated"]["sim_vs_real_rmse_deg"]["arm_mean"]
    gl, bl = _gap_label(imp["rel_change"]), _base_label(impb["rel_change"])
    return {
        "n_episodes": m["n_episodes"],
        **{k: m[k]["sim_vs_real_rmse_deg"]["arm_mean"] for k in MODELS},
        "calibrated_vs_stock": imp, "calibrated_vs_baseline": impb,
        "gap_label": gl, "baseline_label": bl,
        "verdict": (f"{gl} ({_pct(imp['rel_change'])} vs stock, residual {calib['mean']:.2f} deg); calibrated twin "
                    f"{bl} ({_pct(impb['rel_change'])})"),
    }


# ------------------------------------------------------------------------------------------------ pipeline


def run(ds: Dataset, twin_dir: str | Path, cfg: sysid.FitConfig, nthread: int = 4, log=print) -> tuple[dict, dict]:
    """Run the full pipeline. Returns (report, artifacts) where artifacts holds SVG strings + package."""
    t0 = time.monotonic()
    twin_dir = Path(twin_dir)
    split = sysid.split_episodes([e.index for e in ds.episodes], cfg.test_frac, cfg.seed, cfg.max_train_episodes)
    raw = {e.index: e for e in ds.episodes}
    # units are decided on the FIT episodes only; the held-out episodes are then checked for agreement
    verdict = units.detect_units(ds.names, np.concatenate([raw[i].state for i in split.fit]))
    v_held = units.detect_units(ds.names, np.concatenate([raw[i].state for i in split.interleaved + split.future]))
    held_agree = (v_held.supported == verdict.supported and
                  [(e.kind, e.range_ticks) for e in v_held.encodings[:5]] == [(e.kind, e.range_ticks) for e in verdict.encodings[:5]])
    conv = units.naming_convention(ds.names)
    base = {
        "schema": REPORT_SCHEMA,
        "dataset": {
            "id": ds.repo_id, "revision_requested": ds.revision_requested, "revision_sha": ds.sha,
            "codebase_version": ds.codebase_version, "robot_type": ds.robot_type, "fps": ds.fps,
            "episodes_in_repo": ds.info.get("total_episodes"), "max_episodes_loaded": ds.max_episodes,
            "episodes_total": len(ds.episodes) + len(ds.dropped), "episodes_dropped": ds.dropped,
            "frames_used": ds.total_frames, "files": ds.files,
            "timestamps": {"max_abs_dev_from_frame_index_over_fps_s": _r(ds.timestamp_max_dev_s, 7),
                           "nominal": bool(ds.timestamp_max_dev_s < 1e-4),
                           "note": "timestamps equal frame_index/fps: loop timing is not recorded, the jitter "
                                   "check in data.py cannot fire" if ds.timestamp_max_dev_s < 1e-4 else
                                   "timestamps carry real timing"},
        },
        "units": {**verdict.to_dict(), "decided_on": "fit episodes",
                  "heldout_agrees": bool(held_agree),
                  "heldout_kinds": [e.kind for e in v_held.encodings[:5]],
                  "heldout_range_ticks": [e.range_ticks for e in v_held.encodings[:5]]},
        "environment": _env(),
        "conventions": {"recording": ALIGNMENT_CONVENTION.get(conv, "unknown recording convention"),
                        "recording_convention": conv, "replay": ALIGNMENT_CONVENTION["replay"], "lag": LAG_DEFINITION,
                        "angles": "physical degrees (encoder ticks * 360/4096), arm joints only",
                        "change": "relative change of an error metric, new/reference - 1; NEGATIVE = better",
                        "unit_sources": units.SOURCES},
        "split": {"method": "future = last round(n*test_frac) episodes by index; interleaved = round(n*test_frac) "
                            "episodes of the rest drawn by numpy default_rng(seed).permutation, plus every remaining "
                            "episode beyond the fit cap; fit = the remaining episodes (<= max_train_episodes)",
                  "seed": cfg.seed, "test_frac": cfg.test_frac, **split.to_dict(),
                  "overlap": sorted(set(split.fit) & (set(split.interleaved) | set(split.future)))},
    }
    twin = Twin(twin_dir, ds.fps)
    base["twin"] = {
        "id": twin.spec_def.name, "menagerie_repo": MENAGERIE_REPO, "menagerie_sha": menagerie_sha(twin_dir),
        "twin_dir_content_sha256": twin_content_sha256(twin_dir), "xml": twin.spec_def.xml,
        "stock_timestep": twin.stock_timestep, "timestep_used": twin.timestep, "substeps_per_frame": twin.substeps,
        "contacts": "disabled", "stock_params": twin.stock.to_dict(),
    }

    def unsupported(reason: str, extra: list | None = None) -> tuple[dict, dict]:
        rep = dict(base, status="unsupported", reason=reason, limitations=[reason] + (extra or []))
        return _finish(rep, t0), {}

    if not verdict.supported:
        return unsupported("Units could not be verified; no sim comparison is reported. " + verdict.reason)
    try:
        mapping = nominal_mapping(twin.spec_def, twin.base, verdict.zero_reference)
    except ValueError as e:
        return unsupported(str(e))
    eps = _episodes(ds, verdict)
    by_id = {e.index: e for e in eps}
    sets = {"fit": [by_id[i] for i in split.fit], "interleaved": [by_id[i] for i in split.interleaved],
            "future": [by_id[i] for i in split.future]}
    fit_eps = sets["fit"]
    # sign/plausibility gate on the FIT episodes; the same rule on other subsets shows how robust it is
    mapping, sign_decisions, why = resolve_signs(twin, mapping, np.concatenate([e.x for e in fit_eps]),
                                                 cfg.offset_bound_deg)
    gate = {}
    nominal0 = nominal_mapping(twin.spec_def, twin.base, verdict.zero_reference)
    for lab, E in (("all_episodes", eps), ("heldout_only", sets["interleaved"] + sets["future"])):
        mp_, dec_, why_ = resolve_signs(twin, nominal0, np.concatenate([e.x for e in E]), cfg.offset_bound_deg)
        gate[lab] = {"signs": mp_.sign.astype(int).tolist(), "rejected": why_ is not None,
                     "shift_needed_documented_sign_deg": [d["shift_needed_documented_sign_deg"] for d in dec_]}
    gate["fit"] = {"signs": mapping.sign.astype(int).tolist(), "rejected": why is not None,
                   "shift_needed_documented_sign_deg": [d["shift_needed_documented_sign_deg"] for d in sign_decisions]}
    gate["agree"] = all(gate[k]["signs"] == gate["fit"]["signs"] and gate[k]["rejected"] == gate["fit"]["rejected"]
                        for k in ("all_episodes", "heldout_only"))
    base["mapping_checks"] = sign_decisions
    base["mapping_gate_robustness"] = gate
    if why is not None:
        # independent evidence on the rejected mapping (descriptive; it does not change the decision)
        base["forward_kinematics_documented_mapping"] = kinematics.fk_plausibility(twin, mapping, twin.stock.copy(), eps)
        extra = []
        if not gate["agree"]:
            extra.append("The mapping gate is FRAGILE for this dataset: the same rule on other episode subsets gives "
                         f"a different decision (all episodes: {'rejected' if gate['all_episodes']['rejected'] else 'accepted'}"
                         f", held-out only: {'rejected' if gate['heldout_only']['rejected'] else 'accepted'}); the "
                         "decision on the fit episodes is the one used.")
        return unsupported(why, extra)
    log(f"  {len(eps)} episodes: fit={len(fit_eps)} interleaved={len(sets['interleaved'])} future={len(sets['future'])}; "
        f"units: {verdict.reason}")
    R = Replayer(twin, nthread=nthread)
    try:
        stock = twin.stock.copy()
        log("  fitting aligned-stock ablation (delay + range envelope, stock dynamics)")
        fit_align = sysid.fit(twin, R, fit_eps, mapping, cfg, dynamics=False, log=log)
        log("  fitting calibrated twin (kp, kv, frictionloss per joint, delay)")
        fit_full = sysid.fit(twin, R, fit_eps, mapping, cfg, dynamics=True, log=log)
        twins = {"stock": stock, "aligned_stock": fit_align.params, "calibrated": fit_full.params}
        sims: dict = {}
        for name, p in twins.items():
            m = sysid.build_model(twin, p)
            sims[name] = {s: replay_episodes(R, sets[s], mapping, p, m) for s in SETS}
    finally:
        R.close()
    log("  fitting physics-free baseline (per-joint lag filter)")
    bl = baseline.fit(fit_eps)
    sims["baseline"] = {s: [bl.predict(e) for e in sets[s]] for s in SETS}
    seed = cfg.seed
    per = {s: {name: [metrics.episode_metrics(e.x, e.a, xs) for e, xs in zip(sets[s], sims[name][s])]
               for name in MODELS} for s in SETS}
    static = {s: {name: np.stack([_static_rmse(e, xs) for e, xs in zip(sets[s], sims[name][s])]) for name in MODELS}
              for s in SETS}
    real_per = {s: [metrics.episode_metrics(e.x, e.a, None) for e in sets[s]] for s in SETS}
    metr = {}
    for s in SETS:
        mm = {"n_episodes": len(sets[s]), "real": _real_block(real_per[s], ds.fps, seed)}
        for name in MODELS:
            mm[name] = _twin_block(per[s][name], static[s][name], ds.fps, seed)
        mm["improvement_calibrated_vs_stock"] = _improvement(per[s]["stock"], per[s]["calibrated"], seed)
        mm["improvement_aligned_vs_stock"] = _improvement(per[s]["stock"], per[s]["aligned_stock"], seed)
        mm["improvement_calibrated_vs_baseline"] = _improvement(per[s]["baseline"], per[s]["calibrated"], seed)
        mm["improvement_baseline_vs_stock"] = _improvement(per[s]["stock"], per[s]["baseline"], seed)
        if s != "fit":
            mm["workspace_outside_fit_range_frac"] = _novelty(fit_eps, sets[s])
            mm["outside_twin_range_frac"] = {"stock": _outside_range(twin, mapping, stock, sets[s]),
                                             "calibrated": _outside_range(twin, mapping, fit_full.params, sets[s])}
        metr[s] = mm
    episodes_table = []
    for s in SETS:
        for k, e in enumerate(sets[s]):
            episodes_table.append({"episode": e.index, "set": s, "frames": e.n,
                                   **{f"{n}_rmse_deg": [_r(v, 3) for v in per[s][n][k]["sim_vs_real_rmse"]]
                                      for n in MODELS}})
    pkg = make_package(twin, fit_full.params, mapping, {
        "dataset": ds.repo_id, "dataset_revision_sha": ds.sha, "menagerie_sha": base["twin"]["menagerie_sha"],
        "fitted_on_episodes": list(split.fit), "mujoco": mujoco.__version__,
        "offsets": "documented calibration convention (not fitted)" if not cfg.fit_offsets else "fitted",
        "joint_limits": "stock, except limits falsified by the fit episodes, released to +-2 pi"})
    log("  audits (gravity sag, forward kinematics)")
    audit_block = {
        "gravity_sag_nominal_mapping": audit.gravity_sag(twin, mapping, stock, fit_eps),
        "forward_kinematics": kinematics.fk_plausibility(twin, mapping, fit_full.params, eps),
        "released_limits": {j: {"lower": bool(f[0]), "upper": bool(f[1])} for j, f in
                            zip(units.ARM, sysid.falsified_limits(twin, mapping, sysid.observed_range_deg(fit_eps)))},
        "stock_range_deg": np.round(np.rad2deg(twin.base.jnt_range[twin.jid[:5]]), 2).tolist(),
        "calibrated_range_deg": None if fit_full.params.jnt_range is None else
        np.round(np.rad2deg(fit_full.params.jnt_range), 2).tolist(),
    }
    if cfg.fit_offsets:
        audit_block["gravity_sag_fitted_offsets"] = audit.gravity_sag(twin, mapping, fit_full.params, fit_eps)
    ident = fit_full.identifiability
    # ---------------------------------------------------------------------------------------- headline
    hl_sets = {s: _set_headline(metr[s]) for s in HELDOUT}
    mi = metr["interleaved"]
    lag_ms = {j: {k: (mi[k]["lag_ms"][j]["mean"] if k != "real" else mi["real"]["lag_ms"][j]["mean"])
                  for k in ("real", "stock", "calibrated")} for j in units.ARM}

    def mismatch(k):
        v = [abs(lag_ms[j][k] - lag_ms[j]["real"]) for j in units.ARM
             if lag_ms[j][k] is not None and lag_ms[j]["real"] is not None]
        return _r(max(v), 1) if v else None

    def med(block):
        v = [block[j]["mean"] for j in units.ARM if block[j]["mean"] is not None]
        return _r(float(np.median(v)), 2) if v else None

    headline = {
        "metric": "held-out sim-vs-real joint trajectory RMSE, mean over 5 arm joints and over episodes (deg)",
        "sets": hl_sets,
        "verdict": "; ".join(f"{s}: {hl_sets[s]['verdict']}" for s in ("future", "interleaved")),
        "lag_interleaved": {
            "per_joint_ms": lag_ms,
            "max_abs_mismatch_vs_real_ms": {"stock": mismatch("stock"), "calibrated": mismatch("calibrated")},
            "median_over_joints_frames": {"real": med(mi["real"]["lag_frames"]), "stock": med(mi["stock"]["lag_frames"]),
                                          "calibrated": med(mi["calibrated"]["lag_frames"])},
        },
    }
    # ---------------------------------------------------------------------------------------- limitations
    limitations = list(STATIC_LIMITATIONS)
    limitations.append(f"Confidence intervals are percentile bootstraps over episodes (whole episodes resampled, 10,000 "
                       f"draws, fixed seed); with {len(sets['future'])} future / {len(sets['interleaved'])} interleaved "
                       "held-out episodes they are approximate and tend to be slightly too narrow. They do not cover "
                       "the choice of split, of fit configuration, or of dataset.")
    if conv == "lerobot-legacy":
        limitations.append("Recorded with legacy LeRobot (act-then-observe); lags are not exactly comparable with "
                           "current-LeRobot (observe-then-act) datasets (see conventions).")
    if not base["dataset"]["timestamps"]["nominal"]:
        limitations.append("Timestamps are not nominal; the replay still assumes a fixed 1/fps frame period.")
    if not held_agree:
        limitations.append("Units detected on the held-out episodes DISAGREE with the fit episodes "
                           f"({base['units']['heldout_kinds']} / {base['units']['heldout_range_ticks']}).")
    if not gate["agree"]:
        limitations.append("The sign/plausibility gate is FRAGILE for this dataset: the same rule gives a different "
                           f"decision on other episode subsets ({ {k: gate[k] for k in ('all_episodes', 'heldout_only')} })"
                           "; the decision on the fit episodes is the one used.")
    enc = verdict.encodings[:5]
    if any(e.kind == "range_m100_100" for e in enc):
        limitations.insert(0, "Dataset recorded in LeRobot RANGE_M100_100 (normalized) units; converted to degrees with the "
                           "follower's calibrated range recovered from the encoder-tick lattice of observation.state "
                           f"(ranges in ticks: {[e.range_ticks for e in enc]}). Readings clipped at +-100 "
                           f"(fraction per joint: {[round(e.saturated_frac, 4) for e in enc]}) are true positions beyond "
                           "the calibrated range and are compared as recorded.")
    if verdict.zero_reference == "mid_range" and twin.spec_def.name == "trs_so_arm100":
        limitations.insert(0, "Nominal zero for this (MotorsBus, mid-range zero) dataset on trs_so_arm100 assumes the robot "
                           "was calibrated over the MJCF joint ranges (middle of range = MJCF range midpoint).")
    rt = (ds.robot_type or "").lower()
    if rt in ("so_follower", "so-follower"):
        limitations.append(f"info.json robot_type is the generic {ds.robot_type!r} (LeRobot's shared SO-100/SO-101 class); "
                           f"the twin ({twin.spec_def.name}) was chosen from the dataset name/card.")
    elif ("so101" in twin.spec_def.name and "101" not in rt) or ("so_arm100" in twin.spec_def.name and "101" in rt):
        limitations.append(f"info.json robot_type is {ds.robot_type!r} but the twin ({twin.spec_def.name}) was chosen from "
                           "the dataset name/card; SO-100 and SO-101 share servos and LeRobot code, but link geometry "
                           "differs, so a hardware/twin mismatch cannot be excluded.")
    rel = [f"{j} {'lower' if v['lower'] else ''}{'/' if v['lower'] and v['upper'] else ''}{'upper' if v['upper'] else ''}"
           for j, v in audit_block["released_limits"].items() if v["lower"] or v["upper"]]
    if rel:
        limitations.append("Stock MJCF limits crossed by the fit episodes and released in the aligned/calibrated twins: "
                           + ", ".join(rel) + ". The stock twin is held at those limits (counted as stock-twin error).")
    for s in HELDOUT:
        oc = {k: v for k, v in metr[s]["outside_twin_range_frac"]["calibrated"].items() if v and v > 0.001}
        if oc:
            limitations.append(f"{s} held-out states outside the calibrated twin's range (clipped): {oc}.")
        nov = {k: v for k, v in metr[s]["workspace_outside_fit_range_frac"].items() if v and v > 0.05}
        if nov:
            limitations.append(f"{s} held-out episodes leave the fit episodes' range of motion (+-2 deg) on more than "
                               f"5% of frames: {nov}.")
    for f, lab in ((fit_align, "aligned-stock"), (fit_full, "calibrated")):
        if f.time_limited:
            limitations.append(f"The {lab} fit hit the wall-clock safety limit; results used the best point found and "
                               "are not bit-reproducible.")
    if fit_full.converged is False:
        limitations.append("The calibrated fit stopped at its evaluation budget (max_nfev) without meeting its "
                           "tolerance: the parameters are the best point found, not a converged optimum.")
    if fit_full.at_bound:
        limitations.append("Fitted parameters at a bound (within BOUND_TOL): " + ", ".join(fit_full.at_bound) +
                           "; the value is a bound, not an estimate.")
    unid = [f"{q['param']}[{q['joint']}]" for q in ident.get("parameters", []) if q.get("identified_alone") is False]
    if unid:
        limitations.append("Not identified individually (marginal/conditional std ratio >= "
                           f"{sysid.UNIDENTIFIED_RATIO:g}): " + ", ".join(unid) + ". Only combinations of them are "
                           "constrained by the data (see identifiability); individual values are not meaningful.")
    for s in HELDOUT:
        fp = metr[s]
        pe = [j for j in units.ARM if (fp["calibrated"]["final_pose_gap_deg"][j]["mean"] or 0) >
              (fp["stock"]["final_pose_gap_deg"][j]["mean"] or 0)]
        ci = [j for j in pe if (fp["calibrated"]["final_pose_gap_deg"][j]["ci95"][0] or 0) >
              (fp["stock"]["final_pose_gap_deg"][j]["ci95"][1] or 1e9)]
        if pe:
            limitations.append(f"{s}: final-pose (static) gap is larger for the calibrated twin than for stock on "
                               f"{', '.join(pe)} by point estimate" + (f"; CIs separate on {', '.join(ci)}" if ci else
                                                                       "; CIs overlap on all of them") + ".")
    for s in HELDOUT:
        if hl_sets[s]["baseline_label"] != "beats the physics-free lag filter":
            limitations.append(f"{s}: the calibrated twin {hl_sets[s]['baseline_label']}: on this set the MuJoCo "
                               "physics adds nothing measurable over a 3-parameter-per-joint black-box lag model.")
    fk = audit_block["forward_kinematics"]
    if (fk.get("frac_frames_ee_below_base_by_2cm") or 0) > 0.01:
        limitations.append("Forward kinematics under the documented mapping put the gripper more than 2 cm below the "
                           f"base on {100 * fk['frac_frames_ee_below_base_by_2cm']:.1f}% of frames (p1 "
                           f"{fk['ee_minus_base_lowest_m']['p1']} m): either the base is not on the work surface, the "
                           "twin's geometry differs, or this robot's zero differs from the convention.")
    flipped = [units.ARM[d["joint"]] for d in sign_decisions if d["decision"].startswith("flipped")]
    if flipped:
        limitations.append("Joint direction flipped relative to the documented convention for " + ", ".join(flipped) +
                           " (chosen from the recorded range of motion vs the MJCF range; see mapping_checks).")
    report = dict(base)
    report.update({
        "status": "ok",
        "mapping": mapping.to_dict(),
        "fit": {
            "config": cfg.to_dict(), "optimizer": "scipy.optimize.least_squares(method='trf', bounds), forward-difference "
            "Jacobian, log-parametrised kp",
            "bounds": {k: list(v) for k, v in sysid.BOUNDS.items()}, "bound_tolerance": sysid.BOUND_TOL,
            "calibrated": {"params": fit_full.params.to_dict(), "fitted": fit_full.fitted,
                           "train_mse_deg2": _r(fit_full.train_cost, 5),
                           "delay_screen_mse_deg2": {str(k): _r(v, 5) for k, v in fit_full.delay_screen.items()},
                           "gain_grid_mse_deg2_by_delay": fit_full.gain_grid,
                           "n_simulated_rollout_sets": fit_full.nfev, "time_limited": fit_full.time_limited,
                           "converged": fit_full.converged, "optimizer_status": fit_full.status,
                           "at_bound": fit_full.at_bound, "identifiability": ident},
            "aligned_stock": {"params": fit_align.params.to_dict(), "fitted": ["delay_frames"] + fit_align.fitted,
                              "train_mse_deg2": _r(fit_align.train_cost, 5),
                              "delay_screen_mse_deg2": {str(k): _r(v, 5) for k, v in fit_align.delay_screen.items()},
                              "n_simulated_rollout_sets": fit_align.nfev, "time_limited": fit_align.time_limited,
                              "converged": fit_align.converged, "at_bound": fit_align.at_bound},
            "baseline": bl.to_dict(),
        },
        "headline": headline,
        "metrics": metr,
        "episodes": episodes_table,
        "audit": audit_block,
        "package": {"file": "calibrated_twin.json", "sha256": pkg["sha256"]},
        "limitations": limitations,
    })
    # plots: representative FUTURE-block episode = median stock arm-mean RMSE
    s_arm = np.array([m["sim_vs_real_rmse"].mean() for m in per["future"]["stock"]])
    k = int(np.argsort(s_arm)[len(s_arm) // 2])
    e = sets["future"][k]
    t = np.arange(e.n) / ds.fps
    ep_svg = plots.episode_svg(
        t, e.x[:, :5], sims["stock"]["future"][k], sims["calibrated"]["future"][k], list(units.ARM),
        f"{ds.repo_id} future-block held-out episode {e.index}: joint angles, real vs twins",
        per["future"]["stock"][k]["sim_vs_real_rmse"], per["future"]["calibrated"][k]["sim_vs_real_rmse"])
    groups = list(units.ARM) + ["arm_mean"]
    bars = {}
    for s, fname in (("future", "rmse_by_joint_future.svg"), ("interleaved", "rmse_by_joint.svg")):
        ms = metr[s]
        bars[fname] = plots.rmse_bars_svg(
            groups, [ms["stock"]["sim_vs_real_rmse_deg"][g] for g in groups],
            [ms["calibrated"]["sim_vs_real_rmse_deg"][g] for g in groups],
            f"{s.capitalize()} held-out sim-vs-real RMSE per joint ({ms['n_episodes']} episodes)",
            ref=[ms["baseline"]["sim_vs_real_rmse_deg"][g] for g in groups])
    report["plots"] = {"episode": "heldout_episode.svg", "episode_set": "future", "episode_index": int(e.index),
                       "bars_interleaved": "rmse_by_joint.svg", "bars_future": "rmse_by_joint_future.svg"}
    report = _finish(report, t0)
    return report, {"heldout_episode.svg": ep_svg, **bars, "calibrated_twin.json": pkg}


# ----------------------------------------------------------------------------------------------- markdown


def _ci(d: dict | None, unit: str = "", pct: bool = False) -> str:
    if not d or d.get("mean") is None:
        return "n/a"
    f = (lambda v: f"{100 * v:+.0f}%") if pct else (lambda v: f"{v:.2f}{unit}")  # noqa: E731
    lo, hi = d.get("ci95", [None, None])
    if lo is None:
        return f(d["mean"])
    return f"{f(d['mean'])} [{f(lo)}, {f(hi)}]"


def _table(rows: list[list[str]], header: list[str]) -> str:
    w = [max(len(str(r[i])) for r in rows + [header]) for i in range(len(header))]
    line = lambda r: "  ".join(str(c).ljust(w[i]) for i, c in enumerate(r)).rstrip()  # noqa: E731
    return "\n".join([line(header), line(["-" * x for x in w])] + [line(r) for r in rows])


def _v(x, fmt="{:.2f}"):
    return "n/a" if x is None else fmt.format(x)


def to_markdown(rep: dict) -> str:
    ds, tw = rep["dataset"], rep["twin"]
    L = [f"# Twin Gap Report: {ds['id']} x {tw['id']}", ""]
    if rep["status"] != "ok":
        L += ["```", "STATUS     unsupported", f"REASON     {rep['reason']}", "```", "",
              "No sim-vs-real numbers are reported for this dataset: they would rest on an unverified unit or "
              "joint mapping.", ""]
        if rep.get("mapping_checks"):
            rows = [[units.ARM[d["joint"]], str(d["p1_p99_deg"]), str(d["mjcf_range_deg"]),
                     str(d["shift_needed_documented_sign_deg"]), str(d["shift_needed_flipped_sign_deg"]), d["decision"]]
                    for d in rep["mapping_checks"]]
            L += ["Mapping checks (1st-99th percentile of FIT-episode states vs MJCF range, deg):", "", "```",
                  _table(rows, ["joint", "recorded p1..p99", "MJCF range", "shift (doc sign)", "shift (flipped)",
                                "decision"]), "```", ""]
        g = rep.get("mapping_gate_robustness")
        if g:
            L += ["Same gate on other episode subsets (robustness, not used): " +
                  "; ".join(f"{k}: {'rejected' if g[k]['rejected'] else 'accepted'}, shift (doc sign) "
                            f"{g[k]['shift_needed_documented_sign_deg']}" for k in ("fit", "all_episodes", "heldout_only")),
                  ""]
        fk = rep.get("forward_kinematics_documented_mapping")
        if fk:
            L += ["Forward kinematics under the documented mapping (evidence only; assumes the base sits on the work "
                  "surface): gripper lowest point minus base lowest point (m) " + str(fk["ee_minus_base_lowest_m"]) +
                  f"; frames more than 2 cm below the base: {fk['frac_frames_ee_below_base_by_2cm']}; frames beyond a "
                  f"stock MJCF limit: {fk['frac_frames_beyond_stock_limit']}.", ""]
        if len(rep.get("limitations", [])) > 1:
            L += [f"- {x}" for x in rep["limitations"][1:]] + [""]
        L += [f"Units verdict: {rep['units']['reason']}", ""]
        L += _provenance(rep)
        return "\n".join(L) + "\n"
    h = rep["headline"]
    L += ["```", "HELD-OUT sim-vs-real joint RMSE, mean of 5 arm joints, deg  [95% bootstrap CI over episodes]",
          "change = calibrated/reference - 1 (negative = better), paired by episode", ""]
    for s in ("future", "interleaved"):
        hs = h["sets"][s]
        c, cb = hs["calibrated_vs_stock"], hs["calibrated_vs_baseline"]
        L += [f"{SET_TITLE[s].split(' (')[0].upper()} ({hs['n_episodes']} episodes)",
              f"  stock twin             {_ci(hs['stock'])}",
              f"  aligned stock          {_ci(hs['aligned_stock'])}   (stock dynamics + delay + released limits)",
              f"  lag-filter baseline    {_ci(hs['baseline'])}   (no physics: 3 params/joint)",
              f"  calibrated twin        {_ci(hs['calibrated'])}",
              f"  change vs stock        {_pct(c['rel_change'])}   per-episode median "
              f"{_v(c['per_episode_rel_change']['median'], '{:+.0%}')} (range {_v(c['per_episode_rel_change']['min'], '{:+.0%}')}"
              f" .. {_v(c['per_episode_rel_change']['max'], '{:+.0%}')}); {c['episodes_improved']}/{c['episodes_total']} improved",
              f"  change vs baseline     {_pct(cb['rel_change'])}   {cb['episodes_improved']}/{cb['episodes_total']} improved",
              f"  verdict                {hs['verdict']}", ""]
    lg = h["lag_interleaved"]
    L += ["command->state lag, interleaved held-out, ms per joint (real / stock / calibrated):",
          "  " + "  ".join(f"{j} {_v(v['real'], '{:.0f}')}/{_v(v['stock'], '{:.0f}')}/{_v(v['calibrated'], '{:.0f}')}"
                           for j, v in lg["per_joint_ms"].items()),
          f"  max |twin - real| over joints: stock {lg['max_abs_mismatch_vs_real_ms']['stock']} ms, calibrated "
          f"{lg['max_abs_mismatch_vs_real_ms']['calibrated']} ms", "```", ""]
    L += ["![future-block held-out episode](heldout_episode.svg)", "",
          "![per-joint RMSE, future block](rmse_by_joint_future.svg)", "",
          "![per-joint RMSE, interleaved held-out](rmse_by_joint.svg)", ""]
    for s in ("future", "interleaved", "fit"):
        m = rep["metrics"][s]
        L += [f"## {SET_TITLE[s]}, n = {m['n_episodes']}", "",
              "Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.", "", "```"]
        rows = []
        for j in list(units.ARM) + ["arm_mean"]:
            s_, a_, b_, c_ = (m[k]["sim_vs_real_rmse_deg"][j] for k in MODELS)
            rows.append([j, f"{_ci(s_)} (p90 {s_['p90']:.2f})", _ci(a_), _ci(b_), f"{_ci(c_)} (p90 {c_['p90']:.2f})",
                         _pct(m["improvement_calibrated_vs_stock"][j]["rel_change"]),
                         _pct(m["improvement_calibrated_vs_baseline"][j]["rel_change"])])
        L += [_table(rows, ["sim-vs-real RMSE", "stock", "aligned stock", "baseline", "calibrated", "change vs stock",
                            "vs baseline"]), ""]
        rows = [[j] + [_ci(m[k]["static_frame_rmse_deg"][j]) for k in ("stock", "baseline", "calibrated")]
                + [str(m["calibrated"]["static_frame_rmse_deg"][j]["n"])] for j in list(units.ARM) + ["arm_mean"]]
        L += [_table(rows, ["static-frame RMSE (quasi-static holds)", "stock", "baseline", "calibrated",
                            "episodes with >= 10 static frames"]), ""]
        rows = [[j, _ci(m["real"]["real_tracking_rmse_deg"][j]), _ci(m["stock"]["sim_tracking_rmse_deg"][j]),
                 _ci(m["calibrated"]["sim_tracking_rmse_deg"][j])] for j in units.ARM]
        L += [_table(rows, ["command tracking RMSE", "real robot", "stock twin", "calibrated twin"]), ""]
        rows = [[j, _ci(m["real"]["lag_frames"][j]), _ci(m["stock"]["lag_frames"][j]), _ci(m["calibrated"]["lag_frames"][j]),
                 _v(m["real"]["lag_ms"][j]["mean"], "{:.0f}"), _v(m["stock"]["lag_ms"][j]["mean"], "{:.0f}"),
                 _v(m["calibrated"]["lag_ms"][j]["mean"], "{:.0f}")] for j in units.ARM]
        L += [_table(rows, ["lag (frames)", "real", "stock", "calibrated", "real ms", "stock ms", "calib ms"]), ""]
        rows = [[j, _ci(m["stock"]["final_pose_gap_deg"][j]), _ci(m["calibrated"]["final_pose_gap_deg"][j])]
                for j in units.ARM]
        L += [_table(rows, ["final-pose gap", "stock", "calibrated"])]
        if s != "fit":
            L += ["", "fraction of states outside the fit episodes' range of motion +-2 deg: "
                  + str(m["workspace_outside_fit_range_frac"]),
                  "fraction of states outside the twin's joint range: stock " + str(m["outside_twin_range_frac"]["stock"])
                  + "; calibrated " + str(m["outside_twin_range_frac"]["calibrated"])]
        L += ["```", ""]
    f = rep["fit"]["calibrated"]
    p = f["params"]
    st = rep["twin"]["stock_params"]
    conv = {True: "converged", False: "NOT converged (stopped at the evaluation budget)", None: "n/a"}[f["converged"]]
    L += ["## Calibrated twin", "", f"Package `calibrated_twin.json`, sha256 `{rep['package']['sha256']}`.",
          f"Fitted: {', '.join(f['fitted'])}; command delay {p['delay_frames']} frame(s) (screened train MSE by delay, "
          f"deg^2: {f['delay_screen_mse_deg2']}). Train MSE {f['train_mse_deg2']} deg^2. Optimizer: {conv} "
          f"({f['optimizer_status']}). At a bound: {', '.join(f['at_bound']) or 'none'}.", "", "```"]
    rows = []
    for k, j in enumerate(units.ARM):
        rows.append([j, f"{st['kp'][k]:.4g} -> {p['kp'][k]:.4g}", f"{st['kv'][k]:.3g} -> {p['kv'][k]:.3g}",
                     f"{st['frictionloss'][k]:.3g} -> {p['frictionloss'][k]:.3g}", f"{p['armature'][k]:.3g} (fixed)",
                     f"{rep['mapping']['nominal_offset_deg'][k]:+.1f} (documented)"])
    L += [_table(rows, ["joint", "kp N m/rad", "kv N m s/rad", "frictionloss N m", "armature kg m^2", "zero offset deg"]),
          "```", ""]
    idt = f.get("identifiability") or {}
    if idt.get("derived"):
        L += ["Identifiable servo combinations (the individual gains are not the claim): natural frequency "
              "sqrt(kp/I_eff) and damping ratio (kv+damping)/(2 sqrt(kp I_eff)), I_eff = joint-space inertia at the "
              "median pose incl. armature; 95% CI from a linearised episode bootstrap of the fit.", "", "```"]
        rows = [[j, _v(d["I_eff_kgm2"], "{:.4g}"),
                 f"{d['natural_freq_hz']['value']:.3g} [{d['natural_freq_hz']['ci95'][0]:.3g}, {d['natural_freq_hz']['ci95'][1]:.3g}]",
                 f"{d['damping_ratio']['value']:.3g} [{d['damping_ratio']['ci95'][0]:.3g}, {d['damping_ratio']['ci95'][1]:.3g}]"]
                for j, d in idt["derived"].items()]
        L += [_table(rows, ["joint", "I_eff kg m^2", "natural freq Hz [CI]", "damping ratio [CI]"]), "```", ""]
        rows = [[f"{q['param']}[{q['joint']}]", f"{q['value']:.4g}",
                 f"[{q['ci95'][0]:.3g}, {q['ci95'][1]:.3g}]" if q.get("ci95") else "fixed (at bound)",
                 _v(q.get("marginal_over_conditional_std"), "{:.3g}"),
                 {True: "yes", False: "NO", None: "-"}[q.get("identified_alone")]] for q in idt["parameters"]]
        L += [f"Per-parameter identifiability (condition number of J^T J {idt.get('condition_number')}): marginal/"
              "conditional std ratio = sqrt(VIF); >= 10 means only a combination with other parameters is identified.",
              "", "```", _table(rows, ["parameter", "value", "95% CI", "std ratio", "identified alone"]), "```", ""]
        if idt.get("strong_correlations"):
            L += ["Posterior correlations |r| > 0.95: " + "; ".join(f"{a} ~ {b} ({c:+.3f})" for a, b, c in
                                                                    idt["strong_correlations"]), ""]
        L += ["Weakest directions (relative eigenvalue: top loadings): " + "; ".join(
            f"{w['eig_rel']:.2g}: " + ", ".join(f"{k} {v:+.2f}" for k, v in w["loadings"].items())
            for w in idt.get("weakest_directions", [])), ""]
    b = rep["fit"]["baseline"]
    L += ["Physics-free baseline (fitted on the same fit episodes): " + b["model"] + "; alpha " + str(b["alpha"]) +
          ", delay " + str(b["delay_frames"]) + " frames, bias " + str(b["bias_deg"]) + " deg.", ""]
    a = rep["audit"]
    L += ["## Mapping audit", "", "Sign checks (1st-99th percentile of FIT-episode states vs MJCF range):", "", "```"]
    rows = [[units.ARM[d["joint"]], str(d["p1_p99_deg"]), str(d["mjcf_range_deg"]),
             str(d["shift_needed_documented_sign_deg"]), str(d["shift_needed_flipped_sign_deg"]), d["decision"]]
            for d in rep.get("mapping_checks", [])]
    g = rep["mapping_gate_robustness"]
    L += [_table(rows, ["joint", "recorded p1..p99 deg", "MJCF range deg", "shift (doc sign)", "shift (flipped)",
                        "decision"]), "",
          "same rule on other subsets (robustness): " + "; ".join(
              f"{k}: signs {g[k]['signs']}, {'rejected' if g[k]['rejected'] else 'accepted'}" for k in
              ("all_episodes", "heldout_only")) + f" -> {'agrees' if g['agree'] else 'DISAGREES'}",
          "released stock limits (crossed by fit episodes): " + str({j: v for j, v in a["released_limits"].items()
                                                                     if v["lower"] or v["upper"]}),
          "```", ""]
    fk = a["forward_kinematics"]
    L += ["Forward-kinematics plausibility under the shipped mapping (evidence, not a gate; assumes the base sits on "
          "the work surface):", "", "```",
          f"gripper lowest point minus base lowest point (m): {fk['ee_minus_base_lowest_m']}; frames > 2 cm below the "
          f"base: {fk['frac_frames_ee_below_base_by_2cm']}",
          f"frames within 1 deg of a stock MJCF limit: {fk['frac_frames_within_1deg_of_stock_limit']}",
          f"frames beyond a stock MJCF limit: {fk['frac_frames_beyond_stock_limit']}", "```", ""]
    gs = a["gravity_sag_nominal_mapping"]
    L += ["Gravity sag on real static frames (middle 80% of each episode, gripper >= "
          f"{gs['clearance_m'] * 100:.0f} cm above the base plane): centred correlation between the servo's static error "
          "and the twin's gravity torque at the mapped pose, and the implied static stiffness (centred slope). "
          "Positive supports the mapping. Evidence, not a gate.", "", "```"]
    rows = []
    for k, j in enumerate(units.ARM):
        n = gs["joints"].get(j, {})
        if not n:
            rows.append([j, "no static frames", "", "", ""])
        elif not n.get("testable"):
            rows.append([j, f"not testable ({n['why']}; gravity std {n['gravity_torque_std_Nm']} N m, "
                            f"{n['n_frames']} frames)", "", "", f"{p['kp'][k]:.3g}"])
        else:
            kci = n.get("implied_static_stiffness_ci95") or [None, None]
            rows.append([j, f"{n['corr']:+.2f} [{n['corr_ci95'][0]:+.2f}, {n['corr_ci95'][1]:+.2f}] {n['verdict']}",
                         f"{n['gravity_torque_std_Nm']} N m, {n['n_frames']} fr",
                         _v(n.get("implied_static_stiffness_Nm_per_rad"), "{:.3g}") +
                         (f" [{_v(kci[0], '{:.3g}')}, {_v(kci[1], '{:.3g}')}]" if n.get("implied_static_stiffness_Nm_per_rad") else ""),
                         f"{p['kp'][k]:.3g}"])
    L += [_table(rows, ["joint", "corr [CI] verdict", "power (gravity std, n)", "implied static K N m/rad",
                        "fitted kp"]),
          f"static frames: {gs['n_static_frames']} ({gs['n_excluded_possible_table_contact']} excluded as possible table "
          f"contact) from {gs['n_episodes']} fit episodes", "```", ""]
    cfg = rep["fit"]["config"]
    L += ["## Method", "",
          f"- Recording convention ({rep['conventions']['recording_convention']}): {rep['conventions']['recording']}",
          f"- Replay: {rep['conventions']['replay']}",
          f"- Lag: {rep['conventions']['lag']}",
          f"- Units: {rep['units']['reason']} (decided on the fit episodes; held-out episodes "
          f"{'agree' if rep['units']['heldout_agrees'] else 'DISAGREE'}). Mapping to MJCF: q = sign*deg2rad(x) + "
          f"deg2rad(offset); {rep['mapping']['note']}",
          f"- Split: {rep['split']['method']} (seed {rep['split']['seed']}). Future: {rep['split']['future_heldout']}. "
          f"Interleaved: {rep['split']['interleaved_heldout']}. Overlap with fit: {rep['split']['overlap'] or 'none'}.",
          f"- Fit: {rep['fit']['optimizer']}; bounds {rep['fit']['bounds']}; delays screened {cfg['delays']} on "
          f"{cfg['screen_episodes']} fit episodes (each from the best point of a coarse global servo-gain grid), final "
          f"fit ({cfg['final_iters']} evaluations max) on all fit episodes; budgets counted in evaluations (deterministic).",
          "- Models compared: **stock** (Menagerie MJCF as published, documented mapping, no delay), **aligned stock** "
          "(stock dynamics + fitted delay + released limits), **baseline** (physics-free per-joint lag filter), "
          "**calibrated** (fitted kp, kv, frictionloss + delay + released limits).",
          ""]
    L += ["## Limitations", ""] + [f"- {x}" for x in rep["limitations"]] + [""]
    L += _provenance(rep)
    return "\n".join(L) + "\n"


def _provenance(rep: dict) -> list[str]:
    ds, tw, env = rep["dataset"], rep["twin"], rep["environment"]
    files = ", ".join(f"{f['path']} ({f['sha256'][:12]})" for f in ds["files"][:3])
    if len(ds["files"]) > 3:
        files += f", ... ({len(ds['files'])} files)"
    blas = "; ".join(f"{b['package']}: {b.get('corename', '?')}" for b in env.get("blas", []))
    return ["## Provenance and reproduction", "", "```",
            f"dataset        {ds['id']} @ {ds['revision_sha']} (requested {ds['revision_requested']})",
            f"               LeRobot {ds['codebase_version']}, robot_type {ds['robot_type']}, {ds['fps']:g} fps, "
            f"{ds['episodes_total']} episodes loaded (repo: {ds.get('episodes_in_repo')}), {len(ds['episodes_dropped'])} dropped",
            f"data files     {files}",
            f"twin           {tw['id']} ({tw['xml']}) from {tw['menagerie_repo']} @ {tw['menagerie_sha']}",
            f"               dir sha256 {tw['twin_dir_content_sha256'][:16]}..., timestep {tw['stock_timestep']} -> "
            f"{tw['timestep_used']:.6g} s x {tw['substeps_per_frame']} substeps/frame, contacts {tw['contacts']}",
            f"software       mujoco {env['mujoco']}, numpy {env['numpy']}, scipy {env['scipy']}, python {env['python']}, "
            f"meatspace_lab {env['meatspace_lab']} (code sha256 {env['code_sha256'][:16]}...)",
            f"hardware       {env['platform']['machine']} {env['platform']['cpu']}; OpenBLAS kernel {blas}",
            f"report         schema {rep['schema']}",
            f"               results sha256 {rep['results_sha256']}  (numbers only; any interpreter/CPU)",
            f"               content sha256 {rep['content_sha256']}  (numbers + environment above)",
            "```", "",
            "Reproduce (from `lab/`, see README) into a scratch directory and compare:", "", "```",
            f"python -m meatspace_lab report --dataset {ds['id']} --revision {ds['revision_sha']} \\",
            f"    --twin .cache/menagerie/{tw['id']} --out /tmp/repro/"
            + (f" --max-episodes {ds['max_episodes_loaded']}" if ds.get("max_episodes_loaded") else ""),
            f"python -m meatspace_lab verify reports/{ds['id'].replace('/', '__')}/report.json /tmp/repro/report.json",
            "```"]


ARTIFACTS = ("heldout_episode.svg", "rmse_by_joint.svg", "rmse_by_joint_future.svg", "calibrated_twin.json")


def write(report: dict, artifacts: dict, out_dir: str | Path) -> None:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    for name in ARTIFACTS:  # never leave an artifact of an earlier run next to a report that did not produce it
        if name not in artifacts and (out / name).exists():
            (out / name).unlink()
    (out / "report.json").write_text(json.dumps(report, indent=1, sort_keys=False) + "\n")
    (out / "report.md").write_text(to_markdown(report))
    for name, val in artifacts.items():
        if isinstance(val, dict):
            (out / name).write_text(json.dumps(val, indent=1) + "\n")
        else:
            (out / name).write_text(val + "\n")
