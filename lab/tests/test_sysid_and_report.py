import copy
import json

import numpy as np
import pytest

from meatspace_lab import audit, baseline, cli, data, index, report, sysid, twin as tw
from meatspace_lab.replay import EpisodeData, Replayer, replay_episodes

from conftest import smooth_commands, write_lerobot_dataset


@pytest.mark.parametrize("n", [5, 10, 50, 155])
def test_split_three_way_disjoint_complete_deterministic(n):
    ids = list(range(100, 100 + n))
    sp = sysid.split_episodes(ids, 0.2, seed=0, max_train=40)
    fit, inter, fut = set(sp.fit), set(sp.interleaved), set(sp.future)
    assert not (fit & inter) and not (fit & fut) and not (inter & fut)
    assert sorted(fit | inter | fut) == ids
    k = max(1, round(n * 0.2))
    assert sp.future == ids[-k:]  # chronological block: the last episodes by index
    assert max(sp.fit) < min(sp.future) and max(sp.interleaved) < min(sp.future)
    assert len(sp.fit) <= 40 and set(sp.unused_train) <= inter
    assert len(sp.interleaved) == min(k, n - k - 1) + len(sp.unused_train)
    assert sp == sysid.split_episodes(list(reversed(ids)), 0.2, seed=0, max_train=40)
    if n >= 10:
        assert sysid.split_episodes(ids, 0.2, seed=1, max_train=40).interleaved != sp.interleaved
    with pytest.raises(ValueError):
        sysid.split_episodes([1, 2], 0.2, 0)


def test_range_envelope_releases_only_falsified_limits(toy_dir):
    twin = tw.Twin(toy_dir, 30.0)
    mp = tw.nominal_mapping(twin.spec_def, twin.base, "mid_range")
    lim = np.rad2deg(twin.base.jnt_range[twin.jid[:5]])
    obs = np.stack([lim[:, 0] + 10, lim[:, 1] - 10], axis=1)  # inside everywhere ...
    obs[1, 1] = lim[1, 1] + 5.0  # ... except joint 1 upper (falsified)
    obs[2, 0] = lim[2, 0] - 0.3  # within the 0.5 deg tolerance: NOT falsified
    f = sysid.falsified_limits(twin, mp, obs)
    assert f.tolist() == [[False, False], [False, True], [False, False], [False, False], [False, False]]
    p = sysid.range_envelope(twin, mp, obs)(twin.stock.copy())
    stock = twin.base.jnt_range[twin.jid[:5]]
    assert np.allclose(p.jnt_range[[0, 2, 3, 4]], stock[[0, 2, 3, 4]])
    assert p.jnt_range[1, 0] == stock[1, 0] and p.jnt_range[1, 1] == pytest.approx(2 * np.pi)
    # the released value does not depend on how far the fit motion went
    obs2 = obs.copy()
    obs2[1, 1] += 30
    assert np.array_equal(sysid.range_envelope(twin, mp, obs2)(twin.stock.copy()).jnt_range, p.jnt_range)


def test_at_bound_uses_absolute_tolerances():
    names = [("offset", 0), ("kv", 1), ("kp", 2), ("frictionloss", 3)]
    lo = np.array([-20.0, 0.0, 0.0, 0.0])
    hi = np.array([20.0, 50.0, 8.0, 1.0])
    x = np.array([19.9856, 5.3e-16, 4.0, 0.2])  # v1's unflagged near-bound values
    assert sysid._at_bound(names, x, lo, hi) == [True, True, False, False]
    assert sysid._at_bound(names, np.array([18.0, 0.3, 4.0, 0.5]), lo, hi) == [False] * 4


def _truth(twin):
    p = twin.stock.copy()
    p.kp = p.kp * np.array([0.5, 0.6, 1.8, 0.7, 1.4])
    p.kv = p.kv * 1.5
    p.delay_frames = 1
    return p


