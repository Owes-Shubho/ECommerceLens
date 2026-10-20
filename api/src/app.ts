import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requestId } from "./middleware/requestId.js";
import { seed } from "./models/seed.js";
import { router } from "./routes/index.js";
import { logger } from "./utils/logger.js";

export function createApp() {
  seed();
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_URL.split(",").map((s) => s.trim()), credentials: true }));
  app.use(requestId);
  app.use(pinoHttp({ logger, genReqId: (req) => (req as express.Request).id, autoLogging: { ignore: (req) => req.url === "/api/health" } }));
  app.use(express.json({ limit: "100kb" }));
  app.use(rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: "draft-7", legacyHeaders: false, message: { error: { code: "rate_limited", message: "Too many requests. Slow down and try again." } } }));
  app.use("/api", router);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
