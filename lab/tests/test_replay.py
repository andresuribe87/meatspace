from pathlib import Path

import numpy as np
import pytest

from meatspace_lab import metrics, sysid, twin as tw
from meatspace_lab.replay import EpisodeData, Replayer, prepare, replay_episodes, replay_reference

from conftest import smooth_commands

MENAGERIE = Path(__file__).resolve().parents[1] / ".cache" / "menagerie"


def _gen(twin, mapping, p, rng, T=150, n=3, amp=25.0, replayer=None):
    """'Real' episodes produced by the twin itself: x = simulated trajectory of the commands."""
    eps = []
    for i in range(n):
        a = smooth_commands(rng, T, amp)
        eps.append(EpisodeData(i, a.copy(), a))
    sims = replay_episodes(replayer, eps, mapping, p, sysid.build_model(twin, p))
    return [EpisodeData(e.index, np.column_stack([s, e.a[:, 5]]), e.a) for e, s in zip(eps, sims)]


def test_rollout_matches_reference_loop(toy_dir):
    twin = tw.Twin(toy_dir, 30.0)
    mp = tw.nominal_mapping(twin.spec_def, twin.base, "mid_range")
    R = Replayer(twin, nthread=2)
    try:
        rng = np.random.default_rng(0)
        a = smooth_commands(rng, 120)
        ep = EpisodeData(0, a.copy(), a)
        m = sysid.build_model(twin, twin.stock)
        q0, ctrl = prepare(ep, twin, mp, twin.stock)
        fast = R.run([(m, q0, ctrl)])[0]
        ref = replay_reference(twin, m, q0, ctrl)
        np.testing.assert_allclose(fast, ref, atol=1e-12)
    finally:
        R.close()


def test_substeps_make_sim_time_equal_real_time(toy_dir):
    for fps in (30.0, 20.0, 50.0):
        twin = tw.Twin(toy_dir, fps)
        assert twin.substeps == round((1 / fps) / 0.002)
        assert twin.substeps * twin.timestep == pytest.approx(1 / fps, rel=1e-12)


@pytest.mark.parametrize("delay", [0, 2])
def test_twin_reproduces_its_own_trajectory(toy_dir, delay):
    twin = tw.Twin(toy_dir, 30.0)
    mp = tw.nominal_mapping(twin.spec_def, twin.base, "mid_range")
    p = twin.stock.copy()
    p.delay_frames = delay
    R = Replayer(twin, nthread=2)
    try:
        eps = _gen(twin, mp, p, np.random.default_rng(1), replayer=R)
        sims = replay_episodes(R, eps, mp, p, sysid.build_model(twin, p))
        for e, s in zip(eps, sims):
            assert np.max(np.abs(s - e.x[:, :5])) < 1e-9
            np.testing.assert_allclose(metrics.rmse(s[1:], e.x[1:, :5]), 0.0, atol=1e-9)
    finally:
        R.close()


@pytest.mark.skipif(not (MENAGERIE / "trs_so_arm100").exists(), reason="Menagerie clone not present")
def test_menagerie_twin_reproduces_its_own_trajectory():
    twin = tw.Twin(MENAGERIE / "trs_so_arm100", 30.0)
    mp = tw.nominal_mapping(twin.spec_def, twin.base, "calibration_zero_pose")
    R = Replayer(twin, nthread=2)
    try:
        rng = np.random.default_rng(2)
        eps = []
        for i in range(2):
            a = smooth_commands(rng, 100, 15.0)
            a[:, 1] -= 60  # keep inside the MJCF Pitch range
            a[:, 2] += 60
            eps.append(EpisodeData(i, a.copy(), a))
        m = sysid.build_model(twin, twin.stock)
        sims = replay_episodes(R, eps, mp, twin.stock, m)
        eps = [EpisodeData(e.index, np.column_stack([s, e.a[:, 5]]), e.a) for e, s in zip(eps, sims)]
        again = replay_episodes(R, eps, mp, twin.stock, m)
        for e, s in zip(eps, again):
            assert np.max(np.abs(s - e.x[:, :5])) < 1e-9
    finally:
        R.close()


@pytest.mark.parametrize("delay", [0, 2])
def test_instantaneous_actuator_measures_lag_one_plus_delay(toy_dir, delay):
    """Pins the alignment convention: observe-then-act sampling = exactly 1 frame of lag."""
    twin = tw.Twin(toy_dir, 30.0)
    mp = tw.nominal_mapping(twin.spec_def, twin.base, "mid_range")
    p = twin.stock.copy()
    p.kp[:] = 500.0
    p.kv[:] = 2 * np.sqrt(500.0 * 0.01)
    p.frictionloss[:] = 0.0
    p.delay_frames = delay
    m = sysid.build_model(twin, p)
    m.actuator_forcerange[:] = [-1e4, 1e4]
    m.opt.gravity[:] = 0
    R = Replayer(twin, nthread=2)
    try:
        rng = np.random.default_rng(3)
        a = smooth_commands(rng, 300, 8.0)
        ep = EpisodeData(0, a.copy(), a)
        s = replay_episodes(R, [ep], mp, p, m)[0]
        lags = [metrics.lag_frames(a[:, j], s[:, j]) for j in range(5)]
        for L in lags:
            assert 1.0 + delay - 0.02 <= L <= 1.0 + delay + 0.3
    finally:
        R.close()


