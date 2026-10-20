"""Loads the dataset once per process. Today: the demo generator. Phase 2: Parquet files built from data/raw."""
from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

import pandas as pd

from config import Config


@dataclass(frozen=True)
class Dataset:
    orders: pd.DataFrame
    customers: pd.DataFrame
    products: pd.DataFrame
    min_date: str
    max_date: str
    source: str


@lru_cache(maxsize=1)
def get_dataset() -> Dataset:
    if Config.DATA_SOURCE != "demo":
        raise RuntimeError(f"DATA_SOURCE={Config.DATA_SOURCE!r} is not available yet; use 'demo' until the data layer (Phase 2) is built.")
    from .demo import generate

    d = generate()
    orders = d["orders"]
    return Dataset(
        orders=orders,
        customers=d["customers"],
        products=d["products"],
        min_date=str(orders["order_date"].min()),
        max_date=str(orders["order_date"].max()),
        source="demo",
    )
