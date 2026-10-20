"""AI orchestrator: guardrails → intent and schema mapping → JSON query plan → validated, guarded execution →
answer built only from the result. Same behaviour as frontend/src/ai/demoAssistant.ts, but server-side.
A rule-based planner stands in for the OpenRouter model until Phase 11; everything around it is real."""
from __future__ import annotations

import re
import time
import zlib

from guardrails import audit, execution_guard, input_guard, output_guard, pii_guard, query_guard, schema_guard
from data.loader import get_dataset

from . import context_manager, model_router, prompt_builder, schema_retriever, token_manager
from .formatting import DIM_LABEL, METRIC_LABEL, MONEY_METRICS, fmt_metric, fmt_month

AGG_FOR = {"orders": "count", "aov": "avg", "rating": "avg", "margin": "rate", "return_rate": "rate", "net_sales": "sum", "profit": "sum"}
FOLLOW_UP = re.compile(r"^(what about|and|how about|only|now|same|just|for|in)\b", re.I)


def _year(q: str) -> str | None:
    m = re.search(r"\b(202[1-5])\b", q)
    if m:
        return m.group(1)
    if re.search(r"this year|last 12|past year", q, re.I):
        return "2025"
    if re.search(r"last year|previous year", q, re.I):
        return "2024"
    return None


def _sim_latency(question: str, tier: str, repaired: bool) -> int:
    """Model latency is simulated until a real model is called (deterministic per question)."""
    jitter = (zlib.crc32(question.encode()) % 1000) / 1000
    return round((2400 if tier == "reasoning" else 900) + jitter * 900 + (700 if repaired else 0))


def _blocked(question: str, block) -> dict:
    audit.record(block.rule, "blocked", question)
    return {
        "text": block.message, "guard": "blocked", "guardRule": block.rule, "model": "fast",
        "tokensBaseline": token_manager.baseline_tokens(question), "tokensOptimized": token_manager.estimate(question) + 120,
        "latencyMs": 60, "costUsd": 0.0, "intent": "blocked",
    }


