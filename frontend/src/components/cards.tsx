"use client";
import * as React from "react";
import { PALETTE } from "@/lib/validators";

export function Section({
  title,
  right,
  children,
  label,
  className,
}: {
  title?: string;
  label?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section aria-label={title} className={`panel overflow-hidden ${className ?? ""}`}>
      {(title || right) && (
        <div className="flex items-center justify-between" style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
          <span className="eyebrow">{title}</span>
          {right}
        </div>
      )}
      {label}
      {children}
    </section>
  );
}

export function KpiCard({
  icon,
  tint,
  label,
  value,
  sub,
  subTint,
  sub2,
}: {
  icon: React.ReactNode;
  tint: string;
  label: string;
  value: string;
  sub?: string;
  subTint?: string;
  sub2?: string;
}) {
  return (
    <div className="panel" style={{ position: "relative", padding: "16px 17px", overflow: "hidden" }}>
      <div className="flex items-center gap-1.5" style={{ color: "var(--ink-2)" }}>
        <span className="flex" style={{ color: tint }}>
          {icon}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>{label}</span>
      </div>
      <div className="disp" style={{ marginTop: 11, fontWeight: 600, fontSize: 26, lineHeight: 1.05, color: "var(--ink)" }}>
        {value}
      </div>
      <div className="flex items-center gap-1.5" style={{ marginTop: 5 }}>
        {sub && <span style={{ fontSize: 11.5, color: subTint ?? "var(--ink-2)", fontWeight: 500 }}>{sub}</span>}
        {sub2 && <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{sub2}</span>}
      </div>
    </div>
  );
}

interface Slice {
  name: string;
  value: number;
  color: string;
}

// SVG donut for validator allocation. Computes stroke-dasharray arcs.
export function AllocationDonut({ slices, centerLabel, centerSub }: { slices: Slice[]; centerLabel: string; centerSub: string }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  let offset = 0;
  const arcs = slices.map((s) => {
    const frac = s.value / total;
    const dash = frac * c;
    const arc = { dash, gap: c - dash, off: -offset };
    offset += dash;
    return { ...s, ...arc };
  });
  return (
    <div className="flex items-center" style={{ gap: 18 }}>
      <div style={{ position: "relative", width: 128, height: 128, flex: "none" }}>
        <svg width="128" height="128" viewBox="0 0 128 128" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="64" cy="64" r={r} fill="none" stroke="var(--inset)" strokeWidth="14" />
          {arcs.map((a, i) => (
            <circle
              key={i}
              cx="64"
              cy="64"
              r={r}
              fill="none"
              stroke={a.color}
              strokeWidth="14"
              strokeDasharray={`${a.dash} ${a.gap}`}
              strokeDashoffset={a.off}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        <div className="flex flex-col items-center justify-center" style={{ position: "absolute", inset: 0 }}>
          <span className="disp" style={{ fontWeight: 600, fontSize: 19, color: "var(--ink)", lineHeight: 1 }}>
            {centerLabel}
          </span>
          <span style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.3px", textTransform: "uppercase" }}>{centerSub}</span>
        </div>
      </div>
      <div className="flex flex-col" style={{ flex: 1, minWidth: 0, gap: 7 }}>
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2" style={{ minWidth: 0 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color, flex: "none" }} />
            <span className="truncate" style={{ flex: 1, minWidth: 0, fontSize: 12, color: "var(--ink-2)" }}>
              {s.name}
            </span>
            <span className="mono" style={{ fontSize: 12, color: "var(--ink)", fontWeight: 500 }}>
              {Math.round((s.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export { PALETTE };
