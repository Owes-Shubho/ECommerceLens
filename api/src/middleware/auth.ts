import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { DEMO_USER } from "../models/seed.js";
import { db } from "../models/store.js";
import { verifyToken } from "../services/authService.js";
import { HttpError } from "../utils/httpError.js";

/**
 * Reads the Bearer token. With AUTH_REQUIRED=false, a request without a token acts as the demo user,
 * so the frontend works before the login screen exists. A token that is present must always be valid.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.header("Authorization");
  if (header?.startsWith("Bearer ")) {
    const payload = verifyToken(header.slice(7));
    if (!db.users.get(payload.sub)) return next(new HttpError(401, "invalid_token", "Your session has expired. Sign in again."));
    req.userId = payload.sub;
    return next();
  }
  if (env.AUTH_REQUIRED) return next(new HttpError(401, "auth_required", "Sign in to use this endpoint."));
  req.userId = db.users.byEmail(DEMO_USER.email)?.id;
  next();
}

export function requireRole(role: "admin") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.userId ? db.users.get(req.userId) : undefined;
    if (user?.role !== role) return next(new HttpError(403, "forbidden", "You don't have permission to do this."));
    next();
  };
}
