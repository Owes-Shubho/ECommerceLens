"""Guardrail 4 — Execution Guard: runs a validated plan with a time budget and a row cap."""
from __future__ import annotations

import time

import pandas as pd

from config import Config
from data.query_engine import QueryPlan, execute


class ExecutionLimit(RuntimeError):
    pass


def run(plan: QueryPlan) -> tuple[pd.DataFrame, int, float]:
    t0 = time.perf_counter()
    result, source_rows = execute(plan)
    ms = (time.perf_counter() - t0) * 1000
    if ms > Config.MAX_EXECUTION_MS:
        raise ExecutionLimit(f"The query took {ms:.0f} ms, over the {Config.MAX_EXECUTION_MS} ms limit.")
    return result.head(Config.MAX_RESULT_ROWS), source_rows, ms
