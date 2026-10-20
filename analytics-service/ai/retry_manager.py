"""One automatic correction attempt (Development rule 13): if a plan is rejected, repair once, then give up."""
from __future__ import annotations

from typing import Callable, TypeVar

from guardrails.query_guard import PlanRejected

T = TypeVar("T")


def with_one_repair(attempt: Callable[[], T], repair: Callable[[PlanRejected], T]) -> tuple[T, bool]:
    try:
        return attempt(), False
    except PlanRejected as e:
        return repair(e), True
