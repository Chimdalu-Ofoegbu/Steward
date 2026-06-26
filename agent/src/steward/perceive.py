"""Perceive — read live on-chain state into a clean observed-state snapshot.

AGNT-01/02. Reads (all live from Casper testnet via the chain layer):
  - the agent's CSPR balance (chain.get_balance)
  - the validator set (top-N by weight) + the agent's current delegations,
    from the native auction (chain.get_auction)

Returns a JSON-serializable dict the decide step prompts on and the attest step
pins to IPFS (so a verifier can replay exactly what the agent saw).
"""
from __future__ import annotations

import time

from . import chain

MOTES_PER_CSPR = 1_000_000_000


def _motes_to_cspr(motes: int) -> float:
    return round(motes / MOTES_PER_CSPR, 6)


def perceive(top_n: int = 10, agent_pubkey_hex: str | None = None) -> dict:
    """Build the observed-state snapshot for one cycle.

    `top_n` bounds the validator list passed to the model. Balances are reported
    in both motes (exact) and CSPR (human). Timestamp is UTC epoch seconds.
    """
    agent = agent_pubkey_hex or chain.agent_public_key_hex()
    if not agent:
        raise RuntimeError("agent public key unknown (deployments/testnet.json or AGENT_PUBLIC_KEY_HEX)")

    balance_motes = chain.get_balance(agent)
    auction = chain.get_auction(agent)

    validators = []
    for v in (auction.get("validators") or [])[:top_n]:
        weight_motes = int(v.get("weight", "0"))
        validators.append(
            {
                "public_key": v.get("public_key"),
                "weight_motes": str(weight_motes),
                "weight_cspr": _motes_to_cspr(weight_motes),
            }
        )

    delegations = []
    for d in auction.get("delegations") or []:
        amt = int(d.get("amount_motes", "0"))
        delegations.append(
            {
                "validator": d.get("validator"),
                "amount_motes": str(amt),
                "amount_cspr": _motes_to_cspr(amt),
            }
        )

    return {
        "timestamp": int(time.time()),
        "block_height": auction.get("block_height"),
        "network": chain.NETWORK,
        "agent_public_key_hex": agent,
        "treasury": {
            "balance_motes": str(balance_motes),
            "balance_cspr": _motes_to_cspr(balance_motes),
        },
        "top_validators": validators,
        "current_delegations": delegations,
        "delegation_count": len(delegations),
    }