def test_package_roundtrip_and_exported_mjcf_matches(toy_dir, tmp_path):
    twin = tw.Twin(toy_dir, 30.0)
    mp = tw.nominal_mapping(twin.spec_def, twin.base, "mid_range")
    p = twin.stock.copy()
    p.kp = p.kp * np.array([0.5, 1.5, 2.0, 0.8, 1.2])
    p.kv = p.kv * 1.3
    p.armature = p.armature * 1.7
    p.frictionloss = p.frictionloss + 0.02
    p.offset_deg = np.array([1.0, -2.0, 3.0, 0.0, 0.5])
    p.jnt_range = twin.base.jnt_range[twin.jid[:5]] * 1.1
    p.delay_frames = 1
    pkg = tw.make_package(twin, p, mp, {"test": True})
    path = tmp_path / "calibrated_twin.json"
    import json

    path.write_text(json.dumps(pkg))
    pkg2, p2 = tw.load_package(path)
    assert pkg2["sha256"] == tw.package_sha256(pkg2)
    np.testing.assert_allclose(p2.kp, p.kp, rtol=1e-5)
    np.testing.assert_allclose(p2.jnt_range, p.jnt_range, rtol=1e-5)
    tampered = dict(pkg2, params=dict(pkg2["params"], kp=[1, 1, 1, 1, 1]))
    path.write_text(json.dumps(tampered))
    with pytest.raises(ValueError):
        tw.load_package(path)
    path.write_text(json.dumps(pkg))
    out_xml = toy_dir / "toy_arm_calibrated_test.xml"
    tw.export_mjcf(toy_dir, path, out_xml)
    import mujoco

    m_export = mujoco.MjModel.from_xml_path(str(out_xml))
    out_xml.unlink()
    m_fast = sysid.build_model(twin, p2)
    for attr in ("actuator_gainprm", "actuator_biasprm", "dof_armature", "dof_frictionloss", "dof_damping",
                 "jnt_range", "actuator_ctrlrange"):
        np.testing.assert_allclose(getattr(m_export, attr), getattr(m_fast, attr), rtol=1e-5, atol=1e-9,
                                   err_msg=attr)
    # the MJCF writer keeps ~6 significant digits
    assert m_export.opt.timestep == pytest.approx(m_fast.opt.timestep, rel=1e-5)
    R = Replayer(twin, nthread=2)
    try:
        a = smooth_commands(np.random.default_rng(4), 90)
        ep = EpisodeData(0, a.copy(), a)
        s1 = replay_episodes(R, [ep], mp, p2, m_fast)[0]
        s2 = replay_episodes(R, [ep], mp, p2, m_export)[0]
        assert np.max(np.abs(s1 - s2)) < 1e-4
    finally:
        R.close()


def test_resolve_signs_keeps_flips_and_rejects(toy_dir):
    twin = tw.Twin(toy_dir, 30.0)  # toy ranges: +-143 deg
    mp = tw.nominal_mapping(twin.spec_def, twin.base, "mid_range")
    x = np.zeros((1000, 5))
    x[:, 0] = np.linspace(-100, 100, 1000)  # fits either way -> documented sign kept
    x[:, 1] = np.linspace(-150, 50, 1000)  # needs +7 deg shift with the documented sign -> kept
    x[:, 2] = np.linspace(0, 10, 1000)
    m2, dec, why = tw.resolve_signs(twin, mp, x, bound_deg=20)
    assert why is None and list(m2.sign) == [1, 1, 1, 1, 1]
    assert "also fit" in dec[0]["decision"]
    off = tw.Mapping(mp.sign, np.array([0, 0, 0, 0, 120.0]), "", "mid_range")  # nominal offset 120 on joint 4
    x[:, 4] = np.linspace(-130, -60, 1000)  # doc sign -> [-10, 60] fits; flipped -> [180, 250] does not
    m3, dec, why = tw.resolve_signs(twin, off, x, bound_deg=20)
    assert why is None and m3.sign[4] == 1
    x[:, 4] = np.linspace(60, 130, 1000)  # doc sign -> [180, 250] no; flipped -> [-10, 60] yes
    m4, dec, why = tw.resolve_signs(twin, off, x, bound_deg=20)
    assert why is None and m4.sign[4] == -1 and dec[4]["decision"].startswith("flipped")
    x[:, 3] = np.linspace(-170, 170, 1000)  # wider than the joint range -> rejected
    _, dec, why = tw.resolve_signs(twin, off, x, bound_deg=20)
    assert why is not None and "wrist_flex" in why and dec[3]["decision"] == "rejected"
