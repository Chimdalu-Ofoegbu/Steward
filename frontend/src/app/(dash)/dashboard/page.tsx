"use client";
import * as React from "react";
import Link from "next/link";
import { useFetch } from "@/lib/useFetch";
import { PUBLIC_CONFIG } from "@/lib/config";
import type { TreasuryData, JournalEntry } from "@/lib/types";
import { nfCspr, nfInt, relTime } from "@/lib/format";
import { validatorName, validatorColor } from "@/lib/validators";
import { KpiCard, AllocationDonut } from "@/components/cards";
import { HashChip, KindPill, VerifiedBadge, EmptyState } from "@/components/primitives";
import { DecisionDrawer, summarize } from "@/components/DecisionDrawer";
import { kindTint, Activity } from "@/components/icons";

const page: React.CSSProperties = { padding: "28px 34px", maxWidth: 1380 };
const card = { background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14 } as React.CSSProperties;

function compact(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K`;
  return String(Math.round(n));
}

export default function DashboardPage() {
  const treasury = useFetch<TreasuryData>("/api/treasury");
  const journal = useFetch<{ entries: JournalEntry[] }>("/api/journal");
  const [selected, setSelected] = React.useState<JournalEntry | null>(null);

  const t = treasury.data;
  const entries = journal.data?.entries ?? [];
  const latest = entries[0] ?? null;

  const slices = (t?.delegations ?? []).map((d, i) => ({
    name: validatorName(d.validator),
    value: d.amount_cspr,
    color: validatorColor(i),
  }));
  if (t && t.liquid_cspr > 0) slices.push({ name: "Liquid (unstaked)", value: t.liquid_cspr, color: "#4a5560" });

  return (
    <div style={page}>
      {/* KPI row */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 18 }}>
        <KpiCard
          label="TREASURY NAV"
          value={t ? compact(t.total_cspr) : treasury.loading ? "…" : "—"}
          sub={
            t ? (
              <span className="flex justify-between">
                <span>CSPR</span>
                <span>{nfCspr(t.total_cspr, 0)}</span>
              </span>
            ) : (
              "live testnet read"
            )
          }
        />
        <KpiCard label="STAKING APR" value="≈ 11.4%" valueColor="var(--accent)" sample sub="illustrative — no rewards on testnet" />
        <KpiCard
          label="VALIDATORS"
          value={t ? String(t.delegation_count) : "—"}
          sub={t ? "delegated · within mandate" : ""}
        />
        <KpiCard label="DECISIONS ATTESTED" value={journal.data ? nfInt(entries.length) : "—"} sub="on-chain journal" />
        <KpiCard
          label="AGENT STATUS"
          value={
            <span className="flex items-center gap-2">
              <span className="animate-stw-pulse" style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--accent)" }} />
              <span style={{ color: "var(--accent)" }}>LIVE</span>
            </span>
          }
          sub="runs autonomously"
        />
      </div>

      {/* row 2 — latest decision + agent identity */}
      <div className="grid" style={{ gridTemplateColumns: "minmax(0,1.7fr) minmax(0,1fr)", gap: 18, marginTop: 18 }}>
        <div style={{ ...card, padding: 24, minWidth: 0 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
            <span className="eyebrow">Latest decision</span>
            {latest && <VerifiedBadge verified />}
          </div>
          {latest ? (
            <>
              <div className="flex items-center gap-2.5" style={{ marginBottom: 12 }}>
                <KindPill kind={latest.action} tint={kindTint(latest.action)} />
                <span className="mono" style={{ fontSize: 12, color: "var(--ink-2)" }}>{relTime(latest.timestamp)} · epoch {latest.epoch}</span>
              </div>
              <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.3, color: "var(--ink)" }}>{summarize(latest)}</div>
              <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.55, marginTop: 14 }}>
                {latest.rationale.length > 240 ? latest.rationale.slice(0, 240).trimEnd() + "…" : latest.rationale}
              </p>
              <div className="flex flex-wrap items-center gap-2.5" style={{ marginTop: 18 }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>decision_hash</span>
                <HashChip value={latest.decision_hash} head={12} tail={8} />
                <button
                  onClick={() => setSelected(latest)}
                  className="mono"
                  style={{ marginLeft: "auto", fontSize: 12, color: "var(--accent)", background: "transparent" }}
                >
                  Open detail →
                </button>
              </div>
            </>
          ) : journal.loading ? (
            <div className="rounded-xl" style={{ height: 120, background: "var(--inset)", opacity: 0.5 }} />
          ) : (
            <EmptyState icon={<Activity size={20} />} title="No decisions yet" body="The first attested cycle will appear here." />
          )}
        </div>

        <div style={{ ...card, padding: 24, minWidth: 0 }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>Agent identity</div>
          <div className="flex flex-col" style={{ gap: 18 }}>
            <IdField label="Model" value="Claude Opus 4.8" />
            <IdField label="Mandate" value="Conservative Yield · v1" />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>Agent public key</div>
              <HashChip value={PUBLIC_CONFIG.agentPublicKeyHex} head={14} tail={10} />
            </div>
          </div>
        </div>
      </div>

      {/* row 3 — allocation + mini feed */}
      <div className="grid" style={{ gridTemplateColumns: "minmax(0,1.7fr) minmax(0,1fr)", gap: 18, marginTop: 18 }}>
        <div style={{ ...card, padding: 24, minWidth: 0 }}>
          <div className="flex items-center justify-between gap-2" style={{ marginBottom: 18 }}>
            <span className="eyebrow">Allocation · {t?.delegation_count ?? 0} validator{(t?.delegation_count ?? 0) === 1 ? "" : "s"}</span>
            {t?.delegations_source === "journal" && (
              <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }} title="Live auction snapshot unavailable (node 413); showing the agent's real attested on-chain delegations from its journal.">
                ⛓ attested
              </span>
            )}
          </div>
          {slices.length > 0 ? (
            <AllocationDonut slices={slices} centerTop={compact(t?.delegated_cspr ?? 0)} centerSub="CSPR staked" />
          ) : treasury.loading ? (
            <div className="rounded-xl" style={{ height: 168, background: "var(--inset)", opacity: 0.5 }} />
          ) : (
            <EmptyState title="No allocation yet" body="The agent has not delegated yet." />
          )}
        </div>

        <div style={{ ...card, padding: 24, minWidth: 0 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
            <span className="eyebrow">Recent decisions</span>
            <Link href="/decisions" className="mono" style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none" }}>View all →</Link>
          </div>
          {entries.length === 0 ? (
            <EmptyState icon={<Activity size={20} />} title="Feed is empty" />
          ) : (
            <div className="flex flex-col">
              {entries.slice(0, 5).map((d) => (
                <button
                  key={d.decision_hash}
                  onClick={() => setSelected(d)}
                  className="stw-rowhover flex items-center gap-2.5 w-full text-left"
                  style={{ padding: "13px 4px", borderBottom: "1px solid var(--border)", background: "transparent" }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: kindTint(d.action), flex: "none" }} />
                  <span className="truncate" style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: "var(--ink)" }}>{summarize(d)}</span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", flex: "none" }}>{relTime(d.timestamp)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selected && <DecisionDrawer entry={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function IdField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--ink-2)" }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, marginTop: 3, color: "var(--ink)" }}>{value}</div>
    </div>
  );
}
