"""OpenRouter client (Phase 11). Without OPENROUTER_API_KEY the service uses the rule-based planner instead."""
from __future__ import annotations

import json
import urllib.request

from config import Config


class NotConfigured(RuntimeError):
    pass


def chat(model: str, messages: list[dict], timeout: float = 30.0) -> dict:
    if not Config.OPENROUTER_API_KEY:
        raise NotConfigured("OPENROUTER_API_KEY is not set; the rule-based planner is used.")
    req = urllib.request.Request(
        f"{Config.OPENROUTER_BASE_URL}/chat/completions",
        data=json.dumps({"model": model, "messages": messages, "response_format": {"type": "json_object"}}).encode(),
        headers={"Authorization": f"Bearer {Config.OPENROUTER_API_KEY}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310 - fixed https endpoint from config
        return json.loads(resp.read())
