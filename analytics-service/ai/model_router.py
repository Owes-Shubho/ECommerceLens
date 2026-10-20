"""Adaptive model routing: simple lookups go to the fast model; trends and multi-filter questions to the reasoning model."""
from __future__ import annotations

from typing import Literal

Tier = Literal["fast", "reasoning", "fallback"]
PRICE_PER_1K: dict[str, float] = {"fast": 0.00045, "reasoning": 0.006, "fallback": 0.0009}
LABEL = {"fast": "Fast model", "reasoning": "Reasoning model", "fallback": "Fallback model"}
# Model names are configured in Phase 11 (OpenRouter); tiers are what the app reasons about.


def route(intent: str, n_filters: int) -> Tier:
    return "reasoning" if intent == "trend" or n_filters >= 2 else "fast"


def cost(tier: Tier, tokens: int) -> float:
    return tokens / 1000 * PRICE_PER_1K[tier]
