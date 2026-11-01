"""Open-loop replay of recorded commands in a MuJoCo twin.

Recording conventions. Current LeRobot (``record_loop``, MotorsBus, ``*.pos`` names) reads the
follower state ``x[t]`` FIRST and then sends ``a[t]`` (observe-then-act). Legacy LeRobot
(``ManipulatorRobot.teleop_step``, ``main_*`` names) WRITES the goal ``a[t]`` first and reads
``x[t]`` a few ms later (act-then-observe). In both, ``x[t+1]`` is the first observation taken a
full frame after ``a[t]`` was sent; the replay below holds ``a[t]`` for exactly that frame and does
not model the few-ms send-to-read offset, which differs in sign between the two conventions.

Replay, per episode (identical indexing for sim and real):

    q_sim[0]  = map(x[0])            initial state = first observed state, zero velocity
    for t in 0 .. T-2:
        ctrl      = map(a[max(t - d, 0)])   d = command delay in frames (stock twin: d = 0)
        step physics `substeps` times      substeps = round(frame_dt / timestep); the timestep is
                                           set to frame_dt / substeps so sim time == real time
        q_sim[t+1] = qpos

``q_sim[t]`` and ``x[t]`` are then both "the state after commands a[0..t-1]" and are compared
at the same index t = 1..T-1. With this convention an ideal, instantaneous actuator gives a
command->state lag of exactly 1 frame in the sim (see metrics.lag_frames), as it would on a
current-LeRobot recording; on a legacy recording it would measure ~0.

Batched replays use ``mujoco.rollout`` (C++, multi-threaded); ``replay_reference`` is the
plain ``mj_step`` loop used by the tests to cross-check it.
"""

from __future__ import annotations

from dataclasses import dataclass

import mujoco
import mujoco.rollout
import numpy as np

from .twin import Mapping, Twin, TwinParams

_STATE = mujoco.mjtState.mjSTATE_FULLPHYSICS


@dataclass
class EpisodeData:
    """One episode in physical degrees, canonical joint order (arm 0..4, gripper 5)."""

    index: int
    x: np.ndarray  # (T, 6) observed state
    a: np.ndarray  # (T, 6) command

    @property
    def n(self) -> int:
        return int(self.x.shape[0])


def to_mjcf(X_deg: np.ndarray, twin: Twin, mapping: Mapping, offset_corr_deg: np.ndarray) -> np.ndarray:
    """(T, 6) physical deg (gripper 0..100) -> (T, 6) MJCF radians for the twin's joints."""
    Q = np.empty_like(X_deg, dtype=np.float64)
    off = np.deg2rad(mapping.offset_deg + offset_corr_deg)
    Q[:, :5] = mapping.sign * np.deg2rad(X_deg[:, :5]) + off
    lo, hi = twin.base.jnt_range[twin.jid[5]]
    Q[:, 5] = lo + np.clip(X_deg[:, 5], 0.0, 100.0) / 100.0 * (hi - lo)  # gripper: linear, not scored
    return Q


def from_mjcf_arm(Q: np.ndarray, mapping: Mapping, offset_corr_deg: np.ndarray) -> np.ndarray:
    """(..., 5+) MJCF radians -> (..., 5) physical degrees (arm joints)."""
    off = np.deg2rad(mapping.offset_deg + offset_corr_deg)
    return np.rad2deg((Q[..., :5] - off) / mapping.sign)


def delayed(ctrl: np.ndarray, d: int) -> np.ndarray:
    if d <= 0:
        return ctrl
    return np.concatenate([np.repeat(ctrl[:1], d, axis=0), ctrl[:-d]], axis=0)


