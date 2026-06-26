"use client";
import * as React from "react";
import { useFetch } from "@/lib/useFetch";
import type { JournalEntry, VerifyResult } from "@/lib/types";
import { trunc, confPct } from "@/lib/format";
import { EmptyState } from "@/components/primitives";
import { ShieldCheck, Check, X, Info, Verify } from "@/components/icons";

const pad = { padding: "20px 22px 28px" };

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
    setTarget(entry ?? null);
    try {
      const params = new URLSearchParams();
      const e = entry ?? entries.find((x) => x.attestation_txn === ident || x.cid === ident || x.decision_hash === ident);
      if (e) {
        params.set("txn", e.attestation_txn);
        params.set("cid", e.cid);
        params.set("hash", e.decision_hash);
        setTarget(e);
      } else {
        // Best-effort: pass the raw identifier in every slot the API checks.
        params.set("txn", ident);
        params.set("cid", ident);
        params.set("hash", ident);
      }
      const r = await fetch(`/api/verify?${params.toString()}`);
      setResult(await r.json());
    } catch (err: any) {
      setResult({ ok: false, steps: [], error: String(err?.message ?? err) });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={pad}>
      <div className="grid gap-4" style={{ gridTemplateColumns: "minmax(0,1fr)", maxWidth: 780, margin: "0 auto" }}>
        {/* input */}
        <section aria-label="Verify attestation" className="panel" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Verify an attestation</div>
          <p style={{ margin: "5px 0 0", fontSize: 12.5, color: "var(--ink-2)" }}>
            Paste a decision_hash, attestation txn, or IPFS CID — or pick a recent record.
          </p>
          <div className="flex gap-2.5 flex-wrap" style={{ marginTop: 14 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="decision_hash / attestation txn / CID"
              aria-label="Attestation identifier"
              className="mono"
              style={{ flex: 1, minWidth: 200, height: 42, padding: "0 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--inset)", color: "var(--ink)", fontSize: 12.5, outline: "none" }}
            />
            <button
              onClick={() => verify(input)}
              disabled={running}
              className="flex items-center gap-1.5"
              style={{ height: 42, padding: "0 18px", borderRadius: 10, border: "1px solid var(--accent-line)", background: "var(--accent)", color: "var(--accent-ink)", fontSize: 13, fontWeight: 600 }}
            >
              <Verify size={14} />
              {running ? "Verifying…" : "Verify"}
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 13 }}>
            <span style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.4px" }}>Recent</span>
            {entries.slice(0, 4).map((e) => (
              <button
                key={e.decision_hash}
                onClick={() => {
                  setInput(e.decision_hash);
                  verify(e.decision_hash, e);
                }}
                className="flex items-center gap-2"
                style={{ height: 30, padding: "0 11px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--inset)", color: "var(--ink-2)", fontSize: 12, fontWeight: 600 }}
              >
                <span className="capitalize">{e.action}</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{trunc(e.decision_hash, 6, 4)}</span>
              </button>
            ))}
            {entries.length === 0 && <span style={{ fontSize: 12, color: "var(--ink-3)" }}>no records yet</span>}
          </div>
        </section>

        {/* steps */}
        <section aria-label="Verification steps" className="panel" style={{ padding: "6px 20px 8px" }}>
          {running ? (
            <div style={{ padding: "28px 12px", textAlign: "center", color: "var(--ink-2)" }}>
              <span className="animate-stw-spin inline-flex" style={{ width: 24, height: 24, border: "2px solid var(--border-2)", borderTopColor: "var(--accent)", borderRadius: "50%" }} />
              <div style={{ marginTop: 12, fontSize: 13 }}>Fetching on-chain transaction and raw IPFS bytes…</div>
            </div>
          ) : result ? (
            <Stepper result={result} target={target} />
          ) : (
            <div style={{ padding: "34px 12px", textAlign: "center" }}>
              <div className="flex items-center justify-center" style={{ width: 44, height: 44, margin: "0 auto", borderRadius: 12, background: "var(--inset)", border: "1px solid var(--border)", color: "var(--ink-3)" }}>
                <ShieldCheck size={20} />
              </div>
              <div style={{ marginTop: 12, fontSize: 13.5, color: "var(--ink-2)" }}>Select an attestation to begin verification.</div>
            </div>
          )}
        </section>

        {/* honesty note */}
        <section style={{ background: "var(--inset)", border: "1px solid var(--amber-dim)", borderLeft: "3px solid var(--amber)", borderRadius: 12, padding: "16px 18px" }}>
          <div className="flex items-center gap-2.5" style={{ color: "var(--amber)", fontWeight: 600, fontSize: 13 }}>
            <Info size={15} />
            On determinism — read this
          </div>
          <p style={{ margin: "9px 0 0", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>
            Steward proves the logged decision is{" "}
            <span style={{ color: "var(--ink)", fontWeight: 600 }}>authentic, unaltered, and was made at the recorded time by the agent&apos;s key</span> — integrity and
            provenance. It does <span style={{ color: "var(--ink)", fontWeight: 600 }}>not</span> claim the language model will reproduce a byte-identical answer if
            re-run; modern models use adaptive sampling. The on-chain record is the canonical, tamper-evident account of what the agent actually decided.
          </p>
        </section>
      </div>
    </div>
  );
}

function Stepper({ result, target }: { result: VerifyResult; target: JournalEntry | null }) {
  const steps = result.steps ?? [];
  return (
    <div style={{ padding: "6px 0" }}>
      {steps.length === 0 && (
        <div style={{ padding: "20px 4px" }}>
          <EmptyState icon={<X size={20} />} title="Verification failed" body={result.error} />
        </div>
      )}
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        const color = s.status === "ok" ? "var(--green)" : s.status === "fail" ? "var(--red)" : "var(--ink-3)";
        return (
          <div key={s.id} className="flex gap-3.5">
            <div className="flex flex-col items-center" style={{ flex: "none" }}>
              <div
                className="flex items-center justify-center"
                style={{ width: 28, height: 28, borderRadius: "50%", border: `1.5px solid ${color}`, color, background: "color-mix(in srgb, currentColor 12%, transparent)" }}
              >
                {s.status === "ok" ? <Check size={15} /> : s.status === "fail" ? <X size={15} /> : i + 1}
              </div>
              {!last && <div style={{ width: 1.5, flex: 1, background: "var(--border-2)", minHeight: 18 }} />}
            </div>
            <div style={{ paddingBottom: 18, minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{s.title}</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 3, lineHeight: 1.5 }}>{s.detail}</div>
            </div>
          </div>
        );
      })}

      {result.ok && (
        <div style={{ margin: "4px 0 16px", padding: 15, borderRadius: 11, background: "var(--green-dim)", border: "1px solid color-mix(in srgb,var(--green) 32%,transparent)" }}>
          <div className="flex items-center gap-2" style={{ color: "var(--green)", fontWeight: 600, fontSize: 14 }}>
            <Check size={16} />
            Authentic · Unaltered · Provenance confirmed
          </div>
          <div className="flex flex-col mono" style={{ marginTop: 11, gap: 7, fontSize: 11.5 }}>
            <HashLine k="computed" v={result.computed_hash ?? "—"} />
            <HashLine k="on-chain" v={result.onchain_hash ?? "—"} />
            {result.agent_key && <HashLine k="agent key" v={result.agent_key} />}
            {result.block_hash && <HashLine k="block" v={result.block_hash} />}
          </div>
          {target && (
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--ink-2)" }}>
              {target.action} · epoch {target.epoch} · conf {confPct(target.confidence)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HashLine({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2" style={{ minWidth: 0 }}>
      <span style={{ color: "var(--ink-3)", width: 84, flex: "none" }}>{k}</span>
      <span style={{ flex: 1, minWidth: 0, color: "var(--ink)", wordBreak: "break-all" }}>{v}</span>
    </div>
  );
}
