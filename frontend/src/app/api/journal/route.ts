import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { JournalEntry } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// The agent writes deployments/journal_feed.json at the repo root (one level up
// from frontend/). Resolve relative to cwd, with a fallback.
function feedPath(): string {
  const cwd = process.cwd(); // .../Steward/frontend when running `next`
  return path.resolve(cwd, "..", "deployments", "journal_feed.json");
}

export async function GET() {
  try {
    const raw = await fs.readFile(feedPath(), "utf-8");
    const rows = JSON.parse(raw) as JournalEntry[];
    // Newest first for the UI.
    rows.sort((a, b) => (b.epoch || 0) - (a.epoch || 0) || (b.timestamp || 0) - (a.timestamp || 0));
    return NextResponse.json({ entries: rows, count: rows.length }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    // Missing/malformed feed → honest empty state (the UI renders "no records yet").
    return NextResponse.json(
      { entries: [], count: 0, error: String(e?.message ?? e).slice(0, 160) },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
