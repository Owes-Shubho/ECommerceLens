"""How metric values are written in answers (same rules as the frontend)."""
from __future__ import annotations

from analytics.storytelling import money

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
METRIC_LABEL = {"net_sales": "net sales", "profit": "profit", "orders": "orders", "aov": "average order value", "margin": "profit margin", "return_rate": "return rate", "rating": "average rating"}
DIM_LABEL = {"product_category": "category", "sales_channel": "channel", "region": "region", "customer_segment": "segment", "payment_method": "payment method", "customer_country": "country", "marketing_channel": "marketing channel", "shipping_method": "shipping method", "product_id": "product", "month": "month"}
MONEY_METRICS = {"net_sales", "profit", "aov"}


def fmt_metric(metric: str, v: float) -> str:
    if metric in ("net_sales", "profit"):
        return money(v)
    if metric == "aov":
        return f"${v:,.2f}"
    if metric in ("margin", "return_rate"):
        return f"{v:.1f}%"
    if metric == "rating":
        return f"{v:.2f}"
    return f"{round(v):,}"


def fmt_month(key: str) -> str:
    return f"{MONTHS[int(key[5:7]) - 1]} {key[:4]}"
