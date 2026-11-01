"""Trajectory metrics, lag estimation and episode-level bootstrap.

Indexing convention (see replay.py): in the replay (and in current-LeRobot recordings) ``x[t]``
is read before command ``a[t]`` is sent, so the earliest state that can reflect ``a[t]`` is
``x[t+1]``; legacy recordings read ``x[t]`` a few ms after sending ``a[t]``. Every metric below is computed with
the same code on real and simulated trajectories, so the convention cannot bias a sim-vs-real
comparison.

Lag. ``lag_frames(cmd, state)`` returns the shift L minimising Var(cmd[t] - state[t+L]) over a
FIXED window t in [0, T - max_lag) (the window does not shrink with L, so larger shifts are
not favoured), refined to sub-frame resolution by a parabola through the three lowest-cost
shifts. Using the variance makes it insensitive to a static bias (gravity sag, leader/follower
calibration mismatch). For ``state[t] = cmd[t - k]`` it returns k exactly; an ideal
instantaneous actuator therefore measures L = 1 in the replay (the sampling convention), and a
pure command delay of d frames adds exactly d.

Uncertainty. Episodes are the unit of independence: CIs are percentile bootstrap intervals
over episodes (resampling whole episodes, fixed seed). Paired comparisons (stock vs
calibrated on the same episodes) resample the episode-level differences.
"""

from __future__ import annotations

import numpy as np

N_BOOT = 10000


def lag_frames(cmd: np.ndarray, state: np.ndarray, max_lag: int = 10, min_std: float = 1.0,
               subframe: bool = True) -> float:
    cmd = np.asarray(cmd, dtype=np.float64)
    state = np.asarray(state, dtype=np.float64)
    T = len(cmd)
    W = T - max_lag
    if W < 30:
        return float("nan")
    c = cmd[:W]
    if c.std() < min_std:  # not enough excitation to define a lag
        return float("nan")
    costs = np.array([np.var(c - state[L:L + W]) for L in range(max_lag + 1)])
    k = int(np.argmin(costs))
    if not subframe or k == 0 or k == max_lag:
        return float(k)
    c0, c1, c2 = costs[k - 1], costs[k], costs[k + 1]
    den = c0 - 2 * c1 + c2
    if den <= 0:
        return float(k)
    delta = 0.5 * (c0 - c2) / den
    return float(k + np.clip(delta, -0.5, 0.5))


def rmse(a: np.ndarray, b: np.ndarray, axis: int = 0) -> np.ndarray:
    return np.sqrt(np.mean((np.asarray(a) - np.asarray(b)) ** 2, axis=axis))


def episode_metrics(x: np.ndarray, a: np.ndarray, xs: np.ndarray | None, max_lag: int = 10) -> dict:
    """Per-episode, per-arm-joint metrics in degrees.

    x: real state (T, >=5), a: command (T, >=5), xs: sim state (T, 5) or None (real-only).
    """
    x, a = x[:, :5], a[:, :5]
    out = {
        "n_frames": int(x.shape[0]),
        "real_tracking_rmse": rmse(a[:-1], x[1:]),
        "real_lag_frames": np.array([lag_frames(a[:, j], x[:, j], max_lag) for j in range(5)]),
    }
    if xs is not None:
        out["sim_vs_real_rmse"] = rmse(xs[1:], x[1:])
        out["sim_tracking_rmse"] = rmse(a[:-1], xs[1:])
        out["sim_lag_frames"] = np.array([lag_frames(a[:, j], xs[:, j], max_lag) for j in range(5)])
        out["final_pose_gap"] = np.abs(xs[-1] - x[-1])
    return out


def _rng(seed: int) -> np.random.Generator:
    return np.random.default_rng(seed)


def bootstrap_mean_ci(v: np.ndarray, n_boot: int = N_BOOT, seed: int = 0, alpha: float = 0.05,
                      stat=np.nanmean) -> tuple[float, float, float]:
    """Mean over episodes and percentile-bootstrap CI (resampling episodes). v: (n,)."""
    v = np.asarray(v, dtype=np.float64)
    v = v[np.isfinite(v)]
    n = len(v)
    if n == 0:
        return (float("nan"),) * 3
    est = float(stat(v))
    if n == 1:
        return est, float("nan"), float("nan")
    idx = _rng(seed).integers(0, n, size=(n_boot, n))
    boots = stat(v[idx], axis=1)
    lo, hi = np.quantile(boots, [alpha / 2, 1 - alpha / 2])
    return est, float(lo), float(hi)


