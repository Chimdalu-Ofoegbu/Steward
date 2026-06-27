"use client";
import * as React from "react";
import { useFetch } from "@/lib/useFetch";
import { PUBLIC_CONFIG } from "@/lib/config";
import type { TreasuryData } from "@/lib/types";
import { nfCspr, trunc } from "@/lib/format";
import { validatorName, validatorColor } from "@/lib/validators";
import { KpiCard } from "@/components/cards";
import { SampleTag, EmptyState } from "@/components/primitives";

const explorer = PUBLIC_CONFIG.explorer;
const page: React.CSSProperties = { padding: "28px 34px", maxWidth: 1380 };
const card = { background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14 } as React.CSSProperties;
const TCOLS = "minmax(0,1.4fr) 160px 90px 110px minmax(0,1fr)";

// Mandate limits enforced in agent/src/steward/risk.py.
const MANDATE = { maxPerValidatorPct: 40, minValidators: 3, maxSingleMoveCspr: 10000 };

function seed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export default function TreasuryPage() {
  const treasury = useFetch<TreasuryData>("/api/treasury");
  const t = treasury.data;
  const total = t ? t.delegated_cspr + t.liquid_cspr : 0;

  const rows = (t?.delegations ?? []).map((d, i) => ({
    key: d.validator,
    name: validatorName(d.validator),
    amount: d.amount_cspr,
    color: validatorColor(i),
    share: total > 0 ? (d.amount_cspr / total) * 100 : 0,
    sampleUptime: (99.5 + (seed(d.validator) % 49) / 100).toFixed(2) + "%",
    sampleRewards: "+" + nfCspr(d.amount_cspr * 0.009, 0) + " CSPR",
  }));

  const topShare = rows.length ? Math.max(...rows.map((r) => r.share)) : 0;
  const valCount = t?.delegation_count ?? 0;

  const risks = [
    { label: `Max ${MANDATE.maxPerValidatorPct}% to one validator`, statusText: `${topShare.toFixed(1)}% / ${MANDATE.maxPerValidatorPct}%`, frac: topShare / MANDATE.maxPerValidatorPct, ok: topShare <= MANDATE.maxPerValidatorPct, sample: false },
    { label: `Minimum ${MANDATE.minValidators} validators`, statusText: valCount >= MANDATE.minValidators ? `${valCount} / ${MANDATE.minValidators} min` : `${valCount} / ${MANDATE.minValidators} · building`, frac: Math.min(1, valCount / MANDATE.minValidators), ok: valCount >= MANDATE.minValidators, sample: false },
    { label: `Max ${nfCspr(MANDATE.maxSingleMoveCspr, 0)} CSPR / cycle`, statusText: `${nfCspr(MANDATE.maxSingleMoveCspr, 0)} cap`, frac: 0.2, ok: true, sample: false },
    { label: "Validator uptime floor 99%", statusText: "all ≥ 99.5%", frac: 0.86, ok: true, sample: true },
  ];

  return (
    <div style={page}>
      {/* real treasury stats */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 18, marginBottom: 18 }}>
        <KpiCard label="TREASURY TOTAL" value={t ? nfCspr(t.total_cspr, 0) : "—"} sub="CSPR (live)" />
        <KpiCard label="DELEGATED" value={t ? nfCspr(t.delegated_cspr, 0) : "—"} valueColor="var(--accent)" sub={t ? `${t.delegation_count} validator${t.delegation_count === 1 ? "" : "s"}` : ""} />
        <KpiCard label="LIQUID BUFFER" value={t ? nfCspr(t.liquid_cspr, 0) : "—"} sub="unstaked · gas reserve" />
        <KpiCard label="BLOCK HEIGHT" value={t?.block_height ? nfCspr(t.block_height, 0) : "—"} sub="observed" />
      </div>

      {/* allocation breakdown */}
      <section aria-label="Allocation breakdown" className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-3" style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)" }}>
          <span className="eyebrow">Allocation breakdown</span>
          {t?.delegations_source === "journal" && (
            <span
              className="mono"
              style={{ fontSize: 10.5, color: "var(--ink-3)" }}
              title="The live auction snapshot is temporarily unavailable (the public node rejects the full auction set with HTTP 413). These are the agent's real, attested on-chain delegations, sourced from its journal."
            >
              ⛓ from attestation log
            </span>
          )}
        </div>
        {/* desktop header */}
        <div className="hidden md:grid eyebrow items-center" style={{ gridTemplateColumns: TCOLS, gap: 12, padding: "13px 24px", borderBottom: "1px solid var(--border)" }}>
          <div>VALIDATOR</div>
          <div>DELEGATED</div>
          <div>SHARE</div>
          <div className="flex items-center gap-1.5">UPTIME <SampleTag /></div>
          <div className="flex items-center justify-end gap-1.5" style={{ textAlign: "right" }}>REWARDS (30D) <SampleTag /></div>
        </div>

        {treasury.loading && !t ? (
          <div style={{ padding: 18 }}><div className="rounded-lg" style={{ height: 44, background: "var(--inset)", opacity: 0.5 }} /></div>
        ) : rows.length === 0 ? (
          <EmptyState title="No active delegations" body={treasury.error ? `Read error: ${treasury.error}` : "The agent has not delegated yet, or stake is still settling."} />
        ) : (
          rows.map((v) => (
            <div key={v.key}>
              {/* desktop row */}
              <div className="hidden md:grid items-center" style={{ gridTemplateColumns: TCOLS, gap: 12, padding: "16px 24px", borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2.5" style={{ minWidth: 0 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: v.color, flex: "none" }} />
                  <div style={{ minWidth: 0 }}>
                    <div className="truncate" style={{ fontSize: 13.5, color: "var(--ink)" }}>{v.name}</div>
                    <a href={`${explorer}/validator/${v.key}`} target="_blank" rel="noopener noreferrer" className="mono truncate block" style={{ fontSize: 10.5, color: "var(--ink-3)", textDecoration: "none" }}>{trunc(v.key, 10, 6)}</a>
                  </div>
                </div>
                <div className="mono truncate" style={{ fontSize: 12.5, color: "var(--ink)" }}>{nfCspr(v.amount, 0)} CSPR</div>
                <div className="mono" style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{v.share.toFixed(1)}%</div>
                <div className="mono" style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{v.sampleUptime}</div>
                <div className="mono truncate" style={{ fontSize: 12.5, color: "var(--ink-2)", textAlign: "right" }}>{v.sampleRewards}</div>
              </div>
              {/* mobile card */}
              <div className="md:hidden flex flex-col gap-2" style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2.5">
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: v.color, flex: "none" }} />
                  <span className="truncate" style={{ fontSize: 13.5, color: "var(--ink)", flex: 1, minWidth: 0 }}>{v.name}</span>
                  <span className="mono" style={{ fontSize: 12, color: "var(--ink-2)" }}>{v.share.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between mono" style={{ fontSize: 12, color: "var(--ink-2)" }}>
                  <span style={{ color: "var(--ink)" }}>{nfCspr(v.amount, 0)} CSPR</span>
                  <span className="flex items-center gap-1.5">uptime {v.sampleUptime} <SampleTag /></span>
                </div>
              </div>
            </div>
          ))
        )}
        {t && t.liquid_cspr > 0 && (
          <div className="hidden md:grid items-center" style={{ gridTemplateColumns: TCOLS, gap: 12, padding: "16px 24px" }}>
            <div className="flex items-center gap-2.5" style={{ minWidth: 0 }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: "#4a5560", flex: "none" }} />
              <div className="truncate" style={{ fontSize: 13.5, color: "var(--ink-2)" }}>Liquid (unstaked buffer)</div>
            </div>
            <div className="mono" style={{ fontSize: 12.5, color: "var(--ink)" }}>{nfCspr(t.liquid_cspr, 0)} CSPR</div>
            <div className="mono" style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{total > 0 ? ((t.liquid_cspr / total) * 100).toFixed(1) : "0"}%</div>
            <div className="mono" style={{ fontSize: 12.5, color: "var(--ink-3)" }}>—</div>
            <div className="mono" style={{ fontSize: 12.5, color: "var(--ink-3)", textAlign: "right" }}>—</div>
          </div>
        )}
      </section>

      {/* rewards chart + risk limits */}
      <div className="grid" style={{ gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1fr)", gap: 18, marginTop: 18 }}>
        <div style={{ ...card, padding: 24, minWidth: 0 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <span className="eyebrow flex items-center gap-2">Cumulative rewards <SampleTag /></span>
            <span className="mono" style={{ fontSize: 14, color: "var(--ink-3)" }}>+38,420 CSPR</span>
          </div>
          <svg viewBox="0 0 600 180" preserveAspectRatio="none" style={{ width: "100%", height: 180, display: "block", opacity: 0.85 }}>
            <defs>
              <linearGradient id="yg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--accent)" stopOpacity="0.28" />
                <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,152 C60,142 90,136 140,121 C200,104 240,109 300,86 C360,65 410,71 470,49 C520,32 560,29 600,21 L600,180 L0,180 Z" fill="url(#yg)" />
            <path d="M0,152 C60,142 90,136 140,121 C200,104 240,109 300,86 C360,65 410,71 470,49 C520,32 560,29 600,21" fill="none" stroke="var(--accent)" strokeWidth="2" />
          </svg>
          <div className="flex items-center justify-between mono" style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 8 }}>
            <span>30d ago</span>
            <span>illustrative — rewards activate on mainnet</span>
            <span>now</span>
          </div>
        </div>

        <div style={{ ...card, padding: 24, minWidth: 0 }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>Mandate / risk limits</div>
          <div className="flex flex-col" style={{ gap: 16 }}>
            {risks.map((r, i) => {
              const tint = r.sample ? "var(--ink-3)" : r.ok ? "var(--accent)" : "var(--amber)";
              return (
                <div key={i}>
                  <div className="flex justify-between" style={{ fontSize: 12.5, marginBottom: 7 }}>
                    <span className="flex items-center gap-1.5" style={{ color: "var(--ink-2)" }}>{r.label} {r.sample && <SampleTag />}</span>
                    <span className="mono" style={{ color: tint }}>{r.statusText}</span>
                  </div>
                  <div style={{ height: 6, background: "var(--inset)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(100, Math.round(r.frac * 100))}%`, height: "100%", background: tint }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
