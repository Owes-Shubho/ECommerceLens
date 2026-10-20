// Calls the Python analytics service. Errors come back as HttpError with the service's own code and message.
import { env } from "../config/env.js";
import { HttpError } from "../utils/httpError.js";

interface Envelope<T> {
  data: T;
  meta?: { executionMs?: number; requestId?: string; dataSource?: string };
  error?: { code: string; message: string; details?: unknown };
}

export async function callAnalytics<T>(
  path: string,
  opts: { method?: string; query?: Record<string, unknown>; body?: unknown; raw?: { buffer: Buffer; contentType: string }; requestId?: string } = {},
): Promise<{ data: T; meta?: Envelope<T>["meta"] }> {
  const url = new URL(path, env.ANALYTICS_SERVICE_URL);
  for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.requestId) headers["X-Request-Id"] = opts.requestId;
  let body: BodyInit | undefined;
  if (opts.raw) {
    headers["Content-Type"] = opts.raw.contentType;
    body = opts.raw.buffer;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  let res: Response;
  try {
    res = await fetch(url, { method: opts.method ?? "GET", headers, body, signal: AbortSignal.timeout(env.ANALYTICS_TIMEOUT_MS) });
  } catch (e) {
    const timeout = e instanceof Error && e.name === "TimeoutError";
    throw new HttpError(timeout ? 504 : 502, timeout ? "analytics_timeout" : "analytics_unavailable",
      timeout ? "The analytics service took too long to answer." : "The analytics service is not reachable. Start it with `python app.py` in analytics-service.");
  }
  const json = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !json) {
    throw new HttpError(res.status >= 400 && res.status < 500 ? res.status : 502, json?.error?.code ?? "analytics_error", json?.error?.message ?? `Analytics service returned ${res.status}.`, json?.error?.details);
  }
  return { data: json.data, meta: json.meta };
}
