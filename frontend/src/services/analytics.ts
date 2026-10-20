// Demo analytics service. Every function has the shape the Flask analytics API will have:
// it takes the global filters and returns ready-to-render aggregates. Swap the bodies for fetch() calls later.
import { groupBy, kpis, pctChange, ppChange, sortDesc, timeSeries, type Granularity, type Kpis } from "@/data/aggregate";
import { addDays, daysBetween, monthKey } from "@/data/dates";
import { inRange, matchesDims, periodFor, type Filters, type Period } from "@/data/filters";
import type { Order } from "@/data/types";
import { money, pct } from "@/lib/format";
import { demoDb } from "./demoDb";

const LATENCY = 120;
export const delay = <T,>(v: T, ms = LATENCY) => new Promise<T>((res) => setTimeout(() => res(v), ms));

export function scoped(f: Filters) {
  const db = demoDb();
  const period = periodFor(f.range, db.minDate, db.maxDate);
  const dims = db.orders.filter((o) => matchesDims(o, f));
  const cur = dims.filter((o) => inRange(o, period.from, period.to));
  const prev = period.prev ? dims.filter((o) => inRange(o, period.prev!.from, period.prev!.to)) : [];
  return { db, period, dims, cur, prev };
}

export const autoGranularity = (f: Filters): Granularity => (f.range === "30D" ? "Day" : f.range === "90D" || f.range === "YTD" ? "Week" : "Month");

export interface KpiDelta {
  value: number;
  delta?: number;
}
const withDelta = (cur: Kpis, prev: Kpis | null, key: keyof Kpis, mode: "pct" | "pp" = "pct"): KpiDelta => ({
  value: cur[key],
  delta: prev ? (mode === "pct" ? pctChange(cur[key], prev[key]) : ppChange(cur[key], prev[key])) : undefined,
});

/* ---------- Executive overview ---------- */
export async function getOverview(f: Filters) {
  const { cur, prev, period } = scoped(f);
  const k = kpis(cur);
  const p = prev.length ? kpis(prev) : null;
  const g = autoGranularity(f);
  const byCategory = sortDesc(groupBy(cur, (o) => o.product_category), (x) => x.netSales);
  const byChannel = sortDesc(groupBy(cur, (o) => o.sales_channel), (x) => x.netSales);
  const byRegion = sortDesc(groupBy(cur, (o) => o.region), (x) => x.netSales);
  const byProduct = sortDesc(groupBy(cur, (o) => o.product_id), (x) => x.netSales).slice(0, 8);
  const db = demoDb();
  const pmap = new Map(db.products.map((x) => [x.product_id, x]));
  const topProducts = byProduct.map((x) => ({
    product_id: x.key,
    product_name: pmap.get(x.key)?.product_name ?? x.key,
    product_category: pmap.get(x.key)?.product_category ?? "",
    orders: x.orders,
    net_sales: x.netSales,
    margin: x.netSales ? (x.profit / x.netSales) * 100 : 0,
  }));

  // Data story: short computed observations.
  const insights: string[] = [];
  if (byCategory[0]) insights.push(`${byCategory[0].key} is the largest category with ${money(byCategory[0].netSales)} in net sales (${pct((byCategory[0].netSales / k.netSales) * 100)} of the total).`);
  const bestMargin = sortDesc(byCategory.filter((c) => c.netSales > k.netSales * 0.02), (c) => c.profit / c.netSales)[0];
  if (bestMargin) insights.push(`${bestMargin.key} has the highest margin at ${pct((bestMargin.profit / bestMargin.netSales) * 100)}.`);
  if (byChannel[0]) insights.push(`${byChannel[0].key} brings in ${pct((byChannel[0].netSales / k.netSales) * 100)} of revenue, the most of any channel.`);
  const ns = pctChange(k.netSales, p?.netSales);
  if (ns != null) insights.push(`Net sales are ${ns >= 0 ? "up" : "down"} ${pct(Math.abs(ns))} ${period.prevLabel.replace("vs ", "on the ")}.`);

  return delay({
    period,
    granularity: g,
    kpis: {
      netSales: withDelta(k, p, "netSales"),
      profit: withDelta(k, p, "profit"),
      orders: withDelta(k, p, "orders"),
      aov: withDelta(k, p, "aov"),
      returnRate: withDelta(k, p, "returnRate", "pp"),
      avgRating: withDelta(k, p, "avgRating", "pct"),
    },
    trend: timeSeries(cur, g),
    byCategory: byCategory.map((x) => ({ key: x.key, netSales: x.netSales, profit: x.profit, orders: x.orders })),
    byChannel: byChannel.map((x) => ({ key: x.key, netSales: x.netSales, orders: x.orders })),
    byRegion: byRegion.map((x) => ({ key: x.key, netSales: x.netSales, orders: x.orders })),
    topProducts,
    insights,
  });
}

