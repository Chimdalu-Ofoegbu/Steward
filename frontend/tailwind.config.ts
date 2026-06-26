import type { Config } from "tailwindcss";

// Tokens map to CSS variables defined in globals.css (dark default + [data-theme="light"]),
// so the whole app re-themes from one place — mirroring the design handoff's :root vars.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        panel: "var(--panel)",
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
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 28px -12px rgba(0,0,0,0.6)",
      },
      keyframes: {
        "stw-pulse": {
          "0%": { boxShadow: "0 0 0 0 var(--accent-line)" },
          "70%": { boxShadow: "0 0 0 7px rgba(34,211,238,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(34,211,238,0)" },
        },
        "stw-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "stw-fade": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "stw-spin": { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        "stw-pulse": "stw-pulse 2.4s infinite",
        "stw-up": "stw-up 0.3s ease both",
        "stw-fade": "stw-fade 0.14s ease both",
        "stw-spin": "stw-spin 0.8s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
