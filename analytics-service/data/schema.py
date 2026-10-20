"""Schema metadata: a column dictionary used by the /schema endpoint and by the AI layer's schema retrieval."""
from __future__ import annotations

COLUMNS: list[dict] = [
    {"name": "order_id", "type": "text", "role": "id", "description": "Unique order identifier (ORD-…)."},
    {"name": "order_date", "type": "date", "role": "time", "description": "Date the order was placed (YYYY-MM-DD)."},
    {"name": "order_status", "type": "category", "role": "dimension", "description": "Completed, Returned, Cancelled or Pending."},
    {"name": "sales_channel", "type": "category", "role": "dimension", "description": "Mobile App, Website, Marketplace or Social Media.", "synonyms": ["channel", "platform", "store type"]},
    {"name": "customer_id", "type": "text", "role": "id", "description": "Customer identifier (CUST-…)."},
    {"name": "customer_segment", "type": "category", "role": "dimension", "description": "Consumer, Premium, VIP or Business.", "synonyms": ["segment", "tier"]},
    {"name": "region", "type": "category", "role": "dimension", "description": "Sales region: South, Central, West, East, North.", "synonyms": ["area", "territory"]},
    {"name": "customer_country", "type": "category", "role": "dimension", "description": "Customer's country.", "synonyms": ["country", "nation"]},
    {"name": "product_id", "type": "text", "role": "id", "description": "Product identifier (PROD-…)."},
    {"name": "product_category", "type": "category", "role": "dimension", "description": "One of 15 product categories.", "synonyms": ["category", "department", "dept"]},
    {"name": "product_subcategory", "type": "category", "role": "dimension", "description": "Product subcategory (8 per category)."},
    {"name": "brand", "type": "category", "role": "dimension", "description": "Product brand."},
    {"name": "payment_method", "type": "category", "role": "dimension", "description": "Card, PayPal, wallet, cash on delivery, BNPL or bank transfer.", "synonyms": ["payment"]},
    {"name": "shipping_method", "type": "category", "role": "dimension", "description": "Same Day, Express, Standard or Economy.", "synonyms": ["shipping", "delivery method"]},
    {"name": "warehouse", "type": "category", "role": "dimension", "description": "Fulfilling warehouse (WH-001…WH-020)."},
    {"name": "delivery_days", "type": "number", "role": "measure", "description": "Days from order to delivery."},
    {"name": "delivery_status", "type": "category", "role": "dimension", "description": "On Time, Early, Delayed or Cancelled."},
    {"name": "return_reason", "type": "category", "role": "dimension", "description": "Why the order was returned (blank otherwise)."},
    {"name": "customer_rating", "type": "number", "role": "measure", "description": "Rating 1–5 (blank for cancelled orders)."},
    {"name": "marketing_channel", "type": "category", "role": "dimension", "description": "Acquisition source of the order.", "synonyms": ["marketing", "campaign", "traffic source"]},
    {"name": "quantity", "type": "number", "role": "measure", "description": "Units in the order."},
    {"name": "gross_sales", "type": "money", "role": "measure", "description": "Order value before discount."},
    {"name": "discount_amount", "type": "money", "role": "measure", "description": "Discount given."},
    {"name": "net_sales", "type": "money", "role": "measure", "description": "Revenue after discount; zero for cancelled and returned orders.", "synonyms": ["revenue", "sales", "turnover"]},
    {"name": "product_cost", "type": "money", "role": "measure", "description": "Cost of goods for the order."},
    {"name": "profit", "type": "money", "role": "measure", "description": "Net sales minus product cost."},
    {"name": "is_repeat_customer", "type": "boolean", "role": "dimension", "description": "True if the customer had ordered before."},
]

PII_COLUMNS = {"customer_name", "customer_postal_code", "customer_review", "customer_city", "customer_email", "customer_phone"}


def schema_summary() -> dict:
    return {"table": "orders", "columns": COLUMNS, "piiColumns": sorted(PII_COLUMNS)}
