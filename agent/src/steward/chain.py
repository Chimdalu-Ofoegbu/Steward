"""Steward chain layer — Casper 2.0 "Condor" testnet.

THE single chain seam for the whole project. The Python brain calls the Node
`casper-js-sdk` v5 sidecar (agent/sidecar/chain.mjs) via subprocess; Phases 3-4
import these functions unchanged, and the Phase-5 frontend shares the same SDK.

Chosen because pycspr 1.2.0 is Deploy-only (no Casper 2.0 Transactions) and the
casper-client Rust CLI does not build on Windows. See
.planning/phases/01-toolchain-reality-check/01-RESEARCH.md.
"""
from __future__ import annotations

import json
import os
import subprocess
import time
from pathlib import Path

from dotenv import load_dotenv

# Resolve everything against the repo root so chain.py works from any cwd.
_REPO = Path(__file__).resolve().parents[3]  # .../Steward
load_dotenv(_REPO / ".env")  # no-op if .env absent; real secrets only live there

RPC = os.environ.get("CASPER_NODE_RPC", "https://node.testnet.casper.network/rpc")
NETWORK = os.environ.get("CASPER_NETWORK_NAME", "casper-test")

_sk = os.environ.get("AGENT_SECRET_KEY_PATH", "./secrets/secret_key.pem")
_SK_ABS = _sk if os.path.isabs(_sk) else str((_REPO / _sk).resolve())

_sidecar = os.environ.get("STEWARD_SIDECAR", "agent/sidecar/chain.mjs")
_SIDECAR_ABS = _sidecar if os.path.isabs(_sidecar) else str((_REPO / _sidecar).resolve())


class ChainError(RuntimeError):
    """A sidecar/chain operation failed."""


def _run(verb: str, *args: object, timeout: int = 60) -> dict:
    env = {
        **os.environ,
        "CASPER_NODE_RPC": RPC,
        "CASPER_NETWORK_NAME": NETWORK,
        "AGENT_SECRET_KEY_PATH": _SK_ABS,
    }
    proc = subprocess.run(
        ["node", _SIDECAR_ABS, verb, *(str(a) for a in args)],
        capture_output=True,
        text=True,
        cwd=str(_REPO),
        env=env,
        timeout=timeout,
    )
    if proc.returncode != 0:
        raise ChainError(f"sidecar '{verb}' failed: {(proc.stderr or proc.stdout).strip()}")
    return json.loads(proc.stdout.strip().splitlines()[-1])


# ── Reads ────────────────────────────────────────────────────────────────────
def get_balance(public_key_hex: str) -> int:
    """CSPR balance in motes (1 CSPR = 1e9 motes). 0 if the account is unfunded."""
    return int(_run("balance", public_key_hex)["motes"])


def account_hash(public_key_hex: str) -> str:
    """Hex account hash for a public key (no `account-hash-` prefix)."""
    return _run("account-hash", public_key_hex)["account_hash_hex"]


# ── Writes (sign with AGENT_SECRET_KEY_PATH) ─────────────────────────────────
def transfer(target_public_key_hex: str, amount_motes: int) -> str:
    """Submit a native CSPR transfer; return the transaction hash."""
    return _run("transfer", target_public_key_hex, amount_motes, timeout=120)["transaction_hash"]


def delegate(validator_public_key_hex: str, amount_motes: int) -> str:
    """Phase 4 (STAK-01): delegate CSPR to a validator; return the transaction hash."""
    return _run("delegate", validator_public_key_hex, amount_motes, timeout=120)["transaction_hash"]


def undelegate(validator_public_key_hex: str, amount_motes: int) -> str:
    """Phase 4: undelegate CSPR from a validator; return the transaction hash."""
    return _run("undelegate", validator_public_key_hex, amount_motes, timeout=120)["transaction_hash"]


def redelegate(old_validator_hex: str, new_validator_hex: str, amount_motes: int) -> str:
    """Phase 4 (STAK-03): move stake between validators; return the transaction hash."""
    return _run("redelegate", old_validator_hex, new_validator_hex, amount_motes, timeout=120)["transaction_hash"]


# ── Confirmation ─────────────────────────────────────────────────────────────
def confirm(txn_hash: str, timeout_s: int = 180, poll_s: int = 5) -> bool:
    """Poll until the transaction is executed. True on Success, False on failure/timeout."""
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        res = _run("confirm", txn_hash)
        if res.get("found"):
            return bool(res.get("success"))
        time.sleep(poll_s)
    return False
