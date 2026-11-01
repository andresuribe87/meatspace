"""MuJoCo twin loading, dataset<->MJCF joint mapping, and calibrated-twin packages.

Joint mapping (per arm joint j, dataset physical degrees x -> MJCF radians q):

    q_j = sign_j * deg2rad(x_j) + deg2rad(offset_j)

``sign`` and the *nominal* ``offset`` come from the LeRobot calibration convention (see
units.py) and the twin's design zero, documented per twin in ``TWINS``. The calibration fit
adds a bounded per-joint correction to the nominal offset (zero offsets between a given
robot's LeRobot calibration and the MJCF zero are unknown a priori).

Calibrated twin package = JSON of parameter overrides (schema ``PACKAGE_SCHEMA``) plus
``apply_to_spec`` / ``apply_to_model`` below; its sha256 is over the canonical JSON.
"""

from __future__ import annotations

import hashlib
import json
import subprocess
from dataclasses import dataclass, field
from pathlib import Path

import mujoco
import numpy as np

from . import PACKAGE_SCHEMA
from .units import ARM

PARAM_NAMES = ("kp", "kv", "damping", "armature", "frictionloss")


@dataclass(frozen=True)
class TwinSpec:
    name: str
    xml: str
    joints: tuple[str, ...]  # MJCF joint names in CANONICAL order (6, incl. gripper)
    actuators: tuple[str, ...]
    # nominal mapping per zero reference: (signs[5], offsets_deg[5] or "range_mid", note)
    conventions: dict = field(default_factory=dict)
    # bodies used by the forward-kinematics plausibility checks (kinematics.py): the body that sits on the
    # table and the gripper bodies whose lowest point is compared with it
    base_body: str = ""
    ee_bodies: tuple[str, ...] = ()


TWINS: dict[str, TwinSpec] = {
    "trs_so_arm100": TwinSpec(
        name="trs_so_arm100",
        xml="so_arm100.xml",
        joints=("Rotation", "Pitch", "Elbow", "Wrist_Pitch", "Wrist_Roll", "Jaw"),
        actuators=("Rotation", "Pitch", "Elbow", "Wrist_Pitch", "Wrist_Roll", "Jaw"),
        conventions={
            "calibration_zero_pose": (
                (1, 1, 1, 1, 1),
                (0.0, 0.0, 0.0, 0.0, 0.0),
                "legacy LeRobot zero pose = arm straight horizontal (feetech_calibration.py); the MJCF zero "
                "(from the SO-ARM100 URDF) is also the arm stretched horizontally forward, so nominal offsets "
                "are 0. Documented signs +1 (MJCF joint axes); legacy LeRobot sets each motor's direction from "
                "the user's 'rotated position', so signs are checked per dataset against the recorded range "
                "of motion (mapping_checks).",
            ),
            "mid_range": (
                (1, 1, 1, 1, 1),
                "range_mid",
                "LeRobot MotorsBus zero = middle of the calibrated range; nominal offset = middle of the MJCF "
                "joint range (assumes the robot was calibrated over the same mechanical range as the MJCF).",
            ),
        },
        base_body="Base",
        ee_bodies=("Fixed_Jaw", "Moving_Jaw"),
    ),
    "robotstudio_so101": TwinSpec(
        name="robotstudio_so101",
        xml="so101.xml",
        joints=("shoulder_pan", "shoulder_lift", "elbow_flex", "wrist_flex", "wrist_roll", "gripper"),
        actuators=("shoulder_pan", "shoulder_lift", "elbow_flex", "wrist_flex", "wrist_roll", "gripper"),
        conventions={
            "mid_range": (
                (1, 1, 1, 1, 1),
                (0.0, 0.0, 0.0, 0.0, 0.0),
                "MJCF derived from TheRobotStudio so101_new_calib.xml, whose zero is the LeRobot "
                "'middle of range' calibration pose; nominal offsets 0, documented signs +1 (checked per "
                "dataset against the recorded range of motion, mapping_checks).",
            ),
        },
        base_body="base",
        ee_bodies=("gripper", "moving_jaw_so101_v1"),
    ),
}

