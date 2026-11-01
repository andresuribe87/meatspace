"""export-trace: reproduces the report's replay for its representative episode, checks it, and refuses tampering."""

import json
import shutil

import numpy as np
import pytest

from meatspace_lab import cli, data, report, sysid
from meatspace_lab.trace import TRACE_SCHEMA, TraceError, export_trace, trace_sha256, write_trace

from test_sysid_and_report import _synthetic_dataset


@pytest.fixture(scope="module")
def toy_report(toy_dir, tmp_path_factory):
    tmp = tmp_path_factory.mktemp("trace")
    root = _synthetic_dataset(toy_dir, tmp / "ds")
    cfg = sysid.FitConfig(delays=(0, 1), screen_episodes=3, screen_iters=2, final_iters=3, max_train_episodes=8)
    ds = data.load_local(root, "test/toy", "local", "local")
    rep, art = report.run(ds, toy_dir, cfg, nthread=2, log=lambda s: None)
    assert rep["status"] == "ok"
    out = tmp / "reports" / "test__toy"
    report.write(rep, art, out)
    return root, out


def _rmse_from_trace(tr, series):
    return [float(np.sqrt(np.mean((np.array(tr["series"][j][series][1:]) - np.array(tr["series"][j]["real"][1:])) ** 2)))
            for j in tr["joints"]]


def test_trace_reproduces_the_report_episode(toy_dir, toy_report):
    root, out = toy_report
    rep = json.loads((out / "report.json").read_text())
    tr = export_trace(out, toy_dir, local=root)
    assert tr["schema"] == TRACE_SCHEMA and tr["report_id"] == "test__toy"
    assert tr["sha256"] == trace_sha256(tr)
    k = rep["plots"]["episode_index"]
    assert tr["episode"] == {**tr["episode"], "index": k, "set": "future"}
    assert tr["provenance"]["report_content_sha256"] == rep["content_sha256"]
    assert tr["provenance"]["package_sha256"] == rep["package"]["sha256"]
    assert tr["decimation"] == 1 and tr["frame"] == list(range(tr["episode"]["frames"]))
    assert len(tr["t"]) == tr["episode"]["frames"] and tr["t"][1] == pytest.approx(1 / tr["fps"], abs=1e-4)
    for j in tr["joints"]:
        assert set(tr["series"][j]) == {"cmd", "real", "stock", "baseline", "cal"}
        assert all(len(v) == len(tr["t"]) for v in tr["series"][j].values())
        assert all(round(x, 2) == x for x in tr["series"][j]["cal"])
    row = next(r for r in rep["episodes"] if r["episode"] == k and r["set"] == "future")
    # recomputed from the rounded series in trace.json: the episode's numbers in report.json, within rounding
    for name, key in (("stock", "stock"), ("calibrated", "cal"), ("baseline", "baseline")):
        assert np.allclose(_rmse_from_trace(tr, key), row[f"{name}_rmse_deg"], atol=0.01)
        assert np.allclose(tr["rmse_deg"][name], row[f"{name}_rmse_deg"], atol=0.002)
    # the sims start from the first observed state
    for j in tr["joints"]:
        assert tr["series"][j]["stock"][0] == tr["series"][j]["real"][0] == tr["series"][j]["cal"][0]


def test_trace_decimates_to_the_size_cap(toy_dir, toy_report):
    root, out = toy_report
    full = export_trace(out, toy_dir, local=root)
    small = export_trace(out, toy_dir, local=root, max_bytes=len(json.dumps(full, separators=(",", ":"))) // 2)
    assert small["decimation"] >= 2 and small["fps_series"] == small["fps"] / small["decimation"]
    assert small["frame"] == list(range(0, small["episode"]["frames"], small["decimation"]))
    assert small["rmse_deg"] == full["rmse_deg"]  # computed at full resolution either way


def test_trace_refuses_a_report_it_cannot_reproduce(toy_dir, toy_report, tmp_path):
    root, out = toy_report
    rep = json.loads((out / "report.json").read_text())
    bad = tmp_path / "test__toy"
    bad.mkdir()
    (bad / "calibrated_twin.json").write_text((out / "calibrated_twin.json").read_text())
    other = next(i for i in rep["split"]["future_heldout"] if i != rep["plots"]["episode_index"])
    edited = dict(rep, plots={**rep["plots"], "episode_index": other})
    (bad / "report.json").write_text(json.dumps(edited))
    with pytest.raises(TraceError, match="content_sha256"):
        export_trace(bad, toy_dir, local=root)
    # a consistent hash does not help: the episode is no longer the one the report replayed for its plot
    edited["content_sha256"] = report.content_sha256(edited)
    (bad / "report.json").write_text(json.dumps(edited))
    with pytest.raises(TraceError, match="median"):
        export_trace(bad, toy_dir, local=root)
    pkg = json.loads((out / "calibrated_twin.json").read_text())
    pkg["params"]["kp"][0] *= 2
    (bad / "report.json").write_text((out / "report.json").read_text())
    (bad / "calibrated_twin.json").write_text(json.dumps(pkg))
    with pytest.raises(ValueError, match="sha256"):
        export_trace(bad, toy_dir, local=root)


def test_cli_export_trace_writes_and_skips_unsupported(toy_dir, toy_report, tmp_path):
    root, out = toy_report
    menagerie = toy_dir.parent  # the CLI finds the twin as <menagerie>/<twin id>
    assert cli.main(["export-trace", str(out), "--menagerie", str(menagerie), "--local", str(root)]) == 0
    tr = json.loads((out / "trace.json").read_text())
    assert tr["sha256"] == trace_sha256(tr)
    write_trace(tr, tmp_path)
    assert json.loads((tmp_path / "trace.json").read_text()) == tr
    uns = tmp_path / "uns"
    uns.mkdir()
    (uns / "report.json").write_text(json.dumps({"status": "unsupported"}))
    assert cli.main(["export-trace", str(uns)]) == 0 and not (uns / "trace.json").exists()
    # a new report run removes a trace it did not produce
    copy = tmp_path / "copy"
    shutil.copytree(out, copy)
    assert (copy / "trace.json").exists()
    report.write(json.loads((copy / "report.json").read_text()), {}, copy)
    assert not (copy / "trace.json").exists()
