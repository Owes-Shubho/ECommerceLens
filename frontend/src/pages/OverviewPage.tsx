import { Link } from "react-router-dom";
import { Lightbulb } from "lucide-react";
import { ChartCard, DataTable, KpiCard, type Column } from "@/components/ui";
import { KpiRow, Panel, PeriodNote } from "@/components/Panel";
import { PageFilters } from "@/components/PageFilters";
import { useTableToggle } from "@/components/TableToggle";
import { barTrace, lineTrace, Plot } from "@/charts/Plot";
import { fmtDay, fmtMonth } from "@/data/dates";
import { useFiltered } from "@/hooks/useApi";
import { int, money, moneyExact, pct } from "@/lib/format";
import { getOverview } from "@/services/analytics";
import { LoadingGrid, MiniTable } from "@/components/MiniTable";

type Top = Awaited<ReturnType<typeof getOverview>>["topProducts"][number];
const TOP_COLS: Column<Top>[] = [
  { key: "product_name", label: "Product" },
  { key: "product_category", label: "Category" },
  { key: "orders", label: "Orders", align: "right", format: (v) => int(v as number) },
  { key: "net_sales", label: "Net sales", align: "right", format: (v) => moneyExact(v as number) },
  { key: "margin", label: "Margin", align: "right", format: (v) => pct(v as number) },
];