# Absolute output precision of every fitted/derived parameter written to report.json and the package.
# Absolute (not significant-digit) rounding matters for reproducibility: an unidentified parameter that
# is ~0 keeps only BLAS/CPU-dependent noise under %g formatting (e.g. -5.5e-10 vs +3.2e-10 deg on two
# OpenBLAS kernels), which changed content hashes across CPUs in v1.
PRECISION = {"kp": 4, "kv": 6, "damping": 6, "armature": 7, "frictionloss": 6, "offset_deg": 6, "jnt_range_rad": 6}


def qround(v: float, nd: int) -> float:
    """Round to nd decimals; normalise -0.0 to 0.0 (stable canonical JSON)."""
    return float(round(float(v), nd)) + 0.0


def menagerie_sha(twin_dir: str | Path) -> str | None:
    try:
        out = subprocess.run(["git", "-C", str(twin_dir), "rev-parse", "HEAD"], capture_output=True,
                             text=True, check=True)
        return out.stdout.strip()
    except Exception:  # noqa: BLE001
        return None


def twin_content_sha256(twin_dir: str | Path) -> str:
    """sha256 over every file of the twin directory (path + bytes), independent of git."""
    h = hashlib.sha256()
    root = Path(twin_dir)
    for p in sorted(root.rglob("*")):
        if p.is_file() and ".git" not in p.parts:
            h.update(str(p.relative_to(root)).encode())
            h.update(p.read_bytes())
    return h.hexdigest()


def resolve_twin(twin_dir: str | Path) -> TwinSpec:
    name = Path(twin_dir).resolve().name
    if name not in TWINS:
        raise ValueError(f"unknown twin {name!r}; supported: {sorted(TWINS)}")
    return TWINS[name]


@dataclass
class Mapping:
    sign: np.ndarray  # (5,)
    offset_deg: np.ndarray  # (5,) nominal offset
    note: str
    zero_reference: str

    def to_dict(self) -> dict:
        return {"sign": self.sign.astype(int).tolist(), "nominal_offset_deg": np.round(self.offset_deg, 4).tolist(),
                "zero_reference": self.zero_reference, "note": self.note}


def nominal_mapping(spec: TwinSpec, model: mujoco.MjModel, zero_reference: str) -> Mapping:
    if zero_reference not in spec.conventions:
        raise ValueError(f"twin {spec.name} has no documented mapping for zero reference {zero_reference!r}")
    signs, offs, note = spec.conventions[zero_reference]
    if offs == "range_mid":
        jid = [model.joint(n).id for n in spec.joints[:5]]
        offs = np.rad2deg(model.jnt_range[jid].mean(axis=1))
    return Mapping(np.asarray(signs, float), np.asarray(offs, float), note, zero_reference)


