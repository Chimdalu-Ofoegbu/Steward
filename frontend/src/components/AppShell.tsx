"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";
import { PUBLIC_CONFIG } from "@/lib/config";
import { trunc } from "@/lib/format";
import {
  ShieldCheck,
  Grid,
  Activity,
  Coins,
  Verify,
  Info,
  Menu,
  X,
  Sun,
  Moon,
} from "./icons";

const NAV = [
  { href: "/", label: "Overview", icon: Grid },
  { href: "/decisions", label: "Decisions", icon: Activity },
  { href: "/treasury", label: "Treasury", icon: Coins },
  { href: "/verifier", label: "Verifier", icon: Verify },
  { href: "/about", label: "About", icon: Info },
];

const PAGE_META: Record<string, { title: string; route: string; subtitle: string }> = {
  "/": { title: "Overview", route: "/", subtitle: "The cockpit — treasury, agent identity, and the latest verified decision." },
  "/decisions": { title: "Decisions", route: "/decisions", subtitle: "Every attestation the agent has committed on-chain, newest first." },
  "/treasury": { title: "Treasury", route: "/treasury", subtitle: "Live allocation across validators, delegated stake, and mandate limits." },
  "/verifier": { title: "Verifier", route: "/verifier", subtitle: "Independently prove the integrity and provenance of any attestation." },
  "/about": { title: "About", route: "/about", subtitle: "What Steward is, how the loop works, and the honesty note on determinism." },
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const { theme, toggle } = useTheme();
  const [drawer, setDrawer] = React.useState(false);
  const meta = PAGE_META[pathname] ?? PAGE_META["/"];

  // Close the drawer whenever the route changes (mobile nav requirement).
  React.useEffect(() => {
    setDrawer(false);
  }, [pathname]);

  const agentKey = PUBLIC_CONFIG.agentPublicKeyHex;

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg)", color: "var(--ink)" }}>
      {/* mobile hamburger — fixed top-left, always reachable */}
      <button
        onClick={() => setDrawer(true)}
        aria-label="Open navigation"
        aria-expanded={drawer}
        className="lg:hidden fixed flex items-center justify-center"
        style={{
          top: 14,
          left: 14,
          zIndex: 50,
          width: 40,
          height: 40,
          borderRadius: 10,
          border: "1px solid var(--border)",
          background: "var(--panel)",
          color: "var(--ink)",
        }}
      >
        <Menu size={20} />
      </button>

      {/* backdrop */}
      {drawer && (
        <div
          onClick={() => setDrawer(false)}
          className="lg:hidden fixed inset-0 animate-stw-fade"
          style={{ zIndex: 40, background: "rgba(3,5,7,0.6)", backdropFilter: "blur(2px)" }}
        />
      )}

      {/* sidebar — off-canvas on mobile, fixed-visible on lg+ */}
      <aside
        aria-label="Primary"
        className={`flex flex-col fixed top-0 bottom-0 left-0 ${
          drawer ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
        style={{
          width: 252,
          background: "var(--panel)",
          borderRight: "1px solid var(--border)",
          zIndex: 45,
          transition: "transform 0.18s ease",
        }}
        data-open={drawer}
      >
        <SidebarInner pathname={pathname} agentKey={agentKey} theme={theme} toggle={toggle} onClose={() => setDrawer(false)} drawer={drawer} />
      </aside>

      {/* main */}
      <main className="flex-1 min-w-0" style={{ marginLeft: 0 }}>
        <div className="lg:ml-[252px]">
          <header
            className="sticky top-0"
            style={{
              zIndex: 20,
              background: "color-mix(in srgb, var(--bg) 86%, transparent)",
              backdropFilter: "blur(12px)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div className="flex items-center justify-between" style={{ padding: "16px 22px 16px", paddingLeft: 64 }}>
              <div style={{ minWidth: 0 }} className="lg:!pl-0">
                <div className="flex items-center gap-2.5">
                  <h1 className="disp" style={{ margin: 0, fontWeight: 600, fontSize: 21, color: "var(--ink)" }}>
                    {meta.title}
                  </h1>
                  <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                    {meta.route}
                  </span>
                </div>
                <p style={{ margin: "3px 0 0", color: "var(--ink-2)", fontSize: 12.5, maxWidth: 560 }}>{meta.subtitle}</p>
              </div>
              <div className="hidden sm:flex items-center gap-2.5" style={{ flex: "none" }}>
                <div
                  className="flex items-center gap-2"
                  style={{ height: 36, padding: "0 12px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--panel)" }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)" }} className="animate-stw-pulse" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>Live</span>
                  <span className="mono" style={{ fontSize: 12, color: "var(--ink-2)", borderLeft: "1px solid var(--border)", paddingLeft: 8 }}>
                    testnet
                  </span>
                </div>
              </div>
            </div>
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}

function SidebarInner({
  pathname,
  agentKey,
  theme,
  toggle,
  onClose,
  drawer,
}: {
  pathname: string;
  agentKey: string;
  theme: string;
  toggle: () => void;
  onClose: () => void;
  drawer: boolean;
}) {
  return (
    <>
      <div className="flex items-center gap-3" style={{ padding: "22px 22px 20px" }}>
        <div
          className="flex items-center justify-center"
          style={{ width: 30, height: 30, borderRadius: 8, background: "var(--accent)", flex: "none", boxShadow: "0 0 18px -2px var(--accent-line)" }}
        >
          <ShieldCheck size={17} strokeWidth={2.4} className="text-[var(--accent-ink)]" />
        </div>
        <div className="disp" style={{ fontWeight: 600, fontSize: 19, letterSpacing: "0.3px", color: "var(--ink)" }}>
          Steward
        </div>
        <span
          className="mono"
          style={{ marginLeft: "auto", fontSize: 9.5, color: "var(--ink-3)", border: "1px solid var(--border)", padding: "2px 5px", borderRadius: 5 }}
        >
          v1.2
        </span>
        <button onClick={onClose} aria-label="Close navigation" className="lg:hidden flex items-center justify-center" style={{ width: 28, height: 28, color: "var(--ink-2)" }}>
          {drawer ? <X size={16} /> : null}
        </button>
      </div>

      <nav className="flex flex-col" style={{ padding: "6px 12px", gap: 2 }} aria-label="Sections">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="flex items-center gap-2.5"
              style={{
                height: 38,
                padding: "0 12px",
                borderRadius: 9,
                fontSize: 13.5,
                fontWeight: active ? 600 : 500,
                textDecoration: "none",
                color: active ? "var(--accent)" : "var(--ink-2)",
                background: active ? "var(--accent-dim)" : "transparent",
                border: `1px solid ${active ? "var(--accent-line)" : "transparent"}`,
              }}
            >
              <span className="flex" style={{ width: 18, height: 18 }}>
                <Icon size={18} />
              </span>
              <span style={{ flex: 1 }}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: "auto", padding: 14 }} className="flex flex-col gap-2.5">
        <div
          className="flex items-center gap-2.5"
          style={{ height: 50, padding: "0 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--inset)" }}
        >
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", flex: "none" }} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="block" style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.3px", textTransform: "uppercase" }}>
              Agent key
            </span>
            <span className="block mono truncate" style={{ fontSize: 12, color: "var(--ink)" }}>
              {trunc(agentKey, 8, 6)}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label="Toggle color theme"
            className="flex items-center justify-center gap-1.5"
            style={{ flex: 1, height: 34, borderRadius: 8, border: "1px solid var(--border)", background: "var(--inset)", color: "var(--ink-2)", fontSize: 12, fontWeight: 500 }}
          >
            {theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}
            {theme === "dark" ? "Dark" : "Light"}
          </button>
          <div
            title="Casper testnet"
            className="flex items-center gap-1.5 mono"
            style={{ height: 34, padding: "0 11px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--inset)", fontSize: 11, color: "var(--ink-2)" }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)" }} />
            testnet
          </div>
        </div>
      </div>
    </>
  );
}
