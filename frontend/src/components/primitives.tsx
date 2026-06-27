"use client";
import * as React from "react";
import { Copy, Ext, Check, X } from "./icons";
import { trunc } from "@/lib/format";

// ── Copyable mono hash/key/CID chip ──────────────────────────────────────────
export function HashChip({
  value,
  label,
  head = 6,
  tail = 6,
  title,
}: {
  value: string;
  label?: string;
  head?: number;
  tail?: number;
  title?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <button
      onClick={copy}
      title={title || `${value} — click to copy`}
      className="stw-chip mono inline-flex items-center gap-1.5"
      style={{ maxWidth: "100%" }}
    >
      {label && (
        <span style={{ fontSize: 10, letterSpacing: "0.04em", color: "var(--ink-3)" }}>{label}</span>
      )}
      <span className="truncate" style={{ fontSize: 11.5, minWidth: 0 }}>
        {copied ? "copied ✓" : trunc(value, head, tail)}
      </span>
      <span className="flex" style={{ opacity: 0.6, color: copied ? "var(--accent)" : undefined }}>
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </span>
    </button>
  );
}

// ── External-link mono chip (explorer / IPFS) ────────────────────────────────
export function LinkChip({
  value,
  href,
  label,
  head = 6,
  tail = 6,
}: {
  value: string;
  href: string;
  label?: string;
  head?: number;
  tail?: number;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="stw-chip mono inline-flex items-center gap-1.5"
      style={{ maxWidth: "100%", textDecoration: "none" }}
    >
      {label && (
        <span style={{ fontSize: 10, letterSpacing: "0.04em", color: "var(--ink-3)" }}>{label}</span>
      )}
      <span className="truncate" style={{ fontSize: 11.5, minWidth: 0 }}>
        {trunc(value, head, tail)}
      </span>
      <span className="flex" style={{ opacity: 0.6 }}>
        <Ext size={12} />
      </span>
    </a>
  );
}

// ── Verified status chip ─────────────────────────────────────────────────────
export function VerifiedBadge({ verified = true, label }: { verified?: boolean; label?: string }) {
  return (
    <span
      className="mono inline-flex items-center gap-1.5"
      style={{
        height: 22,
        padding: "0 10px",
        borderRadius: 20,
        fontSize: 11,
        color: verified ? "var(--accent)" : "var(--ink-3)",
        background: verified ? "var(--accent-dim)" : "var(--inset)",
        border: `1px solid ${verified ? "var(--accent-line)" : "var(--border)"}`,
      }}
    >
      {verified ? <Check size={12} /> : <X size={12} />}
      {label ?? (verified ? "Verified" : "Unverified")}
    </span>
  );
}

// ── Action-kind pill ─────────────────────────────────────────────────────────
export function KindPill({ kind, tint }: { kind: string; tint: string }) {
  return (
    <span
      className="mono inline-flex items-center justify-center"
      style={{
        height: 22,
        padding: "0 9px",
        borderRadius: 5,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        color: tint,
        background: `color-mix(in srgb, ${tint} 14%, transparent)`,
        whiteSpace: "nowrap",
      }}
    >
      {kind}
    </span>
  );
}

// ── "Sample / illustrative" honesty tag (hybrid data labelling) ──────────────
export function SampleTag({ label = "sample", title }: { label?: string; title?: string }) {
  return (
    <span
      className="mono inline-flex items-center"
      title={title || "Illustrative — not a live on-chain value (not available on testnet)."}
      style={{
        height: 16,
        padding: "0 6px",
        borderRadius: 5,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--amber)",
        background: "var(--amber-dim)",
        border: "1px solid color-mix(in srgb, var(--amber) 28%, transparent)",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

// ── Empty / loading / error states ───────────────────────────────────────────
export function EmptyState({ icon, title, body }: { icon?: React.ReactNode; title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center" style={{ padding: "44px 16px", gap: 10 }}>
      <div
        className="flex items-center justify-center"
        style={{
          width: 44,
          height: 44,
          borderRadius: 11,
          background: "transparent",
          border: "1px dashed var(--border-2)",
          color: "var(--ink-3)",
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 13.5, color: "var(--ink-2)", fontWeight: 600 }}>{title}</div>
      {body && <div style={{ fontSize: 12.5, color: "var(--ink-3)", maxWidth: 380 }}>{body}</div>}
    </div>
  );
}

export function Skeleton({ h = 60 }: { h?: number }) {
  return (
    <div
      className="rounded-xl"
      style={{ height: h, background: "var(--inset)", border: "1px solid var(--border)", opacity: 0.6 }}
    />
  );
}
