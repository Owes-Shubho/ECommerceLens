"""Request schemas (Pydantic). Query-string parameters are validated here before any work is done."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from data.filters import ALL, Filters


class SalesQuery(Filters):
    granularity: Literal["Day", "Week", "Month"] = "Month"


class ProductsQuery(Filters):
    focusCategory: str | None = Field(default=None, max_length=60)


class CompareQuery(Filters):
    dimension: Literal["channel", "region", "category", "segment", "country"]
    a: str = Field(max_length=60)
    b: str = Field(max_length=60)


class ForecastQuery(BaseModel):
    granularity: Literal["Daily", "Weekly"] = "Weekly"
    model: Literal["baseline", "lstm", "gru"] = "lstm"
    horizon: int = Field(default=8, ge=1, le=60)
    category: str = Field(default=ALL, max_length=60)
    channel: str = Field(default=ALL, max_length=60)


class AnomalyQuery(BaseModel):
    metric: Literal["orders", "net"] = "orders"
    threshold: float = Field(default=3.0, ge=1.5, le=6.0)
    category: str = Field(default=ALL, max_length=60)
    channel: str = Field(default=ALL, max_length=60)


class AskBody(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    conversationId: str | None = Field(default=None, max_length=80)
