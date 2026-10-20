"""Anomaly detection: rolling z-score against the previous `window` days, plus a likely driver per anomaly."""
from __future__ import annotations

from datetime import date, timedelta

import numpy as np

from data.filters import ALL
from data.loader import get_dataset

from .features import daily_series


def detect(t: list[str], y: np.ndarray, window: int = 28, threshold: float = 3.0) -> list[dict]:
    out = []
    for i in range(window, len(y)):
        w = y[i - window:i]
        mean = float(w.mean())
        sd = float(w.std()) or 1.0  # population std, as in the frontend
        z = (y[i] - mean) / sd
        if abs(z) >= threshold:
            az = abs(z)
            out.append({
                "t": t[i], "value": float(y[i]), "expected": mean, "z": float(z),
                "deviationPct": float((y[i] - mean) / mean * 100) if mean else 0.0,
                "severity": "critical" if az >= threshold + 1.5 else "serious" if az >= threshold + 0.5 else "warning",
                "direction": "spike" if z > 0 else "drop",
            })
    return out


def driver(day: str, direction: str, category: str, channel: str) -> str:
    """The sales channel whose share of the day moved most against the 28 days before."""
    o = get_dataset().orders
    m = np.ones(len(o), dtype=bool)
    if category != ALL:
        m &= (o["product_category"] == category).to_numpy()
    if channel != ALL:
        m &= (o["sales_channel"] == channel).to_numpy()
    o = o[m]
    before = (date.fromisoformat(day) - timedelta(days=28)).isoformat()
    today = o[o["order_date"] == day]["sales_channel"].value_counts(normalize=True)
    base = o[(o["order_date"] >= before) & (o["order_date"] < day)]["sales_channel"].value_counts(normalize=True)
    diff = today.reindex(base.index.union(today.index), fill_value=0) - base.reindex(base.index.union(today.index), fill_value=0)
    signed = diff if direction == "spike" else -diff
    if not len(signed) or signed.max() <= 0:
        return "Spread across channels"
    k = signed.idxmax()
    return f"{k} channel {'+' if direction == 'spike' else '−'}{abs(diff[k]) * 100:.0f} pp share"


def find_anomalies(metric: str, threshold: float, category: str, channel: str) -> dict:
    s = daily_series(category=category, channel=channel)
    y = (s["orders"] if metric == "orders" else s["net"]).to_numpy(dtype=float)
    t = s["t"].tolist()
    found = detect(t, y, 28, threshold)
    for a in found:
        a["driver"] = driver(a["t"], a["direction"], category, channel)
    return {"series": {"t": t, "y": [float(v) for v in y]}, "anomalies": found}
