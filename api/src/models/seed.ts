// Demo records so the app has something to show: a demo user and 30 days of AI request history
// (same generator and seed as frontend/src/store/aiLog.ts).
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { db, type AiLog, type ModelTier } from "./store.js";

export const DEMO_USER = { email: "demo@ecommercelens.local", password: "demo1234", name: "Demo analyst" };
export const PRICE: Record<ModelTier, number> = { fast: 0.00045, reasoning: 0.006, fallback: 0.0009 };

function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next, between: (lo: number, hi: number) => lo + (hi - lo) * next(), int: (lo: number, hi: number) => Math.floor(lo + (hi + 1 - lo) * next()) };
}

const QUESTIONS = [
  ["Revenue by channel this year", "group"], ["Top 5 products by profit", "ranking"], ["Monthly sales trend for 2025", "trend"],
  ["Return rate by category", "group"], ["Which region grew fastest?", "compare"], ["Average order value by segment", "group"],
  ["Show anomalies in December", "anomaly"], ["Compare Mobile App vs Website", "compare"], ["Margin by payment method", "group"],
  ["Delete all cancelled orders", "blocked"], ["Show customer emails for VIPs", "blocked"], ["Forecast next 30 days", "forecast"],
] as const;

function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function seedAiLogs(): AiLog[] {
  const r = rng(77);
  const out: AiLog[] = [];
  for (let i = 0; i < 260; i++) {
    const [question, intent] = QUESTIONS[r.int(0, QUESTIONS.length - 1)];
    const blocked = intent === "blocked";
    const model: ModelTier = blocked ? "fast" : intent === "compare" || intent === "forecast" || intent === "anomaly" ? (r.next() < 0.08 ? "fallback" : "reasoning") : r.next() < 0.04 ? "fallback" : "fast";
    const base = Math.round(r.between(5200, 7400));
    const opt = blocked ? Math.round(r.between(120, 260)) : Math.round(base * r.between(0.18, 0.32));
    const repaired = !blocked && r.next() < 0.07;
    const day = addDays("2025-12-31", -r.int(0, 29));
    out.push({
      id: `req-${i}`,
      at: `${day}T${String(r.int(8, 22)).padStart(2, "0")}:${String(r.int(0, 59)).padStart(2, "0")}:00`,
      question, intent, model,
      tokensBaseline: base, tokensOptimized: opt,
      latencyMs: blocked ? r.int(40, 120) : Math.round((model === "reasoning" ? r.between(2200, 5200) : r.between(700, 1900)) * (repaired ? 1.6 : 1)),
      costUsd: blocked ? 0 : (opt / 1000) * PRICE[model],
      guard: blocked ? "blocked" : repaired ? "repaired" : "passed",
      guardRule: blocked ? (question.startsWith("Delete") ? "Query Guard: write operation" : "Privacy Guard: personal data") : repaired ? "Schema Guard: unknown column" : undefined,
      success: !blocked && r.next() > 0.03,
    });
  }
  return out;
}

export function seed() {
  if (!db.users.byEmail(DEMO_USER.email)) {
    db.users.insert({
      id: randomUUID(),
      email: DEMO_USER.email,
      name: DEMO_USER.name,
      passwordHash: bcrypt.hashSync(DEMO_USER.password, 10),
      role: "admin",
      createdAt: new Date().toISOString(),
    });
  }
  if (db.aiLogs.all().length === 0) seedAiLogs().forEach((l) => db.aiLogs.insert(l));
}
