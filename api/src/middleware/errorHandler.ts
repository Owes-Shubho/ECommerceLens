import type { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger.js";
import { HttpError } from "../utils/httpError.js";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, "not_found", `No endpoint at ${req.method} ${req.path}.`));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } });
    return;
  }
  if (err && typeof err === "object" && "type" in err && (err as { type: string }).type === "entity.parse.failed") {
    res.status(400).json({ error: { code: "invalid_json", message: "The request body is not valid JSON." } });
    return;
  }
  logger.error({ err, requestId: req.id }, "Unhandled error");
  res.status(500).json({ error: { code: "internal_error", message: "Something went wrong.", requestId: req.id } });
}
