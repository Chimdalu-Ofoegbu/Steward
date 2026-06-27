"use client";
import * as React from "react";
import { useFetch } from "@/lib/useFetch";
import type { JournalEntry } from "@/lib/types";
import { summarize } from "./DecisionDrawer";

// Surfaces a toast only when the REAL journal feed grows (a genuinely new
// attestation appeared after a refresh). Never synthesizes activity.
export function NewAttestationToast() {
  const journal = useFetch<{ entries: JournalEntry[] }>("/api/journal");
  const entries = journal.data?.entries ?? [];
  const prevTop = React.useRef<string | null>(null);
  const initialized = React.useRef(false);
  const [toast, setToast] = React.useState<JournalEntry | null>(null);

  React.useEffect(() => {
    if (!journal.data) return;
    const top = entries[0]?.decision_hash ?? null;
    if (!initialized.current) {
      prevTop.current = top;
      initialized.current = true;
      return;
    }
    if (top && top !== prevTop.current) {
      prevTop.current = top;
      setToast(entries[0]);
      const id = setTimeout(() => setToast(null), 4400);
      return () => clearTimeout(id);
    }
  }, [entries, journal.data]);

  if (!toast) return null;
  return (
    <div
      className="animate-stw-toast"
      style={{
        position: "fixed",
        right: 22,
        bottom: 22,
        zIndex: 95,
        background: "var(--panel)",
        border: "1px solid var(--border-2)",
        borderLeft: "3px solid var(--accent)",
        borderRadius: 11,
        padding: "14px 16px",
        boxShadow: "0 18px 50px var(--shadow)",
        maxWidth: 340,
      }}
    >
      <div className="mono flex items-center gap-2" style={{ fontSize: 10.5, letterSpacing: "0.1em", color: "var(--accent)", marginBottom: 6 }}>
        <span className="animate-stw-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)" }} />
        NEW ATTESTATION ON-CHAIN
      </div>
      <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.4 }}>{summarize(toast)}</div>
    </div>
  );
}
