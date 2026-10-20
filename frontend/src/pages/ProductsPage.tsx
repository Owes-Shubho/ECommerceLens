import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button, ChartCard, DataTable, Field, type Column } from "@/components/ui";
import { PageFilters } from "@/components/PageFilters";
import { LoadingGrid } from "@/components/MiniTable";
import { barTrace, Plot } from "@/charts/Plot";
import { useFiltered } from "@/hooks/useApi";
import { downloadCsv } from "@/lib/csv";
import { int, money, moneyExact, num1, pct } from "@/lib/format";
import { getProducts } from "@/services/analytics";

type Row = Awaited<ReturnType<typeof getProducts>>["products"][number];
const COLS: Column<Row>[] = [
  { key: "product_id", label: "ID", mono: true },
  { key: "product_name", label: "Product" },
  { key: "product_category", label: "Category" },
  { key: "orders", label: "Orders", align: "right", format: (v) => int(v as number) },
  { key: "net_sales", label: "Net sales", align: "right", format: (v) => moneyExact(v as number) },
  { key: "margin", label: "Margin", align: "right", format: (v) => pct(v as number) },
  { key: "return_rate", label: "Return rate", align: "right", format: (v) => pct(v as number) },
  { key: "rating", label: "Rating", align: "right", format: (v) => num1(v as number) },
];
const PAGE = 12;

