"use client";
import * as React from "react";
import { useFetch } from "@/lib/useFetch";
import { PUBLIC_CONFIG } from "@/lib/config";
import type { TreasuryData } from "@/lib/types";
import { nfCspr, trunc } from "@/lib/format";
import { validatorName, validatorColor } from "@/lib/validators";
import { EmptyState } from "@/components/primitives";
import { Check, Info } from "@/components/icons";

const explorer = PUBLIC_CONFIG.explorer;
const pad = { padding: "20px 22px 28px" };

// The agent's mandate limits (strategy.md v1): max single move, per-validator cap, min validators.
const MANDATE = {
  maxPerValidatorPct: 40,
  minValidators: 3,
  maxSingleMoveCspr: 10000,
};

export default function TreasuryPage() {
  const treasury = useFetch<TreasuryData>("/api/treasury", 20000);
  const t = treasury.data;

  const total = t ? t.delegated_cspr + t.liquid_cspr : 0;
  const rows = (t?.delegations ?? []).map((d, i) => ({
    key: d.validator,
    name: validatorName(d.validator),
    amount: d.amount_cspr,
    color: validatorColor(i),
    share: total > 0 ? (d.amount_cspr / total) * 100 : 0,
  }));

  // Risk gauges computed from live state.
  const topShare = t && total > 0 ? Math.max(0, ...(t.delegations.map((d) => (d.amount_cspr / total) * 100) || [0])) : 0;
  const valCount = t?.delegation_count ?? 0;

  const gauges = [
    {
      title: "Concentration cap",
      sub: `Max ${MANDATE.maxPerValidatorPct}% of treasury to one validator`,
      cur: topShare,
      limit: MANDATE.maxPerValidatorPct,
      curLabel: `${topShare.toFixed(1)}%`,
      limLabel: `limit ${MANDATE.maxPerValidatorPct}%`,
      ok: topShare <= MANDATE.maxPerValidatorPct,
    },
    {
      title: "Validator diversity",
      sub: `Min ${MANDATE.minValidators} validators once meaningfully staked`,
      cur: valCount,
      limit: MANDATE.minValidators,
      curLabel: `${valCount}`,
      limLabel: `min ${MANDATE.minValidators}`,
      ok: valCount >= MANDATE.minValidators,
      note: valCount < MANDATE.minValidators ? "building" : undefined,
    },
    {
      title: "Single-move cap",
      sub: "Max CSPR moved per cycle",
      cur: 0,
      limit: MANDATE.maxSingleMoveCspr,
      curLabel: `${nfCspr(MANDATE.maxSingleMoveCspr, 0)}`,
      limLabel: "per cycle",
      ok: true,
    },
  ];

  return (
    <div style={pad}>
      <div className="grid gap-4" style={{ gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1fr)" }}>
        {/* allocation table */}
        <section aria-label="Allocation" className="panel overflow-hidden">
          <div className="eyebrow" style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
            Allocation by validator
          </div>
          <div className="hidden sm:flex items-center gap-3.5 eyebrow" style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)" }}>
            <span style={{ flex: 1, minWidth: 0 }}>Validator</span>
            <span style={{ width: 128, flex: "none", textAlign: "right" }}>Delegated</span>
            <span style={{ width: 150, flex: "none" }}>Share</span>
          </div>
          {treasury.loading && !t ? (
            <div style={{ padding: 18 }} className="flex flex-col gap-2">
              <div className="rounded-lg" style={{ height: 44, background: "var(--inset)", opacity: 0.5 }} />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState title="No active delegations" body={treasury.error ? `Read error: ${treasury.error}` : "The agent has not delegated yet, or stake is still settling."} />
          ) : (
            rows.map((v) => (
              <div key={v.key} className="flex items-center gap-3.5" style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
                <div className="flex items-center gap-2.5" style={{ flex: "1 1 150px", minWidth: 120 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: v.color, flex: "none" }} />
                  <div style={{ minWidth: 0 }}>
                    <div className="truncate" style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>{v.name}</div>
                    <a className="mono" href={`${explorer}/validator/${v.key}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--ink-3)", textDecoration: "none" }}>
                      {trunc(v.key, 8, 6)}
                    </a>
                  </div>
                </div>
                <span className="mono" style={{ width: 128, flex: "none", textAlign: "right", fontSize: 12.5, color: "var(--ink)" }}>{nfCspr(v.amount, 0)}</span>
                <div className="flex items-center gap-2.5" style={{ width: 150, flex: "none" }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--inset)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(100, v.share)}%`, background: v.color, borderRadius: 3 }} />
                  </div>
                  <span className="mono" style={{ fontSize: 12, color: "var(--ink-2)", width: 42, textAlign: "right" }}>{v.share.toFixed(1)}%</span>
                </div>
              </div>
            ))
          )}
          {t && t.liquid_cspr > 0 && (
            <div className="flex items-center gap-3.5" style={{ padding: "14px 18px" }}>
              <div className="flex items-center gap-2.5" style={{ flex: "1 1 150px", minWidth: 120 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: "var(--ink-3)", flex: "none" }} />
                <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink-2)" }}>Liquid (unstaked buffer)</div>
              </div>
              <span className="mono" style={{ width: 128, flex: "none", textAlign: "right", fontSize: 12.5, color: "var(--ink)" }}>{nfCspr(t.liquid_cspr, 0)}</span>
              <div style={{ width: 150, flex: "none" }} />
            </div>
          )}
        </section>

        {/* yield panel — honest testnet label */}
        <section aria-label="Yield" className="panel flex flex-col" style={{ padding: "16px 18px" }}>
          <div className="eyebrow">Cumulative rewards</div>
          <div className="disp" style={{ marginTop: 6, fontWeight: 600, fontSize: 24, color: "var(--ink)" }}>n/a</div>
          <div className="flex items-center gap-2" style={{ marginTop: 14, padding: 14, borderRadius: 11, background: "var(--inset)", border: "1px solid var(--border)" }}>
            <span style={{ color: "var(--amber)", flex: "none" }}><Info size={16} /></span>
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
              Staking rewards are not tracked on Casper testnet. The agent's yield strategy is real; reward accounting activates on mainnet.
            </p>
          </div>
          <div className="flex flex-col" style={{ marginTop: 14, gap: 9 }}>
            <StatRow label="Total delegated" value={t ? `${nfCspr(t.delegated_cspr, 0)} CSPR` : "—"} />
            <StatRow label="Liquid buffer" value={t ? `${nfCspr(t.liquid_cspr, 0)} CSPR` : "—"} />
            <StatRow label="Treasury total" value={t ? `${nfCspr(t.total_cspr, 0)} CSPR` : "—"} />
            <StatRow label="Block height" value={t?.block_height ? String(t.block_height) : "—"} mono />
          </div>
        </section>
      </div>

      {/* risk panel */}
      <section aria-label="Mandate risk limits" className="panel overflow-hidden" style={{ marginTop: 16 }}>
        <div className="flex items-center gap-2.5" style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
          <span className="eyebrow">Mandate risk limits</span>
          <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>Conservative Yield Mandate v1 · live</span>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))", gap: 1, background: "var(--border)" }}>
          {gauges.map((g, i) => {
            const pct = Math.min(100, (g.cur / g.limit) * 100);
            const tint = g.ok ? "var(--green)" : "var(--amber)";
            return (
              <div key={i} style={{ background: "var(--panel)", padding: "16px 18px" }}>
                <div className="flex items-start justify-between gap-2.5">
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{g.title}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{g.sub}</div>
                  </div>
                  <span className="flex items-center gap-1.5" style={{ color: tint, fontSize: 11.5, fontWeight: 600, flex: "none" }}>
                    {g.ok ? <Check size={13} /> : <Info size={13} />}
                    {g.note ?? (g.ok ? "Within limit" : "Watch")}
                  </span>
                </div>
                <div className="flex items-baseline justify-between" style={{ marginTop: 14 }}>
                  <span className="disp" style={{ fontWeight: 600, fontSize: 21, color: "var(--ink)" }}>{g.curLabel}</span>
                  <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{g.limLabel}</span>
                </div>
                <div style={{ marginTop: 9, height: 7, borderRadius: 99, background: "var(--inset)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: tint, borderRadius: 99 }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function StatRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{label}</span>
      <span className={mono ? "mono" : ""} style={{ fontSize: 12.5, color: "var(--ink)", fontWeight: 500 }}>{value}</span>
    </div>
  );
}
