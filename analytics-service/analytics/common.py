"""Shared aggregations. Output keys use camelCase to match the frontend's TypeScript types."""
from __future__ import annotations

from typing import Callable

import pandas as pd

from data.filters import Filters, in_range, match_dims, period_for, Period
from data.loader import get_dataset


def kpis(df: pd.DataFrame) -> dict:
    n = len(df)
    status = df["order_status"]
    shipped = df[status != "Cancelled"]
    realised = int(status.isin(["Completed", "Pending"]).sum())
    rated = df["customer_rating"].dropna()
    net = float(df["net_sales"].sum())
    return {
        "orders": n,
        "netSales": net,
        "grossSales": float(df["gross_sales"].sum()),
        "discount": float(df["discount_amount"].sum()),
        "profit": float(df["profit"].sum()),
        "aov": net / realised if realised else 0.0,
        "marginPct": float(df["profit"].sum()) / net * 100 if net else 0.0,
        "returnRate": float((status == "Returned").sum()) / (n or 1) * 100,
        "cancellationRate": float((status == "Cancelled").sum()) / (n or 1) * 100,
        "avgRating": float(rated.mean()) if len(rated) else 0.0,
        "customers": int(df["customer_id"].nunique()),
        "onTimeRate": float((shipped["delivery_status"] != "Delayed").sum()) / len(shipped) * 100 if len(shipped) else 0.0,
        "avgDeliveryDays": float(shipped["delivery_days"].mean()) if len(shipped) else 0.0,
        "repeatRate": float(df["is_repeat_customer"].sum()) / (n or 1) * 100,
    }


def pct_change(cur: float, prev: float | None) -> float | None:
    return None if prev is None or prev == 0 else (cur - prev) / abs(prev) * 100


def with_delta(cur: dict, prev: dict | None, key: str, mode: str = "pct") -> dict:
    out = {"value": cur[key]}
    if prev is not None:
        out["delta"] = pct_change(cur[key], prev[key]) if mode == "pct" else cur[key] - prev[key]
    return out


def group(df: pd.DataFrame, key: str | pd.Series) -> pd.DataFrame:
    """Per-group totals, sorted by net sales (largest first)."""
    g = df.assign(_ret=(df["order_status"] == "Returned").astype(int), _rated=df["customer_rating"].notna().astype(int))
    by = g.groupby(key, sort=False)
    out = pd.DataFrame({
        "orders": by.size(),
        "netSales": by["net_sales"].sum(),
        "profit": by["profit"].sum(),
        "quantity": by["quantity"].sum(),
        "returned": by["_ret"].sum(),
        "ratingSum": by["customer_rating"].sum(),
        "rated": by["_rated"].sum(),
        "discount": by["discount_amount"].sum(),
        "gross": by["gross_sales"].sum(),
        "customers": by["customer_id"].nunique(),
    })
    out.index.name = "key"
    return out.reset_index().sort_values("netSales", ascending=False, kind="stable")


def bucket(df: pd.DataFrame, granularity: str) -> pd.Series:
    d = pd.to_datetime(df["order_date"])
    if granularity == "Day":
        return df["order_date"]
    if granularity == "Week":
        return (d - pd.to_timedelta(d.dt.weekday, unit="D")).dt.strftime("%Y-%m-%d")
    return d.dt.strftime("%Y-%m")


def time_series(df: pd.DataFrame, granularity: str) -> list[dict]:
    if df.empty:
        return []
    g = df.groupby(bucket(df, granularity)).agg(netSales=("net_sales", "sum"), profit=("profit", "sum"), orders=("order_id", "size"), gross=("gross_sales", "sum"))
    return [{"t": t, "netSales": float(r.netSales), "profit": float(r.profit), "orders": int(r.orders), "gross": float(r.gross)} for t, r in g.sort_index().iterrows()]


def auto_granularity(f: Filters) -> str:
    return "Day" if f.range == "30D" else "Week" if f.range in ("90D", "YTD") else "Month"


def scoped(f: Filters) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, Period]:
    """(orders matching the dimension filters, current period, previous period, period)."""
    ds = get_dataset()
    period = period_for(f.range, ds.min_date, ds.max_date)
    dims = match_dims(ds.orders, f)
    cur = in_range(dims, period.from_, period.to)
    prev = in_range(dims, *period.prev) if period.prev else dims.iloc[0:0]
    return dims, cur, prev, period


def records(df: pd.DataFrame, cols: dict[str, str | Callable[[pd.Series], pd.Series]]) -> list[dict]:
    """Rename/compute columns and return JSON-ready records."""
    out = pd.DataFrame({name: (df[src] if isinstance(src, str) else src(df)) for name, src in cols.items()})
    return out.to_dict(orient="records")
