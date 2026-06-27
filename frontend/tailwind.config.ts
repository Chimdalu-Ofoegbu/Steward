import type { Config } from "tailwindcss";

// Tokens map to CSS variables defined in globals.css (dark default + [data-theme="light"]),
// so the whole app re-themes from one place — mirroring the Claude Design handoff's tokens.
// Keyframes/animations live in globals.css (single source for both class + inline usage).
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        panel: "var(--panel)",
        "panel-2": "var(--panel-2)",
        inset: "var(--inset)",
        raise: "var(--raise)",
        border: "var(--border)",
        "border-2": "var(--border-2)",
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        "ink-3": "var(--ink-3)",
        accent: "var(--accent)",
        "accent-ink": "var(--accent-ink)",
        "accent-dim": "var(--accent-dim)",
        "accent-line": "var(--accent-line)",
        green: "var(--green)",
        "green-dim": "var(--green-dim)",
        amber: "var(--amber)",
        "amber-dim": "var(--amber-dim)",
        red: "var(--red)",
        "red-dim": "var(--red-dim)",
        cyan: "var(--cyan)",
        "cyan-dim": "var(--cyan-dim)",
        violet: "var(--violet)",
        "violet-dim": "var(--violet-dim)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
