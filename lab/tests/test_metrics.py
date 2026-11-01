import numpy as np
import pytest

from meatspace_lab import metrics


def _smooth(rng, T=400):
    t = np.arange(T) / 30.0
    return sum(10 * np.sin(2 * np.pi * rng.uniform(0.1, 1.0) * t + rng.uniform(0, 6.3)) for _ in range(4))


@pytest.mark.parametrize("k", range(0, 7))
def test_lag_recovers_integer_shift(k):
    rng = np.random.default_rng(k)
    c = _smooth(rng)
    s = np.concatenate([np.full(k, c[0]), c[: len(c) - k]])  # s[t] = c[t-k]
    assert metrics.lag_frames(c, s) == pytest.approx(k, abs=0.02)


@pytest.mark.parametrize("k", [1, 3, 5])
def test_lag_ignores_bias_and_noise(k):
    rng = np.random.default_rng(10 + k)
    c = _smooth(rng)
    s = np.concatenate([np.full(k, c[0]), c[: len(c) - k]]) + 2.5 + rng.normal(0, 0.1, len(c))
    assert round(metrics.lag_frames(c, s)) == k


@pytest.mark.parametrize("lag", [0.5, 2.3, 4.7])
def test_lag_subframe(lag):
    rng = np.random.default_rng(3)
    T = 600
    t = np.arange(T)
    f = [(rng.uniform(0.005, 0.03), rng.uniform(0, 6.3)) for _ in range(4)]
    sig = lambda u: sum(10 * np.sin(2 * np.pi * a * u + b) for a, b in f)  # noqa: E731
    c, s = sig(t), sig(t - lag)
    assert metrics.lag_frames(c, s) == pytest.approx(lag, abs=0.1)


def test_lag_window_is_fixed_not_shrinking():
    # a signal whose tail differs would bias a shrinking-window estimator; the fixed window must not care
    rng = np.random.default_rng(0)
    c = _smooth(rng)
    s = np.concatenate([[c[0]], c[:-1]])
    s[-5:] += 50.0  # garbage in the last frames only reachable by large shifts
    assert metrics.lag_frames(c, s, max_lag=10) == pytest.approx(1.0, abs=0.02)


def test_lag_nan_without_excitation():
    c = np.zeros(300) + 1.0
    assert np.isnan(metrics.lag_frames(c, c))


def test_rmse_known_values():
    a = np.array([[0.0, 1.0], [0.0, 1.0], [0.0, 1.0]])
    b = np.array([[1.0, 1.0], [-1.0, 3.0], [1.0, 1.0]])
    np.testing.assert_allclose(metrics.rmse(a, b), [1.0, np.sqrt(4 / 3)])


def test_bootstrap_ci_brackets_and_collapses():
    v = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
    m, lo, hi = metrics.bootstrap_mean_ci(v, seed=1)
    assert m == 3.0 and lo < 3.0 < hi and 1.0 <= lo and hi <= 5.0
    m, lo, hi = metrics.bootstrap_mean_ci(np.full(8, 2.0), seed=1)
    assert m == lo == hi == 2.0


def test_bootstrap_deterministic_with_seed():
    v = np.random.default_rng(0).normal(size=20)
    assert metrics.bootstrap_mean_ci(v, seed=5) == metrics.bootstrap_mean_ci(v, seed=5)


def test_bootstrap_coverage_close_to_nominal():
    rng = np.random.default_rng(42)
    hits = 0
    reps = 300
    for _ in range(reps):
        v = rng.normal(1.0, 2.0, size=40)
        _, lo, hi = metrics.bootstrap_mean_ci(v, n_boot=2000, seed=int(rng.integers(1 << 30)))
        hits += lo <= 1.0 <= hi
    assert 0.88 <= hits / reps <= 0.99


def test_bootstrap_width_matches_normal_theory():
    rng = np.random.default_rng(7)
    v = rng.normal(0, 1.0, size=400)
    _, lo, hi = metrics.bootstrap_mean_ci(v, seed=0)
    assert (hi - lo) == pytest.approx(2 * 1.96 * v.std(ddof=1) / np.sqrt(len(v)), rel=0.15)


def test_paired_improvement_sign_and_ratio():
    stock = np.array([2.0, 3.0, 4.0, 5.0])
    calib = stock / 2
    imp = metrics.paired_improvement(stock, calib, seed=0)
    assert imp["rel_reduction"]["mean"] == pytest.approx(0.5)
    assert imp["rel_reduction"]["ci95"] == [pytest.approx(0.5), pytest.approx(0.5)]
    assert imp["abs_reduction_deg"]["mean"] == pytest.approx(1.75)
    assert imp["episodes_improved"] == 4
