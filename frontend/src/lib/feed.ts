import { promises as fs } from "node:fs";
import path from "node:path";
import bundledFeed from "@/data/journal_feed.json";
import type { JournalEntry } from "./types";

/**
 * Load the agent's decision feed — the attested on-chain decisions the UI renders.
 *
 * In local dev the agent writes the live file at the repo root
 * (`../deployments/journal_feed.json`); on Vercel that path is outside the
 * serverless function bundle, so we fall back to a snapshot bundled inside the app.
 * Both hold the same real, attested decisions — the bundled copy is simply a
 * snapshot captured at deploy time (a deployed, read-only site can't run the agent).
 *
 * Always returns a fresh array (never the shared import object), so callers may sort
 * in place safely. Never throws — a missing/bad feed yields the honest empty state.
 */
export async function loadJournalFeed(): Promise<JournalEntry[]> {
  try {
    const p = path.resolve(process.cwd(), "..", "deployments", "journal_feed.json");
    return JSON.parse(await fs.readFile(p, "utf-8")) as JournalEntry[];
  } catch {
    return [...(bundledFeed as unknown as JournalEntry[])];
  }
}
