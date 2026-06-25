# Phase 1 — Reality Report (TOOL-04)

**Date:** 2026-06-25 · **Verdict:** ✅ Toolchain gate PASSED. The chain layer is proven live on Casper 2.0 testnet. Safe to build Phases 2-4 on it.

## Chain-layer decision (LOCKED)

**Steward's chain layer is a Node `casper-js-sdk` v5 sidecar (`agent/sidecar/chain.mjs`), driven from the Python brain via `subprocess` (`agent/src/steward/chain.py`).**

Two candidates from the BUILD-PROMPT were tried and rejected at this gate:
1. **pycspr (Python SDK) — REJECTED.** Latest release 1.2.0 is Deploy-only; it has no Casper 2.0 Transaction support, so it cannot submit native-auction delegations. (The BUILD-PROMPT's #1 named risk, confirmed real.)
2. **casper-client v5 (Rust CLI) — REJECTED on this platform.** It does not compile on Windows (`casper-types` uses Unix-only `OpenOptions::mode(0o600)`) and ships no prebuilt Windows binary.

`casper-js-sdk` v5 is Casper-2.0-native, installs cleanly on Windows/Node, exposes native transaction builders, and is **shared with the Phase-5 frontend** — one chain library for the whole project. Rationale and the verified API are in [01-RESEARCH.md](01-RESEARCH.md) and [SIDECAR-API.md](SIDECAR-API.md).

## Live evidence (verified, not from memory)

| What | Value |
|------|-------|
| Testnet RPC | `https://node.testnet.casper.network/rpc` — Casper API 2.0.0, protocol 2.2.2, chainspec `casper-test` |
| Agent public key | `01c85dcb19012ff343ef214d34ad00c9fe38ee3b3abbffdfff276de121cc87539e` (ed25519) |
| Agent account hash | `932e021dc802796c446103994abe74e27d4791d445892ffc29e2c50982d290b6` |
| Funded | 5,000 CSPR from the faucet — [explorer](https://testnet.cspr.live/account/01c85dcb19012ff343ef214d34ad00c9fe38ee3b3abbffdfff276de121cc87539e) |
| **Write-path proof** | transfer of 2.5 CSPR, **executed Success** — txn `70b234fb60f5a3817ed7e69cfd32a7d99c3a4ee1f068009d70f8c9e72acd03df` ([explorer](https://testnet.cspr.live/transaction/70b234fb60f5a3817ed7e69cfd32a7d99c3a4ee1f068009d70f8c9e72acd03df)); target account received exactly 2,500,000,000 motes |

`chain.py` (Python) reads balance via `queryLatestBalance`, and submits + confirms transactions through the sidecar — the same functions Phase 3 (perceive) and Phase 4 (`delegate`/`redelegate`) import unchanged.

## Deltas vs the BUILD-PROMPT (flagged before proceeding)

1. **Chain layer:** pycspr → **casper-js-sdk v5 Node sidecar** (not pycspr, and not the casper-client CLI the prompt suggested as fallback — that one won't build on Windows). Pre-authorized fallback path taken.
2. **Faucet is NOT automatable.** Wallet-gated, once-per-account, no public HTTP API — funding is a one-time manual step by the operator. (Done: 5,000 CSPR.)
3. **"Self-transfer" acceptance is invalid on Casper.** A transfer to your own account fails with `Invalid purse` (source purse == target purse). The probe instead transfers to a fresh distinct target (auto-created by the transfer) — same write-path coverage, and closer to the real delegation flow.
4. **Transaction model:** Casper 2.0 `Transaction` (`account_put_transaction`) is used; legacy Deploys remain accepted but deprecated.
5. **Python 3.14** is fine — the chain layer is JS/Node; Python only orchestrates and runs the LLM/IPFS code.
6. **Captured for later:** Odra 2.8.1 (Phase 2 contracts), casper-js-sdk 5.0.12 (Phase 5 frontend — same lib as the sidecar).

## Locked for downstream
- Chain seam: `agent/src/steward/chain.py` → `agent/sidecar/chain.mjs`. Nothing else touches the SDK.
- Gas/payment: `.payment(1e8)` for transfers, `.payment(2.5e9)` for auction actions — validated to execute (transfer Success). Re-check the auction payment when the first real delegation runs (Phase 4).
- Network is hard-pinned to `casper-test`. Testnet only.
