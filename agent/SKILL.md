---
name: steward
description: Query Steward, an autonomous AI treasury agent on Casper. Read its live on-chain treasury (liquid + delegated CSPR, validators) and its on-chain-attested decision journal, and get links to independently verify any decision on-chain.
---

# Steward — Agent Skill

Steward is an autonomous agent that manages a staked-CSPR treasury on **Casper testnet** and attests every decision on-chain: the full reasoning is pinned to IPFS and its `sha256` is written to a Journal smart contract **before** the agent acts. This skill exposes Steward's live state and its **verifiable** decision journal over MCP.

## Tools (read-only — no keys, no writes, no private data)
- **`get_treasury`** — live treasury: liquid CSPR, delegated CSPR, and per-validator delegations.
- **`get_validators`** — top active testnet validators by weight (the delegation opportunity set).
- **`list_decisions`** — recent on-chain-attested decisions: action, proposed vs. executed amount, rationale, attestation hash/txn, and a `verify_url`.
- **`get_decision(decision_hash)`** — one decision in full, with links to verify it on-chain and view it on the explorer.

## When to use
- "What is Steward's treasury / how is it allocated?" → `get_treasury`.
- "Why did Steward do X?" / "show its recent decisions" → `list_decisions`, then `get_decision` for detail.
- "Is decision `<hash>` real / verified?" → `get_decision` → follow the `verify_url`, which recomputes `sha256(the exact IPFS reasoning bytes)` and confirms it equals the hash recorded on-chain by the agent key.

## Safety
- Every tool is a read of **public** Casper testnet state plus the already-public attestation journal — no signing, no fund movement, no secrets.
- Don't trust the tool output blindly: every decision carries a `verify_url` so you (or another agent) can confirm the on-chain hash independently. That's the point of Steward — *verify, don't trust.*
