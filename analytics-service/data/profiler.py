"""Data profiling: types, blanks, distinct counts, numeric stats, duplicates. Used for uploads and /data/profile."""
from __future__ import annotations

import io

import pandas as pd

from .catalog import MAIN_TABLE_COLUMNS
from .schema import PII_COLUMNS


def _kind(s: pd.Series) -> str:
    if pd.api.types.is_bool_dtype(s):
        return "boolean"
    if pd.api.types.is_numeric_dtype(s):
        return "number"
    sample = s.dropna().astype(str).head(50)
    if len(sample) and sample.str.match(r"^\d{4}-\d{2}-\d{2}").all():
        return "date"
    return "text"


def profile_frame(df: pd.DataFrame) -> dict:
    cols = []
    for name in df.columns:
        s = df[name]
        blank = int(s.isna().sum() + (s.astype(str).str.strip() == "").sum() if s.dtype == object else s.isna().sum())
        col = {"name": name, "type": _kind(s), "missing": blank, "distinct": int(s.nunique(dropna=True)), "pii": name in PII_COLUMNS}
        if col["type"] == "number" and not pd.api.types.is_bool_dtype(s):
            d = s.describe()
            col["stats"] = {"min": float(d["min"]), "mean": float(d["mean"]), "max": float(d["max"]), "std": float(d["std"]) if pd.notna(d["std"]) else 0.0}
        cols.append(col)
    return {"rows": len(df), "columns": len(df.columns), "duplicateRows": int(df.duplicated().sum()), "profile": cols}


def profile_csv(raw: bytes, sample_rows: int = 20000) -> dict:
    df = pd.read_csv(io.BytesIO(raw), nrows=sample_rows, low_memory=False)
    out = profile_frame(df)
    header = list(df.columns)
    missing = [c for c in MAIN_TABLE_COLUMNS if c not in header]
    extra = [c for c in header if c not in MAIN_TABLE_COLUMNS]
    # Personal data is never echoed back: examples are omitted for PII columns.
    for c in out["profile"]:
        if not c["pii"]:
            ex = df[c["name"]].dropna()
            c["example"] = str(ex.iloc[0])[:40] if len(ex) else ""
    out["sampled"] = len(df) >= sample_rows
    out["schemaCheck"] = {"matchesMainTable": not missing, "missing": missing, "extra": extra, "expected": len(MAIN_TABLE_COLUMNS)}
    return out
