import { Skeleton } from "@/components/ui";

/** Compact scrollable table used for a chart's "Table" view. */
export function MiniTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="max-h-[300px] overflow-auto rounded-sm border border-line">
      <table className="w-full border-collapse text-body-sm">
        <thead className="sticky top-0 bg-surface-sunken">
          <tr>
            {head.map((h, i) => (
              <th key={h} className={`px-space-3 py-space-2 text-label text-ink-muted ${i ? "text-right" : "text-left"}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line">
              {r.map((c, j) => (
                <td key={j} className={`px-space-3 py-1.5 text-ink ${j ? "tabular text-right" : ""}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LoadingGrid() {
  return (
    <div className="grid gap-space-6">
      <Skeleton className="h-24" />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-space-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}
