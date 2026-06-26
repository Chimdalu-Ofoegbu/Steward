"""Decision-feed export (FRNT-02 / D-03).

The agent loop appends each attestation it writes on-chain to a flat JSON file
``deployments/journal_feed.json`` — the canonical, human-readable record of every
decision the agent has attested. The Phase 5 frontend reads this file via
``/api/journal`` and renders one row per entry (newest first); each row is then
independently verifiable on-chain by the Verifier (it does NOT trust this file —
it re-checks the on-chain hash == sha256(raw IPFS bytes)).

Entry shape (one per attested cycle)::

    {
      "epoch": 1,
      "timestamp": 1782434263,
      "action": "delegate",
      "amount_cspr": 4000.0,
      "validator": "0106ca7c…",       # validator_to (or null for hold)
      "confidence": 0.62,
      "rationale": "…",                # model's reasoning (one paragraph)
      "cid": "bafkrei…",               # IPFS CID of the pinned payload
      "decision_hash": "dd639126…",    # sha256 of the EXACT pinned bytes
      "attestation_txn": "71d9efcb…",  # Journal record() deploy hash
      "staking_txn": "992fa9f6…"       # native-auction deploy hash, or null
    }

The feed is append-only and de-duplicated by ``decision_hash`` so a restart /
re-export never produces duplicate rows.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Optional

# deployments/ lives two levels up from agent/ (…/Steward/deployments).
_REPO = Path(__file__).resolve().parents[3]  # …/Steward
FEED_PATH = _REPO / "deployments" / "journal_feed.json"


def load_feed(path: str | Path | None = None) -> list[dict[str, Any]]:
    """Read the feed file (newest-first order is the caller's concern). Missing or
    malformed file → empty list (the frontend renders an honest empty state)."""
    p = Path(path) if path else FEED_PATH
    if not p.exists():
        return []
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError):
        return []


def _write_feed(rows: list[dict[str, Any]], path: str | Path | None = None) -> None:
    p = Path(path) if path else FEED_PATH
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(rows, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def append_entry(entry: dict[str, Any], path: str | Path | None = None) -> None:
    """Append one attestation entry, de-duplicating by ``decision_hash``."""
    rows = load_feed(path)
    h = entry.get("decision_hash")
    rows = [r for r in rows if r.get("decision_hash") != h]
    rows.append(entry)
    # Store ascending by epoch on disk; the API/UI reverses to newest-first.
    rows.sort(key=lambda r: (r.get("epoch") or 0, r.get("timestamp") or 0))
    _write_feed(rows, path)


def build_entry(
    *,
    epoch: int,
    action: str,
    amount_cspr: float,
    validator: Optional[str],
    confidence: float,
    rationale: str,
    cid: str,
    decision_hash: str,
    attestation_txn: str,
    staking_txn: Optional[str] = None,
    timestamp: Optional[int] = None,
) -> dict[str, Any]:
    """Assemble a feed entry from a completed attestation cycle."""
    import time as _time

    return {
        "epoch": epoch,
        "timestamp": timestamp if timestamp is not None else int(_time.time()),
        "action": action,
        "amount_cspr": amount_cspr,
        "validator": validator,
        "confidence": confidence,
        "rationale": rationale,
        "cid": cid,
        "decision_hash": decision_hash,
        "attestation_txn": attestation_txn,
        "staking_txn": staking_txn,
    }
