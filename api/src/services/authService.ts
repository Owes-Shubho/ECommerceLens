import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { db, type User } from "../models/store.js";
import { HttpError } from "../utils/httpError.js";

export interface TokenPayload {
  sub: string;
  email: string;
  role: User["role"];
}

export const publicUser = (u: User) => ({ id: u.id, email: u.email, name: u.name, role: u.role, createdAt: u.createdAt });

export function signToken(u: User) {
  const payload: TokenPayload = { sub: u.id, email: u.email, role: u.role };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  } catch {
    throw new HttpError(401, "invalid_token", "Your session has expired. Sign in again.");
  }
}

export async function register(email: string, password: string, name: string) {
  if (db.users.byEmail(email)) throw new HttpError(409, "email_taken", "An account with this email already exists.");
  const user = db.users.insert({ id: randomUUID(), email: email.toLowerCase(), name, passwordHash: await bcrypt.hash(password, 10), role: "analyst", createdAt: new Date().toISOString() });
  return { user: publicUser(user), token: signToken(user) };
}

export async function login(email: string, password: string) {
  const user = db.users.byEmail(email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(401, "invalid_credentials", "Email or password is incorrect.");
  return { user: publicUser(user), token: signToken(user) };
}
