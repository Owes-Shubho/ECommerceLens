"""Guardrail 1 — Input Guard: blocks write operations, code execution and prompt injection before planning."""
from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass
class Block:
    rule: str
    message: str


RULES: list[tuple[re.Pattern, str, str]] = [
    (re.compile(r"\b(drop|delete|truncate|insert|update|alter|remove all|wipe)\b", re.I), "Query Guard: write operation",
     "Lens only runs read-only analytical queries, so requests that change or delete data are blocked."),
    (re.compile(r"(import os|subprocess|exec\(|eval\(|__import__|rm -rf|\bshell\b)", re.I), "Execution Guard: code execution",
     "Lens never runs generated code. Ask an analytical question instead."),
    (re.compile(r"\b(ignore (all|previous|the) (instructions|rules)|system prompt|jailbreak)\b", re.I), "Input Guard: prompt injection",
     "That looks like an attempt to change Lens's instructions, so it was blocked."),
]
MAX_LEN = 500


def check(question: str) -> Block | None:
    if len(question) > MAX_LEN:
        return Block("Input Guard: too long", f"Questions are limited to {MAX_LEN} characters. Ask one thing at a time.")
    for pattern, rule, message in RULES:
        if pattern.search(question):
            return Block(rule, message)
    return None
