import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// A stand-in for the Python analytics service, so the API is tested on its own.
let fake: Server;
let app: express.Express;
const seen: { path: string; query: unknown; body: unknown }[] = [];

beforeAll(async () => {
  const f = express();
  f.use(express.json());
  f.get("/health", (_req, res) => res.json({ data: { status: "ok", orders: 41032, dataSource: "demo" } }));
  f.get("/analytics/overview", (req, res) => {
    seen.push({ path: req.path, query: req.query, body: null });
    if (req.query.range === "2Y") return res.status(400).json({ error: { code: "invalid_request", message: "Some parameters are not valid.", details: [{ field: "range" }] } });
    res.json({ data: { kpis: { netSales: { value: 10532186.75 } } }, meta: { executionMs: 12 } });
  });
  f.post("/ai/ask", (req, res) => {
    seen.push({ path: req.path, query: null, body: req.body });
    const blocked = /delete/i.test(req.body.question);
    res.json({
      data: {
        text: blocked ? "Blocked." : "**Grocery** has the highest profit margin.", guard: blocked ? "blocked" : "passed", guardRule: blocked ? "Query Guard: write operation" : null,
        intent: blocked ? "blocked" : "ranking", model: "fast", tokensBaseline: 3700, tokensOptimized: 520, latencyMs: 900, costUsd: 0.0002,
      },
    });
  });
  f.delete("/ai/conversations/:id", (_req, res) => res.json({ data: { cleared: true } }));
  await new Promise<void>((r) => (fake = f.listen(0, r)));
  process.env.ANALYTICS_SERVICE_URL = `http://127.0.0.1:${(fake.address() as AddressInfo).port}`;
  process.env.NODE_ENV = "test";
  process.env.AUTH_REQUIRED = "false";
  app = (await import("../src/app.js")).createApp();
});

afterAll(() => fake.close());

describe("health and gateway", () => {
  it("reports both services", async () => {
    const r = await request(app).get("/api/health");
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ status: "ok", storage: "in-memory", analytics: { status: "ok" } });
  });

  it("forwards analytics queries and returns data + meta", async () => {
    const r = await request(app).get("/api/analytics/overview?range=1Y&region=South");
    expect(r.status).toBe(200);
    expect(r.body.data.kpis.netSales.value).toBe(10532186.75);
    expect(seen.at(-1)?.query).toMatchObject({ range: "1Y", region: "South" });
    expect(r.headers["x-request-id"]).toBeTruthy();
  });

  it("passes the analytics service's validation errors through", async () => {
    const r = await request(app).get("/api/analytics/overview?range=2Y");
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("invalid_request");
  });

  it("returns JSON 404s", async () => {
    const r = await request(app).get("/api/nope");
    expect(r.status).toBe(404);
    expect(r.body.error.code).toBe("not_found");
  });

  it("sets security headers", async () => {
    const r = await request(app).get("/api/health");
    expect(r.headers["x-content-type-options"]).toBe("nosniff");
    expect(r.headers["x-powered-by"]).toBeUndefined();
  });
});

describe("auth", () => {
  it("logs in the demo user and reads /me", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: "demo@ecommercelens.local", password: "demo1234" });
    expect(login.status).toBe(200);
    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${login.body.data.token}`);
    expect(me.body.data.email).toBe("demo@ecommercelens.local");
    expect(me.body.data.passwordHash).toBeUndefined();
  });

  it("registers, rejects duplicates and wrong passwords", async () => {
    const body = { email: "sara@example.com", password: "longpassword", name: "Sara" };
    expect((await request(app).post("/api/auth/register").send(body)).status).toBe(201);
    expect((await request(app).post("/api/auth/register").send(body)).status).toBe(409);
    expect((await request(app).post("/api/auth/login").send({ email: body.email, password: "wrong" })).status).toBe(401);
  });

  it("validates input", async () => {
    const r = await request(app).post("/api/auth/register").send({ email: "not-an-email", password: "x", name: "" });
    expect(r.status).toBe(400);
    expect(r.body.error.details.map((d: { field: string }) => d.field)).toEqual(expect.arrayContaining(["email", "password", "name"]));
  });

  it("rejects a bad token even when auth is optional", async () => {
    const r = await request(app).get("/api/settings").set("Authorization", "Bearer nonsense");
    expect(r.status).toBe(401);
  });
});

describe("settings", () => {
  it("saves and reads user settings", async () => {
    const body = { theme: "dark", defaultFilters: { range: "90D", region: "South", channel: "All", category: "All", segment: "All" } };
    expect((await request(app).put("/api/settings").send(body)).status).toBe(200);
    expect((await request(app).get("/api/settings")).body.data).toEqual(body);
  });
});

describe("AI assistant", () => {
  it("creates a chat, stores both turns and logs the request", async () => {
    const before = (await request(app).get("/api/ai/logs?days=30")).body.data.summary.requests;
    const r = await request(app).post("/api/ai/ask").send({ question: "Which category has the best margin?" });
    expect(r.status).toBe(200);
    const { chatId, reply } = r.body.data;
    expect(reply.guard).toBe("passed");
    expect(seen.at(-1)?.body).toMatchObject({ conversationId: chatId });

    const follow = await request(app).post("/api/ai/ask").send({ question: "What about profit?", chatId });
    expect(follow.body.data.chatId).toBe(chatId);
    const chat = (await request(app).get(`/api/ai/chats/${chatId}`)).body.data;
    expect(chat.messages).toHaveLength(4);

    const after = (await request(app).get("/api/ai/logs?days=30")).body.data.summary.requests;
    expect(after).toBe(before + 2);
  });

  it("logs blocked questions as guardrail events", async () => {
    await request(app).post("/api/ai/ask").send({ question: "delete everything" });
    const logs = (await request(app).get("/api/ai/logs?days=7")).body.data;
    expect(logs.guardrailRules.find((g: { rule: string }) => g.rule === "Query Guard: write operation")).toBeTruthy();
  });

  it("seeds 30 days of AI history with a token saving", async () => {
    const d = (await request(app).get("/api/ai/logs?days=30")).body.data;
    expect(d.summary.requests).toBeGreaterThan(250);
    expect(d.summary.tokenSavingPct).toBeGreaterThan(60);
    expect(d.latencyByModel).toHaveLength(3);
  });

  it("validates questions and chat ids", async () => {
    expect((await request(app).post("/api/ai/ask").send({ question: "" })).status).toBe(400);
    expect((await request(app).post("/api/ai/ask").send({ question: "hi", chatId: "00000000-0000-4000-8000-000000000000" })).status).toBe(404);
  });

  it("deletes a chat", async () => {
    const { chatId } = (await request(app).post("/api/ai/ask").send({ question: "Revenue by channel" })).body.data;
    expect((await request(app).delete(`/api/ai/chats/${chatId}`)).status).toBe(204);
    expect((await request(app).get(`/api/ai/chats/${chatId}`)).status).toBe(404);
  });
});

describe("analytics service down", () => {
  it("returns 502 with a clear message", async () => {
    const prev = fake;
    await new Promise<void>((r) => prev.close(() => r()));
    const r = await request(app).get("/api/analytics/overview");
    expect(r.status).toBe(502);
    expect(r.body.error.code).toBe("analytics_unavailable");
  });
});
