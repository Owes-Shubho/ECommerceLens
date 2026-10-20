import type * as React from "react";
import { cn } from "@/lib/utils";

export interface LegendItem {
  label: string;
  /** e.g. seriesColor(1) or "var(--series-1)" */
  color: string;
}

export interface ChartCardProps {
  /** What is measured: "Net sales by month". */
  title: string;
  /** Scope in effect: channel, period. */
  subtitle?: string;
  /** Shown only for two or more series. */
  legend?: LegendItem[];
  /** Ghost sm buttons, e.g. "Table", "Export PNG". */
  actions?: React.ReactNode;
  height?: number | string;
  /** Source of the numbers, e.g. "Source: DuckDB view sales_daily". */
  footnote?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/** The frame every chart sits in. Plot with Plotly using plotlyLayout() from @/lib/plotlyTheme. */
export function ChartCard({ title, subtitle, legend, actions, height, footnote, className, children }: ChartCardProps) {
  return (
    <section aria-label={title} className={cn("grid min-w-0 gap-space-3 rounded-md border border-line bg-surface-raised p-space-4 shadow-sm", className)}>
      <div className="flex flex-wrap items-start justify-between gap-space-3">
        <div className="min-w-0">
          <h3 className="text-heading text-ink">{title}</h3>
          {subtitle ? <p className="text-body-sm text-ink-muted">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex gap-space-1">{actions}</div> : null}
      </div>
      {legend && legend.length > 1 ? (
        <ul className="flex flex-wrap gap-x-space-4 gap-y-space-1 text-label text-ink-muted">
          {legend.map((l) => (
            <li key={l.label} className="inline-flex items-center gap-1.5">
              <i className="inline-block size-2 rounded-full" style={{ background: l.color }} />
              {l.label}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="min-w-0 overflow-x-auto text-ink-muted" style={height ? { height } : undefined}>
        {children}
      </div>
      {footnote ? <div className="text-label font-normal text-ink-subtle">{footnote}</div> : null}
    </section>
  );
}
