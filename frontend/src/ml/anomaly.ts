export type Severity = "critical" | "serious" | "warning";

export interface Anomaly {
  t: string;
  value: number;
  expected: number;
  z: number;
  deviationPct: number;
  severity: Severity;
  direction: "spike" | "drop";
}

/** Rolling z-score against the previous `window` points (current point excluded). */
export function detectAnomalies(t: string[], y: number[], window = 28, threshold = 3): Anomaly[] {
  const out: Anomaly[] = [];
  for (let i = window; i < y.length; i++) {
    const w = y.slice(i - window, i);
    const mean = w.reduce((a, b) => a + b, 0) / window;
    const sd = Math.sqrt(w.reduce((a, b) => a + (b - mean) ** 2, 0) / window) || 1;
    const z = (y[i] - mean) / sd;
    if (Math.abs(z) >= threshold) {
      const az = Math.abs(z);
      out.push({
        t: t[i], value: y[i], expected: mean, z, deviationPct: mean ? ((y[i] - mean) / mean) * 100 : 0,
        severity: az >= threshold + 1.5 ? "critical" : az >= threshold + 0.5 ? "serious" : "warning",
        direction: z > 0 ? "spike" : "drop",
      });
    }
  }
  return out;
}
