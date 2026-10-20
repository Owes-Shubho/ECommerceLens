import { useState } from "react";
import type * as React from "react";
import { Download, Table2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui";
import { downloadCsv } from "@/lib/csv";

/** "Table" / "Chart" switch plus CSV export for a ChartCard, so every chart has a table view. */
export function useTableToggle(rows: Record<string, unknown>[], filename: string) {
  const [table, setTable] = useState(false);
  const actions: React.ReactNode = (
    <>
      <Button variant="ghost" size="sm" icon={table ? <BarChart3 aria-hidden /> : <Table2 aria-hidden />} onClick={() => setTable(!table)}>
        {table ? "Chart" : "Table"}
      </Button>
      <Button variant="ghost" size="sm" icon={<Download aria-hidden />} onClick={() => downloadCsv(filename, rows)} aria-label={`Download ${filename}`}>
        CSV
      </Button>
    </>
  );
  return { table, actions };
}
