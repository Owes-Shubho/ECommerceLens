import { useCallback, useEffect, useState } from "react";

export type ThemeChoice = "light" | "dark" | "system";
const KEY = "ecl-theme";

function read(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

/** Light / dark / system theme, applied as data-theme on <html>. "system" removes the attribute so tokens.css follows the OS. */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemeChoice>(read);

  useEffect(() => {
    const el = document.documentElement;
    if (theme === "system") el.removeAttribute("data-theme");
    else el.setAttribute("data-theme", theme);
    try {
      if (theme === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, theme);
    } catch {
      /* storage unavailable: the choice lasts for this session only */
    }
  }, [theme]);

  const setTheme = useCallback((t: ThemeChoice) => setThemeState(t), []);
  return { theme, setTheme };
}
