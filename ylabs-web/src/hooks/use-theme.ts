import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    setThemeState(root.classList.contains("dark") ? "dark" : "light");
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem("pl-theme", theme); } catch {}
  }, [theme, ready]);

  const toggle = () => {
    setReady(true);
    setThemeState((t) => (t === "dark" ? "light" : "dark"));
  };
  return { theme, setTheme: setThemeState, toggle };
}
