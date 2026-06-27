"use client";
import * as React from "react";
import { useFetch } from "@/lib/useFetch";
import type { JournalEntry } from "@/lib/types";
import { relTime, absTime, confPct, trunc } from "@/lib/format";
import { KindPill, VerifiedBadge, EmptyState } from "@/components/primitives";
import { DecisionDrawer, summarize } from "@/components/DecisionDrawer";
import { Activity, kindTint } from "@/components/icons";

const page: React.CSSProperties = { padding: "28px 34px", maxWidth: 1380 };
const COLS = "96px 120px minmax(0,1fr) 130px 116px";
const FILTERS = ["all", "delegate", "redelegate", "rebalance", "undelegate", "hold"] as const;

export default function DecisionsPage() {
  const journal = useFetch<{ entries: JournalEntry[] }>("/api/journal");
  const [filter, setFilter] = React.useState<string>("all");
  const [selected, setSelected] = React.useState<JournalEntry | null>(null);
  const [newId, setNewId] = React.useState<string | null>(null);
  const prevTop = React.useRef<string | null>(null);

  const all = journal.data?.entries ?? [];

  // Flag a genuinely-new top entry (after a refresh) so it flashes once.
  React.useEffect(() => {
    if (!journal.data) return;
    const top = all[0]?.decision_hash ?? null;
    if (prevTop.current && top && top !== prevTop.current) {
      setNewId(top);
      const id = setTimeout(() => setNewId(null), 2600);
      prevTop.current = top;
      return () => clearTimeout(id);
    }
    prevTop.current = top;
  }, [all, journal.data]);

  const rows = filter === "all" ? all : all.filter((r) => r.action === filter);
  const counts = Object.fromEntries(FILTERS.map((f) => [f, f === "all" ? all.length : all.filter((r) => r.action === f).length]));

  return (
    <div style={page}>
      {/* filter chips */}
      <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 16 }}>
        {FILTERS.map((f) => {
          if (counts[f] === 0 && f !== "all") return null;
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="mono capitalize"
              style={{
                fontSize: 11,
                letterSpacing: "0.04em",
                padding: "7px 13px",
                borderRadius: 8,
                border: `1px solid ${active ? "var(--accent)" : "var(--border-2)"}`,
                color: active ? "var(--accent)" : "var(--ink-2)",
                background: active ? "var(--accent-dim)" : "transparent",
              }}
            >
              {f}
              <span style={{ marginLeft: 6, color: "var(--ink-3)" }}>{counts[f]}</span>
            </button>
          );
        })}
        <div className="mono" style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-2)" }}>{rows.length} records</div>
      </div>

      <section aria-label="Decision feed" className="panel overflow-hidden">
        {/* desktop header */}
        <div className="hidden md:grid eyebrow" style={{ gridTemplateColumns: COLS, gap: 16, padding: "15px 24px", borderBottom: "1px solid var(--border)" }}>
          <div>TIME</div><div>ACTION</div><div>SUMMARY</div><div>CONFIDENCE</div><div style={{ textAlign: "right" }}>STATUS</div>
        </div>

        {journal.loading && all.length === 0 ? (
          <div className="flex flex-col gap-2" style={{ padding: 18 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-lg" style={{ height: 44, background: "var(--inset)", opacity: 0.5 }} />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<Activity size={20} />} title="No decisions match" body={journal.error ? `Feed error: ${journal.error}` : "No attestation of this kind yet."} />
        ) : (
          rows.map((r) => {
            const isNew = r.decision_hash === newId;
            const pct = Math.round(r.confidence * 100);
            return (
              <React.Fragment key={r.decision_hash}>
                {/* desktop row */}
                <button
                  onClick={() => setSelected(r)}
                  className={`hidden md:grid stw-rowhover w-full text-left items-center ${isNew ? "animate-stw-new" : ""}`}
                  style={{ gridTemplateColumns: COLS, gap: 16, padding: "17px 24px", borderBottom: "1px solid var(--border)", background: "transparent" }}
                >
                  <span className="mono truncate" style={{ fontSize: 11, color: "var(--ink-2)" }} title={absTime(r.timestamp)}>{relTime(r.timestamp)}</span>
                  <span><KindPill kind={r.action} tint={kindTint(r.action)} /></span>
                  <span className="truncate flex items-center gap-2" style={{ minWidth: 0, fontSize: 13.5, color: "var(--ink)" }}>
                    <span className="truncate" style={{ minWidth: 0 }}>{summarize(r)}</span>
                    {isNew && <span className="mono" style={{ flex: "none", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "var(--accent-ink)", background: "var(--accent)", borderRadius: 4, padding: "2px 5px" }}>NEW</span>}
                  </span>
                  <span className="flex items-center gap-2" style={{ minWidth: 0 }}>
                    <span style={{ flex: 1, height: 5, background: "var(--inset)", borderRadius: 3, overflow: "hidden", minWidth: 0 }}>
                      <span className="block" style={{ width: `${pct}%`, height: "100%", background: "var(--accent)" }} />
                    </span>
                    <span className="mono" style={{ fontSize: 11, color: "var(--ink-2)", flex: "none" }}>{pct}%</span>
                  </span>
                  <span style={{ textAlign: "right" }} className="flex justify-end"><VerifiedBadge verified /></span>
                </button>
                {/* mobile card */}
                <button
                  onClick={() => setSelected(r)}
                  className={`md:hidden flex flex-col gap-2 w-full text-left ${isNew ? "animate-stw-new" : ""}`}
                  style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", background: "transparent" }}
                >
                  <div className="flex items-center gap-2">
                    <KindPill kind={r.action} tint={kindTint(r.action)} />
                    <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{relTime(r.timestamp)} · ep {r.epoch}</span>
                    <span style={{ marginLeft: "auto" }}><VerifiedBadge verified /></span>
                  </div>
                  <span style={{ fontSize: 13.5, color: "var(--ink)", lineHeight: 1.4 }}>{summarize(r)}</span>
                  <span className="mono truncate" style={{ fontSize: 11, color: "var(--ink-3)" }}>{trunc(r.decision_hash, 12, 10)}</span>
                </button>
              </React.Fragment>
            );
          })
        )}
      </section>

      {selected && <DecisionDrawer entry={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
