"""Agent loop — one full cycle: perceive -> decide -> risk -> attest -> act (AGNT/STAK).

run_cycle():
  1. PERCEIVE  live on-chain state (balance + validators + delegations).
  2. DECIDE    prompt = strategy.md + observed state -> forced-tool Decision.
               Malformed/refusal -> None -> skip the cycle, log it, NO write (D-05).
  3. RISK      risk.check_decision(decision, observed) — CODE disposes after the
               model proposes (STAK-02). ok / clamped / rejected, all with reasons.
  4. ATTEST    pin {decision, risk_verdict, reasoning, observed_state} to IPFS ->
               CID, compute sha256(pinned bytes), write the Journal attestation
               (chain.record_decision), persist to SQLite. ALWAYS first (STAK-04).
  5. ACT       if the verdict approves a staking move: act.execute -> a real
               native-auction deploy -> chain.confirm -> persist pending->confirmed.
               hold / rejected -> attest only, no deploy.

The attestation ALWAYS precedes the staking deploy (D-03/STAK-04). One in-flight
action at a time (state.pending); the epoch comes from SQLite so a restart never
replays or double-acts (restart-safety).
"""
from __future__ import annotations

import asyncio
import json
from pathlib import Path

from . import act, chain, decide, risk
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


_EXPLORER = "https://testnet.cspr.live/transaction"


def run_cycle(db_path: str | None = None, model: str | None = None) -> dict:
    """Execute exactly ONE perceive -> decide -> risk -> attest -> act cycle.

    Returns a result dict: {epoch, status, decision?, risk?, cid?, hash?, txn?,
    staking_txn?, reason?}. `status` is one of:
      'skipped'   malformed LLM output, NO write (fail-safe);
      'attested'  attested only (hold or risk-rejected) — no staking deploy;
      'acted'     attested AND a staking deploy was confirmed on-chain.
    """
    st = State(db_path)

    # Restart-safety (D-03): refuse to act while a prior deploy is still in flight.
    in_flight = st.pending_deploys()
    if in_flight:
        for p in in_flight:
            print(f"[steward] resolving in-flight deploy from a prior run: {p['txn']}")
            ok = chain.confirm(p["txn"])
            st.clear_pending(p["txn"])
            st.mark_cycle(int(p["epoch"]), "confirmed" if ok else "error")

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

    # 3) RISK — the model proposed; CODE disposes against LIVE state (STAK-02).
    verdict = risk.check_decision(decision, observed)
    print(f"[steward] risk verdict: {verdict.reason}")

    # 4) ATTEST FIRST (STAK-04) — pin the decision + risk verdict + observed state,
    #    write the Journal record. This ALWAYS precedes any staking deploy.
    payload = {
        "decision": decision.model_dump(),
        "risk_verdict": verdict.to_dict(),
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

    print(f"[steward] IPFS CID:        {attestation['cid']}")
    print(f"[steward] on-chain hash:   {attestation['hash']}")
    print(f"[steward] ATTESTATION txn: {attestation['txn']}")
    print(f"[steward] explorer: {_EXPLORER}/{attestation['txn']}")

    result = {
        "epoch": epoch,
        "decision": decision.model_dump(),
        "risk": verdict.to_dict(),
        **attestation,
    }

    # 5) ACT — only an approved, actionable verdict produces a real deploy.
    if not verdict.ok or verdict.action in (None, "hold"):
        st.close()
        why = "hold — no action" if verdict.action == "hold" else verdict.reason
        print(f"[steward] no staking deploy this cycle ({why}). Attested only.")
        result["status"] = "attested"
        return result

    # Approved staking move — execute AFTER the attestation (sequencing).
    try:
        acted = act.execute(verdict, observed, decision=decision)
    except Exception as exc:  # chain/sidecar/resolution failure — attest stands, no deploy.
        st.mark_cycle(epoch, "act_error")
        st.close()
        print(f"[steward] act.execute failed: {exc}. Attestation stands; no deploy.")
        result["status"] = "attested"
        result["reason"] = f"act_failed: {exc}"
        return result

    staking_txn = acted["txn"]
    st.add_pending(staking_txn, kind=acted["action"], epoch=epoch)  # one in-flight (D-03)
    print(
        f"[steward] STAKING deploy: {acted['action']} {verdict.amount_cspr} CSPR "
        f"-> validator {acted['validator']}"
    )
    print(f"[steward] STAKING txn:     {staking_txn}")
    print(f"[steward] explorer: {_EXPLORER}/{staking_txn}")

    # Confirm BEFORE the cycle returns so the next perceive sees fresh state.
    confirmed = chain.confirm(staking_txn)
    st.clear_pending(staking_txn)
    st.mark_cycle(epoch, "confirmed" if confirmed else "error")
    st.close()

    result["staking_txn"] = staking_txn
    result["staking_action"] = acted
    result["status"] = "acted" if confirmed else "act_unconfirmed"
    print(f"[steward] staking deploy {'CONFIRMED' if confirmed else 'NOT confirmed (timeout/failure)'}.")
    return result


if __name__ == "__main__":
    run_cycle()
