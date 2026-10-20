import { cn } from "@/lib/utils";

/** Placeholder block shown while a panel's data loads. */
export function Skeleton({ className, label = "Loading" }: { className?: string; label?: string }) {
  return <div role="status" aria-label={label} className={cn("animate-pulse rounded-md border border-line bg-surface-raised", className)} />;
}
