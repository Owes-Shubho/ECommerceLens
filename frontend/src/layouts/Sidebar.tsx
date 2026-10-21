import type * as React from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { NavItem } from "./nav";

export interface SidebarProps {
  items: NavItem[];
  footer?: React.ReactNode;
  className?: string;
  /** Called after a link is chosen (closes the mobile drawer). */
  onNavigate?: () => void;
}

/** The app icon (cart + lens). */
export function LensMark({ className }: { className?: string }) {
  return <img src="/brand/icon.png" alt="" width={28} height={28} className={cn("size-7 shrink-0", className)} />;
}

/** Icon + wordmark. The wordmark has a dark-text and a white-text version; CSS shows the one that suits the theme. */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-space-2", className)}>
      <LensMark />
      <img src="/brand/wordmark-light-bg.png" alt="ECommerceLens" className="wordmark-on-light h-[18px] w-auto" />
      <img src="/brand/wordmark-dark-bg.png" alt="ECommerceLens" className="wordmark-on-dark h-[18px] w-auto" />
    </span>
  );
}

/** Main navigation: wordmark, pages grouped by area, and the active dataset version in the footer. */
export function Sidebar({ items, footer, className, onNavigate }: SidebarProps) {
  const groups = [...new Set(items.map((i) => i.group))];
  return (
    <nav aria-label="Main" className={cn("flex w-sidebar flex-col gap-space-4 border-r border-line bg-surface px-space-3 py-space-4", className)}>
      <NavLink to="/" onClick={onNavigate} className="rounded-sm px-space-2 py-space-1" aria-label="ECommerceLens home">
        <BrandLogo />
      </NavLink>
      <div className="grid gap-0.5 overflow-y-auto">
        {groups.map((g) => (
          <div key={g} className="grid gap-0.5">
            <div className="px-space-2 pb-space-1 pt-space-3 text-eyebrow uppercase text-ink-subtle">{g}</div>
            {items
              .filter((i) => i.group === g)
              .map((i) => (
                <NavLink
                  key={i.id}
                  to={i.path}
                  end={i.path === "/"}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "flex h-8 items-center justify-between gap-space-2 rounded-sm px-space-2 text-left text-body-sm",
                      isActive ? "bg-lens-soft font-semibold text-lens" : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
                    )
                  }
                >
                  <span>{i.label}</span>
                  {i.badge ? <span className="tabular text-eyebrow text-critical-ink">{i.badge}</span> : null}
                </NavLink>
              ))}
          </div>
        ))}
      </div>
      {footer ? <div className="mt-auto border-t border-line p-space-2 text-label font-normal text-ink-subtle">{footer}</div> : null}
    </nav>
  );
}
