"""LSTM slot. Until the PyTorch LSTM from Phase 20 is trained, this is a Holt-Winters stand-in with the same interface.

Phase 20 replaces `HoltWinters` here with a model that loads the saved weights, scaler and feature config.
"""
from __future__ import annotations

import numpy as np


class HoltWinters:
    """Additive Holt-Winters exponential smoothing."""

    def __init__(self, season: int, alpha: float = 0.25, beta: float = 0.01, gamma: float = 0.25):
        self.S, self.alpha, self.beta, self.gamma = season, alpha, beta, gamma

    def fit(self, y: np.ndarray, train_end: int | None = None) -> "HoltWinters":
        S = self.S
        level = float(np.mean(y[:S]))
        trend = 0.0
        season = list(y[:S] - level)
        one = np.full(len(y), np.nan)
        for t in range(S, len(y)):
            s = season[t % S]
            one[t] = max(0.0, level + trend + s)
            prev_level = level
            level = self.alpha * (y[t] - s) + (1 - self.alpha) * (level + trend)
            trend = self.beta * (level - prev_level) + (1 - self.beta) * trend
            season[t % S] = self.gamma * (y[t] - level) + (1 - self.gamma) * s
        self._one, self._level, self._trend, self._season, self._n = one, level, trend, season, len(y)
        return self

    def one_step(self, y: np.ndarray) -> np.ndarray:
        return self._one

    def future(self, y: np.ndarray, h: int) -> np.ndarray:
        return np.array([max(0.0, self._level + self._trend * (i + 1) + self._season[(self._n + i) % self.S]) for i in range(h)])


class LSTMForecaster(HoltWinters):
    """Stand-in for the trained LSTM (see module docstring)."""
