"use client";
import * as React from "react";
import type { JournalEntry, VerifyResult } from "@/lib/types";
import { PUBLIC_CONFIG } from "@/lib/config";
import { relTime, confPct, nfCspr } from "@/lib/format";
import { HashChip, LinkChip, KindPill } from "./primitives";
import { kindTint, X } from "./icons";
import { validatorName } from "@/lib/validators";

const explorer = PUBLIC_CONFIG.explorer;

// Mandate limits enforced in agent/src/steward/risk.py (real, code-enforced).
const MANDATE = { maxPerValidatorPct: 40, minValidators: 3, maxSingleMoveCspr: 10000 };

export function DecisionDrawer({ entry, onClose }: { entry: JournalEntry; onClose: () => void }) {
  const [payload, setPayload] = React.useState<any>(null);
  const [verify, setVerify] = React.useState<VerifyResult | null>(null);
  const [verifying, setVerifying] = React.useState(false);
  const tint = kindTint(entry.action);
  const pct = Math.round(entry.confidence * 100);

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

  const obs = payload?.observed_state ?? {};
  const observedList: { k: string; v: string }[] = [];
  if (obs.liquid_cspr != null) observedList.push({ k: "Liquid balance", v: `${nfCspr(obs.liquid_cspr, 0)} CSPR` });
  if (obs.delegated_cspr != null) observedList.push({ k: "Delegated", v: `${nfCspr(obs.delegated_cspr, 0)} CSPR` });
  if (obs.delegation_count != null) observedList.push({ k: "Active delegations", v: String(obs.delegation_count) });
  if (obs.block_height) observedList.push({ k: "Observed at block", v: String(obs.block_height) });
  if (Array.isArray(obs.top_validators) && obs.top_validators[0]?.weight_cspr != null)
    observedList.push({ k: "Top validator weight", v: `${nfCspr(obs.top_validators[0].weight_cspr, 0)} CSPR` });

  const riskList = [
    { label: `Max ${MANDATE.maxPerValidatorPct}% to one validator`, detail: "enforced in code" },
    {
      label: `Min ${MANDATE.minValidators} validators (once staked)`,
      detail: obs.delegation_count != null ? `${obs.delegation_count} active` : "building",
    },
    { label: `Max ${nfCspr(MANDATE.maxSingleMoveCspr, 0)} CSPR / cycle`, detail: `${nfCspr(entry.amount_cspr, 0)} this move` },
  ];

  return (
    <div className="fixed inset-0 flex justify-end" style={{ zIndex: 90 }}>
      <div onClick={onClose} className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Decision detail"
        className="relative animate-stw-drawer"
        style={{
          width: "min(560px, 100vw)",
          height: "100%",
          background: "var(--panel)",
          borderLeft: "1px solid var(--border-2)",
          overflowY: "auto",
          boxShadow: "-20px 0 60px var(--shadow)",
        }}
      >
        {/* sticky header */}
        <div
          className="sticky top-0 flex items-center justify-between"
          style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)", padding: "18px 22px", zIndex: 2 }}
        >
          <div className="flex items-center gap-2.5" style={{ minWidth: 0 }}>
            <KindPill kind={entry.action} tint={tint} />
            <span className="mono" style={{ fontSize: 12, color: "var(--ink-2)" }}>{relTime(entry.timestamp)} · epoch {entry.epoch}</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="stw-btn-ghost flex items-center justify-center"
            style={{ width: 32, height: 32, borderRadius: 8, flex: "none" }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 22 }}>
          <div style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.3, letterSpacing: "-0.01em", color: "var(--ink)" }}>{summarize(entry)}</div>

          {/* confidence */}
          <div className="flex items-center gap-2.5" style={{ marginTop: 14 }}>
            <div style={{ flex: 1, height: 5, background: "var(--inset)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)" }} />
            </div>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-2)" }}>confidence {confPct(entry.confidence)}</span>
          </div>

          {/* observed state */}
          {observedList.length > 0 && (
            <>
              <SectionLabel>Observed state</SectionLabel>
              <div className="flex flex-col" style={{ gap: 7 }}>
                {observedList.map((o, i) => (
                  <div key={i} className="flex justify-between gap-3" style={{ fontSize: 12.5, borderBottom: "1px solid var(--border)", paddingBottom: 7 }}>
                    <span style={{ color: "var(--ink-2)" }}>{o.k}</span>
                    <span className="mono truncate" style={{ color: "var(--ink)", textAlign: "right", minWidth: 0 }}>{o.v}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* reasoning */}
          <SectionLabel>Reasoning</SectionLabel>
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6 }}>{payload?.decision?.rationale || entry.rationale}</p>

          {/* risk checks */}
          <SectionLabel>Risk-limit checks</SectionLabel>
          <div className="flex flex-col" style={{ gap: 8 }}>
            {riskList.map((r, i) => (
              <div key={i} className="flex items-center gap-2.5" style={{ fontSize: 12.5 }}>
                <span style={{ color: "var(--accent)" }}>✓</span>
                <span style={{ flex: 1, color: "var(--ink)" }}>{r.label}</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--ink-2)" }}>{r.detail}</span>
              </div>
            ))}
          </div>

          {/* on-chain facts */}
          <SectionLabel>On-chain facts</SectionLabel>
          <div className="flex flex-col" style={{ gap: 9 }}>
            <FactCol label="decision_hash">
              <HashChip value={entry.decision_hash} head={14} tail={10} />
            </FactCol>
            <FactCol label="ipfs_cid">
              <HashChip value={entry.cid} head={14} tail={10} />
            </FactCol>
            <div className="flex gap-2.5" style={{ flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                <FactCol label="attestation txn">
                  <LinkChip value={entry.attestation_txn} href={`${explorer}/transaction/${entry.attestation_txn}`} head={10} tail={8} />
                </FactCol>
              </div>
              <div style={{ width: 96 }}>
                <FactCol label="epoch">
                  <span className="mono stw-chip" style={{ display: "inline-block", fontSize: 11.5 }}>{entry.epoch}</span>
                </FactCol>
              </div>
            </div>
            {entry.staking_txn && (
              <FactCol label="staking txn">
                <LinkChip value={entry.staking_txn} href={`${explorer}/transaction/${entry.staking_txn}`} head={10} tail={8} />
              </FactCol>
            )}
          </div>

          {/* verify */}
          <button
            onClick={runVerify}
            disabled={verifying}
            className="stw-btn-accent mono flex items-center justify-center gap-2"
            style={{ marginTop: 20, width: "100%", padding: 13, borderRadius: 9, fontSize: 13, fontWeight: 700, letterSpacing: "0.03em" }}
          >
            ⛓ {verifying ? "Verifying…" : verify ? "Re-verify integrity" : "Verify on-chain integrity"}
          </button>

          {verify && (
            <div style={{ marginTop: 16, background: "var(--inset)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
              <div className="flex flex-col" style={{ gap: 12 }}>
                {(verify.steps ?? []).map((s) => (
                  <div key={s.id} className="flex gap-2.5" style={{ alignItems: "flex-start" }}>
                    <StepIcon status={s.status} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, color: "var(--ink)" }}>{s.title}</div>
                      <div className="mono truncate" style={{ fontSize: 10.5, color: "var(--ink-2)", marginTop: 2 }}>{s.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
              {verify.ok ? (
                <div className="flex items-center gap-2.5" style={{ marginTop: 13, background: "var(--accent-dim)", border: "1px solid var(--accent-line)", borderRadius: 9, padding: "11px 13px" }}>
                  <span style={{ fontSize: 15, color: "var(--accent)" }}>✓</span>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>MATCH — integrity + provenance verified</span>
                </div>
              ) : (
                verify.error && (
                  <div style={{ marginTop: 13, fontSize: 12, color: "var(--red)" }}>{verify.error}</div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mono" style={{ fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", margin: "22px 0 10px" }}>
      {children}
    </div>
  );
}

function FactCol({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col" style={{ gap: 5, minWidth: 0 }}>
      <span style={{ fontSize: 11, color: "var(--ink-2)" }}>{label}</span>
      {children}
    </div>
  );
}

function StepIcon({ status }: { status: "ok" | "fail" | "pending" }) {
  const map = {
    ok: { ch: "✓", color: "var(--accent-ink)", ring: "var(--accent)", bg: "var(--accent)" },
    fail: { ch: "✕", color: "#fff", ring: "var(--red)", bg: "var(--red)" },
    pending: { ch: "○", color: "var(--ink-3)", ring: "var(--border-2)", bg: "transparent" },
  }[status];
  return (
    <span
      className="flex items-center justify-center"
      style={{ width: 20, height: 20, borderRadius: "50%", flex: "none", fontSize: 11, fontWeight: 700, color: map.color, border: `1px solid ${map.ring}`, background: map.bg }}
    >
      {map.ch}
    </span>
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
