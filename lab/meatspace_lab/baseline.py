"""Physics-free baseline: per-joint first-order lag filter of the delayed command, plus a bias.

    y[0] = x[0];   y[t+1] = y[t] + alpha * (a[t - d] + b - y[t])

Three parameters per arm joint (alpha in (0, 1], integer delay d, constant bias b), no MuJoCo, no
coupling between joints, no gravity. It is fitted on the same TRAIN episodes and scored with the
same metric as the twins, so "calibrated twin vs baseline" measures what the physics model adds
over a black-box lag model. (A 2-pole cascade gave the same held-out numbers in the v1 review,
so only the 1-pole filter is used.) Fit: exhaustive grid over (d, alpha), closed-form least-squares
bias; the loss is the mean over episodes of the per-episode MSE (every episode counts equally,
as in sysid.py).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy.signal import lfilter

from .replay import EpisodeData, delayed

ALPHAS = tuple(round(0.02 * k, 2) for k in range(1, 51))  # 0.02 .. 1.00
DELAYS = (0, 1, 2, 3, 4, 5)


def _response(a: np.ndarray, x0: float, alpha: float) -> tuple[np.ndarray, np.ndarray]:
    """(y0, s): y0 = filter response to a with y[0] = x0; s = response to a unit input with y[0] = 0."""
    T = len(a)
    z = lfilter([0.0, alpha], [1.0, alpha - 1.0], a)
    decay = (1.0 - alpha) ** np.arange(T)
    return z + decay * x0, 1.0 - decay


@dataclass
class LagFilter:
    alpha: np.ndarray  # (5,)
    delay: np.ndarray  # (5,) int
    bias: np.ndarray  # (5,) deg
    train_mse: np.ndarray  # (5,) deg^2

    def predict(self, e: EpisodeData) -> np.ndarray:
        out = np.empty((e.n, 5))
        for j in range(5):
            y0, s = _response(delayed(e.a[:, j], int(self.delay[j])), e.x[0, j], float(self.alpha[j]))
            out[:, j] = y0 + self.bias[j] * s
        return out

    def to_dict(self) -> dict:
        return {"model": "y[t+1] = y[t] + alpha*(a[t-d] + b - y[t]), y[0] = x[0], per arm joint",
                "alpha": [round(float(v), 2) for v in self.alpha], "delay_frames": [int(v) for v in self.delay],
                "bias_deg": [round(float(v), 4) + 0.0 for v in self.bias],
                "train_mse_deg2": [round(float(v), 5) for v in self.train_mse],
                "grid": {"alpha": [ALPHAS[0], ALPHAS[-1], len(ALPHAS)], "delay_frames": list(DELAYS)}}


def fit(train: list[EpisodeData]) -> LagFilter:
    n = len(train)
    alpha, delay, bias, mse = np.zeros(5), np.zeros(5, int), np.zeros(5), np.zeros(5)
    for j in range(5):
        best = (np.inf, 0, 0.0, 0.0)
        for d in DELAYS:
            ads = [delayed(e.a[:, j], d) for e in train]
            for al in ALPHAS:
                num = den = 0.0
                parts = []
                for e, ad in zip(train, ads):
                    y0, s = _response(ad, e.x[0, j], al)
                    r, s1 = e.x[1:, j] - y0[1:], s[1:]
                    w = 1.0 / (e.n - 1)
                    num += w * float(s1 @ r)
                    den += w * float(s1 @ s1)
                    parts.append((r, s1, w))
                b = num / den if den > 0 else 0.0
                cost = sum(w * float(np.sum((r - b * s1) ** 2)) for r, s1, w in parts) / n
                if cost < best[0] - 1e-12:
                    best = (cost, d, al, b)
        mse[j], delay[j], alpha[j], bias[j] = best
    return LagFilter(alpha, delay, bias, mse)
