import type * as React from "react";
import { cn } from "@/lib/utils";
import type { NavItem } from "./nav";

export interface SidebarProps {
  items: NavItem[];
  active: string;
  onSelect: (id: string) => void;
  footer?: React.ReactNode;
  className?: string;
}

/** Placeholder mark until a real logo exists: a lens ring on a lens tile. */
export function LensMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={cn("size-[22px] text-lens", className)}>
      <rect x="2" y="2" width="20" height="20" rx="6" fill="currentColor" />
      <circle cx="12" cy="12" r="5" stroke="var(--on-lens)" strokeWidth="2" />
      <path d="M7 17l2.5-2.5" stroke="var(--on-lens)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Main navigation: wordmark, pages grouped by area, and the active dataset version in the footer. */
export function Sidebar({ items, active, onSelect, footer, className }: SidebarProps) {
  const groups = [...new Set(items.map((i) => i.group))];
  return (
    <nav aria-label="Main" className={cn("flex w-sidebar flex-col gap-space-4 border-r border-line bg-surface px-space-3 py-space-4", className)}>
      <div className="flex items-center gap-space-2 px-space-2 font-display text-[17px] font-bold tracking-[-0.01em] text-ink">
        <LensMark />
        ECommerceLens
      </div>
      <div className="grid gap-0.5 overflow-y-auto">
        {groups.map((g) => (
          <div key={g} className="grid gap-0.5">
            <div className="px-space-2 pb-space-1 pt-space-3 text-eyebrow uppercase text-ink-subtle">{g}</div>
            {items
              .filter((i) => i.group === g)
              .map((i) => {
                const on = i.id === active;
                return (
                  <button
                    key={i.id}
                    type="button"
                    aria-current={on ? "page" : undefined}
                    onClick={() => onSelect(i.id)}
                    className={cn(
                      "flex h-8 items-center justify-between gap-space-2 rounded-sm px-space-2 text-left text-body-sm",
                      on ? "bg-lens-soft font-semibold text-lens" : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
                    )}
                  >
                    <span>{i.label}</span>
                    {i.badge ? <span className="tabular text-eyebrow text-critical-ink">{i.badge}</span> : null}
                  </button>
                );
              })}
          </div>
        ))}
      </div>
      {footer ? <div className="mt-auto border-t border-line p-space-2 text-label font-normal text-ink-subtle">{footer}</div> : null}
    </nav>
  );
}
