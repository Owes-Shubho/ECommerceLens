"""Forecast metrics: MAE, RMSE, MAPE (zero actuals skipped) and R²."""
from __future__ import annotations

import numpy as np


def metrics(actual: np.ndarray, pred: np.ndarray) -> dict:
    actual = np.asarray(actual, dtype=float)
    pred = np.asarray(pred, dtype=float)
    err = actual - pred
    nz = actual != 0
    ss = float(((actual - actual.mean()) ** 2).sum())
    return {
        "mae": float(np.abs(err).mean()) if len(err) else 0.0,
        "rmse": float(np.sqrt((err ** 2).mean())) if len(err) else 0.0,
        "mape": float(np.abs(err[nz] / actual[nz]).mean() * 100) if nz.any() else 0.0,
        "r2": float(1 - (err ** 2).sum() / ss) if ss else 0.0,
    }
