import type { Request, Response } from "express";
import { callAnalytics } from "../services/analyticsClient.js";

/** Forwards a GET to the analytics service with the same query string, returning its { data, meta }. */
export function forward(path: string) {
  return async (req: Request, res: Response) => {
    const out = await callAnalytics(path, { query: req.query as Record<string, unknown>, requestId: req.id });
    res.json(out);
  };
}

/** Streams an uploaded CSV (multipart) to the analytics service's profiler. */
export async function profileUpload(req: Request, res: Response) {
  const out = await callAnalytics("/data/profile", {
    method: "POST",
    raw: { buffer: req.body as Buffer, contentType: req.header("Content-Type") ?? "application/octet-stream" },
    requestId: req.id,
  });
  res.json(out);
}
