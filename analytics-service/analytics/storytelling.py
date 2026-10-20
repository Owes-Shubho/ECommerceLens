"""Data storytelling: short, computed observations. Every number comes from the aggregates passed in."""
from __future__ import annotations

import pandas as pd

from .common import pct_change


def money(v: float) -> str:
    a, s = abs(v), "-" if v < 0 else ""
    if a >= 1e9:
        return f"{s}${a / 1e9:,.2f}B"
    if a >= 1e6:
        return f"{s}${a / 1e6:,.2f}M"
    if a >= 1e4:
        return f"{s}${a / 1e3:,.1f}K"
    return f"{s}${a:,.0f}"


def overview_insights(k: dict, prev: dict | None, by_category: pd.DataFrame, by_channel: pd.DataFrame, prev_label: str) -> list[str]:
    out: list[str] = []
    total = k["netSales"] or 1
    if len(by_category):
        top = by_category.iloc[0]
        out.append(f"{top.key} is the largest category with {money(top.netSales)} in net sales ({top.netSales / total * 100:.1f}% of the total).")
        big = by_category[by_category["netSales"] > k["netSales"] * 0.02]
        if len(big):
            best = big.assign(m=big["profit"] / big["netSales"]).sort_values("m", ascending=False, kind="stable").iloc[0]
            out.append(f"{best.key} has the highest margin at {best.m * 100:.1f}%.")
    if len(by_channel):
        ch = by_channel.iloc[0]
        out.append(f"{ch.key} brings in {ch.netSales / total * 100:.1f}% of revenue, the most of any channel.")
    ns = pct_change(k["netSales"], prev["netSales"] if prev else None)
    if ns is not None:
        out.append(f"Net sales are {'up' if ns >= 0 else 'down'} {abs(ns):.1f}% {prev_label.replace('vs ', 'on the ')}.")
    return out
