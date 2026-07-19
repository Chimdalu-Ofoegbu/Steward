#!/usr/bin/env python
"""Run ONE Steward RWA-allocation cycle: perceive -> decide (allocate_rwa) -> risk ->
attest -> confirm -> mint rwUSD.

    agent/.venv/Scripts/python.exe agent/run_rwa_cycle.py

Prints the IPFS CID, the on-chain decision hash, the Journal (attestation) txn, and —
when the RWA allocation is approved — the rwUSD mint txn. The attestation is recorded
AND confirmed on-chain before any rwUSD is minted (same guarantee as staking).
"""
import sys
from pathlib import Path

# Make `steward` importable when run as a plain script (no install needed).
sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

from steward.loop import run_rwa_cycle  # noqa: E402

if __name__ == "__main__":
    result = run_rwa_cycle()
    sys.exit(0 if result.get("status") in {"attested", "skipped", "acted"} else 1)
