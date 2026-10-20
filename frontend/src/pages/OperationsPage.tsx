import { useState } from "react";
import { ChartCard, DataTable, KpiCard, type Column } from "@/components/ui";
import { KpiRow, PeriodNote } from "@/components/Panel";
import { PageFilters } from "@/components/PageFilters";
import { LoadingGrid } from "@/components/MiniTable";
import { barTrace, lineTrace, Plot } from "@/charts/Plot";
import { useFiltered } from "@/hooks/useApi";
import { int, num1, pct } from "@/lib/format";
import { getOperations } from "@/services/analytics";

type Wh = Awaited<ReturnType<typeof getOperations>>["warehouses"][number];
const WH_COLS: Column<Wh>[] = [
  { key: "warehouse", label: "Warehouse", mono: true },
  { key: "orders", label: "Orders", align: "right", format: (v) => int(v as number) },
  { key: "avg_days", label: "Avg delivery days", align: "right", format: (v) => num1(v as number) },
  { key: "on_time", label: "On time or early", align: "right", format: (v) => pct(v as number) },
  { key: "return_rate", label: "Return rate", align: "right", format: (v) => pct(v as number) },
];
const STATUS_COLORS = { Early: "var(--series-3)", "On Time": "var(--series-1)", Delayed: "var(--series-2)" } as const;

export default function OperationsPage() {
  const { data, isLoading } = useFiltered("operations", getOperations);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "on_time", dir: "asc" });
  if (isLoading || !data) return <LoadingGrid />;
  const { kpis: k, period } = data;
  const wh = [...data.warehouses].sort((a, b) => ((a[sort.key as keyof Wh] as number) - (b[sort.key as keyof Wh] as number)) * (sort.dir === "asc" ? 1 : -1)).map((w) => ({ ...w, warehouse: w.warehouse }));
  const ship = data.byShipping;

  return (
    <>
      <PageFilters />
      <PeriodNote label={period.label} prevLabel={period.prevLabel} />
      <KpiRow>
        <KpiCard label="On time or early" value={k.onTimeRate.value.toFixed(1)} unit="%" delta={k.onTimeRate.delta} deltaUnit="pp" deltaLabel={period.prevLabel} />
        <KpiCard label="Avg delivery time" value={k.avgDeliveryDays.value.toFixed(1)} unit="days" delta={k.avgDeliveryDays.delta} goodDirection="down" deltaLabel={period.prevLabel} />
        <KpiCard label="Cancellation rate" value={k.cancellationRate.value.toFixed(2)} unit="%" delta={k.cancellationRate.delta} deltaUnit="pp" goodDirection="down" deltaLabel={period.prevLabel} />
        <KpiCard label="Return rate" value={k.returnRate.value.toFixed(2)} unit="%" delta={k.returnRate.delta} deltaUnit="pp" goodDirection="down" deltaLabel={period.prevLabel} />
      </KpiRow>

      <div className="grid gap-space-6 lg:grid-cols-2">
        <ChartCard title="Delivery outcome by shipping method" subtitle="Share of shipped orders" legend={(["Early", "On Time", "Delayed"] as const).map((s) => ({ label: s, color: STATUS_COLORS[s] }))}>
          <Plot
            ariaLabel="Stacked bar chart of delivery outcome share by shipping method"
            data={(["Early", "On Time", "Delayed"] as const).map((s) =>
              barTrace(ship.map((x) => x.key as string), ship.map((x) => x[s] as number), s, STATUS_COLORS[s], { hovertemplate: `%{x}<br>${s}: %{y:.1f}%<extra></extra>` }),
            )}
            layout={{ barmode: "stack", showlegend: false, yaxis: { ticksuffix: "%", range: [0, 100] } }}
          />
        </ChartCard>
        <ChartCard title="Delivery time" subtitle="Shipped orders by days to deliver">
          <Plot
            ariaLabel="Bar chart of orders by delivery days"
            data={[barTrace(data.hist.map((h) => h.days), data.hist.map((h) => h.orders), "Orders", "var(--series-1)", { hovertemplate: "%{x} days: %{y} orders<extra></extra>" })]}
            layout={{ xaxis: { title: { text: "Days", font: { size: 12 } }, dtick: 1 }, bargap: 0.15 }}
          />
        </ChartCard>
        <ChartCard title="Why orders come back" subtitle="Returned orders by reason">
          <Plot
            ariaLabel="Horizontal bar chart of returns by reason"
            data={[barTrace([...data.reasons].reverse().map((r) => r.orders), [...data.reasons].reverse().map((r) => r.key), "Returns", "var(--series-2)", { orientation: "h", hovertemplate: "%{y}: %{x} returns<extra></extra>" })]}
            layout={{ margin: { l: 170, r: 16, t: 8, b: 32 } }}
          />
        </ChartCard>
        <ChartCard title="Cancellations and returns" subtitle="Share of orders per month" legend={[{ label: "Cancelled", color: "var(--series-1)" }, { label: "Returned", color: "var(--series-2)" }]}>
          <Plot
            ariaLabel="Line chart of cancellation and return rates per month"
            data={[
              lineTrace(data.cancelTrend.map((p) => p.t), data.cancelTrend.map((p) => p.cancelled), "Cancelled", "var(--series-1)", { hovertemplate: "%{x}<br>Cancelled: %{y:.1f}%<extra></extra>" }),
              lineTrace(data.cancelTrend.map((p) => p.t), data.cancelTrend.map((p) => p.returned), "Returned", "var(--series-2)", { hovertemplate: "%{x}<br>Returned: %{y:.1f}%<extra></extra>" }),
            ]}
            layout={{ showlegend: false, yaxis: { ticksuffix: "%", rangemode: "tozero" } }}
          />
        </ChartCard>
      </div>

      <div className="grid gap-space-3">
        <h2 className="text-heading text-ink">Warehouses</h2>
        <p className="-mt-space-2 text-body-sm text-ink-muted">Sorted by on-time share, lowest first, so problems surface at the top.</p>
        <DataTable caption="Warehouse performance" columns={WH_COLS} rows={wh} rowKey={(r) => r.warehouse} sortKey={sort.key} sortDir={sort.dir} onSort={(key, dir) => setSort({ key, dir })} />
      </div>
    </>
  );
}
