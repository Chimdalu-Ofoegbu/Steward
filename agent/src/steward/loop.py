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

from . import act, chain, decide, feed, risk
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
    # H1 / STAK-04 (hardened): CONFIRM the attestation landed on-chain BEFORE any staking
    # move, so "attested before it acts" means confirmed-before, not merely submitted-before.
    attest_ok = chain.confirm(attestation["txn"])
    st.mark_cycle(epoch, "attested" if attest_ok else "attest_unconfirmed")

    # FRNT-02 — append to the decision feed the frontend renders. executed_cspr stays None
    # here (nothing has moved yet); staking_txn + executed_cspr are filled below once (if) a
    # deploy confirms. Append now so a hold/rejected cycle still shows up (dedup by hash).
    feed.append_entry(feed.build_entry(
        epoch=epoch,
        action=decision.action,
        amount_cspr=decision.amount_cspr,
        executed_cspr=None,
        validator=decision.validator_to,
        confidence=decision.confidence,
        rationale=decision.rationale,
        cid=attestation["cid"],
        decision_hash=attestation["hash"],
        attestation_txn=attestation["txn"],
        staking_txn=None,
    ))

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

    # H1 fail-safe: if the attestation did not confirm on-chain, do NOT act — there would be
    # no valid on-chain record preceding the move. The attestation stands as submitted.
    if not attest_ok:
        st.close()
        print("[steward] attestation NOT confirmed on-chain -> skipping staking deploy (fail-safe).")
        result["status"] = "attest_unconfirmed"
        result["reason"] = "attestation_unconfirmed"
        return result

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

    # Re-append the feed entry with the staking txn + the EXECUTED (risk-clamped) amount now
    # known (dedup by hash). executed_cspr is what actually moved on-chain — may be < proposed.
    feed.append_entry(feed.build_entry(
        epoch=epoch,
        action=decision.action,
        amount_cspr=decision.amount_cspr,
        executed_cspr=verdict.amount_cspr,
        validator=acted.get("validator") or decision.validator_to,
        confidence=decision.confidence,
        rationale=decision.rationale,
        cid=attestation["cid"],
        decision_hash=attestation["hash"],
        attestation_txn=attestation["txn"],
        staking_txn=staking_txn,
    ))
    st.close()

    result["staking_txn"] = staking_txn
    result["staking_action"] = acted
    result["status"] = "acted" if confirmed else "act_unconfirmed"
    print(f"[steward] staking deploy {'CONFIRMED' if confirmed else 'NOT confirmed (timeout/failure)'}.")
    return result


_RWA_FOCUS = (
    "\n\n---\n## This cycle: tokenized-RWA allocation\n"
    "Casper's roadmap is RWA-first. Steward holds a mock RWA stablecoin, **rwUSD** "
    "(a CEP-18 token live on Casper testnet). For THIS cycle choose the **allocate_rwa** "
    "action: decide how much rwUSD to allocate (mint), in CSPR-equivalent units, to move "
    "the treasury toward a prudent tokenized-RWA position, staying within the RWA cap "
    "(<= 30% of treasury). Call submit_decision with action=\"allocate_rwa\", "
    "amount_cspr = the rwUSD amount to allocate, and a rationale grounded in the observed "
    "treasury state. (This is a mock token; the mainnet path is a compliant, permissioned "
    "ERC-3643-style RWA token.)"
)


