"""Customer intelligence: RFM scoring and segments, new vs returning, lifetime spend, top customers (IDs only)."""
from __future__ import annotations

from datetime import date

import numpy as np
import pandas as pd

from data.filters import Filters
from data.loader import get_dataset

from .common import group, kpis, scoped, with_delta

RFM_SEGMENTS = ["Champions", "Loyal", "Potential loyalists", "New", "Need attention", "At risk", "Hibernating"]


def _segment(r: int, f: int, m: int) -> str:
    if r >= 4 and f >= 4 and m >= 4:
        return "Champions"
    if f >= 4 and r >= 3:
        return "Loyal"
    if r >= 4 and f <= 2:
        return "New"
    if r >= 3 and f >= 2:
        return "Potential loyalists"
    if r <= 2 and f >= 3:
        return "At risk"
    if r == 3:
        return "Need attention"
    return "Hibernating"


def _quintile(values: pd.Series) -> pd.Series:
    """Score 1–5 by position in the sorted values (ties share the lowest position), as in the frontend."""
    s = np.sort(values.to_numpy())
    pos = np.searchsorted(s, values.to_numpy(), side="left")
    return pd.Series(np.minimum(5, (pos / len(s) * 5).astype(int) + 1), index=values.index)


def get_customers(f: Filters) -> dict:
    dims, cur, prev, period = scoped(f)
    end = date.fromisoformat(period.to)
    hist = dims[(dims["order_date"] <= period.to) & (dims["order_status"] != "Cancelled")]
    per = hist.groupby("customer_id", sort=False).agg(
        last=("order_date", "max"), freq=("order_id", "size"), spend=("net_sales", "sum"),
        region=("region", "first"), segment=("customer_segment", "first"),
    )
    per["recency"] = [(end - date.fromisoformat(d)).days for d in per["last"]]
    per["R"] = _quintile(-per["recency"])
    per["F"] = _quintile(per["freq"])
    per["M"] = _quintile(per["spend"])
    per["rfm"] = [_segment(r, fq, m) for r, fq, m in zip(per["R"], per["F"], per["M"])]

    grid = [[0] * 5 for _ in range(5)]
    for r, fq in zip(per["R"], per["F"]):
        grid[r - 1][fq - 1] += 1
    total_spend = float(per["spend"].sum()) or 1.0
    segments = []
    for name in RFM_SEGMENTS:
        m = per[per["rfm"] == name]
        if len(m):
            segments.append({
                "segment": name, "customers": len(m), "revenueShare": float(m["spend"].sum()) / total_spend * 100,
                "avgSpend": float(m["spend"].mean()), "avgOrders": float(m["freq"].mean()), "avgRecency": float(m["recency"].mean()),
            })
    top = per.sort_values("spend", ascending=False, kind="stable").head(10)
    top_rows = [
        {"customer_id": cid, "customer_segment": r["segment"], "region": r["region"], "orders": int(r["freq"]), "spend": float(r["spend"]), "last_order": r["last"], "rfm": r["rfm"]}
        for cid, r in top.iterrows()
    ]
    month = cur["order_date"].str[:7]
    nvr = cur.groupby(month).agg(newCustomers=("is_repeat_customer", lambda s: int((~s).sum())), returning=("is_repeat_customer", "sum"))
    k = kpis(cur)
    p = kpis(prev) if len(prev) else None
    by_seg = group(cur, "customer_segment")
    return {
        "period": period.to_json(),
        "totalCustomers": len(get_dataset().customers),
        "kpis": {
            "customers": with_delta(k, p, "customers"),
            "repeatRate": with_delta(k, p, "repeatRate", "pp"),
            "avgSpend": {"value": total_spend / len(per) if len(per) else 0.0},
            "championsShare": {"value": float((per["rfm"] == "Champions").mean() * 100) if len(per) else 0.0},
        },
        "grid": grid,
        "segments": segments,
        "top": top_rows,
        "newVsReturning": [{"t": t, "newCustomers": int(r.newCustomers), "returning": int(r.returning)} for t, r in nvr.sort_index().iterrows()],
        "bySegment": [{"key": r.key, "netSales": float(r.netSales), "customers": int(r.customers), "aov": float(r.netSales / r.orders) if r.orders else 0.0} for r in by_seg.itertuples()],
        "clvValues": [float(v) for v in per["spend"]],
    }
