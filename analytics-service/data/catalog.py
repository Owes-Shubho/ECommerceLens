"""Category values, weights and labels taken from the real dataset (Kaggle: E-Commerce Sales and Customer Analytics).

Kept identical to frontend/src/data/catalog.ts so the backend demo data matches the frontend's exactly.
"""

CATEGORIES: dict[str, list[str]] = {
    "Electronics": ["Smartphones", "Laptops", "Tablets", "Headphones", "Smart Watches", "Cameras", "Gaming Consoles", "TVs"],
    "Home Appliances": ["Refrigerators", "Washing Machines", "Microwaves", "Air Conditioners", "Vacuum Cleaners", "Coffee Makers", "Blenders", "Toasters"],
    "Fashion": ["Men's Clothing", "Women's Clothing", "Kids' Clothing", "Shoes", "Accessories", "Bags", "Watches", "Jewelry"],
    "Beauty & Personal Care": ["Skincare", "Makeup", "Hair Care", "Fragrances", "Bath & Body", "Men's Grooming", "Oral Care", "Deodorants"],
    "Home & Kitchen": ["Cookware", "Kitchen Utensils", "Bedding", "Bathroom Accessories", "Furniture", "Decor", "Storage", "Lighting"],
    "Sports & Outdoors": ["Fitness Equipment", "Outdoor Gear", "Camping", "Cycling", "Yoga", "Running", "Team Sports", "Swimming"],
    "Books & Media": ["Fiction", "Non-Fiction", "Academic", "Children's Books", "Comics", "Audiobooks", "Music", "Movies"],
    "Toys & Games": ["Action Figures", "Board Games", "Educational Toys", "Dolls", "Remote Control", "Puzzles", "Arts & Crafts", "Outdoor Toys"],
    "Automotive": ["Car Accessories", "Maintenance", "Tires", "Batteries", "Car Electronics", "Motorcycle Gear", "Tools", "Cleaning"],
    "Health & Wellness": ["Vitamins", "Supplements", "Medical Devices", "Fitness Trackers", "Massagers", "Thermometers", "Blood Pressure Monitors", "First Aid"],
    "Pet Supplies": ["Pet Food", "Pet Toys", "Pet Beds", "Collars & Leashes", "Grooming", "Health Supplies", "Aquariums", "Bird Cages"],
    "Baby & Kids": ["Diapers", "Baby Food", "Baby Gear", "Toys", "Clothing", "Furniture", "Strollers", "Car Seats"],
    "Jewelry": ["Rings", "Necklaces", "Earrings", "Bracelets", "Watches", "Pendants", "Chains", "Gemstones"],
    "Grocery": ["Beverages", "Snacks", "Pantry Staples", "Dairy", "Meat", "Produce", "Frozen Foods", "Organic"],
    "Office Supplies": ["Paper Products", "Writing Instruments", "Office Furniture", "Technology", "Storage", "Mail & Shipping", "Presentation", "Calendars"],
}

CATEGORY_PRICE: dict[str, tuple[float, float]] = {
    "Electronics": (180, 1400), "Home Appliances": (90, 1100), "Fashion": (25, 260), "Beauty & Personal Care": (12, 120),
    "Home & Kitchen": (20, 420), "Sports & Outdoors": (25, 380), "Books & Media": (8, 60), "Toys & Games": (12, 140),
    "Automotive": (15, 320), "Health & Wellness": (12, 240), "Pet Supplies": (10, 160), "Baby & Kids": (15, 380),
    "Jewelry": (60, 1600), "Grocery": (5, 45), "Office Supplies": (8, 420),
}

BRANDS: dict[str, list[str]] = {
    "Electronics": ["Apple", "Samsung", "Sony", "LG", "Dell"],
    "Home Appliances": ["Whirlpool", "Bosch", "LG", "Samsung", "Philips"],
    "Fashion": ["Nike", "Adidas", "Puma", "Zara", "Levi's"],
    "Beauty & Personal Care": ["Kiehl's", "L'Oréal", "Nivea", "Dove", "Clinique"],
    "Home & Kitchen": ["Williams-Sonoma", "IKEA", "KitchenAid", "OXO", "Tefal"],
    "Sports & Outdoors": ["The North Face", "Adidas", "Puma", "Decathlon", "Columbia"],
    "Books & Media": ["McGraw-Hill", "Penguin", "HarperCollins", "Scholastic", "Pearson"],
    "Toys & Games": ["Hasbro", "Mattel", "LEGO", "Fisher-Price", "Ravensburger"],
    "Automotive": ["Castrol", "Mobil", "Bosch", "Michelin", "3M"],
    "Health & Wellness": ["Johnson & Johnson", "Omron", "Nature Made", "Fitbit", "Braun"],
    "Pet Supplies": ["Purina", "Pedigree", "KONG", "Whiskas", "Tetra"],
    "Baby & Kids": ["Pampers", "Graco", "Gerber", "Chicco", "Huggies"],
    "Jewelry": ["Pandora", "Swarovski", "Tiffany & Co.", "Fossil", "Kay"],
    "Grocery": ["Nestlé", "Kellogg's", "Heinz", "Danone", "Organic Valley"],
    "Office Supplies": ["Staples", "3M", "Pilot", "HP", "Moleskine"],
}

