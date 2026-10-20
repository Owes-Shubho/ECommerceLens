import express, { Router } from "express";
import rateLimit from "express-rate-limit";
import * as ai from "../controllers/aiController.js";
import * as authC from "../controllers/authController.js";
import { forward, profileUpload } from "../controllers/gatewayController.js";
import { getSettings, putSettings } from "../controllers/settingsController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { callAnalytics } from "../services/analyticsClient.js";
import { Ask, LogsQuery, Login, Register, SettingsBody } from "../validators/schemas.js";

// Express 4 does not catch rejected promises; this passes them to the error handler.
type Handler = (req: express.Request, res: express.Response) => unknown;
const h = (fn: Handler): express.RequestHandler => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

const askLimiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false, message: { error: { code: "rate_limited", message: "Too many questions in a minute. Wait a moment and ask again." } } });
const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false, message: { error: { code: "rate_limited", message: "Too many sign-in attempts. Try again in a few minutes." } } });

export const router = Router();

router.get("/health", h(async (_req, res) => {
  const analytics = await callAnalytics<{ status: string; orders: number; dataSource: string }>("/health").then((r) => r.data).catch((e: Error) => ({ status: "unreachable", message: e.message }));
  res.status(analytics.status === "ok" ? 200 : 503).json({ data: { status: analytics.status === "ok" ? "ok" : "degraded", api: "ok", analytics, storage: "in-memory" } });
}));

// Auth
router.post("/auth/register", authLimiter, validate(Register), h(authC.register));
router.post("/auth/login", authLimiter, validate(Login), h(authC.login));
router.get("/auth/me", authenticate, h(authC.me));

// Everything below knows who is calling (demo user when AUTH_REQUIRED=false).
router.use(authenticate);

router.get("/settings", h(getSettings));
router.put("/settings", validate(SettingsBody), h(putSettings));

// Analytics gateway → Python service
router.get("/meta", h(forward("/meta")));
router.get("/schema", h(forward("/schema")));
for (const page of ["overview", "sales", "customers", "products", "operations", "compare"]) router.get(`/analytics/${page}`, h(forward(`/analytics/${page}`)));
router.get("/ml/forecast", h(forward("/ml/forecast")));
router.get("/ml/anomalies", h(forward("/ml/anomalies")));
router.get("/data/sources", h(forward("/data/sources")));
router.get("/data/quality", h(forward("/data/quality")));
router.post("/data/profile", express.raw({ type: "multipart/form-data", limit: "60mb" }), h(profileUpload));

// AI assistant and observatory
router.post("/ai/ask", askLimiter, validate(Ask), h(ai.ask));
router.get("/ai/chats", h(ai.listChats));
router.get("/ai/chats/:id", h(ai.getChat));
router.delete("/ai/chats/:id", h(ai.deleteChat));
router.get("/ai/logs", validate(LogsQuery, "query"), h(ai.logs));
router.get("/ai/guardrail-events", h(forward("/ai/guardrail-events")));
