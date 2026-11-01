"""reports/INDEX.md: every report.json under a reports directory, plus the whole candidate pool."""

from __future__ import annotations

import json
from pathlib import Path


def _ci(d: dict | None) -> str:
    if not d or d.get("mean") is None:
        return "n/a"
    lo, hi = d["ci95"]
    return f"{d['mean']:.2f} [{lo:.2f}, {hi:.2f}]" if lo is not None else f"{d['mean']:.2f}"


def _pct(d: dict) -> str:
    m, (lo, hi) = d["mean"], d["ci95"]
    if m is None:
        return "n/a"
    return f"{100 * m:+.0f}% [{100 * lo:+.0f}, {100 * hi:+.0f}]" if lo is not None else f"{100 * m:+.0f}%"


def _label(hs: dict) -> str:
    b = {"beats the physics-free lag filter": "beats baseline",
         "is WORSE than the physics-free lag filter": "WORSE than baseline",
         "no clear difference from the physics-free lag filter": "= baseline"}.get(hs["baseline_label"], hs["baseline_label"])
    return f"{hs['gap_label']}; {b}"


def _fn(r: dict) -> str:
    d = (r["fit"]["calibrated"].get("identifiability") or {}).get("derived") or {}
    v = [x["natural_freq_hz"]["value"] for x in d.values()]
    return f"{min(v):.1f}-{max(v):.1f}" if v else "n/a"


def write_index(reports: Path) -> str:
    oks, unsup = [], []
    by_id = {}
    for p in sorted(reports.glob("*/report.json")):
        r = json.loads(p.read_text())
        r["_rel"] = p.parent.name
        by_id[r["dataset"]["id"]] = r
        (oks if r["status"] == "ok" else unsup).append(r)
    oks.sort(key=lambda r: r["dataset"]["id"].lower())
    out = [
        "# Twin Gap Report index",
        "",
        "Every row: open-loop replay of the recorded commands in the Menagerie twin, then a system-identification fit "
        "on the fit episodes; numbers are on **held-out episodes** the fit never saw, in two sets: the **future "
        "block** (the last 20% of episodes by index, recorded after every fit episode) and the **interleaved** set "
        "(random episodes from the same period). RMSE = sim-vs-real joint trajectory RMSE in degrees, mean over the "
        "5 arm joints (gripper excluded) and over episodes, [95% bootstrap CI over episodes]. **Change = calibrated/"
        "reference - 1, paired by episode; negative = better.** Baseline = a physics-free per-joint lag filter "
        "(3 parameters per joint) fitted on the same episodes: \"vs baseline\" is what the MuJoCo physics adds.",
        "",
        "Selection: every candidate of the pool below whose compatibility scan passed was run with the same "
        "pipeline and is listed whatever its result (see `candidates.json`; v1 reported 6 of the 23 without a rule).",
        "",
    ]
    for s, title in (("future", "Future block (chronological hold-out)"), ("interleaved", "Interleaved held-out")):
        out += [f"## {title}", "",
                "| dataset | twin | units | fps | eps fit/interl./future | stock | aligned stock | baseline | calibrated "
                "| change vs stock | change vs baseline | improved | verdict |",
                "|---|---|---|---|---|---|---|---|---|---|---|---|---|"]
        for r in oks:
            hs = r["headline"]["sets"][s]
            sp = r["split"]
            kinds = sorted({e["kind"] for e in r["units"]["encodings"][:5]})
            c = hs["calibrated_vs_stock"]
            out.append(
                f"| [{r['dataset']['id']}]({r['_rel']}/report.md) | {r['twin']['id']} | {', '.join(kinds)} | "
                f"{r['dataset']['fps']:g} | {len(sp['fit'])}/{len(sp['interleaved_heldout'])}/{len(sp['future_heldout'])} | "
                f"{_ci(hs['stock'])} | {_ci(hs['aligned_stock'])} | {_ci(hs['baseline'])} | {_ci(hs['calibrated'])} | "
                f"{_pct(c['rel_change'])} | {_pct(hs['calibrated_vs_baseline']['rel_change'])} | "
                f"{c['episodes_improved']}/{c['episodes_total']} | {_label(hs)} |")
        out.append("")
    out += ["## Dynamics (interleaved held-out)", "",
            "Lag in ms (real / stock / calibrated, median over joints) and the largest per-joint |twin - real| lag "
            "mismatch. Natural frequency = sqrt(kp/I_eff) of the fitted servo model (range over the 5 joints): the "
            "identifiable bandwidth. kp alone is only meaningful given the armature held fixed at stock (see each report).",
            "",
            "| dataset | recording convention | lag ms real / stock / calibrated | max lag mismatch ms stock / calibrated "
            "| fitted delay | natural freq Hz | fit converged | parameters not identified alone |",
            "|---|---|---|---|---|---|---|---|"]
    for r in oks:
        lg = r["headline"]["lag_interleaved"]
        pj = lg["per_joint_ms"]

        def med(k):
            v = sorted(x[k] for x in pj.values() if x[k] is not None)
            return f"{v[len(v) // 2]:.0f}" if v else "n/a"

        f = r["fit"]["calibrated"]
        un = [q for q in (f.get("identifiability") or {}).get("parameters", []) if q.get("identified_alone") is False]
        out.append(f"| [{r['dataset']['id']}]({r['_rel']}/report.md) | {r['conventions']['recording_convention']} | "
                   f"{med('real')} / {med('stock')} / {med('calibrated')} | "
                   f"{lg['max_abs_mismatch_vs_real_ms']['stock']} / {lg['max_abs_mismatch_vs_real_ms']['calibrated']} | "
                   f"{f['params']['delay_frames']} | {_fn(r)} | {'yes' if f['converged'] else 'NO'} | "
                   f"{len(un)} of {len(f['fitted'])} |")
    out.append("")
    if unsup:
        out += ["## Run but not reported (units or mapping not verified)", "", "| dataset | twin | reason |",
                "|---|---|---|"]
        for r in sorted(unsup, key=lambda r: r["dataset"]["id"].lower()):
            out.append(f"| [{r['dataset']['id']}]({r['_rel']}/report.md) | {r['twin']['id']} | {r['reason']} |")
        out.append("")
    cpath = reports / "candidates.json"
    if cpath.exists():
        cand = json.loads(cpath.read_text())
        out += ["## Candidate pool", "", cand["pool"], "", "Rule: " + cand["selection_rule"], "",
                "| dataset | source | scan verdict | outcome |", "|---|---|---|---|"]
        for c in cand["candidates"]:
            r = by_id.get(c["dataset"])
            if r is None:
                outcome = "not run" if c["scan_verdict"] == "ok" else "not run (scan failed)"
            elif r["status"] == "ok":
                outcome = f"reported: {r['headline']['sets']['future']['gap_label']} (future block)"
            else:
                outcome = "unsupported (see table above)"
            out.append(f"| {c['dataset']} | {c['source']} | {c['scan_verdict'].replace('|', '/')} | {outcome} |")
        out.append("")
    out += ["Regenerate: `python -m meatspace_lab index --reports reports` (from `lab/`).", ""]
    path = reports / "INDEX.md"
    path.write_text("\n".join(out))
    return str(path)
