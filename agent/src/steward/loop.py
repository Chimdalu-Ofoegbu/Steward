"""Agent loop — one full cycle: perceive -> decide -> attest (AGNT-01..06).

run_cycle():
  1. PERCEIVE  live on-chain state (balance + validators + delegations).
  2. DECIDE    prompt = strategy.md + observed state -> forced-tool Decision.
               Malformed/refusal -> None -> skip the cycle, log it, NO write (D-05).
  3. ATTEST    pin {decision, reasoning, observed_state} to IPFS -> CID,
               compute sha256(pinned bytes), write the Journal attestation
               (chain.record_decision), persist to SQLite.

Phase 3 produces + attests the decision; it does NOT yet execute the staking
deploy (that is Phase 4). One in-flight action at a time; the epoch comes from
SQLite so a restart never replays (restart-safety).
"""
from __future__ import annotations

import asyncio
import json
from pathlib import Path

from . import chain, decide
from .perceive import perceive
from .state import State

_AGENT = Path(__file__).resolve().parents[2]  # .../Steward/agent
_STRATEGY = _AGENT / "strategy.md"


def _load_strategy() -> str:
    return _STRATEGY.read_text(encoding="utf-8")


def _build_prompt(strategy: str, observed: dict) -> str:
    """Combine the versioned mandate with the live observed-state snapshot."""
    return (
        f"{strategy}\n\n"
        "---\n"
        "## Observed state (live from Casper testnet)\n\n"
        "```json\n"
        f"{json.dumps(observed, indent=2, sort_keys=True)}\n"
        "```\n\n"
        "Decide this cycle's single treasury action by calling `submit_decision`. "
        "Stay within every risk limit above and ground your rationale in this snapshot."
    )


def run_cycle(db_path: str | None = None, model: str | None = None) -> dict:
    """Execute exactly ONE perceive -> decide -> attest cycle.

    Returns a result dict: {epoch, status, decision?, cid?, hash?, txn?, reason?}.
    `status` is one of: 'attested' (on-chain write done) | 'skipped' (malformed
    LLM output, NO write).
    """
    st = State(db_path)
    epoch = st.next_epoch()
    print(f"[steward] cycle epoch={epoch} — perceiving live chain state...")

    # 1) PERCEIVE
    observed = perceive()
    bal = observed["treasury"]["balance_cspr"]
    print(
        f"[steward] treasury={bal} CSPR | validators={len(observed['top_validators'])} "
        f"| delegations={observed['delegation_count']} | block={observed['block_height']}"
    )

    # 2) DECIDE (forced tool -> validated Decision, or None)
    prompt = _build_prompt(_load_strategy(), observed)
    decision = asyncio.run(decide.decide(prompt, model=model))
    if decision is None:
        st.mark_cycle(epoch, "skipped")
        st.close()
        print("[steward] decision malformed/refused -> SKIP cycle, no on-chain write (fail-safe).")
        return {"epoch": epoch, "status": "skipped", "reason": "malformed_or_refusal"}

    print(
        f"[steward] decision: action={decision.action} amount={decision.amount_cspr} "
        f"confidence={decision.confidence}"
    )
    print(f"[steward] rationale: {decision.rationale}")

    # 3) ATTEST — pin the full reasoning + observed-state, write the Journal record.
    payload = {
        "decision": decision.model_dump(),
        "reasoning": decision.rationale,
        "observed_state": observed,
        "strategy_version": "v1",
        "epoch": epoch,
    }
    attestation = chain.record_decision(payload, action_kind=decision.action, epoch=epoch)

    st.record_attestation(
        cid=attestation["cid"],
        hash_hex=attestation["hash"],
        txn=attestation["txn"],
        action_kind=decision.action,
        epoch=epoch,
    )
    st.mark_cycle(epoch, "attested")
    st.close()

    print(f"[steward] IPFS CID:        {attestation['cid']}")
    print(f"[steward] on-chain hash:   {attestation['hash']}")
    print(f"[steward] Journal record txn: {attestation['txn']}")
    print(f"[steward] explorer: https://testnet.cspr.live/transaction/{attestation['txn']}")

    return {
        "epoch": epoch,
        "status": "attested",
        "decision": decision.model_dump(),
        **attestation,
    }


if __name__ == "__main__":
    run_cycle()
