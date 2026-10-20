"""Guardrail 2 — Schema Guard: maps words to real columns; unknown synonyms are repaired once and reported."""
from __future__ import annotations

import re
from dataclasses import dataclass

from data.catalog import CATEGORIES, CHANNELS, COUNTRIES, REGIONS, SEGMENTS

# (pattern, dimension, is_repair). Order matters: more specific words first.
DIM_WORDS: list[tuple[re.Pattern, str, bool]] = [
    (re.compile(r"marketing|campaign|traffic source", re.I), "marketing_channel", False),
    (re.compile(r"categor", re.I), "product_category", False),
    (re.compile(r"channel|platform", re.I), "sales_channel", False),
    (re.compile(r"region", re.I), "region", False),
    (re.compile(r"segment", re.I), "customer_segment", False),
    (re.compile(r"payment", re.I), "payment_method", False),
    (re.compile(r"countr|nation", re.I), "customer_country", False),
    (re.compile(r"shipping|delivery method", re.I), "shipping_method", False),
    (re.compile(r"products?\b|items?\b|sku", re.I), "product_id", False),
    (re.compile(r"month|monthly|trend|over time", re.I), "month", False),
    (re.compile(r"department|dept", re.I), "product_category", True),
    (re.compile(r"area|territor", re.I), "region", True),
    (re.compile(r"store type|shop type", re.I), "sales_channel", True),
]

METRIC_WORDS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"return rate|returns?\b", re.I), "return_rate"), (re.compile(r"margin", re.I), "margin"), (re.compile(r"profit", re.I), "profit"),
    (re.compile(r"\baov\b|average order value|basket", re.I), "aov"), (re.compile(r"rating|review|satisf", re.I), "rating"),
    (re.compile(r"\borders?\b|how many|count|volume", re.I), "orders"), (re.compile(r"revenue|sales|turnover|income", re.I), "net_sales"),
]

VALUE_FILTERS: list[tuple[str, list[str]]] = [
    ("sales_channel", [c for c, _ in CHANNELS]), ("region", [c for c, _ in REGIONS]), ("customer_segment", [c for c, _ in SEGMENTS]),
    ("customer_country", [c for c, _ in COUNTRIES]), ("product_category", list(CATEGORIES)),
]


def _word(v: str) -> re.Pattern:
    return re.compile(rf"\b{re.escape(v)}\b", re.I)


@dataclass
class DimHit:
    dimension: str
    repaired_from: str | None


def _find(text: str) -> tuple[re.Pattern, str, bool] | None:
    return next((d for d in DIM_WORDS if d[0].search(text)), None)


def pick_dimension(q: str) -> DimHit | None:
    """Grouping column: "top N <x>", then "by/per <x>", then any dimension word not used as a filter value."""
    hit = None
    top = re.search(r"\btop\s*\d*\s+([a-z]+)", q, re.I)
    if top:
        hit = _find(top.group(1))
    if not hit:
        by = re.search(r"\b(?:by|per|across|for each)\s+([a-z]+(?:\s+[a-z]+)?)", q, re.I)
        if by:
            hit = _find(by.group(1))
    if not hit:
        filtered = {col for col, vals in VALUE_FILTERS if any(_word(v).search(q) for v in vals)}
        hit = next((d for d in DIM_WORDS if d[0].search(q) and d[1] not in filtered), None)
    if not hit:
        return None
    pattern, dim, repair = hit
    return DimHit(dim, pattern.search(q).group(0) if repair else None)


def pick_metric(q: str) -> str | None:
    return next((m for p, m in METRIC_WORDS if p.search(q)), None)


def value_filters(q: str, skip_column: str | None) -> list[tuple[str, str]]:
    out = []
    for col, values in VALUE_FILTERS:
        hit = next((v for v in values if _word(v).search(q)), None)
        if hit and col != skip_column:
            out.append((col, hit))
    return out


def has_scope(q: str) -> bool:
    ql = q.lower()
    return any(v.lower() in ql for _, vals in VALUE_FILTERS for v in vals) or bool(re.search(r"\b202[1-5]\b|this year|last year|previous year|last 12|past year", q, re.I))
