"""Small dependency-free SVG plots for the report (light + dark via prefers-color-scheme).

Colour roles (validated categorical slots 1-2 of the reference palette, both modes):
real robot = neutral ink (it is the reference, not a series), stock twin = orange dashed,
calibrated twin = blue solid. Identity is never colour-alone: dash pattern + legend +
direct labels; every mark carries a native <title> tooltip.
"""

from __future__ import annotations

from html import escape

import numpy as np

STYLE = """
<style>
  svg { --surface:#fcfcfb; --ink:#0b0b0b; --ink2:#52514e; --muted:#8a8984; --grid:#e6e5e0;
        --stock:#eb6834; --calib:#2a78d6; --real:#52514e; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  @media (prefers-color-scheme: dark) {
    svg { --surface:#1a1a19; --ink:#f0efec; --ink2:#c3c2b7; --muted:#8f8e86; --grid:#2e2e2b;
          --stock:#d95926; --calib:#3987e5; --real:#c3c2b7; }
  }
  .bg { fill: var(--surface); }
  .t1 { fill: var(--ink); font-size: 12px; }
  .t2 { fill: var(--ink2); font-size: 11px; }
  .t3 { fill: var(--muted); font-size: 10px; }
  .grid { stroke: var(--grid); stroke-width: 1; }
  .axis { stroke: var(--muted); stroke-width: 1; }
  .real { stroke: var(--real); stroke-width: 4; stroke-opacity: 0.45; fill: none; stroke-linejoin: round; }
  .stock { stroke: var(--stock); stroke-width: 1.75; fill: none; stroke-dasharray: 5 3; }
  .calib { stroke: var(--calib); stroke-width: 1.75; fill: none; }
  .fstock { fill: var(--stock); } .fcalib { fill: var(--calib); }
  .ci { stroke: var(--ink); stroke-width: 1.5; }
  .ref { stroke: var(--ink); stroke-width: 2; stroke-dasharray: 3 2; fill: none; }
</style>
"""


def _f(v: float) -> str:
    if abs(v) < 0.05:
        return "0"
    return f"{v:.1f}".rstrip("0").rstrip(".") if abs(v) < 1e5 else f"{v:.0f}"


def _ticks(lo: float, hi: float, n: int = 4) -> list[float]:
    span = hi - lo
    if span <= 0:
        return [lo]
    raw = span / n
    mag = 10 ** np.floor(np.log10(raw))
    step = min((s * mag for s in (1, 2, 2.5, 5, 10) if s * mag >= raw), default=raw)
    start = np.ceil(lo / step) * step
    return [float(v) for v in np.arange(start, hi + 1e-9, step)]


def _poly(xs: np.ndarray, ys: np.ndarray, cls: str, title: str) -> str:
    if len(xs) > 400:
        idx = np.linspace(0, len(xs) - 1, 400).round().astype(int)
        xs, ys = xs[idx], ys[idx]
    pts = " ".join(f"{_f(x)},{_f(y)}" for x, y in zip(xs, ys))
    return f'<polyline class="{cls}" points="{pts}"><title>{escape(title)}</title></polyline>'


