"use client";
import * as React from "react";
import { useFetch } from "@/lib/useFetch";
import type { JournalEntry, VerifyResult } from "@/lib/types";
import { relTime } from "@/lib/format";
import { kindTint } from "@/components/icons";

const page: React.CSSProperties = { padding: "28px 34px", maxWidth: 1380 };
const card = { background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14 } as React.CSSProperties;

export default function VerifierPage() {
  const journal = useFetch<{ entries: JournalEntry[] }>("/api/journal");
  const [input, setInput] = React.useState("");
  const [running, setRunning] = React.useState(false);
  const [result, setResult] = React.useState<VerifyResult | null>(null);
  const [target, setTarget] = React.useState<JournalEntry | null>(null);
  const entries = journal.data?.entries ?? [];

  async function verify(idOrInput: string, entry?: JournalEntry) {
    const ident = (idOrInput || "").trim();
    if (!ident && !entry) return;
    setRunning(true);
    setResult(null);
    const e = entry ?? entries.find((x) => x.attestation_txn === ident || x.cid === ident || x.decision_hash === ident);
    setTarget(e ?? null);
    try {
      const p = new URLSearchParams();
      if (e) {
        p.set("txn", e.attestation_txn);
        p.set("cid", e.cid);
        p.set("hash", e.decision_hash);
      } else {
        p.set("txn", ident);
        p.set("cid", ident);
        p.set("hash", ident);
      }
      const r = await fetch(`/api/verify?${p.toString()}`);
      setResult(await r.json());
    } catch (err: any) {
      setResult({ ok: false, steps: [], error: String(err?.message ?? err) });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={page}>
      <div className="grid gap-[18px]" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", alignItems: "start" }}>
        {/* left — pick / paste */}
        <div style={{ ...card, padding: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Verify an attestation</div>
          <p style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 12, lineHeight: 1.5 }}>
            Select a recent attestation, or paste a decision_hash / attestation txn / IPFS CID.
          </p>
          <div className="flex gap-2.5" style={{ marginBottom: 16, flexWrap: "wrap" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && verify(input)}
              placeholder="Paste decision_hash, deploy hash, or CID…"
              aria-label="Attestation identifier"
              className="mono"
              style={{ flex: 1, minWidth: 200, background: "var(--inset)", border: "1px solid var(--border)", borderRadius: 8, padding: "11px 13px", color: "var(--ink)", fontSize: 12, outline: "none" }}
            />
            <button onClick={() => verify(input)} disabled={running} className="stw-btn-accent mono" style={{ padding: "0 18px", borderRadius: 8, fontSize: 12.5, fontWeight: 700 }}>
              {running ? "Verifying…" : "Verify"}
            </button>
          </div>
          <div className="mono" style={{ fontSize: 10.5, letterSpacing: "0.1em", color: "var(--ink-3)", marginBottom: 8 }}>RECENT</div>
          <div className="flex flex-col" style={{ gap: 7 }}>
            {entries.length === 0 && <span style={{ fontSize: 12, color: "var(--ink-3)" }}>no records yet</span>}
            {entries.slice(0, 5).map((d) => (
              <button
                key={d.decision_hash}
                onClick={() => {
                  setInput(d.decision_hash);
                  verify(d.decision_hash, d);
                }}
                className="stw-chip flex items-center gap-2.5 text-left"
                style={{ padding: "10px 12px", borderRadius: 8, minWidth: 0 }}
              >
                <span style={{ width: 7, height: 7, borderRadius: 2, background: kindTint(d.action), flex: "none" }} />
                <span className="truncate" style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: "var(--ink)" }}>{summary(d)}</span>
                <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)", flex: "none" }}>{relTime(d.timestamp)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* right — verification + determinism */}
        <div className="flex flex-col" style={{ gap: 18 }}>
          <div style={{ ...card, padding: 24, minHeight: 230 }}>
            <div className="eyebrow" style={{ marginBottom: 16 }}>Verification</div>
            {running ? (
              <div className="flex flex-col items-center justify-center text-center" style={{ gap: 12, padding: "30px 0", color: "var(--ink-2)" }}>
                <span className="animate-stw-spin inline-flex" style={{ width: 26, height: 26, border: "2px solid var(--border-2)", borderTopColor: "var(--accent)", borderRadius: "50%" }} />
                <div style={{ fontSize: 13 }}>Fetching on-chain txn + raw IPFS bytes…</div>
              </div>
            ) : result ? (
              <Steps result={result} target={target} />
            ) : (
              <div className="flex flex-col items-center justify-center text-center" style={{ gap: 10, padding: "30px 0", color: "var(--ink-3)" }}>
                <div className="flex items-center justify-center" style={{ width: 42, height: 42, border: "1px dashed var(--border-2)", borderRadius: 10, fontSize: 18 }}>⛓</div>
                <div style={{ fontSize: 13 }}>Select an attestation to run integrity + provenance checks.</div>
              </div>
            )}
          </div>

          <div style={{ background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px" }}>
            <div className="mono flex items-center gap-2" style={{ fontSize: 11, letterSpacing: "0.08em", color: "var(--amber)", marginBottom: 8 }}>⚠ DETERMINISM — AN HONEST NOTE</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
              Steward proves a logged decision is <strong style={{ color: "var(--ink)" }}>authentic, unaltered, and was made at time X by the agent</strong> — integrity and provenance. It does <strong style={{ color: "var(--ink)" }}>not</strong> claim the model will reproduce a byte-identical answer if re-run; modern LLMs use adaptive sampling. The attestation guarantees the record, not re-derivation.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Steps({ result, target }: { result: VerifyResult; target: JournalEntry | null }) {
  const steps = result.steps ?? [];
  return (
    <div className="flex flex-col" style={{ gap: 18 }}>
      {steps.length === 0 && <div style={{ fontSize: 13, color: "var(--red)" }}>{result.error || "Verification failed."}</div>}
      {steps.map((s) => (
        <div key={s.id} className="flex gap-3" style={{ alignItems: "flex-start" }}>
          <StepIcon status={s.status} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, color: "var(--ink)" }}>{s.title}</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--ink-2)", marginTop: 3, wordBreak: "break-all" }}>{s.detail}</div>
          </div>
        </div>
      ))}
      {result.ok && (
        <div className="flex items-center gap-2.5" style={{ background: "var(--accent-dim)", border: "1px solid var(--accent-line)", borderRadius: 10, padding: "12px 14px" }}>
          <span style={{ fontSize: 16, color: "var(--accent)" }}>✓</span>
          <div>
            <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>INTEGRITY + PROVENANCE: MATCH</div>
            <div style={{ fontSize: 11.5, color: "var(--ink-2)", marginTop: 2 }}>
              {target ? `${target.action} · epoch ${target.epoch} — ` : ""}authentic, unaltered, and signed by the agent.
            </div>
          </div>
        </div>
      )}
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
    <span className="flex items-center justify-center" style={{ width: 22, height: 22, borderRadius: "50%", flex: "none", fontSize: 12, fontWeight: 700, color: map.color, border: `1px solid ${map.ring}`, background: map.bg }}>
      {map.ch}
    </span>
  );
}

function summary(e: JournalEntry): string {
  const amt = Math.round(e.amount_cspr).toLocaleString("en-US");
  switch (e.action) {
    case "delegate":
      return `Delegated ${amt} CSPR`;
    case "undelegate":
      return `Undelegated ${amt} CSPR`;
    case "redelegate":
      return `Redelegated ${amt} CSPR`;
    case "rebalance":
      return `Rebalanced ${amt} CSPR`;
    default:
      return "Held position";
  }
}
