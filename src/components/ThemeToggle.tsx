import { useState } from "react";
import { currentTheme, setTheme, type Theme } from "../lib/theme";

/** Light/dark toggle. Shows the icon for the mode you'd switch TO. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setLocal] = useState<Theme>(() => currentTheme());

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setLocal(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className={`rounded-xl border border-edge2 bg-surface px-3 py-2 text-sm text-ink transition hover:border-grind hover:text-grind ${className}`}
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
