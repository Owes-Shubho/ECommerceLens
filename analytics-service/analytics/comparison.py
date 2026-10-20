"""Comparative analysis (Phase 22): compare two values of one dimension on the same metrics."""
from __future__ import annotations

from data.filters import Filters

from .common import kpis, scoped

DIMENSIONS = {"channel": "sales_channel", "region": "region", "category": "product_category", "segment": "customer_segment", "country": "customer_country"}


def compare(f: Filters, dimension: str, a: str, b: str) -> dict:
    col = DIMENSIONS[dimension]
    _, cur, _, period = scoped(f)
    ka, kb = kpis(cur[cur[col] == a]), kpis(cur[cur[col] == b])
    metrics = ["netSales", "profit", "orders", "aov", "marginPct", "returnRate", "avgRating", "onTimeRate"]
    return {
        "period": period.to_json(), "dimension": dimension, "a": a, "b": b,
        "rows": [{"metric": m, "a": ka[m], "b": kb[m], "diff": ka[m] - kb[m]} for m in metrics],
    }
