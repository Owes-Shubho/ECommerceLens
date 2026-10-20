import { useMemo, useState } from "react";
import { ChartCard, DataTable, KpiCard, SegmentedControl, StatusPill, type Column } from "@/components/ui";
import { KpiRow } from "@/components/Panel";
import { barTrace, lineTrace, Plot } from "@/charts/Plot";
import { addDays } from "@/data/dates";
import { int, num1 } from "@/lib/format";
import { MODEL_LABEL, useAiLog, type AiRequest, type ModelTier } from "@/store/aiLog";

const GUARD_TONE = { passed: "good", repaired: "serious", blocked: "critical" } as const;
const COLS: Column<AiRequest>[] = [
  { key: "at", label: "Time", format: (v) => (v as string).replace("T", " ").slice(0, 16), mono: true },
  { key: "question", label: "Question" },
  { key: "model", label: "Model", format: (v) => MODEL_LABEL[v as ModelTier] },
  { key: "guard", label: "Guardrails", format: (v) => <StatusPill tone={GUARD_TONE[v as keyof typeof GUARD_TONE]}>{v === "passed" ? "Passed" : v === "repaired" ? "Repaired" : "Blocked"}</StatusPill> },
  { key: "tokensOptimized", label: "Tokens", align: "right", format: (v) => int(v as number) },
  { key: "latencyMs", label: "Latency", align: "right", format: (v) => `${((v as number) / 1000).toFixed(2)} s` },
  { key: "costUsd", label: "Cost", align: "right", format: (v) => `$${(v as number).toFixed(4)}` },
];

