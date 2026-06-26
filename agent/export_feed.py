#!/usr/bin/env python3
"""Rebuild ``deployments/journal_feed.json`` (FRNT-02 / D-03).

Two jobs:

  1. **Seed** the feed with the REAL attestations the agent has already posted on
     Casper testnet (epochs 1 + 2), so the Phase 5 frontend renders live,
     independently-verifiable data immediately. Each seed's ``decision_hash`` is
     the sha256 of the exact pinned IPFS bytes — re-confirmed by the Verifier.

  2. **Rebuild** the feed from the agent's SQLite state (``agent/steward.db``):
     for every attestation row, fetch the pinned payload from the IPFS gateway and
     extract amount/validator/confidence/rationale, then merge into the feed
     (dedup by ``decision_hash``). DB rows that overlap a seed are merged, not
     duplicated.

Usage::

    python agent/export_feed.py            # seed + rebuild from SQLite (if present)
    python agent/export_feed.py --seed-only

The feed is the agent's real output; every row remains verifiable on-chain.
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.request
from pathlib import Path

# Make the package importable when run as a script.
sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

from steward import feed  # noqa: E402

_REPO = Path(__file__).resolve().parent.parent  # …/Steward
_DB = Path(__file__).resolve().parent / "steward.db"
_GATEWAY = "https://gateway.pinata.cloud/ipfs"

# ── The two REAL attestations already on testnet (verified raw-bytes sha256). ──
SEEDS = [
    {
        "epoch": 1,
        "timestamp": 1782434263,
        "action": "delegate",
        "amount_cspr": 4000.0,
        "validator": "0106ca7c39cd272dbf21a86eeb3b36b7c26e2e9b94af64292419f7862936bca2ca",
        "confidence": 0.62,
        "rationale": (
            "Treasury is fully idle (0 delegations, ~4,314 CSPR). Bootstrapping "
            "staking with a single delegation this cycle into the top active "
            "validator by weight (~44.6M CSPR), a well-established anchor for an "
            "initial position. Sizing at 4,000 CSPR stays under the 10,000 CSPR "
            "per-cycle move cap and leaves ~314 CSPR for fees/buffer. Diversification "
            "(3+ validators, 40% cap) is built out in subsequent cycles as more idle "
            "balance allows."
        ),
        "cid": "bafkreig5moismks3oowxrrce55r2cx2i24clnmdvgl3pfa2ohrtyz76sbi",
        "decision_hash": "dd6391262a5b73ad78c444ef63a15f48d704b6b07532f6f2834e3c678cffd20a",
        "attestation_txn": "71d9efcb21c886c65c470e07878420cc19b7a045d604fcd90932ddb444dd0d65",
        "staking_txn": None,
    },
    {
        "epoch": 2,
        "timestamp": 1782434985,
        "action": "delegate",
        "amount_cspr": 1700.0,
        "validator": "0106ca7c39cd272dbf21a86eeb3b36b7c26e2e9b94af64292419f7862936bca2ca",
        "confidence": 0.8,
        "rationale": (
            "Treasury holds 4,312.77 CSPR fully idle with zero delegations — no yield "
            "is being earned. To begin productively staking while respecting the 40% "
            "single-validator cap (~1,725 CSPR), I delegate 1,700 CSPR to the "
            "highest-weight active validator (44.6M CSPR). Well under the 10k "
            "per-cycle limit, leaving a ~2,600 CSPR liquid buffer for gas and for "
            "subsequent cycles where 2–3 more validators are added to satisfy the "
            "diversification floor."
        ),
        "cid": "bafkreigyi2n7ry4djtdh3zntlfnql7zuehkht25xddgxayixb75sy75l34",
        "decision_hash": "d8469bf8e3834cc67de5b3595b05ff3421d479ebb718cd7061170ffb2c7fabdf",
        "attestation_txn": "cdc4c7f2f2aa114c949cdec8cacd9d9704da4f0731ebac7450ee1d78387fb1bf",
        "staking_txn": "992fa9f63e5c5378483ac17929e068e0d38d5c2172ef7f98dbc9ac266f1b12ea",
    },
]


def _fetch_payload(cid: str) -> dict | None:
    try:
        with urllib.request.urlopen(f"{_GATEWAY}/{cid}", timeout=30) as r:  # nosec B310
            return json.loads(r.read().decode("utf-8"))
    except Exception:  # noqa: BLE001 — best-effort enrichment
        return None


def _from_sqlite() -> list[dict]:
    """Reconstruct feed entries from the attestations table, enriching each from IPFS."""
    if not _DB.exists():
        return []
    import sqlite3

    conn = sqlite3.connect(str(_DB))
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            "SELECT cid, hash, txn, action_kind, epoch, recorded_at FROM attestations"
        ).fetchall()
    except sqlite3.OperationalError:
        return []
    finally:
        conn.close()

    entries: list[dict] = []
    for r in rows:
        payload = _fetch_payload(r["cid"]) or {}
        decision = payload.get("decision", {}) if isinstance(payload, dict) else {}
        observed = payload.get("observed_state", {}) if isinstance(payload, dict) else {}
        entries.append(feed.build_entry(
            epoch=int(r["epoch"]) if r["epoch"] is not None else 0,
            action=r["action_kind"] or decision.get("action") or "hold",
            amount_cspr=float(decision.get("amount_cspr") or 0.0),
            validator=decision.get("validator_to"),
            confidence=float(decision.get("confidence") or 0.0),
            rationale=decision.get("rationale") or "",
            cid=r["cid"],
            decision_hash=r["hash"],
            attestation_txn=r["txn"],
            staking_txn=None,
            timestamp=observed.get("timestamp") or r["recorded_at"],
        ))
    return entries


def main() -> int:
    ap = argparse.ArgumentParser(description="Rebuild deployments/journal_feed.json")
    ap.add_argument("--seed-only", action="store_true", help="write only the known real attestations")
    args = ap.parse_args()

    # Start fresh from the seeds (the canonical real records).
    feed._write_feed([])  # type: ignore[attr-defined]
    for s in SEEDS:
        feed.append_entry(s)

    if not args.seed_only:
        for e in _from_sqlite():
            feed.append_entry(e)

    out = feed.load_feed()
    print(f"wrote {feed.FEED_PATH} ({len(out)} rows)")
    for e in out:
        print(f"  epoch {e['epoch']}: {e['action']} {e['amount_cspr']} CSPR · {e['decision_hash'][:12]}…")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
