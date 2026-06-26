"""State — restart-safe SQLite persistence for the agent loop (D-04).

Persists: the last processed epoch/cycle, recorded attestations (cid, hash,
txn), and pending deploys — so a crash/restart never double-acts or replays
(judges may restart the agent). The DB file `agent/steward.db` is gitignored
(*.db).

Schema:
  cycles       (epoch INTEGER PK, started_at, status)         -- monotonic counter
  attestations (cid PK, hash, txn, action_kind, epoch, at)    -- processed records
  pending      (txn PK, kind, epoch, created_at)              -- in-flight deploys

The `epoch` is the monotonically-increasing cycle counter written to the Journal
`epoch: u64` field; `next_epoch()` reserves the next value atomically.
"""
from __future__ import annotations

import sqlite3
import time
from pathlib import Path

# DB lives next to the agent package root (.../agent/steward.db); gitignored (*.db).
_AGENT = Path(__file__).resolve().parents[2]  # .../Steward/agent
DEFAULT_DB = _AGENT / "steward.db"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS cycles (
    epoch      INTEGER PRIMARY KEY,
    started_at INTEGER NOT NULL,
    status     TEXT    NOT NULL DEFAULT 'started'
);
CREATE TABLE IF NOT EXISTS attestations (
    cid         TEXT PRIMARY KEY,
    hash        TEXT NOT NULL,
    txn         TEXT,
    action_kind TEXT,
    epoch       INTEGER,
    recorded_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS pending (
    txn        TEXT PRIMARY KEY,
    kind       TEXT,
    epoch      INTEGER,
    created_at INTEGER NOT NULL
);
"""


class State:
    """Thin SQLite wrapper. One instance per process; safe to reopen after restart."""

    def __init__(self, db_path: str | Path | None = None):
        self.path = Path(db_path) if db_path else DEFAULT_DB
        self._conn = sqlite3.connect(str(self.path))
        self._conn.row_factory = sqlite3.Row
        self._conn.executescript(_SCHEMA)
        self._conn.commit()

    # ── Epoch / cycle ────────────────────────────────────────────────────────
    def last_epoch(self) -> int:
        row = self._conn.execute("SELECT MAX(epoch) AS e FROM cycles").fetchone()
        return int(row["e"]) if row and row["e"] is not None else 0

    def next_epoch(self) -> int:
        """Reserve and return the next monotonic epoch (records a 'started' cycle)."""
        epoch = self.last_epoch() + 1
        self._conn.execute(
            "INSERT INTO cycles (epoch, started_at, status) VALUES (?, ?, 'started')",
            (epoch, int(time.time())),
        )
        self._conn.commit()
        return epoch

    def mark_cycle(self, epoch: int, status: str) -> None:
        """Set a cycle's status (e.g. 'attested', 'skipped', 'error')."""
        self._conn.execute("UPDATE cycles SET status = ? WHERE epoch = ?", (status, epoch))
        self._conn.commit()

    # ── Attestations ─────────────────────────────────────────────────────────
    def record_attestation(self, cid: str, hash_hex: str, txn: str, action_kind: str, epoch: int) -> None:
        self._conn.execute(
            "INSERT OR REPLACE INTO attestations (cid, hash, txn, action_kind, epoch, recorded_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (cid, hash_hex, txn, action_kind, epoch, int(time.time())),
        )
        self._conn.commit()

    def was_processed(self, cid: str) -> bool:
        """True if this CID was already attested (replay guard)."""
        row = self._conn.execute("SELECT 1 FROM attestations WHERE cid = ?", (cid,)).fetchone()
        return row is not None

    # ── Pending deploys ──────────────────────────────────────────────────────
    def add_pending(self, txn: str, kind: str, epoch: int) -> None:
        self._conn.execute(
            "INSERT OR REPLACE INTO pending (txn, kind, epoch, created_at) VALUES (?, ?, ?, ?)",
            (txn, kind, epoch, int(time.time())),
        )
        self._conn.commit()

    def clear_pending(self, txn: str) -> None:
        self._conn.execute("DELETE FROM pending WHERE txn = ?", (txn,))
        self._conn.commit()

    def pending_deploys(self) -> list[dict]:
        rows = self._conn.execute("SELECT txn, kind, epoch, created_at FROM pending").fetchall()
        return [dict(r) for r in rows]

    def close(self) -> None:
        self._conn.close()
