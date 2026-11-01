"""Units and calibration conventions of LeRobot SO-100 / SO-101 datasets.

Everything here is derived from the LeRobot source (pinned in ``SOURCES``) and *verified on
each dataset* rather than assumed:

Encoder ticks. SO-100/SO-101 use Feetech STS3215 servos: 4096 ticks per revolution, so one
tick is 360/4096 deg. ``observation.state`` is the follower's raw tick reading passed
through a linear map, hence it lies on a lattice whose spacing is exactly one tick in the
dataset's units. We fit that lattice per joint:

* spacing 180/2048 deg  -> legacy LeRobot (<= v0.1 ``ManipulatorRobot``, names ``main_*``),
  ``CalibrationMode.DEGREE``: ``deg = (raw + homing_offset) / 2048 * 180``; zero = the
  "zero position" calibration pose ("straight horizontal position", feetech_calibration.py).
* spacing 360/4095      -> LeRobot ``MotorNormMode.DEGREES``: ``(raw - mid) * 360 / 4095``
  with ``mid = (range_min + range_max) / 2``; zero = middle of the calibrated range.
* any other spacing s   -> LeRobot ``MotorNormMode.RANGE_M100_100``:
  ``norm = (clip(raw) - min) / (max - min) * 200 - 100``. One tick = 200/(max-min) units,
  so the calibrated range R = max - min = 200/s ticks is *recovered from the data*
  (R must come out an integer; the wrist_roll full-turn motor must give R = 4095) and
  ``deg = norm * R/200 * 360/4096`` exactly, zero = middle of the calibrated range, same
  as DEGREES mode. Values at |norm| = 100 are clipped readings (saturated).

All conversions return *physical* degrees (ticks * 360/4096). LeRobot's DEGREES mode uses
360/4095 per tick; we undo that 0.024% scale so all datasets share one unit.

The gripper is always a 0..100 linear range in LeRobot; it is excluded from metrics.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict

import numpy as np

TICK_DEG = 360.0 / 4096.0  # physical degrees per STS3215 encoder tick
LEGACY_STEP = 180.0 / 2048.0  # == TICK_DEG
DEGREES_MODE_STEP = 360.0 / 4095.0

CANONICAL = ("shoulder_pan", "shoulder_lift", "elbow_flex", "wrist_flex", "wrist_roll", "gripper")
ARM = CANONICAL[:5]

SOURCES = {
    "lerobot_repo": "https://github.com/huggingface/lerobot",
    "lerobot_main_sha": "3f797de5952432284a7c77ad2760218cb74e2f26",
    "normalize": "src/lerobot/motors/motors_bus.py::_normalize/_unnormalize/record_calibration",
    "legacy_calibration": "lerobot/common/robot_devices/robots/feetech_calibration.py @ e23b41e7~1",
    "always_degrees_commit": "6600b60e (2026-02-13): SO follower/leader default use_degrees=True",
}


@dataclass
class Lattice:
    step: float  # lattice spacing in dataset units
    phase: float  # offset of lattice in steps, in [0, 1)
    max_resid: float  # max distance of a value from the lattice, in steps
    n_unique: int
    ok: bool


@dataclass
class JointEncoding:
    joint: str
    kind: str  # legacy_degrees | degrees_mode | range_m100_100 | unknown
    step: float
    max_resid_steps: float
    range_ticks: int | None  # calibrated range (RANGE_M100_100 only)
    deg_per_unit: float | None  # multiply dataset units by this to get physical degrees
    saturated_frac: float  # fraction of state samples at the +-100 clip (RANGE_M100_100 only)


def map_names(names: list[str]) -> list[int]:
    """Indices into the dataset vector for each CANONICAL joint (raises if not a single SO arm)."""
    norm = [n.lower().replace(".pos", "").replace("main_", "") for n in names]
    idx = []
    for c in CANONICAL:
        hits = [i for i, n in enumerate(norm) if n == c]
        if len(hits) != 1:
            raise ValueError(f"cannot map joint {c!r} in names {names} (bimanual or non-SO arm?)")
        idx.append(hits[0])
    return idx


def naming_convention(names: list[str]) -> str:
    if all(n.startswith("main_") for n in names):
        return "lerobot-legacy"
    if all(n.endswith(".pos") for n in names):
        return "lerobot-motorsbus"
    return "unknown"


def fit_lattice(values: np.ndarray, tol_steps: float = 0.02) -> Lattice:
    """Fit x = (k + phase) * step to a set of 1-D samples (exact for encoder-quantized data)."""
    u = np.unique(np.asarray(values, dtype=np.float64))
    if len(u) < 20:
        return Lattice(float("nan"), 0.0, float("inf"), len(u), False)
    d = np.diff(u)
    d = d[d > 1e-6 * max(1.0, np.abs(u).max())]
    s0 = np.quantile(d, 0.02)  # robust smallest gap (one tick)
    k = np.round(d / s0)
    good = (k >= 1) & (k <= 50) & (np.abs(d / s0 - k) < 0.2)
    if good.sum() < 10:
        return Lattice(float(s0), 0.0, float("inf"), len(u), False)
    step = float(d[good].sum() / k[good].sum())
    # refine once more with the improved step across all gaps
    k = np.round(d / step)
    good = (k >= 1) & (np.abs(d / step - k) < 0.2)
    step = float(d[good].sum() / k[good].sum())
    r = u / step
    ang = 2 * np.pi * r
    phase = float((np.arctan2(np.sin(ang).mean(), np.cos(ang).mean()) / (2 * np.pi)) % 1.0)
    resid = np.abs(((r - phase + 0.5) % 1.0) - 0.5)
    mr = float(resid.max())
    return Lattice(step, phase, mr, len(u), bool(mr < tol_steps))


def classify_joint(name: str, state_col: np.ndarray, gripper: bool = False) -> JointEncoding:
    lat = fit_lattice(state_col)
    sat = 0.0
    if not lat.ok:
        return JointEncoding(name, "unknown", lat.step, lat.max_resid, None, None, sat)
    if gripper:
        return JointEncoding(name, "linear_0_100", lat.step, lat.max_resid, None, None, sat)
    rel = lambda a, b: abs(a - b) / b  # noqa: E731
    if rel(lat.step, LEGACY_STEP) < 6e-5:
        return JointEncoding(name, "legacy_degrees", lat.step, lat.max_resid, None, 1.0, sat)
    if rel(lat.step, DEGREES_MODE_STEP) < 6e-5:
        return JointEncoding(name, "degrees_mode", lat.step, lat.max_resid, None, 4095.0 / 4096.0, sat)
    # RANGE_M100_100: range in ticks must be an integer and the lattice must be exact at 200/R
    R = int(round(200.0 / lat.step))
    exact = 200.0 / R
    r = np.unique(state_col) / exact
    ph = lat.phase
    mr = float(np.abs(((r - ph + 0.5) % 1.0) - 0.5).max())
    within = np.all(np.abs(state_col) <= 100.0 + 1e-3)
    if mr < 0.05 and within and 200 <= R <= 4096:
        sat = float(np.mean(np.abs(state_col) >= 100.0 - 1e-4))
        return JointEncoding(name, "range_m100_100", exact, mr, R, R / 200.0 * TICK_DEG, sat)
    return JointEncoding(name, "unknown", lat.step, lat.max_resid, None, None, sat)


@dataclass
class UnitsVerdict:
    convention: str  # lerobot-legacy | lerobot-motorsbus | unknown
    zero_reference: str  # calibration_zero_pose | mid_range | unknown
    encodings: list[JointEncoding]
    supported: bool
    reason: str

    def to_dict(self) -> dict:
        d = asdict(self)
        return d


def detect_units(names: list[str], states: np.ndarray) -> UnitsVerdict:
    """Classify the encoding of each arm joint from the observation.state tick lattice."""
    idx = map_names(names)
    conv = naming_convention(names)
    encs = []
    for c, i in zip(CANONICAL, idx):
        encs.append(classify_joint(c, states[:, i], gripper=(c == "gripper")))
    arm = encs[:5]
    kinds = {e.kind for e in arm}
    if "unknown" in kinds:
        bad = [e.joint for e in arm if e.kind == "unknown"]
        return UnitsVerdict(conv, "unknown", encs, False,
                            f"no encoder-tick lattice found for {bad}: values are not raw servo readings "
                            "(filtered, simulated or re-encoded data); units cannot be verified")
    if len(kinds) != 1:
        return UnitsVerdict(conv, "unknown", encs, False, f"mixed encodings across arm joints: {sorted(kinds)}")
    kind = kinds.pop()
    if kind == "legacy_degrees":
        if conv != "lerobot-legacy":
            return UnitsVerdict(conv, "unknown", encs, False,
                                "legacy-degree tick lattice but non-legacy joint names; convention ambiguous")
        return UnitsVerdict(conv, "calibration_zero_pose", encs, True,
                            "legacy LeRobot degrees (tick = 180/2048 deg verified on every arm joint)")
    if conv != "lerobot-motorsbus":
        return UnitsVerdict(conv, "unknown", encs, False, f"{kind} lattice but legacy joint names; ambiguous")
    if kind == "degrees_mode":
        return UnitsVerdict(conv, "mid_range", encs, True,
                            "LeRobot MotorNormMode.DEGREES (tick = 360/4095 units verified on every arm joint)")
    roll = next(e for e in arm if e.joint == "wrist_roll")
    if roll.range_ticks != 4095:
        return UnitsVerdict(conv, "mid_range", encs, False,
                            f"RANGE_M100_100 lattice found but wrist_roll range = {roll.range_ticks} ticks, "
                            "expected 4095 (full-turn motor); calibration recovery not trusted")
    return UnitsVerdict(conv, "mid_range", encs, True,
                        "LeRobot MotorNormMode.RANGE_M100_100; calibrated range recovered per joint from the "
                        "tick lattice (wrist_roll full-turn = 4095 ticks confirms the recovery)")


def to_physical_degrees(X: np.ndarray, names: list[str], verdict: UnitsVerdict) -> np.ndarray:
    """(T, D) dataset units -> (T, 6) canonical order, arm joints in physical degrees.

    The gripper column is passed through in its 0..100 units.
    """
    if not verdict.supported:
        raise ValueError(f"units not supported: {verdict.reason}")
    idx = map_names(names)
    Y = np.asarray(X, dtype=np.float64)[:, idx].copy()
    for j, e in enumerate(verdict.encodings[:5]):
        Y[:, j] *= e.deg_per_unit
    return Y
