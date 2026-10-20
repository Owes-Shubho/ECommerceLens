# ECommerceLens — frontend

React 18 + TypeScript + Vite + Tailwind CSS 3 + shadcn/ui conventions, styled by the ECommerceLens design system.

## Run it

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check and production build
```

## Design system

- **Tokens live in one place:** `src/design-system/tokens.json` (the same file as the published design system).
- After editing it, run `npm run tokens` to regenerate `src/styles/tokens.css`. Never edit `tokens.css` by hand.
- `tailwind.config.ts` maps every token to a Tailwind name: `bg-surface-raised`, `text-ink-muted`, `border-line-strong`, `bg-lens text-lens-on`, `bg-good-soft text-good-ink`, `text-series-1`, `p-space-4`, `rounded-md`, `text-kpi`, `font-display`.
- `src/styles/globals.css` points the shadcn/ui variables (`--primary`, `--muted`, `--border`, …) at the tokens, so components added with `npx shadcn@latest add <name>` match the system.
- Theme: `useTheme()` in `src/lib/theme.ts` sets `data-theme` on `<html>` (light, dark, or system).
- Charts: start every Plotly layout from `plotlyLayout()` in `src/lib/plotlyTheme.ts`; colour series with `seriesColor(n)` in fixed order.

## Components (`src/components/ui`)

`Button`, `StatusPill`, `KpiCard`, `Sparkline`, `SegmentedControl`, `Field`, `FilterBar`, `ChartCard`, `DataTable`, `Alert`, `ChatMessage`. App shell and navigation are in `src/layouts` (`AppShell`, `Sidebar`, `nav.ts`). Every component has a doc comment with its usage rules; the full guidelines are in the design system.

## Pages (working on demo data)

| Page | What works |
|---|---|
| Executive overview | KPIs with change vs the previous period, net sales and profit trend, category, channel and region charts, top products, computed insights |
| Sales | Gross vs net trend with Day / Week / Month, channel, payment, country, discount vs margin, sortable marketing-channel table |
| Customers | RFM scoring and grid, segment table, new vs returning orders, lifetime-spend histogram, top customers (IDs only) |
| Products | Click a category bar to drill into subcategories, margin vs return-rate scatter, top brands, searchable and paged product table with CSV export |
| Operations | On-time rate, delivery time, delivery outcome by shipping method, return reasons, cancellation trend, warehouse table |
| Forecast | Daily or weekly series, baseline / LSTM / GRU, 7–30 day horizon, chronological train/validation/test split, MAE, RMSE, MAPE, R² |
| Anomalies | Rolling z-score detection on orders or net sales, sensitivity control, severity, likely driver, CSV export |
| Lens assistant | Questions → guardrails → JSON query plan → result with chart and table; follow-ups keep context; blocked and auto-repaired cases |
| AI observatory | Tokens (baseline vs optimized), cost, latency by model, guardrail events, request log (includes your assistant questions) |
| Dataset management | Real file inventory and quality notes; drop a CSV to profile it in the browser and validate it against the 46 expected columns |

All filters at the top of the analytics pages are global (`src/store/filters.ts`) and every chart has a Table view and CSV download.

## Demo data and the swap to the real API

- `src/data/generate.ts` builds a deterministic dataset in the browser (about 41,000 orders, 2,500 customers, 240 products, 2021–2025) using the real dataset's category values, channel, region and payment mixes. Its headline figures sit close to the real ones (AOV about $1,200, margin about 43%, return rate about 6.6%).
- Pages never touch the demo data directly. They call `src/services/analytics.ts` through TanStack Query (`src/hooks/useApi.ts`). When the Flask analytics service exists, replace each function body with a `fetch()` to the matching endpoint; the pages stay the same.
- The assistant (`src/ai/demoAssistant.ts`) is a rule-based stand-in for the OpenRouter pipeline. It keeps the same contract: guardrails, a structured query plan, execution on the data, and an answer built only from the result.
- In the forecast, the baseline is a real linear regression; LSTM and GRU are labelled stand-ins until the PyTorch models from Phase 20 are served by the API.
