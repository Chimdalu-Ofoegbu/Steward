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
 * decision_hash) + provenance (attested by the agent key, in a real successful block).
 *
 * Honesty rule (BUILD-PROMPT A.4): we sha256 the EXACT raw gateway bytes — never a
 * re-parsed/re-stringified JSON — so the digest matches what the agent recorded.
 *
 * GREEN (result.ok) is asserted ONLY when the digest equals the hash the agent recorded
 * ON-CHAIN, in a successful transaction signed by the agent key. A locally-recorded or
 * user-pasted hash is NEVER used as the provenance reference — at most it is a weak
 * integrity cross-check that renders AMBER (result.integrity_only), never green. This is
 * the whole point: "don't trust the app — the proof is on-chain."
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
  // The recorded hash is used ONLY as a weak (amber) integrity cross-check when the chain
  // read is unavailable. It is never sufficient for a green/provenance result.
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
  let attBlockHeight: number | null = null;
  let txFound = false;
  let txSuccess = false;
  let byAgentStrict = false;
  if (attestationTxn) {
    const tx = await getJournalTransaction(attestationTxn);
    blockHash = tx.block_hash;
    attBlockHeight = tx.block_height;
    agentKey = tx.initiator ?? undefined;
    onChainHash = tx.args["decision_hash"] || undefined;
    onChainCid = tx.args["ipfs_cid"] || undefined;
    txFound = tx.found;
    txSuccess = tx.success;
    // STRICT: the initiator must be present AND equal the agent key. No "unknown ⇒ trusted"
    // default (that was the hole that let a green result through with no real provenance).
    byAgentStrict = !!agentKey && agentKey.toLowerCase() === CONFIG.agentPublicKeyHex.toLowerCase();

    if (txFound && txSuccess && byAgentStrict) {
      steps.push({
        id: "onchain",
        title: "Attestation found on-chain",
        detail: `Recorded by the agent key${blockHash ? ` in block ${blockHash.slice(0, 10)}…` : ""} via the Journal contract.`,
        status: "ok",
      });
    } else if (txFound && !byAgentStrict) {
      steps.push({
        id: "onchain",
        title: "Attestation found on-chain",
        detail: agentKey
          ? `Initiator ${agentKey.slice(0, 12)}… does not match the agent key — provenance NOT confirmed.`
          : "Could not read the transaction initiator to confirm the agent key.",
        status: "fail",
      });
    } else if (txFound && !txSuccess) {
      steps.push({
        id: "onchain",
        title: "Attestation lookup",
        detail: tx.error || "The attestation transaction has no successful execution result yet.",
        status: "warn",
      });
    } else {
      // Distinguish a DEFINITIVE miss (node says "no such transaction") from a TRANSIENT
      // read failure (413 / timeout). The former is a real fail; the latter is amber-retry.
      const err = tx.error || "";
      const definitivelyMissing = !err || /no such transaction|-32014|not found/i.test(err);
      steps.push({
        id: "onchain",
        title: "Attestation lookup",
        detail: definitivelyMissing ? "Transaction not found on-chain." : `On-chain read unavailable (${err.slice(0, 80)}) — retry.`,
        status: definitivelyMissing ? "fail" : "warn",
      });
    }
  } else {
    steps.push({
      id: "onchain",
      title: "Attestation lookup",
      detail: "No attestation transaction supplied — provenance cannot be confirmed.",
      status: "warn",
    });
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

  // ── Step 3: integrity — sha256(raw bytes) == decision_hash ───────────────
  let computed: string | undefined;
  const ipfsOk = steps.some((s) => s.id === "ipfs" && s.status === "ok");
  if (rawBytes) {
    computed = createHash("sha256").update(rawBytes).digest("hex");
    const strong = !!onChainHash; // do we have the hash straight from the chain?
    const reference = onChainHash || recordedHash;
    const integrityMatch = !!reference && computed.toLowerCase() === reference.toLowerCase();
    steps.push({
      id: "integrity",
      title: strong
        ? "Integrity — sha256(raw bytes) matches the on-chain hash"
        : "Integrity — sha256(raw bytes) matches the recorded hash",
      detail: integrityMatch
        ? strong
          ? "The pinned payload hashes to exactly the digest recorded on-chain. Unaltered."
          : "The pinned payload matches the recorded digest. On-chain confirmation is momentarily unavailable — retry to confirm against the chain."
        : `Computed ${computed.slice(0, 16)}… ≠ ${strong ? "on-chain" : "recorded"} ${(reference || "").slice(0, 16)}…`,
      status: integrityMatch ? (strong ? "ok" : "warn") : "fail",
    });

    // Provenance is real ONLY with a genuine on-chain hash from the agent's successful txn.
    const onChainProven =
      !!onChainHash && txFound && txSuccess && byAgentStrict && computed.toLowerCase() === onChainHash.toLowerCase();
    result.ok = onChainProven && ipfsOk;
    result.integrity_only = !result.ok && integrityMatch && ipfsOk;
  }

  // ── Step 4: ordering — the attestation block precedes the staking move (H2) ──
  if (rec?.staking_txn && attBlockHeight != null) {
    try {
      const stx = await getJournalTransaction(rec.staking_txn);
      if (stx.found && stx.block_height != null) {
        const ordered = attBlockHeight <= stx.block_height;
        result.ordering_ok = ordered;
        steps.push({
          id: "ordering",
          title: "Ordering — attestation preceded the action",
          detail: ordered
            ? `Attestation block ${attBlockHeight} ≤ staking block ${stx.block_height}: the agent recorded WHY before it acted.`
            : `Attestation block ${attBlockHeight} > staking block ${stx.block_height}: ordering could NOT be confirmed.`,
          status: ordered ? "ok" : "fail",
        });
        if (!ordered) result.ok = false;
      } else {
        steps.push({
          id: "ordering",
          title: "Ordering check",
          detail: "Staking-transaction block unavailable this moment — retry to confirm ordering.",
          status: "warn",
        });
      }
    } catch {
      steps.push({
        id: "ordering",
        title: "Ordering check",
        detail: "Could not read the staking transaction block this moment — retry.",
        status: "warn",
      });
    }
  }

  // ── Step 5: provenance summary ───────────────────────────────────────────
  if (result.ok) {
    steps.push({
      id: "provenance",
      title: "Provenance confirmed",
      detail: `Authentic, unaltered, and attested by the agent key${blockHash ? ` at block ${blockHash.slice(0, 10)}…` : ""}.`,
      status: "ok",
    });
  }

  result.computed_hash = computed;
  result.onchain_hash = onChainHash; // ONLY the real on-chain hash — never the pasted/recorded one
  result.onchain_cid = onChainCid || cid;
  result.attestation_txn = attestationTxn;
  result.block_hash = blockHash;
  result.agent_key = byAgentStrict ? agentKey : undefined; // don't assert an unverified key

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
