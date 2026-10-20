import type * as React from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<R> {
  key: keyof R & string;
  label: string;
  /** "right" for numbers (tabular figures). */
  align?: "left" | "right";
  format?: (value: R[keyof R], row: R) => React.ReactNode;
  /** Monospace for IDs and column names. */
  mono?: boolean;
  sortable?: boolean;
}

export interface DataTableProps<R> {
  columns: Column<R>[];
  rows: R[];
  rowKey?: (row: R, index: number) => string | number;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string, dir: "asc" | "desc") => void;
  /** Accessible name. */
  caption: string;
  className?: string;
}

/** Records with sortable columns. The consumer sorts and pages the rows; the table only renders them. */
export function DataTable<R extends object>({ columns, rows, rowKey, sortKey, sortDir, onSort, caption, className }: DataTableProps<R>) {
  return (
    <div className={cn("overflow-x-auto rounded-md border border-line bg-surface-raised", className)}>
      <table className="w-full border-collapse text-body-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => {
              const right = c.align === "right";
              const sorted = sortKey === c.key;
              const canSort = c.sortable !== false && !!onSort;
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={sorted ? (sortDir === "desc" ? "descending" : "ascending") : undefined}
                  className="whitespace-nowrap border-b border-line bg-surface-sunken p-0 text-label text-ink-muted"
                >
                  {canSort ? (
                    <button
                      type="button"
                      onClick={() => onSort!(c.key, sorted && sortDir === "asc" ? "desc" : "asc")}
                      className={cn("flex h-8 w-full items-center gap-space-1 px-space-3", right ? "justify-end" : "justify-start", sorted && "font-semibold text-ink")}
                    >
                      {c.label}
                      {sorted ? (sortDir === "desc" ? <ArrowDown className="size-3" aria-hidden /> : <ArrowUp className="size-3" aria-hidden />) : null}
                    </button>
                  ) : (
                    <span className={cn("flex h-8 items-center px-space-3", right ? "justify-end" : "justify-start")}>{c.label}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={rowKey ? rowKey(r, i) : i} className="group">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    "whitespace-nowrap border-b border-line px-space-3 py-space-2 text-ink group-last:border-b-0 group-hover:bg-surface",
                    c.align === "right" && "tabular text-right",
                    c.mono && "font-mono text-code text-ink-muted",
                  )}
                >
                  {c.format ? c.format(r[c.key], r) : String((r[c.key] as unknown) ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
