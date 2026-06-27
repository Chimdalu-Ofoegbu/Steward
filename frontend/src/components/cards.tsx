"use client";
import * as React from "react";
import { PALETTE } from "@/lib/validators";
import { SampleTag } from "./primitives";

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
        <div className="flex items-center justify-between" style={{ padding: "16px 22px", borderBottom: "1px solid var(--border)" }}>
          <span className="eyebrow">{title}</span>
          {right}
        </div>
      )}
      {label}
      {children}
    </section>
  );
}

// KPI card — mono telemetry number over a tert label, matching the design grid.
export function KpiCard({
  label,
  value,
  valueColor,
  sub,
  sample,
}: {
  label: string;
  value: React.ReactNode;
  valueColor?: string;
  sub?: React.ReactNode;
  sample?: boolean;
}) {
  return (
    <div className="panel" style={{ padding: 22 }}>
      <div className="flex items-center gap-2">
        <span className="mono" style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--ink-3)" }}>
          {label}
        </span>
        {sample && <SampleTag />}
      </div>
      <div className="mono" style={{ fontSize: 24, fontWeight: 700, marginTop: 14, color: valueColor ?? "var(--ink)", lineHeight: 1.05 }}>
        {value}
      </div>
      {sub != null && (
        <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-2)" }}>{sub}</div>
      )}
    </div>
  );
}

interface Slice {
  name: string;
  value: number;
  color: string;
}

// Conic-gradient allocation donut (Claude Design centerpiece). Driven by real slices.
export function AllocationDonut({
  slices,
  centerTop,
  centerSub,
}: {
  slices: Slice[];
  centerTop: string;
  centerSub: string;
}) {
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  let acc = 0;
  const stops = slices.map((s) => {
    const start = (acc / total) * 100;
    acc += s.value;
    const end = (acc / total) * 100;
    return `${s.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
  });
  const gradient = slices.length ? `conic-gradient(${stops.join(",")})` : "var(--inset)";

  return (
    <div className="flex items-center" style={{ gap: 32, flexWrap: "wrap" }}>
      <div
        style={{
          width: 168,
          height: 168,
          borderRadius: "50%",
          flex: "none",
          background: gradient,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          className="flex flex-col items-center justify-center"
          style={{ width: 104, height: 104, borderRadius: "50%", background: "var(--panel)" }}
        >
          <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>{centerTop}</div>
          <div style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{centerSub}</div>
        </div>
      </div>
      <div className="flex flex-col" style={{ flex: 1, minWidth: 200, gap: 12 }}>
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2.5" style={{ minWidth: 0 }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: s.color, flex: "none" }} />
            <span className="truncate" style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--ink)" }}>{s.name}</span>
            <span className="mono" style={{ fontSize: 12, color: "var(--ink-2)", flex: "none" }}>
              {Math.round((s.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export { PALETTE };
