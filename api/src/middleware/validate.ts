import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";
import { HttpError } from "../utils/httpError.js";

/** Validates req.body or req.query with a Zod schema and replaces it with the parsed value. */
export function validate(schema: ZodTypeAny, where: "body" | "query" = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[where]);
    if (!result.success) {
      return next(new HttpError(400, "invalid_request", "Some fields are not valid.", result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }))));
    }
    if (where === "body") req.body = result.data;
    else Object.defineProperty(req, "query", { value: result.data, writable: true });
    next();
  };
}
