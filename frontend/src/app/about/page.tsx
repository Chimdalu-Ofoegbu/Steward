"use client";
import * as React from "react";
import { PUBLIC_CONFIG } from "@/lib/config";
import { HashChip, LinkChip } from "@/components/primitives";
import { Activity, Bot, ShieldCheck, Coins, Info, Layers } from "@/components/icons";

const explorer = PUBLIC_CONFIG.explorer;
const pad = { padding: "20px 22px 28px" };

const LOOP = [
  { step: "01", title: "Perceive", body: "Reads live Casper state — balance, validators, the agent's own delegations.", icon: <Activity size={16} /> },
  { step: "02", title: "Decide", body: "Claude proposes one treasury action via a forced, schema-valid tool call.", icon: <Bot size={16} /> },
  { step: "03", title: "Attest", body: "Pins the full reasoning to IPFS and records sha256 + CID on-chain — before acting.", icon: <ShieldCheck size={16} /> },
  { step: "04", title: "Act", body: "Only after attesting does it submit the native-auction staking deploy.", icon: <Coins size={16} /> },
];

const CASPER_FACTS = [
  { title: "Native auction staking", body: "Delegations go through Casper's built-in auction — real validators, real stake.", icon: <Layers size={15} /> },
  { title: "On-chain Journal contract", body: "A purpose-built contract records every decision_hash + IPFS CID, agent-only.", icon: <ShieldCheck size={15} /> },
  { title: "Tamper-evident by design", body: "Anyone can re-hash the pinned bytes and match the on-chain digest.", icon: <Info size={15} /> },
];

export default function AboutPage() {
  return (
    <div style={pad}>
      <div className="flex flex-col" style={{ maxWidth: 840, margin: "0 auto", gap: 16 }}>
        <section className="panel" style={{ padding: "22px 22px 24px" }}>
          <div className="disp" style={{ fontWeight: 600, fontSize: 22, color: "var(--ink)" }}>An autonomous treasury agent you can audit.</div>
          <p style={{ margin: "10px 0 0", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.65, maxWidth: 640 }}>
            Steward manages a CSPR treasury on the Casper Network. Every cycle it perceives chain state, decides on an allocation, attests that decision on-chain,
            and only then acts — so its full reasoning is permanently recorded and independently verifiable.
          </p>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 10, marginTop: 20 }}>
            {LOOP.map((l) => (
              <div key={l.step} className="panel" style={{ background: "var(--inset)", padding: 14, position: "relative" }}>
                <div className="flex items-center justify-center" style={{ width: 30, height: 30, borderRadius: 8, background: "var(--accent-dim)", border: "1px solid var(--accent-line)", color: "var(--accent)" }}>
                  {l.icon}
                </div>
                <div className="mono" style={{ marginTop: 11, fontSize: 10.5, color: "var(--ink-3)" }}>{l.step}</div>
                <div style={{ marginTop: 2, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{l.title}</div>
                <div style={{ marginTop: 4, fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5 }}>{l.body}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px,1fr))" }}>
          <section className="panel" style={{ padding: "18px 20px" }}>
            <div className="eyebrow">Built on Casper</div>
            <div className="flex flex-col" style={{ marginTop: 13, gap: 11 }}>
              {CASPER_FACTS.map((c) => (
                <div key={c.title} className="flex gap-2.5">
                  <span style={{ color: "var(--accent)", flex: "none", marginTop: 1 }}>{c.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{c.title}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5, marginTop: 2 }}>{c.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel" style={{ padding: "18px 20px" }}>
            <div className="eyebrow">On-chain references</div>
            <div className="flex flex-col" style={{ marginTop: 13, gap: 11 }}>
              <RefRow label="Agent public key">
                <HashChip value={PUBLIC_CONFIG.agentPublicKeyHex} head={8} tail={6} />
              </RefRow>
              <RefRow label="Journal contract">
                <LinkChip value={PUBLIC_CONFIG.journalPackageHash} href={`${explorer}/contract-package/${PUBLIC_CONFIG.journalPackageHash}`} head={8} tail={6} />
              </RefRow>
              <RefRow label="Network">
                <span className="mono" style={{ fontSize: 12, color: "var(--ink-2)" }}>casper-test</span>
              </RefRow>
            </div>
          </section>
        </div>

        {/* honesty note */}
        <section style={{ background: "var(--inset)", border: "1px solid var(--amber-dim)", borderLeft: "3px solid var(--amber)", borderRadius: 12, padding: "16px 18px" }}>
          <div className="flex items-center gap-2.5" style={{ color: "var(--amber)", fontWeight: 600, fontSize: 13 }}>
            <Info size={15} />
            The honesty note
          </div>
          <p style={{ margin: "9px 0 0", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>
            Attestation guarantees integrity and provenance — that this exact reasoning was committed by the agent at this exact time. It is not a claim of
            model determinism. We state this plainly because verifiable honesty is the entire point.
          </p>
        </section>
      </div>
    </div>
  );
}

function RefRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2.5">
      <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{label}</span>
      {children}
    </div>
  );
}
