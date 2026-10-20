import { z } from "zod";

const dim = z.string().max(60).default("All");
export const Filters = z.object({ range: z.enum(["30D", "90D", "YTD", "1Y", "All"]).default("1Y"), region: dim, channel: dim, category: dim, segment: dim });

export const Register = z.object({
  email: z.string().email().max(120),
  password: z.string().min(8, "Use at least 8 characters.").max(200),
  name: z.string().min(1).max(80),
});
export const Login = z.object({ email: z.string().email(), password: z.string().min(1) });

export const Ask = z.object({ question: z.string().trim().min(1, "Ask a question.").max(2000), chatId: z.string().uuid().optional() });

export const SettingsBody = z.object({
  theme: z.enum(["light", "dark", "system"]),
  defaultFilters: Filters,
});

export const LogsQuery = z.object({ days: z.coerce.number().int().min(1).max(365).default(30) });
