import { useState } from "react";
import { AppShell } from "@/layouts/AppShell";
import { NAV_ITEMS } from "@/layouts/nav";
import { DesignSystemPage } from "@/pages/DesignSystemPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { StatusPill } from "@/components/ui";

const PHASE: Record<string, string> = {
  overview: "Phase 6", sales: "Phase 7", customers: "Phase 8", products: "Phase 9", operations: "Phase 10",
  forecast: "Phase 20", anomalies: "Phase 19", assistant: "Phase 16", observatory: "Phase 24", datasets: "Phase 25",
};

// Simple in-memory navigation until React Router is added in Phase 5.
export default function App() {
  const [page, setPage] = useState("design-system");
  const item = NAV_ITEMS.find((i) => i.id === page) ?? NAV_ITEMS[0];
  return (
    <AppShell page={page} onNavigate={setPage} title={item.label} headerActions={<StatusPill>v1 · 2021–2025</StatusPill>}>
      {page === "design-system" ? <DesignSystemPage /> : <PlaceholderPage title={item.label} phase={PHASE[page] ?? "a later phase"} />}
    </AppShell>
  );
}
