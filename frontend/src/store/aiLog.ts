import { create } from "zustand";
import { addDays } from "@/data/dates";
import { createRng } from "@/data/rng";

export type GuardResult = "passed" | "repaired" | "blocked";
export type ModelTier = "fast" | "reasoning" | "fallback";

export interface AiRequest {
  id: string;
  at: string; // ISO date-time
  question: string;
  intent: string;
  model: ModelTier;
  tokensBaseline: number;
  tokensOptimized: number;
  latencyMs: number;
  costUsd: number;
  guard: GuardResult;
  guardRule?: string;
  success: boolean;
}

/** USD per 1K tokens, by tier (demo prices). */
export const PRICE: Record<ModelTier, number> = { fast: 0.00045, reasoning: 0.006, fallback: 0.0009 };
export const MODEL_LABEL: Record<ModelTier, string> = { fast: "Fast model", reasoning: "Reasoning model", fallback: "Fallback model" };

const QUESTIONS = [
  ["Revenue by channel this year", "group"], ["Top 5 products by profit", "ranking"], ["Monthly sales trend for 2025", "trend"],
  ["Return rate by category", "group"], ["Which region grew fastest?", "compare"], ["Average order value by segment", "group"],
  ["Show anomalies in December", "anomaly"], ["Compare Mobile App vs Website", "compare"], ["Margin by payment method", "group"],
  ["Delete all cancelled orders", "blocked"], ["Show customer emails for VIPs", "blocked"], ["Forecast next 30 days", "forecast"],
] as const;

function seedLog(): AiRequest[] {
  const r = createRng(77);
  const out: AiRequest[] = [];
  const end = "2025-12-31";
  for (let i = 0; i < 260; i++) {
    const [q, intent] = QUESTIONS[r.int(0, QUESTIONS.length - 1)];
    const blocked = intent === "blocked";
    const model: ModelTier = blocked ? "fast" : intent === "compare" || intent === "forecast" || intent === "anomaly" ? (r.next() < 0.08 ? "fallback" : "reasoning") : r.next() < 0.04 ? "fallback" : "fast";
    const base = Math.round(r.between(5200, 7400));
    const opt = blocked ? Math.round(r.between(120, 260)) : Math.round(base * r.between(0.18, 0.32));
    const repaired = !blocked && r.next() < 0.07;
    const day = addDays(end, -r.int(0, 29));
    out.push({
      id: `req-${i}`,
      at: `${day}T${String(r.int(8, 22)).padStart(2, "0")}:${String(r.int(0, 59)).padStart(2, "0")}:00`,
      question: q, intent, model,
      tokensBaseline: base, tokensOptimized: opt,
      latencyMs: blocked ? r.int(40, 120) : Math.round((model === "reasoning" ? r.between(2200, 5200) : r.between(700, 1900)) * (repaired ? 1.6 : 1)),
      costUsd: blocked ? 0 : (opt / 1000) * PRICE[model],
      guard: blocked ? "blocked" : repaired ? "repaired" : "passed",
      guardRule: blocked ? (q.startsWith("Delete") ? "Query Guard: write operation" : "Privacy Guard: personal data") : repaired ? "Schema Guard: unknown column" : undefined,
      success: !blocked && r.next() > 0.03,
    });
  }
  return out.sort((a, b) => (a.at < b.at ? -1 : 1));
}

interface AiLogState {
  requests: AiRequest[];
  add: (r: AiRequest) => void;
}

/** Every AI request is logged here (seeded demo history + live assistant questions). The AI observatory reads it. */
export const useAiLog = create<AiLogState>((set) => ({
  requests: seedLog(),
  add: (r) => set((s) => ({ requests: [...s.requests, r] })),
}));
