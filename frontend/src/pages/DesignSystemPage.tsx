import { useMemo, useState } from "react";
import { Download, Sparkles } from "lucide-react";
import tokens from "@/design-system/tokens.json";
import { Alert, Button, ChartCard, ChatMessage, DataTable, Field, FilterBar, KpiCard, SegmentedControl, StatusPill, type Column, type FilterChip } from "@/components/ui";
import { seriesColor } from "@/lib/plotlyTheme";
import { cn } from "@/lib/utils";

// Showcase of every component. Totals are the dataset's real figures; deltas, trends and splits are illustrative.

type CategoryRow = { product_category: string; orders: number; net_sales: number; margin: number };
const CATEGORY_ROWS: CategoryRow[] = [
  { product_category: "Electronics", orders: 31842, net_sales: 52418230.5, margin: 38.2 },
  { product_category: "Home & Kitchen", orders: 27310, net_sales: 33904118.0, margin: 44.9 },
  { product_category: "Fashion", orders: 25604, net_sales: 24870551.2, margin: 47.1 },
  { product_category: "Sports", orders: 18977, net_sales: 19022010.9, margin: 41.6 },
];
const money = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const COLUMNS: Column<CategoryRow>[] = [
  { key: "product_category", label: "Category" },
  { key: "orders", label: "Orders", align: "right", format: (v) => (v as number).toLocaleString("en-US") },
  { key: "net_sales", label: "Net sales", align: "right", format: (v) => money(v as number) },
  { key: "margin", label: "Margin", align: "right", format: (v) => `${(v as number).toFixed(1)}%` },
];
const YEARS: [string, number, number][] = [
  ["2021", 22.1, 9.4], ["2022", 24.0, 10.1], ["2023", 25.3, 10.9], ["2024", 26.8, 11.6], ["2025", 28.4, 12.3],
];
const PLAN = JSON.stringify(
  { intent: "ranking", metric: "profit_margin_percentage", aggregation: "avg", group_by: ["product_category"], filters: [{ column: "order_date", op: "between", value: ["2024-01-01", "2024-12-31"] }], order: "desc", limit: 5 },
  null,
  2,
);