@dataclass
class TwinParams:
    """Per-arm-joint dynamic parameters + mapping corrections. Arrays are (5,), CANONICAL order."""

    kp: np.ndarray  # actuator position gain (N m / rad)
    kv: np.ndarray  # actuator velocity gain (N m s / rad), the servo's damping term
    damping: np.ndarray  # joint (passive) damping
    armature: np.ndarray
    frictionloss: np.ndarray
    offset_deg: np.ndarray  # correction added to the nominal offset
    delay_frames: int = 0
    jnt_range: np.ndarray | None = None  # (5, 2) rad joint (and ctrl) range override; None = stock

    def copy(self) -> "TwinParams":
        return TwinParams(self.kp.copy(), self.kv.copy(), self.damping.copy(), self.armature.copy(),
                          self.frictionloss.copy(), self.offset_deg.copy(), int(self.delay_frames),
                          None if self.jnt_range is None else self.jnt_range.copy())

    def to_dict(self) -> dict:
        def r(a, key):
            return [qround(v, PRECISION[key]) for v in a]

        return {"kp": r(self.kp, "kp"), "kv": r(self.kv, "kv"), "damping": r(self.damping, "damping"),
                "armature": r(self.armature, "armature"), "frictionloss": r(self.frictionloss, "frictionloss"),
                "offset_deg": r(self.offset_deg, "offset_deg"), "delay_frames": int(self.delay_frames),
                "jnt_range_rad": None if self.jnt_range is None else [r(v, "jnt_range_rad") for v in self.jnt_range]}

    @staticmethod
    def from_dict(d: dict) -> "TwinParams":
        a = lambda k: np.asarray(d[k], dtype=float)  # noqa: E731
        jr = d.get("jnt_range_rad")
        return TwinParams(a("kp"), a("kv"), a("damping"), a("armature"), a("frictionloss"), a("offset_deg"),
                          int(d.get("delay_frames", 0)), None if jr is None else np.asarray(jr, dtype=float))


class Twin:
    """A loaded MJCF twin with fast parameter overrides for replay/fitting."""

    def __init__(self, twin_dir: str | Path, fps: float, disable_contacts: bool = True):
        self.dir = Path(twin_dir)
        self.spec_def = resolve_twin(self.dir)
        self.xml_path = self.dir / self.spec_def.xml
        self.base = mujoco.MjModel.from_xml_path(str(self.xml_path))
        self.stock_timestep = float(self.base.opt.timestep)
        self.frame_dt = 1.0 / float(fps)
        self.substeps = max(1, int(round(self.frame_dt / self.stock_timestep)))
        self.timestep = self.frame_dt / self.substeps  # exact: substeps * timestep == frame_dt
        self.disable_contacts = disable_contacts
        self.jid = np.array([self.base.joint(n).id for n in self.spec_def.joints])
        self.qadr = self.base.jnt_qposadr[self.jid]
        self.dadr = self.base.jnt_dofadr[self.jid]
        self.aid = np.array([self.base.actuator(n).id for n in self.spec_def.actuators])
        self.stock = self._read_params(self.base)

    def _read_params(self, m: mujoco.MjModel) -> TwinParams:
        a, d = self.aid[:5], self.dadr[:5]
        return TwinParams(kp=m.actuator_gainprm[a, 0].copy(), kv=-m.actuator_biasprm[a, 2].copy(),
                          damping=m.dof_damping[d].copy(),
                          armature=m.dof_armature[d].copy(), frictionloss=m.dof_frictionloss[d].copy(),
                          offset_deg=np.zeros(5), delay_frames=0)

    def model(self, p: TwinParams | None = None) -> mujoco.MjModel:
        """A fresh MjModel with replay options and (optionally) dynamic overrides applied."""
        m = mujoco.MjModel.from_xml_path(str(self.xml_path)) if p is None else self._copy_base()
        if p is None:
            self._apply_options(m)
            return m
        apply_to_model(m, self, p)
        return m

    def _copy_base(self) -> mujoco.MjModel:
        import copy

        return copy.copy(self.base)

    def _apply_options(self, m: mujoco.MjModel) -> None:
        m.opt.timestep = self.timestep
        if self.disable_contacts:
            m.opt.disableflags |= int(mujoco.mjtDisableBit.mjDSBL_CONTACT)


def apply_to_model(m: mujoco.MjModel, twin: Twin, p: TwinParams) -> None:
    """Apply dynamic overrides in place (fast path used during fitting)."""
    a, d = twin.aid[:5], twin.dadr[:5]
    m.actuator_gainprm[a, 0] = p.kp
    m.actuator_biasprm[a, 1] = -p.kp
    m.actuator_biasprm[a, 2] = -p.kv
    m.dof_damping[d] = p.damping
    m.dof_armature[d] = p.armature
    m.dof_frictionloss[d] = p.frictionloss
    if p.jnt_range is not None:
        m.jnt_range[twin.jid[:5]] = p.jnt_range
        m.actuator_ctrlrange[a] = p.jnt_range
    twin._apply_options(m)
    data = mujoco.MjData(m)
    mujoco.mj_setConst(m, data)  # recompute invweight0 etc. after armature changes


