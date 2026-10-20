"""Baseline forecaster: ordinary least squares on lag and rolling-mean features (a real model)."""
from __future__ import annotations

import numpy as np

from .features import lag_features


class LinearBaseline:
    def __init__(self, season: int):
        self.season = season
        self.w: np.ndarray | None = None

    def fit(self, y: np.ndarray, train_end: int) -> "LinearBaseline":
        X = np.array([lag_features(y, t, self.season) for t in range(self.season, train_end)])
        target = y[self.season:train_end]
        A = X.T @ X + np.eye(X.shape[1]) * 1e-6  # tiny ridge for stability
        self.w = np.linalg.solve(A, X.T @ target)
        return self

    def predict_at(self, hist: np.ndarray, t: int) -> float:
        return max(0.0, float(lag_features(hist, t, self.season) @ self.w))

    def one_step(self, y: np.ndarray) -> np.ndarray:
        return np.array([self.predict_at(y, t) if t >= self.season else np.nan for t in range(len(y))])

    def future(self, y: np.ndarray, h: int) -> np.ndarray:
        hist = list(y)
        out = []
        for _ in range(h):
            v = self.predict_at(np.array(hist), len(hist))
            hist.append(v)
            out.append(v)
        return np.array(out)
