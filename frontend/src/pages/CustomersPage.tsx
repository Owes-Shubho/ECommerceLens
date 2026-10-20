import { useState } from "react";
import { ChartCard, DataTable, KpiCard, StatusPill, type Column } from "@/components/ui";
import { KpiRow, PeriodNote } from "@/components/Panel";
import { PageFilters } from "@/components/PageFilters";
import { LoadingGrid } from "@/components/MiniTable";
import { barTrace, Plot } from "@/charts/Plot";
import { fmtDay } from "@/data/dates";
import { useFiltered } from "@/hooks/useApi";
import { int, money, moneyExact, num1, pct } from "@/lib/format";
import { getCustomers, type RfmSegment } from "@/services/analytics";

type Data = Awaited<ReturnType<typeof getCustomers>>;
const TONE: Record<RfmSegment, "good" | "lens" | "neutral" | "warning" | "serious" | "critical"> = {
  Champions: "good", Loyal: "good", "Potential loyalists": "lens", New: "lens", "Need attention": "warning", "At risk": "serious", Hibernating: "neutral",
};
const SEG_COLS: Column<Data["segments"][number]>[] = [
  { key: "segment", label: "RFM segment", format: (v) => <StatusPill tone={TONE[v as RfmSegment]} icon={false}>{v as string}</StatusPill> },
  { key: "customers", label: "Customers", align: "right", format: (v) => int(v as number) },
  { key: "revenueShare", label: "Revenue share", align: "right", format: (v) => pct(v as number) },
  { key: "avgSpend", label: "Avg spend", align: "right", format: (v) => moneyExact(v as number) },
  { key: "avgOrders", label: "Avg orders", align: "right", format: (v) => num1(v as number) },
  { key: "avgRecency", label: "Recency (days)", align: "right", format: (v) => int(v as number) },
];
const TOP_COLS: Column<Data["top"][number]>[] = [
  { key: "customer_id", label: "Customer ID", mono: true },
  { key: "customer_segment", label: "Segment" },
  { key: "region", label: "Region" },
  { key: "rfm", label: "RFM segment" },
  { key: "orders", label: "Orders", align: "right", format: (v) => int(v as number) },
  { key: "spend", label: "Lifetime spend", align: "right", format: (v) => moneyExact(v as number) },
  { key: "last_order", label: "Last order", align: "right", format: (v) => fmtDay(v as string) },
];