def ask(question: str, conversation_id: str | None = None) -> dict:
    t0 = time.perf_counter()
    q = question.strip()
    block = input_guard.check(q) or pii_guard.check(q)
    if block:
        return _blocked(q, block)

    prev = context_manager.get(conversation_id)
    metric = schema_guard.pick_metric(q)
    dim_hit = schema_guard.pick_dimension(q)
    dim = dim_hit.dimension if dim_hit else None
    repaired = f'"{dim_hit.repaired_from}" is not a column; Lens used {dim} instead.' if dim_hit and dim_hit.repaired_from else None
    follow_up = bool(prev) and (bool(FOLLOW_UP.search(q)) or (not metric and not dim and schema_guard.has_scope(q)))
    if not metric and follow_up:
        metric = prev["metric"]
    if not dim and follow_up and prev["group_by"]:
        dim = prev["group_by"][0]

    if not metric and not dim:
        tokens = token_manager.estimate(q) + 380
        return {
            "text": "I can answer questions about sales, profit, margin, orders, average order value, return rate and ratings, broken down by category, channel, region, segment, country, payment or marketing channel, or over time.",
            "guard": "passed", "model": "fast", "tokensBaseline": token_manager.baseline_tokens(q), "tokensOptimized": tokens,
            "latencyMs": _sim_latency(q, "fast", False), "costUsd": model_router.cost("fast", tokens), "intent": "help",
        }
    metric = metric or "net_sales"

    filters = [dict(f) for f in prev["filters"]] if follow_up and prev else []
    for col, val in schema_guard.value_filters(q, dim):
        filters = [f for f in filters if f["column"] != col] + [{"column": col, "op": "=", "value": val}]
    year = _year(q)
    if year:
        filters = [f for f in filters if f["column"] != "order_date"] + [{"column": "order_date", "op": "between", "value": [f"{year}-01-01", f"{year}-12-31"]}]

    ranking = bool(re.search(r"\btop\b|best|highest|most|largest|biggest|lowest|worst|least", q, re.I))
    asc = bool(re.search(r"lowest|worst|least|smallest", q, re.I))
    limit_m = re.search(r"\btop (\d+)", q, re.I)
    trend = dim == "month"
    raw = {
        "intent": "trend" if trend else ("ranking" if ranking else "group") if dim else "total",
        "metric": metric, "aggregation": AGG_FOR[metric], "group_by": [dim] if dim else [], "filters": filters,
    }
    if dim and not trend:
        raw["order"] = "asc" if asc else "desc"
    if dim == "product_id" or limit_m:
        raw["limit"] = int(limit_m.group(1)) if limit_m else 5

    try:
        plan = query_guard.validate(raw)
    except query_guard.PlanRejected as e:
        audit.record("Query Guard: invalid plan", "blocked", q)
        return {**_blocked(q, input_guard.Block("Query Guard: invalid plan", str(e))), "intent": "invalid"}

    tier = model_router.route(plan.intent, len(plan.filters))
    columns = schema_retriever.relevant_columns(metric, dim, [f.column for f in plan.filters])
    prompt = prompt_builder.build(q, columns, prev)
    tokens = token_manager.optimized_tokens(q, columns, len(plan.filters), follow_up)
    plan_json = plan.model_dump(exclude_none=True)
    context_manager.put(conversation_id, plan_json)
    if repaired:
        audit.record("Schema Guard: unknown column", "repaired", q)

    result, source_rows, exec_ms = execution_guard.run(plan)
    meta = {
        "guard": "repaired" if repaired else "passed", "guardRule": "Schema Guard: unknown column" if repaired else None,
        "repairedNote": repaired, "plan": plan_json, "intent": plan.intent, "model": tier,
        "tokensBaseline": token_manager.baseline_tokens(q), "tokensOptimized": tokens,
        "latencyMs": _sim_latency(q, tier, bool(repaired)), "costUsd": model_router.cost(tier, tokens),
        "execution": {"ms": round(exec_ms, 1), "sourceRows": source_rows, "resultRows": len(result), "promptMessages": len(prompt)},
    }
    scope = ", ".join(f["value"] if f["op"] == "=" else f["value"][0][:4] for f in plan_json["filters"])
    scope_text = f" ({scope})" if scope else ""
    if result.empty:
        return {**meta, "text": f"No orders match{scope_text}. Try a wider filter."}

    label = METRIC_LABEL[metric]
    is_money = metric in MONEY_METRICS
    if trend:
        hi = result.loc[result["value"].idxmax()]
        lo = result.loc[result["value"].idxmin()]
        first, last = result["value"].iloc[0], result["value"].iloc[-1]
        text = (f"Monthly {label}{scope_text} peaked in **{fmt_month(hi.key)}** at {fmt_metric(metric, hi.value)} and was lowest in "
                f"{fmt_month(lo.key)} ({fmt_metric(metric, lo.value)}). From the first to the last month it moved from "
                f"{fmt_metric(metric, first)} to {fmt_metric(metric, last)}.")
        reply = {**meta, "text": text, "chart": {"kind": "line", "x": result["key"].tolist(), "y": result["value"].astype(float).tolist(), "label": label, "isMoney": is_money}}
    elif not dim:
        r = result.iloc[0]
        reply = {**meta, "text": f"Total {label}{scope_text}: **{fmt_metric(metric, r.value)}** across {int(r.orders):,} orders."}
    else:
        names = get_dataset().products.set_index("product_id")["product_name"] if dim == "product_id" else None
        name = (lambda k: names.get(k, k)) if names is not None else (lambda k: k)
        top = result.iloc[0]
        text = f"**{name(top.key)}** has the {'lowest' if asc else 'highest'} {label}{scope_text} at {fmt_metric(metric, top.value)}"
        if len(result) > 1:
            second = result.iloc[1]
            text += f", {'below' if asc else 'ahead of'} {name(second.key)} ({fmt_metric(metric, second.value)})."
        else:
            text += "."
        if not ranking and len(result) > 2:
            last = result.iloc[-1]
            text += f" The {DIM_LABEL[dim]} with the {'highest' if asc else 'lowest'} {label} is {name(last.key)} at {fmt_metric(metric, last.value)}."
        dl = DIM_LABEL[dim]
        reply = {
            **meta, "text": text,
            "table": {
                "columns": [{"key": "name", "label": dl[0].upper() + dl[1:]}, {"key": "value", "label": label[0].upper() + label[1:], "align": "right"}, {"key": "orders", "label": "Orders", "align": "right"}],
                "rows": [{"name": name(r.key), "value": fmt_metric(metric, r.value), "orders": f"{int(r.orders):,}"} for r in result.itertuples()],
            },
        }
        if len(result) <= 15:
            reply["chart"] = {"kind": "bar", "x": [name(k) for k in result["key"]], "y": result["value"].astype(float).tolist(), "label": label, "isMoney": is_money}

    # Output Guard: numbers in the answer must come from the result.
    allowed = {fmt_metric(metric, float(v)) for v in result["value"]} | {f"{int(o):,}" for o in result["orders"]}
    untraceable = output_guard.untraceable_numbers(reply["text"], allowed)
    reply["traceable"] = not untraceable
    if untraceable:
        audit.record("Output Guard: untraceable number", "flagged", q)
    reply["serverMs"] = round((time.perf_counter() - t0) * 1000, 1)
    return reply
