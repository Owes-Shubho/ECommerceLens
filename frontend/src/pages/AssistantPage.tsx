import { useEffect, useRef, useState } from "react";
import { ArrowUp, Eraser, Sparkles } from "lucide-react";
import { Alert, Button, ChatMessage, DataTable, type Column } from "@/components/ui";
import { barTrace, lineTrace, Plot } from "@/charts/Plot";
import { ask, PRESETS, SUGGESTIONS, type AssistantReply } from "@/ai/demoAssistant";
import { int } from "@/lib/format";
import { useAiLog, MODEL_LABEL } from "@/store/aiLog";
import { useChat } from "@/store/chat";

/** Renders **bold** segments from the assistant's text. */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return <p>{parts.map((p, i) => (p.startsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : <span key={i}>{p}</span>))}</p>;
}

function ReplyBody({ reply }: { reply: AssistantReply }) {
  if (reply.guard === "blocked") return <p>{reply.text}</p>;
  const cols = (reply.table?.columns ?? []) as Column<Record<string, string | number>>[];
  return (
    <div className="grid gap-space-3">
      <Rich text={reply.text} />
      {reply.chart ? (
        <div className="rounded-sm border border-line">
          <Plot
            height={220}
            ariaLabel={`Chart of ${reply.chart.label}`}
            data={[reply.chart.kind === "line" ? lineTrace(reply.chart.x, reply.chart.y, reply.chart.label, "var(--series-1)") : barTrace(reply.chart.x, reply.chart.y, reply.chart.label, "var(--series-1)")]}
            layout={{ margin: { l: 52, r: 12, t: 8, b: reply.chart.kind === "bar" ? 64 : 32 }, yaxis: reply.chart.isMoney ? { tickprefix: "$", tickformat: "~s" } : {}, xaxis: { tickangle: reply.chart.kind === "bar" && reply.chart.x.length > 5 ? -30 : 0 } }}
          />
        </div>
      ) : null}
      {reply.table && reply.table.rows.length > 1 ? <DataTable caption="Query result" columns={cols} rows={reply.table.rows} /> : null}
    </div>
  );
}

