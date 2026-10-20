import { RotateCcw } from "lucide-react";
import { Button, Field, FilterBar, SegmentedControl } from "@/components/ui";
import { CATEGORIES, CHANNELS, REGIONS, SEGMENTS } from "@/data/catalog";
import { activeFilterChips, ALL, DEFAULT_FILTERS, RANGES, type RangeKey } from "@/data/filters";
import { useFilters } from "@/store/filters";

const opts = (label: string, values: string[]) => [{ value: ALL, label }, ...values.map((v) => ({ value: v, label: v }))];

/** The global filter bar, wired to the shared filter store. Every analytics page responds to it. */
export function PageFilters({ showCategory = true }: { showCategory?: boolean }) {
  const { filters, set, reset } = useFilters();
  const chips = activeFilterChips(filters);
  const changed = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);
  return (
    <FilterBar
      chips={chips}
      onRemove={(c) => {
        const hit = chips.find((x) => x.label === c.label);
        if (hit) set(hit.key, ALL);
      }}
      actions={
        <Button variant="ghost" icon={<RotateCcw aria-hidden />} onClick={reset} disabled={!changed}>
          Reset filters
        </Button>
      }
    >
      <div className="grid gap-space-1">
        <span className="text-label text-ink-muted">Date range</span>
        <SegmentedControl label="Date range" options={RANGES} value={filters.range} onChange={(v) => set("range", v as RangeKey)} />
      </div>
      <Field label="Region" options={opts("All regions", REGIONS.map((r) => r[0]))} value={filters.region} onChange={(v) => set("region", v)} className="w-40" />
      <Field label="Channel" options={opts("All channels", CHANNELS.map((r) => r[0]))} value={filters.channel} onChange={(v) => set("channel", v)} className="w-40" />
      {showCategory ? (
        <Field label="Category" options={opts("All categories", Object.keys(CATEGORIES))} value={filters.category} onChange={(v) => set("category", v)} className="w-48" />
      ) : null}
      <Field label="Segment" options={opts("All segments", SEGMENTS.map((r) => r[0]))} value={filters.segment} onChange={(v) => set("segment", v)} className="w-36" />
    </FilterBar>
  );
}
