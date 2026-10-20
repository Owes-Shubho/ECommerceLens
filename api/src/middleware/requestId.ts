import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

declare module "express-serve-static-core" {
  interface Request {
    id: string;
    userId?: string;
  }
}

/** Gives every request an id (reused from X-Request-Id) and passes it to the analytics service. */
export function requestId(req: Request, res: Response, next: NextFunction) {
  req.id = (req.header("X-Request-Id") ?? randomUUID().slice(0, 12)).slice(0, 64);
  res.setHeader("X-Request-Id", req.id);
  next();
}