class Replayer:
    """Batched open-loop replays for many (episode, parameter-set) pairs."""

    def __init__(self, twin: Twin, nthread: int = 4, max_batch_bytes: int = 160 << 20):
        self.twin = twin
        self.nthread = nthread
        self.max_batch_bytes = max_batch_bytes
        self.nstate = mujoco.mj_stateSize(twin.base, _STATE)
        m0 = twin.model(twin.stock)
        self._datas = [mujoco.MjData(m0) for _ in range(nthread)]
        self._pool = mujoco.rollout.Rollout(nthread=nthread)

    def close(self):
        self._pool.close()

    def _initial_state(self, model: mujoco.MjModel, q0: np.ndarray) -> np.ndarray:
        d = mujoco.MjData(model)
        d.qpos[:] = model.qpos0
        d.qpos[self.twin.qadr] = q0
        d.qvel[:] = 0
        st = np.zeros(self.nstate)
        mujoco.mj_getState(model, d, st, _STATE)
        return st

    def run(self, jobs: list[tuple[mujoco.MjModel, np.ndarray, np.ndarray]]) -> list[np.ndarray]:
        """jobs: (model, q0 (6,), ctrl_frames (T, 6)) with ctrl already delayed.
        Returns per job q_sim (T, 6) in MJCF radians for the twin's joints, q_sim[0] = q0."""
        tw = self.twin
        sub = tw.substeps
        order = sorted(range(len(jobs)), key=lambda i: jobs[i][2].shape[0])
        out: list[np.ndarray | None] = [None] * len(jobs)
        Tglob = max(j[2].shape[0] for j in jobs)
        per = max(1, Tglob * sub * (self.nstate + tw.base.nu) * 8)  # state + control bytes per job
        i = 0
        while i < len(order):
            # chunk of similar-length jobs (sorted by length), bounded memory
            nb = max(1, min(len(order) - i, self.max_batch_bytes // per))
            idx = order[i:i + nb]
            Tmax = max(jobs[k][2].shape[0] for k in idx)
            nstep = (Tmax - 1) * sub
            models = [jobs[k][0] for k in idx]
            init = np.stack([self._initial_state(jobs[k][0], jobs[k][1]) for k in idx])
            ctrl = np.zeros((len(idx), max(nstep, 1), tw.base.nu))
            for b, k in enumerate(idx):
                c = jobs[k][2]
                cf = np.concatenate([c[:-1], np.repeat(c[-2:-1], Tmax - c.shape[0], axis=0)]) if c.shape[0] < Tmax \
                    else c[:-1]
                full = np.zeros((Tmax - 1, tw.base.nu))
                full[:, tw.aid] = cf
                ctrl[b] = np.repeat(full, sub, axis=0)
            if nstep == 0:
                for b, k in enumerate(idx):
                    out[k] = jobs[k][1][None, :].copy()
                i += nb
                continue
            state, _ = self._pool.rollout(models, self._datas, init, ctrl, nstep=nstep, skip_checks=False)
            qp = state[:, sub - 1::sub, 1 + tw.qadr]  # qpos after each frame
            for b, k in enumerate(idx):
                T = jobs[k][2].shape[0]
                q = np.empty((T, 6))
                q[0] = jobs[k][1]
                q[1:] = qp[b, : T - 1]
                out[k] = q
            i += nb
        return out  # type: ignore[return-value]


def prepare(ep: EpisodeData, twin: Twin, mapping: Mapping, p: TwinParams) -> tuple[np.ndarray, np.ndarray]:
    """q0 (6,) and delayed per-frame ctrl (T, 6) in MJCF radians."""
    off = p.offset_deg
    q0 = to_mjcf(ep.x[:1], twin, mapping, off)[0]
    ctrl = delayed(to_mjcf(ep.a, twin, mapping, off), p.delay_frames)
    return q0, ctrl


def replay_episodes(replayer: Replayer, episodes: list[EpisodeData], mapping: Mapping,
                    p: TwinParams, model: mujoco.MjModel | None = None) -> list[np.ndarray]:
    """Replay with one parameter set; returns per-episode sim state (T, 5) in physical degrees."""
    m = model if model is not None else replayer.twin.model(p)
    jobs = []
    for ep in episodes:
        q0, ctrl = prepare(ep, replayer.twin, mapping, p)
        jobs.append((m, q0, ctrl))
    qs = replayer.run(jobs)
    return [from_mjcf_arm(q, mapping, p.offset_deg) for q in qs]


def replay_reference(twin: Twin, model: mujoco.MjModel, q0: np.ndarray, ctrl: np.ndarray) -> np.ndarray:
    """Reference implementation (plain mj_step loop) of the convention above."""
    d = mujoco.MjData(model)
    d.qpos[:] = model.qpos0
    d.qpos[twin.qadr] = q0
    d.qvel[:] = 0
    mujoco.mj_forward(model, d)
    T = ctrl.shape[0]
    q = np.empty((T, 6))
    q[0] = q0
    for t in range(T - 1):
        d.ctrl[twin.aid] = ctrl[t]
        mujoco.mj_step(model, d, nstep=twin.substeps)
        q[t + 1] = d.qpos[twin.qadr]
    return q
