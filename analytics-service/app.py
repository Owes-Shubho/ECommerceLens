"""ECommerceLens analytics service (Flask).

Serves analytics, forecasting, anomaly detection, the AI query pipeline and data profiling.
No database: data comes from data.loader (the demo dataset today). Run: `python app.py` (dev) or
`gunicorn -w 2 -b 0.0.0.0:5001 app:app` / `waitress-serve --port=5001 app:app` (Windows).
"""
from __future__ import annotations

import logging
import time
import uuid

import numpy as np
from flask import Flask, g, jsonify, request
from flask.json.provider import DefaultJSONProvider
from flask_cors import CORS
from pydantic import BaseModel, ValidationError
from werkzeug.exceptions import HTTPException

from config import Config
from data.catalog import CATEGORIES, CHANNELS, REAL_DATASET, REGIONS, SEGMENTS
from data.filters import Filters
from data.loader import get_dataset
from schemas import AnomalyQuery, AskBody, CompareQuery, ForecastQuery, ProductsQuery, SalesQuery

log = logging.getLogger("analytics")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str, details=None):
        super().__init__(message)
        self.status, self.code, self.message, self.details = status, code, message, details


def parse(model: type[BaseModel], source: dict) -> BaseModel:
    try:
        return model.model_validate(source)
    except ValidationError as e:
        raise ApiError(400, "invalid_request", "Some parameters are not valid.", [
            {"field": ".".join(str(p) for p in err["loc"]), "message": err["msg"]} for err in e.errors()
        ]) from e


def ok(data, status: int = 200):
    ms = round((time.perf_counter() - g.t0) * 1000, 1)
    return jsonify({"data": data, "meta": {"executionMs": ms, "requestId": g.request_id, "dataSource": get_dataset().source}}), status


class NumpyJSON(DefaultJSONProvider):
    """Serialises numpy scalars and NaN-safe floats that pandas can leave in results."""

    sort_keys = False

    @staticmethod
    def default(o):
        if isinstance(o, np.integer):
            return int(o)
        if isinstance(o, np.floating):
            return None if np.isnan(o) else float(o)
        if isinstance(o, np.bool_):
            return bool(o)
        if isinstance(o, np.ndarray):
            return o.tolist()
        return DefaultJSONProvider.default(o)


