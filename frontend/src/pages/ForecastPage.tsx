import { useMemo, useState } from "react";
import { Alert, ChartCard, DataTable, Field, KpiCard, SegmentedControl, StatusPill, type Column } from "@/components/ui";
import { KpiRow } from "@/components/Panel";
import { lineTrace, Plot, type PlotData } from "@/charts/Plot";
import { CATEGORIES, CHANNELS } from "@/data/catalog";
import { addDays, weekStart } from "@/data/dates";
import { ALL } from "@/data/filters";
import { money, num1 } from "@/lib/format";
import { forecast, MODELS, type Metrics, type ModelId } from "@/ml/forecast";
import { dailySeries } from "@/services/analytics";

type Gran = "Daily" | "Weekly";
const HORIZONS: Record<Gran, { value: string; label: string }[]> = {
  Daily: [{ value: "7", label: "7 days" }, { value: "14", label: "14 days" }, { value: "30", label: "30 days" }],
  Weekly: [{ value: "4", label: "4 weeks" }, { value: "8", label: "8 weeks" }, { value: "12", label: "12 weeks" }],
};

type Row = { model: string; id: ModelId } & Metrics;

export default function ForecastPage() {
  const [gran, setGran] = useState<Gran>("Weekly");
  const [model, setModel] = useState<ModelId>("lstm");
  const [horizon, setHorizon] = useState("8");
  const [category, setCategory] = useState(ALL);
  const [channel, setChannel] = useState(ALL);

  const result = useMemo(() => {
    const daily = dailySeries({ region: ALL, segment: ALL, category, channel });
    let t: string[], y: number[];
    if (gran === "Daily") {
      t = daily.map((d) => d.t);
      y = daily.map((d) => d.net);
    } else {
      const m = new Map<string, number>();
      for (const d of daily) m.set(weekStart(d.t), (m.get(weekStart(d.t)) ?? 0) + d.net);
      t = [...m.keys()].slice(1, -1); // drop partial first/last weeks
      y = t.map((k) => m.get(k)!);
    }
    const S = gran === "Daily" ? 7 : 52;
    const step = gran === "Daily" ? 1 : 7;
    return forecast(t, y, model, S, Number(horizon), (last, i) => addDays(last, i * step));
  }, [gran, model, horizon, category, channel]);

  const { t, actual, testPred, splitIndex, future, metrics, allMetrics } = result;
  const show = gran === "Daily" ? 240 : t.length; // daily: zoom to the last ~8 months
  const from = Math.max(0, t.length - show);
  const best = (Object.entries(allMetrics) as [ModelId, Metrics][]).sort((a, b) => a[1].rmse - b[1].rmse)[0][0];
  const rows: Row[] = MODELS.map((m) => ({ model: m.label, id: m.id, ...allMetrics[m.id] }));
  const cols: Column<Row>[] = [
    { key: "model", label: "Model", format: (v, r) => (<span className="inline-flex items-center gap-space-2">{v as string}{r.id === best ? <StatusPill tone="good">Best RMSE</StatusPill> : null}</span>) },
    { key: "mae", label: "MAE", align: "right", format: (v) => money(v as number) },
    { key: "rmse", label: "RMSE", align: "right", format: (v) => money(v as number) },
    { key: "mape", label: "MAPE", align: "right", format: (v) => `${num1(v as number)}%` },
    { key: "r2", label: "R²", align: "right", format: (v) => (v as number).toFixed(3) },
  ];
  const unit = gran === "Daily" ? "day" : "week";
  const total = future.yhat.reduce((a, b) => a + b, 0);
  const lastEqual = actual.slice(-future.yhat.length).reduce((a, b) => a + b, 0);

  const data: PlotData[] = [
    lineTrace(t.slice(from), actual.slice(from), "Actual", "var(--series-1)", { line: { color: "var(--series-1)", width: gran === "Daily" ? 1.5 : 2 } }),
    lineTrace(t.slice(from), testPred.slice(from), "Test prediction", "var(--series-2)", { connectgaps: false }),
    { type: "scatter", mode: "lines", x: [...future.t, ...[...future.t].reverse()], y: [...future.hi, ...[...future.lo].reverse()], fill: "toself", fillcolor: "rgba(27,175,122,0.16)", line: { width: 0 }, hoverinfo: "skip", name: "95% band", showlegend: false },
    lineTrace([t[t.length - 1], ...future.t], [actual[actual.length - 1], ...future.yhat], "Forecast", "var(--series-2)", { line: { color: "var(--series-2)", width: 2, dash: "dash" } }),
  ];

  return (
    <>
      <div className="flex flex-wrap items-end gap-space-3 rounded-md border border-line bg-surface-sunken px-space-4 py-space-3">
        <div className="grid gap-space-1">
          <span className="text-label text-ink-muted">Series</span>
          <SegmentedControl label="Series granularity" options={["Daily", "Weekly"]} value={gran} onChange={(v) => { setGran(v as Gran); setHorizon(v === "Daily" ? "14" : "8"); }} />
        </div>
        <Field label="Model" options={MODELS.map((m) => ({ value: m.id, label: m.label }))} value={model} onChange={(v) => setModel(v as ModelId)} className="w-56" />
        <div className="grid gap-space-1">
          <span className="text-label text-ink-muted">Horizon</span>
          <SegmentedControl label="Forecast horizon" options={HORIZONS[gran]} value={horizon} onChange={setHorizon} />
        </div>
        <Field label="Category" options={[{ value: ALL, label: "All categories" }, ...Object.keys(CATEGORIES).map((c) => ({ value: c, label: c }))]} value={category} onChange={setCategory} className="w-48" />
        <Field label="Channel" options={[{ value: ALL, label: "All channels" }, ...CHANNELS.map((c) => ({ value: c[0], label: c[0] }))]} value={channel} onChange={setChannel} className="w-40" />
      </div>

      <Alert tone="neutral" title="Demo forecasting models">
        {MODELS.find((m) => m.id === model)!.note} Metrics are computed on a chronological test split (last 15% of the series), never on shuffled rows.
      </Alert>

      <KpiRow>
        <KpiCard label={`Forecast, next ${horizon} ${unit}s`} value={money(total)} delta={lastEqual ? ((total - lastEqual) / lastEqual) * 100 : undefined} deltaLabel={`vs last ${horizon} ${unit}s`} />
        <KpiCard label="Test RMSE" value={money(metrics.rmse)} deltaLabel={`per ${unit}`} />
        <KpiCard label="Test MAPE" value={num1(metrics.mape)} unit="%" deltaLabel="mean absolute % error" />
        <KpiCard label="Test R²" value={metrics.r2.toFixed(3)} deltaLabel="1.0 is a perfect fit" />
      </KpiRow>

      <ChartCard
        title={`Net sales forecast · ${MODELS.find((m) => m.id === model)!.label}`}
        subtitle={`${gran} series · train 70% · validation 15% · test 15%${gran === "Daily" ? " · showing the last 240 days" : ""}`}
        legend={[{ label: "Actual", color: "var(--series-1)" }, { label: "Test prediction", color: "var(--series-2)" }, { label: "Forecast (dashed) with 95% band", color: "var(--series-2)" }]}
        footnote="The band widens with the horizon: it is ±1.96 × the test residual spread."
      >
        <Plot
          height={340}
          ariaLabel="Line chart of actual net sales, test-period predictions and the future forecast with an uncertainty band"
          data={data}
          layout={{
            showlegend: false, hovermode: "x unified", yaxis: { tickprefix: "$", tickformat: "~s", rangemode: "tozero" },
            shapes: [splitIndex.valStart, splitIndex.testStart].filter((i) => i >= from).map((i) => ({ type: "line", x0: t[i], x1: t[i], yref: "paper", y0: 0, y1: 1, line: { color: "var(--line-strong)", width: 1, dash: "dot" } })),
            annotations: [
              ...(splitIndex.valStart >= from ? [{ x: t[splitIndex.valStart], yref: "paper" as const, y: 1, text: "Validation", showarrow: false, xanchor: "left" as const, font: { size: 11, color: "var(--ink-subtle)" } }] : []),
              { x: t[splitIndex.testStart], yref: "paper", y: 1, text: "Test", showarrow: false, xanchor: "left", font: { size: 11, color: "var(--ink-subtle)" } },
            ],
          }}
        />
      </ChartCard>

      <div className="grid gap-space-3">
        <h2 className="text-heading text-ink">Model comparison on the test split</h2>
        <DataTable caption="Forecast model metrics" columns={cols} rows={rows} rowKey={(r) => r.id} />
      </div>
    </>
  );
}
