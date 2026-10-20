# ECommerceLens — frontend

React 18 + TypeScript + Vite + Tailwind CSS 3 + shadcn/ui conventions, styled by the ECommerceLens design system.

## Run it

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173 (opens on the Design system page)
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
