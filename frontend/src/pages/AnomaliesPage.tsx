import { useMemo, useState } from "react";
import { ChartCard, DataTable, Field, KpiCard, SegmentedControl, StatusPill, type Column } from "@/components/ui";
import { KpiRow } from "@/components/Panel";
import { lineTrace, Plot } from "@/charts/Plot";
import { CATEGORIES, CHANNELS } from "@/data/catalog";
import { fmtDay } from "@/data/dates";
import { ALL } from "@/data/filters";
import { downloadCsv } from "@/lib/csv";
import { int, money, pct } from "@/lib/format";
import { detectAnomalies, type Anomaly, type Severity } from "@/ml/anomaly";
import { dailySeries } from "@/services/analytics";
import { demoDb } from "@/services/demoDb";
import { Button } from "@/components/ui";

type Metric = "orders" | "net";
const SEV_LABEL: Record<Severity, string> = { critical: "Critical", serious: "Serious", warning: "Warning" };

/** The category whose share of the day moved most compared with the 28 days before: a likely driver. */
function driver(day: string, direction: "spike" | "drop", category: string, channel: string) {
  const db = demoDb();
  const match = (o: (typeof db.orders)[number]) => (category === ALL || o.product_category === category) && (channel === ALL || o.sales_channel === channel);
  const d0 = new Date(day + "T00:00:00Z").getTime();
  const before = new Date(d0 - 28 * 86400000).toISOString().slice(0, 10);
  const share = (rows: typeof db.orders) => {
    const m = new Map<string, number>();
    rows.forEach((o) => m.set(o.sales_channel, (m.get(o.sales_channel) ?? 0) + 1));
    const n = rows.length || 1;
    return new Map([...m].map(([k, v]) => [k, v / n]));
  };
  const today = db.orders.filter((o) => o.order_date === day && match(o));
  const base = db.orders.filter((o) => o.order_date >= before && o.order_date < day && match(o));
  const a = share(today), b = share(base);
  let bestK = "", bestD = 0;
  for (const k of new Set([...a.keys(), ...b.keys()])) {
    const diff = (a.get(k) ?? 0) - (b.get(k) ?? 0);
    if ((direction === "spike" ? diff : -diff) > bestD) { bestD = Math.abs(diff); bestK = k; }
  }
  return bestK ? `${bestK} channel ${direction === "spike" ? "+" : "−"}${(bestD * 100).toFixed(0)} pp share` : "Spread across channels";
}

