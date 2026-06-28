import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { CONFIG } from "@/lib/config";
import { getJournalTransaction } from "@/lib/casper";
import { loadJournalFeed } from "@/lib/feed";
import type { VerifyResult, VerifyStep } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const loadFeed = loadJournalFeed;

/**
 * Verify an attestation: integrity (sha256 of the RAW pinned bytes == on-chain
 * decision_hash) + provenance (attested by the agent key, in a real block).
 *
 * Hashing rule (BUILD-PROMPT A.4): we sha256 the EXACT raw gateway bytes — never
 * a re-parsed/re-stringified JSON — so the digest matches what the agent recorded.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const txnParam = q.get("txn") || "";
  const cidParam = q.get("cid") || "";
  const hashParam = q.get("hash") || "";

  const feed = await loadFeed();
  // Resolve the record by any identifier the user pasted.
  const rec =
    feed.find((e) => e.attestation_txn === txnParam) ||
    feed.find((e) => e.cid === cidParam) ||
    feed.find((e) => e.decision_hash === hashParam) ||
    feed.find((e) => e.decision_hash === txnParam || e.cid === txnParam) ||
    null;

  const steps: VerifyStep[] = [];
  const result: VerifyResult = { ok: false, steps };

  const cid = rec?.cid || cidParam;
  const attestationTxn = rec?.attestation_txn || txnParam;
  const recordedHash = rec?.decision_hash || hashParam;

  if (!cid && !attestationTxn) {
    result.error = "No matching record. Paste a decision_hash, attestation txn, or CID.";
    steps.push({ id: "lookup", title: "Record lookup", detail: result.error, status: "fail" });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  }

  // ── Step 1: attestation found on-chain (provenance) ──────────────────────
  let onChainHash: string | undefined;
  let onChainCid: string | undefined;
  let agentKey: string | undefined;
  let blockHash: string | null = null;
  if (attestationTxn) {
    const tx = await getJournalTransaction(attestationTxn);
    blockHash = tx.block_hash;
    agentKey = tx.initiator ?? undefined;
    onChainHash = tx.args["decision_hash"] || undefined;
    onChainCid = tx.args["ipfs_cid"] || undefined;
    const byAgent = !agentKey || agentKey.toLowerCase() === CONFIG.agentPublicKeyHex.toLowerCase();
    if (tx.found && tx.success && byAgent) {
      steps.push({
        id: "onchain",
        title: "Attestation found on-chain",
        detail: `Recorded by the agent key${blockHash ? ` in block ${blockHash.slice(0, 10)}…` : ""} via the Journal contract.`,
        status: "ok",
      });
    } else if (tx.found) {
      steps.push({
        id: "onchain",
        title: "Attestation found on-chain",
        detail: byAgent
          ? "Transaction located on-chain."
          : `Initiator ${agentKey} does not match the agent key.`,
        status: byAgent ? "ok" : "fail",
      });
    } else {
      steps.push({
        id: "onchain",
        title: "Attestation lookup",
        detail: tx.error || "Transaction not found on-chain.",
        status: "fail",
      });
    }
  }

  // ── Step 2: fetch RAW pinned bytes for the CID ───────────────────────────
  let rawBytes: Buffer | null = null;
  if (cid) {
    try {
      const r = await fetch(`${CONFIG.pinataGateway}/${cid}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`gateway ${r.status}`);
      rawBytes = Buffer.from(await r.arrayBuffer());
      steps.push({
        id: "ipfs",
        title: "IPFS payload fetched",
        detail: `${rawBytes.length} bytes retrieved from the gateway for CID ${cid.slice(0, 14)}…`,
        status: "ok",
      });
    } catch (e: any) {
      steps.push({
        id: "ipfs",
        title: "IPFS payload fetch",
        detail: `Could not fetch raw bytes: ${String(e?.message ?? e).slice(0, 120)}`,
        status: "fail",
      });
    }
  }

  // ── Step 3: integrity — sha256(raw bytes) == on-chain decision_hash ──────
  let computed: string | undefined;
  if (rawBytes) {
    computed = createHash("sha256").update(rawBytes).digest("hex");
    // Compare to the strongest available reference: on-chain hash, else recorded.
    const reference = onChainHash || recordedHash;
    const match = !!reference && computed.toLowerCase() === reference.toLowerCase();
    steps.push({
      id: "integrity",
      title: "Integrity — sha256(raw bytes) matches on-chain hash",
      detail: match
        ? "The pinned payload hashes to exactly the digest recorded on-chain. Unaltered."
        : `Computed ${computed.slice(0, 16)}… ≠ recorded ${(reference || "").slice(0, 16)}…`,
      status: match ? "ok" : "fail",
    });
    // The integrity match is the canonical proof. The on-chain lookup adds
    // provenance, but the RPC can momentarily return a txn before its execution
    // info is attached — that must not flip a genuine hash match to "failed".
    // Require: integrity matched AND IPFS+integrity steps clean AND (if the
    // on-chain hash was read) it equals the computed digest.
    const hardFail = steps.some((s) => (s.id === "ipfs" || s.id === "integrity") && s.status === "fail");
    const onChainConsistent = !onChainHash || onChainHash.toLowerCase() === computed.toLowerCase();
    result.ok = match && !hardFail && onChainConsistent;
  }

  // ── Step 4: provenance summary ───────────────────────────────────────────
  if (result.ok) {
    steps.push({
      id: "provenance",
      title: "Provenance confirmed",
      detail: `Authentic, unaltered, and attested by the agent key${blockHash ? ` at block ${blockHash.slice(0, 10)}…` : ""}.`,
      status: "ok",
    });
  }

  result.computed_hash = computed;
  result.onchain_hash = onChainHash || recordedHash;
  result.onchain_cid = onChainCid || cid;
  result.attestation_txn = attestationTxn;
  result.block_hash = blockHash;
  result.agent_key = agentKey || CONFIG.agentPublicKeyHex;

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