def _real_episodes(twin, mapping, truth, n, T, seed):
    rng = np.random.default_rng(seed)
    R = Replayer(twin, nthread=2)
    try:
        eps = []
        for i in range(n):
            a = smooth_commands(rng, T, 25.0)
            eps.append(EpisodeData(i, a.copy(), a))
        sims = replay_episodes(R, eps, mapping, truth, sysid.build_model(twin, truth))
    finally:
        R.close()
    return [EpisodeData(e.index, np.column_stack([s, e.a[:, 5]]), e.a) for e, s in zip(eps, sims)]


def test_sysid_reduces_error_recovers_delay_and_reports_identifiability(toy_dir):
    twin = tw.Twin(toy_dir, 30.0)
    mp = tw.nominal_mapping(twin.spec_def, twin.base, "mid_range")
    truth = _truth(twin)
    eps = _real_episodes(twin, mp, truth, n=4, T=150, seed=5)
    cfg = sysid.FitConfig(delays=(0, 1, 2), screen_episodes=2, screen_iters=3, final_iters=8, widen_ranges=False)
    R = Replayer(twin, nthread=2)
    try:
        stock_obj = sysid.Objective(R, eps, mp, sysid.Layout([("offset", j) for j in range(5)], twin.stock),
                                    0, deadline=1e18)
        stock_mse = stock_obj.mse(np.zeros(5))
        res = sysid.fit(twin, R, eps, mp, cfg, dynamics=True, log=lambda s: None)
        aligned = sysid.fit(twin, R, eps, mp, cfg, dynamics=False, log=lambda s: None)
    finally:
        R.close()
    assert res.params.delay_frames == 1
    assert res.train_cost < 0.1 * stock_mse
    assert not res.time_limited and res.converged is not None
    assert np.array_equal(res.params.armature, twin.stock.armature)  # fixed by default
    assert np.array_equal(res.params.offset_deg, np.zeros(5))  # documented mapping, not fitted
    assert res.fitted == [f"{p}[{j}]" for j in ("shoulder_pan", "shoulder_lift", "elbow_flex", "wrist_flex",
                                                 "wrist_roll") for p in ("kp", "kv", "frictionloss")]
    idt = res.identifiability
    assert len(idt["parameters"]) == 15 and set(idt["derived"]) == {"shoulder_pan", "shoulder_lift", "elbow_flex",
                                                                    "wrist_flex", "wrist_roll"}
    for q in idt["parameters"]:
        if q.get("ci95"):
            assert q["ci95"][0] <= q["value"] * 1.001 + 1e-9 and q["value"] <= q["ci95"][1] * 1.001 + 1e-9
    for d in idt["derived"].values():
        assert d["natural_freq_hz"]["ci95"][0] <= d["natural_freq_hz"]["value"] <= d["natural_freq_hz"]["ci95"][1]
    assert aligned.converged is None and aligned.fitted == []  # nothing continuous fitted


def test_baseline_recovers_a_known_lag_filter():
    rng = np.random.default_rng(3)
    eps = []
    for i in range(4):
        a = smooth_commands(rng, 200, 20.0)
        x = a.copy()
        for j in range(5):
            y0, s = baseline._response(np.concatenate([np.repeat(a[:1, j], 2), a[:-2, j]]), a[0, j], 0.3)
            x[:, j] = y0 + 1.5 * s
        eps.append(EpisodeData(i, x, a))
    m = baseline.fit(eps)
    assert np.allclose(m.alpha, 0.3) and np.all(m.delay == 2) and np.allclose(m.bias, 1.5, atol=1e-6)
    assert np.allclose(m.predict(eps[0]), eps[0].x[:, :5], atol=1e-6)


def test_audit_slope_is_centred():
    g = np.array([1.0, 2.0, 3.0, 4.0])
    y = 10.0 - g  # negative relation, but every product g*y > 0
    assert (g @ y) / (g @ g) > 0  # v1's uncentred slope: positive "stiffness"
    assert audit._slope(g, y) == pytest.approx(-1.0)


