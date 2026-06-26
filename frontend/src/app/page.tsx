"use client";
import * as React from "react";
import Link from "next/link";
import { useFetch } from "@/lib/useFetch";
import { PUBLIC_CONFIG } from "@/lib/config";
import type { TreasuryData, JournalEntry } from "@/lib/types";
import { nfCspr, nfInt, relTime, confPct } from "@/lib/format";
import { validatorName, validatorColor } from "@/lib/validators";
import { Section, KpiCard, AllocationDonut } from "@/components/cards";
import { HashChip, LinkChip, KindPill, VerifiedBadge, EmptyState } from "@/components/primitives";
import { DecisionDrawer, summarize } from "@/components/DecisionDrawer";
import { Coins, Trend, Layers, Activity, Bot, Arrow, Check, kindIcon, kindTint } from "@/components/icons";

const explorer = PUBLIC_CONFIG.explorer;
const pad = { padding: "20px 22px 28px" };

export default function OverviewPage() {
  const treasury = useFetch<TreasuryData>("/api/treasury", 20000);
  const journal = useFetch<{ entries: JournalEntry[] }>("/api/journal", 20000);
  const [selected, setSelected] = React.useState<JournalEntry | null>(null);

  const t = treasury.data;
  const entries = journal.data?.entries ?? [];
  const latest = entries[0] ?? null;

  const allocSlices = (t?.delegations ?? []).map((d, i) => ({
    name: validatorName(d.validator),
    value: d.amount_cspr,
    color: validatorColor(i),
  }));
  if (t && t.liquid_cspr > 0) allocSlices.push({ name: "Liquid (unstaked)", value: t.liquid_cspr, color: "var(--ink-3)" as string });

  return (
    <div style={pad}>
      {/* KPI row */}
      <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", marginBottom: 16 }}>
        <KpiCard
          icon={<Coins size={16} />}
          tint="var(--accent)"
          label="Treasury value"
          value={t ? `${nfCspr(t.total_cspr, 0)} CSPR` : treasury.loading ? "…" : "—"}
          sub={t ? `${nfCspr(t.liquid_cspr, 0)} liquid` : ""}
          subTint="var(--ink-2)"
          sub2={t ? `· ${nfCspr(t.delegated_cspr, 0)} staked` : ""}
        />
        <KpiCard
          icon={<Layers size={16} />}
          tint="var(--green)"
          label="Delegated"
          value={t ? `${nfCspr(t.delegated_cspr, 0)} CSPR` : "—"}
          sub={t ? `${t.delegation_count} validator${t.delegation_count === 1 ? "" : "s"}` : ""}
          subTint="var(--ink-2)"
        />
        <KpiCard
          icon={<Trend size={16} />}
          tint="var(--amber)"
          label="Staking yield"
          value="n/a"
          sub="testnet — no rewards"
          subTint="var(--ink-3)"
        />
        <KpiCard
          icon={<Activity size={16} />}
          tint="var(--accent)"
          label="Decisions attested"
          value={journal.data ? nfInt(entries.length) : "—"}
          sub="on-chain"
          subTint="var(--ink-2)"
        />
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1fr)" }}>
        {/* left column */}
        <div className="flex flex-col gap-4" style={{ minWidth: 0 }}>
          {/* latest decision */}
          <section className="panel" style={{ position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: "0 auto 0 0", width: 3, background: "linear-gradient(var(--accent),transparent)" }} />
            <div className="flex items-center justify-between" style={{ padding: "15px 18px 13px", borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2.5">
                <span className="eyebrow">Latest decision</span>
                {latest && <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>epoch {latest.epoch}</span>}
              </div>
              {latest && <VerifiedBadge verified />}
            </div>
            {latest ? (
              <LatestBody entry={latest} onInspect={() => setSelected(latest)} />
            ) : journal.loading ? (
              <div style={{ padding: 24 }}>
                <div className="rounded-xl" style={{ height: 80, background: "var(--inset)", opacity: 0.5 }} />
              </div>
            ) : (
              <EmptyState icon={<Activity size={20} />} title="No decisions yet" body="The agent has not posted an attestation. The first cycle will appear here." />
            )}
          </section>

          {/* mini feed */}
          <Section title="Decision stream" right={<Link href="/decisions" style={navLink}>View all <Arrow size={13} /></Link>}>
            {entries.length === 0 ? (
              <EmptyState icon={<Activity size={20} />} title="Feed is empty" />
            ) : (
              <div>
                {entries.slice(0, 5).map((r) => (
                  <button
                    key={r.decision_hash}
                    onClick={() => setSelected(r)}
                    className="flex items-center gap-2.5 w-full text-left"
                    style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)", background: "transparent" }}
                  >
                    <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)", width: 46, flex: "none" }}>{relTime(r.timestamp)}</span>
                    <KindPill kind={r.action} tint={kindTint(r.action)} />
                    <span className="truncate" style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--ink)" }}>{summarize(r)}</span>
                    <span style={{ color: "var(--green)", flex: "none" }} title="Verified on-chain"><Check size={15} /></span>
                  </button>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* right column */}
        <div className="flex flex-col gap-4" style={{ minWidth: 0 }}>
          {/* agent identity */}
          <section className="panel" style={{ padding: "16px 17px" }}>
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 10, background: "var(--accent-dim)", border: "1px solid var(--accent-line)", flex: "none", color: "var(--accent)" }}>
                <Bot size={20} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="disp" style={{ fontWeight: 600, fontSize: 15, color: "var(--ink)" }}>Claude Opus 4.8</div>
                <div style={{ fontSize: 11.5, color: "var(--ink-2)" }}>
                  Conservative Yield Mandate · <span className="mono" style={{ color: "var(--ink-3)" }}>v1</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col" style={{ marginTop: 14, gap: 9 }}>
              <IdRow label="Agent key">
                <HashChip value={PUBLIC_CONFIG.agentPublicKeyHex} head={8} tail={6} />
              </IdRow>
              <IdRow label="Journal contract">
                <LinkChip value={PUBLIC_CONFIG.journalPackageHash} href={`${explorer}/contract-package/${PUBLIC_CONFIG.journalPackageHash}`} head={8} tail={6} />
              </IdRow>
              <IdRow label="Network">
                <span className="mono" style={{ fontSize: 12.5, color: "var(--ink-2)" }}>casper-test · {entries.length} attested</span>
              </IdRow>
            </div>
          </section>

          {/* allocation donut */}
          <section className="panel" style={{ padding: "16px 17px" }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
              <span className="eyebrow">Allocation</span>
              <Link href="/treasury" style={navLink}>Treasury <Arrow size={13} /></Link>
            </div>
            {allocSlices.length > 0 ? (
              <AllocationDonut slices={allocSlices} centerLabel={String(t?.delegation_count ?? 0)} centerSub="validators" />
            ) : treasury.loading ? (
              <div className="rounded-xl" style={{ height: 128, background: "var(--inset)", opacity: 0.5 }} />
            ) : (
              <EmptyState title="No allocation yet" />
            )}
          </section>
        </div>
      </div>

      {selected && <DecisionDrawer entry={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

const navLink: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  color: "var(--accent)",
  fontSize: 12,
  fontWeight: 600,
  textDecoration: "none",
};

function IdRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</span>
      {children}
    </div>
  );
}

function LatestBody({ entry, onInspect }: { entry: JournalEntry; onInspect: () => void }) {
  const tint = kindTint(entry.action);
  const KindIcon = kindIcon[entry.action] ?? kindIcon.hold;
  return (
    <div style={{ padding: "17px 18px 18px" }}>
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: 9, flex: "none", color: tint, background: "color-mix(in srgb, currentColor 12%, transparent)", border: `1px solid color-mix(in srgb, ${tint} 28%, transparent)` }}>
          <KindIcon size={17} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="disp" style={{ fontWeight: 600, fontSize: 17, color: "var(--ink)", textTransform: "capitalize" }}>{entry.action}</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>conf {confPct(entry.confidence)}</span>
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 15, color: "var(--ink)", lineHeight: 1.45 }}>{summarize(entry)}</p>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>
            {entry.rationale.length > 240 ? entry.rationale.slice(0, 240).trimEnd() + "…" : entry.rationale}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2" style={{ marginTop: 15, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
        <HashChip value={entry.decision_hash} label="HASH" head={6} tail={6} />
        <HashChip value={entry.cid} label="CID" head={6} tail={6} />
        <LinkChip value={entry.attestation_txn} href={`${explorer}/transaction/${entry.attestation_txn}`} label="TX" head={6} tail={6} />
        <button onClick={onInspect} style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 13px", borderRadius: 8, border: "1px solid var(--accent-line)", background: "var(--accent-dim)", color: "var(--accent)", fontSize: 12.5, fontWeight: 600 }}>
          Inspect <Arrow size={13} />
        </button>
      </div>
    </div>
  );
}