export default function OverviewPage() {
  const { data, isLoading } = useFiltered("overview", getOverview);
  const trendRows = (data?.trend ?? []).map((p) => ({ period: p.t, net_sales: p.netSales.toFixed(2), profit: p.profit.toFixed(2), orders: p.orders }));
  const trendT = useTableToggle(trendRows, "net-sales-trend.csv");
  const catRows = (data?.byCategory ?? []).map((c) => ({ category: c.key, net_sales: c.netSales.toFixed(2), profit: c.profit.toFixed(2), orders: c.orders }));
  const catT = useTableToggle(catRows, "sales-by-category.csv");

  if (isLoading || !data) return <LoadingGrid />;
  const { kpis: k, period } = data;
  const fmtT = (t: string) => (data.granularity === "Month" ? fmtMonth(t) : fmtDay(t));
  const cats = data.byCategory.slice(0, 10).reverse();

  return (
    <>
      <PageFilters />
      <PeriodNote label={period.label} prevLabel={period.prevLabel} />
      <KpiRow columns={3}>
        <KpiCard label="Net sales" value={money(k.netSales.value)} delta={k.netSales.delta} deltaLabel={period.prevLabel} trend={data.trend.map((p) => p.netSales)} />
        <KpiCard label="Profit" value={money(k.profit.value)} delta={k.profit.delta} deltaLabel={period.prevLabel} trend={data.trend.map((p) => p.profit)} />
        <KpiCard label="Orders" value={int(k.orders.value)} delta={k.orders.delta} deltaLabel={period.prevLabel} trend={data.trend.map((p) => p.orders)} />
        <KpiCard label="Avg order value" value={moneyExact(k.aov.value)} delta={k.aov.delta} deltaLabel={period.prevLabel} />
        <KpiCard label="Return rate" value={k.returnRate.value.toFixed(2)} unit="%" delta={k.returnRate.delta} deltaUnit="pp" goodDirection="down" deltaLabel={period.prevLabel} />
        <KpiCard label="Avg rating" value={k.avgRating.value.toFixed(2)} unit="/ 5" delta={k.avgRating.delta} deltaLabel={period.prevLabel} />
      </KpiRow>

      <div className="grid gap-space-6 xl:grid-cols-12">
        <ChartCard
          className="xl:col-span-8"
          title={`Net sales and profit by ${data.granularity.toLowerCase()}`}
          subtitle={period.label}
          legend={[{ label: "Net sales", color: "var(--series-1)" }, { label: "Profit", color: "var(--series-2)" }]}
          actions={trendT.actions}
          footnote="Net sales exclude cancelled and returned orders."
        >
          {trendT.table ? (
            <MiniTable rows={data.trend.map((p) => [fmtT(p.t), money(p.netSales), money(p.profit), int(p.orders)])} head={["Period", "Net sales", "Profit", "Orders"]} />
          ) : (
            <Plot
              ariaLabel="Line chart of net sales and profit over time"
              data={[
                lineTrace(data.trend.map((p) => p.t), data.trend.map((p) => p.netSales), "Net sales", "var(--series-1)", { fill: "tozeroy", fillcolor: "rgba(235,104,52,0.08)" }),
                lineTrace(data.trend.map((p) => p.t), data.trend.map((p) => p.profit), "Profit", "var(--series-2)"),
              ]}
              layout={{ showlegend: false, yaxis: { tickprefix: "$", tickformat: "~s" }, hovermode: "x unified" }}
            />
          )}
        </ChartCard>
        <Panel className="xl:col-span-4" title="What stands out" subtitle="Computed from the filtered data">
          <ul className="grid gap-space-3">
            {data.insights.map((s) => (
              <li key={s} className="flex gap-space-2 text-body text-ink">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-lens" aria-hidden />
                <span>{s}</span>
              </li>
            ))}
          </ul>
          <Link to="/assistant" className="text-body-sm font-medium text-link underline-offset-2 hover:underline">
            Ask Lens a follow-up question
          </Link>
        </Panel>
      </div>

      <div className="grid gap-space-6 xl:grid-cols-12">
        <ChartCard className="xl:col-span-7" title="Net sales by category" subtitle="Top 10 categories" actions={catT.actions}>
          {catT.table ? (
            <MiniTable rows={data.byCategory.map((c) => [c.key, money(c.netSales), money(c.profit), int(c.orders)])} head={["Category", "Net sales", "Profit", "Orders"]} />
          ) : (
            <Plot
              height={320}
              ariaLabel="Horizontal bar chart of net sales by category"
              data={[barTrace(cats.map((c) => c.netSales), cats.map((c) => c.key), "Net sales", "var(--series-1)", { orientation: "h", hovertemplate: "%{y}: %{x:$,.0f}<extra></extra>" })]}
              layout={{ margin: { l: 150, r: 16, t: 8, b: 32 }, xaxis: { tickprefix: "$", tickformat: "~s" }, yaxis: { automargin: true } }}
            />
          )}
        </ChartCard>
        <ChartCard className="xl:col-span-5" title="Net sales by channel" subtitle={period.label}>
          <Plot
            height={320}
            ariaLabel="Bar chart of net sales by sales channel"
            data={[barTrace(data.byChannel.map((c) => c.key), data.byChannel.map((c) => c.netSales), "Net sales", "var(--series-1)", { text: data.byChannel.map((c) => money(c.netSales)), textposition: "outside", cliponaxis: false })]}
            layout={{ yaxis: { tickprefix: "$", tickformat: "~s" } }}
          />
        </ChartCard>
      </div>

      <div className="grid gap-space-6 xl:grid-cols-12">
        <div className="grid min-w-0 content-start gap-space-3 xl:col-span-8">
          <h2 className="text-heading text-ink">Top products</h2>
          <DataTable caption="Top products by net sales" columns={TOP_COLS} rows={data.topProducts} rowKey={(r) => r.product_id} />
        </div>
        <ChartCard className="xl:col-span-4" title="Net sales by region" subtitle={period.label}>
          <Plot
            height={260}
            ariaLabel="Bar chart of net sales by region"
            data={[barTrace(data.byRegion.map((c) => c.key), data.byRegion.map((c) => c.netSales), "Net sales", "var(--series-1)")]}
            layout={{ yaxis: { tickprefix: "$", tickformat: "~s" } }}
          />
        </ChartCard>
      </div>
    </>
  );
}
