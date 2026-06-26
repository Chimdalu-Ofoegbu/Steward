#!/usr/bin/env python
"""Unit tests for the risk gate (STAK-02) — PURE, no network, no chain calls.

Run:
    agent/.venv/Scripts/python.exe agent/tests/test_risk.py

Proves the model-proposes / code-disposes contract on a realistic ~4,314 CSPR
treasury with 0 delegations (the live bootstrapping state):
  - a 4,000 CSPR delegate is CLAMPED to <= 40% (~1,725 CSPR), not rejected;
  - a disallowed action is REJECTED;
  - an amount above the treasury is REJECTED;
  - a non-positive move amount is REJECTED;
  - `hold` passes (ok, no action);
  - a within-limits delegate passes through unchanged.
"""
from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

try:
    sys.stdout.reconfigure(encoding="utf-8")  # em-dashes/unicode in reasons (Windows)
except Exception:
    pass

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from steward import risk  # noqa: E402
from steward.risk import (  # noqa: E402
    FEE_BUFFER_CSPR,
    MAX_CONCENTRATION_PCT,
    MAX_MOVE_CSPR,
    check_decision,
)


@dataclass
class FakeDecision:
    """Stand-in for schema.Decision (risk.py only touches these attrs)."""

    action: str
    amount_cspr: float = 0.0
    validator_to: Optional[str] = None
    validator_from: Optional[str] = None


# Live-ish snapshot: ~4,314 CSPR liquid, 0 delegations (the bootstrapping agent).
TREASURY_CSPR = 4314.0
VAL_A = "0199aabbccddeeff00112233445566778899aabbccddeeff0011223344556677"
VAL_B = "0288776655443322110099aabbccddeeff00112233445566778899aabbcc0011"

OBSERVED = {
    "treasury": {"balance_cspr": TREASURY_CSPR, "balance_motes": str(int(TREASURY_CSPR * 1e9))},
    "current_delegations": [],
    "top_validators": [
        {"public_key": VAL_A, "weight_cspr": 5_000_000.0},
        {"public_key": VAL_B, "weight_cspr": 4_000_000.0},
    ],
    "delegation_count": 0,
}


def _check(label: str, cond: bool) -> bool:
    print(f"  [{'PASS' if cond else 'FAIL'}] {label}")
    return cond


def main() -> int:
    ok = True
    expected_cap = round((MAX_CONCENTRATION_PCT / 100.0) * TREASURY_CSPR, 6)  # ~1725.6
    print(f"Risk limits: MAX_MOVE={MAX_MOVE_CSPR} | MAX_CONC={MAX_CONCENTRATION_PCT}% "
          f"| FEE_BUFFER={FEE_BUFFER_CSPR} | 40%-of-{TREASURY_CSPR} = {expected_cap} CSPR\n")

    # 1) CLAMP: 4,000 CSPR delegate on a 4,314 treasury -> ~1,725 CSPR (40% cap).
    v = check_decision(FakeDecision("delegate", 4000.0, validator_to=VAL_A), OBSERVED)
    print(f"[1] delegate 4000 -> {v.reason}")
    ok &= _check("clamped (not rejected)", v.ok and v.clamped)
    ok &= _check(f"amount clamped to ~{expected_cap} CSPR (<= 40% cap)",
                 abs(v.amount_cspr - expected_cap) < 1.0 and v.amount_cspr <= expected_cap + 0.001)
    ok &= _check("action preserved as delegate", v.action == "delegate")

    # 2) REJECT: disallowed action.
    v = check_decision(FakeDecision("buy_stocks", 100.0), OBSERVED)
    print(f"[2] action=buy_stocks -> {v.reason}")
    ok &= _check("rejected (disallowed action)", (not v.ok) and v.action is None)

    # 3) REJECT: amount above treasury.
    v = check_decision(FakeDecision("delegate", 99999.0, validator_to=VAL_A), OBSERVED)
    print(f"[3] delegate 99999 (> treasury) -> {v.reason}")
    ok &= _check("rejected (exceeds spendable treasury)", not v.ok)

    # 4) REJECT: non-positive amount for a move.
    v = check_decision(FakeDecision("delegate", 0.0, validator_to=VAL_A), OBSERVED)
    print(f"[4] delegate 0 -> {v.reason}")
    ok &= _check("rejected (non-positive amount)", not v.ok)

    # 5) hold passes.
    v = check_decision(FakeDecision("hold", 0.0), OBSERVED)
    print(f"[5] hold -> {v.reason}")
    ok &= _check("hold ok, no action amount", v.ok and v.action == "hold" and v.amount_motes == 0)

    # 6) within-limits delegate passes unchanged.
    v = check_decision(FakeDecision("delegate", 1000.0, validator_to=VAL_A), OBSERVED)
    print(f"[6] delegate 1000 -> {v.reason}")
    ok &= _check("approved unchanged (no clamp)", v.ok and not v.clamped and abs(v.amount_cspr - 1000.0) < 1e-6)

    print(f"\n{'ALL RISK TESTS PASSED' if ok else 'SOME RISK TESTS FAILED'}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
