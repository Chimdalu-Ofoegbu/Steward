#!/usr/bin/env python
"""Run ONE Steward agent cycle: perceive -> decide -> attest.

    agent/.venv/Scripts/python.exe agent/run_cycle.py

Prints the IPFS CID, the on-chain decision hash, and the Journal record txn.
A malformed/refused LLM decision is skipped with NO on-chain write (fail-safe).
"""
import sys
from pathlib import Path

# Make `steward` importable when run as a plain script (no install needed).
sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

from steward.loop import run_cycle  # noqa: E402

if __name__ == "__main__":
    result = run_cycle()
    sys.exit(0 if result.get("status") in {"attested", "skipped"} else 1)
