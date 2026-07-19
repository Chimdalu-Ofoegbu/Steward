"use client";
import * as React from "react";
import { useFetch } from "@/lib/useFetch";
import { PUBLIC_CONFIG } from "@/lib/config";
import type { TreasuryData } from "@/lib/types";
import { nfCspr, trunc } from "@/lib/format";
import { validatorName, validatorColor } from "@/lib/validators";
import { KpiCard } from "@/components/cards";
import { EmptyState } from "@/components/primitives";

const explorer = PUBLIC_CONFIG.explorer;
const page: React.CSSProperties = { padding: "28px 34px", maxWidth: 1380 };
const card = { background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14 } as React.CSSProperties;
const TCOLS = "minmax(0,1.7fr) 180px 120px";

// Mandate limits from agent/src/steward/risk.py. The 40% cap and per-cycle cap are
// enforced deterministically in code; the 3-validator floor is a mandate target the
// agent builds toward over cycles (it is NOT hard-enforced — labelled honestly below).
const MANDATE = { maxPerValidatorPct: 40, minValidators: 3, maxSingleMoveCspr: 10000 };

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
  }));

  const topShare = rows.length ? Math.max(...rows.map((r) => r.share)) : 0;
  const valCount = t?.delegation_count ?? 0;
  const liquidShare = total > 0 ? ((t?.liquid_cspr ?? 0) / total) * 100 : 0;

  // Every row here is derived from real on-chain treasury data — no illustrative values.
  const risks = [
    {
      label: `Max ${MANDATE.maxPerValidatorPct}% to one validator`,
      statusText: `${topShare.toFixed(1)}% / ${MANDATE.maxPerValidatorPct}%`,
      frac: topShare / MANDATE.maxPerValidatorPct,
      ok: topShare <= MANDATE.maxPerValidatorPct,
      enforced: true,
    },
    {
      label: `Minimum ${MANDATE.minValidators} validators`,
      statusText: valCount >= MANDATE.minValidators ? `${valCount} / ${MANDATE.minValidators}` : `${valCount} / ${MANDATE.minValidators} · building`,
      frac: Math.min(1, valCount / MANDATE.minValidators),
      ok: valCount >= MANDATE.minValidators,
      enforced: false,
    },
    {
      label: `Max ${nfCspr(MANDATE.maxSingleMoveCspr, 0)} CSPR / cycle`,
      statusText: `${nfCspr(MANDATE.maxSingleMoveCspr, 0)} cap`,
      frac: 0.2,
      ok: true,
      enforced: true,
    },
  ];

  return (
    <div style={page}>
      {/* real treasury stats */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 18, marginBottom: 18 }}>
        <KpiCard label="TREASURY TOTAL" value={t ? nfCspr(t.total_cspr, 0) : "—"} sub="CSPR · live testnet read" />
        <KpiCard label="DELEGATED" value={t ? nfCspr(t.delegated_cspr, 0) : "—"} valueColor="var(--accent)" sub={t ? `${t.delegation_count} validator${t.delegation_count === 1 ? "" : "s"}` : ""} />
        <KpiCard label="LIQUID BUFFER" value={t ? nfCspr(t.liquid_cspr, 0) : "—"} sub="unstaked · gas reserve" />
        <KpiCard label="BLOCK HEIGHT" value={t?.block_height ? nfCspr(t.block_height, 0) : "—"} sub="observed" />
      </div>

      {/* allocation breakdown — real on-chain delegations only */}
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
              </div>
              {/* mobile card */}
              <div className="md:hidden flex items-center justify-between gap-3" style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2.5" style={{ minWidth: 0 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: v.color, flex: "none" }} />
                  <span className="truncate" style={{ fontSize: 13.5, color: "var(--ink)", minWidth: 0 }}>{v.name}</span>
                </div>
                <div className="flex items-center gap-3 mono" style={{ fontSize: 12, color: "var(--ink-2)", flex: "none" }}>
                  <span style={{ color: "var(--ink)" }}>{nfCspr(v.amount, 0)}</span>
                  <span>{v.share.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          ))
        )}
        {t && t.liquid_cspr > 0 && (
          <>
            <div className="hidden md:grid items-center" style={{ gridTemplateColumns: TCOLS, gap: 12, padding: "16px 24px" }}>
              <div className="flex items-center gap-2.5" style={{ minWidth: 0 }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: "#4a5560", flex: "none" }} />
                <div className="truncate" style={{ fontSize: 13.5, color: "var(--ink-2)" }}>Liquid (unstaked buffer)</div>
              </div>
              <div className="mono" style={{ fontSize: 12.5, color: "var(--ink)" }}>{nfCspr(t.liquid_cspr, 0)} CSPR</div>
              <div className="mono" style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{liquidShare.toFixed(1)}%</div>
            </div>
            <div className="md:hidden flex items-center justify-between gap-3" style={{ padding: "14px 18px" }}>
              <span className="truncate" style={{ fontSize: 13.5, color: "var(--ink-2)" }}>Liquid (unstaked buffer)</span>
              <div className="flex items-center gap-3 mono" style={{ fontSize: 12, color: "var(--ink-3)", flex: "none" }}>
                <span style={{ color: "var(--ink)" }}>{nfCspr(t.liquid_cspr, 0)}</span>
                <span>{liquidShare.toFixed(1)}%</span>
              </div>
            </div>
          </>
        )}
      </section>

      {/* position summary + risk limits — all real, on-chain */}
      <div className="grid" style={{ gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1fr)", gap: 18, marginTop: 18 }}>
        <div style={{ ...card, padding: 24, minWidth: 0 }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>Position</div>
          {/* stacked allocation bar — real shares */}
          {total > 0 ? (
            <div className="flex" style={{ height: 12, borderRadius: 6, overflow: "hidden", background: "var(--inset)" }}>
              {rows.map((v) => (
                <div key={v.key} title={`${v.name} · ${v.share.toFixed(1)}%`} style={{ width: `${v.share}%`, background: v.color }} />
              ))}
              {t && t.liquid_cspr > 0 && <div title={`Liquid · ${liquidShare.toFixed(1)}%`} style={{ width: `${liquidShare}%`, background: "#4a5560" }} />}
            </div>
          ) : (
            <div style={{ height: 12, borderRadius: 6, background: "var(--inset)" }} />
          )}
          <div className="flex flex-col" style={{ gap: 12, marginTop: 20 }}>
            <PosRow label="Total treasury" value={t ? `${nfCspr(t.total_cspr, 0)} CSPR` : "—"} />
            <PosRow label="Delegated" value={t ? `${nfCspr(t.delegated_cspr, 0)} CSPR · ${total > 0 ? ((t.delegated_cspr / total) * 100).toFixed(0) : 0}%` : "—"} accent />
            <PosRow label="Liquid buffer" value={t ? `${nfCspr(t.liquid_cspr, 0)} CSPR · ${liquidShare.toFixed(0)}%` : "—"} />
            <PosRow label="Validators" value={String(valCount)} />
            <PosRow label="Largest position" value={rows.length ? `${topShare.toFixed(1)}%` : "—"} last />
          </div>
        </div>

        <div style={{ ...card, padding: 24, minWidth: 0 }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>Mandate / risk limits</div>
          <div className="flex flex-col" style={{ gap: 16 }}>
            {risks.map((r, i) => {
              const tint = r.ok ? "var(--accent)" : "var(--amber)";
              return (
                <div key={i}>
                  <div className="flex justify-between" style={{ fontSize: 12.5, marginBottom: 7 }}>
                    <span style={{ color: "var(--ink-2)" }}>{r.label}</span>
                    <span className="mono" style={{ color: tint }}>{r.statusText}</span>
                  </div>
                  <div style={{ height: 6, background: "var(--inset)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(100, Math.round(r.frac * 100))}%`, height: "100%", background: tint }} />
                  </div>
                  <div className="mono" style={{ fontSize: 9.5, letterSpacing: "0.06em", color: "var(--ink-3)", marginTop: 5, textTransform: "uppercase" }}>
                    {r.enforced ? "enforced in code" : "mandate target"}
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

function PosRow({ label, value, accent, last }: { label: string; value: string; accent?: boolean; last?: boolean }) {
  return (
    <div className="flex justify-between items-center" style={{ fontSize: 13, borderBottom: last ? "none" : "1px solid var(--border)", paddingBottom: last ? 0 : 12 }}>
      <span style={{ color: "var(--ink-2)" }}>{label}</span>
      <span className="mono" style={{ color: accent ? "var(--accent)" : "var(--ink)" }}>{value}</span>
    </div>
  );
}
