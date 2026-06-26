import { NextRequest, NextResponse } from "next/server";
import { CONFIG } from "@/lib/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Fetch a pinned decision payload by CID (for display only — the Verifier hashes
// raw bytes separately). Server-side fetch avoids gateway CORS issues.
export async function GET(req: NextRequest) {
  const cid = req.nextUrl.searchParams.get("cid");
  if (!cid || !/^[a-z0-9]+$/i.test(cid)) {
    return NextResponse.json({ error: "invalid cid" }, { status: 400 });
  }
  try {
    const r = await fetch(`${CONFIG.pinataGateway}/${cid}`, { cache: "no-store" });
    if (!r.ok) throw new Error(`gateway ${r.status}`);
    const json = await r.json();
    return NextResponse.json(json, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e).slice(0, 160) }, { status: 502 });
  }
}