/* ---------- Sales ---------- */
export async function getSales(f: Filters, g: Granularity) {
  const { cur, prev, period } = scoped(f);
  const k = kpis(cur);
  const p = prev.length ? kpis(prev) : null;
  const dim = (key: (o: Order) => string) =>
    sortDesc(groupBy(cur, key), (x) => x.netSales).map((x) => ({
      key: x.key,
      orders: x.orders,
      netSales: x.netSales,
      profit: x.profit,
      aov: x.orders ? x.netSales / x.orders : 0,
      discountPct: x.gross ? (x.discount / x.gross) * 100 : 0,
      marginPct: x.netSales ? (x.profit / x.netSales) * 100 : 0,
    }));
  // Discount band vs margin: is discounting paying off?
  const band = (o: Order) => {
    const d = o.gross_sales ? (o.discount_amount / o.gross_sales) * 100 : 0;
    return d === 0 ? "0%" : d < 10 ? "1–10%" : d < 20 ? "10–20%" : "20–30%";
  };
  const bands = ["0%", "1–10%", "10–20%", "20–30%"].map((b) => {
    const grp = groupBy(cur.filter((o) => band(o) === b), () => b)[0];
    return { key: b, orders: grp?.orders ?? 0, marginPct: grp && grp.netSales ? (grp.profit / grp.netSales) * 100 : 0, aov: grp && grp.orders ? grp.netSales / grp.orders : 0 };
  });
  return delay({
    period,
    kpis: {
      netSales: withDelta(k, p, "netSales"),
      grossSales: withDelta(k, p, "grossSales"),
      discount: withDelta(k, p, "discount"),
      marginPct: withDelta(k, p, "marginPct", "pp"),
    },
    trend: timeSeries(cur, g),
    byChannel: dim((o) => o.sales_channel),
    byPayment: dim((o) => o.payment_method),
    byMarketing: dim((o) => o.marketing_channel),
    byCountry: dim((o) => o.customer_country),
    discountBands: bands,
  });
}

/* ---------- Customers (RFM) ---------- */
export const RFM_SEGMENTS = ["Champions", "Loyal", "Potential loyalists", "New", "Need attention", "At risk", "Hibernating"] as const;
export type RfmSegment = (typeof RFM_SEGMENTS)[number];

function rfmSegment(r: number, fq: number, m: number): RfmSegment {
  if (r >= 4 && fq >= 4 && m >= 4) return "Champions";
  if (fq >= 4 && r >= 3) return "Loyal";
  if (r >= 4 && fq <= 2) return "New";
  if (r >= 3 && fq >= 2) return "Potential loyalists";
  if (r <= 2 && fq >= 3) return "At risk";
  if (r === 3) return "Need attention";
  return "Hibernating";
}

const quintile = (sortedAsc: number[], v: number) => {
  let lo = 0, hi = sortedAsc.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sortedAsc[mid] < v) lo = mid + 1;
    else hi = mid;
  }
  return Math.min(5, Math.floor((lo / sortedAsc.length) * 5) + 1);
};

