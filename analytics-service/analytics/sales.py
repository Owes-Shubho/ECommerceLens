"""Sales: KPIs, gross vs net trend, channel / payment / marketing / country splits, discount bands."""
from __future__ import annotations

import numpy as np
import pandas as pd

from data.filters import Filters

from .common import group, kpis, scoped, time_series, with_delta

BANDS = ["0%", "1–10%", "10–20%", "20–30%"]


def _dim(df: pd.DataFrame, col: str) -> list[dict]:
    g = group(df, col)
    return [
        {
            "key": r.key, "orders": int(r.orders), "netSales": float(r.netSales), "profit": float(r.profit),
            "aov": float(r.netSales / r.orders) if r.orders else 0.0,
            "discountPct": float(r.discount / r.gross * 100) if r.gross else 0.0,
            "marginPct": float(r.profit / r.netSales * 100) if r.netSales else 0.0,
        }
        for r in g.itertuples()
    ]


def get_sales(f: Filters, granularity: str) -> dict:
    _, cur, prev, period = scoped(f)
    k = kpis(cur)
    p = kpis(prev) if len(prev) else None
    d = np.where(cur["gross_sales"] > 0, cur["discount_amount"] / cur["gross_sales"].where(cur["gross_sales"] > 0, 1) * 100, 0)
    band = np.select([d == 0, d < 10, d < 20], BANDS[:3], default=BANDS[3])
    bands = []
    for b in BANDS:
        sub = cur[band == b]
        net = float(sub["net_sales"].sum())
        bands.append({"key": b, "orders": len(sub), "marginPct": float(sub["profit"].sum()) / net * 100 if net else 0.0, "aov": net / len(sub) if len(sub) else 0.0})
    return {
        "period": period.to_json(),
        "kpis": {
            "netSales": with_delta(k, p, "netSales"),
            "grossSales": with_delta(k, p, "grossSales"),
            "discount": with_delta(k, p, "discount"),
            "marginPct": with_delta(k, p, "marginPct", "pp"),
        },
        "trend": time_series(cur, granularity),
        "byChannel": _dim(cur, "sales_channel"),
        "byPayment": _dim(cur, "payment_method"),
        "byMarketing": _dim(cur, "marketing_channel"),
        "byCountry": _dim(cur, "customer_country"),
        "discountBands": bands,
    }