export default function AnomaliesPage() {
  const [metric, setMetric] = useState<Metric>("orders");
  const [threshold, setThreshold] = useState("3");
  const [category, setCategory] = useState(ALL);
  const [channel, setChannel] = useState(ALL);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "t", dir: "desc" });

  const { series, found } = useMemo(() => {
    const s = dailySeries({ region: ALL, segment: ALL, category, channel });
    const y = s.map((d) => (metric === "orders" ? d.orders : d.net));
    const found = detectAnomalies(s.map((d) => d.t), y, 28, Number(threshold)).map((a) => ({ ...a, driver: driver(a.t, a.direction, category, channel) }));
    return { series: { t: s.map((d) => d.t), y }, found };
  }, [metric, threshold, category, channel]);

  const fmtV = (v: number) => (metric === "orders" ? int(v) : money(v));
  const rows = [...found].sort((a, b) => {
    const x = a[sort.key as keyof typeof a], y = b[sort.key as keyof typeof b];
    return (typeof x === "number" ? (x as number) - (y as number) : String(x).localeCompare(String(y))) * (sort.dir === "asc" ? 1 : -1);
  });
  const cols: Column<Anomaly & { driver: string }>[] = [
    { key: "t", label: "Date", format: (v) => fmtDay(v as string) },
    { key: "severity", label: "Severity", format: (v) => <StatusPill tone={v as Severity}>{SEV_LABEL[v as Severity]}</StatusPill> },
    { key: "direction", label: "Type", format: (v) => (v === "spike" ? "Spike" : "Drop") },
    { key: "value", label: metric === "orders" ? "Orders" : "Net sales", align: "right", format: (v) => fmtV(v as number) },
    { key: "expected", label: "Expected", align: "right", format: (v) => fmtV(v as number) },
    { key: "deviationPct", label: "Deviation", align: "right", format: (v) => `${(v as number) > 0 ? "+" : ""}${pct(v as number, 0)}` },
    { key: "z", label: "z-score", align: "right", format: (v) => (v as number).toFixed(1) },
    { key: "driver", label: "Likely driver" },
  ];
  const sevColor: Record<Severity, string> = { critical: "var(--critical)", serious: "var(--serious)", warning: "var(--warning)" };

  return (
    <>
      <div className="flex flex-wrap items-end gap-space-3 rounded-md border border-line bg-surface-sunken px-space-4 py-space-3">
        <div className="grid gap-space-1">
          <span className="text-label text-ink-muted">Metric</span>
          <SegmentedControl label="Metric" options={[{ value: "orders", label: "Orders" }, { value: "net", label: "Net sales" }]} value={metric} onChange={(v) => setMetric(v as Metric)} />
        </div>
        <div className="grid gap-space-1">
          <span className="text-label text-ink-muted">Sensitivity (z-score)</span>
          <SegmentedControl label="Sensitivity" options={[{ value: "2.5", label: "High · 2.5" }, { value: "3", label: "Normal · 3" }, { value: "3.5", label: "Low · 3.5" }]} value={threshold} onChange={setThreshold} />
        </div>
        <Field label="Category" options={[{ value: ALL, label: "All categories" }, ...Object.keys(CATEGORIES).map((c) => ({ value: c, label: c }))]} value={category} onChange={setCategory} className="w-48" />
        <Field label="Channel" options={[{ value: ALL, label: "All channels" }, ...CHANNELS.map((c) => ({ value: c[0], label: c[0] }))]} value={channel} onChange={setChannel} className="w-40" />
      </div>

      <KpiRow>
        <KpiCard label="Anomalies found" value={int(found.length)} deltaLabel="2021–2025" />
        <KpiCard label="Critical" value={int(found.filter((a) => a.severity === "critical").length)} deltaLabel="z beyond threshold + 1.5" />
        <KpiCard label="Spikes / drops" value={`${found.filter((a) => a.direction === "spike").length} / ${found.filter((a) => a.direction === "drop").length}`} />
        <KpiCard label="Most recent" value={found.length ? fmtDay(found[found.length - 1].t) : "None"} />
      </KpiRow>

      <ChartCard
        title={`Daily ${metric === "orders" ? "orders" : "net sales"} with anomalies`}
        subtitle="Rolling z-score against the previous 28 days"
        legend={[{ label: "Daily value", color: "var(--line-strong)" }, { label: "Critical", color: "var(--critical)" }, { label: "Serious", color: "var(--serious)" }, { label: "Warning", color: "var(--warning)" }]}
        footnote="Drag on the chart to zoom; double-click to reset. Each anomaly is also listed in the table below."
      >
        <Plot
          height={340}
          ariaLabel="Line chart of daily values with anomaly markers"
          data={[
            lineTrace(series.t, series.y, metric === "orders" ? "Orders" : "Net sales", "var(--line-strong)", { line: { color: "var(--line-strong)", width: 1.2 }, hovertemplate: metric === "orders" ? "%{x}<br>%{y} orders<extra></extra>" : "%{x}<br>%{y:$,.0f}<extra></extra>" }),
            ...(["warning", "serious", "critical"] as Severity[]).map((s) => ({
              type: "scatter" as const, mode: "markers" as const, name: SEV_LABEL[s],
              x: found.filter((a) => a.severity === s).map((a) => a.t), y: found.filter((a) => a.severity === s).map((a) => a.value),
              marker: { size: 11, color: sevColor[s], line: { color: "var(--surface-raised)", width: 2 }, symbol: s === "critical" ? "diamond" : "circle" },
              hovertemplate: `%{x}<br>${SEV_LABEL[s]} anomaly: %{y}<extra></extra>`,
            })),
          ]}
          layout={{ showlegend: false, yaxis: { rangemode: "tozero", ...(metric === "net" ? { tickprefix: "$", tickformat: "~s" } : {}) } }}
        />
      </ChartCard>

      <div className="grid gap-space-3">
        <div className="flex flex-wrap items-end justify-between gap-space-3">
          <h2 className="text-heading text-ink">Anomaly log</h2>
          <Button onClick={() => downloadCsv("anomalies.csv", rows.map((r) => ({ date: r.t, severity: r.severity, type: r.direction, value: r.value, expected: r.expected.toFixed(2), deviation_pct: r.deviationPct.toFixed(1), z: r.z.toFixed(2), driver: r.driver })))} disabled={!rows.length}>
            Export CSV
          </Button>
        </div>
        {rows.length ? (
          <DataTable caption="Detected anomalies" columns={cols} rows={rows} rowKey={(r) => r.t} sortKey={sort.key} sortDir={sort.dir} onSort={(key, dir) => setSort({ key, dir })} />
        ) : (
          <p className="rounded-md border border-dashed border-line-strong bg-surface-raised p-space-8 text-center text-body-sm text-ink-muted">No anomalies at this sensitivity. Try "High · 2.5".</p>
        )}
      </div>
    </>
  );
}
