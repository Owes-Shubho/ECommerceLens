import { useEffect, useRef } from "react";
import type { Config, Data, Layout } from "plotly.js";
import { plotlyLayout } from "@/lib/plotlyTheme";
import { useThemeTick } from "@/hooks/useThemeTick";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PlotData = Record<string, any>;

export interface PlotProps {
  data: PlotData[];
  layout?: Partial<Layout>;
  height?: number;
  /** Accessible description of what the chart shows. */
  ariaLabel: string;
  onClickPoint?: (point: { x: string | number; y: string | number; curve: number }) => void;
}

const CONFIG: Partial<Config> = { displayModeBar: false, responsive: true };

function deepMerge<T extends Record<string, unknown>>(a: T, b: Record<string, unknown>): T {
  const out: Record<string, unknown> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    out[k] = v && typeof v === "object" && !Array.isArray(v) && typeof out[k] === "object" ? deepMerge(out[k] as Record<string, unknown>, v as Record<string, unknown>) : v;
  }
  return out as T;
}

/** Plotly cannot read CSS variables, so "var(--token)" strings anywhere in data or layout are resolved at draw time. */
function resolveVars<T>(v: T, cs: CSSStyleDeclaration): T {
  if (typeof v === "string") {
    const m = /^var\(--([\w-]+)\)$/.exec(v.trim());
    return (m ? cs.getPropertyValue(`--${m[1]}`).trim() || v : v) as T;
  }
  if (Array.isArray(v)) return v.map((x) => resolveVars(x, cs)) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, resolveVars(x, cs)])) as T;
  return v;
}

/** Plotly chart themed by the design tokens. Plotly loads on demand, so pages without charts stay light. */
export function Plot({ data, layout = {}, height = 280, ariaLabel, onClickPoint }: PlotProps) {
  const ref = useRef<HTMLDivElement>(null);
  const tick = useThemeTick();
  const clickRef = useRef(onClickPoint);
  clickRef.current = onClickPoint;

  useEffect(() => {
    let cancelled = false;
    const el = ref.current;
    if (!el) return;
    import("plotly.js-dist-min").then(({ default: Plotly }) => {
      if (cancelled || !el) return;
      const base = plotlyLayout() as Partial<Layout>;
      const merged = deepMerge(base as Record<string, unknown>, { height, autosize: true, ...layout } as Record<string, unknown>) as Partial<Layout>;
      const cs = getComputedStyle(document.documentElement);
      Plotly.react(el, resolveVars(data, cs) as Data[], resolveVars(merged, cs), CONFIG).then(() => {
        const gd = el as unknown as { removeAllListeners?: (e: string) => void; on?: (e: string, cb: (ev: { points: { x: string | number; y: string | number; curveNumber: number }[] }) => void) => void };
        gd.removeAllListeners?.("plotly_click");
        gd.on?.("plotly_click", (ev) => {
          const p = ev.points[0];
          if (p) clickRef.current?.({ x: p.x, y: p.y, curve: p.curveNumber });
        });
      });
    });
    return () => {
      cancelled = true;
    };
  }, [data, layout, height, tick]);

  useEffect(() => {
    const el = ref.current;
    return () => {
      if (el) import("plotly.js-dist-min").then(({ default: Plotly }) => Plotly.purge(el));
    };
  }, []);

  return <div ref={ref} role="img" aria-label={ariaLabel} style={{ height, width: "100%" }} className={onClickPoint ? "[&_.nsewdrag]:cursor-pointer" : undefined} />;
}

/** Shared trace styles following the design system's mark specs. */
export const lineTrace = (x: (string | number)[], y: (string | number)[], name: string, color: string, extra: PlotData = {}): PlotData => ({
  type: "scatter", mode: "lines", x, y, name, line: { color, width: 2, shape: "spline", smoothing: 0.4 }, hovertemplate: `%{x}<br>${name}: %{y:$,.0f}<extra></extra>`, ...extra,
});

export const barTrace = (x: (string | number)[], y: (string | number)[], name: string, color: string, extra: PlotData = {}): PlotData => ({
  type: "bar", x, y, name, marker: { color, line: { color: "rgba(0,0,0,0)", width: 0 } }, hovertemplate: `%{x}<br>${name}: %{y:$,.0f}<extra></extra>`, ...extra,
});

export const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