export default function CustomersPage() {
  const { data, isLoading } = useFiltered("customers", getCustomers);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "customers", dir: "desc" });
  if (isLoading || !data) return <LoadingGrid />;
  const { kpis: k, period } = data;
  const segs = [...data.segments].sort((a, b) => ((a[sort.key as keyof typeof a] as number) - (b[sort.key as keyof typeof b] as number)) * (sort.dir === "asc" ? 1 : -1));
  const labels = ["1", "2", "3", "4", "5"];

  return (
    <>
      <PageFilters />
      <PeriodNote label={period.label} prevLabel={period.prevLabel} />
      <KpiRow>
        <KpiCard label="Active customers" value={int(k.customers.value)} delta={k.customers.delta} deltaLabel={period.prevLabel} />
        <KpiCard label="Repeat order share" value={k.repeatRate.value.toFixed(1)} unit="%" delta={k.repeatRate.delta} deltaUnit="pp" deltaLabel={period.prevLabel} />
        <KpiCard label="Avg lifetime spend" value={moneyExact(k.avgSpend.value)} deltaLabel="per customer, to period end" />
        <KpiCard label="Champions" value={k.championsShare.value.toFixed(1)} unit="%" deltaLabel="of customers" />
      </KpiRow>

      <div className="grid gap-space-6 xl:grid-cols-12">
        <ChartCard
          className="xl:col-span-5"
          title="RFM grid"
          subtitle="Customers by recency (rows) and frequency (columns) score, 5 = best"
          footnote="Scores are quintiles of days since last order and number of orders, up to the end of the period."
        >
          <Plot
            height={320}
            ariaLabel="Heatmap of customer counts by recency and frequency score"
            data={[{
              type: "heatmap", z: data.grid, x: labels, y: labels,
              colorscale: [[0, "var(--seq-1)"], [0.25, "var(--seq-2)"], [0.5, "var(--seq-3)"], [0.75, "var(--seq-4)"], [1, "var(--seq-5)"]],
              showscale: false, xgap: 2, ygap: 2,
              text: data.grid.map((row) => row.map(String)) as unknown as string[], texttemplate: "%{text}", textfont: { size: 12 },
              hovertemplate: "Recency %{y} · Frequency %{x}<br>%{z} customers<extra></extra>",
            }]}
            layout={{ xaxis: { title: { text: "Frequency score", font: { size: 12 } }, gridcolor: "rgba(0,0,0,0)" }, yaxis: { title: { text: "Recency score", font: { size: 12 } }, gridcolor: "rgba(0,0,0,0)" }, margin: { l: 56, r: 8, t: 8, b: 48 } }}
          />
        </ChartCard>
        <div className="grid min-w-0 content-start gap-space-3 xl:col-span-7">
          <h2 className="text-heading text-ink">RFM segments</h2>
          <DataTable caption="RFM segments" columns={SEG_COLS} rows={segs} rowKey={(r) => r.segment} sortKey={sort.key} sortDir={sort.dir} onSort={(key, dir) => setSort({ key, dir })} />
        </div>
      </div>

      <div className="grid gap-space-6 lg:grid-cols-2">
        <ChartCard title="New and returning orders" subtitle="Orders per month" legend={[{ label: "Returning customers", color: "var(--series-1)" }, { label: "New customers", color: "var(--series-2)" }]}>
          <Plot
            ariaLabel="Stacked bar chart of orders from new and returning customers per month"
            data={[
              barTrace(data.newVsReturning.map((p) => p.t), data.newVsReturning.map((p) => p.returning), "Returning", "var(--series-1)", { hovertemplate: "%{x}<br>Returning: %{y}<extra></extra>" }),
              barTrace(data.newVsReturning.map((p) => p.t), data.newVsReturning.map((p) => p.newCustomers), "New", "var(--series-2)", { hovertemplate: "%{x}<br>New: %{y}<extra></extra>" }),
            ]}
            layout={{ barmode: "stack", showlegend: false, bargap: 0.2 }}
          />
        </ChartCard>
        <ChartCard title="Lifetime spend distribution" subtitle="Customers by total spend to the end of the period">
          <Plot
            ariaLabel="Histogram of customer lifetime spend"
            data={[{ type: "histogram", x: data.clvValues, nbinsx: 30, marker: { color: "var(--series-1)", line: { color: "var(--surface-raised)", width: 1 } }, hovertemplate: "%{x}<br>%{y} customers<extra></extra>" }]}
            layout={{ xaxis: { tickprefix: "$", tickformat: "~s" }, yaxis: { title: { text: "Customers", font: { size: 12 } } } }}
          />
        </ChartCard>
      </div>

      <div className="grid gap-space-6 xl:grid-cols-12">
        <ChartCard className="xl:col-span-4" title="Net sales by customer segment" subtitle={period.label}>
          <Plot ariaLabel="Bar chart of net sales by customer segment" data={[barTrace(data.bySegment.map((s) => s.key), data.bySegment.map((s) => s.netSales), "Net sales", "var(--series-1)")]} layout={{ yaxis: { tickprefix: "$", tickformat: "~s" } }} />
        </ChartCard>
        <div className="grid min-w-0 content-start gap-space-3 xl:col-span-8">
          <h2 className="text-heading text-ink">Top customers by lifetime spend</h2>
          <DataTable caption="Top customers" columns={TOP_COLS} rows={data.top} rowKey={(r) => r.customer_id} />
          <p className="text-label font-normal text-ink-subtle">Names and contact details are not shown. {money(data.top.reduce((a, b) => a + b.spend, 0))} from these ten customers.</p>
        </div>
      </div>
    </>
  );
}
