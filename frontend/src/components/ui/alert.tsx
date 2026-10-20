import type * as React from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { statusIcon, type StatusTone } from "./status-pill";

export type AlertTone = StatusTone | "neutral";

const toneClass: Record<AlertTone, [string, string]> = {
  good: ["border-transparent bg-good-soft", "text-good-ink"],
  warning: ["border-transparent bg-warning-soft", "text-warning-ink"],
  serious: ["border-transparent bg-serious-soft", "text-serious-ink"],
  critical: ["border-transparent bg-critical-soft", "text-critical-ink"],
  neutral: ["border-line bg-surface-raised", "text-lens"],
};

export interface AlertProps {
  /** blocked → critical, auto-repaired → serious, slow or stale → warning, informational → neutral */
  tone?: AlertTone;
  /** What happened, one line. */
  title: string;
  /** Why, and what to do next. */
  children?: React.ReactNode;
  className?: string;
}

/** An inline message placed where the problem is (above the chart, inside the assistant thread). */
export function Alert({ tone = "neutral", title, children, className }: AlertProps) {
  const Icon = tone === "neutral" ? Info : statusIcon[tone];
  const [box, icon] = toneClass[tone];
  return (
    <div role={tone === "critical" ? "alert" : "status"} className={cn("grid grid-cols-[auto_1fr] gap-x-space-3 gap-y-space-1 rounded-md border px-space-4 py-space-3 text-ink", box, className)}>
      <Icon className={cn("row-span-2 mt-0.5 size-4", icon)} aria-hidden />
      <div className="text-body font-semibold">{title}</div>
      {children ? <div className="text-body-sm text-ink-muted">{children}</div> : null}
    </div>
  );
}
