"""Schema retrieval: only the columns a question needs go into the prompt (keyword match today; embeddings in Phase 12)."""
from __future__ import annotations

from data.schema import COLUMNS


def relevant_columns(metric: str | None, dimension: str | None, filter_columns: list[str]) -> list[str]:
    measure = {"net_sales": "net_sales", "profit": "profit", "orders": "order_id", "aov": "net_sales", "margin": "profit", "return_rate": "order_status", "rating": "customer_rating"}
    cols = {"order_date"}
    if metric:
        cols.add(measure[metric])
    if dimension and dimension != "month":
        cols.add(dimension)
    cols.update(filter_columns)
    return [c["name"] for c in COLUMNS if c["name"] in cols]
