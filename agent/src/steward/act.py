"""Act — turn a risk-approved verdict into a REAL native-auction deploy (STAK-01).

`execute()` maps an approved `RiskVerdict` to `chain.delegate/undelegate/
redelegate` (D-02). It resolves the concrete validator public key:
  - if the decision/verdict already carries a concrete hex, use it;
  - otherwise pick the lowest-concentration top validator from the LIVE observed
    state (so a fresh delegation diversifies rather than piling onto one node).

It submits exactly ONE deploy and returns its txn hash. One in-flight deploy at
a time is enforced by the caller (loop.run_cycle via state.pending). `rebalance`
without explicit validators is treated as a delegate toward the
lowest-concentration validator (the safe diversifying default for the MVP).
"""
from __future__ import annotations

from typing import Optional

from . import chain
from .risk import RiskVerdict


def _looks_like_validator_hex(s: Optional[str]) -> bool:
    """A concrete Casper public key hex: 64-66 hex chars with a 01/02 algo tag."""
    if not s or not isinstance(s, str):
        return False
    s = s.strip()
    if not s.startswith(("01", "02")):
        return False
    if len(s) < 64:
        return False
    try:
        int(s, 16)
    except ValueError:
        return False
    return True


def _lowest_concentration_validator(observed_state: dict) -> Optional[str]:
    """Pick a top validator the treasury has the LEAST stake with (diversify).

    Iterate the top validators (already weight-ranked by perceive) and choose the
    one with the smallest existing treasury delegation; ties break toward the
    higher-weight (earlier) validator. Returns its public key hex, or None if no
    validators are visible.
    """
    validators = observed_state.get("top_validators") or []
    if not validators:
        return None

    existing: dict[str, float] = {}
    for d in observed_state.get("current_delegations") or []:
        v = (d.get("validator") or "").lower()
        if v:
            existing[v] = existing.get(v, 0.0) + float(d.get("amount_cspr", 0.0))

    best_key: Optional[str] = None
    best_stake = float("inf")
    for v in validators:
        pk = v.get("public_key")
        if not pk:
            continue
        stake = existing.get(pk.lower(), 0.0)
        if stake < best_stake:
            best_stake = stake
            best_key = pk
    return best_key


def resolve_validator(verdict: RiskVerdict, observed_state: dict) -> Optional[str]:
    """The concrete validator hex to act on: verdict's own key if concrete, else
    the lowest-concentration top validator."""
    if _looks_like_validator_hex(verdict.validator_hex):
        return verdict.validator_hex.strip()
    return _lowest_concentration_validator(observed_state)


def execute(verdict: RiskVerdict, observed_state: dict, decision=None) -> dict:
    """Submit the native-auction deploy for an approved staking verdict.

    Returns {action, validator, validator_from?, amount_motes, txn}. Raises
    chain.ChainError on a sidecar/RPC failure (the caller surfaces it).
    """
    if not verdict.ok or verdict.action in (None, "hold"):
        raise ValueError("act.execute called on a non-actionable verdict (hold/reject)")

    action = verdict.action
    amount_motes = verdict.amount_motes
    if amount_motes <= 0:
        raise ValueError(f"act.execute: non-positive amount_motes={amount_motes}")

    if action == "undelegate":
        # Withdraw from the decision's validator_from (or the verdict target).
        src = None
        if decision is not None and _looks_like_validator_hex(getattr(decision, "validator_from", None)):
            src = decision.validator_from.strip()
        elif _looks_like_validator_hex(verdict.validator_hex):
            src = verdict.validator_hex.strip()
        if not src:
            raise ValueError("undelegate requires a concrete validator_from")
        txn = chain.undelegate(src, amount_motes)
        return {"action": action, "validator": src, "amount_motes": amount_motes, "txn": txn}

    if action == "redelegate":
        # Move from validator_from -> validator_to. Need both concrete.
        old = None
        if decision is not None and _looks_like_validator_hex(getattr(decision, "validator_from", None)):
            old = decision.validator_from.strip()
        new = resolve_validator(verdict, observed_state)
        if not old:
            raise ValueError("redelegate requires a concrete validator_from")
        if not new:
            raise ValueError("redelegate requires a resolvable validator_to")
        txn = chain.redelegate(old, new, amount_motes)
        return {
            "action": action,
            "validator_from": old,
            "validator": new,
            "amount_motes": amount_motes,
            "txn": txn,
        }

    # delegate / rebalance -> a (diversifying) delegate to the resolved validator.
    validator = resolve_validator(verdict, observed_state)
    if not validator:
        raise ValueError(f"{action} could not resolve a target validator from observed state")
    txn = chain.delegate(validator, amount_motes)
    return {"action": action, "validator": validator, "amount_motes": amount_motes, "txn": txn}
