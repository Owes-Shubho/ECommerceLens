"""Deterministic demo dataset, a line-by-line port of frontend/src/data/generate.ts.

The random calls happen in exactly the same order as the TypeScript version, so the backend and the
browser demo produce the same ~41k orders and the same numbers. Replace with the real loader in Phase 2.
"""
from __future__ import annotations

import math
from datetime import date, timedelta

import pandas as pd

from .catalog import (
    BRANDS, CATEGORIES, CATEGORY_PRICE, CHANNELS, COUNTRIES, GENDERS, MARKETING, PAYMENTS, REGIONS,
    RETURN_REASONS, SEGMENTS, SHIP_DAYS, SHIPPING, WAREHOUSES,
)
from .rng import Rng, js_round

MIN = date(2021, 1, 1)
MAX = date(2025, 12, 31)
ADJ = ["Pro", "Lite", "Max", "Classic", "Plus", "Air", "Prime", "Eco", "Ultra", "Smart"]
INJECTED_ANOMALIES = {
    "2022-03-14": 3.4, "2023-07-04": 0.15, "2023-11-24": 3.8, "2024-05-20": 0.2,
    "2024-11-29": 4.2, "2025-02-11": 2.9, "2025-08-30": 0.1, "2025-11-28": 3.9,
}


def round2(n: float) -> float:
    return js_round(n * 100) / 100


def generate(seed: int = 20251231) -> dict[str, pd.DataFrame]:
    r = Rng(seed)
    total_days = (MAX - MIN).days

    products = []
    pid = 1
    for cat, subs in CATEGORIES.items():
        lo, hi = CATEGORY_PRICE[cat]
        for i in range(16):
            sub = subs[i % len(subs)]
            brand = r.pick(BRANDS[cat])
            price = round2(math.exp(r.between(math.log(lo), math.log(hi))) * 2.8)
            margin_pct = r.between(0.3, 0.68)
            name = f"{brand} {sub} {r.pick(ADJ)}"
            products.append({
                "product_id": f"PROD-{pid:06d}", "product_name": name, "product_category": cat, "product_subcategory": sub,
                "brand": brand, "unit_price": price, "product_cost": round2(price * (1 - margin_pct)),
                "product_rating": js_round(r.between(2.9, 4.9) * 10) / 10,
            })
            pid += 1
    popularity = [(p["product_id"], math.pow(r.next(), 3) * 10 + 0.2) for p in products]
    product_by_id = {p["product_id"]: p for p in products}

    customers = []
    for i in range(1, 2501):
        region = r.weighted(REGIONS)
        segment = r.weighted(SEGMENTS)
        country = r.weighted(COUNTRIES)
        gender = r.weighted(GENDERS)
        age = r.int(18, 72)
        first = MIN + timedelta(days=math.floor(math.pow(r.next(), 1.8) * total_days))
        customers.append({
            "customer_id": f"CUST-{i:06d}", "customer_segment": segment, "region": region, "customer_country": country,
            "gender": gender, "customer_age": age, "first_order_date": first.isoformat(),
        })
    activity = [(c["customer_id"], math.pow(r.next(), 2) * 6 + 0.3) for c in customers]
    customer_by_id = {c["customer_id"]: c for c in customers}
    seen: set[str] = set()

    orders = []
    oid = 300000
    day = MIN
    while day <= MAX:
        ds = day.isoformat()
        t = (day - MIN).days / total_days
        dow = (day.weekday() + 1) % 7  # JS getUTCDay: Sunday = 0
        month = day.month - 1
        weekly = 1.18 if dow in (0, 6) else 0.92 if dow == 1 else 1
        yearly = 1.35 if month == 10 else 1.5 if month == 11 else 0.85 if month == 0 else 1.1 if month == 6 else 1
        growth = 0.72 + 0.55 * t
        shock = INJECTED_ANOMALIES.get(ds, 1)
        expected = 20 * weekly * yearly * growth * shock
        n = max(0, int(js_round(r.normal(expected, math.sqrt(expected) * 0.9))))

        for _ in range(n):
            cust = None
            tries = 0
            while tries < 6 and cust is None:
                c = customer_by_id[r.weighted(activity)]
                if c["first_order_date"] <= ds:
                    cust = c
                tries += 1
            if cust is None:
                cust = customers[r.int(0, len(customers) - 1)]
            product = product_by_id[r.weighted(popularity)]
            channel = r.weighted(CHANNELS)
            shipping = r.weighted(SHIPPING)
            qty = max(1, int(js_round(r.between(1, 3 if product["unit_price"] > 600 else 9))))
            gross = round2(product["unit_price"] * qty * r.between(0.95, 1.08))
            disc_rate = r.between(0.02, 0.3) if r.next() < 0.55 else 0
            discount = round2(gross * disc_rate)
            net = round2(gross - discount)
            cost = round2(product["product_cost"] * qty)

            roll = r.next()
            status = ("Cancelled" if roll < 0.0608 else "Returned" if roll < 0.0608 + 0.0685
                      else "Pending" if roll < 0.0608 + 0.0685 + 0.0485 else "Completed")
            dmin, dmax = SHIP_DAYS[shipping]
            days = 0 if status == "Cancelled" else r.int(dmin, dmax)
            late = r.next()
            if status == "Cancelled":
                delivery = "Cancelled"
            elif late < 0.14 + (0.06 if shipping == "Economy" else 0):
                delivery = "Delayed"
            elif late < 0.24:
                delivery = "Early"
            else:
                delivery = "On Time"
            if status == "Cancelled":
                rating = None
            else:
                mu = product["product_rating"] - (0.5 if delivery == "Delayed" else 0) - (0.9 if status == "Returned" else 0)
                rating = min(5.0, max(1.0, js_round(r.normal(mu, 0.6) * 10) / 10))
            repeat = cust["customer_id"] in seen
            seen.add(cust["customer_id"])
            realised = 0 if status in ("Cancelled", "Returned") else 1
            payment = r.weighted(PAYMENTS)
            warehouse = r.pick(WAREHOUSES)
            reason = r.pick(RETURN_REASONS) if status == "Returned" else ""
            marketing = r.weighted(MARKETING)

            orders.append({
                "order_id": f"ORD-{oid}", "order_date": ds, "order_status": status, "sales_channel": channel,
                "customer_id": cust["customer_id"], "customer_segment": cust["customer_segment"], "region": cust["region"],
                "customer_country": cust["customer_country"], "product_id": product["product_id"],
                "product_category": product["product_category"], "product_subcategory": product["product_subcategory"],
                "brand": product["brand"], "payment_method": payment, "shipping_method": shipping, "warehouse": warehouse,
                "delivery_days": days, "delivery_status": delivery, "return_reason": reason, "customer_rating": rating,
                "marketing_channel": marketing, "quantity": qty, "gross_sales": gross, "discount_amount": discount,
                "net_sales": net * realised, "product_cost": cost * realised, "profit": round2((net - cost) * realised),
                "is_repeat_customer": repeat,
            })
            oid += 1
        day += timedelta(days=1)

    return {"orders": pd.DataFrame(orders), "customers": pd.DataFrame(customers), "products": pd.DataFrame(products)}
