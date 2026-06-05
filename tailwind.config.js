/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Grindset-terminal palette
        surface: "#0d1117",
        edge: "#21262d",
        edge2: "#30363d",
        ink: "#e6edf3",
        muted: "#8b949e",
        grind: "#39d353", // accent green
        gold: "#f0a500", // streaks / #1
        danger: "#ff7b72", // errors
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
        sans: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
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
