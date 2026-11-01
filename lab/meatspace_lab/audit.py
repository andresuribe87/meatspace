"""Gravity-sag consistency check of the dataset->MJCF joint mapping, from real data only (evidence, not a gate).

In a quasi-static hold a position servo settles where its restoring torque balances gravity:
K (u - q) = g(q) + c, with g(q) the gravity torque the twin computes at the mapped pose
(``qfrc_bias`` at zero velocity) and c an unknown constant (leader/follower calibration mismatch,
deadband). So on real static frames, sign_j * (a - x)_j [rad] should be positively and linearly
related to g_j(q): a positive correlation supports the mapping's sign and zero; the CENTRED
least-squares slope (cov/var, consistent with the centred correlation; v1 used an uncentred slope,
which could report a positive stiffness next to a negative correlation) gives an implied static
stiffness K_j = 1/slope, reported only when the correlation is clearly positive.

Frame selection: static frames (state and command steady within 0.2 deg over 5 frames) in the
middle 80% of each episode, and only where the gripper's lowest point is at least
``kinematics.CLEARANCE_M`` above the base plane (frames closer to it may be pressing on the table,
where the static error is set by contact, not gravity). Power: a joint is 'not testable' when its
gravity torque barely varies over the selected poses, or when too few frames/episodes remain.
"""

from __future__ import annotations

import mujoco
import numpy as np

from . import kinematics
from .metrics import _r
from .replay import EpisodeData, to_mjcf
from .twin import Mapping, Twin, TwinParams
from .units import ARM

MIN_GRAVITY_STD_NM = 0.02
MIN_FRAMES = 30
MIN_EPISODES = 5


def static_frames(x: np.ndarray, a: np.ndarray, tol_deg: float = 0.2, half: int = 2, trim: float = 0.1) -> np.ndarray:
    T = x.shape[0]
    ok = np.zeros(T, bool)
    for t in range(max(int(trim * T), half), min(T - half, int((1 - trim) * T))):
        w = slice(t - half, t + half + 1)
        if np.ptp(x[w, :5], axis=0).max() < tol_deg and np.ptp(a[w, :5], axis=0).max() < tol_deg:
            ok[t] = True
    return ok


def _slope(g: np.ndarray, y: np.ndarray) -> float:
    gc = g - g.mean()
    v = float(gc @ gc)
    return float(gc @ (y - y.mean())) / v if v > 0 else float("nan")


def gravity_sag(twin: Twin, mapping: Mapping, p: TwinParams, episodes: list[EpisodeData],
                n_boot: int = 2000, seed: int = 0) -> dict:
    m = twin.model(p)
    d = mujoco.MjData(m)
    per_ep = []  # (y[n,5] rad, g[n,5] Nm)
    n_static = n_contact = 0
    for e in episodes:
        sel = np.flatnonzero(static_frames(e.x, e.a))
        if len(sel) == 0:
            continue
        sel = sel[:: max(1, len(sel) // 60)]  # cap work per episode
        n_static += len(sel)
        clear = kinematics.clearance_m(twin, mapping, e.x[sel], p.offset_deg)
        keep = ~(clear < kinematics.CLEARANCE_M)  # NaN (no FK bodies defined) keeps the frame
        n_contact += int((~keep).sum())
        sel = sel[keep]
        if len(sel) == 0:
            continue
        Q = to_mjcf(e.x[sel], twin, mapping, p.offset_deg)
        G = np.empty((len(sel), 5))
        for i, q in enumerate(Q):
            d.qpos[:] = m.qpos0
            d.qpos[twin.qadr] = q
            d.qvel[:] = 0
            mujoco.mj_forward(m, d)
            G[i] = d.qfrc_bias[twin.dadr[:5]]
        y = mapping.sign * np.deg2rad(e.a[sel, :5] - e.x[sel, :5])
        per_ep.append((y, G))
    out = {"n_static_frames": int(n_static), "n_excluded_possible_table_contact": int(n_contact),
           "n_frames_used": int(sum(len(y) for y, _ in per_ep)), "n_episodes": len(per_ep),
           "clearance_m": kinematics.CLEARANCE_M, "joints": {}}
    if not per_ep:
        return out
    Y = np.concatenate([y for y, _ in per_ep])
    G = np.concatenate([g for _, g in per_ep])
    rng = np.random.default_rng(seed)
    for j, name in enumerate(ARM):
        g, y = G[:, j], Y[:, j]
        g_std = float(np.std(g))
        base = {"gravity_torque_std_Nm": _r(g_std, 4), "gravity_torque_rms_Nm": _r(float(np.sqrt(np.mean(g ** 2))), 4),
                "n_frames": int(len(g)), "n_episodes": len(per_ep)}
        if g_std < MIN_GRAVITY_STD_NM or len(g) < MIN_FRAMES or len(per_ep) < MIN_EPISODES:
            why = ("gravity torque ~constant over the selected static poses" if g_std < MIN_GRAVITY_STD_NM
                   else "too few static off-table frames/episodes")
            out["joints"][name] = {"testable": False, "why": why, **base}
            continue
        corr = float(np.corrcoef(g, y)[0, 1])
        slope = _slope(g, y)
        bc, bs = [], []
        for _ in range(n_boot):
            idx = rng.integers(0, len(per_ep), len(per_ep))
            gb = np.concatenate([per_ep[k][1][:, j] for k in idx])
            yb = np.concatenate([per_ep[k][0][:, j] for k in idx])
            ok = np.std(gb) > 0 and np.std(yb) > 0
            bc.append(np.corrcoef(gb, yb)[0, 1] if ok else np.nan)
            bs.append(_slope(gb, yb) if ok else np.nan)
        lo, hi = np.nanquantile(bc, [0.025, 0.975])
        slo, shi = np.nanquantile(bs, [0.025, 0.975])
        verdict = "positive" if lo > 0 else ("negative" if hi < 0 else "inconclusive")
        K = K_ci = None
        if verdict == "positive" and slope > 0:
            K = _r(1.0 / slope, 2)
            K_ci = [_r(1.0 / shi, 2) if shi > 0 else None, _r(1.0 / slo, 2) if slo > 0 else None]
        out["joints"][name] = {
            "testable": True, "corr": _r(corr, 3), "corr_ci95": [_r(lo, 3), _r(hi, 3)], "verdict": verdict,
            "implied_static_stiffness_Nm_per_rad": K, "implied_static_stiffness_ci95": K_ci,
            "sag_rms_deg": _r(float(np.rad2deg(np.sqrt(np.mean(y ** 2)))), 3), **base,
        }
    return out
