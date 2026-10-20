import { addDays, daysBetween, eachDay, toDate } from "./dates";
import {
  BRANDS, CATEGORIES, CATEGORY_PRICE, CHANNELS, COUNTRIES, GENDERS, MARKETING, PAYMENTS, REGIONS, RETURN_REASONS, SEGMENTS, SHIP_DAYS, SHIPPING, WAREHOUSES,
} from "./catalog";
import { createRng } from "./rng";
import type { Customer, DeliveryStatus, DemoData, Order, OrderStatus, Product } from "./types";

const MIN = "2021-01-01";
const MAX = "2025-12-31";
const ADJ = ["Pro", "Lite", "Max", "Classic", "Plus", "Air", "Prime", "Eco", "Ultra", "Smart"];

/** Days with injected spikes or drops, so the anomaly detector has something real to find. */
export const INJECTED_ANOMALIES: Record<string, number> = {
  "2022-03-14": 3.4, "2023-07-04": 0.15, "2023-11-24": 3.8, "2024-05-20": 0.2, "2024-11-29": 4.2, "2025-02-11": 2.9, "2025-08-30": 0.1, "2025-11-28": 3.9,
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Generates a deterministic demo dataset shaped like the real one: ~40k orders, 2,500 customers, 240 products,
 * 2021–2025, with growth, weekly and holiday seasonality, and a few injected anomalies.
 */
export function generateDemoData(seed = 20251231): DemoData {
  const r = createRng(seed);

  const products: Product[] = [];
  let pid = 1;
  for (const [cat, subs] of Object.entries(CATEGORIES)) {
    const [lo, hi] = CATEGORY_PRICE[cat];
    for (let i = 0; i < 16; i++) {
      const sub = subs[i % subs.length];
      const brand = r.pick(BRANDS[cat]);
      // ×2.8 brings the average order value close to the real dataset's $1,282.50.
      const price = round2(Math.exp(r.between(Math.log(lo), Math.log(hi))) * 2.8);
      const marginPct = r.between(0.3, 0.68);
      products.push({
        product_id: `PROD-${String(pid++).padStart(6, "0")}`,
        product_name: `${brand} ${sub} ${r.pick(ADJ)}`,
        product_category: cat,
        product_subcategory: sub,
        brand,
        unit_price: price,
        product_cost: round2(price * (1 - marginPct)),
        product_rating: Math.round(r.between(2.9, 4.9) * 10) / 10,
      });
    }
  }
  // Popularity: a few products sell far more than others.
  const popularity: [string, number][] = products.map((p) => [p.product_id, Math.pow(r.next(), 3) * 10 + 0.2]);
  const productById = new Map(products.map((p) => [p.product_id, p]));

  const customers: Customer[] = [];
  const totalDays = daysBetween(MIN, MAX);
  for (let i = 1; i <= 2500; i++) {
    const region = r.weighted(REGIONS);
    customers.push({
      customer_id: `CUST-${String(i).padStart(6, "0")}`,
      customer_segment: r.weighted(SEGMENTS),
      region,
      customer_country: r.weighted(COUNTRIES),
      gender: r.weighted(GENDERS),
      customer_age: r.int(18, 72),
      // Acquisition skews earlier so most customers are repeat buyers (as in the real data).
      first_order_date: addDays(MIN, Math.floor(Math.pow(r.next(), 1.8) * totalDays)),
    });
  }
  const activity: [string, number][] = customers.map((c) => [c.customer_id, Math.pow(r.next(), 2) * 6 + 0.3]);
  const customerById = new Map(customers.map((c) => [c.customer_id, c]));
  const seenCustomer = new Set<string>();

  const orders: Order[] = [];
  let oid = 300000;
  for (const day of eachDay(MIN, MAX)) {
    const d = toDate(day);
    const t = daysBetween(MIN, day) / totalDays;
    const dow = d.getUTCDay();
    const month = d.getUTCMonth();
    const weekly = dow === 0 || dow === 6 ? 1.18 : dow === 1 ? 0.92 : 1;
    const yearly = month === 10 ? 1.35 : month === 11 ? 1.5 : month === 0 ? 0.85 : month === 6 ? 1.1 : 1;
    const growth = 0.72 + 0.55 * t;
    const shock = INJECTED_ANOMALIES[day] ?? 1;
    const expected = 20 * weekly * yearly * growth * shock;
    const n = Math.max(0, Math.round(r.normal(expected, Math.sqrt(expected) * 0.9)));

    for (let k = 0; k < n; k++) {
      // Pick a customer who had already been acquired by this date.
      let cust: Customer | undefined;
      for (let tries = 0; tries < 6 && !cust; tries++) {
        const c = customerById.get(r.weighted(activity))!;
        if (c.first_order_date <= day) cust = c;
      }
      if (!cust) cust = customers[r.int(0, customers.length - 1)];
      const product = productById.get(r.weighted(popularity))!;
      const channel = r.weighted(CHANNELS);
      const shipping = r.weighted(SHIPPING);
      const qty = Math.max(1, Math.round(r.between(1, product.unit_price > 600 ? 3 : 9)));
      const gross = round2(product.unit_price * qty * r.between(0.95, 1.08));
      const discRate = r.next() < 0.55 ? r.between(0.02, 0.3) : 0;
      const discount = round2(gross * discRate);
      const net = round2(gross - discount);
      const cost = round2(product.product_cost * qty);

      const statusRoll = r.next();
      const status: OrderStatus = statusRoll < 0.0608 ? "Cancelled" : statusRoll < 0.0608 + 0.0685 ? "Returned" : statusRoll < 0.0608 + 0.0685 + 0.0485 ? "Pending" : "Completed";
      const [dmin, dmax] = SHIP_DAYS[shipping];
      const days = status === "Cancelled" ? 0 : r.int(dmin, dmax);
      const late = r.next();
      const delivery: DeliveryStatus = status === "Cancelled" ? "Cancelled" : late < 0.14 + (shipping === "Economy" ? 0.06 : 0) ? "Delayed" : late < 0.24 ? "Early" : "On Time";
      const rating = status === "Cancelled" ? null : Math.min(5, Math.max(1, Math.round(r.normal(product.product_rating - (delivery === "Delayed" ? 0.5 : 0) - (status === "Returned" ? 0.9 : 0), 0.6) * 10) / 10));
      const repeat = seenCustomer.has(cust.customer_id);
      seenCustomer.add(cust.customer_id);
      const realised = status === "Cancelled" || status === "Returned" ? 0 : 1;

      orders.push({
        order_id: `ORD-${oid++}`,
        order_date: day,
        order_status: status,
        sales_channel: channel,
        customer_id: cust.customer_id,
        customer_segment: cust.customer_segment,
        region: cust.region,
        customer_country: cust.customer_country,
        product_id: product.product_id,
        product_category: product.product_category,
        product_subcategory: product.product_subcategory,
        brand: product.brand,
        payment_method: r.weighted(PAYMENTS),
        shipping_method: shipping,
        warehouse: r.pick(WAREHOUSES),
        delivery_days: days,
        delivery_status: delivery,
        return_reason: status === "Returned" ? r.pick(RETURN_REASONS) : "",
        customer_rating: rating,
        marketing_channel: r.weighted(MARKETING),
        quantity: qty,
        gross_sales: gross,
        discount_amount: discount,
        net_sales: net * realised,
        product_cost: cost * realised,
        profit: round2((net - cost) * realised),
        is_repeat_customer: repeat,
      });
    }
  }
  return { orders, customers, products, minDate: MIN, maxDate: MAX };
}
