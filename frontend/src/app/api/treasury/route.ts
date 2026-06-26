import { NextResponse } from "next/server";
import { CONFIG } from "@/lib/config";
import { liquidBalanceCspr, auctionInfo } from "@/lib/casper";
import type { TreasuryData } from "@/lib/types";

// Always read live — never cache the chain state.
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

  const delegated = auction.delegations.reduce((a, d) => a + d.amount_cspr, 0);

  const data: TreasuryData = {
    agent_public_key_hex: agentHex,
    liquid_cspr: liquid,
    delegated_cspr: delegated,
    total_cspr: liquid + delegated,
    delegations: auction.delegations,
    validators: auction.validators,
    delegation_count: auction.delegations.length,
    validator_count: auction.validator_count,
    block_height: auction.block_height,
    state_root_hash: auction.state_root_hash,
    fetched_at: Math.floor(Date.now() / 1000),
    ...(errors.length ? { errors } : {}),
  };

  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
