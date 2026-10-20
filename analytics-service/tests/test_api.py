import io


def data(resp):
    assert resp.status_code == 200, resp.get_json()
    return resp.get_json()["data"]


def test_health(client):
    d = data(client.get("/health"))
    assert d["status"] == "ok" and d["orders"] == 41032


def test_overview_numbers(client):
    d = data(client.get("/analytics/overview?range=1Y"))
    assert round(d["kpis"]["netSales"]["value"], 2) == 10532186.75
    assert d["kpis"]["orders"]["value"] == 9994
    assert len(d["trend"]) == 12 and len(d["topProducts"]) == 8


def test_filters_change_results(client):
    all_ = data(client.get("/analytics/overview?range=All"))
    south = data(client.get("/analytics/overview?range=All&region=South"))
    assert south["kpis"]["netSales"]["value"] < all_["kpis"]["netSales"]["value"]
    assert all(r["key"] == "South" for r in south["byRegion"])


def test_invalid_parameter_returns_structured_error(client):
    r = client.get("/analytics/overview?range=2Y")
    assert r.status_code == 400
    err = r.get_json()["error"]
    assert err["code"] == "invalid_request" and err["details"][0]["field"] == "range"


def test_timing_header(client):
    r = client.get("/meta")
    assert float(r.headers["X-Execution-Time-Ms"]) >= 0


def test_all_analytics_pages(client):
    for path in ["/analytics/sales?granularity=Week", "/analytics/customers", "/analytics/products?focusCategory=Electronics", "/analytics/operations",
                 "/analytics/compare?dimension=channel&a=Website&b=Mobile%20App"]:
        assert data(client.get(path))


def test_forecast(client):
    d = data(client.get("/ml/forecast?granularity=Weekly&model=baseline&horizon=8"))
    assert len(d["future"]["yhat"]) == 8
    assert set(d["allMetrics"]) == {"baseline", "lstm", "gru"}
    assert all(lo <= y <= hi for lo, y, hi in zip(d["future"]["lo"], d["future"]["yhat"], d["future"]["hi"]))


def test_anomalies_find_injected_days(client):
    d = data(client.get("/ml/anomalies?metric=orders&threshold=3"))
    days = {a["t"] for a in d["anomalies"]}
    assert {"2024-11-29", "2025-11-28", "2025-08-30"} <= days


def test_404_is_json(client):
    r = client.get("/nope")
    assert r.status_code == 404 and r.get_json()["error"]["code"] == "not_found"


def test_profile_upload(client):
    csv = "order_id,order_date,net_sales,customer_name\nORD-1,2025-01-01,10.5,Alice\nORD-2,2025-01-02,,Bob\n"
    d = data(client.post("/data/profile", data={"file": (io.BytesIO(csv.encode()), "x.csv")}, content_type="multipart/form-data"))
    by = {c["name"]: c for c in d["profile"]}
    assert by["net_sales"]["missing"] == 1 and by["customer_name"]["pii"] is True and "example" not in by["customer_name"]
    assert d["schemaCheck"]["matchesMainTable"] is False


def test_profile_rejects_non_csv(client):
    r = client.post("/data/profile", data={"file": (io.BytesIO(b"x"), "x.txt")}, content_type="multipart/form-data")
    assert r.status_code == 400 and r.get_json()["error"]["code"] == "not_csv"
