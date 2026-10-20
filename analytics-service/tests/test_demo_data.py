from data.loader import get_dataset


def test_demo_data_matches_frontend_generator():
    # Same seed and algorithm as frontend/src/data/generate.ts.
    o = get_dataset().orders
    assert len(o) == 41032
    assert round(o["net_sales"].sum(), 2) == 42877057.96
    assert round(o["profit"].sum(), 2) == 18329070.20
    assert o.iloc[0]["order_id"] == "ORD-300000"


def test_no_personal_columns_in_demo_data():
    cols = set(get_dataset().orders.columns)
    assert not cols & {"customer_name", "customer_postal_code", "customer_review"}
