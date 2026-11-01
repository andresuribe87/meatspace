"""Command line: python -m meatspace_lab {report,scan,export-twin,render,index,verify}."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from . import __version__


def _cmd_report(a: argparse.Namespace) -> int:
    from . import data, report, sysid

    cfg = sysid.FitConfig(seed=a.seed, test_frac=a.test_frac, max_train_episodes=a.max_train_episodes,
                          delays=tuple(int(x) for x in a.delays.split(",")), screen_episodes=a.screen_episodes,
                          screen_iters=a.screen_iters, final_iters=a.final_iters,
                          offset_bound_deg=a.offset_bound, time_limit_s=a.time_limit, fit_offsets=a.fit_offsets,
                          fit_armature=a.fit_armature)
    print(f"[meatspace_lab {__version__}] {a.dataset}@{a.revision} x {a.twin}", flush=True)
    if a.local:
        ds = data.load_local(a.local, a.dataset, a.revision, a.revision, max_episodes=a.max_episodes)
    else:
        ds = data.load_hub(a.dataset, a.revision, cache_dir=a.cache, max_episodes=a.max_episodes)
    print(f"  revision {ds.sha}; {len(ds.episodes)} episodes ({len(ds.dropped)} dropped), {ds.total_frames} frames",
          flush=True)
    rep, art = report.run(ds, a.twin, cfg, nthread=a.threads, log=lambda s: print(s, flush=True))
    report.write(rep, art, a.out)
    if rep["status"] == "ok":
        for s, hs in rep["headline"]["sets"].items():
            print(f"  {s} held-out arm-mean RMSE: stock {hs['stock']['mean']:.3f}, baseline {hs['baseline']['mean']:.3f}, "
                  f"calibrated {hs['calibrated']['mean']:.3f} deg; {hs['verdict']}")
    else:
        print(f"  status {rep['status']}: {rep['reason']}")
    print(f"  wrote {a.out} (results sha256 {rep['results_sha256'][:16]}..., content sha256 "
          f"{rep['content_sha256'][:16]}..., {rep['volatile']['runtime_s']} s)")
    return 0


def _cmd_scan(a: argparse.Namespace) -> int:
    from .scan import scan

    for r in a.datasets:
        print(json.dumps(scan(r, a.revision, a.cache)), flush=True)
    return 0


def _cmd_export(a: argparse.Namespace) -> int:
    from .twin import export_mjcf

    print(export_mjcf(a.twin, a.package, a.out))
    return 0


def _cmd_render(a: argparse.Namespace) -> int:
    from . import report

    for d in a.dirs:
        rep = json.loads((Path(d) / "report.json").read_text())
        if report.content_sha256(rep) != rep.get("content_sha256"):
            print(f"{d}: report.json content hash mismatch (edited?)", file=sys.stderr)
            return 1
        (Path(d) / "report.md").write_text(report.to_markdown(rep))
        print(f"rendered {d}/report.md")
    return 0


SKIP_KEYS = {"volatile", "environment", "content_sha256", "results_sha256"}


def compare_reports(x, y, rtol: float, atol: float, path: str = "", skip: tuple = ()) -> list[str]:
    """Leaf-by-leaf comparison; numbers within atol + rtol*|ref|, everything else exact.

    Skipped: volatile, environment and the report hashes; the calibrated-package sha256 (it hashes the
    fitted parameters, which are compared numerically instead); any key in ``skip``.
    """
    out: list[str] = []
    if isinstance(x, dict) and isinstance(y, dict):
        for k in sorted(set(x) | set(y)):
            if k in SKIP_KEYS or k in skip or (path == "/package" and k == "sha256"):
                continue
            if k not in x or k not in y:
                out.append(f"{path}/{k}: present in only one report")
                continue
            out += compare_reports(x[k], y[k], rtol, atol, f"{path}/{k}", skip)
    elif isinstance(x, list) and isinstance(y, list):
        if len(x) != len(y):
            return [f"{path}: length {len(x)} vs {len(y)}"]
        for i, (u, v) in enumerate(zip(x, y)):
            out += compare_reports(u, v, rtol, atol, f"{path}[{i}]", skip)
    elif isinstance(x, (int, float)) and isinstance(y, (int, float)) and not isinstance(x, bool) and not isinstance(y, bool):
        if abs(x - y) > atol + rtol * abs(x):
            out.append(f"{path}: {x} vs {y}")
    elif x != y:
        if isinstance(x, str) and isinstance(y, str) and path.startswith(("/limitations", "/fit/calibrated/optimizer_status")):
            # free text can embed numbers; compared exactly but reported briefly
            out.append(f"{path}: text differs")
        else:
            out.append(f"{path}: {str(x)[:80]!r} vs {str(y)[:80]!r}")
    return out


def _cmd_verify(a: argparse.Namespace) -> int:
    x = json.loads(Path(a.reference).read_text())
    y = json.loads(Path(a.candidate).read_text())
    same = {k: x.get(k) == y.get(k) for k in ("results_sha256", "content_sha256")}
    print(f"results_sha256 {'identical' if same['results_sha256'] else 'differs'}; "
          f"content_sha256 {'identical' if same['content_sha256'] else 'differs'} (it also hashes the environment)")
    for k in ("python", "numpy", "scipy", "mujoco", "code_sha256"):
        u, v = x.get("environment", {}).get(k), y.get("environment", {}).get(k)
        if u != v:
            print(f"  environment.{k}: {u} vs {v}")
    from .report import DIAGNOSTIC_KEYS

    diffs = compare_reports(x, y, a.rtol, a.atol, skip=() if a.strict else DIAGNOSTIC_KEYS)
    for d in diffs[: a.max_print]:
        print("  " + d)
    if len(diffs) > a.max_print:
        print(f"  ... {len(diffs) - a.max_print} more")
    print(f"{len(diffs)} result difference(s) beyond rtol={a.rtol:g}, atol={a.atol:g}")
    if not a.strict:
        diag = [d for d in compare_reports(x, y, a.rtol, a.atol) if any(f"/{k}" in d for k in DIAGNOSTIC_KEYS)]
        if diag:
            print(f"{len(diag)} optimizer-path diagnostic difference(s) (not results; --strict counts them):")
            for d in diag[: a.max_print]:
                print("  " + d)
    return 0 if not diffs else 1


def _cmd_index(a: argparse.Namespace) -> int:
    from .index import write_index

    print(write_index(Path(a.reports)))
    return 0


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="meatspace_lab", description="Twin Gap Report: sim-to-real gap of a MuJoCo twin")
    p.add_argument("--version", action="version", version=__version__)
    sub = p.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("report", help="replay a LeRobot dataset in a Menagerie twin, calibrate, write a report")
    r.add_argument("--dataset", required=True, help="Hub dataset id, e.g. lerobot/svla_so100_pickplace")
    r.add_argument("--revision", default="main", help="branch, tag or commit sha (resolved and pinned to a sha)")
    r.add_argument("--twin", required=True, help="Menagerie model dir, e.g. .cache/menagerie/trs_so_arm100")
    r.add_argument("--out", required=True, help="output dir, e.g. reports/<id>/")
    r.add_argument("--cache", default=".cache/hf", help="Hub download cache (gitignored)")
    r.add_argument("--local", default=None, help="load a local LeRobot dataset dir instead of the Hub")
    r.add_argument("--seed", type=int, default=0)
    r.add_argument("--test-frac", type=float, default=0.2)
    r.add_argument("--max-train-episodes", type=int, default=40)
    r.add_argument("--max-episodes", type=int, default=None)
    r.add_argument("--delays", default="0,1,2,3,4,5")
    r.add_argument("--screen-episodes", type=int, default=16)
    r.add_argument("--screen-iters", type=int, default=4)
    r.add_argument("--final-iters", type=int, default=30)
    r.add_argument("--offset-bound", type=float, default=20.0,
                   help="sign/plausibility gate tolerance in deg (and the offset bound with --fit-offsets)")
    r.add_argument("--fit-offsets", action="store_true", help="also fit zero offsets (diagnostic; unidentified in v1)")
    r.add_argument("--fit-armature", action="store_true", help="also fit armature (diagnostic; not separable from kp)")
    r.add_argument("--time-limit", type=float, default=3600.0,
                   help="wall-clock safety limit per fit (s); raise it on slow machines to stay bit-reproducible")
    r.add_argument("--threads", type=int, default=4)
    r.set_defaults(fn=_cmd_report)
    s = sub.add_parser("scan", help="check Hub datasets for compatibility (codebase, joints, units)")
    s.add_argument("datasets", nargs="+")
    s.add_argument("--revision", default="main")
    s.add_argument("--cache", default=".cache/hf-scan")
    s.set_defaults(fn=_cmd_scan)
    e = sub.add_parser("export-twin", help="write a calibrated MJCF from a calibrated_twin.json package")
    e.add_argument("--twin", required=True)
    e.add_argument("--package", required=True)
    e.add_argument("--out", required=True, help="output .xml (anywhere outside the twin dir; mesh paths are absolute)")
    e.set_defaults(fn=_cmd_export)
    m = sub.add_parser("render", help="re-render report.md from report.json (after a template change)")
    m.add_argument("dirs", nargs="+")
    m.set_defaults(fn=_cmd_render)
    v = sub.add_parser("verify", help="compare two report.json files at a numeric tolerance (cross-machine check)")
    v.add_argument("reference")
    v.add_argument("candidate")
    v.add_argument("--rtol", type=float, default=1e-6)
    v.add_argument("--atol", type=float, default=1e-6)
    v.add_argument("--max-print", type=int, default=40)
    v.add_argument("--strict", action="store_true", help="also fail on optimizer-path diagnostics (evaluation counts, "
                   "screen losses of non-selected delays), which may differ across BLAS kernels")
    v.set_defaults(fn=_cmd_verify)
    i = sub.add_parser("index", help="(re)write reports/INDEX.md from all report.json files")
    i.add_argument("--reports", default="reports")
    i.set_defaults(fn=_cmd_index)
    a = p.parse_args(argv)
    return a.fn(a)


if __name__ == "__main__":
    sys.exit(main())