export default function ProductsPage() {
  const [focus, setFocus] = useState<string | null>(null);
  const { data, isLoading } = useFiltered("products", (f) => getProducts(f, focus), [focus]);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "net_sales", dir: "desc" });
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const rows = useMemo(() => {
    const list = (data?.products ?? []).filter((p) => !q || `${p.product_name} ${p.product_id} ${p.brand}`.toLowerCase().includes(q.toLowerCase()));
    return list.sort((a, b) => {
      const x = a[sort.key as keyof Row], y = b[sort.key as keyof Row];
      return (typeof x === "number" ? (x as number) - (y as number) : String(x).localeCompare(String(y))) * (sort.dir === "asc" ? 1 : -1);
    });
  }, [data, q, sort]);
  if (isLoading || !data) return <LoadingGrid />;
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const shown = rows.slice(page * PAGE, page * PAGE + PAGE);
  const cats = [...data.byCategory].reverse();

  return (
    <>
      <PageFilters showCategory={false} />
      <div className="grid gap-space-6 xl:grid-cols-12">
        <ChartCard className="xl:col-span-7" title="Net sales by category" subtitle="Click a bar to see its subcategories and products">
          <Plot
            height={420}
            ariaLabel="Horizontal bar chart of net sales by category; click a bar to drill down"
            onClickPoint={(pt) => { const c = String(pt.y); setFocus(focus === c ? null : c); setPage(0); }}
            data={[barTrace(cats.map((c) => c.netSales), cats.map((c) => c.key), "Net sales", "var(--series-1)", {
              orientation: "h",
              marker: { color: cats.map((c) => (focus && c.key !== focus ? "var(--seq-1)" : "var(--series-1)")) },
              hovertemplate: "%{y}: %{x:$,.0f}<extra></extra>",
            })]}
            layout={{ margin: { l: 160, r: 16, t: 8, b: 32 }, xaxis: { tickprefix: "$", tickformat: "~s" } }}
          />
          <CategoryClicker cats={data.byCategory.map((c) => c.key)} focus={focus} onFocus={(c) => { setFocus(c); setPage(0); }} />
        </ChartCard>
        <ChartCard className="xl:col-span-5" title="Margin vs return rate" subtitle="One dot per category" footnote="Top-right is the best place to be: high margin, few returns.">
          <Plot
            height={420}
            ariaLabel="Scatter plot of profit margin against return rate by category"
            data={[{
              type: "scatter", mode: "text+markers", x: data.byCategory.map((c) => c.returnRate), y: data.byCategory.map((c) => c.marginPct), text: data.byCategory.map((c) => c.key), textposition: "top center", textfont: { size: 10, color: "var(--ink-muted)" },
              marker: { size: data.byCategory.map((c) => 8 + Math.sqrt(c.netSales / 2e4)), color: data.byCategory.map((c) => (c.key === focus ? "var(--series-2)" : "var(--series-1)")), line: { color: "var(--surface-raised)", width: 2 } },
              hovertemplate: "%{text}<br>Return rate %{x:.1f}%<br>Margin %{y:.1f}%<extra></extra>",
            }]}
            layout={{ xaxis: { title: { text: "Return rate", font: { size: 12 } }, ticksuffix: "%", autorange: "reversed" }, yaxis: { title: { text: "Profit margin", font: { size: 12 } }, ticksuffix: "%" } }}
          />
        </ChartCard>
      </div>

      <div className="grid gap-space-6 lg:grid-cols-2">
        <ChartCard title={focus ? `${focus}: net sales by subcategory` : "Net sales by category"} subtitle={focus ? "Subcategories of the selected category" : "Pick a category to see its subcategories"}>
          <Plot ariaLabel="Bar chart of net sales by subcategory" data={[barTrace(data.bySub.map((s) => s.key), data.bySub.map((s) => s.netSales), "Net sales", "var(--series-1)")]} layout={{ margin: { l: 52, r: 16, t: 8, b: 96 }, yaxis: { tickprefix: "$", tickformat: "~s" }, xaxis: { tickangle: -35, automargin: true } }} />
        </ChartCard>
        <ChartCard title="Top 10 brands" subtitle={focus ?? "All categories"}>
          <Plot ariaLabel="Bar chart of net sales for the top 10 brands" data={[barTrace(data.brands.map((s) => s.key), data.brands.map((s) => s.netSales), "Net sales", "var(--series-1)")]} layout={{ margin: { l: 52, r: 16, t: 8, b: 96 }, yaxis: { tickprefix: "$", tickformat: "~s" }, xaxis: { tickangle: -35, automargin: true } }} />
        </ChartCard>
      </div>

      <div className="grid gap-space-3">
        <div className="flex flex-wrap items-end justify-between gap-space-3">
          <div>
            <h2 className="text-heading text-ink">Products{focus ? ` in ${focus}` : ""}</h2>
            <p className="text-body-sm text-ink-muted">{int(rows.length)} products sold in this period · {money(rows.reduce((a, b) => a + b.net_sales, 0))} net sales</p>
          </div>
          <div className="flex items-end gap-space-2">
            <Field label="Search" placeholder="Name, ID or brand" value={q} onChange={(v) => { setQ(v); setPage(0); }} className="w-56" />
            <Button onClick={() => downloadCsv("products.csv", rows)}>Export CSV</Button>
          </div>
        </div>
        <DataTable caption="Products" columns={COLS} rows={shown} rowKey={(r) => r.product_id} sortKey={sort.key} sortDir={sort.dir} onSort={(key, dir) => setSort({ key, dir })} />
        <div className="flex items-center justify-between text-body-sm text-ink-muted">
          <span>Page {page + 1} of {pages}</span>
          <div className="flex gap-space-2">
            <Button size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button size="sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      </div>
    </>
  );
}

function CategoryClicker({ cats, focus, onFocus }: { cats: string[]; focus: string | null; onFocus: (c: string | null) => void }) {
  return (
    <div className="flex flex-wrap items-end gap-space-2">
      <Field label="Drill into category" options={[{ value: "", label: "All categories" }, ...cats.map((c) => ({ value: c, label: c }))]} value={focus ?? ""} onChange={(v) => onFocus(v || null)} className="w-56" />
      {focus ? <Button variant="ghost" icon={<X aria-hidden />} onClick={() => onFocus(null)}>Clear</Button> : null}
    </div>
  );
}
