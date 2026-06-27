"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";
import { ScrambleText } from "./ScrambleText";
import { navGlyph, X, Sun, Moon } from "./icons";
import { agoLabel } from "@/lib/format";

const NAV = [
  { href: "/dashboard", view: "dashboard", label: "Dashboard" },
  { href: "/decisions", view: "decisions", label: "Decisions" },
  { href: "/treasury", view: "treasury", label: "Treasury" },
  { href: "/verifier", view: "verifier", label: "Verifier" },
  { href: "/about", view: "about", label: "About" },
];

const PAGE_META: Record<string, { title: string; crumb: string }> = {
  "/dashboard": { title: "Cockpit", crumb: "OVERVIEW" },
  "/decisions": { title: "Decision Journal", crumb: "LIVE FEED" },
  "/treasury": { title: "Treasury", crumb: "ALLOCATION" },
  "/verifier": { title: "Verifier", crumb: "TRUST" },
  "/about": { title: "About Steward", crumb: "DOCS" },
};

function activeHref(pathname: string): string {
  const hit = NAV.find((n) => pathname.startsWith(n.href));
  return hit?.href ?? "/dashboard";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/dashboard";
  const { theme, toggle } = useTheme();
  const [drawer, setDrawer] = React.useState(false);
  const [lastRefresh, setLastRefresh] = React.useState<number>(() => Date.now());
  const [, setTick] = React.useState(0);

  const active = activeHref(pathname);
  const meta = PAGE_META[active] ?? PAGE_META["/dashboard"];

  // Close the drawer whenever the route changes (mobile nav requirement).
  React.useEffect(() => setDrawer(false), [pathname]);

  // Single shell heartbeat: re-poll all readers every 20s (read-only) + tick the
  // "Updated" label each second. The Refresh button fires the same event manually.
  React.useEffect(() => {
    const beat = setInterval(() => {
      window.dispatchEvent(new Event("stw:refresh"));
      setLastRefresh(Date.now());
    }, 20000);
    const tick = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      clearInterval(beat);
      clearInterval(tick);
    };
  }, []);

  const doRefresh = React.useCallback(() => {
    window.dispatchEvent(new Event("stw:refresh"));
    setLastRefresh(Date.now());
  }, []);

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg)", color: "var(--ink)" }}>
      {/* mobile hamburger */}
      <button
        onClick={() => setDrawer(true)}
        aria-label="Open navigation"
        aria-expanded={drawer}
        className="lg:hidden fixed flex flex-col items-center justify-center gap-1"
        style={{ top: 14, left: 14, zIndex: 75, width: 42, height: 42, borderRadius: 10, border: "1px solid var(--border-2)", background: "var(--panel)" }}
      >
        <span style={{ width: 18, height: 2, background: "var(--ink)" }} />
        <span style={{ width: 18, height: 2, background: "var(--ink)" }} />
        <span style={{ width: 18, height: 2, background: "var(--ink)" }} />
      </button>

      {/* backdrop */}
      {drawer && (
        <div onClick={() => setDrawer(false)} className="lg:hidden fixed inset-0" style={{ zIndex: 70, background: "rgba(0,0,0,0.55)" }} />
      )}

      {/* sidebar */}
      <aside
        aria-label="Primary"
        className={`stw-sidebar flex flex-col fixed top-0 bottom-0 left-0 ${drawer ? "is-open" : ""}`}
        style={{ width: 252, background: "var(--panel)", borderRight: "1px solid var(--border)", zIndex: 80 }}
      >
        <Sidebar pathname={active} theme={theme} toggle={toggle} onClose={() => setDrawer(false)} drawer={drawer} />
      </aside>

      {/* main */}
      <main className="flex-1 min-w-0">
        <div className="lg:ml-[252px]">
          <header
            className="sticky top-0"
            style={{ zIndex: 40, background: "color-mix(in srgb, var(--bg) 86%, transparent)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--border)" }}
          >
            <div className="flex items-center justify-between gap-4" style={{ padding: "16px 26px", paddingLeft: 68 }} data-shell-topbar>
              <div style={{ minWidth: 0 }}>
                <div className="mono" style={{ fontSize: 11, letterSpacing: "0.18em", color: "var(--ink-3)" }}>STEWARD / {meta.crumb}</div>
                <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", marginTop: 2, color: "var(--ink)" }}>{meta.title}</div>
              </div>
              <div className="flex items-center gap-2.5" style={{ flex: "none" }}>
                <div className="hidden sm:flex items-center gap-2 mono" style={{ fontSize: 11, color: "var(--ink-2)" }} title="Live read — auto-refreshed">
                  <span className="animate-stw-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)" }} />
                  Updated {agoLabel(lastRefresh)}
                </div>
                <button
                  onClick={doRefresh}
                  title="Re-poll the live chain + journal (read-only). Never fabricates a decision."
                  className="stw-btn-accent mono flex items-center gap-2"
                  style={{ height: 38, padding: "0 15px", borderRadius: 9, fontSize: 12, fontWeight: 700, letterSpacing: "0.03em" }}
                >
                  ▶ Refresh
                </button>
              </div>
            </div>
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}

