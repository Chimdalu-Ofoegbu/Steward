"use client";
import * as React from "react";
import type { JournalEntry, VerifyResult } from "@/lib/types";
import { PUBLIC_CONFIG } from "@/lib/config";
import { absTime, confPct, titleCase, nfCspr } from "@/lib/format";
import { HashChip, LinkChip, KindPill, VerifiedBadge } from "./primitives";
import { kindIcon, kindTint, X, Check, Verify as VerifyIcon } from "./icons";
import { validatorName } from "@/lib/validators";

const explorer = PUBLIC_CONFIG.explorer;

export function DecisionDrawer({ entry, onClose }: { entry: JournalEntry; onClose: () => void }) {
  const [payload, setPayload] = React.useState<any>(null);
  const [verify, setVerify] = React.useState<VerifyResult | null>(null);
  const [verifying, setVerifying] = React.useState(false);
  const tint = kindTint(entry.action);
  const KindIcon = kindIcon[entry.action] ?? kindIcon.hold;

  React.useEffect(() => {
    let alive = true;
    fetch(`/api/payload?cid=${entry.cid}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setPayload(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [entry.cid]);

  const runVerify = async () => {
    setVerifying(true);
    setVerify(null);
    try {
      const r = await fetch(`/api/verify?txn=${entry.attestation_txn}&cid=${entry.cid}&hash=${entry.decision_hash}`);
      setVerify(await r.json());
    } catch (e: any) {
      setVerify({ ok: false, steps: [], error: String(e?.message ?? e) });
    } finally {
      setVerifying(false);
    }
  };

  const decision = payload?.decision ?? {};
  const observed = payload?.observed_state ?? {};
  const observedBullets: string[] = [];
  if (observed.delegation_count != null) observedBullets.push(`Delegations at decision time: ${observed.delegation_count}`);
  if (observed.block_height) observedBullets.push(`Observed at block ${observed.block_height}`);
  if (Array.isArray(observed.top_validators) && observed.top_validators[0])
    observedBullets.push(
      `Top validator by weight: ${nfCspr(observed.top_validators[0].weight_cspr ?? 0, 0)} CSPR staked`,
    );

  return (
    <div className="fixed inset-0 flex justify-end" style={{ zIndex: 60 }}>
      <div onClick={onClose} className="absolute inset-0 animate-stw-fade" style={{ background: "rgba(3,5,7,0.62)", backdropFilter: "blur(2px)" }} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Decision detail"
        className="relative panel animate-stw-fade"
        style={{ width: "min(520px, 100%)", height: "100%", borderRadius: 0, overflowY: "auto", boxShadow: "-20px 0 60px -20px rgba(0,0,0,0.7)" }}
      >
        <div
          className="sticky top-0 flex items-start gap-3"
          style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)", padding: "16px 20px", zIndex: 2 }}
        >
          <div
            className="flex items-center justify-center"
            style={{ width: 38, height: 38, borderRadius: 10, flex: "none", color: tint, background: "color-mix(in srgb, currentColor 12%, transparent)", border: `1px solid color-mix(in srgb, ${tint} 28%, transparent)` }}
          >
            <KindIcon size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="disp" style={{ fontWeight: 600, fontSize: 17, color: "var(--ink)" }}>
                {titleCase(entry.action)}
              </span>
              <VerifiedBadge verified />
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 3 }}>
              {absTime(entry.timestamp)} · epoch {entry.epoch} · conf {confPct(entry.confidence)}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "var(--inset)", color: "var(--ink-2)", flex: "none" }}>
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col" style={{ padding: "18px 20px 28px", gap: 18 }}>
          <p style={{ margin: 0, fontSize: 15.5, color: "var(--ink)", lineHeight: 1.5, fontWeight: 500 }}>
            {summarize(entry)}
          </p>

          {/* on-chain facts */}
          <div style={{ background: "var(--inset)", border: "1px solid var(--border)", borderRadius: 11, overflow: "hidden" }}>
            <div className="eyebrow" style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
              On-chain facts
            </div>
            <Fact label="epoch" value={String(entry.epoch)} mono />
            <Fact label="decision_hash" value={entry.decision_hash} copy />
            <Fact label="ipfs_cid" value={entry.cid} copy />
            <Fact label="attestation" value={entry.attestation_txn} href={`${explorer}/transaction/${entry.attestation_txn}`} />
            {entry.staking_txn && (
              <Fact label="staking" value={entry.staking_txn} href={`${explorer}/transaction/${entry.staking_txn}`} last />
            )}
          </div>

          {/* observed state */}
          {observedBullets.length > 0 && (
            <div>
              <div className="eyebrow" style={{ marginBottom: 9 }}>
                Observed state
              </div>
              <div className="flex flex-col" style={{ gap: 7 }}>
                {observedBullets.map((o, i) => (
                  <div key={i} className="flex" style={{ gap: 9, alignItems: "baseline" }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--ink-3)", flex: "none", transform: "translateY(6px)" }} />
                    <span style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>{o}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* reasoning */}
          <div>
            <div className="eyebrow" style={{ marginBottom: 9 }}>
              Reasoning
            </div>
            <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink)", lineHeight: 1.65 }}>{decision.rationale || entry.rationale}</p>
          </div>

          {/* verify */}
          <div style={{ background: "var(--inset)", border: "1px solid var(--border)", borderRadius: 11, padding: 14 }}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Integrity check</div>
                <div style={{ fontSize: 11.5, color: "var(--ink-2)", marginTop: 2 }}>
                  Re-hash the raw pinned bytes and compare to the on-chain hash.
                </div>
              </div>
              <button
                onClick={runVerify}
                disabled={verifying}
                className="flex items-center gap-1.5"
                style={{ height: 34, padding: "0 14px", borderRadius: 9, border: "1px solid var(--accent-line)", background: "var(--accent-dim)", color: "var(--accent)", fontSize: 12.5, fontWeight: 600 }}
              >
                <VerifyIcon size={14} />
                {verifying ? "Verifying…" : verify ? "Re-verify" : "Verify"}
              </button>
            </div>
            {verify && (
              <div className="flex flex-col mono" style={{ marginTop: 12, gap: 8, fontSize: 11.5 }}>
                <Row k="computed" v={verify.computed_hash ?? "—"} />
                <Row k="on-chain" v={verify.onchain_hash ?? "—"} />
                <div className="flex items-center gap-2" style={{ marginTop: 2, color: verify.ok ? "var(--green)" : "var(--red)", fontWeight: 600 }}>
                  <Check size={14} />
                  {verify.ok ? "MATCH — payload is authentic & unaltered" : verify.error || "No match"}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2" style={{ minWidth: 0 }}>
      <span style={{ color: "var(--ink-3)", width: 84, flex: "none" }}>{k}</span>
      <span className="truncate" style={{ flex: 1, minWidth: 0, color: "var(--ink)" }}>
        {v}
      </span>
    </div>
  );
}

function Fact({ label, value, copy, href, mono, last }: { label: string; value: string; copy?: boolean; href?: string; mono?: boolean; last?: boolean }) {
  return (
    <div className="flex items-center gap-2.5" style={{ padding: "9px 14px", borderBottom: last ? undefined : "1px solid var(--border)" }}>
      <span style={{ width: 104, flex: "none", fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.3px" }}>{label}</span>
      <span className="truncate" style={{ flex: 1, minWidth: 0, fontFamily: mono || !copy ? "var(--font-mono)" : undefined, fontSize: 12.5, color: "var(--ink)" }}>
        {value}
      </span>
      <span style={{ flex: "none" }}>
        {href ? <LinkChip value={value} href={href} head={5} tail={4} /> : copy ? <HashChip value={value} head={5} tail={4} /> : null}
      </span>
    </div>
  );
}

export function summarize(e: JournalEntry): string {
  const amt = nfCspr(e.amount_cspr, 0);
  const v = e.validator ? validatorName(e.validator) : "";
  switch (e.action) {
    case "delegate":
      return `Delegated ${amt} CSPR to ${v}`;
    case "undelegate":
      return `Undelegated ${amt} CSPR from ${v}`;
    case "redelegate":
      return `Redelegated ${amt} CSPR → ${v}`;
    case "rebalance":
      return `Rebalanced ${amt} CSPR across validators`;
    default:
      return "Held position — no action this cycle";
  }
}

export { KindPill };