export async function getCustomers(f: Filters) {
  const { db, dims, cur, prev, period } = scoped(f);
  // RFM uses each customer's full history up to the end of the period (dimension filters apply).
  const hist = dims.filter((o) => o.order_date <= period.to && o.order_status !== "Cancelled");
  const per = new Map<string, { last: string; freq: number; spend: number; region: string; segment: string }>();
  for (const o of hist) {
    const c = per.get(o.customer_id) ?? { last: o.order_date, freq: 0, spend: 0, region: o.region, segment: o.customer_segment };
    c.freq++;
    c.spend += o.net_sales;
    if (o.order_date > c.last) c.last = o.order_date;
    per.set(o.customer_id, c);
  }
  const rows = [...per.entries()].map(([id, c]) => ({ id, ...c, recency: daysBetween(c.last, period.to) }));
  const recs = rows.map((r) => -r.recency).sort((a, b) => a - b);
  const freqs = rows.map((r) => r.freq).sort((a, b) => a - b);
  const mons = rows.map((r) => r.spend).sort((a, b) => a - b);
  const scored = rows.map((r) => {
    const R = quintile(recs, -r.recency), F = quintile(freqs, r.freq), M = quintile(mons, r.spend);
    return { ...r, R, F, M, rfm: rfmSegment(R, F, M) };
  });
  // Heatmap: R (rows) × F (cols), customer counts.
  const grid = Array.from({ length: 5 }, () => Array(5).fill(0) as number[]);
  for (const s of scored) grid[s.R - 1][s.F - 1]++;
  const totalSpend = scored.reduce((a, b) => a + b.spend, 0) || 1;
  const segments = RFM_SEGMENTS.map((name) => {
    const m = scored.filter((s) => s.rfm === name);
    const spend = m.reduce((a, b) => a + b.spend, 0);
    return {
      segment: name,
      customers: m.length,
      revenueShare: (spend / totalSpend) * 100,
      avgSpend: m.length ? spend / m.length : 0,
      avgOrders: m.length ? m.reduce((a, b) => a + b.freq, 0) / m.length : 0,
      avgRecency: m.length ? m.reduce((a, b) => a + b.recency, 0) / m.length : 0,
    };
  }).filter((s) => s.customers > 0);
  const top = sortDesc(scored, (s) => s.spend).slice(0, 10).map((s) => ({
    customer_id: s.id, customer_segment: s.segment, region: s.region, orders: s.freq, spend: s.spend, last_order: s.last, rfm: s.rfm,
  }));
  // New vs returning orders per month in the period.
  const nvr = groupBy(cur, (o) => monthKey(o.order_date)).sort((a, b) => (a.key < b.key ? -1 : 1)).map((g) => {
    const os = cur.filter((o) => monthKey(o.order_date) === g.key);
    return { t: g.key, newCustomers: os.filter((o) => !o.is_repeat_customer).length, returning: os.filter((o) => o.is_repeat_customer).length };
  });
  const bySegment = sortDesc(groupBy(cur, (o) => o.customer_segment), (x) => x.netSales).map((x) => ({ key: x.key, netSales: x.netSales, customers: x.customers.size, aov: x.orders ? x.netSales / x.orders : 0 }));
  const k = kpis(cur), p = prev.length ? kpis(prev) : null;
  const clvValues = scored.map((s) => s.spend);
  return delay({
    period,
    totalCustomers: db.customers.length,
    kpis: {
      customers: withDelta(k, p, "customers"),
      repeatRate: withDelta(k, p, "repeatRate", "pp"),
      avgSpend: { value: scored.length ? totalSpend / scored.length : 0 } as KpiDelta,
      championsShare: { value: scored.length ? (scored.filter((s) => s.rfm === "Champions").length / scored.length) * 100 : 0 } as KpiDelta,
    },
    grid,
    segments,
    top,
    newVsReturning: nvr,
    bySegment,
    clvValues,
  });
}

/* ---------- Products ---------- */
export async function getProducts(f: Filters, focusCategory: string | null) {
  const { cur, db } = scoped(f);
  const pmap = new Map(db.products.map((x) => [x.product_id, x]));
  const byCategory = sortDesc(groupBy(cur, (o) => o.product_category), (x) => x.netSales).map((x) => ({
    key: x.key, netSales: x.netSales, marginPct: x.netSales ? (x.profit / x.netSales) * 100 : 0, returnRate: x.orders ? (x.returned / x.orders) * 100 : 0, rating: x.rated ? x.ratingSum / x.rated : 0, orders: x.orders,
  }));
  const scope = focusCategory ? cur.filter((o) => o.product_category === focusCategory) : cur;
  const bySub = sortDesc(groupBy(scope, (o) => (focusCategory ? o.product_subcategory : o.product_category)), (x) => x.netSales).map((x) => ({ key: x.key, netSales: x.netSales, profit: x.profit }));
  const products = groupBy(scope, (o) => o.product_id).map((x) => {
    const p = pmap.get(x.key)!;
    return {
      product_id: x.key, product_name: p.product_name, product_category: p.product_category, brand: p.brand,
      orders: x.orders, units: x.quantity, net_sales: x.netSales, margin: x.netSales ? (x.profit / x.netSales) * 100 : 0,
      return_rate: x.orders ? (x.returned / x.orders) * 100 : 0, rating: x.rated ? x.ratingSum / x.rated : 0,
    };
  });
  const brands = sortDesc(groupBy(scope, (o) => o.brand), (x) => x.netSales).slice(0, 10).map((x) => ({ key: x.key, netSales: x.netSales }));
  return delay({ byCategory, bySub, products, brands, catalogSize: db.products.length });
}

