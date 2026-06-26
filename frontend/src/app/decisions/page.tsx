"use client";
import * as React from "react";
import { useFetch } from "@/lib/useFetch";
import type { JournalEntry } from "@/lib/types";
import { relTime, absTime, confPct, trunc } from "@/lib/format";
import { KindPill, VerifiedBadge, EmptyState } from "@/components/primitives";
import { DecisionDrawer, summarize } from "@/components/DecisionDrawer";
import { Activity, kindTint } from "@/components/icons";

const pad = { padding: "20px 22px 28px" };

const FILTERS = ["all", "delegate", "redelegate", "rebalance", "undelegate", "hold"] as const;

export default function DecisionsPage() {
  const journal = useFetch<{ entries: JournalEntry[] }>("/api/journal", 20000);
  const [filter, setFilter] = React.useState<string>("all");
  const [selected, setSelected] = React.useState<JournalEntry | null>(null);

  const all = journal.data?.entries ?? [];
  const rows = filter === "all" ? all : all.filter((r) => r.action === filter);
  const counts = Object.fromEntries(FILTERS.map((f) => [f, f === "all" ? all.length : all.filter((r) => r.action === f).length]));

  return (
    <div style={pad}>
      <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 16 }}>
        {FILTERS.map((f) => {
          const active = filter === f;
          if (counts[f] === 0 && f !== "all") return null;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="capitalize"
              style={{
                height: 30,
                padding: "0 12px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 600,
                border: `1px solid ${active ? "var(--accent-line)" : "var(--border)"}`,
                background: active ? "var(--accent-dim)" : "var(--inset)",
                color: active ? "var(--accent)" : "var(--ink-2)",
              }}
            >
              {f}
              <span className="mono" style={{ marginLeft: 6, color: "var(--ink-3)", fontSize: 11 }}>{counts[f]}</span>
            </button>
          );
        })}
        <div className="flex items-center gap-2" style={{ marginLeft: "auto", color: "var(--ink-3)", fontSize: 12 }}>
          <span className="animate-stw-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)" }} />
          live · auto-refresh 20s
        </div>
      </div>

      <section aria-label="Decision feed" className="panel overflow-hidden">
        {/* header (desktop) */}
        <div className="hidden md:flex items-center gap-3.5 eyebrow" style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ width: 50, flex: "none" }}>When</span>
          <span style={{ width: 92, flex: "none" }}>Action</span>
          <span style={{ flex: 1, minWidth: 0 }}>Decision</span>
          <span style={{ width: 54, flex: "none", textAlign: "right" }}>Conf</span>
          <span style={{ width: 188, flex: "none" }}>decision_hash</span>
          <span style={{ width: 84, flex: "none", textAlign: "center" }}>Status</span>
        </div>

        {journal.loading && all.length === 0 ? (
          <div style={{ padding: 18 }} className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-lg" style={{ height: 44, background: "var(--inset)", opacity: 0.5 }} />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<Activity size={20} />} title="No decisions match" body={journal.error ? `Feed error: ${journal.error}` : "The agent has not attested a decision of this kind yet."} />
        ) : (
          rows.map((r) => (
            <React.Fragment key={r.decision_hash}>
              {/* desktop row */}
              <button
                onClick={() => setSelected(r)}
                className="hidden md:flex items-center gap-3.5 w-full text-left"
                style={{ padding: "13px 18px", borderBottom: "1px solid var(--border)", background: "transparent" }}
              >
                <span className="mono" style={{ width: 50, flex: "none", fontSize: 11.5, color: "var(--ink-3)" }} title={absTime(r.timestamp)}>{relTime(r.timestamp)}</span>
                <span style={{ width: 92, flex: "none" }}><KindPill kind={r.action} tint={kindTint(r.action)} /></span>
                <span className="truncate" style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--ink)" }}>{summarize(r)}</span>
                <span className="mono" style={{ width: 54, flex: "none", textAlign: "right", fontSize: 12, color: "var(--ink-2)" }}>{confPct(r.confidence)}</span>
                <span className="mono truncate" style={{ width: 188, flex: "none", minWidth: 0, fontSize: 11.5, color: "var(--ink-2)" }}>{trunc(r.decision_hash, 10, 8)}</span>
                <span style={{ width: 84, flex: "none" }} className="flex justify-center"><VerifiedBadge verified /></span>
              </button>
              {/* mobile stacked card */}
              <button
                onClick={() => setSelected(r)}
                className="md:hidden flex flex-col gap-2 w-full text-left"
                style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", background: "transparent" }}
              >
                <div className="flex items-center gap-2">
                  <KindPill kind={r.action} tint={kindTint(r.action)} />
                  <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{relTime(r.timestamp)} · ep {r.epoch}</span>
                  <span style={{ marginLeft: "auto" }}><VerifiedBadge verified /></span>
                </div>
                <span style={{ fontSize: 13.5, color: "var(--ink)", lineHeight: 1.4 }}>{summarize(r)}</span>
                <span className="mono truncate" style={{ fontSize: 11, color: "var(--ink-3)" }}>{trunc(r.decision_hash, 12, 10)}</span>
              </button>
            </React.Fragment>
          ))
        )}
      </section>

      {selected && <DecisionDrawer entry={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
