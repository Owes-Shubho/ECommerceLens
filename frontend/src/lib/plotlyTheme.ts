/**
 * Plotly layout built from the active theme's design tokens.
 * Merge it into every chart's layout and call it again after a theme switch:
 *   <Plot data={data} layout={{ ...plotlyLayout(), title: undefined }} />
 */
export function plotlyLayout(el: Element = document.documentElement): Record<string, unknown> {
  const cs = getComputedStyle(el);
  const v = (name: string) => cs.getPropertyValue(`--${name}`).trim();
  const font = v("font-sans") || "IBM Plex Sans, sans-serif";
  return {
    colorway: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => v(`series-${i}`)),
    font: { family: font, size: 12, color: v("ink-muted") },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    margin: { l: 48, r: 16, t: 8, b: 40 },
    xaxis: { gridcolor: v("chart-grid"), linecolor: v("line-strong"), zeroline: false, tickfont: { color: v("ink-muted") } },
    yaxis: { gridcolor: v("chart-grid"), linecolor: v("line-strong"), zerolinecolor: v("line-strong"), tickfont: { color: v("ink-muted") } },
    hoverlabel: { bgcolor: v("surface-raised"), bordercolor: v("line"), font: { color: v("ink"), family: font } },
    legend: { orientation: "h", y: 1.12, x: 0, font: { color: v("ink-muted") } },
    bargap: 0.3,
  };
}

/** Categorical colour for a series, by its fixed slot (1–8). Slot follows the entity, never its rank. */
export const seriesColor = (slot: number) => `var(--series-${Math.min(Math.max(slot, 1), 8)})`;
