# ECommerceLens — API (Node / Express / TypeScript)

Auth, settings, chat history, the AI request log, and a gateway to the Python analytics service.
**No database yet:** users, chats, settings and AI logs live in memory (`src/models/store.ts`, one class per planned MongoDB collection) and reset on restart.

## Run it

```bash
cd api
cp .env.example .env          # Windows: copy .env.example .env
npm install
npm run dev                   # http://localhost:4000/api  (needs the analytics service on :5001)
npm test                      # 16 tests, run against a stand-in analytics service
npm run build && npm start    # compiled
```

Demo login: `demo@ecommercelens.local` / `demo1234`. With `AUTH_REQUIRED=false` (default), requests without a token act as this user, so the frontend works before it has a login screen.

## Endpoints (prefix `/api`)

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | API + analytics service status |
| POST | `/auth/register`, `/auth/login` | returns `{ user, token }` (JWT) |
| GET | `/auth/me` | |
| GET / PUT | `/settings` | theme and default filters per user |
| GET | `/meta`, `/schema`, `/analytics/{overview,sales,customers,products,operations,compare}`, `/ml/forecast`, `/ml/anomalies`, `/data/sources`, `/data/quality` | forwarded to the analytics service with the same query string |
| POST | `/data/profile` | multipart CSV, forwarded |
| POST | `/ai/ask` | `{ question, chatId? }` → `{ chatId, reply }`; stores the turn and logs the request |
| GET | `/ai/chats`, `/ai/chats/:id` · DELETE `/ai/chats/:id` | chat history |
| GET | `/ai/logs?days=30` | AI observatory: summary, latency by model, guardrail rules, tokens per day, requests |
| GET | `/ai/guardrail-events` | forwarded |

Errors are `{ error: { code, message, details? } }`. Security: Helmet headers, CORS limited to `FRONTEND_URL`, rate limits (300/min overall, 20 questions/min, 30 sign-ins per 15 min), Zod validation, passwords hashed with bcrypt, request ids passed to the analytics service.

## Moving to MongoDB (Phase 4)

Replace the classes in `src/models/store.ts` with Mongoose models that keep the same method names (`insert`, `get`, `byEmail`, `forUser`, `since` …). Controllers don't change.
