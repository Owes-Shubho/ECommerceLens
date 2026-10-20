import pytest

from guardrails import output_guard, query_guard


def test_plan_with_unknown_metric_is_rejected():
    with pytest.raises(query_guard.PlanRejected):
        query_guard.validate({"intent": "group", "metric": "salary", "aggregation": "sum"})


def test_plan_cannot_filter_on_other_columns():
    with pytest.raises(query_guard.PlanRejected):
        query_guard.validate({"intent": "total", "metric": "net_sales", "aggregation": "sum", "filters": [{"column": "customer_name", "op": "=", "value": "x"}]})


def test_limit_is_capped():
    with pytest.raises(query_guard.PlanRejected):
        query_guard.validate({"intent": "ranking", "metric": "net_sales", "aggregation": "sum", "group_by": ["product_id"], "limit": 100000})


def test_output_guard_flags_invented_numbers():
    assert output_guard.untraceable_numbers("Sales were $9.99M in 2024.", {"$1.20M"}) == ["$9.99M"]
    assert output_guard.untraceable_numbers("Sales were $1.20M in 2024.", {"$1.20M"}) == []
