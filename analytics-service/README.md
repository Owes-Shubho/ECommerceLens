# ECommerceLens — analytics service (Python / Flask)

Analytics, forecasting, anomaly detection, the AI query pipeline and data profiling. **No database:** data comes from `data/loader.py`, which today builds the demo dataset in memory (the same ~41k orders the frontend generates, bit for bit).

## Run it

```bash
cd analytics-service
python -m venv .venv
# Windows: .venv\Scripts\activate      macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
python app.py                 # http://localhost:5001
pytest                        # 26 tests
```

Production-style: `waitress-serve --port=5001 app:app` (Windows) or `gunicorn -w 2 -b 0.0.0.0:5001 app:app`.
Settings are in `.env` (copy `.env.example`).

## Endpoints

Every success response is `{ "data": …, "meta": { "executionMs", "requestId", "dataSource" } }` with an `X-Execution-Time-Ms` header. Every error is `{ "error": { "code", "message", "details?" } }`.

| Method | Path | Query / body |
|---|---|---|
| GET | `/health`, `/meta`, `/schema` | |
| GET | `/analytics/overview`, `/customers`, `/operations` | `range` (30D, 90D, YTD, 1Y, All), `region`, `channel`, `category`, `segment` |
| GET | `/analytics/sales` | filters + `granularity` (Day, Week, Month) |
| GET | `/analytics/products` | filters + `focusCategory` |
| GET | `/analytics/compare` | filters + `dimension`, `a`, `b` |
| GET | `/ml/forecast` | `granularity` (Daily, Weekly), `model` (baseline, lstm, gru), `horizon`, `category`, `channel` |
| GET | `/ml/anomalies` | `metric` (orders, net), `threshold`, `category`, `channel` |
| POST | `/ai/ask` | `{ "question": "...", "conversationId": "..." }` |
| DELETE | `/ai/conversations/<id>` | |
| GET | `/ai/guardrail-events` | |
| GET | `/data/sources`, `/data/quality` | |
| POST | `/data/profile` | multipart `file` (CSV) |

Response shapes match the frontend's types in `frontend/src/services/analytics.ts`.

## How it is organised

- `data/` — `demo.py` (generator), `loader.py` (one place to switch to real data), `filters.py`, `query_engine.py` (executes JSON query plans; whitelisted metrics, columns and operators only), `schema.py`, `profiler.py`
- `analytics/` — one module per page, plus `storytelling.py` (computed insights)
- `ml/` — `baseline.py` (real linear regression), `lstm.py` / `gru.py` (stand-ins with the final interface until the PyTorch models from Phase 20), `evaluation.py` (MAE, RMSE, MAPE, R²), `inference.py` (chronological 70/15/15 split), `anomaly.py`
- `guardrails/` — input, privacy, schema, query, execution and output guards, plus `audit.py`
- `ai/` — `orchestrator.py` (guardrails → plan → validated execution → answer from the result), `model_router.py`, `token_manager.py`, `schema_retriever.py`, `context_manager.py`, `prompt_builder.py`, `openrouter_client.py` (used once `OPENROUTER_API_KEY` is set in Phase 11)

Not built yet: `data/cleaner.py`, `parquet.py`, `versioning.py` (Phase 2 and 25) and `reporting/` (Phase 26).
