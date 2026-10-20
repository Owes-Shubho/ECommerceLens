import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu, Moon, Sun, SunMoon, X } from "lucide-react";
import { Button, StatusPill } from "@/components/ui";
import { useTheme, type ThemeChoice } from "@/lib/theme";
import { NAV_ITEMS } from "./nav";
import { Sidebar } from "./Sidebar";

const NEXT: Record<ThemeChoice, ThemeChoice> = { system: "light", light: "dark", dark: "system" };
const THEME_ICON = { system: SunMoon, light: Sun, dark: Moon };

/** Sidebar at 1024px and wider (a drawer below), a page header, then the routed page up to content-max. */
export function AppShell() {
  const { theme, setTheme } = useTheme();
  const ThemeIcon = THEME_ICON[theme];
  const { pathname } = useLocation();
  const [menu, setMenu] = useState(false);
  const item = NAV_ITEMS.find((i) => (i.path === "/" ? pathname === "/" : pathname.startsWith(i.path))) ?? NAV_ITEMS[0];

  useEffect(() => {
    document.title = `${item.label} · ECommerceLens`;
    document.querySelector("main")?.scrollTo(0, 0);
  }, [item.label]);

  const footer = "Demo data · 2021–2025";
  return (
    <div className="flex h-full">
      <Sidebar items={NAV_ITEMS} footer={footer} className="hidden lg:flex" />
      {menu ? (
        <div className="fixed inset-0 z-30 lg:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-[rgba(10,15,16,0.45)]" onClick={() => setMenu(false)} />
          <Sidebar items={NAV_ITEMS} footer={footer} onNavigate={() => setMenu(false)} className="relative h-full shadow-lg" />
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-topbar items-center justify-between gap-space-3 border-b border-line bg-surface px-space-4 md:px-space-6">
          <div className="flex min-w-0 items-center gap-space-2">
            <Button variant="ghost" size="sm" className="lg:hidden" icon={menu ? <X aria-hidden /> : <Menu aria-hidden />} onClick={() => setMenu(!menu)} aria-label="Open menu" />
            <h1 className="truncate font-display text-title text-ink">{item.label}</h1>
          </div>
          <div className="flex items-center gap-space-2">
            <StatusPill tone="lens" icon={false} className="hidden sm:inline-flex">
              Demo data
            </StatusPill>
            <Button variant="ghost" size="sm" icon={<ThemeIcon aria-hidden />} onClick={() => setTheme(NEXT[theme])} aria-label={`Theme: ${theme}. Switch to ${NEXT[theme]}`}>
              <span className="hidden capitalize sm:inline">{theme}</span>
            </Button>
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto grid max-w-content gap-space-6 p-space-4 md:p-space-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
