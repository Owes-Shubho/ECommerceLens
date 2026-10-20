"""Guardrail 6 — Output Guard: every number in an answer must appear in the formatted query result."""
from __future__ import annotations

import re

NUM = re.compile(r"\$?-?\d[\d,]*(?:\.\d+)?[KMB%]?")


def untraceable_numbers(answer: str, allowed: set[str]) -> list[str]:
    """Numbers in the answer that are not in the result (years and small counts like 'top 5' are ignored)."""
    out = []
    for n in NUM.findall(answer):
        bare = n.strip("$%KMB").replace(",", "")
        if re.fullmatch(r"20\d\d", bare) or (bare.isdigit() and int(bare) <= 20):
            continue
        if n not in allowed:
            out.append(n)
    return out