function Sidebar({
  pathname,
  theme,
  toggle,
  onClose,
  drawer,
}: {
  pathname: string;
  theme: string;
  toggle: () => void;
  onClose: () => void;
  drawer: boolean;
}) {
  return (
    <>
      <div className="flex items-center justify-between" style={{ padding: "22px 22px 18px" }}>
        <Link href="/" className="flex items-center gap-2.5" style={{ textDecoration: "none", color: "var(--ink)" }}>
          <div
            className="mono flex items-center justify-center"
            style={{ width: 24, height: 24, border: "1.5px solid var(--accent)", borderRadius: 6, fontSize: 13, color: "var(--accent)", fontWeight: 700 }}
          >
            S
          </div>
          <span className="mono" style={{ fontSize: 15, letterSpacing: "0.22em", fontWeight: 700 }}>STEWARD</span>
        </Link>
        <button onClick={onClose} aria-label="Close navigation" className="lg:hidden flex items-center justify-center" style={{ width: 28, height: 28, color: "var(--ink-2)" }}>
          {drawer ? <X size={16} /> : null}
        </button>
      </div>

      <nav className="flex flex-col" style={{ padding: "8px 12px", gap: 3, flex: 1 }} aria-label="Sections">
        {NAV.map((n) => {
          const active = pathname === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? "page" : undefined}
              className="stw-navitem flex items-center gap-2.5"
              style={{
                padding: "10px 12px",
                borderRadius: 9,
                textDecoration: "none",
                color: active ? "var(--accent)" : "var(--ink-2)",
                background: active ? "var(--inset)" : "transparent",
                boxShadow: active ? "inset 2px 0 0 var(--accent)" : undefined,
              }}
            >
              <span style={{ width: 16, textAlign: "center", fontSize: 13, opacity: 0.9 }}>{navGlyph[n.view]}</span>
              <ScrambleText text={n.label} className="mono" style={{ fontSize: 12.5, letterSpacing: "0.06em" }} />
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col" style={{ padding: 14, borderTop: "1px solid var(--border)", gap: 10 }}>
        <div className="flex items-center gap-2.5" style={{ background: "var(--inset)", border: "1px solid var(--border)", borderRadius: 9, padding: "10px 12px" }}>
          <span className="animate-stw-pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", flex: "none" }} />
          <div style={{ minWidth: 0 }}>
            <div className="mono" style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--accent)" }}>AGENT LIVE</div>
            <div style={{ fontSize: 11, color: "var(--ink-2)" }}>Autonomous · read-only</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label="Toggle color theme"
            className="stw-btn-ghost flex items-center justify-center"
            style={{ width: 38, height: 38, borderRadius: 9, flex: "none" }}
          >
            {theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}
          </button>
          <div
            className="stw-btn-ghost mono flex items-center gap-2"
            title="Read-only demo — no wallet needed to verify"
            style={{ flex: 1, minWidth: 0, height: 38, padding: "0 11px", borderRadius: 9, fontSize: 11, cursor: "pointer" }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ink-3)", flex: "none" }} />
            <span className="truncate">Connect Wallet</span>
          </div>
        </div>
      </div>
    </>
  );
}