def episode_svg(t: np.ndarray, real: np.ndarray, stock: np.ndarray, calib: np.ndarray, joints: list[str],
                title: str, rmse_stock: np.ndarray, rmse_calib: np.ndarray) -> str:
    """Small multiples: one panel per arm joint, real vs stock vs calibrated (deg vs s)."""
    W, ph, top, left, right, gap = 760, 120, 74, 56, 150, 26
    H = top + len(joints) * (ph + gap) + 20
    pw = W - left - right
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" '
           f'aria-label="{escape(title)}">', STYLE, f'<rect class="bg" width="{W}" height="{H}"/>',
           f'<text class="t1" x="{left}" y="18">{escape(title)}</text>']
    # legend (always present for >= 2 series)
    lx = left
    for cls, lab in (("real", "real robot (wide band)"), ("stock", "stock twin"), ("calib", "calibrated twin")):
        out.append(f'<line class="{cls}" x1="{lx}" y1="36" x2="{lx + 26}" y2="36"/>'
                   f'<text class="t2" x="{lx + 32}" y="40">{lab}</text>')
        lx += 190
    x0, x1 = float(t[0]), float(t[-1])
    sx = lambda v: left + (v - x0) / max(x1 - x0, 1e-9) * pw  # noqa: E731
    for k, jn in enumerate(joints):
        y_top = top + k * (ph + gap)
        allv = np.concatenate([real[:, k], stock[:, k], calib[:, k]])
        lo, hi = float(np.min(allv)), float(np.max(allv))
        pad = max(0.5, 0.08 * (hi - lo))
        lo, hi = lo - pad, hi + pad
        sy = lambda v: y_top + ph - (v - lo) / (hi - lo) * ph  # noqa: E731,B023
        for tv in _ticks(lo, hi, 3):
            yy = sy(tv)
            out.append(f'<line class="grid" x1="{left}" y1="{_f(yy)}" x2="{left + pw}" y2="{_f(yy)}"/>'
                       f'<text class="t3" x="{left - 6}" y="{_f(yy + 3)}" text-anchor="end">{_f(tv)}</text>')
        out.append(f'<line class="axis" x1="{left}" y1="{y_top + ph}" x2="{left + pw}" y2="{y_top + ph}"/>')
        out.append(f'<text class="t2" x="{left}" y="{y_top - 6}">{escape(jn)} (deg)</text>')
        xs = sx(t)
        out.append(_poly(xs, sy(real[:, k]), "real", f"real robot, {jn}"))
        out.append(_poly(xs, sy(stock[:, k]), "stock", f"stock twin, {jn}: RMSE {rmse_stock[k]:.2f} deg"))
        out.append(_poly(xs, sy(calib[:, k]), "calib", f"calibrated twin, {jn}: RMSE {rmse_calib[k]:.2f} deg"))
        out.append(f'<text class="t2" x="{left + pw + 10}" y="{y_top + 40}">RMSE vs real</text>'
                   f'<text class="t2" x="{left + pw + 10}" y="{y_top + 58}">stock {rmse_stock[k]:.2f}</text>'
                   f'<text class="t2" x="{left + pw + 10}" y="{y_top + 76}">calib {rmse_calib[k]:.2f}</text>')
        if k == len(joints) - 1:
            for tv in _ticks(x0, x1, 6):
                xx = sx(tv)
                out.append(f'<text class="t3" x="{_f(xx)}" y="{y_top + ph + 14}" text-anchor="middle">{_f(tv)}s</text>')
    out.append("</svg>")
    return "\n".join(out)


