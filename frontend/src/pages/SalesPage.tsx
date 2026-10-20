import { useState } from "react";
import { ChartCard, DataTable, KpiCard, SegmentedControl, type Column } from "@/components/ui";
import { KpiRow, PeriodNote } from "@/components/Panel";
import { PageFilters } from "@/components/PageFilters";
import { LoadingGrid, MiniTable } from "@/components/MiniTable";
import { useTableToggle } from "@/components/TableToggle";
import { barTrace, lineTrace, Plot } from "@/charts/Plot";
import type { Granularity } from "@/data/aggregate";
import { fmtDay, fmtMonth } from "@/data/dates";
import { useFiltered } from "@/hooks/useApi";
import { int, money, moneyExact, pct } from "@/lib/format";
import { autoGranularity, getSales } from "@/services/analytics";
import { useFilters } from "@/store/filters";

type Dim = Awaited<ReturnType<typeof getSales>>["byMarketing"][number];
const MKT_COLS: Column<Dim>[] = [
  { key: "key", label: "Marketing channel" },
  { key: "orders", label: "Orders", align: "right", format: (v) => int(v as number) },
  { key: "netSales", label: "Net sales", align: "right", format: (v) => moneyExact(v as number) },
  { key: "aov", label: "AOV", align: "right", format: (v) => moneyExact(v as number) },
  { key: "discountPct", label: "Avg discount", align: "right", format: (v) => pct(v as number) },
  { key: "marginPct", label: "Margin", align: "right", format: (v) => pct(v as number) },
];

export default function SalesPage() {
  const range = useFilters((s) => s.filters.range);
  const [gran, setGran] = useState<Granularity | "Auto">("Auto");
  const g: Granularity = gran === "Auto" ? autoGranularity({ range } as never) : gran;
  const { data, isLoading } = useFiltered("sales", (f) => getSales(f, g), [g]);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "netSales", dir: "desc" });
  const trendT = useTableToggle((data?.trend ?? []).map((p) => ({ period: p.t, gross_sales: p.gross.toFixed(2), net_sales: p.netSales.toFixed(2), orders: p.orders })), "sales-trend.csv");
  if (isLoading || !data) return <LoadingGrid />;
  const { kpis: k, period } = data;
  const fmtT = (t: string) => (g === "Month" ? fmtMonth(t) : fmtDay(t));
  const mkt = [...data.byMarketing].sort((a, b) => ((a[sort.key as keyof Dim] as number) - (b[sort.key as keyof Dim] as number)) * (sort.dir === "asc" ? 1 : -1));

  return (
    <>
      <PageFilters />
      <PeriodNote label={period.label} prevLabel={period.prevLabel} />
      <KpiRow>
        <KpiCard label="Net sales" value={money(k.netSales.value)} delta={k.netSales.delta} deltaLabel={period.prevLabel} />
        <KpiCard label="Gross sales" value={money(k.grossSales.value)} delta={k.grossSales.delta} deltaLabel={period.prevLabel} />
        <KpiCard label="Discounts given" value={money(k.discount.value)} delta={k.discount.delta} goodDirection="down" deltaLabel={period.prevLabel} />
        <KpiCard label="Profit margin" value={k.marginPct.value.toFixed(1)} unit="%" delta={k.marginPct.delta} deltaUnit="pp" deltaLabel={period.prevLabel} />
      </KpiRow>

      <ChartCard
        title="Gross and net sales over time"
        subtitle={`${period.label} · by ${g.toLowerCase()}`}
        legend={[{ label: "Gross sales", color: "var(--series-1)" }, { label: "Net sales", color: "var(--series-3)" }]}
        actions={
          <>
            <SegmentedControl label="Granularity" options={["Auto", "Day", "Week", "Month"]} value={gran} onChange={(v) => setGran(v as Granularity | "Auto")} />
            {trendT.actions}
          </>
        }
        footnote="Gross sales include every order; net sales are after discounts and exclude cancelled and returned orders."
      >
        {trendT.table ? (
          <MiniTable head={["Period", "Gross sales", "Net sales", "Orders"]} rows={data.trend.map((p) => [fmtT(p.t), money(p.gross), money(p.netSales), int(p.orders)])} />
        ) : (
          <Plot
            height={300}
            ariaLabel="Line chart of gross and net sales over time"
            data={[lineTrace(data.trend.map((p) => p.t), data.trend.map((p) => p.gross), "Gross sales", "var(--series-1)"), lineTrace(data.trend.map((p) => p.t), data.trend.map((p) => p.netSales), "Net sales", "var(--series-3)")]}
            layout={{ showlegend: false, hovermode: "x unified", yaxis: { tickprefix: "$", tickformat: "~s" } }}
          />
        )}
      </ChartCard>

      <div className="grid gap-space-6 lg:grid-cols-2">
        <ChartCard title="Net sales by channel" subtitle="With average order value">
          <Plot
            ariaLabel="Bar chart of net sales by channel"
            data={[barTrace(data.byChannel.map((c) => c.key), data.byChannel.map((c) => c.netSales), "Net sales", "var(--series-1)", { customdata: data.byChannel.map((c) => c.aov), hovertemplate: "%{x}<br>Net sales: %{y:$,.0f}<br>AOV: %{customdata:$,.2f}<extra></extra>", text: data.byChannel.map((c) => money(c.netSales)), textposition: "outside", cliponaxis: false })]}
            layout={{ yaxis: { tickprefix: "$", tickformat: "~s" } }}
          />
        </ChartCard>
        <ChartCard title="Net sales by payment method" subtitle={period.label}>
          <Plot
            ariaLabel="Horizontal bar chart of net sales by payment method"
            data={[barTrace([...data.byPayment].reverse().map((c) => c.netSales), [...data.byPayment].reverse().map((c) => c.key), "Net sales", "var(--series-1)", { orientation: "h", hovertemplate: "%{y}: %{x:$,.0f}<extra></extra>" })]}
            layout={{ margin: { l: 130, r: 16, t: 8, b: 32 }, xaxis: { tickprefix: "$", tickformat: "~s" } }}
          />
        </ChartCard>
        <ChartCard title="Does discounting pay off?" subtitle="Profit margin by discount band" footnote="Deeper discounts lower the margin on each order.">
          <Plot
            ariaLabel="Bar chart of profit margin by discount band"
            data={[barTrace(data.discountBands.map((b) => b.key), data.discountBands.map((b) => b.marginPct), "Margin", "var(--series-1)", { hovertemplate: "Discount %{x}<br>Margin: %{y:.1f}%<extra></extra>", text: data.discountBands.map((b) => pct(b.marginPct)), textposition: "outside", cliponaxis: false })]}
            layout={{ yaxis: { ticksuffix: "%", rangemode: "tozero" }, xaxis: { title: { text: "Discount on the order", font: { size: 12 } } } }}
          />
        </ChartCard>
        <ChartCard title="Net sales by country" subtitle={period.label}>
          <Plot
            ariaLabel="Bar chart of net sales by country"
            data={[barTrace(data.byCountry.map((c) => c.key), data.byCountry.map((c) => c.netSales), "Net sales", "var(--series-1)")]}
            layout={{ yaxis: { tickprefix: "$", tickformat: "~s" } }}
          />
        </ChartCard>
      </div>

      <div className="grid gap-space-3">
        <h2 className="text-heading text-ink">Marketing channels</h2>
        <DataTable caption="Sales by marketing channel" columns={MKT_COLS} rows={mkt} rowKey={(r) => r.key} sortKey={sort.key} sortDir={sort.dir} onSort={(key, dir) => setSort({ key, dir })} />
      </div>
    </>
  );
}