def create_app() -> Flask:
    app = Flask(__name__)
    app.json = NumpyJSON(app)
    app.config["MAX_CONTENT_LENGTH"] = Config.MAX_UPLOAD_MB * 1024 * 1024
    CORS(app, origins=Config.CORS_ORIGINS)

    @app.before_request
    def _start():
        g.t0 = time.perf_counter()
        g.request_id = request.headers.get("X-Request-Id") or uuid.uuid4().hex[:12]

    @app.after_request
    def _finish(resp):
        ms = (time.perf_counter() - g.t0) * 1000
        resp.headers["X-Execution-Time-Ms"] = f"{ms:.1f}"
        resp.headers["X-Request-Id"] = g.request_id
        log.info("%s %s %s %.1fms", request.method, request.path, resp.status_code, ms)
        return resp

    @app.errorhandler(ApiError)
    def _api_error(e: ApiError):
        body = {"error": {"code": e.code, "message": e.message}}
        if e.details:
            body["error"]["details"] = e.details
        return jsonify(body), e.status

    @app.errorhandler(HTTPException)
    def _http_error(e: HTTPException):
        code = {404: "not_found", 405: "method_not_allowed", 413: "file_too_large"}.get(e.code or 500, "http_error")
        msg = f"Files are limited to {Config.MAX_UPLOAD_MB} MB." if e.code == 413 else e.description
        return jsonify({"error": {"code": code, "message": msg}}), e.code

    @app.errorhandler(Exception)
    def _unexpected(e: Exception):
        log.exception("Unhandled error")
        return jsonify({"error": {"code": "internal_error", "message": "Something went wrong on the analytics service.", "requestId": g.get("request_id")}}), 500

    # ---------- service ----------
    @app.get("/health")
    def health():
        ds = get_dataset()
        return ok({"status": "ok", "orders": len(ds.orders), "dataSource": ds.source})

    @app.get("/meta")
    def meta():
        ds = get_dataset()
        return ok({
            "dataSource": ds.source, "minDate": ds.min_date, "maxDate": ds.max_date,
            "rows": {"orders": len(ds.orders), "customers": len(ds.customers), "products": len(ds.products)},
            "options": {"region": [r for r, _ in REGIONS], "channel": [c for c, _ in CHANNELS], "category": list(CATEGORIES), "segment": [s for s, _ in SEGMENTS]},
            "ranges": ["30D", "90D", "YTD", "1Y", "All"],
        })

    @app.get("/schema")
    def schema():
        from data.schema import schema_summary
        return ok(schema_summary())

    # ---------- analytics ----------
    @app.get("/analytics/overview")
    def overview():
        from analytics.overview import get_overview
        return ok(get_overview(parse(Filters, request.args.to_dict())))

    @app.get("/analytics/sales")
    def sales():
        from analytics.sales import get_sales
        q = parse(SalesQuery, request.args.to_dict())
        return ok(get_sales(q, q.granularity))

    @app.get("/analytics/customers")
    def customers():
        from analytics.customers import get_customers
        return ok(get_customers(parse(Filters, request.args.to_dict())))

    @app.get("/analytics/products")
    def products():
        from analytics.products import get_products
        q = parse(ProductsQuery, request.args.to_dict())
        return ok(get_products(q, q.focusCategory or None))

    @app.get("/analytics/operations")
    def operations():
        from analytics.operations import get_operations
        return ok(get_operations(parse(Filters, request.args.to_dict())))

    @app.get("/analytics/compare")
    def compare():
        from analytics.comparison import compare as run
        q = parse(CompareQuery, request.args.to_dict())
        return ok(run(q, q.dimension, q.a, q.b))

    # ---------- predictive ----------
    @app.get("/ml/forecast")
    def forecast():
        from ml.inference import run_forecast
        q = parse(ForecastQuery, request.args.to_dict())
        return ok(run_forecast(q.granularity, q.model, q.horizon, q.category, q.channel))

    @app.get("/ml/anomalies")
    def anomalies():
        from ml.anomaly import find_anomalies
        q = parse(AnomalyQuery, request.args.to_dict())
        return ok(find_anomalies(q.metric, q.threshold, q.category, q.channel))

    # ---------- AI ----------
    @app.post("/ai/ask")
    def ask():
        from ai.orchestrator import ask as run
        body = parse(AskBody, request.get_json(silent=True) or {})
        return ok(run(body.question, body.conversationId))

    @app.delete("/ai/conversations/<conversation_id>")
    def clear_conversation(conversation_id: str):
        from ai import context_manager
        context_manager.clear(conversation_id)
        return ok({"cleared": conversation_id})

    @app.get("/ai/guardrail-events")
    def guardrail_events():
        from guardrails import audit
        return ok(audit.events())

    # ---------- data ----------
    @app.get("/data/sources")
    def sources():
        return ok(REAL_DATASET)

    @app.get("/data/quality")
    def quality():
        from data.profiler import profile_frame
        return ok(profile_frame(get_dataset().orders))

    @app.post("/data/profile")
    def profile_upload():
        from data.profiler import profile_csv
        f = request.files.get("file")
        if f is None or not f.filename:
            raise ApiError(400, "file_missing", "Send a CSV file in the 'file' field.")
        if not f.filename.lower().endswith(".csv"):
            raise ApiError(400, "not_csv", f"{f.filename} is not a CSV file. Upload a .csv export.")
        try:
            result = profile_csv(f.read())
        except Exception as e:  # pandas parser errors
            raise ApiError(400, "unreadable_csv", "The file could not be read as CSV. Check that it has a header row and comma separators.") from e
        result["fileName"] = f.filename
        return ok(result)

    return app


app = create_app()

if __name__ == "__main__":
    get_dataset()  # warm up before the first request
    app.run(host="0.0.0.0", port=Config.PORT, debug=False)
