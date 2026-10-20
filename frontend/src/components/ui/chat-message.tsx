import type * as React from "react";
import { cn } from "@/lib/utils";
import { StatusPill, type StatusTone } from "./status-pill";

const GUARD: Record<"passed" | "repaired" | "blocked", [StatusTone, string]> = {
  passed: ["good", "Guardrails passed"],
  repaired: ["serious", "Query auto-repaired"],
  blocked: ["critical", "Blocked by guardrail"],
};

export interface ChatMeta {
  model?: string;
  tokens?: number;
  latencyMs?: number;
  cost?: number;
}

export interface ChatMessageProps {
  role: "user" | "assistant";
  children: React.ReactNode;
  guard?: keyof typeof GUARD;
  /** The executed JSON query plan, as a string. */
  plan?: string;
  meta?: ChatMeta;
  className?: string;
}

/** One assistant turn. Assistant answers show the guardrail result, the query plan, and model / tokens / latency / cost. */
export function ChatMessage({ role, children, guard, plan, meta, className }: ChatMessageProps) {
  const g = guard ? GUARD[guard] : null;
  const m: string[] = [];
  if (meta?.model) m.push(meta.model);
  if (meta?.tokens != null) m.push(`${meta.tokens.toLocaleString("en-US")} tokens`);
  if (meta?.latencyMs != null) m.push(`${(meta.latencyMs / 1000).toFixed(1)} s`);
  if (meta?.cost != null) m.push(`$${meta.cost.toFixed(4)}`);
  const user = role === "user";
  return (
    <article className={cn("grid max-w-[640px] gap-space-2", user && "justify-self-end", className)}>
      {!user ? (
        <div className="flex items-center gap-space-2 text-eyebrow uppercase text-ink-subtle">
          Lens assistant
          {g ? <StatusPill tone={g[0]}>{g[1]}</StatusPill> : null}
        </div>
      ) : null}
      <div
        className={cn(
          "rounded-md px-space-4 py-space-3 text-body [&_p+p]:mt-space-2",
          user ? "bg-lens-soft text-ink" : "border border-line bg-surface-raised",
        )}
      >
        {children}
      </div>
      {plan ? (
        <details className="rounded-sm border border-line bg-surface-sunken">
          <summary className="cursor-pointer rounded-sm px-space-3 py-space-1 text-label text-ink-muted">Query plan</summary>
          <pre className="overflow-x-auto px-space-3 pb-space-3 pt-space-2 font-mono text-code text-ink">{plan}</pre>
        </details>
      ) : null}
      {m.length ? (
        <div className="tabular flex flex-wrap gap-x-space-3 gap-y-space-1 font-mono text-[11px] leading-4 text-ink-subtle">
          {m.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      ) : null}
    </article>
  );
}
