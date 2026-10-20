import { cn } from "@/lib/utils";

export type Option = string | { value: string; label: string };
const norm = (o: Option) => (typeof o === "string" ? { value: o, label: o } : o);

export interface SegmentedControlProps {
  options: Option[];
  value: string;
  onChange?: (value: string) => void;
  /** Accessible name for the group, e.g. "Date range". */
  label: string;
  className?: string;
}

/** 2–6 mutually exclusive options that switch a view in place (date presets, forecast horizon, granularity). */
export function SegmentedControl({ options, value, onChange, label, className }: SegmentedControlProps) {
  return (
    <div role="group" aria-label={label} className={cn("inline-flex gap-0.5 rounded-sm border border-line bg-surface-sunken p-0.5", className)}>
      {options.map(norm).map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange?.(o.value)}
            className={cn(
              "tabular h-[26px] rounded-[3px] px-space-3 text-label transition-colors",
              on ? "bg-surface-raised font-semibold text-lens shadow-sm" : "text-ink-muted hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
