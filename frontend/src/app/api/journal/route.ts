import { NextResponse } from "next/server";
import { loadJournalFeed } from "@/lib/feed";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const rows = await loadJournalFeed();
  // Newest first for the UI.
  rows.sort((a, b) => (b.epoch || 0) - (a.epoch || 0) || (b.timestamp || 0) - (a.timestamp || 0));
  return NextResponse.json({ entries: rows, count: rows.length }, { headers: { "Cache-Control": "no-store" } });
}
