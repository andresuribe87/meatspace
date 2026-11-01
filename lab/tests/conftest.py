"""Shared fixtures: a tiny 6-joint toy twin (no Menagerie download needed) registered like a real twin."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pytest

from meatspace_lab import twin as tw

TOY_XML = """
<mujoco model="toy_arm">
  <compiler angle="radian"/>
  <option timestep="0.002"/>
  <default>
    <joint type="hinge" damping="0" armature="0.01" frictionloss="0.01" range="-2.5 2.5"/>
    <position kp="20" kv="0.8" forcerange="-3 3" inheritrange="1"/>
    <geom type="capsule" size="0.015" density="1000"/>
  </default>
  <worldbody>
    <body name="l0" pos="0 0 0.05">
      <joint name="j0" axis="0 0 1"/>
      <geom fromto="0 0 0 0 0 0.05"/>
      <body name="l1" pos="0 0 0.05">
        <joint name="j1" axis="1 0 0"/>
        <geom fromto="0 0 0 0 0.1 0"/>
        <body name="l2" pos="0 0.1 0">
          <joint name="j2" axis="1 0 0"/>
          <geom fromto="0 0 0 0 0.1 0"/>
          <body name="l3" pos="0 0.1 0">
            <joint name="j3" axis="1 0 0"/>
            <geom fromto="0 0 0 0 0.05 0"/>
            <body name="l4" pos="0 0.05 0">
              <joint name="j4" axis="0 1 0"/>
              <geom fromto="0 0 0 0.02 0.03 0"/>
              <body name="l5" pos="0 0.03 0">
                <joint name="j5" axis="0 0 1" range="0 1.5"/>
                <geom fromto="0 0 0 0.02 0.0 0" size="0.005"/>
              </body>
            </body>
          </body>
        </body>
      </body>
    </body>
  </worldbody>
  <actuator>
    <position name="a0" joint="j0"/> <position name="a1" joint="j1"/> <position name="a2" joint="j2"/>
    <position name="a3" joint="j3"/> <position name="a4" joint="j4"/> <position name="a5" joint="j5"/>
  </actuator>
</mujoco>
"""

tw.TWINS["toy_arm"] = tw.TwinSpec(
    name="toy_arm", xml="toy_arm.xml", joints=("j0", "j1", "j2", "j3", "j4", "j5"),
    actuators=("a0", "a1", "a2", "a3", "a4", "a5"),
    conventions={"mid_range": ((1, 1, 1, 1, 1), (0.0, 0.0, 0.0, 0.0, 0.0), "toy"),
                 "calibration_zero_pose": ((1, 1, 1, 1, 1), (0.0, 0.0, 0.0, 0.0, 0.0), "toy")},
    base_body="l0", ee_bodies=("l4", "l5"),
)


@pytest.fixture(scope="session")
def toy_dir(tmp_path_factory) -> Path:
    d = tmp_path_factory.mktemp("twins") / "toy_arm"
    d.mkdir()
    (d / "toy_arm.xml").write_text(TOY_XML)
    return d


def smooth_commands(rng: np.random.Generator, T: int, amp_deg: float = 30.0, fps: float = 30.0) -> np.ndarray:
    """(T, 6) smooth random joint commands in degrees (gripper column 0..100)."""
    t = np.arange(T) / fps
    out = np.zeros((T, 6))
    for j in range(5):
        for _ in range(3):
            f = rng.uniform(0.1, 0.8)
            out[:, j] += amp_deg / 3 * np.sin(2 * np.pi * f * t + rng.uniform(0, 2 * np.pi))
    out[:, 5] = 50 + 30 * np.sin(2 * np.pi * 0.2 * t)
    return out


def write_lerobot_dataset(root: Path, episodes: list[tuple[np.ndarray, np.ndarray]], fps: float = 30.0,
                          names: list[str] | None = None) -> Path:
    """Write a minimal LeRobot v3.0-style dataset (info.json + one parquet)."""
    import pyarrow as pa
    import pyarrow.parquet as pq

    names = names or [f"{n}.pos" for n in ("shoulder_pan", "shoulder_lift", "elbow_flex", "wrist_flex",
                                           "wrist_roll", "gripper")]
    (root / "meta").mkdir(parents=True, exist_ok=True)
    (root / "data" / "chunk-000").mkdir(parents=True, exist_ok=True)
    feats = {k: {"dtype": "float32", "shape": [6], "names": names} for k in ("action", "observation.state")}
    info = {"codebase_version": "v3.0", "robot_type": "toy", "fps": fps, "features": feats,
            "total_episodes": len(episodes)}
    (root / "meta" / "info.json").write_text(json.dumps(info))
    cols = {"action": [], "observation.state": [], "episode_index": [], "frame_index": [], "timestamp": []}
    for e, (a, x) in enumerate(episodes):
        T = len(a)
        cols["action"] += [list(map(float, r)) for r in a.astype(np.float32)]
        cols["observation.state"] += [list(map(float, r)) for r in x.astype(np.float32)]
        cols["episode_index"] += [e] * T
        cols["frame_index"] += list(range(T))
        cols["timestamp"] += list((np.arange(T) / fps).astype(np.float32).astype(float))
    table = pa.table({
        "action": pa.array(cols["action"], type=pa.list_(pa.float32(), 6)),
        "observation.state": pa.array(cols["observation.state"], type=pa.list_(pa.float32(), 6)),
        "episode_index": pa.array(cols["episode_index"], type=pa.int64()),
        "frame_index": pa.array(cols["frame_index"], type=pa.int64()),
        "timestamp": pa.array(cols["timestamp"], type=pa.float32()),
    })
    pq.write_table(table, root / "data" / "chunk-000" / "file-000.parquet")
    return root