def apply_to_spec(spec: mujoco.MjSpec, twin_spec: TwinSpec, p: TwinParams, timestep: float | None = None,
                  disable_contacts: bool = True) -> mujoco.MjSpec:
    """Apply a package's overrides to an MjSpec (for exporting a calibrated MJCF)."""
    for j in range(5):
        jt = spec.joint(twin_spec.joints[j])
        if np.ndim(jt.damping):  # MuJoCo >= 3.3 stores damping as an array (linear term first)
            jt.damping[0] = float(p.damping[j])
        else:
            jt.damping = float(p.damping[j])
        jt.armature = float(p.armature[j])
        jt.frictionloss = float(p.frictionloss[j])
        act = spec.actuator(twin_spec.actuators[j])
        act.gainprm[0] = float(p.kp[j])
        act.biasprm[1] = -float(p.kp[j])
        act.biasprm[2] = -float(p.kv[j])  # explicit kv (negative); a positive value would mean dampratio
        if p.jnt_range is not None:
            jt.range = [float(v) for v in p.jnt_range[j]]
            act.inheritrange = 0
            act.ctrlrange = [float(v) for v in p.jnt_range[j]]
    if timestep is not None:
        spec.option.timestep = timestep
    if disable_contacts:
        spec.option.disableflags |= int(mujoco.mjtDisableBit.mjDSBL_CONTACT)
    return spec


def make_package(twin: Twin, p: TwinParams, mapping: Mapping, meta: dict) -> dict:
    pkg = {
        "schema": PACKAGE_SCHEMA,
        "twin": twin.spec_def.name,
        "joints_mjcf": list(twin.spec_def.joints[:5]),
        "joints_canonical": list(ARM),
        "mapping": {**mapping.to_dict(),
                    "fitted_offset_correction_deg": [qround(v, PRECISION["offset_deg"]) for v in p.offset_deg],
                    "formula": "q_rad = sign*deg2rad(x_deg) + deg2rad(nominal_offset_deg + fitted_offset_correction_deg)"},
        "params": {k: v for k, v in p.to_dict().items() if k in PARAM_NAMES},
        "jnt_range_rad": p.to_dict()["jnt_range_rad"],
        "command_delay_frames": int(p.delay_frames),
        "options": {"timestep": twin.timestep, "substeps_per_frame": twin.substeps,
                    "contacts": "disabled" if twin.disable_contacts else "enabled"},
        "meta": meta,
    }
    pkg["sha256"] = package_sha256(pkg)
    return pkg


def canonical_json(obj) -> str:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def package_sha256(pkg: dict) -> str:
    body = {k: v for k, v in pkg.items() if k != "sha256"}
    return hashlib.sha256(canonical_json(body).encode()).hexdigest()


def load_package(path: str | Path) -> tuple[dict, TwinParams]:
    pkg = json.loads(Path(path).read_text())
    if pkg.get("schema") != PACKAGE_SCHEMA:
        raise ValueError(f"not a {PACKAGE_SCHEMA} package")
    if package_sha256(pkg) != pkg.get("sha256"):
        raise ValueError("package sha256 mismatch (modified or corrupt)")
    d = dict(pkg["params"])
    d["offset_deg"] = pkg["mapping"]["fitted_offset_correction_deg"]
    d["delay_frames"] = pkg["command_delay_frames"]
    d["jnt_range_rad"] = pkg.get("jnt_range_rad")
    return pkg, TwinParams.from_dict(d)


