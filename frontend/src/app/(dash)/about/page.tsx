"use client";
import * as React from "react";
import { PUBLIC_CONFIG } from "@/lib/config";
import { HashChip, LinkChip } from "@/components/primitives";

const explorer = PUBLIC_CONFIG.explorer;
const REPO = "https://github.com/Chimdalu-Ofoegbu/Steward";
const page: React.CSSProperties = { padding: "28px 34px", maxWidth: 1380 };
const card = { background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14 } as React.CSSProperties;

const STEPS = [
  { n: "01", title: "Perceive", body: "Read auction + account state" },
  { n: "02", title: "Decide", body: "Reason under mandate limits" },
  { n: "03", title: "Attest", body: "Hash → IPFS → Journal contract" },
  { n: "04", title: "Act", body: "Delegate / redelegate on-chain" },
];

export default function AboutPage() {
  return (
    <div style={page}>
      <div className="flex flex-col" style={{ gap: 18, maxWidth: 880 }}>
        {/* hero */}
        <div style={{ ...card, padding: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)" }}>An autonomous treasury agent, made auditable.</div>
          <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6, marginTop: 14 }}>
            Steward runs a continuous loop over a live Casper treasury. Each cycle it observes on-chain state, decides on an allocation move under a fixed mandate, attests the decision to an on-chain journal — <em>before</em> it acts — then acts via native auction staking.
          </p>
          <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 22 }}>
            {STEPS.map((s) => (
              <div key={s.n} style={{ background: "var(--inset)", border: "1px solid var(--border)", borderRadius: 10, padding: 14, textAlign: "center" }}>
                <div className="mono" style={{ fontSize: 11, color: "var(--accent)", letterSpacing: "0.1em" }}>{s.n}</div>
                <div style={{ fontWeight: 600, marginTop: 6, color: "var(--ink)" }}>{s.title}</div>
                <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 6 }}>{s.body}</div>
              </div>
            ))}
          </div>
        </div>

        {/* on casper + determinism */}
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div style={{ ...card, padding: 24 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>On Casper</div>
            <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>
              Native auction staking for delegations and a deployed Journal contract for attestations. All reads are client-side against Casper testnet. The same verifiable-attestation pattern extends directly to compliant RWA tokens — a CEP-18 <span className="mono" style={{ color: "var(--ink)" }}>rwUSD</span> allocation slice is the documented stretch.
            </div>
          </div>
          <div style={{ background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
            <div className="mono flex items-center gap-2" style={{ fontSize: 11, letterSpacing: "0.08em", color: "var(--amber)", marginBottom: 10 }}>⚠ DETERMINISM</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
              We attest integrity and provenance — that the record is authentic and signed by the agent at time X. We do not claim byte-identical re-derivation of the model output. Stated plainly: it is a credibility feature, not a gap.
            </div>
          </div>
        </div>

        {/* references */}
        <div style={{ ...card, padding: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>References</div>
          <div className="flex flex-col" style={{ gap: 10 }}>
            <RefRow label="Journal contract">
              <LinkChip value={PUBLIC_CONFIG.journalPackageHash} href={`${explorer}/contract-package/${PUBLIC_CONFIG.journalPackageHash}`} head={14} tail={10} />
            </RefRow>
            <RefRow label="Agent public key">
              <HashChip value={PUBLIC_CONFIG.agentPublicKeyHex} head={14} tail={10} />
            </RefRow>
            <div className="flex gap-5 mono" style={{ marginTop: 6, fontSize: 12, flexWrap: "wrap" }}>
              <a href={REPO} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>Repository →</a>
              <a href={`${explorer}/account/${PUBLIC_CONFIG.agentPublicKeyHex}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>Casper explorer →</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RefRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span style={{ fontSize: 12, color: "var(--ink-2)", minWidth: 130 }}>{label}</span>
      {children}
    </div>
  );
}