export default function ObservatoryPage() {
  const all = useAiLog((s) => s.requests);
  const [days, setDays] = useState("30");
  const reqs = useMemo(() => {
    const from = addDays("2025-12-31", -(Number(days) - 1));
    return all.filter((r) => r.at.slice(0, 10) >= from);
  }, [all, days]);

  const s = useMemo(() => {
    const sum = (f: (r: AiRequest) => number) => reqs.reduce((a, r) => a + f(r), 0);
    const base = sum((r) => r.tokensBaseline), opt = sum((r) => r.tokensOptimized);
    const byDay = new Map<string, { base: number; opt: number; n: number }>();
    reqs.forEach((r) => {
      const d = r.at.slice(0, 10);
      const e = byDay.get(d) ?? { base: 0, opt: 0, n: 0 };
      e.base += r.tokensBaseline; e.opt += r.tokensOptimized; e.n++;
      byDay.set(d, e);
    });
    const daysSorted = [...byDay.keys()].sort();
    const tiers: ModelTier[] = ["fast", "reasoning", "fallback"];
    const lat = tiers.map((t) => {
      const l = reqs.filter((r) => r.model === t && r.guard !== "blocked").map((r) => r.latencyMs).sort((a, b) => a - b);
      return { t, n: l.length, avg: l.length ? l.reduce((a, b) => a + b, 0) / l.length : 0, p95: l.length ? l[Math.floor(l.length * 0.95)] : 0 };
    });
    const rules = new Map<string, number>();
    reqs.filter((r) => r.guardRule).forEach((r) => rules.set(r.guardRule!, (rules.get(r.guardRule!) ?? 0) + 1));
    return {
      n: reqs.length, base, opt, saving: base ? (1 - opt / base) * 100 : 0, cost: sum((r) => r.costUsd),
      baseCost: reqs.filter((r) => r.guard !== "blocked").reduce((a, r) => a + (r.tokensBaseline / 1000) * 0.006, 0),
      avgLatency: reqs.length ? sum((r) => r.latencyMs) / reqs.length : 0,
      blocked: reqs.filter((r) => r.guard === "blocked").length, repaired: reqs.filter((r) => r.guard === "repaired").length,
      success: reqs.length ? (reqs.filter((r) => r.success).length / reqs.length) * 100 : 0,
      daysSorted, byDay, lat, rules: [...rules].sort((a, b) => b[1] - a[1]),
    };
  }, [reqs]);

  const recent = [...reqs].reverse().slice(0, 15);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-space-3">
        <p className="text-body-sm text-ink-muted">Every request to the AI layer is logged: tokens, cost, latency, model and guardrail result. Questions you ask Lens appear here too.</p>
        <SegmentedControl label="Period" options={[{ value: "7", label: "7 days" }, { value: "30", label: "30 days" }]} value={days} onChange={setDays} />
      </div>
      <KpiRow>
        <KpiCard label="AI requests" value={int(s.n)} deltaLabel={`${num1(s.success)}% answered`} />
        <KpiCard label="Tokens saved" value={num1(s.saving)} unit="%" deltaLabel={`${int(s.opt)} used vs ${int(s.base)} baseline`} />
        <KpiCard label="Total cost" value={`$${s.cost.toFixed(2)}`} deltaLabel={`$${s.baseCost.toFixed(2)} without routing or trimming`} />
        <KpiCard label="Avg latency" value={(s.avgLatency / 1000).toFixed(2)} unit="s" />
        <KpiCard label="Guardrail blocks" value={int(s.blocked)} deltaLabel={`${s.repaired} auto-repaired`} />
      </KpiRow>
      <ChartCard title="Prompt tokens per day" subtitle="Full-schema baseline vs the optimized prompt" legend={[{ label: "Baseline", color: "var(--series-1)" }, { label: "Optimized", color: "var(--series-2)" }]}>
        <Plot
          height={280}
          ariaLabel="Line chart of baseline and optimized prompt tokens per day"
          data={[
            lineTrace(s.daysSorted, s.daysSorted.map((d) => s.byDay.get(d)!.base), "Baseline", "var(--series-1)", { hovertemplate: "%{x}<br>Baseline: %{y:,} tokens<extra></extra>" }),
            lineTrace(s.daysSorted, s.daysSorted.map((d) => s.byDay.get(d)!.opt), "Optimized", "var(--series-2)", { hovertemplate: "%{x}<br>Optimized: %{y:,} tokens<extra></extra>" }),
          ]}
          layout={{ showlegend: false, hovermode: "x unified", yaxis: { tickformat: "~s", rangemode: "tozero" } }}
        />
      </ChartCard>
      <div className="grid gap-space-6 lg:grid-cols-2">
        <ChartCard title="Latency by model" subtitle="Average and 95th percentile" legend={[{ label: "Average", color: "var(--series-1)" }, { label: "95th percentile", color: "var(--series-2)" }]}>
          <Plot
            ariaLabel="Grouped bar chart of average and 95th percentile latency per model tier"
            data={[
              barTrace(s.lat.map((l) => MODEL_LABEL[l.t]), s.lat.map((l) => l.avg / 1000), "Average", "var(--series-1)", { hovertemplate: "%{x}<br>Average: %{y:.2f} s<extra></extra>" }),
              barTrace(s.lat.map((l) => MODEL_LABEL[l.t]), s.lat.map((l) => l.p95 / 1000), "95th percentile", "var(--series-2)", { hovertemplate: "%{x}<br>p95: %{y:.2f} s<extra></extra>" }),
            ]}
            layout={{ barmode: "group", showlegend: false, yaxis: { ticksuffix: " s" } }}
          />
        </ChartCard>
        <ChartCard title="Guardrail events" subtitle="Blocked and repaired requests by rule">
          <Plot
            ariaLabel="Horizontal bar chart of guardrail events by rule"
            data={[barTrace(s.rules.map((r) => r[1]).reverse(), s.rules.map((r) => r[0]).reverse(), "Events", "var(--series-1)", { orientation: "h", hovertemplate: "%{y}: %{x}<extra></extra>" })]}
            layout={{ margin: { l: 220, r: 16, t: 8, b: 32 } }}
          />
        </ChartCard>
      </div>
      <div className="grid gap-space-3">
        <h2 className="text-heading text-ink">Recent requests</h2>
        <DataTable caption="Recent AI requests" columns={COLS} rows={recent} rowKey={(r) => r.id} />
      </div>
    </>
  );
}
