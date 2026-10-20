"""Executive overview: KPIs with deltas, trend, category / channel / region splits, top products, insights."""
from __future__ import annotations

from data.filters import Filters
from data.loader import get_dataset

from .common import auto_granularity, group, kpis, scoped, time_series, with_delta
from .storytelling import overview_insights


def get_overview(f: Filters) -> dict:
    _, cur, prev, period = scoped(f)
    k = kpis(cur)
    p = kpis(prev) if len(prev) else None
    g = auto_granularity(f)
    by_cat = group(cur, "product_category")
    by_ch = group(cur, "sales_channel")
    by_reg = group(cur, "region")
    products = get_dataset().products.set_index("product_id")
    top = group(cur, "product_id").head(8)
    top_products = [
        {
            "product_id": r.key,
            "product_name": products.at[r.key, "product_name"],
            "product_category": products.at[r.key, "product_category"],
            "orders": int(r.orders),
            "net_sales": float(r.netSales),
            "margin": float(r.profit / r.netSales * 100) if r.netSales else 0.0,
        }
        for r in top.itertuples()
    ]
    return {
        "period": period.to_json(),
        "granularity": g,
        "kpis": {
            "netSales": with_delta(k, p, "netSales"),
            "profit": with_delta(k, p, "profit"),
            "orders": with_delta(k, p, "orders"),
            "aov": with_delta(k, p, "aov"),
            "returnRate": with_delta(k, p, "returnRate", "pp"),
            "avgRating": with_delta(k, p, "avgRating"),
        },
        "trend": time_series(cur, g),
        "byCategory": [{"key": r.key, "netSales": float(r.netSales), "profit": float(r.profit), "orders": int(r.orders)} for r in by_cat.itertuples()],
        "byChannel": [{"key": r.key, "netSales": float(r.netSales), "orders": int(r.orders)} for r in by_ch.itertuples()],
        "byRegion": [{"key": r.key, "netSales": float(r.netSales), "orders": int(r.orders)} for r in by_reg.itertuples()],
        "topProducts": top_products,
        "insights": overview_insights(k, p, by_cat, by_ch, period.prev_label),
    }