def test_params_quantised_to_absolute_precision():
    p = tw.TwinParams(np.array([50.000012345] * 5), np.ones(5), np.zeros(5), np.full(5, 0.1), np.zeros(5),
                      np.array([-5.5e-10, 3.2e-10, -0.0, 1.23456789, -19.99999999]))
    d = p.to_dict()
    assert d["offset_deg"] == [0.0, 0.0, 0.0, 1.234568, -20.0]
    assert all(str(v) != "-0.0" for v in d["offset_deg"])
    assert d["kp"][0] == 50.0


def _quantize_degrees_mode(x_deg):
    raw = np.round(x_deg * 4096 / 360) + 2048
    return (raw - 2047.5) * 360 / 4095


def _synthetic_dataset(toy_dir, root, n=12):
    twin = tw.Twin(toy_dir, 30.0)
    mp = tw.nominal_mapping(twin.spec_def, twin.base, "mid_range")
    eps = _real_episodes(twin, mp, _truth(twin), n=n, T=100, seed=11)
    rows = []
    for e in eps:
        x = e.x.copy()
        a = e.a.copy()
        x[:, :5] = _quantize_degrees_mode(x[:, :5])
        a[:, :5] = _quantize_degrees_mode(a[:, :5])
        x[:, 5] = np.round(x[:, 5] * 20) / 20
        rows.append((a, x))
    return write_lerobot_dataset(root, rows)


def test_report_is_deterministic_and_well_formed(toy_dir, tmp_path):
    root = _synthetic_dataset(toy_dir, tmp_path / "ds")
    cfg = sysid.FitConfig(delays=(0, 1), screen_episodes=3, screen_iters=2, final_iters=3, max_train_episodes=8)
    hashes = []
    for k in range(2):
        ds = data.load_local(root, "test/toy", "local", "local")
        rep, art = report.run(ds, toy_dir, cfg, nthread=2, log=lambda s: None)
        assert rep["status"] == "ok", rep.get("reason")
        out = tmp_path / f"reports/run{k}"
        report.write(rep, art, out)
        hashes.append((rep["content_sha256"], rep["results_sha256"]))
        on_disk = json.loads((out / "report.json").read_text())
        assert on_disk["schema"] == "meatspace.twin-gap-report/v2"
        assert report.content_sha256(on_disk) == rep["content_sha256"]
        assert report.results_sha256(on_disk) == rep["results_sha256"]
        sp = on_disk["split"]
        assert sp["overlap"] == [] and sp["future_heldout"] == list(range(10, 12))
        assert on_disk["units"]["supported"] and on_disk["units"]["encodings"][0]["kind"] == "degrees_mode"
        assert on_disk["units"]["decided_on"] == "fit episodes" and on_disk["units"]["heldout_agrees"]
        assert on_disk["dataset"]["timestamps"]["nominal"]
        assert len(on_disk["environment"]["code_sha256"]) == 64
        for name in ("report.md", "heldout_episode.svg", "rmse_by_joint.svg", "rmse_by_joint_future.svg",
                     "calibrated_twin.json"):
            assert (out / name).stat().st_size > 0
        pkg, _ = tw.load_package(out / "calibrated_twin.json")
        assert pkg["sha256"] == on_disk["package"]["sha256"]
        h = on_disk["headline"]["sets"]
        for s in ("future", "interleaved"):
            assert h[s]["calibrated"]["mean"] < h[s]["stock"]["mean"]
            assert h[s]["calibrated_vs_stock"]["rel_change"]["mean"] < 0  # negative = better
            assert h[s]["baseline"]["mean"] is not None
        assert "baseline" in on_disk["metrics"]["future"] and "static_frame_rmse_deg" in on_disk["metrics"]["future"]["calibrated"]
    assert hashes[0] == hashes[1]
    # results_sha256 ignores the environment (interpreter, CPU, BLAS); content_sha256 does not
    alt = copy.deepcopy(on_disk)
    alt["environment"]["python"] = "3.12.3"
    assert report.results_sha256(alt) == on_disk["results_sha256"]
    assert report.content_sha256(alt) != on_disk["content_sha256"]
    md = (out / "report.md").read_text()
    assert "FUTURE BLOCK" in md and "lag-filter baseline" in md and "results sha256" in md
    assert "test/toy" in open(index.write_index(tmp_path / "reports")).read()
    # verify: identical -> 0; a perturbed metric -> 1
    a, b = tmp_path / "reports/run0/report.json", tmp_path / "reports/run1/report.json"
    assert cli.main(["verify", str(a), str(b)]) == 0
    alt = json.loads(b.read_text())
    alt["headline"]["sets"]["future"]["calibrated"]["mean"] += 1e-3
    alt["environment"]["python"] = "0.0"
    c = tmp_path / "alt.json"
    c.write_text(json.dumps(alt))
    assert cli.main(["verify", str(a), str(c)]) == 1
    assert cli.compare_reports(json.loads(a.read_text()), alt, 1e-6, 2e-3) == []
    # optimizer-path diagnostics: not results (results_sha256 and default verify ignore them; --strict does not)
    alt = json.loads(b.read_text())
    alt["fit"]["calibrated"]["n_simulated_rollout_sets"] += 7
    alt["fit"]["calibrated"]["delay_screen_mse_deg2"]["1"] = 123.0
    assert report.results_sha256(alt) == alt["results_sha256"] and report.content_sha256(alt) != alt["content_sha256"]
    c.write_text(json.dumps(alt))
    assert cli.main(["verify", str(a), str(c)]) == 0
    assert cli.main(["verify", str(a), str(c), "--strict"]) == 1


