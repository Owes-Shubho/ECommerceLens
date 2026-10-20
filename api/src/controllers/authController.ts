import type { Request, Response } from "express";
import { db } from "../models/store.js";
import * as auth from "../services/authService.js";
import { HttpError } from "../utils/httpError.js";

export async function register(req: Request, res: Response) {
  const { email, password, name } = req.body;
  res.status(201).json({ data: await auth.register(email, password, name) });
}

export async function login(req: Request, res: Response) {
  res.json({ data: await auth.login(req.body.email, req.body.password) });
}

export function me(req: Request, res: Response) {
  const user = req.userId ? db.users.get(req.userId) : undefined;
  if (!user) throw new HttpError(401, "auth_required", "Sign in to see your account.");
  res.json({ data: auth.publicUser(user) });
}
