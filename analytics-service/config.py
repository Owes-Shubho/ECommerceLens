"""Settings for the analytics service, read from environment variables (or a .env file)."""
from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    PORT = int(os.getenv("ANALYTICS_PORT", "5001"))
    # "demo" = generated dataset identical to the frontend's. "csv" arrives with the data layer (Phase 2).
    DATA_SOURCE = os.getenv("DATA_SOURCE", "demo")
    CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:4000").split(",") if o.strip()]
    # Guardrail limits for executing query plans.
    MAX_RESULT_ROWS = int(os.getenv("MAX_RESULT_ROWS", "500"))
    MAX_EXECUTION_MS = int(os.getenv("MAX_EXECUTION_MS", "3000"))
    # The AI layer works without a key (rule-based planner). With a key, openrouter_client is used in Phase 11.
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "60"))
