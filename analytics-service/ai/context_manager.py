"""Conversation context: the last query plan per conversation (compressed context for follow-ups)."""
from __future__ import annotations

import threading
from collections import OrderedDict

_MAX = 1000
_store: "OrderedDict[str, dict]" = OrderedDict()
_lock = threading.Lock()


def get(conversation_id: str | None) -> dict | None:
    if not conversation_id:
        return None
    with _lock:
        return _store.get(conversation_id)


def put(conversation_id: str | None, plan: dict) -> None:
    if not conversation_id:
        return
    with _lock:
        _store[conversation_id] = plan
        _store.move_to_end(conversation_id)
        while len(_store) > _MAX:
            _store.popitem(last=False)


def clear(conversation_id: str) -> None:
    with _lock:
        _store.pop(conversation_id, None)
