"""Forward-kinematics plausibility of a dataset->MJCF joint mapping (evidence, not a gate).

A joint mapping (sign + zero offset) can fit the joint-space data perfectly and still put the
robot in impossible places. Two checks use only the twin's kinematics and the recorded states:

* Table clearance. Assuming the robot's base sits on the work surface (true for the tabletop
  datasets here, but not verifiable from the data), the lowest point of the gripper bodies
  should not go far below the lowest point of the base body. We report the distribution of
  ``z_lowest(gripper) - z_lowest(base)`` (metres; geom bounding boxes, all geoms of those bodies)
  and the fraction of frames more than ``PENETRATION_M`` below it.
* Rest on a stop. The fraction of frames within ``STOP_TOL_DEG`` of a stock MJCF joint limit, and
  beyond it. A robot resting exactly on a modelled mechanical stop supports the mapping's zero.

Both depend on the twin's link geometry, which the Menagerie documents as approximate.
"""

from __future__ import annotations

import itertools

import mujoco
import numpy as np

from .metrics import _r
from .replay import EpisodeData, to_mjcf
from .twin import Mapping, Twin, TwinParams
from .units import ARM

PENETRATION_M = 0.02
CLEARANCE_M = 0.03  # static frames closer than this to the base plane may be in table contact (audit.py)
STOP_TOL_DEG = 1.0
_CORNERS = np.array(list(itertools.product([-1.0, 1.0], repeat=3)))


def _body_ids(m: mujoco.MjModel, names) -> np.ndarray:
    return np.array([m.body(n).id for n in names], dtype=int)


def _geoms_of(m: mujoco.MjModel, bodies: np.ndarray) -> np.ndarray:
    return np.flatnonzero(np.isin(m.geom_bodyid, bodies))


def _lowest(m: mujoco.MjModel, d: mujoco.MjData, geoms: np.ndarray) -> float:
    z = np.inf
    for g in geoms:
        c, h = m.geom_aabb[g, :3], m.geom_aabb[g, 3:]
        pts = d.geom_xpos[g] + (c + _CORNERS * h) @ d.geom_xmat[g].reshape(3, 3).T
        z = min(z, float(pts[:, 2].min()))
    return z


def clearance_m(twin: Twin, mapping: Mapping, x_deg: np.ndarray, offset_corr_deg: np.ndarray) -> np.ndarray:
    """(N,) lowest gripper point minus lowest base point (m) for recorded states x_deg (N, 6)."""
    spec = twin.spec_def
    if not spec.base_body or not spec.ee_bodies:
        return np.full(len(x_deg), np.nan)
    m = twin.base
    d = mujoco.MjData(m)
    gb = _geoms_of(m, _body_ids(m, [spec.base_body]))
    ge = _geoms_of(m, _body_ids(m, spec.ee_bodies))
    out = np.empty(len(x_deg))
    for i, q in enumerate(to_mjcf(x_deg, twin, mapping, offset_corr_deg)):
        d.qpos[:] = m.qpos0
        d.qpos[twin.qadr] = q
        mujoco.mj_kinematics(m, d)
        out[i] = _lowest(m, d, ge) - _lowest(m, d, gb)
    return out


def fk_plausibility(twin: Twin, mapping: Mapping, p: TwinParams, episodes: list[EpisodeData],
                    stride: int = 3) -> dict:
    X = np.concatenate([e.x[::stride] for e in episodes])
    c = clearance_m(twin, mapping, X, p.offset_deg)
    lim = np.rad2deg(twin.base.jnt_range[twin.jid[:5]])
    q = X[:, :5] * mapping.sign + mapping.offset_deg + p.offset_deg  # MJCF degrees
    near = (np.abs(q - lim[:, 0]) <= STOP_TOL_DEG) | (np.abs(q - lim[:, 1]) <= STOP_TOL_DEG)
    beyond = (q < lim[:, 0] - STOP_TOL_DEG) | (q > lim[:, 1] + STOP_TOL_DEG)
    out = {
        "frames_checked": int(len(X)), "stride": stride,
        "assumption": "the base body sits on the work surface; gripper/base lowest points from geom bounding boxes",
        "ee_minus_base_lowest_m": None,
        "frac_frames_ee_below_base_by_2cm": None,
        "stock_limits_deg": np.round(lim, 2).tolist(),
        "frac_frames_within_1deg_of_stock_limit": {j: _r(float(v), 4) for j, v in zip(ARM, near.mean(0))},
        "frac_frames_beyond_stock_limit": {j: _r(float(v), 4) for j, v in zip(ARM, beyond.mean(0))},
    }
    if np.isfinite(c).any():
        p1, p5, p50 = np.percentile(c, [1, 5, 50])
        out["ee_minus_base_lowest_m"] = {"p1": _r(p1, 3), "p5": _r(p5, 3), "p50": _r(p50, 3), "min": _r(float(c.min()), 3)}
        out["frac_frames_ee_below_base_by_2cm"] = _r(float(np.mean(c < -PENETRATION_M)), 4)
    return out