def bootstrap_ratio_ci(num: np.ndarray, den: np.ndarray, n_boot: int = N_BOOT, seed: int = 0,
                       alpha: float = 0.05) -> tuple[float, float, float]:
    """1 - mean(num)/mean(den) with paired episode resampling (relative improvement)."""
    num, den = np.asarray(num, float), np.asarray(den, float)
    ok = np.isfinite(num) & np.isfinite(den)
    num, den = num[ok], den[ok]
    n = len(num)
    if n == 0:
        return (float("nan"),) * 3
    est = float(1 - num.mean() / den.mean())
    if n == 1:
        return est, float("nan"), float("nan")
    idx = _rng(seed).integers(0, n, size=(n_boot, n))
    boots = 1 - num[idx].mean(1) / den[idx].mean(1)
    lo, hi = np.quantile(boots, [alpha / 2, 1 - alpha / 2])
    return est, float(lo), float(hi)


def summarize(values: np.ndarray, seed: int = 0) -> dict:
    """(n_episodes,) -> {mean, ci95, p90, median, n}."""
    v = np.asarray(values, float)
    fin = v[np.isfinite(v)]
    m, lo, hi = bootstrap_mean_ci(fin, seed=seed)
    return {
        "mean": _r(m), "ci95": [_r(lo), _r(hi)],
        "p90": _r(np.percentile(fin, 90)) if len(fin) else None,
        "median": _r(np.median(fin)) if len(fin) else None,
        "n": int(len(fin)),
    }


def _r(v, nd: int = 4):
    if v is None or not np.isfinite(v):
        return None
    return float(round(float(v), nd))


def summarize_per_joint(per_ep: np.ndarray, joints, seed: int = 0) -> dict:
    """(n_episodes, 5) -> per joint summary + 'arm_mean' (per-episode mean over joints)."""
    import warnings

    per_ep = np.asarray(per_ep, float)
    out = {j: summarize(per_ep[:, k], seed=seed + k) for k, j in enumerate(joints)}
    with warnings.catch_warnings():  # an episode with every joint NaN (e.g. no static frames) is skipped
        warnings.simplefilter("ignore", RuntimeWarning)
        arm = np.nanmean(per_ep, axis=1)
    out["arm_mean"] = summarize(arm, seed=seed + 99)
    return out


def paired_improvement(stock: np.ndarray, calib: np.ndarray, seed: int = 0) -> dict:
    """Per-episode paired comparison of an error metric (lower is better), (n,) arrays.

    Sign convention used everywhere in reports: ``rel_change`` = mean(calib)/mean(stock) - 1, NEGATIVE
    means the second model is better (-0.64 = 64% lower error). ``rel_reduction`` (= -rel_change) is
    kept for backwards compatibility of report.json. The per-episode relative changes
    (calib_e/stock_e - 1) are summarised too, so one or two outlier episodes cannot hide behind the mean.
    """
    stock, calib = np.asarray(stock, float), np.asarray(calib, float)
    d = stock - calib
    m, lo, hi = bootstrap_mean_ci(d, seed=seed)
    r, rlo, rhi = bootstrap_ratio_ci(calib, stock, seed=seed + 1)
    ok = np.isfinite(stock) & np.isfinite(calib) & (stock > 0)
    pe = calib[ok] / stock[ok] - 1.0
    med, mlo, mhi = bootstrap_mean_ci(pe, seed=seed + 2, stat=np.nanmedian)
    return {
        "abs_reduction_deg": {"mean": _r(m), "ci95": [_r(lo), _r(hi)]},
        "rel_reduction": {"mean": _r(r), "ci95": [_r(rlo), _r(rhi)]},
        "rel_change": {"mean": _r(-r), "ci95": [_r(-rhi), _r(-rlo)]},
        "per_episode_rel_change": {
            "median": _r(med), "median_ci95": [_r(mlo), _r(mhi)],
            "min": _r(float(pe.min())) if len(pe) else None, "max": _r(float(pe.max())) if len(pe) else None,
        },
        "episodes_improved": int(np.sum(d > 0)),
        "episodes_total": int(np.sum(np.isfinite(d))),
    }
