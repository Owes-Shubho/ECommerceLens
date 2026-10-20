import type * as React from "react";
import { CircleAlert, Check, OctagonX, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusTone = "good" | "warning" | "serious" | "critical";
export type PillTone = StatusTone | "lens" | "neutral";

const toneClass: Record<PillTone, string> = {
  good: "bg-good-soft text-good-ink",
  warning: "bg-warning-soft text-warning-ink",
  serious: "bg-serious-soft text-serious-ink",
  critical: "bg-critical-soft text-critical-ink",
  lens: "bg-lens-soft text-lens",
  neutral: "bg-surface-sunken text-ink-muted",
};

export const statusIcon: Record<StatusTone, LucideIcon> = {
  good: Check,
  warning: TriangleAlert,
  serious: CircleAlert,
  critical: OctagonX,
};

export interface StatusPillProps {
  tone?: PillTone;
  /** Status tones always show their icon; set false only for lens / neutral pills. */
  icon?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** A 1–3 word state label. Status tones carry an icon so meaning never rests on colour alone. */
export function StatusPill({ tone = "neutral", icon = true, className, children }: StatusPillProps) {
  const Icon = tone in statusIcon ? statusIcon[tone as StatusTone] : null;
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-space-1 whitespace-nowrap rounded-full px-space-2 text-label",
        toneClass[tone],
        className,
      )}
    >
      {Icon && icon ? <Icon className="size-3" strokeWidth={2} aria-hidden /> : null}
      {children}
    </span>
  );
}
