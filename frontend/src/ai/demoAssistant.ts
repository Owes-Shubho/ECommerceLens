// Rule-based stand-in for the LLM pipeline (Phases 11–15). It follows the same contract:
// guardrails → intent + schema mapping → structured query plan → safe execution on the data → answer from results.
import { groupBy, sortDesc, timeSeries } from "@/data/aggregate";
import { CATEGORIES, CHANNELS, COUNTRIES, REGIONS, SEGMENTS } from "@/data/catalog";
import { fmtMonth } from "@/data/dates";
import type { Order } from "@/data/types";
import { money, moneyExact, pct } from "@/lib/format";
import { demoDb } from "@/services/demoDb";
import { PRICE, type GuardResult, type ModelTier } from "@/store/aiLog";

export type Metric = "net_sales" | "profit" | "orders" | "aov" | "margin" | "return_rate" | "rating";
export type Dimension = "product_category" | "sales_channel" | "region" | "customer_segment" | "payment_method" | "customer_country" | "marketing_channel" | "shipping_method" | "product_id" | "month";

export interface QueryPlan {
  intent: "group" | "ranking" | "trend" | "total";
  metric: Metric;
  aggregation: "sum" | "avg" | "count" | "rate";
  group_by: Dimension[];
  filters: { column: string; op: "=" | "between"; value: string | [string, string] }[];
  order?: "desc" | "asc";
  limit?: number;
}

export interface AssistantReply {
  text: string;
  guard: GuardResult;
  guardRule?: string;
  plan?: QueryPlan;
  table?: { columns: { key: string; label: string; align?: "right" }[]; rows: Record<string, string | number>[] };
  chart?: { kind: "bar" | "line"; x: string[]; y: number[]; label: string; isMoney: boolean };
  model: ModelTier;
  tokensBaseline: number;
  tokensOptimized: number;
  latencyMs: number;
  costUsd: number;
  intent: string;
  repairedNote?: string;
}

const METRIC_LABEL: Record<Metric, string> = { net_sales: "net sales", profit: "profit", orders: "orders", aov: "average order value", margin: "profit margin", return_rate: "return rate", rating: "average rating" };
const DIM_LABEL: Record<Dimension, string> = { product_category: "category", sales_channel: "channel", region: "region", customer_segment: "segment", payment_method: "payment method", customer_country: "country", marketing_channel: "marketing channel", shipping_method: "shipping method", product_id: "product", month: "month" };

