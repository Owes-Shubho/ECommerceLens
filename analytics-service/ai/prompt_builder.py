"""Builds the planning prompt that will be sent to an OpenRouter model in Phase 11 (used now for token accounting)."""
from __future__ import annotations

import json

from data.schema import COLUMNS

SYSTEM = (
    "You turn analytics questions about an e-commerce orders table into a JSON query plan. "
    "Use only the listed columns. Never write SQL or code. Reply with JSON matching the QueryPlan schema."
)


def build(question: str, columns: list[str], previous_plan: dict | None) -> list[dict]:
    schema = [{"name": c["name"], "type": c["type"], "description": c["description"]} for c in COLUMNS if c["name"] in columns]
    user = {"question": question, "columns": schema}
    if previous_plan:
        user["previous_plan"] = previous_plan
    return [{"role": "system", "content": SYSTEM}, {"role": "user", "content": json.dumps(user)}]
