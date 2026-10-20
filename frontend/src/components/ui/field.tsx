import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Option } from "./segmented-control";

const norm = (o: Option) => (typeof o === "string" ? { value: o, label: o } : o);

export interface FieldProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  /** Pass options to render a select; leave out for a text input. */
  options?: Option[];
  placeholder?: string;
  type?: string;
  hint?: string;
  /** Replaces the hint and says how to fix the value. */
  error?: string;
  className?: string;
  id?: string;
}

const control =
  "h-control w-full min-w-0 rounded-sm border bg-surface-raised px-space-3 text-body-sm text-ink placeholder:text-ink-subtle";

/** A labelled text input or select. Always has a visible label. */
export function Field({ label, value, onChange, options, placeholder, type = "text", hint, error, className, id }: FieldProps) {
  const auto = useId();
  const fid = id ?? auto;
  const msgId = `${fid}-msg`;
  const border = error ? "border-critical-ink" : "border-line-strong";
  return (
    <div className={cn("grid min-w-0 gap-space-1", className)}>
      <label htmlFor={fid} className="text-label text-ink-muted">
        {label}
      </label>
      {options ? (
        <div className="relative">
          <select id={fid} value={value} onChange={(e) => onChange?.(e.target.value)} className={cn(control, border, "appearance-none pr-space-8")}>
            {options.map(norm).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-space-2 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
        </div>
      ) : (
        <input
          id={fid}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange?.(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? msgId : undefined}
          className={cn(control, border)}
        />
      )}
      {error || hint ? (
        <div id={msgId} className={cn("text-label font-normal", error ? "text-critical-ink" : "text-ink-subtle")}>
          {error ?? hint}
        </div>
      ) : null}
    </div>
  );
}
