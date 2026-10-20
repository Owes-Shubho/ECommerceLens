import type { Request, Response } from "express";
import { db } from "../models/store.js";

export function getSettings(req: Request, res: Response) {
  res.json({ data: db.settings.get(req.userId!) });
}

export function putSettings(req: Request, res: Response) {
  res.json({ data: db.settings.set(req.userId!, req.body) });
}
