"""Product intelligence: category performance, drill-down to subcategories, product table, top brands."""
from __future__ import annotations

from data.filters import Filters
from data.loader import get_dataset

from .common import group, scoped


def get_products(f: Filters, focus_category: str | None) -> dict:
    _, cur, _, _ = scoped(f)
    ds = get_dataset()
    pmap = ds.products.set_index("product_id")
    by_cat = group(cur, "product_category")
    scope = cur[cur["product_category"] == focus_category] if focus_category else cur
    by_sub = group(scope, "product_subcategory" if focus_category else "product_category")
    prods = group(scope, "product_id")
    brands = group(scope, "brand").head(10)
    return {
        "byCategory": [
            {
                "key": r.key, "netSales": float(r.netSales), "marginPct": float(r.profit / r.netSales * 100) if r.netSales else 0.0,
                "returnRate": float(r.returned / r.orders * 100) if r.orders else 0.0, "rating": float(r.ratingSum / r.rated) if r.rated else 0.0, "orders": int(r.orders),
            }
            for r in by_cat.itertuples()
        ],
        "bySub": [{"key": r.key, "netSales": float(r.netSales), "profit": float(r.profit)} for r in by_sub.itertuples()],
        "products": [
            {
                "product_id": r.key, "product_name": pmap.at[r.key, "product_name"], "product_category": pmap.at[r.key, "product_category"], "brand": pmap.at[r.key, "brand"],
                "orders": int(r.orders), "units": int(r.quantity), "net_sales": float(r.netSales), "margin": float(r.profit / r.netSales * 100) if r.netSales else 0.0,
                "return_rate": float(r.returned / r.orders * 100) if r.orders else 0.0, "rating": float(r.ratingSum / r.rated) if r.rated else 0.0,
            }
            for r in prods.itertuples()
        ],
        "brands": [{"key": r.key, "netSales": float(r.netSales)} for r in brands.itertuples()],
        "catalogSize": len(ds.products),
    }
