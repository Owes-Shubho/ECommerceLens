import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sparkline } from "./sparkline";

export interface KpiCardProps {
  label: string;
  /** Pre-formatted value, e.g. "$177.13M". */
  value: string;
  unit?: string;
  /** Percent change, e.g. 8.4 or -1.9. */
  delta?: number;
  deltaLabel?: string;
  /** "%" for relative change (default), "pp" for percentage-point change of a rate. */
  deltaUnit?: "%" | "pp";
  trend?: number[];
  /** "down" for metrics where lower is better (return rate, latency, cost). */
  goodDirection?: "up" | "down";
  className?: string;
}

/** One headline metric with its change and a small trend. Every value must come from a query result. */
export function KpiCard({ label, value, unit, delta, deltaLabel, deltaUnit = "%", trend, goodDirection = "up", className }: KpiCardProps) {
  const hasDelta = typeof delta === "number";
  const good = hasDelta && Math.abs(delta) >= 0.05 && delta > 0 === (goodDirection === "up");
  const flat = !hasDelta || Math.abs(delta) < 0.05;
  const tone = flat ? "text-ink-muted" : good ? "text-good-ink" : "text-critical-ink";
  return (
    <section aria-label={label} className={cn("grid min-w-0 gap-space-2 rounded-md border border-line bg-surface-raised p-space-4 shadow-sm", className)}>
      <div className="text-eyebrow uppercase text-ink-muted">{label}</div>
      <div className="flex items-end justify-between gap-space-3">
        <div className="tabular text-kpi text-ink">
          {value}
          {unit ? <span className="ml-0.5 text-[15px] font-medium text-ink-muted">{unit}</span> : null}
        </div>
        {trend ? <Sparkline values={trend} /> : null}
      </div>
      {hasDelta || deltaLabel ? (
        <div className="flex items-center gap-space-2 text-body-sm text-ink-subtle">
          {hasDelta ? (
            <span className={cn("tabular inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap font-semibold", tone)}>
              {flat ? null : delta! > 0 ? <ArrowUp className="size-3" strokeWidth={2.5} aria-hidden /> : <ArrowDown className="size-3" strokeWidth={2.5} aria-hidden />}
              {flat ? "0.0" : (delta! > 0 ? "+" : "") + delta!.toFixed(1)}{deltaUnit === "pp" ? " pp" : "%"}
            </span>
          ) : null}
          {deltaLabel ? <span>{deltaLabel}</span> : null}
        </div>
      ) : null}
    </section>
  );
}
