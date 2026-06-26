"""Risk gate — deterministic code that disposes after the model proposes (STAK-02).

THE #1 rule of this project: **the code, not the prompt, is the guardrail.**
`check_decision()` runs AFTER `decide()` returns and validates the LLM's
`Decision` against the mandate using the LIVE observed state (D-01). It never
trusts the model's self-reported sizing; it recomputes everything from the
on-chain snapshot.

Two dispositions:
  - HARD-REJECT  -> the move is disallowed or impossible (action not allowed;
                    non-positive amount for a move; amount > spendable treasury).
                    No deploy happens; the cycle attests the rejection only.
  - CLAMP        -> the move is *directionally* fine but too large (would breach
                    the 40%/validator concentration cap, or exceed MAX_MOVE_CSPR).
                    We REDUCE the amount to the largest compliant value and act
                    safely, rather than skipping the cycle entirely.

`hold` is always OK (no action). Every verdict carries a human-readable reason
so the attested journal tells the model-proposes / code-disposes story.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

# ── Risk limits (module constants — the charter, in code) ────────────────────
MAX_MOVE_CSPR = 10_000.0          # max single move per cycle (no oversized reallocations)
MAX_CONCENTRATION_PCT = 40.0      # max % of total treasury to any one validator
MIN_VALIDATORS = 3                # diversification floor (enforced over cycles by the 40% cap)
FEE_BUFFER_CSPR = 10.0            # keep this much CSPR liquid for gas (delegate ~2.5/txn)

MOTES_PER_CSPR = 1_000_000_000

# Actions the agent is permitted to take at all.
_ALLOWED_ACTIONS = {"delegate", "undelegate", "redelegate", "rebalance", "hold"}
# Actions that move CSPR (and therefore require a positive amount + a deploy).
_MOVE_ACTIONS = {"delegate", "undelegate", "redelegate", "rebalance"}


@dataclass
class RiskVerdict:
    """The deterministic disposition of a Decision.

    ok            True if an on-chain action is approved (possibly clamped).
                  False for a hard-reject. `hold` is ok=True with action='hold'.
    reason        Human-readable explanation (always set) for the journal.
    action        The approved action ('delegate'/'undelegate'/'redelegate'/
                  'rebalance'/'hold') or None on reject.
    validator_hex The resolved target validator (may be None — act.py resolves a
                  concrete key when the LLM left it abstract).
    amount_motes  The COMPLIANT amount in motes to execute (0 for hold/reject).
    clamped       True if the amount was reduced from what the model proposed.
    proposed_cspr The amount the model originally asked for (for the audit trail).
    """

    ok: bool
    reason: str
    action: Optional[str] = None
    validator_hex: Optional[str] = None
    amount_motes: int = 0
    clamped: bool = False
    proposed_cspr: float = 0.0

    @property
    def amount_cspr(self) -> float:
        return round(self.amount_motes / MOTES_PER_CSPR, 6)

    def to_dict(self) -> dict:
        """JSON-serializable form pinned inside the attested payload."""
        return {
            "ok": self.ok,
            "reason": self.reason,
            "action": self.action,
            "validator_hex": self.validator_hex,
            "amount_motes": str(self.amount_motes),
            "amount_cspr": self.amount_cspr,
            "clamped": self.clamped,
            "proposed_cspr": self.proposed_cspr,
            "limits": {
                "max_move_cspr": MAX_MOVE_CSPR,
                "max_concentration_pct": MAX_CONCENTRATION_PCT,
                "min_validators": MIN_VALIDATORS,
                "fee_buffer_cspr": FEE_BUFFER_CSPR,
            },
        }


def _liquid_cspr(observed_state: dict) -> float:
    return float(observed_state.get("treasury", {}).get("balance_cspr", 0.0))


def _staked_total_cspr(observed_state: dict) -> float:
    total = 0.0
    for d in observed_state.get("current_delegations") or []:
        total += float(d.get("amount_cspr", 0.0))
    return total


def _existing_stake_cspr(observed_state: dict, validator_hex: Optional[str]) -> float:
    """How much the treasury already has delegated to `validator_hex` (0 if none)."""
    if not validator_hex:
        return 0.0
    want = validator_hex.lower()
    for d in observed_state.get("current_delegations") or []:
        v = (d.get("validator") or "").lower()
        if v == want:
            return float(d.get("amount_cspr", 0.0))
    return 0.0


def check_decision(decision, observed_state: dict) -> RiskVerdict:
    """Validate a model `Decision` against the mandate using LIVE state (D-01).

    `decision` is a `schema.Decision` (or any object exposing .action,
    .amount_cspr, .validator_to, .validator_from). `observed_state` is the
    perceive() snapshot. Returns a `RiskVerdict`.
    """
    action = getattr(decision, "action", None)
    proposed = float(getattr(decision, "amount_cspr", 0.0) or 0.0)
    validator_to = getattr(decision, "validator_to", None)

    # 1) HARD-REJECT — action not allowed.
    if action not in _ALLOWED_ACTIONS:
        return RiskVerdict(
            ok=False,
            reason=f"REJECT: action '{action}' is not in the allowed set {sorted(_ALLOWED_ACTIONS)}.",
            proposed_cspr=proposed,
        )

    # 2) hold — always OK, no deploy.
    if action == "hold":
        return RiskVerdict(
            ok=True,
            reason="OK: hold — no on-chain action this cycle.",
            action="hold",
            amount_motes=0,
            proposed_cspr=proposed,
        )

    # From here the action moves CSPR, so it needs a positive, affordable amount.
    liquid = _liquid_cspr(observed_state)
    staked = _staked_total_cspr(observed_state)
    spendable = liquid - FEE_BUFFER_CSPR  # keep gas headroom liquid

    # 3) HARD-REJECT — non-positive amount for a move.
    if proposed <= 0:
        return RiskVerdict(
            ok=False,
            reason=f"REJECT: action '{action}' requires a positive amount; got {proposed} CSPR.",
            action=None,
            proposed_cspr=proposed,
        )

    # 4) HARD-REJECT — amount exceeds spendable treasury (treasury − fee buffer).
    #    (delegate/rebalance spend liquid CSPR; we reject anything the treasury
    #     cannot afford while preserving the gas buffer.)
    if action in {"delegate", "rebalance"} and proposed > spendable:
        return RiskVerdict(
            ok=False,
            reason=(
                f"REJECT: requested {proposed} CSPR exceeds spendable treasury "
                f"({liquid} liquid - {FEE_BUFFER_CSPR} fee buffer = {round(spendable, 6)} CSPR)."
            ),
            action=None,
            proposed_cspr=proposed,
        )

    # ── CLAMP path: the move is directionally fine; cap it to the compliant max.
    amount = proposed
    clamp_reasons: list[str] = []

    # 5a) CLAMP — cap any single move at MAX_MOVE_CSPR.
    if amount > MAX_MOVE_CSPR:
        amount = MAX_MOVE_CSPR
        clamp_reasons.append(f"capped to MAX_MOVE_CSPR ({MAX_MOVE_CSPR})")

    # 5b) CLAMP — never spend more than the treasury can afford (delegate/rebalance).
    if action in {"delegate", "rebalance"} and amount > spendable:
        amount = max(spendable, 0.0)
        clamp_reasons.append(f"capped to spendable treasury ({round(spendable, 6)})")

    # 5c) CLAMP — concentration: a delegation must not push any single validator
    #     above MAX_CONCENTRATION_PCT of total treasury (staked + liquid).
    #     total_treasury is the post-move denominator base (delegating moves
    #     liquid->staked, so the total is conserved); we solve for the largest
    #     add that keeps existing+add <= cap% of total.
    if action in {"delegate", "redelegate", "rebalance"}:
        total_treasury = liquid + staked
        existing = _existing_stake_cspr(observed_state, validator_to)
        if total_treasury > 0:
            cap_cspr = (MAX_CONCENTRATION_PCT / 100.0) * total_treasury
            max_add = cap_cspr - existing
            if max_add < 0:
                max_add = 0.0
            if amount > max_add:
                amount = max_add
                clamp_reasons.append(
                    f"capped to {round(max_add, 6)} CSPR so validator stays "
                    f"<= {MAX_CONCENTRATION_PCT}% of {round(total_treasury, 6)} CSPR total treasury"
                )

    amount_motes = int(round(amount * MOTES_PER_CSPR))

    # If clamping drove the amount to (effectively) zero, there is nothing safe to
    # do — treat as a no-op reject so the loop attests but does NOT deploy a 0 move.
    if amount_motes <= 0:
        return RiskVerdict(
            ok=False,
            reason=(
                "REJECT: no compliant amount remains after risk clamping "
                f"({'; '.join(clamp_reasons) or 'amount resolved to 0'})."
            ),
            action=None,
            proposed_cspr=proposed,
        )

    clamped = amount < proposed
    if clamped:
        reason = (
            f"CLAMP: approved {action} of {round(amount, 6)} CSPR "
            f"(model proposed {proposed}); {'; '.join(clamp_reasons)}."
        )
    else:
        reason = f"OK: approved {action} of {round(amount, 6)} CSPR within all risk limits."

    return RiskVerdict(
        ok=True,
        reason=reason,
        action=action,
        validator_hex=validator_to,
        amount_motes=amount_motes,
        clamped=clamped,
        proposed_cspr=proposed,
    )
