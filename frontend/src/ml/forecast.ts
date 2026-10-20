// Forecasting for the demo. The Baseline is a real linear regression on lag features.
// "LSTM" and "GRU" here are stand-ins (Holt-Winters and a seasonal blend) with the same interface;
// the trained PyTorch models from Phase 20 replace them behind the analytics API.

export type ModelId = "baseline" | "lstm" | "gru";
export const MODELS: { id: ModelId; label: string; note: string }[] = [
  { id: "baseline", label: "Baseline (linear regression)", note: "Linear regression on lag and rolling-mean features." },
  { id: "lstm", label: "LSTM", note: "Demo stand-in (Holt-Winters). The trained LSTM replaces it in Phase 20." },
  { id: "gru", label: "GRU", note: "Demo stand-in (seasonal blend). The trained GRU replaces it in Phase 20." },
];

export interface Metrics {
  mae: number;
  rmse: number;
  mape: number;
  r2: number;
}

export function metrics(actual: number[], pred: number[]): Metrics {
  const n = actual.length || 1;
  let ae = 0, se = 0, ape = 0, apeN = 0;
  const mean = actual.reduce((a, b) => a + b, 0) / n;
  let ss = 0;
  actual.forEach((a, i) => {
    const e = a - pred[i];
    ae += Math.abs(e);
    se += e * e;
    ss += (a - mean) ** 2;
    if (a !== 0) { ape += Math.abs(e / a); apeN++; }
  });
  return { mae: ae / n, rmse: Math.sqrt(se / n), mape: apeN ? (ape / apeN) * 100 : 0, r2: ss ? 1 - se / ss : 0 };
}

/* ---- Baseline: OLS on [1, lag1, lagS, rollMean(S)] ---- */
function solve(A: number[][], b: number[]) {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const d = M[c][c] || 1e-9;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / d;
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / (row[i] || 1e-9));
}

function features(y: number[], t: number, S: number) {
  const roll = y.slice(Math.max(0, t - S), t);
  return [1, y[t - 1], y[t - S], roll.reduce((a, b) => a + b, 0) / (roll.length || 1)];
}

function fitBaseline(y: number[], trainEnd: number, S: number) {
  const k = 4;
  const XtX = Array.from({ length: k }, () => Array(k).fill(0) as number[]);
  const Xty = Array(k).fill(0) as number[];
  for (let t = S; t < trainEnd; t++) {
    const x = features(y, t, S);
    for (let i = 0; i < k; i++) {
      Xty[i] += x[i] * y[t];
      for (let j = 0; j < k; j++) XtX[i][j] += x[i] * x[j];
    }
  }
  for (let i = 1; i < k; i++) XtX[i][i] += 1e-6; // tiny ridge for stability
  const w = solve(XtX, Xty);
  return (hist: number[], t: number) => Math.max(0, features(hist, t, S).reduce((s, xi, i) => s + xi * w[i], 0));
}

/* ---- Holt-Winters additive ---- */
function fitHoltWinters(y: number[], S: number, alpha = 0.25, beta = 0.01, gamma = 0.25) {
  let level = y.slice(0, S).reduce((a, b) => a + b, 0) / S;
  let trend = 0;
  const season = y.slice(0, S).map((v) => v - level);
  const oneStep: number[] = Array(y.length).fill(NaN);
  for (let t = S; t < y.length; t++) {
    const s = season[t % S];
    oneStep[t] = Math.max(0, level + trend + s);
    const prevLevel = level;
    level = alpha * (y[t] - s) + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    season[t % S] = gamma * (y[t] - level) + (1 - gamma) * s;
  }
  const future = (h: number) => Array.from({ length: h }, (_, i) => Math.max(0, level + trend * (i + 1) + season[(y.length + i) % S]));
  return { oneStep, future };
}

export interface ForecastResult {
  t: string[];
  actual: number[];
  /** One-step-ahead predictions on the test window (NaN elsewhere). */
  testPred: number[];
  splitIndex: { valStart: number; testStart: number };
  future: { t: string[]; yhat: number[]; lo: number[]; hi: number[] };
  metrics: Metrics;
  allMetrics: Record<ModelId, Metrics>;
}

export function forecast(t: string[], y: number[], model: ModelId, S: number, horizon: number, nextLabel: (last: string, i: number) => string): ForecastResult {
  const n = y.length;
  const valStart = Math.floor(n * 0.7);
  const testStart = Math.floor(n * 0.85);

  const predictors: Record<ModelId, { oneStep: number[]; future: (h: number) => number[] }> = {
    baseline: (() => {
      const f = fitBaseline(y, valStart, S);
      const oneStep = y.map((_, i) => (i >= S ? f(y, i) : NaN));
      const future = (h: number) => {
        const hist = [...y];
        const out: number[] = [];
        for (let i = 0; i < h; i++) {
          const v = f(hist, hist.length);
          hist.push(v);
          out.push(v);
        }
        return out;
      };
      return { oneStep, future };
    })(),
    lstm: fitHoltWinters(y, S),
    gru: (() => {
      const hw = fitHoltWinters(y, S, 0.35, 0.02, 0.15);
      const oneStep = y.map((_, i) => (i >= 2 * S ? 0.6 * hw.oneStep[i] + 0.4 * (y[i - S] * 0.5 + y[i - 2 * S] * 0.5) : hw.oneStep[i]));
      return { oneStep, future: hw.future };
    })(),
  };

  const evalOn = (p: number[]) => metrics(y.slice(testStart), p.slice(testStart));
  const allMetrics = { baseline: evalOn(predictors.baseline.oneStep), lstm: evalOn(predictors.lstm.oneStep), gru: evalOn(predictors.gru.oneStep) };
  const chosen = predictors[model];
  const testPred = chosen.oneStep.map((v, i) => (i >= testStart ? v : NaN));
  const resid = y.slice(testStart).map((a, i) => a - chosen.oneStep[testStart + i]);
  const sd = Math.sqrt(resid.reduce((a, b) => a + b * b, 0) / (resid.length || 1));
  const yhat = chosen.future(horizon);
  const ft = yhat.map((_, i) => nextLabel(t[t.length - 1], i + 1));
  return {
    t, actual: y, testPred, splitIndex: { valStart, testStart },
    future: { t: ft, yhat, lo: yhat.map((v, i) => Math.max(0, v - 1.96 * sd * Math.sqrt(1 + i * 0.15))), hi: yhat.map((v, i) => v + 1.96 * sd * Math.sqrt(1 + i * 0.15)) },
    metrics: allMetrics[model],
    allMetrics,
  };
}
