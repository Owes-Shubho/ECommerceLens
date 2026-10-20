import type * as React from "react";
import { cn } from "@/lib/utils";

/** A titled region of a page that is not a chart (insight lists, forms). */
export function Panel({ title, subtitle, actions, className, children }: { title: string; subtitle?: string; actions?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className={cn("grid min-w-0 content-start gap-space-3 rounded-md border border-line bg-surface-raised p-space-4 shadow-sm", className)}>
      <div className="flex flex-wrap items-start justify-between gap-space-3">
        <div className="min-w-0">
          <h3 className="text-heading text-ink">{title}</h3>
          {subtitle ? <p className="text-body-sm text-ink-muted">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Responsive row of KPI cards. */
export function KpiRow({ children, columns }: { children: React.ReactNode; columns?: 3 }) {
  return <div className={columns === 3 ? "grid gap-space-4 sm:grid-cols-2 lg:grid-cols-3" : "grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-space-4"}>{children}</div>;
}

/** Shows the period and its comparison under the filter bar. */
export function PeriodNote({ label, prevLabel }: { label: string; prevLabel?: string }) {
  return (
    <p className="-mt-space-3 text-body-sm text-ink-subtle">
      Showing <span className="font-medium text-ink-muted">{label}</span>
      {prevLabel ? `, compared ${prevLabel.replace("vs ", "with the ")}` : ""}. Demo data.
    </p>
  );
}
