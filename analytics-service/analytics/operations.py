"""Operations: delivery performance, shipping methods, return reasons, cancellations, warehouses."""
from __future__ import annotations

from data.filters import Filters

from .common import kpis, scoped, with_delta

STATUSES = ["Early", "On Time", "Delayed"]


def get_operations(f: Filters) -> dict:
    _, cur, prev, period = scoped(f)
    k = kpis(cur)
    p = kpis(prev) if len(prev) else None
    shipped = cur[cur["order_status"] != "Cancelled"]
    by_ship = []
    for m in ["Same Day", "Express", "Standard", "Economy"]:
        os_ = shipped[shipped["shipping_method"] == m]
        n = len(os_) or 1
        row = {"key": m, "orders": len(os_), "avgDays": float(os_["delivery_days"].sum()) / n}
        row.update({s: float((os_["delivery_status"] == s).sum()) / n * 100 for s in STATUSES})
        by_ship.append(row)
    hist = [{"days": d, "orders": int((shipped["delivery_days"] == d).sum())} for d in range(15)]
    ret = cur[cur["order_status"] == "Returned"]["return_reason"].value_counts(sort=False)
    reasons = [{"key": key, "orders": int(n)} for key, n in sorted(ret.items(), key=lambda kv: -kv[1])]
    warehouses = []
    for wh, g in cur.groupby("warehouse", sort=False):
        s = shipped[shipped["warehouse"] == wh]
        warehouses.append({
            "warehouse": wh, "orders": len(g),
            "avg_days": float(s["delivery_days"].mean()) if len(s) else 0.0,
            "on_time": float((s["delivery_status"] != "Delayed").mean() * 100) if len(s) else 0.0,
            "return_rate": float((g["order_status"] == "Returned").mean() * 100),
        })
    month = cur["order_date"].str[:7]
    ct = cur.assign(_m=month).groupby("_m").agg(
        cancelled=("order_status", lambda s: float((s == "Cancelled").mean() * 100)),
        returned=("order_status", lambda s: float((s == "Returned").mean() * 100)),
    )
    return {
        "period": period.to_json(),
        "kpis": {
            "onTimeRate": with_delta(k, p, "onTimeRate", "pp"),
            "avgDeliveryDays": with_delta(k, p, "avgDeliveryDays"),
            "cancellationRate": with_delta(k, p, "cancellationRate", "pp"),
            "returnRate": with_delta(k, p, "returnRate", "pp"),
        },
        "byShipping": by_ship,
        "hist": hist,
        "reasons": reasons,
        "warehouses": warehouses,
        "cancelTrend": [{"t": t, "cancelled": r.cancelled, "returned": r.returned} for t, r in ct.sort_index().iterrows()],
    }
