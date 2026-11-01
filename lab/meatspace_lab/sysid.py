"""System identification of the twin from TRAIN episodes only.

Fitted per arm joint (5 joints): actuator kp (log-parametrised), actuator kv (the servo's velocity
term; joint damping stays at stock and is redundant with kv) and frictionloss; plus one integer
command delay shared by all joints. Fixed at their documented/stock values by default (v2):

* armature: kp and armature are not separately identifiable from position trajectories (only the
  bandwidth kp / I_eff is; posterior correlation 0.99 in v1), so armature stays at stock and the
  report states the identifiable combinations (natural frequency, damping ratio) instead.
* zero offsets: they act only through gravity and joint limits, were unidentified in v1 (they went
  to the +-20 deg bounds and made forward kinematics less plausible), so the shipped twin keeps the
  documented calibration convention (``FitConfig.fit_offsets`` re-enables them for diagnostics).

Objective: mean over train episodes of the per-episode mean squared sim-vs-real joint error
(deg^2, frames t = 1..T-1, arm joints), i.e. every episode counts equally, plus a weak ridge
prior toward the stock values (PRIOR_WEIGHT deg^2 per scale unit) that only matters for parameters
the data do not constrain.

Joint limits ("range envelope"): a stock MJCF limit that the TRAIN data (states or commands) cross
by more than LIMIT_TOL_DEG is falsified for this robot and is released (moved to +-2 pi, i.e. no
stop within the motion); limits the data do not cross stay at stock. v1 instead set the limits to
the TRAIN range of motion + 2 deg, which clipped held-out motion outside that range (24% of
wrist_roll frames on a chronological split).

Procedure (deterministic; budgets are counted in evaluations, never wall-clock):
  1. delay screen: for each candidate delay d, a coarse grid over a global servo-gain multiplier
     (GAIN_GRID, all other parameters at stock), then a short bounded local fit from the best grid
     point, on a fixed subset of train episodes; d* = argmin of the screened train loss.
  2. final fit at d* on all train episodes (``scipy.optimize.least_squares``, TRF, bounded,
     forward-difference Jacobian evaluated as one batched multi-threaded MuJoCo rollout). Whether it
     met its tolerance or stopped at the evaluation budget is recorded (``converged``).
  3. identifiability at the optimum (see ``identifiability``).
  4. ablation "aligned stock": stock dynamics; only the delay (and the range envelope) are fitted.
A wall-clock safety limit exists; if it triggers, the best point so far is used and the report
says the run was time-limited (and therefore not bit-reproducible).
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field

import mujoco
import numpy as np
from scipy.optimize import least_squares

from .replay import EpisodeData, Replayer, prepare, from_mjcf_arm, to_mjcf
from .twin import Mapping, Twin, TwinParams, apply_to_model
from .units import ARM

# absolute physical bounds shared by SO-100/SO-101 (same STS3215 servo); stock values lie inside
BOUNDS = {
    "kp": (1.0, 3000.0),  # N m / rad
    "kv": (0.0, 50.0),  # N m s / rad
    "armature": (1e-4, 0.5),  # kg m^2 (reflected rotor inertia)
    "frictionloss": (0.0, 1.0),  # N m
}
FD_STEP = {"kp": 0.03, "kv": 0.02, "armature": 0.03, "frictionloss": 0.003, "offset": 0.05}
# typical scale of each optimisation coordinate (TRF x_scale, and the unit of the weak prior)
X_SCALE = {"kp": 1.0, "kv": 5.0, "armature": 1.0, "frictionloss": 0.5, "offset": 20.0}
# a parameter is "at its bound" when closer than this (optimisation coordinates: log for kp/armature,
# N m s/rad for kv, N m for frictionloss, deg for offsets = 1% of the +-20 deg width). TRF iterates
# approach a bound asymptotically, so v1's 1e-6 test never fired.
BOUND_TOL = {"kp": 1e-3, "armature": 1e-3, "kv": 0.01, "frictionloss": 1e-3, "offset": 0.4}
PRIOR_WEIGHT = 1e-4  # deg^2 per (scale unit)^2 of deviation from stock / nominal: pins unidentified params
LIMIT_TOL_DEG = 0.5  # data crossing a stock limit by more than this falsify it
RELEASED_LIMIT_RAD = 2 * np.pi
# coarse global grid on the servo gains before each local fit: a stiff stock actuator saturates its torque
# limit, where d(error)/d(kp) ~ 0, so a purely local fit started at stock can stay stuck there
GAIN_GRID = (3.0, 1.0, 0.3, 0.1, 0.03, 0.01)  # kp multiplier; kv scales with sqrt (same damping ratio)
N_BOOT_IDENT = 2000
UNIDENTIFIED_RATIO = 10.0  # marginal/conditional std ratio above which a parameter is not identified alone


@dataclass
class FitConfig:
    seed: int = 0
    test_frac: float = 0.2  # fraction held out in EACH of the two held-out sets (interleaved, future block)
    max_train_episodes: int = 40
    delays: tuple[int, ...] = (0, 1, 2, 3, 4, 5)
    screen_episodes: int = 16
    screen_iters: int = 4
    final_iters: int = 30
    offset_bound_deg: float = 20.0  # sign/plausibility gate tolerance (and offset bound if fit_offsets)
    time_limit_s: float = 3600.0
    widen_ranges: bool = True
    fit_offsets: bool = False
    fit_armature: bool = False

    def to_dict(self) -> dict:
        return {k: (list(v) if isinstance(v, tuple) else v) for k, v in self.__dict__.items()}


@dataclass
class Split:
    fit: list[int]  # episodes the fit uses
    interleaved: list[int]  # held-out episodes drawn at random from the same period as the fit episodes
    future: list[int]  # held-out block: the last episodes by index (recorded after every fit episode)
    unused_train: list[int]  # train-pool episodes beyond the fit cap; evaluated as part of `interleaved`

    def to_dict(self) -> dict:
        return {"fit": self.fit, "interleaved_heldout": self.interleaved, "future_heldout": self.future,
                "unused_train_in_interleaved": self.unused_train}


def split_episodes(indices: list[int], test_frac: float, seed: int, max_train: int = 10**9) -> Split:
    """Deterministic three-way split by episode index (episodes never straddle sets).

    future      = the last round(n * test_frac) episodes by index (chronological block hold-out)
    interleaved = round(n * test_frac) episodes drawn by default_rng(seed).permutation from the rest,
                  plus every remaining episode beyond the ``max_train`` fit cap
    fit         = the remaining episodes (at most max_train)
    """
    idx = sorted(int(i) for i in indices)
    n = len(idx)
    if n < 3:
        raise ValueError(f"need at least 3 episodes for a fit/interleaved/future split, got {n}")
    k = max(1, int(round(n * test_frac)))
    future, pool = idx[n - k:], idx[: n - k]
    perm = [int(i) for i in np.random.default_rng(seed).permutation(np.array(pool))]
    k_i = min(k, len(pool) - 1)
    inter, rest = perm[:k_i], perm[k_i:]
    fit, unused = rest[:max_train], rest[max_train:]
    return Split(sorted(fit), sorted(inter + unused), future, sorted(unused))


class _Timeout(Exception):
    pass


@dataclass
class Layout:
    """Maps an optimisation vector to TwinParams."""

    names: list[tuple[str, int]]  # (param, joint)
    base: TwinParams
    range_fn: object = None  # callable(TwinParams) -> TwinParams setting joint ranges, or None

    def lower_upper(self, offset_bound: float) -> tuple[np.ndarray, np.ndarray]:
        lo, hi = [], []
        for p, _ in self.names:
            if p in ("kp", "armature"):
                lo.append(np.log(BOUNDS[p][0]))
                hi.append(np.log(BOUNDS[p][1]))
            elif p == "offset":
                lo.append(-offset_bound)
                hi.append(offset_bound)
            else:
                lo.append(BOUNDS[p][0])
                hi.append(BOUNDS[p][1])
        return np.array(lo), np.array(hi)

    def x_of(self, p: TwinParams) -> np.ndarray:
        x = []
        for name, j in self.names:
            if name == "kp":
                x.append(np.log(p.kp[j]))
            elif name == "armature":
                x.append(np.log(p.armature[j]))
            elif name == "kv":
                x.append(p.kv[j])
            elif name == "frictionloss":
                x.append(p.frictionloss[j])
            elif name == "offset":
                x.append(p.offset_deg[j])
        return np.array(x, dtype=float)

    def params_of(self, x: np.ndarray, delay: int) -> TwinParams:
        p = self.base.copy()
        p.delay_frames = int(delay)
        for v, (name, j) in zip(x, self.names):
            if name == "kp":
                p.kp[j] = np.exp(v)
            elif name == "armature":
                p.armature[j] = np.exp(v)
            elif name == "kv":
                p.kv[j] = v
            elif name == "frictionloss":
                p.frictionloss[j] = v
            elif name == "offset":
                p.offset_deg[j] = v
        if self.range_fn is not None:
            p = self.range_fn(p)
        return p

    def steps(self) -> np.ndarray:
        return np.array([FD_STEP[n] for n, _ in self.names])

    def scales(self) -> np.ndarray:
        return np.array([X_SCALE[n] for n, _ in self.names])


def observed_range_deg(episodes: list[EpisodeData]) -> np.ndarray:
    """(5, 2) min/max over recorded states AND commands of the given episodes (physical deg)."""
    X = np.concatenate([np.concatenate([e.x[:, :5], e.a[:, :5]]) for e in episodes])
    return np.stack([X.min(0), X.max(0)], axis=1)


def falsified_limits(twin: Twin, mapping: Mapping, obs_deg: np.ndarray, offset_corr_deg: np.ndarray | None = None,
                     tol_deg: float = LIMIT_TOL_DEG) -> np.ndarray:
    """(5, 2) bool: stock MJCF lower/upper limit crossed by the observed range by more than tol_deg."""
    off = mapping.offset_deg + (0.0 if offset_corr_deg is None else offset_corr_deg)
    q1, q2 = mapping.sign * obs_deg[:, 0] + off, mapping.sign * obs_deg[:, 1] + off
    qlo, qhi = np.minimum(q1, q2), np.maximum(q1, q2)
    lim = np.rad2deg(twin.base.jnt_range[twin.jid[:5]])
    return np.stack([qlo < lim[:, 0] - tol_deg, qhi > lim[:, 1] + tol_deg], axis=1)


def range_envelope(twin: Twin, mapping: Mapping, obs_deg: np.ndarray):
    """Joint/ctrl ranges = stock range, with every limit the TRAIN motion falsifies released to +-2 pi.

    The decision is per limit and binary (falsified or not); the released value does not depend on how
    far the train motion went, so held-out motion beyond the train range is not clipped by construction.
    """
    stock = twin.base.jnt_range[twin.jid[:5]].copy()

    def fn(p: TwinParams) -> TwinParams:
        f = falsified_limits(twin, mapping, obs_deg, p.offset_deg)
        lo = np.where(f[:, 0], -RELEASED_LIMIT_RAD, stock[:, 0])
        hi = np.where(f[:, 1], RELEASED_LIMIT_RAD, stock[:, 1])
        p.jnt_range = np.stack([lo, hi], axis=1)
        return p

    return fn


def build_model(twin: Twin, p: TwinParams):
    m = twin._copy_base()
    apply_to_model(m, twin, p)
    return m


class Objective:
    def __init__(self, replayer: Replayer, episodes: list[EpisodeData], mapping: Mapping, layout: Layout,
                 delay: int, deadline: float):
        self.r = replayer
        self.eps = episodes
        self.mapping = mapping
        self.layout = layout
        self.delay = delay
        self.deadline = deadline
        self.n_traj = sum((e.n - 1) * 5 for e in episodes)
        self.w = [1.0 / np.sqrt((e.n - 1) * 5 * len(episodes)) for e in episodes]
        self.x_prior = layout.x_of(layout.base)
        self.prior_w = np.sqrt(PRIOR_WEIGHT) / layout.scales()
        self.nfev = 0
        self.best = (np.inf, None)
        self._cache: tuple[np.ndarray, np.ndarray] | None = None

    def _residuals_many(self, X: list[np.ndarray]) -> list[np.ndarray]:
        if time.monotonic() > self.deadline:
            raise _Timeout()
        jobs, metas = [], []
        for x in X:
            p = self.layout.params_of(x, self.delay)
            m = build_model(self.r.twin, p)
            for e in self.eps:
                q0, ctrl = prepare(e, self.r.twin, self.mapping, p)
                jobs.append((m, q0, ctrl))
            metas.append(p)
        qs = self.r.run(jobs)
        out = []
        k = 0
        for x, p in zip(X, metas):
            parts = []
            for e, w in zip(self.eps, self.w):
                xs = from_mjcf_arm(qs[k], self.mapping, p.offset_deg)
                parts.append(((xs[1:] - e.x[1:, :5]) * w).ravel())
                k += 1
            parts.append((x - self.x_prior) * self.prior_w)
            r = np.concatenate(parts)
            cost = float(r @ r)
            self.nfev += 1
            if cost < self.best[0]:
                self.best = (cost, x.copy())
            out.append(r)
        return out

    def fun(self, x: np.ndarray) -> np.ndarray:
        if self._cache is not None and np.array_equal(self._cache[0], x):
            return self._cache[1]
        r = self._residuals_many([x])[0]
        self._cache = (x.copy(), r)
        return r

    def jac(self, x: np.ndarray, lo: np.ndarray, hi: np.ndarray) -> np.ndarray:
        r0 = self.fun(x)
        h = self.layout.steps()
        h = np.where(x + h > hi, -h, h)  # step backwards at the upper bound
        X = []
        for i in range(len(x)):
            xi = x.copy()
            xi[i] += h[i]
            X.append(xi)
        R = self._residuals_many(X)
        return np.stack([(Ri - r0) / hi_ for Ri, hi_ in zip(R, h)], axis=1)

    def cost(self, x: np.ndarray) -> float:
        r = self.fun(x)
        return float(r @ r)

    def mse_many(self, X: list[np.ndarray]) -> list[float]:
        return [float(r[: self.n_traj] @ r[: self.n_traj]) for r in self._residuals_many(X)]

    def mse(self, x: np.ndarray) -> float:
        """Trajectory part only: mean over episodes of per-episode MSE (deg^2)."""
        r = self.fun(x)[: self.n_traj]
        return float(r @ r)


@dataclass
class FitResult:
    params: TwinParams
    train_cost: float  # mean per-episode MSE, deg^2
    delay_screen: dict = field(default_factory=dict)
    gain_grid: dict = field(default_factory=dict)
    nfev: int = 0
    time_limited: bool = False
    status: str = ""
    converged: bool | None = None  # None: nothing continuous was fitted
    fitted: list = field(default_factory=list)  # parameter names, e.g. "kp[shoulder_pan]"
    at_bound: list = field(default_factory=list)
    identifiability: dict = field(default_factory=dict)


def _solve(obj: "Objective", x0: np.ndarray, lo: np.ndarray, hi: np.ndarray, iters: int) -> tuple[np.ndarray, bool, str, int]:
    x0 = np.clip(x0, lo + 1e-9, hi - 1e-9)
    try:
        res = least_squares(obj.fun, x0, jac=lambda x: obj.jac(x, lo, hi), bounds=(lo, hi), method="trf",
                            x_scale=obj.layout.scales(), max_nfev=iters, ftol=1e-4, xtol=1e-5, gtol=1e-8)
        x = res.x if obj.cost(res.x) <= obj.best[0] + 1e-15 else obj.best[1]
        return x, False, str(res.message), int(res.status)
    except _Timeout:
        x = obj.best[1] if obj.best[1] is not None else x0
        return x, True, "wall-clock safety limit reached; best point so far used", 0


def _labels(names: list[tuple[str, int]]) -> list[str]:
    return [f"{p}[{ARM[j]}]" for p, j in names]


def _at_bound(names, x, lo, hi) -> list[bool]:
    return [bool(min(xi - l, h - xi) < BOUND_TOL[n]) for (n, _), xi, l, h in zip(names, x, lo, hi)]


def _sig(v: float, digits: int = 3, floor: float = 1e-9) -> float:
    """Significant-digit rounding with an absolute floor (|v| < floor -> 0.0): CPU-noise free."""
    v = float(v)
    if not np.isfinite(v) or abs(v) < floor:
        return 0.0
    return float(f"{v:.{digits}g}") + 0.0


def effective_inertia(twin: Twin, mapping: Mapping, p: TwinParams, episodes: list[EpisodeData]) -> np.ndarray:
    """(5,) diagonal of the joint-space inertia matrix (armature included) at the median recorded pose."""
    m = build_model(twin, p)
    d = mujoco.MjData(m)
    xm = np.median(np.concatenate([e.x for e in episodes]), axis=0)[None, :]
    d.qpos[:] = m.qpos0
    d.qpos[twin.qadr] = to_mjcf(xm, twin, mapping, p.offset_deg)[0]
    mujoco.mj_forward(m, d)
    M = np.zeros((m.nv, m.nv))
    mujoco.mj_fullM(m, d, M)
    return np.array([M[k, k] for k in twin.dadr[:5]])


def identifiability(obj: "Objective", x: np.ndarray, lo: np.ndarray, hi: np.ndarray, twin: Twin,
                    mapping: Mapping, p: TwinParams, seed: int = 0, n_boot: int = N_BOOT_IDENT) -> dict:
    """Local identifiability at the fitted point, from the train-episode Jacobian.

    * eigen-structure of the Gauss-Newton information J^T J (in TRF-scaled coordinates);
    * per parameter, the ratio of marginal to conditional standard deviation, sqrt(diag(H^-1) diag(H))
      (sqrt of the variance inflation factor): 1 = identified on its own, >> 1 = only a combination
      with other parameters is identified;
    * strongest posterior correlations;
    * 95% CIs from a linearised episode bootstrap: whole train episodes are resampled with replacement
      and one Gauss-Newton step is taken from the fitted point with the resampled Jacobian/residual
      blocks (centred on the full-sample step). It captures episode-to-episode variability under the
      local linearisation, not multi-modality or the optimiser's own non-convergence;
    * the identifiable servo combinations per joint: natural frequency sqrt(kp / I_eff) and damping
      ratio (kv + damping) / (2 sqrt(kp I_eff)), I_eff = joint-space inertia diagonal at the median pose.
    Parameters at a bound are held fixed. Only the trajectory part enters the eigen/ratio analysis;
    the weak prior is included in the bootstrap steps (it regularises directions the data do not see).
    """
    names = obj.layout.names
    lab = _labels(names)
    r = obj.fun(x)
    J = obj.jac(x, lo, hi)
    nt = obj.n_traj
    bound = _at_bound(names, x, lo, hi)
    free = np.array([not b for b in bound])
    sc = obj.layout.scales()
    Jf = J[:nt][:, free] * sc[free]  # scaled coordinates
    rt = r[:nt]
    H = Jf.T @ Jf
    out: dict = {"method": "local Gauss-Newton analysis at the fitted point (train episodes)", "parameters": [],
                 "at_bound": [l for l, b in zip(lab, bound) if b]}
    if free.sum() == 0:
        return out
    ev, V = np.linalg.eigh(H)
    evmax = float(ev.max()) if ev.max() > 0 else 1.0
    Hinv = np.linalg.pinv(H)
    ratio = np.sqrt(np.clip(np.diag(Hinv) * np.diag(H), 0, None))
    sd = np.sqrt(np.clip(np.diag(Hinv), 1e-300, None))
    C = Hinv / np.outer(sd, sd)
    flab = [l for l, f in zip(lab, free) if f]
    pairs = sorted(((abs(C[i, k]), flab[i], flab[k], C[i, k]) for i in range(len(flab)) for k in range(i + 1, len(flab))),
                   reverse=True)
    weak = []
    for k in range(min(3, len(ev))):
        v = V[:, k]
        top = np.argsort(-np.abs(v))[:4]
        weak.append({"eig_rel": _sig(ev[k] / evmax, 3, 1e-12),
                     "loadings": {flab[i]: round(float(v[i]), 2) + 0.0 for i in top}})
    # linearised episode bootstrap
    blocks, k0 = [], 0
    for e in obj.eps:
        nb = (e.n - 1) * 5
        blocks.append((Jf[k0:k0 + nb], rt[k0:k0 + nb]))
        k0 += nb
    He = np.stack([b.T @ b for b, _ in blocks])
    ge = np.stack([b.T @ rr for b, rr in blocks])
    pw = (obj.prior_w * sc)[free]
    Hp = np.diag(pw ** 2)
    gp = pw ** 2 * ((x - obj.x_prior) / sc)[free]
    N = len(blocks)

    def step(counts):
        Hb = np.tensordot(counts, He, 1) + Hp
        gb = counts @ ge + gp
        return -np.linalg.solve(Hb, gb)

    d_full = step(np.ones(N))
    rng = np.random.default_rng(seed)
    draws = np.empty((n_boot, int(free.sum())))
    for b in range(n_boot):
        c = np.bincount(rng.integers(0, N, N), minlength=N).astype(float)
        draws[b] = step(c) - d_full
    X = np.tile(x, (n_boot, 1))
    X[:, free] += draws * sc[free]

    def nat(xv, name):
        return np.exp(xv) if name in ("kp", "armature") else np.maximum(xv, 0.0)

    for i, ((name, j), l) in enumerate(zip(names, lab)):
        v = nat(x[i], name)
        item = {"param": name, "joint": ARM[j], "value": _sig(v, 4, 1e-9), "at_bound": bound[i]}
        if free[i]:
            fi = int(np.sum(free[:i]))
            lo_, hi_ = np.quantile(nat(X[:, i], name), [0.025, 0.975])
            item.update({"ci95": [_sig(lo_, 4, 1e-9), _sig(hi_, 4, 1e-9)],
                         "marginal_over_conditional_std": _sig(ratio[fi], 3, 1e-6),
                         "identified_alone": bool(ratio[fi] < UNIDENTIFIED_RATIO)})
        out["parameters"].append(item)
    I = effective_inertia(twin, mapping, p, obj.eps)
    derived = {}
    for j in range(5):
        def col(name):
            k = next((i for i, (n, jj) in enumerate(names) if n == name and jj == j), None)
            if k is None:
                v = {"kp": p.kp, "kv": p.kv, "frictionloss": p.frictionloss, "armature": p.armature}[name][j]
                return np.full(n_boot, v), float(v)
            return nat(X[:, k], name), float(nat(x[k], name))
        kp_b, kp0 = col("kp")
        kv_b, kv0 = col("kv")
        dmp = float(p.damping[j])
        wn_b, wn0 = np.sqrt(kp_b / I[j]) / (2 * np.pi), np.sqrt(kp0 / I[j]) / (2 * np.pi)
        z_b, z0 = (kv_b + dmp) / (2 * np.sqrt(kp_b * I[j])), (kv0 + dmp) / (2 * np.sqrt(kp0 * I[j]))
        derived[ARM[j]] = {
            "I_eff_kgm2": _sig(I[j], 4, 1e-12),
            "natural_freq_hz": {"value": _sig(wn0, 3), "ci95": [_sig(v, 3) for v in np.quantile(wn_b, [0.025, 0.975])]},
            "damping_ratio": {"value": _sig(z0, 3), "ci95": [_sig(v, 3) for v in np.quantile(z_b, [0.025, 0.975])]},
        }
    out.update({
        "condition_number": _sig(evmax / max(float(ev.min()), 1e-300), 3, 0.0),
        "eig_rel_ascending": [_sig(v / evmax, 3, 1e-12) for v in ev],
        "weakest_directions": weak,
        "strong_correlations": [[a, b, round(float(c), 3) + 0.0] for _, a, b, c in pairs if abs(c) > 0.95][:12],
        "unidentified_ratio_threshold": UNIDENTIFIED_RATIO,
        "derived": derived,
        "bootstrap": {"n": n_boot, "seed": seed, "kind": "linearised one-step Gauss-Newton, whole train episodes resampled"},
    })
    return out


def fit(twin: Twin, replayer: Replayer, train: list[EpisodeData], mapping: Mapping, cfg: FitConfig,
        dynamics: bool = True, log=print) -> FitResult:
    """dynamics=False fits only the delay (+ range envelope, + offsets if cfg.fit_offsets): 'aligned stock'."""
    t_start = time.monotonic()
    deadline = t_start + cfg.time_limit_s
    names: list[tuple[str, int]] = []
    if dynamics:
        per = ("kp", "kv", "armature", "frictionloss") if cfg.fit_armature else ("kp", "kv", "frictionloss")
        names = [(p, j) for j in range(5) for p in per]
    if cfg.fit_offsets:
        names += [("offset", j) for j in range(5)]
    rf = range_envelope(twin, mapping, observed_range_deg(train)) if cfg.widen_ranges else None
    layout = Layout(names, twin.stock.copy(), rf)
    lo, hi = layout.lower_upper(cfg.offset_bound_deg)
    x_stock = layout.x_of(twin.stock)
    screen = train[: min(cfg.screen_episodes, len(train))]
    screen_iters = cfg.screen_iters if dynamics else max(2, cfg.screen_iters // 2)
    final_iters = cfg.final_iters if dynamics else max(2, cfg.final_iters // 3)
    delays: dict = {}
    sols: dict = {}
    nfev = 0
    tl = False
    grid: dict = {}
    for d in cfg.delays:
        obj = Objective(replayer, screen if names else train, mapping, layout, d, deadline)
        x0 = x_stock
        if not names:  # nothing continuous to fit: the screen is the fit
            try:
                delays[int(d)] = float(obj.mse(x0))
            except _Timeout:
                tl = True
                break
            nfev += obj.nfev
            sols[d] = x0
            log(f"    delay {d}: train MSE {delays[int(d)]:.4f} deg^2")
            continue
        if dynamics:
            starts = []
            for g in GAIN_GRID:
                xg = x_stock.copy()
                for i, (name, _) in enumerate(names):
                    if name == "kp":
                        xg[i] += np.log(g)
                    elif name == "kv":
                        xg[i] *= np.sqrt(g)
                starts.append(np.clip(xg, lo + 1e-9, hi - 1e-9))
            try:
                gm = obj.mse_many(starts)
            except _Timeout:
                gm = [np.inf] * len(starts)
            grid[int(d)] = {str(g): float(f"{v:.5g}") for g, v in zip(GAIN_GRID, gm)}
            x0 = starts[int(np.argmin(gm))]
        x, timed, _, _ = _solve(obj, x0, lo, hi, screen_iters)
        nfev += obj.nfev
        tl |= timed
        delays[int(d)] = float(obj.mse(x)) if not timed else float(obj.best[0])
        sols[d] = x
        log(f"    delay {d}: screened train MSE {delays[int(d)]:.4f} deg^2 ({obj.nfev} sims)")
        if timed:
            break
    d_best = min(delays, key=lambda k: delays[k])
    obj = Objective(replayer, train, mapping, layout, d_best, deadline)
    msg, converged, ident = "delay screened at stock parameters (nothing continuous fitted)", None, {}
    x = sols[d_best]
    if names:
        x, timed, msg, status = _solve(obj, sols[d_best], lo, hi, final_iters)
        tl |= timed
        converged = bool(status > 0) and not timed
    p = layout.params_of(x, d_best)
    final_cost = obj.mse(x)
    bound = _at_bound(names, x, lo, hi) if names else []
    if names and not tl and time.monotonic() < deadline:
        ident = identifiability(obj, x, lo, hi, twin, mapping, p, seed=cfg.seed)
    nfev += obj.nfev
    log(f"    final at delay {d_best}: train MSE {final_cost:.4f} deg^2; {msg}")
    return FitResult(p, float(final_cost), delays, grid, nfev, tl, msg, converged, _labels(names),
                     [l for l, b in zip(_labels(names), bound) if b], ident)
