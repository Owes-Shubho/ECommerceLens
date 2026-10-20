"""Global filters (date range + dimensions), identical in meaning to frontend/src/data/filters.ts."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Literal

import pandas as pd
from pydantic import BaseModel, Field

RangeKey = Literal["30D", "90D", "YTD", "1Y", "All"]
ALL = "All"


class Filters(BaseModel):
    range: RangeKey = "1Y"
    region: str = Field(default=ALL, max_length=60)
    channel: str = Field(default=ALL, max_length=60)
    category: str = Field(default=ALL, max_length=60)
    segment: str = Field(default=ALL, max_length=60)


@dataclass
class Period:
    from_: str
    to: str
    prev: tuple[str, str] | None
    label: str
    prev_label: str

    def to_json(self) -> dict:
        return {
            "from": self.from_, "to": self.to,
            "prev": {"from": self.prev[0], "to": self.prev[1]} if self.prev else None,
            "label": self.label, "prevLabel": self.prev_label,
        }


def _add(s: str, n: int) -> str:
    return (date.fromisoformat(s) + timedelta(days=n)).isoformat()


def period_for(rng: RangeKey, min_date: str, max_date: str) -> Period:
    if rng == "All":
        return Period(min_date, max_date, None, "2021–2025", "")
    if rng == "YTD":
        year = max_date[:4]
        prev_year = str(int(year) - 1)
        return Period(f"{year}-01-01", max_date, (f"{prev_year}-01-01", f"{prev_year}{max_date[4:]}"), f"{year} to date", f"vs {prev_year} same period")
    n = {"30D": 30, "90D": 90, "1Y": 365}[rng]
    start = _add(max_date, -(n - 1))
    prev_to = _add(start, -1)
    label = "Last 12 months" if rng == "1Y" else f"Last {n} days"
    prev_label = "vs prior 12 months" if rng == "1Y" else f"vs prior {n} days"
    return Period(start, max_date, (_add(prev_to, -(n - 1)), prev_to), label, prev_label)


def match_dims(df: pd.DataFrame, f: Filters) -> pd.DataFrame:
    m = pd.Series(True, index=df.index)
    if f.region != ALL:
        m &= df["region"] == f.region
    if f.channel != ALL:
        m &= df["sales_channel"] == f.channel
    if f.category != ALL:
        m &= df["product_category"] == f.category
    if f.segment != ALL:
        m &= df["customer_segment"] == f.segment
    return df[m]


def in_range(df: pd.DataFrame, start: str, end: str) -> pd.DataFrame:
    return df[(df["order_date"] >= start) & (df["order_date"] <= end)]