const BLOCK_RULES: [RegExp, string, string][] = [
  [/\b(drop|delete|truncate|insert|update|alter|remove all|wipe)\b/i, "Query Guard: write operation", "Lens only runs read-only analytical queries, so requests that change or delete data are blocked."],
  [/\b(import os|subprocess|exec\(|eval\(|__import__|rm -rf|shell)\b/i, "Execution Guard: code execution", "Lens never runs generated code. Ask an analytical question instead."],
  [/\b(ignore (all|previous|the) (instructions|rules)|system prompt|jailbreak)\b/i, "Input Guard: prompt injection", "That looks like an attempt to change Lens's instructions, so it was blocked."],
  [/\b(e-?mails?|phones?|phone numbers?|(home |street )?address(es)?|postal codes?|zip codes?|full names?|customer names?|passwords?|credit card numbers?)\b/i, "Privacy Guard: personal data", "Personal fields (names, contact details, postal codes) are never shown or sent to the model. You can ask about customer IDs, segments and regions."],
];

const METRIC_WORDS: [RegExp, Metric][] = [
  [/return rate|returns?\b/i, "return_rate"], [/margin/i, "margin"], [/profit/i, "profit"], [/\baov\b|average order value|basket/i, "aov"],
  [/rating|review|satisf/i, "rating"], [/\borders?\b|how many|count|volume/i, "orders"], [/revenue|sales|turnover|income/i, "net_sales"],
];
const DIM_WORDS: [RegExp, Dimension, boolean?][] = [
  [/marketing|campaign|traffic source/i, "marketing_channel"], [/categor/i, "product_category"], [/channel|platform/i, "sales_channel"], [/region/i, "region"],
  [/segment/i, "customer_segment"], [/payment/i, "payment_method"], [/countr|nation/i, "customer_country"], [/shipping|delivery method/i, "shipping_method"],
  [/products?\b|items?\b|sku/i, "product_id"], [/month|monthly|trend|over time/i, "month"],
  // synonyms the schema guard repairs
  [/department|dept/i, "product_category", true], [/area|territor/i, "region", true], [/store type|shop type/i, "sales_channel", true],
];

const VALUE_FILTERS: { column: keyof Order; values: string[] }[] = [
  { column: "sales_channel", values: CHANNELS.map((c) => c[0]) },
  { column: "region", values: REGIONS.map((c) => c[0]) },
  { column: "customer_segment", values: SEGMENTS.map((c) => c[0]) },
  { column: "customer_country", values: COUNTRIES.map((c) => c[0]) },
  { column: "product_category", values: Object.keys(CATEGORIES) },
];

/** Which dimension the question groups by: "top N <x>", then "by/per <x>", then any dimension word not used as a filter. */
function pickDim(q: string) {
  const top = /\btop\s*\d*\s+([a-z]+)/i.exec(q)?.[1];
  if (top) {
    const hit = DIM_WORDS.find(([re]) => re.test(top));
    if (hit) return hit;
  }
  const by = /\b(?:by|per|across|for each)\s+([a-z]+(?:\s+[a-z]+)?)/i.exec(q)?.[1];
  if (by) {
    const hit = DIM_WORDS.find(([re]) => re.test(by));
    if (hit) return hit;
  }
  const filtered = new Set(VALUE_FILTERS.filter((vf) => vf.values.some((v) => new RegExp(`\\b${v.replace(/[.*+?^${}()|[\]\\&]/g, "\\$&")}\\b`, "i").test(q))).map((vf) => vf.column as string));
  return DIM_WORDS.find(([re, d]) => re.test(q) && !filtered.has(d));
}

export interface ConversationContext {
  lastPlan?: QueryPlan;
}

function detectYear(q: string) {
  const m = /\b(202[1-5])\b/.exec(q);
  if (m) return m[1];
  if (/this year|last 12|past year/i.test(q)) return "2025";
  if (/last year|previous year/i.test(q)) return "2024";
  return null;
}

function metricValue(m: Metric, g: ReturnType<typeof groupBy>[number]) {
  switch (m) {
    case "net_sales": return g.netSales;
    case "profit": return g.profit;
    case "orders": return g.orders;
    case "aov": return g.orders ? g.netSales / g.orders : 0;
    case "margin": return g.netSales ? (g.profit / g.netSales) * 100 : 0;
    case "return_rate": return g.orders ? (g.returned / g.orders) * 100 : 0;
    case "rating": return g.rated ? g.ratingSum / g.rated : 0;
  }
}
const fmtMetric = (m: Metric, v: number) => (m === "net_sales" || m === "profit" ? money(v) : m === "aov" ? moneyExact(v) : m === "margin" || m === "return_rate" ? pct(v) : m === "rating" ? v.toFixed(2) : Math.round(v).toLocaleString("en-US"));
const aggFor = (m: Metric): QueryPlan["aggregation"] => (m === "orders" ? "count" : m === "aov" || m === "rating" ? "avg" : m === "margin" || m === "return_rate" ? "rate" : "sum");

/** Rough token estimate (≈4 chars per token). */
const tok = (s: string) => Math.ceil(s.length / 4);
const SCHEMA_FULL = 46 * 38 + 4 * 11 * 30; // every column described, all files
function cost(model: ModelTier, tokens: number) {
  return (tokens / 1000) * PRICE[model];
}

export function ask(question: string, ctx: ConversationContext, seed: number): AssistantReply {
  const q = question.trim();
  const jitter = ((seed * 9301 + 49297) % 233280) / 233280;
  const baseTokens = SCHEMA_FULL + tok(q) + 600;

  for (const [re, rule, msg] of BLOCK_RULES) {
    if (re.test(q)) {
      return { text: msg, guard: "blocked", guardRule: rule, model: "fast", tokensBaseline: baseTokens, tokensOptimized: tok(q) + 120, latencyMs: 40 + Math.round(jitter * 60), costUsd: 0, intent: "blocked" };
    }
  }

  // Metric & dimension, falling back to the previous turn (follow-up questions).
  const prev = ctx.lastPlan;
  let metric = METRIC_WORDS.find(([re]) => re.test(q))?.[1];
  const dimHit = pickDim(q);
  let dim = dimHit?.[1];
  const repaired = dimHit?.[2] ? `"${dimHit[0].exec(q)?.[0]}" is not a column; Lens used ${dim} instead.` : undefined;
  const hasScope = VALUE_FILTERS.some((vf) => vf.values.some((v) => q.toLowerCase().includes(v.toLowerCase()))) || !!detectYear(q);
  const followUp = !!prev && (/^(what about|and|how about|only|now|same|just|for|in)\b/i.test(q) || (!metric && !dim && hasScope));
  if (!metric) metric = followUp ? prev!.metric : undefined;
  if (!dim && followUp) dim = prev!.group_by[0];

  if (!metric && !dim) {
    return {
      text: "I can answer questions about sales, profit, margin, orders, average order value, return rate and ratings, broken down by category, channel, region, segment, country, payment or marketing channel, or over time. Try one of the suggestions below.",
      guard: "passed", model: "fast", tokensBaseline: baseTokens, tokensOptimized: tok(q) + 380, latencyMs: 600 + Math.round(jitter * 400), costUsd: cost("fast", tok(q) + 380), intent: "help",
    };
  }
  metric = metric ?? "net_sales";

  // Filters: explicit values in the question, plus the previous turn's on a follow-up.
  const filters: QueryPlan["filters"] = followUp ? [...(prev?.filters ?? [])] : [];
  for (const vf of VALUE_FILTERS) {
    const hit = vf.values.find((v) => new RegExp(`\\b${v.replace(/[.*+?^${}()|[\]\\&]/g, "\\$&")}\\b`, "i").test(q));
    if (hit && dim !== vf.column) {
      const i = filters.findIndex((x) => x.column === vf.column);
      if (i >= 0) filters.splice(i, 1);
      filters.push({ column: vf.column, op: "=", value: hit });
    }
  }
  const year = detectYear(q);
  if (year) {
    const i = filters.findIndex((x) => x.column === "order_date");
    if (i >= 0) filters.splice(i, 1);
    filters.push({ column: "order_date", op: "between", value: [`${year}-01-01`, `${year}-12-31`] });
  }

  const ranking = /\btop\b|best|highest|most|largest|biggest|lowest|worst|least/i.test(q);
  const asc = /lowest|worst|least|smallest/i.test(q);
  const limitMatch = /\btop (\d+)/i.exec(q);
  const trend = dim === "month";
  const plan: QueryPlan = {
    intent: trend ? "trend" : dim ? (ranking ? "ranking" : "group") : "total",
    metric,
    aggregation: aggFor(metric),
    group_by: dim ? [dim] : [],
    filters,
    ...(dim && !trend ? { order: asc ? ("asc" as const) : ("desc" as const) } : {}),
    ...(dim === "product_id" || limitMatch ? { limit: limitMatch ? Number(limitMatch[1]) : 5 } : {}),
  };

  // Execute the plan on the data (read-only).
  const db = demoDb();
  const rows = db.orders.filter((o) =>
    plan.filters.every((f) => (f.op === "=" ? String(o[f.column as keyof Order]) === f.value : o.order_date >= (f.value as string[])[0] && o.order_date <= (f.value as string[])[1])),
  );
  const scope = plan.filters.map((f) => (f.op === "=" ? `${f.value}` : `${(f.value as string[])[0].slice(0, 4)}`)).join(", ");
  const scopeText = scope ? ` (${scope})` : "";
  const model: ModelTier = trend || plan.filters.length >= 2 ? "reasoning" : "fast";
  const optimized = 420 + tok(q) + plan.group_by.length * 90 + plan.filters.length * 40 + (followUp ? 160 : 0);
  const latency = Math.round((model === "reasoning" ? 2400 : 900) + jitter * 900 + (repaired ? 700 : 0));
  const meta = { model, tokensBaseline: baseTokens, tokensOptimized: optimized, latencyMs: latency, costUsd: cost(model, optimized), guard: (repaired ? "repaired" : "passed") as GuardResult, guardRule: repaired ? "Schema Guard: unknown column" : undefined, repairedNote: repaired, plan, intent: plan.intent };

  if (!rows.length) return { ...meta, text: `No orders match${scopeText}. Try a wider filter.` };

  const label = METRIC_LABEL[metric];
  if (trend) {
    const ts = groupBy(rows, (o) => o.order_date.slice(0, 7)).sort((a, b) => (a.key < b.key ? -1 : 1));
    const y = ts.map((g) => metricValue(metric!, g));
    const hi = ts[y.indexOf(Math.max(...y))];
    const lo = ts[y.indexOf(Math.min(...y))];
    const first = y[0], last = y[y.length - 1];
    return {
      ...meta,
      text: `Monthly ${label}${scopeText} peaked in **${fmtMonth(hi.key)}** at ${fmtMetric(metric, metricValue(metric, hi))} and was lowest in ${fmtMonth(lo.key)} (${fmtMetric(metric, metricValue(metric, lo))}). From the first to the last month it moved from ${fmtMetric(metric, first)} to ${fmtMetric(metric, last)}.`,
      chart: { kind: "line", x: ts.map((g) => g.key), y, label, isMoney: metric === "net_sales" || metric === "profit" || metric === "aov" },
    };
  }
  if (!dim) {
    const g = groupBy(rows, () => "all")[0];
    return { ...meta, text: `Total ${label}${scopeText}: **${fmtMetric(metric, metricValue(metric, g))}** across ${g.orders.toLocaleString("en-US")} orders.` };
  }

  const pmap = new Map(db.products.map((p) => [p.product_id, p]));
  let groups = groupBy(rows, (o) => String(o[dim as keyof Order]));
  if (metric === "margin" || metric === "return_rate" || metric === "rating" || metric === "aov") groups = groups.filter((g) => g.orders >= 5);
  groups = sortDesc(groups, (g) => metricValue(metric!, g));
  if (plan.order === "asc") groups.reverse();
  const shown = plan.limit ? groups.slice(0, plan.limit) : groups;
  const name = (k: string) => (dim === "product_id" ? pmap.get(k)?.product_name ?? k : k);
  const top = shown[0];
  const second = shown[1];
  const dl = DIM_LABEL[dim];
  let text = `**${name(top.key)}** has the ${asc ? "lowest" : "highest"} ${label}${scopeText} at ${fmtMetric(metric, metricValue(metric, top))}`;
  text += second ? `, ${asc ? "below" : "ahead of"} ${name(second.key)} (${fmtMetric(metric, metricValue(metric, second))}).` : ".";
  if (!ranking && shown.length > 2) {
    const last = shown[shown.length - 1];
    text += ` The ${dl} with the ${asc ? "highest" : "lowest"} ${label} is ${name(last.key)} at ${fmtMetric(metric, metricValue(metric, last))}.`;
  }
  return {
    ...meta,
    text,
    table: {
      columns: [{ key: "name", label: dl[0].toUpperCase() + dl.slice(1) }, { key: "value", label: label[0].toUpperCase() + label.slice(1), align: "right" }, { key: "orders", label: "Orders", align: "right" }],
      rows: shown.map((g) => ({ name: name(g.key), value: fmtMetric(metric!, metricValue(metric!, g)), orders: g.orders.toLocaleString("en-US") })),
    },
    chart: shown.length <= 15 ? { kind: "bar", x: shown.map((g) => name(g.key)), y: shown.map((g) => metricValue(metric!, g)), label, isMoney: metric === "net_sales" || metric === "profit" || metric === "aov" } : undefined,
  };
}

export const SUGGESTIONS = [
  "Which category had the highest profit margin in 2024?",
  "Revenue by sales channel",
  "What about profit?",
  "Monthly net sales trend in 2025",
  "Top 5 products by revenue in the South region",
  "Return rate by shipping method",
  "Average order value by segment for Mobile App",
  "Delete all cancelled orders",
];

export const PRESETS = [
  { label: "Dataset overview", question: "Total revenue" },
  { label: "Trend analysis", question: "Monthly net sales trend in 2025" },
  { label: "Profitability", question: "Profit margin by category" },
  { label: "Channel mix", question: "Revenue by sales channel in 2025" },
];

export { timeSeries };
