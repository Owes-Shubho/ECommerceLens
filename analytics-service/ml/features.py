"""Feature engineering for forecasting: series building and lag / rolling features."""
from __future__ import annotations

import numpy as np
import pandas as pd

from data.filters import ALL
from data.loader import get_dataset


def daily_series(region: str = ALL, channel: str = ALL, category: str = ALL, segment: str = ALL) -> pd.DataFrame:
    """Daily net sales and order counts over the whole history (every day present, zeros filled)."""
    ds = get_dataset()
    o = ds.orders
    m = pd.Series(True, index=o.index)
    for col, val in (("region", region), ("sales_channel", channel), ("product_category", category), ("customer_segment", segment)):
        if val != ALL:
            m &= o[col] == val
    g = o[m].groupby("order_date").agg(net=("net_sales", "sum"), orders=("order_id", "size"))
    days = pd.date_range(ds.min_date, ds.max_date, freq="D").strftime("%Y-%m-%d")
    return g.reindex(days, fill_value=0).rename_axis("t").reset_index()


def weekly_series(daily: pd.DataFrame) -> pd.DataFrame:
    """Weeks starting Monday; the partial first and last weeks are dropped."""
    d = pd.to_datetime(daily["t"])
    week = (d - pd.to_timedelta(d.dt.weekday, unit="D")).dt.strftime("%Y-%m-%d")
    w = daily.assign(t=week).groupby("t", sort=True)["net"].sum().reset_index()
    return w.iloc[1:-1].reset_index(drop=True)


def lag_features(y: np.ndarray, t: int, season: int) -> np.ndarray:
    """[1, lag_1, lag_season, rolling mean over the last season]."""
    roll = y[max(0, t - season):t]
    return np.array([1.0, y[t - 1], y[t - season], roll.mean() if len(roll) else 0.0])
