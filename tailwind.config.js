/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class", // theme flips via a `dark` class on <html>
  theme: {
    extend: {
      colors: {
        // Driven by CSS variables (see src/index.css) so the same class names
        // resolve to the LeetCode light OR dark palette. `<alpha-value>` keeps
        // `/60` opacity utilities working.
        bg: "rgb(var(--bg) / <alpha-value>)", // page background
        surface: "rgb(var(--surface) / <alpha-value>)", // card / panel
        edge: "rgb(var(--edge) / <alpha-value>)", // borders
        edge2: "rgb(var(--edge2) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)", // primary text
        muted: "rgb(var(--muted) / <alpha-value>)", // secondary text
        // Difficulty/brand accents — constant across light & dark (like LeetCode).
        grind: "rgb(var(--grind) / <alpha-value>)", // "Accepted" green (accent)
        gold: "rgb(var(--gold) / <alpha-value>)", // brand orange — streaks / #1
        danger: "rgb(var(--danger) / <alpha-value>)", // "Hard" red — errors
      },
      fontFamily: {
        // LeetCode's system UI stack.
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
        mono: ['ui-monospace', '"SF Mono"', "Menlo", "Monaco", "Consolas", "monospace"],
      },
      keyframes: {
        pop: {
          from: { opacity: "0", transform: "translateY(6px) scale(0.98)" },
          to: { opacity: "1", transform: "none" },
        },
        grow: {
          from: { transform: "scaleY(0)" },
          to: { transform: "scaleY(1)" },
        },
      },
      animation: {
        pop: "pop 0.28s ease-out both",
      },
    },
  },
  plugins: [],
};
