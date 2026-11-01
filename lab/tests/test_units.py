import numpy as np
import pytest

from meatspace_lab import units

LEGACY = [f"main_{n}" for n in units.CANONICAL]
BUS = [f"{n}.pos" for n in units.CANONICAL]


def _raw(rng, T=3000, lo=800, hi=3300):
    """Integer encoder ticks for 6 motors following smooth random motion."""
    t = np.arange(T)
    out = np.zeros((T, 6))
    for j in range(6):
        mid, amp = (lo + hi) / 2, (hi - lo) / 2 * 0.9
        out[:, j] = mid + amp * np.sin(2 * np.pi * t / rng.uniform(300, 900) + rng.uniform(0, 6))
    return np.round(out).astype(np.int64)


def test_map_names_both_conventions_and_rejects_bimanual():
    assert units.map_names(LEGACY) == list(range(6))
    assert units.map_names(list(reversed(BUS))) == list(range(5, -1, -1))
    assert units.naming_convention(LEGACY) == "lerobot-legacy"
    assert units.naming_convention(BUS) == "lerobot-motorsbus"
    with pytest.raises(ValueError):
        units.map_names([f"left_{n}" for n in units.CANONICAL] + [f"right_{n}" for n in units.CANONICAL])


def test_legacy_degrees_detected_and_identity():
    rng = np.random.default_rng(0)
    raw = _raw(rng)
    homing = rng.integers(-2048, 0, 6)
    X = ((raw + homing) / 2048 * 180).astype(np.float32)  # legacy CalibrationMode.DEGREE
    X[:, 5] = (raw[:, 5] - 1000) / 1500 * 100  # gripper LINEAR
    v = units.detect_units(LEGACY, X)
    assert v.supported and v.zero_reference == "calibration_zero_pose"
    assert all(e.kind == "legacy_degrees" for e in v.encodings[:5])
    Y = units.to_physical_degrees(X, LEGACY, v)
    np.testing.assert_allclose(Y[:, :5], X[:, :5], atol=1e-4)


def test_degrees_mode_detected_and_scaled_to_physical():
    rng = np.random.default_rng(1)
    raw = _raw(rng)
    mins, maxs = raw.min(0) - 5, raw.max(0) + 5
    mid = (mins + maxs) / 2
    X = ((raw - mid) * 360 / 4095).astype(np.float32)  # MotorNormMode.DEGREES
    v = units.detect_units(BUS, X)
    assert v.supported and v.zero_reference == "mid_range"
    assert all(e.kind == "degrees_mode" for e in v.encodings[:5])
    Y = units.to_physical_degrees(X, BUS, v)
    np.testing.assert_allclose(Y[:, :5], ((raw - mid) * 360 / 4096)[:, :5], atol=2e-3)


def test_range_m100_100_recovers_calibration_range():
    rng = np.random.default_rng(2)
    raw = _raw(rng, lo=900, hi=3200)
    mins = raw.min(0) - rng.integers(0, 40, 6)
    maxs = raw.max(0) + rng.integers(0, 40, 6)
    mins[4], maxs[4] = 0, 4095  # wrist_roll is a full-turn motor
    R = maxs - mins
    X = (((np.clip(raw, mins, maxs) - mins) / R) * 200 - 100).astype(np.float32)
    v = units.detect_units(BUS, X)
    assert v.supported, v.reason
    for j, e in enumerate(v.encodings[:5]):
        assert e.kind == "range_m100_100"
        assert e.range_ticks == R[j]
    Y = units.to_physical_degrees(X, BUS, v)
    mid = (mins + maxs) / 2
    np.testing.assert_allclose(Y[:, :5], ((raw - mid) * 360 / 4096)[:, :5], atol=5e-3)


def test_range_m100_100_rejected_if_wrist_roll_not_full_turn():
    rng = np.random.default_rng(3)
    raw = _raw(rng)
    mins, maxs = raw.min(0) - 3, raw.max(0) + 3
    X = (((raw - mins) / (maxs - mins)) * 200 - 100).astype(np.float32)
    v = units.detect_units(BUS, X)
    assert not v.supported and "wrist_roll" in v.reason


def test_non_quantized_data_is_unsupported():
    rng = np.random.default_rng(4)
    X = rng.normal(0, 30, size=(3000, 6)).astype(np.float32)  # e.g. simulated or filtered data
    v = units.detect_units(BUS, X)
    assert not v.supported
    with pytest.raises(ValueError):
        units.to_physical_degrees(X, BUS, v)