export default function AssistantPage() {
  const { turns, context, pending, push, setContext, setPending, clear } = useChat();
  const log = useAiLog((s) => s.add);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const seed = useRef(1);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, pending]);

  const send = (question: string) => {
    const q = question.trim();
    if (!q || pending) return;
    setInput("");
    push({ id: Date.now(), role: "user", text: q });
    setPending(true);
    const reply = ask(q, context, seed.current++);
    setTimeout(() => {
      push({ id: Date.now() + 1, role: "assistant", reply });
      if (reply.plan) setContext({ lastPlan: reply.plan });
      setPending(false);
      log({
        id: `live-${Date.now()}`, at: `2025-12-31T${new Date().toTimeString().slice(0, 8)}`, question: q, intent: reply.intent, model: reply.model,
        tokensBaseline: reply.tokensBaseline, tokensOptimized: reply.tokensOptimized, latencyMs: reply.latencyMs, costUsd: reply.costUsd,
        guard: reply.guard, guardRule: reply.guardRule, success: reply.guard !== "blocked",
      });
    }, Math.min(reply.latencyMs, 1400));
  };

  return (
    <div className="grid gap-space-4 lg:grid-cols-[1fr_280px]">
      <section aria-label="Conversation" className="flex min-h-[calc(100vh-180px)] min-w-0 flex-col rounded-md border border-line bg-surface">
        <div className="flex-1 space-y-space-4 overflow-y-auto p-space-4">
          {turns.length === 0 ? (
            <div className="grid gap-space-3 py-space-8 text-center">
              <Sparkles className="mx-auto size-6 text-lens" aria-hidden />
              <h2 className="font-display text-title text-ink">Ask a question about your sales data</h2>
              <p className="mx-auto max-w-[56ch] text-body text-ink-muted">
                Lens turns your question into a query plan, checks it with guardrails, runs it on the data and answers from the result. Follow-up questions keep the context.
              </p>
            </div>
          ) : null}
          {turns.map((t) =>
            t.role === "user" ? (
              <ChatMessage key={t.id} role="user">{t.text}</ChatMessage>
            ) : (
              <div key={t.id} className="grid gap-space-2">
                {t.reply.guard === "blocked" ? <Alert tone="critical" title={`Blocked by the ${t.reply.guardRule?.split(":")[0]}`}>{t.reply.guardRule?.split(": ")[1]}</Alert> : null}
                {t.reply.repairedNote ? <Alert tone="serious" title="Query auto-repaired once">{t.reply.repairedNote}</Alert> : null}
                <ChatMessage
                  role="assistant"
                  guard={t.reply.guard}
                  plan={t.reply.plan ? JSON.stringify(t.reply.plan, null, 2) : undefined}
                  meta={{ model: MODEL_LABEL[t.reply.model], tokens: t.reply.tokensOptimized, latencyMs: t.reply.latencyMs, cost: t.reply.costUsd }}
                >
                  <ReplyBody reply={t.reply} />
                </ChatMessage>
                {t.reply.guard !== "blocked" ? (
                  <p className="font-mono text-[11px] leading-4 text-ink-subtle">
                    Prompt used {int(t.reply.tokensOptimized)} tokens instead of {int(t.reply.tokensBaseline)} with the full schema ({Math.round((1 - t.reply.tokensOptimized / t.reply.tokensBaseline) * 100)}% fewer).
                  </p>
                ) : null}
              </div>
            ),
          )}
          {pending ? (
            <div className="flex items-center gap-space-2 text-body-sm text-ink-subtle" role="status">
              <span className="inline-flex gap-1">
                <i className="size-1.5 animate-bounce rounded-full bg-lens" />
                <i className="size-1.5 animate-bounce rounded-full bg-lens [animation-delay:120ms]" />
                <i className="size-1.5 animate-bounce rounded-full bg-lens [animation-delay:240ms]" />
              </span>
              Planning and running the query…
            </div>
          ) : null}
          <div ref={endRef} />
        </div>
        <form
          className="flex items-end gap-space-2 border-t border-line bg-surface-raised p-space-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <label htmlFor="ask" className="sr-only">Ask Lens</label>
          <textarea
            id="ask"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="e.g. Which region had the highest profit margin in 2024?"
            className="max-h-32 min-h-control flex-1 resize-none rounded-sm border border-line-strong bg-surface-raised px-space-3 py-1.5 text-body text-ink placeholder:text-ink-subtle"
          />
          <Button variant="primary" type="submit" icon={<ArrowUp aria-hidden />} disabled={!input.trim() || pending}>
            Ask Lens
          </Button>
        </form>
      </section>

      <aside className="grid content-start gap-space-4">
        <div className="grid gap-space-2">
          <h2 className="text-eyebrow uppercase text-ink-subtle">Insight presets</h2>
          {PRESETS.map((p) => (
            <Button key={p.label} className="justify-start" onClick={() => send(p.question)} disabled={pending}>
              {p.label}
            </Button>
          ))}
        </div>
        <div className="grid gap-space-2">
          <h2 className="text-eyebrow uppercase text-ink-subtle">Try asking</h2>
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => send(s)} disabled={pending} className="rounded-sm px-space-2 py-space-1 text-left text-body-sm text-link hover:bg-surface-sunken disabled:opacity-50">
              {s}
            </button>
          ))}
        </div>
        <Button variant="ghost" icon={<Eraser aria-hidden />} onClick={clear} disabled={!turns.length}>
          New conversation
        </Button>
        <p className="text-label font-normal text-ink-subtle">
          Demo assistant: a rule-based planner stands in for the OpenRouter models until Phase 11. Guardrails, query plans and logging work the same way.
        </p>
      </aside>
    </div>
  );
}