function Section({ title, note, className, children }: { title: string; note?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("grid min-w-0 content-start gap-space-3", className)}>
      <div>
        <h2 className="text-heading text-ink">{title}</h2>
        {note ? <p className="text-body-sm text-ink-muted">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

function GroupedBars() {
  const W = 560, H = 220, L = 44, B = 26, max = 30;
  const y = (v: number) => H - B - (v / max) * (H - B - 10);
  const slot = (W - L - 8) / YEARS.length;
  const bw = (slot - 24) / 2;
  const bar = (x: number, v: number, fill: string) => (
    <path d={`M${x} ${y(0)} V${y(v) + 4} q0 -4 4 -4 h${bw - 8} q4 0 4 4 V${y(0)} Z`} fill={fill} />
  );
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full max-w-[560px]" role="img" aria-label="Revenue and profit by year, 2021 to 2025">
      {[0, 10, 20, 30].map((t) => (
        <g key={t}>
          <line x1={L} x2={W - 8} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" />
          <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize={12} fill="var(--ink-muted)" className="tabular">${t}M</text>
        </g>
      ))}
      {YEARS.map(([yr, rev, prof], i) => {
        const x = L + 12 + i * slot;
        return (
          <g key={yr}>
            {bar(x, rev, seriesColor(1))}
            {bar(x + bw + 2, prof, seriesColor(2))}
            <text x={x + bw} y={H - 8} textAnchor="middle" fontSize={12} fill="var(--ink-muted)">{yr}</text>
            {i === YEARS.length - 1 ? (
              <text x={x + bw / 2} y={y(rev) - 6} textAnchor="middle" fontSize={12} fontWeight={500} fill="var(--ink)">${rev}M</text>
            ) : null}
          </g>
        );
      })}
      <line x1={L} x2={W - 8} y1={y(0)} y2={y(0)} stroke="var(--chart-axis)" />
    </svg>
  );
}

export function DesignSystemPage() {
  const [range, setRange] = useState("1Y");
  const [region, setRegion] = useState("All regions");
  const [channel, setChannel] = useState("All channels");
  const [chips, setChips] = useState<FilterChip[]>([{ label: "Category", value: "Electronics" }, { label: "Segment", value: "Corporate" }]);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "net_sales", dir: "desc" });
  const [cid, setCid] = useState("");
  const [margin, setMargin] = useState("-5");

  const rows = useMemo(() => {
    const k = sort.key as keyof CategoryRow;
    return [...CATEGORY_ROWS].sort((a, b) => (a[k] > b[k] ? 1 : -1) * (sort.dir === "asc" ? 1 : -1));
  }, [sort]);

  const colorTokens = tokens.color.tokens;

  return (
    <>
      <p className="max-w-[65ch] text-body text-ink-muted">
        Every component of the ECommerceLens design system, wired to the tokens in <code className="font-mono text-code">src/design-system/tokens.json</code>. Totals are the
        dataset's real figures; deltas, trends and category splits here are illustrative.
      </p>

      <Section title="Filter bar">
        <FilterBar chips={chips} onRemove={(c) => setChips(chips.filter((x) => x !== c))} actions={<Button variant="ghost" onClick={() => setChips([])}>Reset filters</Button>}>
          <SegmentedControl label="Date range" options={["30D", "90D", "YTD", "1Y", "All"]} value={range} onChange={setRange} />
          <Field label="Region" options={["All regions", "North America", "Europe", "Asia Pacific"]} value={region} onChange={setRegion} className="w-44" />
          <Field label="Channel" options={["All channels", "Website", "Mobile app", "Marketplace"]} value={channel} onChange={setChannel} className="w-44" />
        </FilterBar>
      </Section>

      <Section title="KPI cards">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-space-4">
          <KpiCard label="Net revenue" value="$177.13M" delta={8.4} deltaLabel="vs 2024" trend={[21, 24, 23, 27, 29, 28, 33, 35]} />
          <KpiCard label="Profit" value="$76.15M" delta={5.2} deltaLabel="vs 2024" trend={[9, 10, 10, 11, 12, 12, 13, 14]} />
          <KpiCard label="Avg order value" value="$1,282.50" delta={-1.9} deltaLabel="vs 2024" trend={[1320, 1301, 1312, 1290, 1296, 1284, 1279, 1282]} />
          <KpiCard label="Return rate" value="6.85" unit="%" delta={-0.6} goodDirection="down" deltaLabel="vs 2024" trend={[7.6, 7.4, 7.5, 7.1, 7, 6.9, 6.9, 6.85]} />
        </div>
      </Section>

      <div className="grid gap-space-6 xl:grid-cols-12">
        <Section title="Chart card" note="Plot with Plotly and plotlyLayout(); this one is plain SVG." className="xl:col-span-7">
          <ChartCard
            title="Revenue and profit by year"
            subtitle="All channels · 2021–2025"
            legend={[{ label: "Net sales", color: seriesColor(1) }, { label: "Profit", color: seriesColor(2) }]}
            actions={<><Button variant="ghost" size="sm">Table</Button><Button variant="ghost" size="sm" icon={<Download aria-hidden />}>PNG</Button></>}
            footnote="Illustrative values. Source: DuckDB view sales_yearly."
          >
            <GroupedBars />
          </ChartCard>
        </Section>
        <Section title="Data table" note="Click a column header to sort." className="xl:col-span-5">
          <DataTable caption="Sales by category" columns={COLUMNS} rows={rows} rowKey={(r) => r.product_category} sortKey={sort.key} sortDir={sort.dir} onSort={(key, dir) => setSort({ key, dir })} />
        </Section>
      </div>

      <Section title="Lens assistant">
        <div className="grid gap-space-4 rounded-md border border-line bg-surface p-space-4">
          <ChatMessage role="user">Which category had the highest profit margin in 2024?</ChatMessage>
          <ChatMessage role="assistant" guard="passed" plan={PLAN} meta={{ model: "OpenRouter · fast model", tokens: 1184, latencyMs: 1420, cost: 0.0006 }}>
            <p><b>Fashion</b> had the highest average margin in 2024 at 47.1%, ahead of Home &amp; Kitchen (44.9%) and Sports (41.6%).</p>
            <p>Electronics brought in the most revenue but had the lowest margin of the four, 38.2%.</p>
          </ChatMessage>
          <Alert tone="critical" title="Query blocked by the Query Guard">The request tried to modify data (DROP TABLE). Lens only runs read-only analytical queries.</Alert>
        </div>
      </Section>

      <div className="grid gap-space-6 lg:grid-cols-2">
        <Section title="Alerts">
          <div className="grid gap-space-3">
            <Alert tone="serious" title="Query auto-repaired once">Column "category" did not exist; Lens used product_category instead.</Alert>
            <Alert tone="warning" title="Dataset is 14 days old">Upload a newer export on Dataset management to refresh every page.</Alert>
            <Alert tone="neutral" title="Customer names are hidden">Personal fields are masked before anything is sent to the model.</Alert>
          </div>
        </Section>
        <Section title="Buttons, pills and fields">
          <div className="grid gap-space-4">
            <div className="flex flex-wrap gap-space-3">
              <Button variant="primary" icon={<Sparkles aria-hidden />}>Ask Lens</Button>
              <Button icon={<Download aria-hidden />}>Export PDF</Button>
              <Button variant="ghost">Reset filters</Button>
              <Button variant="danger">Delete dataset version</Button>
              <Button disabled>Exporting…</Button>
            </div>
            <div className="flex flex-wrap gap-space-2">
              <StatusPill tone="good">Guardrails passed</StatusPill>
              <StatusPill tone="warning">Slow query · 2.4 s</StatusPill>
              <StatusPill tone="serious">Fallback model</StatusPill>
              <StatusPill tone="critical">Blocked</StatusPill>
              <StatusPill tone="lens">LSTM</StatusPill>
              <StatusPill>v1 · 2025-12-31</StatusPill>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-space-3">
              <Field label="Customer ID" placeholder="CUST-000123" value={cid} onChange={setCid} hint="Exact match" />
              <Field label="Min. margin %" value={margin} onChange={setMargin} error={Number(margin) < 0 || Number(margin) > 100 ? "Enter a value from 0 to 100" : undefined} />
            </div>
          </div>
        </Section>
      </div>

      <Section title="Colour tokens" note="Switch the theme in the header to see the dark values.">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-space-3">
          {colorTokens.map((t) => (
            <div key={t.name} className="overflow-hidden rounded-md border border-line bg-surface-raised">
              <div className="h-10 border-b border-line" style={{ background: `var(--${t.name})` }} />
              <div className="px-space-3 py-space-2 font-mono text-code text-ink">{t.name}</div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
