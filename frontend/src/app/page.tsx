"use client";
import * as React from "react";
import Link from "next/link";
import { useFetch } from "@/lib/useFetch";
import { ScrambleText } from "@/components/ScrambleText";
import { Logo } from "@/components/Logo";
import type { TreasuryData, JournalEntry } from "@/lib/types";

const NAV = [
  { label: "Terminal", href: "/dashboard" },
  { label: "Decisions", href: "/decisions" },
  { label: "Treasury", href: "/treasury" },
  { label: "Verifier", href: "/verifier" },
  { label: "About", href: "/about" },
];

function compact(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(Math.round(n));
}

export default function Landing() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const treasury = useFetch<TreasuryData>("/api/treasury");
  const journal = useFetch<{ entries: JournalEntry[] }>("/api/journal");
  const t = treasury.data;
  const decisions = journal.data?.entries.length;

  // ASCII phosphor field — ported from the Claude Design handoff (support.js initAscii).
  React.useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cv = canvasRef.current;
    if (!cv || reduce) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let W = 0, H = 0;
    const fit = () => {
      W = cv.width = window.innerWidth;
      H = cv.height = window.innerHeight;
      ctx.font = '12px "Space Mono", monospace';
      ctx.textBaseline = "top";
    };
    fit();
    window.addEventListener("resize", fit);
    const cell = 17, ramp = " .·:-=+*o░▒▓█";
    const NC = 14, colorCache: string[] = [];
    for (let i = 0; i < NC; i++) colorCache.push("rgba(54,241,160," + (0.1 + (i / (NC - 1)) * 0.66).toFixed(3) + ")");
    let mx = W * 0.68, my = H * 0.42, tmx = mx, tmy = my;
    const onMove = (e: MouseEvent) => {
      const r = cv.getBoundingClientRect();
      tmx = ((e.clientX - r.left) / r.width) * cv.width;
      tmy = ((e.clientY - r.top) / r.height) * cv.height;
    };
    window.addEventListener("mousemove", onMove);
    let raf = 0, last = 0;
    const draw = (ts: number) => {
      raf = requestAnimationFrame(draw);
      if (document.hidden) return;
      if (ts - last < 22) return;
      last = ts;
      mx += (tmx - mx) * 0.32;
      my += (tmy - my) * 0.32;
      ctx.fillStyle = "#070809";
      ctx.fillRect(0, 0, W, H);
      const time = ts * 0.0013;
      const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
      const rl = ramp.length - 1, nc = NC - 1;
      for (let gy = 0; gy < rows; gy++) {
        const py = gy * cell;
        for (let gx = 0; gx < cols; gx++) {
          const px = gx * cell;
          const wave = Math.sin(px * 0.013 + time * 1.8) + Math.cos(py * 0.017 - time * 1.4) + Math.sin((px + py) * 0.009 + time);
          const dx = px - mx, dy = py - my;
          const infl = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 300);
          let v = (wave / 3) * 0.5 + 0.45 + infl * 1.05;
          if (v < 0.16) continue;
          if (v > 1) v = 1;
          const ch = ramp[(v * rl) | 0];
          if (ch === " ") continue;
          ctx.fillStyle = colorCache[(v * nc) | 0];
          ctx.fillText(ch, px, py);
        }
      }
    };
    raf = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  const ticker: React.ReactNode[] = [
    <>TREASURY NAV <b style={{ color: "#fff" }}>{t ? `${compact(t.total_cspr)} CSPR` : "…"}</b></>,
    <>STAKING APR <b style={{ color: "#36F1A0" }}>≈ 11.4%</b> <i style={{ color: "#7d847f", fontStyle: "normal" }}>(sample)</i></>,
    <>VALIDATORS <b style={{ color: "#fff" }}>{t ? t.delegation_count : "…"}</b></>,
    <>DECISIONS ATTESTED <b style={{ color: "#fff" }}>{decisions ?? "…"}</b></>,
    <>NETWORK <b style={{ color: "#fff" }}>casper-test</b></>,
    <>STATUS <b style={{ color: "#36F1A0" }}>AGENT LIVE</b></>,
  ];

  return (
    <div style={{ position: "relative", width: "100vw", height: "100dvh", overflow: "hidden", background: "#080a0c", fontFamily: "'Schibsted Grotesk', sans-serif", color: "#E8ECEA" }}>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1, opacity: 0.92 }} />
      <div style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none", background: "linear-gradient(90deg,rgba(8,10,12,.97) 0%,rgba(8,10,12,.88) 32%,rgba(8,10,12,.5) 64%,rgba(8,10,12,.14) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none", background: "repeating-linear-gradient(0deg,rgba(0,0,0,.16) 0px,rgba(0,0,0,.16) 1px,transparent 1px,transparent 3px)", opacity: 0.35 }} />

      <div style={{ position: "relative", zIndex: 3, height: "100%", display: "flex", flexDirection: "column" }}>
        {/* top bar */}
        <div className="flex items-center justify-between" style={{ padding: "26px clamp(20px,4vw,56px)", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
          <div className="flex items-center gap-3">
            <Logo height={22} style={{ color: "#E8ECEA" }} />
          </div>
          <div className="hidden md:flex" style={{ gap: 32, fontFamily: "'Space Mono',monospace", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8b94a0" }}>
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} style={{ textDecoration: "none" }} className="stw-land-nav">
                <ScrambleText text={n.label} />
              </Link>
            ))}
          </div>
          <div style={{ width: 120 }} className="hidden md:block" />
        </div>

        {/* hero */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(20px,6vw,90px)", gap: "clamp(16px,2.4vh,24px)" }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, letterSpacing: "0.26em", color: "#36F1A0", animation: "stw-intro-up .7s cubic-bezier(.2,.7,.2,1) both", animationDelay: ".05s" }}>// AUTONOMOUS TREASURY AGENT · CASPER NETWORK</div>
          <div style={{ fontWeight: 600, fontSize: "clamp(40px,7vw,82px)", lineHeight: 0.98, letterSpacing: "-0.025em", maxWidth: "18ch", textWrap: "balance", animation: "stw-intro-up .8s cubic-bezier(.2,.7,.2,1) both", animationDelay: ".16s" } as React.CSSProperties}>
            Capital on autopilot.<br />Every move <span style={{ color: "#36F1A0" }}>on the record.</span>
            <span style={{ display: "inline-block", width: "clamp(13px,1.6vw,22px)", height: "clamp(34px,4.6vw,60px)", background: "#36F1A0", marginLeft: 10, transform: "translateY(8px)", animation: "stw-blink 1.1s steps(1) infinite" }} />
          </div>
          <div style={{ fontSize: "clamp(15px,1.7vw,18px)", lineHeight: 1.55, color: "#9aa3a0", maxWidth: "58ch", animation: "stw-intro-up .8s cubic-bezier(.2,.7,.2,1) both", animationDelay: ".28s" }}>
            Steward perceives, decides, and acts on a live Casper treasury — attesting every decision to an on-chain journal anyone can independently verify.
          </div>
          <div className="flex flex-wrap" style={{ gap: 14, marginTop: 8, animation: "stw-intro-up .8s cubic-bezier(.2,.7,.2,1) both", animationDelay: ".4s" }}>
            <Link href="/dashboard" className="stw-btn-accent flex items-center gap-2.5" style={{ padding: "16px 26px", borderRadius: 9, fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 700, letterSpacing: "0.03em", textDecoration: "none" }}>Enter the terminal →</Link>
            <a href="#" className="flex items-center gap-2.5" style={{ border: "1px solid rgba(255,255,255,.16)", color: "#E8ECEA", padding: "16px 26px", borderRadius: 9, fontFamily: "'Space Mono',monospace", fontSize: 14, letterSpacing: "0.03em", textDecoration: "none" }}>▶ Watch demo</a>
          </div>
        </div>

        {/* ticker */}
        <div style={{ height: 48, borderTop: "1px solid rgba(255,255,255,.07)", background: "rgba(0,0,0,.4)", overflow: "hidden", display: "flex", alignItems: "center" }}>
          <div className="flex items-center gap-2" style={{ flex: "none", padding: "0 18px", borderRight: "1px solid rgba(255,255,255,.07)", height: "100%", fontFamily: "'Space Mono',monospace", fontSize: 11, letterSpacing: "0.1em", color: "#36F1A0" }}>
            <span className="animate-stw-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: "#36F1A0" }} />LIVE
          </div>
          <div style={{ overflow: "hidden", flex: 1 }}>
            <div style={{ display: "flex", width: "max-content", animation: "stw-ticker 38s linear infinite", fontFamily: "'Space Mono',monospace", fontSize: 12, color: "#b9c1bd", whiteSpace: "nowrap" }}>
              {[...ticker, ...ticker].map((item, i) => (
                <React.Fragment key={i}>
                  <span style={{ padding: "0 26px" }}>{item}</span>
                  <span style={{ color: "#445" }}>·</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