def test_unsupported_units_produce_unsupported_report(toy_dir, tmp_path):
    rng = np.random.default_rng(0)
    rows = [(rng.normal(0, 20, (80, 6)), rng.normal(0, 20, (80, 6))) for _ in range(3)]
    root = write_lerobot_dataset(tmp_path / "ds", rows)
    ds = data.load_local(root, "test/noise")
    rep, art = report.run(ds, toy_dir, sysid.FitConfig(), nthread=1, log=lambda s: None)
    assert rep["status"] == "unsupported" and art == {}
    assert "metrics" not in rep and len(rep["results_sha256"]) == 64
    md = report.to_markdown(rep)
    assert "unsupported" in md


def test_load_local_max_episodes_hashes_only_the_loaded_files(tmp_path):
    """v2.x (one parquet per episode): the file set must not depend on what else is in the cache."""
    import pyarrow as pa
    import pyarrow.parquet as pq

    root = tmp_path / "ds"
    names = [f"main_{n}" for n in ("shoulder_pan", "shoulder_lift", "elbow_flex", "wrist_flex", "wrist_roll", "gripper")]
    feats = {k: {"dtype": "float32", "shape": [6], "names": names} for k in ("action", "observation.state")}
    info = {"codebase_version": "v2.1", "robot_type": "so100", "fps": 30, "features": feats, "total_episodes": 4,
            "chunks_size": 1000, "data_path": "data/chunk-{episode_chunk:03d}/episode_{episode_index:06d}.parquet"}
    (root / "meta").mkdir(parents=True)
    (root / "meta" / "info.json").write_text(json.dumps(info))
    (root / "data" / "chunk-000").mkdir(parents=True)
    for e in range(4):
        T = 70
        v = [[float(e)] * 6] * T
        pq.write_table(pa.table({"action": pa.array(v, type=pa.list_(pa.float32(), 6)),
                                 "observation.state": pa.array(v, type=pa.list_(pa.float32(), 6)),
                                 "episode_index": pa.array([e] * T, type=pa.int64()),
                                 "frame_index": pa.array(list(range(T)), type=pa.int64()),
                                 "timestamp": pa.array([t / 30 for t in range(T)], type=pa.float32())}),
                       root / "data" / "chunk-000" / f"episode_{e:06d}.parquet")
    ds = data.load_local(root, max_episodes=2)
    assert [f["path"] for f in ds.files] == ["data/chunk-000/episode_000000.parquet",
                                             "data/chunk-000/episode_000001.parquet"]
    assert [e.index for e in ds.episodes] == [0, 1] and ds.timestamp_max_dev_s < 1e-6
    assert len(data.load_local(root).files) == 4
