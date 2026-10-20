import { addDays } from "./dates";
import type { Order } from "./types";

export type RangeKey = "30D" | "90D" | "YTD" | "1Y" | "All";
export const RANGES: RangeKey[] = ["30D", "90D", "YTD", "1Y", "All"];

export interface Filters {
  range: RangeKey;
  region: string;
  channel: string;
  category: string;
  segment: string;
}

export const ALL = "All";
export const DEFAULT_FILTERS: Filters = { range: "1Y", region: ALL, channel: ALL, category: ALL, segment: ALL };

export interface Period {
  from: string;
  to: string;
  /** The period of equal length right before, for deltas. Null for "All". */
  prev: { from: string; to: string } | null;
  label: string;
  prevLabel: string;
}

export function periodFor(range: RangeKey, minDate: string, maxDate: string): Period {
  const len = { "30D": 30, "90D": 90, "1Y": 365 } as const;
  if (range === "All") return { from: minDate, to: maxDate, prev: null, label: "2021–2025", prevLabel: "" };
  if (range === "YTD") {
    const from = `${maxDate.slice(0, 4)}-01-01`;
    const prevYear = String(Number(maxDate.slice(0, 4)) - 1);
    return { from, to: maxDate, prev: { from: `${prevYear}-01-01`, to: `${prevYear}${maxDate.slice(4)}` }, label: `${maxDate.slice(0, 4)} to date`, prevLabel: `vs ${prevYear} same period` };
  }
  const n = len[range];
  const from = addDays(maxDate, -(n - 1));
  const prevTo = addDays(from, -1);
  return {
    from,
    to: maxDate,
    prev: { from: addDays(prevTo, -(n - 1)), to: prevTo },
    label: range === "1Y" ? "Last 12 months" : `Last ${n} days`,
    prevLabel: range === "1Y" ? "vs prior 12 months" : `vs prior ${n} days`,
  };
}

/** Dimension filters only (no date). */
export function matchesDims(o: Order, f: Filters) {
  return (
    (f.region === ALL || o.region === f.region) &&
    (f.channel === ALL || o.sales_channel === f.channel) &&
    (f.category === ALL || o.product_category === f.category) &&
    (f.segment === ALL || o.customer_segment === f.segment)
  );
}

export function inRange(o: Order, from: string, to: string) {
  return o.order_date >= from && o.order_date <= to;
}

export function activeFilterChips(f: Filters) {
  const chips: { key: keyof Filters; label: string; value: string }[] = [];
  if (f.region !== ALL) chips.push({ key: "region", label: "Region", value: f.region });
  if (f.channel !== ALL) chips.push({ key: "channel", label: "Channel", value: f.channel });
  if (f.category !== ALL) chips.push({ key: "category", label: "Category", value: f.category });
  if (f.segment !== ALL) chips.push({ key: "segment", label: "Segment", value: f.segment });
  return chips;
}
