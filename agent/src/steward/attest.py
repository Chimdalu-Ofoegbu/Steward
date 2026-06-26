"""Attestation — pin reasoning to IPFS (Pinata V3) + the on-chain hash.

Verbatim from BUILD-PROMPT Appendix A.2 (the proven Pinata-V3 pattern).

Two honesty rules baked in (A.4):
  1. The on-chain `decision_hash` is sha256 of the EXACT pinned bytes — so any
     client can verify by hashing the raw gateway bytes, NOT a re-serialization.
  2. Canonical bytes (sort_keys, no whitespace) so the same logical payload
     always yields the same CID/hash across languages.

Flow per cycle:
    cid, raw = await pin_json(payload, jwt)
    h = decision_hash(raw)
    Journal.record(h, cid, action_kind, epoch)
"""
import hashlib
import json
from urllib.parse import urlparse

import httpx

PINATA_UPLOAD_URL = "https://uploads.pinata.cloud/v3/files"
ALLOWED_GATEWAY_HOSTS = {"gateway.pinata.cloud"}  # SSRF guard: only pin-reads to known IPFS hosts


async def pin_json(payload: dict, jwt: str) -> tuple[str, bytes]:
    """Pin a JSON payload to IPFS via Pinata V3. Returns (cid, exact_pinned_bytes).

    Canonical bytes (sort_keys) so the same logical payload always yields the
    same CID/hash."""
    content = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            PINATA_UPLOAD_URL,
            headers={"Authorization": f"Bearer {jwt}"},
            files={"file": ("decision.json", content, "application/json")},
            data={"network": "public"},
            timeout=30,
        )
    resp.raise_for_status()
    return resp.json()["data"]["cid"], content


def decision_hash(pinned_bytes: bytes) -> bytes:
    """sha256 of the EXACT pinned bytes — this 32-byte digest is what you record on-chain.

    Record the hash of the bytes, NOT a re-serialization, so any client can
    verify by hashing the raw gateway bytes (see A.4)."""
    return hashlib.sha256(pinned_bytes).digest()


async def fetch_pinned(cid: str, gateway: str) -> bytes:
    """Fetch raw pinned bytes by CID, host-allowlisted, no redirects (SSRF-safe)."""
    parsed = urlparse(gateway)
    if parsed.scheme != "https" or parsed.hostname not in ALLOWED_GATEWAY_HOSTS:
        raise ValueError(f"gateway not allowed: {gateway!r}")
    async with httpx.AsyncClient(follow_redirects=False) as client:
        r = await client.get(f"{gateway}/{cid}", timeout=30)
    r.raise_for_status()
    return r.content
