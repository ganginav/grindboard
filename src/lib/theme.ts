/**
 * Light/dark theme, matching LeetCode's behavior: default to the OS preference,
 * let the user override, and remember the override. The theme is a `dark` class
 * on <html> that flips the CSS variables in index.css.
 */

export type Theme = "light" | "dark";

const KEY = "lb-theme";

function stored(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

export function systemTheme(): Theme {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** The theme to use right now: stored override, else OS preference. */
export function currentTheme(): Theme {
  return stored() ?? systemTheme();
}

function apply(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/** Apply the current theme to <html>. Call once at startup (before render). */
export function initTheme(): void {
  apply(currentTheme());
}

/** Persist + apply a chosen theme. */
export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* ignore */
  }
  apply(theme);
}
