"""Token budget: estimates prompt sizes for the full-schema baseline and the optimized prompt (Phase 13 experiment)."""
from __future__ import annotations

from data.schema import COLUMNS

# Baseline sends every column of all files with descriptions (46 columns in the main table + 4 other files).
BASELINE_SCHEMA_TOKENS = 46 * 38 + 4 * 11 * 30
SYSTEM_PROMPT_TOKENS = 600
PROMPT_BUDGET = 2000  # optimized prompt must stay under this


def estimate(text: str) -> int:
    """About four characters per token."""
    return -(-len(text) // 4)


def baseline_tokens(question: str) -> int:
    return BASELINE_SCHEMA_TOKENS + estimate(question) + SYSTEM_PROMPT_TOKENS


def optimized_tokens(question: str, columns: list[str], filters: int, follow_up: bool) -> int:
    col_tokens = sum(estimate(c["name"] + c["description"]) for c in COLUMNS if c["name"] in columns)
    return min(PROMPT_BUDGET, 420 + estimate(question) + col_tokens + filters * 40 + (160 if follow_up else 0))
