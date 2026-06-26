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
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <button
      onClick={copy}
      title={title || `${value} — click to copy`}
      className="inline-flex items-center gap-1.5 h-[26px] px-2.5 rounded-lg border bg-inset text-ink"
      style={{ borderColor: "var(--border)", maxWidth: "100%" }}
    >
      {label && (
        <span className="text-ink-3" style={{ fontSize: 10, letterSpacing: "0.3px" }}>
          {label}
        </span>
      )}
      <span className="mono truncate" style={{ fontSize: 12, minWidth: 0 }}>
        {trunc(value, head, tail)}
      </span>
      <span className="flex" style={{ opacity: 0.55, color: copied ? "var(--green)" : undefined }}>
        {copied ? <Check size={13} /> : <Copy size={13} />}
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
      className="inline-flex items-center gap-1.5 h-[26px] px-2.5 rounded-lg border bg-inset text-ink"
      style={{ borderColor: "var(--border)", maxWidth: "100%", textDecoration: "none" }}
    >
      {label && (
        <span className="text-ink-3" style={{ fontSize: 10, letterSpacing: "0.3px" }}>
          {label}
        </span>
      )}
      <span className="mono truncate" style={{ fontSize: 12, minWidth: 0 }}>
        {trunc(value, head, tail)}
      </span>
      <span className="flex" style={{ opacity: 0.55 }}>
        <Ext size={12} />
      </span>
    </a>
  );
}

// ── Verified / Unverified status chip ────────────────────────────────────────
export function VerifiedBadge({ verified = true, label }: { verified?: boolean; label?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full"
      style={{
        height: 22,
        padding: "0 9px",
        fontSize: 11,
        fontWeight: 600,
        color: verified ? "var(--green)" : "var(--ink-3)",
        background: verified ? "var(--green-dim)" : "var(--inset)",
        border: `1px solid ${verified ? "color-mix(in srgb,var(--green) 30%,transparent)" : "var(--border)"}`,
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
      className="inline-flex items-center justify-center rounded-md"
      style={{
        minWidth: 78,
        height: 22,
        padding: "0 9px",
        fontSize: 11,
        fontWeight: 600,
        textTransform: "capitalize",
        color: tint,
        background: "color-mix(in srgb, currentColor 12%, transparent)",
        border: `1px solid color-mix(in srgb, ${tint} 28%, transparent)`,
      }}
    >
      {kind}
    </span>
  );
}

// ── Empty / loading / error states ───────────────────────────────────────────
export function EmptyState({ icon, title, body }: { icon?: React.ReactNode; title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center" style={{ padding: "44px 16px" }}>
      <div
        className="flex items-center justify-center"
        style={{
          width: 46,
          height: 46,
          borderRadius: 12,
          background: "var(--inset)",
          border: "1px solid var(--border)",
          color: "var(--ink-3)",
        }}
      >
        {icon}
      </div>
      <div style={{ marginTop: 13, fontSize: 14, color: "var(--ink-2)", fontWeight: 600 }}>{title}</div>
      {body && <div style={{ marginTop: 5, fontSize: 12.5, color: "var(--ink-3)", maxWidth: 380 }}>{body}</div>}
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
