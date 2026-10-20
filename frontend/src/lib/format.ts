const nf0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** $177.13M, $76.2K, $940 — for KPI cards and chart labels. */
export function money(v: number) {
  const a = Math.abs(v);
  const s = v < 0 ? "-" : "";
  if (a >= 1e9) return `${s}$${nf2.format(a / 1e9)}B`;
  if (a >= 1e6) return `${s}$${nf2.format(a / 1e6)}M`;
  if (a >= 1e4) return `${s}$${nf1.format(a / 1e3)}K`;
  return `${s}$${nf0.format(a)}`;
}
/** $1,282.50 — for tables. */
export const moneyExact = (v: number) => `${v < 0 ? "-" : ""}$${nf2.format(Math.abs(v))}`;
export const int = (v: number) => nf0.format(v);
export const pct = (v: number, digits = 1) => `${v.toFixed(digits)}%`;
export const num1 = (v: number) => nf1.format(v);