def run_rwa_cycle(db_path: str | None = None, model: str | None = None) -> dict:
    """One tokenized-RWA allocation cycle: perceive -> decide (allocate_rwa) -> risk ->
    ATTEST (Journal) -> confirm -> mint rwUSD -> record in the feed.

    Same attest-first guarantee as staking (STAK-04): the decision is recorded on-chain,
    and confirmed, BEFORE any rwUSD is minted.
    """
    st = State(db_path)
    epoch = st.next_epoch()
    print(f"[steward-rwa] cycle epoch={epoch} — perceiving live chain state...")

    observed = perceive()
    prompt = _build_prompt(_load_strategy(), observed) + _RWA_FOCUS
    decision = asyncio.run(decide.decide(prompt, model=model))
    if decision is None:
        st.mark_cycle(epoch, "skipped")
        st.close()
        print("[steward-rwa] decision malformed/refused -> SKIP cycle, no on-chain write (fail-safe).")
        return {"epoch": epoch, "status": "skipped", "reason": "malformed_or_refusal"}

    print(f"[steward-rwa] decision: action={decision.action} amount={decision.amount_cspr} confidence={decision.confidence}")
    print(f"[steward-rwa] rationale: {decision.rationale}")

    verdict = risk.check_decision(decision, observed)
    print(f"[steward-rwa] risk verdict: {verdict.reason}")

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
        cid=attestation["cid"], hash_hex=attestation["hash"], txn=attestation["txn"],
        action_kind=decision.action, epoch=epoch,
    )
    attest_ok = chain.confirm(attestation["txn"])
    st.mark_cycle(epoch, "attested" if attest_ok else "attest_unconfirmed")
    feed.append_entry(feed.build_entry(
        epoch=epoch, action=decision.action, amount_cspr=decision.amount_cspr, executed_cspr=None,
        validator=None, confidence=decision.confidence, rationale=decision.rationale,
        cid=attestation["cid"], decision_hash=attestation["hash"], attestation_txn=attestation["txn"], staking_txn=None,
    ))
    print(f"[steward-rwa] IPFS CID:        {attestation['cid']}")
    print(f"[steward-rwa] on-chain hash:   {attestation['hash']}")
    print(f"[steward-rwa] ATTESTATION txn: {attestation['txn']}")
    print(f"[steward-rwa] explorer: {_EXPLORER}/{attestation['txn']}")

    result = {"epoch": epoch, "decision": decision.model_dump(), "risk": verdict.to_dict(), **attestation}

    if not attest_ok:
        st.close()
        print("[steward-rwa] attestation NOT confirmed on-chain -> skipping rwUSD mint (fail-safe).")
        result["status"] = "attest_unconfirmed"
        return result
    if not verdict.ok or verdict.action != "allocate_rwa":
        st.close()
        print(f"[steward-rwa] no rwUSD mint this cycle ({verdict.reason}). Attested only.")
        result["status"] = "attested"
        return result

    try:
        acted = act.execute(verdict, observed, decision=decision)
    except Exception as exc:
        st.mark_cycle(epoch, "act_error")
        st.close()
        print(f"[steward-rwa] act.execute (mint) failed: {exc}. Attestation stands; no mint.")
        result["status"] = "attested"
        result["reason"] = f"act_failed: {exc}"
        return result

    mint_txn = acted["txn"]
    print(f"[steward-rwa] rwUSD MINT: {verdict.amount_cspr} rwUSD  txn={mint_txn}")
    print(f"[steward-rwa] explorer: {_EXPLORER}/{mint_txn}")
    confirmed = chain.confirm(mint_txn)
    st.mark_cycle(epoch, "confirmed" if confirmed else "error")
    feed.append_entry(feed.build_entry(
        epoch=epoch, action=decision.action, amount_cspr=decision.amount_cspr, executed_cspr=verdict.amount_cspr,
        validator=None, confidence=decision.confidence, rationale=decision.rationale,
        cid=attestation["cid"], decision_hash=attestation["hash"], attestation_txn=attestation["txn"], staking_txn=mint_txn,
    ))
    st.close()
    result["staking_txn"] = mint_txn
    result["status"] = "acted" if confirmed else "act_unconfirmed"
    print(f"[steward-rwa] rwUSD mint {'CONFIRMED' if confirmed else 'NOT confirmed (timeout/failure)'}.")
    return result


if __name__ == "__main__":
    run_cycle()
