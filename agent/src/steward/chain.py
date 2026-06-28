"""Steward chain layer — Casper 2.0 "Condor" testnet.

THE single chain seam for the whole project. The Python brain calls the Node
`casper-js-sdk` v5 sidecar (agent/sidecar/chain.mjs) via subprocess; Phases 3-4
import these functions unchanged, and the Phase-5 frontend shares the same SDK.

Chosen because pycspr 1.2.0 is Deploy-only (no Casper 2.0 Transactions) and the
casper-client Rust CLI does not build on Windows. See
.planning/phases/01-toolchain-reality-check/01-RESEARCH.md.
"""
from __future__ import annotations

import asyncio
import json
import os
import subprocess
import time
from pathlib import Path

from dotenv import load_dotenv

# Resolve everything against the repo root so chain.py works from any cwd.
_REPO = Path(__file__).resolve().parents[3]  # .../Steward
_AGENT = Path(__file__).resolve().parents[2]  # .../Steward/agent
load_dotenv(_AGENT / ".env")  # real secrets live ONLY here (gitignored); no-op if absent

RPC = os.environ.get("CASPER_NODE_RPC", "https://node.testnet.casper.network/rpc")
NETWORK = os.environ.get("CASPER_NETWORK_NAME", "casper-test")

_sk = os.environ.get("AGENT_SECRET_KEY_PATH", "./secrets/secret_key.pem")
_SK_ABS = _sk if os.path.isabs(_sk) else str((_REPO / _sk).resolve())

_sidecar = os.environ.get("STEWARD_SIDECAR", "agent/sidecar/chain.mjs")
_SIDECAR_ABS = _sidecar if os.path.isabs(_sidecar) else str((_REPO / _sidecar).resolve())

_DEPLOYMENTS = _REPO / "deployments" / "testnet.json"


def _deployments() -> dict:
    """Load deployments/testnet.json (contract hashes, agent key, validators)."""
    try:
        return json.loads(_DEPLOYMENTS.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def journal_package_hash() -> str:
    """The deployed Journal package hash (hex, no prefix). Env override wins."""
    env = os.environ.get("JOURNAL_CONTRACT_HASH")
    if env:
        return env.replace("hash-", "").replace("package-", "")
    pkg = _deployments().get("contracts", {}).get("journal", {})
    h = pkg.get("package_hash_hex") or pkg.get("package_hash", "")
    return h.replace("hash-", "").replace("package-", "")


def agent_public_key_hex() -> str:
    """The Steward agent's public key (hex) from deployments/testnet.json."""
    return os.environ.get(
        "AGENT_PUBLIC_KEY_HEX",
        _deployments().get("agent", {}).get("public_key_hex", ""),
    )


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
    """CSPR balance in motes (1 CSPR = 1e9 motes). 0 if the account is unfunded.

    Retries transient node flakes so a momentary hiccup doesn't abort a cycle. The
    balance is authoritative for risk checks, so a persistent failure still raises
    (never act on an unknown balance).
    """
    last: Exception | None = None
    for i in range(3):
        try:
            return int(_run("balance", public_key_hex)["motes"])
        except (ChainError, subprocess.TimeoutExpired) as exc:
            last = exc
            if i < 2:
                time.sleep(0.4 * (i + 1))
    raise ChainError(f"balance read failed after retries: {last}")


def account_hash(public_key_hex: str) -> str:
    """Hex account hash for a public key (no `account-hash-` prefix)."""
    return _run("account-hash", public_key_hex)["account_hash_hex"]


_MOTES_PER_CSPR = 1_000_000_000


def _auction_from_journal(agent: str) -> dict:
    """Degraded auction snapshot for when the live read is unavailable (the public
    node intermittently 413s the full auction set or streams it too slowly).

    Delegations are derived from the agent's OWN attested journal — counting only
    moves that actually executed on-chain (have a staking_txn) — so they are real,
    attested, on-chain delegations, never fabricated. Validator candidates come from
    the known deployments set. Tagged source='journal_fallback' so the pinned
    observed-state honestly discloses that the live auction read was unavailable.
    """
    by_validator: dict[str, float] = {}
    try:
        rows = json.loads((_REPO / "deployments" / "journal_feed.json").read_text(encoding="utf-8"))
        rows.sort(key=lambda e: (e.get("epoch") or 0, e.get("timestamp") or 0))
        for e in rows:
            v, txn = e.get("validator"), e.get("staking_txn")
            if not v or not txn:
                continue  # only moves that executed on-chain
            amt = float(e.get("amount_cspr") or 0)
            by_validator[v] = by_validator.get(v, 0.0) + (-amt if e.get("action") == "undelegate" else amt)
    except (OSError, json.JSONDecodeError):
        pass

    delegations = [
        {"validator": v, "amount_motes": str(int(round(a * _MOTES_PER_CSPR)))}
        for v, a in by_validator.items()
        if a > 1e-4
    ]
    validators = [
        {"public_key": v.get("public_key_hex"), "weight": "0"}
        for v in _deployments().get("validators", [])
        if v.get("public_key_hex")
    ]
    return {
        "validators": validators,
        "delegations": delegations,
        "validator_count": len(validators),
        "block_height": None,
        "source": "journal_fallback",
    }


def get_auction(agent_pubkey_hex: str | None = None) -> dict:
    """Native auction snapshot: top validators by weight + (optionally) the agent's
    delegations. Returns {validators: [{public_key, weight}], delegations: [...],
    validator_count, block_height, source}.

    Prefers the LIVE read but degrades to the agent's attested journal delegations
    when the node 413s / times out, so perceive never crashes mid-cycle. `source`
    is 'live' on a successful read, 'journal_fallback' otherwise.
    """
    agent = agent_pubkey_hex or agent_public_key_hex()
    try:
        live = _run("auction-info", agent, timeout=15)
        live.setdefault("source", "live")
        return live
    except (ChainError, subprocess.TimeoutExpired):
        # Live auction read unavailable — degrade gracefully instead of crashing the cycle.
        return _auction_from_journal(agent)


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


def record_decision(payload: dict, action_kind: str, epoch: int) -> dict:
    """Attest a decision on-chain (AGNT-04/05): pin the payload to IPFS, compute
    sha256 of the EXACT pinned bytes, then call the Journal `record(...)` entry
    point via the sidecar `journal-record` verb.

    `payload` is the full {decision, reasoning, observed_state} snapshot. Returns
    {cid, hash, txn} where `hash` is the hex decision_hash recorded on-chain ==
    sha256 of the bytes pinned at `cid` (so any client can verify by hashing the
    raw gateway bytes — the A.4 honesty rule).
    """
    from . import attest  # local import: attest pulls httpx; keep chain import light

    jwt = os.environ.get("PINATA_JWT")
    if not jwt:
        raise ChainError("PINATA_JWT not set — cannot pin attestation")

    cid, pinned = asyncio.run(attest.pin_json(payload, jwt))
    hex_hash = attest.decision_hash(pinned).hex()

    pkg = journal_package_hash()
    if not pkg:
        raise ChainError("journal package hash unknown (deployments/testnet.json)")

    res = _run("journal-record", pkg, hex_hash, cid, action_kind, int(epoch), timeout=120)
    return {"cid": cid, "hash": hex_hash, "txn": res["transaction_hash"]}


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
