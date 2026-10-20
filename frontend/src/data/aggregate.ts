import { monthKey, weekStart } from "./dates";
import type { Order } from "./types";

export interface Kpis {
  orders: number;
  netSales: number;
  grossSales: number;
  discount: number;
  profit: number;
  aov: number;
  marginPct: number;
  returnRate: number;
  cancellationRate: number;
  avgRating: number;
  customers: number;
  onTimeRate: number;
  avgDeliveryDays: number;
  repeatRate: number;
}

export function kpis(orders: Order[]): Kpis {
  let net = 0, gross = 0, disc = 0, profit = 0, realised = 0, returned = 0, cancelled = 0, ratingSum = 0, rated = 0, onTime = 0, shipped = 0, daysSum = 0, repeat = 0;
  const customers = new Set<string>();
  for (const o of orders) {
    net += o.net_sales;
    gross += o.gross_sales;
    disc += o.discount_amount;
    profit += o.profit;
    customers.add(o.customer_id);
    if (o.order_status === "Returned") returned++;
    if (o.order_status === "Cancelled") cancelled++;
    else {
      shipped++;
      daysSum += o.delivery_days;
      if (o.delivery_status !== "Delayed") onTime++;
    }
    if (o.order_status === "Completed" || o.order_status === "Pending") realised++;
    if (o.customer_rating != null) { ratingSum += o.customer_rating; rated++; }
    if (o.is_repeat_customer) repeat++;
  }
  const n = orders.length || 1;
  return {
    orders: orders.length,
    netSales: net,
    grossSales: gross,
    discount: disc,
    profit,
    aov: realised ? net / realised : 0,
    marginPct: net ? (profit / net) * 100 : 0,
    returnRate: (returned / n) * 100,
    cancellationRate: (cancelled / n) * 100,
    avgRating: rated ? ratingSum / rated : 0,
    customers: customers.size,
    onTimeRate: shipped ? (onTime / shipped) * 100 : 0,
    avgDeliveryDays: shipped ? daysSum / shipped : 0,
    repeatRate: (repeat / n) * 100,
  };
}

export const pctChange = (cur: number, prev: number | undefined) => (prev == null || prev === 0 ? undefined : ((cur - prev) / Math.abs(prev)) * 100);
/** Change in percentage points, for metrics that are already percentages. */
export const ppChange = (cur: number, prev: number | undefined) => (prev == null ? undefined : cur - prev);

export interface Group {
  key: string;
  orders: number;
  netSales: number;
  profit: number;
  quantity: number;
  returned: number;
  ratingSum: number;
  rated: number;
  discount: number;
  gross: number;
  customers: Set<string>;
}

export function groupBy(orders: Order[], keyOf: (o: Order) => string): Group[] {
  const m = new Map<string, Group>();
  for (const o of orders) {
    const k = keyOf(o);
    let g = m.get(k);
    if (!g) {
      g = { key: k, orders: 0, netSales: 0, profit: 0, quantity: 0, returned: 0, ratingSum: 0, rated: 0, discount: 0, gross: 0, customers: new Set() };
      m.set(k, g);
    }
    g.orders++;
    g.netSales += o.net_sales;
    g.profit += o.profit;
    g.quantity += o.quantity;
    g.discount += o.discount_amount;
    g.gross += o.gross_sales;
    g.customers.add(o.customer_id);
    if (o.order_status === "Returned") g.returned++;
    if (o.customer_rating != null) { g.ratingSum += o.customer_rating; g.rated++; }
  }
  return [...m.values()];
}

export type Granularity = "Day" | "Week" | "Month";
export const bucketOf = (g: Granularity) => (g === "Day" ? (o: Order) => o.order_date : g === "Week" ? (o: Order) => weekStart(o.order_date) : (o: Order) => monthKey(o.order_date));

export interface SeriesPoint {
  t: string;
  netSales: number;
  profit: number;
  orders: number;
  gross: number;
}

export function timeSeries(orders: Order[], g: Granularity): SeriesPoint[] {
  return groupBy(orders, bucketOf(g))
    .map((x) => ({ t: x.key, netSales: x.netSales, profit: x.profit, orders: x.orders, gross: x.gross }))
    .sort((a, b) => (a.t < b.t ? -1 : 1));
}

export const sortDesc = <T,>(arr: T[], by: (x: T) => number) => [...arr].sort((a, b) => by(b) - by(a));
