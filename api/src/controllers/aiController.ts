import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { DEMO_TODAY } from "../config/constants.js";
import { db, type AiLog, type ModelTier } from "../models/store.js";
import { callAnalytics } from "../services/analyticsClient.js";
import { notFound } from "../utils/httpError.js";

interface Reply {
  text: string;
  guard: AiLog["guard"];
  guardRule?: string | null;
  intent: string;
  model: ModelTier;
  tokensBaseline: number;
  tokensOptimized: number;
  latencyMs: number;
  costUsd: number;
}

/** Ask Lens: stores the turn in the user's chat (created on the first question) and logs the request for the observatory. */
export async function ask(req: Request, res: Response) {
  const { question, chatId } = req.body as { question: string; chatId?: string };
  let chat = chatId ? db.chats.get(chatId) : undefined;
  if (chatId && (!chat || chat.userId !== req.userId)) throw notFound("That conversation");
  chat ??= db.chats.create(req.userId!, question);

  const { data: reply, meta } = await callAnalytics<Reply>("/ai/ask", { method: "POST", body: { question, conversationId: chat.id }, requestId: req.id });
  const now = new Date().toISOString();
  chat.messages.push({ id: randomUUID(), role: "user", text: question, at: now }, { id: randomUUID(), role: "assistant", text: reply.text, reply, at: now });
  chat.updatedAt = now;

  // Logs use the demo clock so they sit next to the seeded history (2025-12-31).
  db.aiLogs.insert({
    id: randomUUID(), at: `${DEMO_TODAY}T${now.slice(11, 19)}`, userId: req.userId, question, intent: reply.intent, model: reply.model,
    tokensBaseline: reply.tokensBaseline, tokensOptimized: reply.tokensOptimized, latencyMs: reply.latencyMs, costUsd: reply.costUsd,
    guard: reply.guard, guardRule: reply.guardRule ?? undefined, success: reply.guard !== "blocked",
  });
  res.json({ data: { chatId: chat.id, reply }, meta });
}

export function listChats(req: Request, res: Response) {
  res.json({ data: db.chats.forUser(req.userId!).map(({ messages, ...c }) => ({ ...c, messageCount: messages.length })) });
}

export function getChat(req: Request, res: Response) {
  const chat = db.chats.get(req.params.id);
  if (!chat || chat.userId !== req.userId) throw notFound("That conversation");
  res.json({ data: chat });
}

export async function deleteChat(req: Request, res: Response) {
  const chat = db.chats.get(req.params.id);
  if (!chat || chat.userId !== req.userId) throw notFound("That conversation");
  db.chats.delete(chat.id);
  await callAnalytics(`/ai/conversations/${chat.id}`, { method: "DELETE", requestId: req.id }).catch(() => undefined);
  res.status(204).end();
}

/** AI observatory: raw logs for the window plus the summary figures the page shows. */
export function logs(req: Request, res: Response) {
  const days = Number(req.query.days);
  const from = new Date(Date.parse(`${DEMO_TODAY}T00:00:00Z`) - (days - 1) * 86400000).toISOString().slice(0, 10);
  const list = db.aiLogs.since(from);
  const sum = (f: (l: AiLog) => number) => list.reduce((a, l) => a + f(l), 0);
  const base = sum((l) => l.tokensBaseline);
  const opt = sum((l) => l.tokensOptimized);
  const tiers: ModelTier[] = ["fast", "reasoning", "fallback"];
  const latency = tiers.map((t) => {
    const v = list.filter((l) => l.model === t && l.guard !== "blocked").map((l) => l.latencyMs).sort((a, b) => a - b);
    return { model: t, requests: v.length, avgMs: v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0, p95Ms: v.length ? v[Math.floor(v.length * 0.95)] : 0 };
  });
  const rules: Record<string, number> = {};
  list.forEach((l) => l.guardRule && (rules[l.guardRule] = (rules[l.guardRule] ?? 0) + 1));
  const byDay: Record<string, { baseline: number; optimized: number; requests: number }> = {};
  list.forEach((l) => {
    const d = (byDay[l.at.slice(0, 10)] ??= { baseline: 0, optimized: 0, requests: 0 });
    d.baseline += l.tokensBaseline;
    d.optimized += l.tokensOptimized;
    d.requests++;
  });
  res.json({
    data: {
      window: { from, to: DEMO_TODAY, days },
      summary: {
        requests: list.length,
        answeredPct: list.length ? (list.filter((l) => l.success).length / list.length) * 100 : 0,
        tokensBaseline: base,
        tokensOptimized: opt,
        tokenSavingPct: base ? (1 - opt / base) * 100 : 0,
        costUsd: sum((l) => l.costUsd),
        avgLatencyMs: list.length ? sum((l) => l.latencyMs) / list.length : 0,
        blocked: list.filter((l) => l.guard === "blocked").length,
        repaired: list.filter((l) => l.guard === "repaired").length,
      },
      latencyByModel: latency,
      guardrailRules: Object.entries(rules).map(([rule, count]) => ({ rule, count })).sort((a, b) => b.count - a.count),
      tokensByDay: Object.entries(byDay).map(([day, v]) => ({ day, ...v })).sort((a, b) => (a.day < b.day ? -1 : 1)),
      requests: list,
    },
  });
}
