import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { CONFIG } from "@/lib/config";
import { liquidBalanceCspr, auctionInfo } from "@/lib/casper";
import type { TreasuryData, JournalEntry, DelegationInfo } from "@/lib/types";

// Always read live — never cache the chain state.
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Derive the agent's net on-chain allocation from its OWN attested journal. Used only
 * as a fallback when the live auction snapshot is unavailable — the public testnet node
 * currently rejects the full `state_get_auction_info` set with HTTP 413 Payload Too Large.
 *
 * Honest by construction: this counts ONLY entries that actually executed on-chain (have
 * a `staking_txn`); attestation-only cycles don't move stake. So these are real, attested,
 * on-chain delegations — sourced from the journal rather than a live auction read.
 */
async function delegationsFromJournal(): Promise<DelegationInfo[]> {
  try {
    const p = path.resolve(process.cwd(), "..", "deployments", "journal_feed.json");
    const rows = JSON.parse(await fs.readFile(p, "utf-8")) as JournalEntry[];
    const sorted = [...rows].sort(
      (a, b) => (a.epoch || 0) - (b.epoch || 0) || (a.timestamp || 0) - (b.timestamp || 0),
    );
    const byValidator = new Map<string, number>();
    for (const e of sorted) {
      if (!e.validator || !e.staking_txn) continue; // only moves that executed on-chain
      const cur = byValidator.get(e.validator) || 0;
      // delegate / redelegate(→target) / rebalance add to the target; undelegate removes.
      byValidator.set(e.validator, e.action === "undelegate" ? cur - e.amount_cspr : cur + e.amount_cspr);
    }
    return [...byValidator.entries()]
      .filter(([, amt]) => amt > 0.0001)
      .map(([validator, amount_cspr]) => ({ validator, amount_cspr }));
  } catch {
    return [];
  }
}

export async function GET() {
  const agentHex = CONFIG.agentPublicKeyHex;
  const errors: string[] = [];

  const [liquidRes, auctionRes] = await Promise.allSettled([
    liquidBalanceCspr(agentHex),
    auctionInfo(agentHex),
  ]);

  const liquid = liquidRes.status === "fulfilled" ? liquidRes.value : 0;
  if (liquidRes.status === "rejected") errors.push(`balance: ${String(liquidRes.reason).slice(0, 160)}`);

  const auction =
    auctionRes.status === "fulfilled"
      ? auctionRes.value
      : { validators: [], delegations: [], validator_count: 0, state_root_hash: null, block_height: null };
  if (auctionRes.status === "rejected") errors.push(`auction: ${String(auctionRes.reason).slice(0, 160)}`);

  // Prefer the live auction snapshot. If it failed (e.g. the node 413s the full set) or
  // returned no delegations, fall back to the agent's attested on-chain delegations.
  let delegations = auction.delegations;
  let source: TreasuryData["delegations_source"] = delegations.length ? "auction" : "none";
  if (delegations.length === 0) {
    const fromJournal = await delegationsFromJournal();
    if (fromJournal.length) {
      delegations = fromJournal;
      source = "journal";
    }
  }

  const delegated = delegations.reduce((a, d) => a + d.amount_cspr, 0);

  const data: TreasuryData = {
    agent_public_key_hex: agentHex,
    liquid_cspr: liquid,
    delegated_cspr: delegated,
    total_cspr: liquid + delegated,
    delegations,
    validators: auction.validators,
    delegation_count: delegations.length,
    validator_count: auction.validator_count,
    block_height: auction.block_height,
    state_root_hash: auction.state_root_hash,
    delegations_source: source,
    fetched_at: Math.floor(Date.now() / 1000),
    ...(errors.length ? { errors } : {}),
  };

  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
