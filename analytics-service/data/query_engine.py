"""Executes structured query plans on the orders table. Only whitelisted metrics, columns and operators exist,
so a plan can never modify data or run arbitrary code (Development rules 5 and 6)."""
from __future__ import annotations

from typing import Literal

import pandas as pd
from pydantic import BaseModel, Field

from .loader import get_dataset

Metric = Literal["net_sales", "profit", "orders", "aov", "margin", "return_rate", "rating"]
Dimension = Literal[
    "product_category", "sales_channel", "region", "customer_segment", "payment_method", "customer_country",
    "marketing_channel", "shipping_method", "product_id", "month",
]
FILTER_COLUMNS = {"sales_channel", "region", "customer_segment", "customer_country", "product_category", "order_date"}


class PlanFilter(BaseModel):
    column: str
    op: Literal["=", "between"]
    value: str | list[str]


class QueryPlan(BaseModel):
    intent: Literal["group", "ranking", "trend", "total"]
    metric: Metric
    aggregation: Literal["sum", "avg", "count", "rate"]
    group_by: list[Dimension] = Field(default_factory=list, max_length=1)
    filters: list[PlanFilter] = Field(default_factory=list, max_length=6)
    order: Literal["desc", "asc"] | None = None
    limit: int | None = Field(default=None, ge=1, le=500)


AGG_FOR: dict[str, str] = {"orders": "count", "aov": "avg", "rating": "avg", "margin": "rate", "return_rate": "rate", "net_sales": "sum", "profit": "sum"}


def apply_filters(df: pd.DataFrame, filters: list[PlanFilter]) -> pd.DataFrame:
    for f in filters:
        if f.op == "=":
            df = df[df[f.column].astype(str) == f.value]
        else:
            lo, hi = f.value
            df = df[(df[f.column] >= lo) & (df[f.column] <= hi)]
    return df


def metric_frame(df: pd.DataFrame, key: pd.Series | str | None) -> pd.DataFrame:
    """Per-group totals plus every metric, in first-seen group order."""
    g = df.assign(_ret=(df["order_status"] == "Returned").astype(int), _rated=df["customer_rating"].notna().astype(int))
    by = g.groupby(key if key is not None else pd.Series("all", index=g.index), sort=False)
    out = pd.DataFrame({
        "orders": by.size(), "net_sales": by["net_sales"].sum(), "profit": by["profit"].sum(),
        "returned": by["_ret"].sum(), "rating_sum": by["customer_rating"].sum(), "rated": by["_rated"].sum(),
    })
    out["aov"] = out["net_sales"] / out["orders"].where(out["orders"] > 0)
    out["margin"] = out["profit"] / out["net_sales"].where(out["net_sales"] != 0) * 100
    out["return_rate"] = out["returned"] / out["orders"] * 100
    out["rating"] = out["rating_sum"] / out["rated"].where(out["rated"] > 0)
    out = out.fillna(0.0)
    out.index.name = "key"
    return out.reset_index()


def execute(plan: QueryPlan) -> tuple[pd.DataFrame, int]:
    """Returns (result frame with a `value` column, number of source rows)."""
    df = apply_filters(get_dataset().orders, plan.filters)
    if df.empty:
        return pd.DataFrame(columns=["key", "value", "orders"]), 0
    dim = plan.group_by[0] if plan.group_by else None
    key = df["order_date"].str[:7] if dim == "month" else (df[dim] if dim else None)
    res = metric_frame(df, key)
    res["value"] = res[plan.metric]
    if dim == "month":
        res = res.sort_values("key")
    elif dim:
        if plan.metric in ("margin", "return_rate", "rating", "aov"):
            res = res[res["orders"] >= 5]  # rates on tiny groups are noise
        res = res.sort_values("value", ascending=False, kind="stable")
        if plan.order == "asc":
            res = res.iloc[::-1]
        if plan.limit:
            res = res.head(plan.limit)
    return res.reset_index(drop=True), len(df)
