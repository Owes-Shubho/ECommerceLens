import { Construction } from "lucide-react";

/** Empty state for pages not built yet. */
export function PlaceholderPage({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="grid place-items-center rounded-md border border-dashed border-line-strong bg-surface-raised p-space-12 text-center">
      <Construction className="mb-space-3 size-6 text-ink-subtle" aria-hidden />
      <h2 className="text-heading text-ink">{title} is not built yet</h2>
      <p className="mt-space-1 max-w-[48ch] text-body-sm text-ink-muted">This page arrives in {phase} of the execution plan. The design system page shows every component it will use.</p>
    </div>
  );
}