CHANNELS = [("Mobile App", 55318), ("Website", 48237), ("Marketplace", 20698), ("Social Media", 13863)]
SEGMENTS = [("Consumer", 75636), ("Premium", 34746), ("VIP", 13957), ("Business", 13777)]
REGIONS = [("South", 43990), ("Central", 29627), ("West", 26273), ("East", 21602), ("North", 16624)]
COUNTRIES = [("USA", 82600), ("UK", 20235), ("Germany", 11593), ("Canada", 7015), ("Australia", 6794), ("India", 5707), ("UAE", 4172)]
PAYMENTS = [("Credit Card", 41460), ("Debit Card", 27635), ("PayPal", 20750), ("Digital Wallet", 16382), ("Cash on Delivery", 13863), ("Buy Now Pay Later", 11061), ("Bank Transfer", 6965)]
SHIPPING = [("Standard", 62006), ("Express", 34373), ("Economy", 27824), ("Same Day", 13913)]
MARKETING = [("Organic Search", 27742), ("Google Ads", 20633), ("Direct", 20515), ("Facebook Ads", 16651), ("Instagram", 13801), ("Email Marketing", 11218), ("Referral", 11191), ("Affiliate", 6848), ("TikTok", 5437), ("YouTube", 4080)]
RETURN_REASONS = ["Wrong Product", "Other", "Changed Mind", "Size Issue", "Defective Product", "Late Delivery", "Product Not as Expected", "Damaged Product"]
GENDERS = [("Female", 66439), ("Male", 66284), ("Non-Binary", 5393)]
WAREHOUSES = [f"WH-{i + 1:03d}" for i in range(20)]
SHIP_DAYS = {"Same Day": (0, 2), "Express": (1, 4), "Standard": (3, 8), "Economy": (5, 14)}

REAL_DATASET = {
    "files": [
        {"name": "ecommerce_sales_customer_analytics_150k.csv", "rows": 138116, "columns": 46, "sizeMB": 48.7, "role": "Wide analytical table, one row per order"},
        {"name": "order_items.csv", "rows": 397569, "columns": 12, "sizeMB": 37.5, "role": "Line-level order metrics"},
        {"name": "customer_master.csv", "rows": 25000, "columns": 11, "sizeMB": 2.2, "role": "Customer attributes"},
        {"name": "product_catalog.csv", "rows": 1175, "columns": 9, "sizeMB": 0.15, "role": "Product attributes"},
        {"name": "dataset_statistics.csv", "rows": 1, "columns": 11, "sizeMB": 0.0003, "role": "Publisher's summary figures"},
    ],
    "dateRange": "2021-01-01 to 2025-12-31",
    "totals": {"revenue": 177134263.74, "profit": 76146395.76, "aov": 1282.5, "rating": 3.68, "returnRate": 6.85, "cancellationRate": 6.08, "customers": 24911},
}

# The 46 columns of ecommerce_sales_customer_analytics_150k.csv (used to validate uploads).
MAIN_TABLE_COLUMNS = (
    "order_id,order_date,order_time,order_status,sales_channel,customer_id,customer_name,customer_age,gender,customer_segment,"
    "customer_type,customer_city,customer_state,customer_country,region,customer_postal_code,payment_method,payment_status,currency,"
    "shipping_method,warehouse,delivery_days,estimated_delivery_days,delivery_status,return_status,return_reason,customer_rating,"
    "review_sentiment,customer_review,marketing_channel,campaign_name,coupon_code,loyalty_points_earned,loyalty_points_redeemed,quantity,"
    "gross_sales,discount_amount,tax_amount,shipping_cost,net_sales,product_cost,profit,profit_margin_percentage,customer_lifetime_value,"
    "is_repeat_customer,customer_order_count"
).split(",")
