"""GRU slot. Stand-in until the trained PyTorch GRU (Phase 20): Holt-Winters blended with seasonal naive."""
from __future__ import annotations

import numpy as np

from .lstm import HoltWinters


class GRUForecaster:
    def __init__(self, season: int):
        self.S = season
        self.hw = HoltWinters(season, alpha=0.35, beta=0.02, gamma=0.15)

    def fit(self, y: np.ndarray, train_end: int | None = None) -> "GRUForecaster":
        self.hw.fit(y)
        return self

    def one_step(self, y: np.ndarray) -> np.ndarray:
        hw = self.hw.one_step(y)
        S = self.S
        out = hw.copy()
        for i in range(2 * S, len(y)):
            out[i] = 0.6 * hw[i] + 0.4 * (y[i - S] * 0.5 + y[i - 2 * S] * 0.5)
        return out

    def future(self, y: np.ndarray, h: int) -> np.ndarray:
        return self.hw.future(y, h)