def rmse_bars_svg(groups: list[str], stock: list[dict], calib: list[dict], title: str,
                  ref: list[dict] | None = None) -> str:
    """Grouped vertical bars: held-out mean RMSE per joint, stock vs calibrated, with 95% CI whiskers.

    stock/calib: list of {"mean", "ci95": [lo, hi]} aligned with groups. ``ref`` (optional, same shape):
    a reference value per group (the physics-free baseline), drawn as a neutral-ink dashed tick across
    the group - a reference mark, not a third categorical series.
    """
    W, H, top, left, bottom = 760, 330, 60, 56, 50
    ph = H - top - bottom
    pw = W - left - 20
    vmax = max(max((s["ci95"][1] or s["mean"] or 0) for s in stock), max((c["ci95"][1] or c["mean"] or 0) for c in calib),
               max(((r or {}).get("mean") or 0) for r in (ref or [None])))
    vmax = vmax * 1.12 if vmax > 0 else 1.0
    sy = lambda v: top + ph - v / vmax * ph  # noqa: E731
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" '
           f'aria-label="{escape(title)}">', STYLE, f'<rect class="bg" width="{W}" height="{H}"/>',
           f'<text class="t1" x="{left}" y="18">{escape(title)}</text>']
    lx = left
    for cls, lab in (("fstock", "stock twin"), ("fcalib", "calibrated twin")):
        out.append(f'<rect class="{cls}" x="{lx}" y="30" width="14" height="10" rx="2"/>'
                   f'<text class="t2" x="{lx + 20}" y="39">{lab}</text>')
        lx += 150
    if ref is not None:
        out.append(f'<line class="ref" x1="{lx}" y1="35" x2="{lx + 18}" y2="35"/>'
                   f'<text class="t2" x="{lx + 24}" y="39">lag-filter baseline (no physics)</text>')
        lx += 262
    out.append(f'<text class="t3" x="{lx}" y="39">whiskers: 95% CI</text>')
    for tv in _ticks(0, vmax, 4):
        yy = sy(tv)
        out.append(f'<line class="grid" x1="{left}" y1="{_f(yy)}" x2="{left + pw}" y2="{_f(yy)}"/>'
                   f'<text class="t3" x="{left - 6}" y="{_f(yy + 3)}" text-anchor="end">{_f(tv)}</text>')
    out.append(f'<text class="t3" x="12" y="{top - 8}">deg</text>')
    gw = pw / len(groups)
    bw = min(24.0, gw * 0.32)
    for g, (name, s, c) in enumerate(zip(groups, stock, calib)):
        cx = left + gw * (g + 0.5)
        for cls, d, x in (("fstock", s, cx - bw - 1), ("fcalib", c, cx + 1)):  # 2px gap between bars
            m = d["mean"] or 0.0
            y = sy(m)
            h = top + ph - y
            r = min(4.0, h / 2, bw / 2)
            # rounded data-end, square baseline
            path = (f"M{_f(x)},{_f(top + ph)} V{_f(y + r)} Q{_f(x)},{_f(y)} {_f(x + r)},{_f(y)} "
                    f"H{_f(x + bw - r)} Q{_f(x + bw)},{_f(y)} {_f(x + bw)},{_f(y + r)} V{_f(top + ph)} Z")
            lo, hi = d["ci95"]
            tip = f"{name}, {'stock' if cls == 'fstock' else 'calibrated'}: {m:.2f} deg"
            if lo is not None:
                tip += f" [95% CI {lo:.2f}, {hi:.2f}]"
            out.append(f'<path class="{cls}" d="{path}"><title>{escape(tip)}</title></path>')
            if lo is not None and hi is not None:
                xm = x + bw / 2
                out.append(f'<line class="ci" x1="{_f(xm)}" y1="{_f(sy(lo))}" x2="{_f(xm)}" y2="{_f(sy(hi))}"/>'
                           f'<line class="ci" x1="{_f(xm - 4)}" y1="{_f(sy(hi))}" x2="{_f(xm + 4)}" y2="{_f(sy(hi))}"/>'
                           f'<line class="ci" x1="{_f(xm - 4)}" y1="{_f(sy(lo))}" x2="{_f(xm + 4)}" y2="{_f(sy(lo))}"/>')
            if name == groups[-1]:  # selective direct labels: the headline group only, above whisker AND ref mark
                top_v = max(hi if hi else m, (ref[g] or {}).get("mean") or 0.0 if ref is not None else 0.0)
                out.append(f'<text class="t2" x="{_f(x + bw / 2)}" y="{_f(sy(top_v) - 9)}" '
                           f'text-anchor="middle">{m:.2f}</text>')
        if ref is not None and ref[g] and ref[g].get("mean") is not None:
            rv = ref[g]["mean"]
            out.append(f'<line class="ref" x1="{_f(cx - bw - 7)}" y1="{_f(sy(rv))}" x2="{_f(cx + bw + 7)}" '
                       f'y2="{_f(sy(rv))}"><title>{escape(f"{name}, lag-filter baseline: {rv:.2f} deg")}</title></line>')
        out.append(f'<text class="t2" x="{_f(cx)}" y="{top + ph + 18}" text-anchor="middle">{escape(name)}</text>')
    out.append(f'<line class="axis" x1="{left}" y1="{top + ph}" x2="{left + pw}" y2="{top + ph}"/>')
    out.append("</svg>")
    return "\n".join(out)
