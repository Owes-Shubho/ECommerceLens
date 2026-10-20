"""Guardrail 3 — Query Guard: a plan must parse as a QueryPlan and only reference allowed columns and values."""
from __future__ import annotations

from pydantic import ValidationError

from config import Config
from data.query_engine import FILTER_COLUMNS, QueryPlan


class PlanRejected(ValueError):
    pass


def validate(raw: dict) -> QueryPlan:
    try:
        plan = QueryPlan.model_validate(raw)
    except ValidationError as e:
        raise PlanRejected(f"Query plan failed validation: {e.errors()[0]['msg']}") from e
    for f in plan.filters:
        if f.column not in FILTER_COLUMNS:
            raise PlanRejected(f"Filtering on {f.column!r} is not allowed.")
        if f.op == "between" and (not isinstance(f.value, list) or len(f.value) != 2):
            raise PlanRejected("A 'between' filter needs exactly two values.")
    if plan.limit and plan.limit > Config.MAX_RESULT_ROWS:
        raise PlanRejected(f"Results are limited to {Config.MAX_RESULT_ROWS} rows.")
    return plan
