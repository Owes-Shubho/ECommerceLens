import type * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterChip {
  label: string;
  value: string;
}

export interface FilterBarProps {
  /** Controls in order: date range, geography, channel, product, customer. */
  children: React.ReactNode;
  chips?: FilterChip[];
  onRemove?: (chip: FilterChip) => void;
  /** Usually a ghost "Reset filters" button. */
  actions?: React.ReactNode;
  className?: string;
}

/** The one global filter row above a page's charts. Active filters show as removable chips. */
export function FilterBar({ children, chips = [], onRemove, actions, className }: FilterBarProps) {
  return (
    <div role="region" aria-label="Filters" className={cn("flex flex-wrap items-end gap-space-3 rounded-md border border-line bg-surface-sunken px-space-4 py-space-3", className)}>
      {children}
      <div className="flex-1" />
      {actions}
      {chips.length ? (
        <div className="flex basis-full flex-wrap items-center gap-space-2">
          {chips.map((c) => (
            <span key={c.label + c.value} className="inline-flex h-6 items-center gap-space-1 rounded-full bg-lens-soft pl-space-2 pr-0.5 text-label text-lens">
              {c.label}: <b className="font-semibold">{c.value}</b>
              {onRemove ? (
                <button type="button" aria-label={`Remove ${c.label} filter`} onClick={() => onRemove(c)} className="grid size-5 place-items-center rounded-full hover:bg-surface-raised">
                  <X className="size-2.5" strokeWidth={2.5} aria-hidden />
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
