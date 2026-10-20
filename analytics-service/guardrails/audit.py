"""Guardrail 7 — Audit logging: every guardrail decision is kept (in memory here; MongoDB in Phase 4)."""
from __future__ import annotations

import threading
from collections import deque
from datetime import datetime, timezone

_events: deque = deque(maxlen=5000)
_lock = threading.Lock()


def record(rule: str, outcome: str, question: str) -> None:
    with _lock:
        _events.append({"at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "rule": rule, "outcome": outcome, "question": question[:200]})


def events(limit: int = 200) -> list[dict]:
    with _lock:
        return list(_events)[-limit:]