def export_mjcf(twin_dir: str | Path, package_path: str | Path, out_xml: str | Path) -> str:
    """Write a calibrated MJCF anywhere (mesh/texture dirs are made absolute). Returns the path.

    Do not write it inside the twin directory: reports hash that directory's content.
    """
    pkg, p = load_package(package_path)
    spec_def = resolve_twin(twin_dir)
    spec = mujoco.MjSpec.from_file(str(Path(twin_dir) / spec_def.xml))
    root = Path(twin_dir).resolve()
    spec.meshdir = str(root / (spec.meshdir or ""))
    spec.texturedir = str(root / (spec.texturedir or ""))
    apply_to_spec(spec, spec_def, p, timestep=pkg["options"]["timestep"],
                  disable_contacts=pkg["options"]["contacts"] == "disabled")
    spec.compile()
    Path(out_xml).write_text(spec.to_xml())
    return str(out_xml)


def resolve_signs(twin: "Twin", mapping: Mapping, x_deg: np.ndarray, bound_deg: float) -> tuple[Mapping, list, str | None]:
    """Check (and if needed flip) each joint's sign against the twin's joint range.

    Legacy LeRobot sets each motor's direction from the user's 'rotated position', so the
    direction convention is not guaranteed across robots. Rule, per arm joint, using the
    1st-99th percentile of the TRAIN states (deg): keep the documented sign if that range fits
    inside the MJCF joint range with a zero shift of at most ``bound_deg``; otherwise use the
    flipped sign if *it* fits; otherwise the mapping is rejected (returns a reason).
    Returns (mapping, per-joint decisions, reason-or-None).
    """
    lim = np.rad2deg(twin.base.jnt_range[twin.jid[:5]])
    sign = mapping.sign.copy()
    decisions, bad = [], []

    def need(s: float, j: int, p1: float, p99: float) -> float:
        a, b = sorted([s * p1, s * p99])
        a, b = a + mapping.offset_deg[j], b + mapping.offset_deg[j]
        lo, hi = lim[j, 0] - a, lim[j, 1] - b  # admissible shifts
        if lo > hi:
            return float("inf")
        return 0.0 if lo <= 0.0 <= hi else float(min(abs(lo), abs(hi)))

    for j in range(5):
        p1, p99 = np.percentile(x_deg[:, j], [1, 99])
        doc = float(mapping.sign[j])
        nd, nf = need(doc, j, p1, p99), need(-doc, j, p1, p99)
        d = {"joint": j, "p1_p99_deg": [round(float(p1), 2), round(float(p99), 2)],
             "mjcf_range_deg": [round(float(lim[j, 0]), 2), round(float(lim[j, 1]), 2)],
             "shift_needed_documented_sign_deg": round(nd, 2) if np.isfinite(nd) else None,
             "shift_needed_flipped_sign_deg": round(nf, 2) if np.isfinite(nf) else None}
        if nd <= bound_deg:
            d["decision"] = "documented sign" + (" (flipped sign would also fit: sign not identified by range)"
                                                 if nf <= bound_deg else "")
        elif nf <= bound_deg:
            sign[j] = -doc
            d["decision"] = "flipped sign (documented sign does not fit the MJCF range)"
        else:
            d["decision"] = "rejected"
            bad.append(j)
        decisions.append(d)
    out = Mapping(sign, mapping.offset_deg.copy(), mapping.note, mapping.zero_reference)
    reason = None
    if bad:
        from .units import ARM

        reason = ("recorded range of motion does not fit the twin's joint range under the documented calibration "
                  f"convention with either sign (zero shift > {bound_deg:g} deg) for: " +
                  ", ".join(f"{ARM[j]} {decisions[j]['p1_p99_deg']} vs MJCF {decisions[j]['mjcf_range_deg']}" for j in bad)
                  + "; this robot's calibration does not follow the convention, so no mapping is asserted")
    return out, decisions, reason
