import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

// Every value points at a CSS variable from src/styles/tokens.css (generated from the design system).
// Colours are plain var() references, so Tailwind opacity modifiers (bg-lens/50) do not apply; use the -soft tokens instead.
const v = (name: string) => `var(--${name})`;
const series = Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map((i) => [String(i), v(`series-${i}`)]));
const seq = Object.fromEntries([1, 2, 3, 4, 5].map((i) => [String(i), v(`seq-${i}`)]));

export default {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: { DEFAULT: v("surface"), raised: v("surface-raised"), sunken: v("surface-sunken") },
        line: { DEFAULT: v("line"), strong: v("line-strong") },
        ink: { DEFAULT: v("ink"), muted: v("ink-muted"), subtle: v("ink-subtle") },
        lens: { DEFAULT: v("lens"), soft: v("lens-soft"), on: v("on-lens") },
        link: v("link"),
        good: { DEFAULT: v("good"), ink: v("good-ink"), soft: v("good-soft") },
        warning: { DEFAULT: v("warning"), ink: v("warning-ink"), soft: v("warning-soft") },
        serious: { DEFAULT: v("serious"), ink: v("serious-ink"), soft: v("serious-soft") },
        critical: { DEFAULT: v("critical"), ink: v("critical-ink"), soft: v("critical-soft") },
        series,
        seq,
        div: { neg: v("div-neg"), mid: v("div-mid"), pos: v("div-pos") },
        chart: { grid: v("chart-grid"), axis: v("chart-axis") },
        // shadcn/ui names, mapped onto the design system (see src/styles/globals.css)
        background: v("background"),
        foreground: v("foreground"),
        card: { DEFAULT: v("card"), foreground: v("card-foreground") },
        popover: { DEFAULT: v("popover"), foreground: v("popover-foreground") },
        primary: { DEFAULT: v("primary"), foreground: v("primary-foreground") },
        secondary: { DEFAULT: v("secondary"), foreground: v("secondary-foreground") },
        muted: { DEFAULT: v("muted"), foreground: v("muted-foreground") },
        accent: { DEFAULT: v("accent"), foreground: v("accent-foreground") },
        destructive: { DEFAULT: v("destructive"), foreground: v("destructive-foreground") },
        border: v("border"),
        input: v("input"),
        ring: v("ring"),
      },
      fontFamily: { display: [v("font-display")], sans: [v("font-sans")], mono: [v("font-mono")] },
      fontSize: {
        display: ["32px", { lineHeight: "38px", letterSpacing: "-0.015em", fontWeight: "700" }],
        title: ["22px", { lineHeight: "28px", letterSpacing: "-0.01em", fontWeight: "650" }],
        heading: ["15px", { lineHeight: "22px", fontWeight: "600" }],
        body: ["14px", { lineHeight: "20px" }],
        "body-sm": ["13px", { lineHeight: "18px" }],
        label: ["12px", { lineHeight: "16px", letterSpacing: "0.01em", fontWeight: "500" }],
        eyebrow: ["11px", { lineHeight: "16px", letterSpacing: "0.08em", fontWeight: "600" }],
        kpi: ["28px", { lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: "600" }],
        number: ["13px", { lineHeight: "18px", fontWeight: "500" }],
        code: ["12px", { lineHeight: "18px" }],
      },
      spacing: {
        "space-1": v("space-1"), "space-2": v("space-2"), "space-3": v("space-3"), "space-4": v("space-4"),
        "space-5": v("space-5"), "space-6": v("space-6"), "space-8": v("space-8"), "space-12": v("space-12"),
        sidebar: v("sidebar-width"), topbar: v("topbar-height"), control: v("control-height"),
      },
      maxWidth: { content: v("content-max") },
      borderRadius: {
        xs: v("radius-xs"), sm: v("radius-sm"), md: v("radius-md"), lg: v("radius-lg"), full: v("radius-full"),
      },
      boxShadow: { sm: v("shadow-sm"), lg: v("shadow-lg"), focus: v("focus-ring") },
    },
  },
  plugins: [animate],
} satisfies Config;