/* ---------- Operations ---------- */
export async function getOperations(f: Filters) {
  const { cur, prev, period } = scoped(f);
  const k = kpis(cur), p = prev.length ? kpis(prev) : null;
  const shipped = cur.filter((o) => o.order_status !== "Cancelled");
  const statuses = ["Early", "On Time", "Delayed"] as const;
  const byShipping = ["Same Day", "Express", "Standard", "Economy"].map((m) => {
    const os = shipped.filter((o) => o.shipping_method === m);
    const n = os.length || 1;
    return { key: m, orders: os.length, avgDays: os.reduce((a, b) => a + b.delivery_days, 0) / n, ...Object.fromEntries(statuses.map((s) => [s, (os.filter((o) => o.delivery_status === s).length / n) * 100])) } as Record<string, number | string>;
  });
  const hist = Array.from({ length: 15 }, (_, d) => ({ days: d, orders: shipped.filter((o) => o.delivery_days === d).length }));
  const reasons = sortDesc(groupBy(cur.filter((o) => o.order_status === "Returned"), (o) => o.return_reason), (x) => x.orders).map((x) => ({ key: x.key, orders: x.orders }));
  const warehouses = groupBy(cur, (o) => o.warehouse).map((x) => {
    const os = shipped.filter((o) => o.warehouse === x.key);
    return {
      warehouse: x.key, orders: x.orders,
      avg_days: os.length ? os.reduce((a, b) => a + b.delivery_days, 0) / os.length : 0,
      on_time: os.length ? (os.filter((o) => o.delivery_status !== "Delayed").length / os.length) * 100 : 0,
      return_rate: x.orders ? (x.returned / x.orders) * 100 : 0,
    };
  });
  const cancelTrend = groupBy(cur, (o) => monthKey(o.order_date)).sort((a, b) => (a.key < b.key ? -1 : 1)).map((g) => {
    const os = cur.filter((o) => monthKey(o.order_date) === g.key);
    return { t: g.key, cancelled: (os.filter((o) => o.order_status === "Cancelled").length / os.length) * 100, returned: (os.filter((o) => o.order_status === "Returned").length / os.length) * 100 };
  });
  return delay({
    period,
    kpis: {
      onTimeRate: withDelta(k, p, "onTimeRate", "pp"),
      avgDeliveryDays: withDelta(k, p, "avgDeliveryDays"),
      cancellationRate: withDelta(k, p, "cancellationRate", "pp"),
      returnRate: withDelta(k, p, "returnRate", "pp"),
    },
    byShipping, hist, reasons, warehouses, cancelTrend,
  });
}

/* ---------- Daily series for forecasting and anomalies (whole history, dimension filters apply) ---------- */
export function dailySeries(f: Pick<Filters, "region" | "channel" | "category" | "segment">) {
  const db = demoDb();
  const full = { ...f, range: "All" as const };
  const m = new Map<string, { net: number; orders: number }>();
  for (const o of db.orders) {
    if (!matchesDims(o, full)) continue;
    const e = m.get(o.order_date) ?? { net: 0, orders: 0 };
    e.net += o.net_sales;
    e.orders++;
    m.set(o.order_date, e);
  }
  const out: { t: string; net: number; orders: number }[] = [];
  for (let d = db.minDate; d <= db.maxDate; d = addDays(d, 1)) out.push({ t: d, ...(m.get(d) ?? { net: 0, orders: 0 }) });
  return out;
}

export type { Period };
