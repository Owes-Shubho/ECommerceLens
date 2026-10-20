"""Forecast orchestration: chronological 70/15/15 split, one-step test predictions, metrics, future with a band."""
from __future__ import annotations

from datetime import date, timedelta
from typing import Literal

import numpy as np

from .baseline import LinearBaseline
from .evaluation import metrics
from .features import daily_series, weekly_series
from .gru import GRUForecaster
from .lstm import LSTMForecaster

ModelId = Literal["baseline", "lstm", "gru"]
MODELS = [
    {"id": "baseline", "label": "Baseline (linear regression)", "note": "Linear regression on lag and rolling-mean features."},
    {"id": "lstm", "label": "LSTM", "note": "Demo stand-in (Holt-Winters). The trained LSTM replaces it in Phase 20."},
    {"id": "gru", "label": "GRU", "note": "Demo stand-in (seasonal blend). The trained GRU replaces it in Phase 20."},
]


def run_forecast(granularity: Literal["Daily", "Weekly"], model: ModelId, horizon: int, category: str, channel: str) -> dict:
    daily = daily_series(category=category, channel=channel)
    series = daily.rename(columns={"net": "y"}) if granularity == "Daily" else weekly_series(daily).rename(columns={"net": "y"})
    t = series["t"].tolist()
    y = series["y"].to_numpy(dtype=float)
    S, step = (7, 1) if granularity == "Daily" else (52, 7)
    n = len(y)
    val_start, test_start = int(n * 0.7), int(n * 0.85)

    fitted = {
        "baseline": LinearBaseline(S).fit(y, val_start),
        "lstm": LSTMForecaster(S).fit(y),
        "gru": GRUForecaster(S).fit(y),
    }
    one = {k: m.one_step(y) for k, m in fitted.items()}
    all_metrics = {k: metrics(y[test_start:], p[test_start:]) for k, p in one.items()}
    chosen = one[model]
    resid = y[test_start:] - chosen[test_start:]
    sd = float(np.sqrt((resid ** 2).mean())) if len(resid) else 0.0
    yhat = fitted[model].future(y, horizon)
    last = date.fromisoformat(t[-1])
    ft = [(last + timedelta(days=(i + 1) * step)).isoformat() for i in range(horizon)]
    widen = np.sqrt(1 + np.arange(horizon) * 0.15)
    test_pred = [None if i < test_start or np.isnan(v) else float(v) for i, v in enumerate(chosen)]
    return {
        "t": t,
        "actual": [float(v) for v in y],
        "testPred": test_pred,
        "splitIndex": {"valStart": val_start, "testStart": test_start},
        "future": {
            "t": ft,
            "yhat": [float(v) for v in yhat],
            "lo": [float(max(0.0, v - 1.96 * sd * w)) for v, w in zip(yhat, widen)],
            "hi": [float(v + 1.96 * sd * w) for v, w in zip(yhat, widen)],
        },
        "metrics": all_metrics[model],
        "allMetrics": all_metrics,
        "models": MODELS,
    }
