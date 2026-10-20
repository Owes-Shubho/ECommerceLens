import type * as React from "react";
import { Moon, Sun, SunMoon } from "lucide-react";
import { Button } from "@/components/ui";
import { useTheme, type ThemeChoice } from "@/lib/theme";
import { NAV_ITEMS } from "./nav";
import { Sidebar } from "./Sidebar";

const NEXT: Record<ThemeChoice, ThemeChoice> = { system: "light", light: "dark", dark: "system" };
const THEME_ICON = { system: SunMoon, light: Sun, dark: Moon };

export interface AppShellProps {
  page: string;
  onNavigate: (id: string) => void;
  title: string;
  /** Right side of the page header (dataset version, assistant toggle). */
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

/** Sidebar at 1024px and wider, a page header, then the page content up to content-max. */
export function AppShell({ page, onNavigate, title, headerActions, children }: AppShellProps) {
  const { theme, setTheme } = useTheme();
  const ThemeIcon = THEME_ICON[theme];
  return (
    <div className="flex h-full">
      <Sidebar items={NAV_ITEMS} active={page} onSelect={onNavigate} footer="Dataset v1 · 138,116 orders" className="hidden lg:flex" />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-topbar items-center justify-between gap-space-4 border-b border-line bg-surface px-space-6">
          <h1 className="truncate font-display text-title text-ink">{title}</h1>
          <div className="flex items-center gap-space-2">
            {headerActions}
            <Button variant="ghost" size="sm" icon={<ThemeIcon aria-hidden />} onClick={() => setTheme(NEXT[theme])} aria-label={`Theme: ${theme}. Switch to ${NEXT[theme]}`}>
              <span className="capitalize">{theme}</span>
            </Button>
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto grid max-w-content gap-space-6 p-space-4 md:p-space-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
