"""Guardrail 5 — Privacy Guard: personal fields are never queried, shown or sent to a model."""
from __future__ import annotations

import re

import pandas as pd

from data.schema import PII_COLUMNS

from .input_guard import Block

PII_WORDS = re.compile(
    r"\b(e-?mails?|phones?|phone numbers?|(home |street )?address(es)?|postal codes?|zip codes?|full names?|customer names?|passwords?|credit card numbers?)\b",
    re.I,
)


def check(question: str) -> Block | None:
    if PII_WORDS.search(question):
        return Block("Privacy Guard: personal data",
                     "Personal fields (names, contact details, postal codes) are never shown or sent to the model. You can ask about customer IDs, segments and regions.")
    return None


def mask_frame(df: pd.DataFrame) -> pd.DataFrame:
    """Drop personal columns before anything leaves the service."""
    return df.drop(columns=[c for c in df.columns if c in PII_COLUMNS])
