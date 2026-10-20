"""Validates a model's (or the planner's) JSON plan before anything runs."""
from __future__ import annotations

import json

from guardrails.query_guard import PlanRejected, validate


def parse_plan(text_or_dict: str | dict):
    raw = json.loads(text_or_dict) if isinstance(text_or_dict, str) else text_or_dict
    if not isinstance(raw, dict):
        raise PlanRejected("The plan must be a JSON object.")
    return validate(raw)
