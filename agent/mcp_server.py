"""Steward MCP server — exposes the agent's live treasury and its on-chain-attested
decision journal as Model Context Protocol tools an LLM (e.g. Claude) can call.

This is the Casper AI Toolkit's headline pattern — "MCP servers that expose Casper
state to an LLM" — but pointed at Steward's OWN treasury and its verifiable decision
journal, which no generic Casper MCP server can provide. It reuses the exact same
chain layer (`steward.chain`, the casper-js-sdk sidecar) and decision feed
(`steward.feed`) the agent itself uses, so the tools return the same real data.

Read-only by construction: no signing key is loaded, no writes, no private data —
only public Casper testnet reads plus the already-public attestation journal.

Run (stdio transport):
    python agent/mcp_server.py

Register in an MCP client (Claude Desktop / Claude Code), stdio form:
    {
      "mcpServers": {
        "steward": { "command": "python", "args": ["<abs-path>/agent/mcp_server.py"] }
      }
    }
"""
from __future__ import annotations

import sys
from pathlib import Path

# Make the `steward` package importable when this file is run as a bare script.
sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

from mcp.server.fastmcp import FastMCP  # stable v1.x API

from steward import chain, feed

mcp = FastMCP("steward")

_MOTES_PER_CSPR = 1_000_000_000
_AGENT = chain.agent_public_key_hex()
_SITE = "https://aisteward.xyz"
_EXPLORER = "https://testnet.cspr.live"


@mcp.tool()
def get_treasury() -> dict:
    """Steward's live on-chain treasury on Casper testnet: liquid CSPR, delegated CSPR,
    and its per-validator delegations. Real-time read via the native auction."""
    try:
        liquid = round(chain.get_balance(_AGENT) / _MOTES_PER_CSPR, 6)
        liquid_err = None
    except Exception as exc:  # node flake — report rather than crash the tool
        liquid, liquid_err = None, f"live balance read unavailable: {exc}"

    auction = chain.get_auction(_AGENT)
    delegations = [
        {
            "validator": d.get("validator"),
            "amount_cspr": round(int(d.get("amount_motes", "0")) / _MOTES_PER_CSPR, 4),
        }
        for d in auction.get("delegations", [])
    ]
    delegated = round(sum(x["amount_cspr"] for x in delegations), 4)
    return {
        "agent_public_key": _AGENT,
        "network": chain.NETWORK,
        "liquid_cspr": liquid,
        "delegated_cspr": delegated,
        "total_cspr": None if liquid is None else round(liquid + delegated, 4),
        "delegations": delegations,
        "delegation_count": len(delegations),
        "source": auction.get("source", "live"),
        **({"note": liquid_err} if liquid_err else {}),
    }


@mcp.tool()
def get_validators(count: int = 10) -> list[dict]:
    """Top active Casper testnet validators by weight — the agent's delegation opportunity set."""
    auction = chain.get_auction(_AGENT)
    out: list[dict] = []
    for v in auction.get("validators", [])[: max(1, min(count, 50))]:
        weight = int(v.get("weight", "0"))
        out.append({"public_key": v.get("public_key"), "weight_cspr": round(weight / _MOTES_PER_CSPR, 2)})
    return out


@mcp.tool()
def list_decisions(limit: int = 10) -> list[dict]:
    """Steward's recent on-chain-attested decisions (newest first): the action, the amount it
    proposed vs. actually executed, the rationale, and the on-chain attestation hash/txn. Each
    entry includes a verify_url that recomputes sha256(IPFS reasoning) == the on-chain hash."""
    rows = feed.load_feed()
    rows.sort(key=lambda r: (r.get("epoch") or 0, r.get("timestamp") or 0), reverse=True)
    out: list[dict] = []
    for r in rows[: max(1, min(limit, 100))]:
        dh = r.get("decision_hash")
        out.append(
            {
                "epoch": r.get("epoch"),
                "action": r.get("action"),
                "proposed_cspr": r.get("amount_cspr"),
                "executed_cspr": r.get("executed_cspr"),
                "validator": r.get("validator"),
                "decision_hash": dh,
                "attestation_txn": r.get("attestation_txn"),
                "staking_txn": r.get("staking_txn"),
                "verify_url": f"{_SITE}/api/verify?hash={dh}",
            }
        )
    return out


@mcp.tool()
def get_decision(decision_hash: str) -> dict:
    """Look up one of Steward's attested decisions by its decision_hash — full rationale plus
    links to independently verify it on-chain (recompute the hash) and view it on the explorer."""
    for r in feed.load_feed():
        if r.get("decision_hash") == decision_hash:
            return {
                **r,
                "verify_url": f"{_SITE}/api/verify?hash={decision_hash}",
                "explorer_attestation": f"{_EXPLORER}/transaction/{r.get('attestation_txn')}",
                **(
                    {"explorer_staking": f"{_EXPLORER}/transaction/{r.get('staking_txn')}"}
                    if r.get("staking_txn")
                    else {}
                ),
            }
    return {"error": "no attested decision found with that decision_hash", "decision_hash": decision_hash}


if __name__ == "__main__":
    mcp.run()  # stdio transport by default
