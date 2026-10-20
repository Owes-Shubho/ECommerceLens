import "dotenv/config";
import { z } from "zod";

const Env = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().default(4000),
  ANALYTICS_SERVICE_URL: z.string().url().default("http://localhost:5001"),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  JWT_SECRET: z.string().min(8).default("dev-only-secret-change-me"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  AUTH_REQUIRED: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  ANALYTICS_TIMEOUT_MS: z.coerce.number().int().default(15000),
});

const parsed = Env.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = parsed.data;

if (env.NODE_ENV === "production" && env.JWT_SECRET === "dev-only-secret-change-me") {
  console.error("Set JWT_SECRET before running in production.");
  process.exit(1);
}
