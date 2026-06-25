# Plan 01-01 Summary — Chain layer + agent keypair

**Status:** ✅ Complete (autonomous wave 1). Funding + the self-transfer proof are wave 2 (01-02), blocked on the manual faucet step.
**Requirements:** TOOL-01, TOOL-02, TOOL-03 (part a).

## What was delivered
- **`agent/sidecar/chain.mjs`** — the ONE Casper 2.0 chain layer, built on `casper-js-sdk@5.0.12` (Node ESM, default-import the CJS package). Verbs: `keygen · account-hash · balance · transfer · delegate · undelegate · redelegate · confirm`. Native Casper-2.0 transaction builders, not Deploys.
- **`agent/src/steward/chain.py`** — reusable Python wrapper that shells out to the sidecar (resolves paths against the repo root, passes env through). Exposes `get_balance / account_hash / transfer / delegate / undelegate / redelegate / confirm`. Phases 3-4 import this unchanged (D-04).
- **`agent/`** package: `pyproject.toml`, `.venv` (py launcher → Python 3.14.2) with `httpx` + `python-dotenv`, **pycspr deliberately NOT installed**. `agent/.env.example` with the live RPC/network/sidecar paths + Phase-3 placeholders.
- **Agent testnet keypair** in gitignored `./secrets/` (ed25519). **`deployments/testnet.json`** records the PUBLIC key + account hash (tracked, no secret material).
- **`SIDECAR-API.md`** — verified casper-js-sdk v5 call shapes (source of truth for Phases 3-5).

## Live verification (testnet, 2026-06-25)
- RPC `https://node.testnet.casper.network/rpc` reachable through the sidecar.
- `keygen` → agent pub `01c85dcb19012ff343ef214d34ad00c9fe38ee3b3abbffdfff276de121cc87539e` (the `01` = ed25519), account-hash `932e021dc802796c446103994abe74e27d4791d445892ffc29e2c50982d290b6`.
- `chain.py.get_balance(pub)` → `0` (unfunded; the RPC returns `-32026 Purse not found`, caught and reported as 0) — this confirms the `queryLatestBalance` + `PurseIdentifier.fromPublicKey` shape end-to-end.
- Secrets discipline: `git check-ignore` confirms `secrets/secret_key.pem` ignored, `deployments/testnet.json` tracked, no `.pem`/`.env`/`public_key_hex` surfaced by git. `.venv` + `node_modules` gitignored.

## Key facts for downstream (Phases 3-4)
- Chain seam = `agent/src/steward/chain.py` → `agent/sidecar/chain.mjs`. Do not touch the sidecar directly elsewhere.
- Transfer: `NativeTransferBuilder().from(pub).target(pub).amount(motes).id(n).chainName('casper-test').payment(1e8).build()`, `tx.sign(priv)`, `rpc.putTransaction(tx)`.
- Delegate (Phase 4 STAK-01): `NativeDelegateBuilder().from().validator().amount().chainName().payment(2.5e9).build()` — already wired in the sidecar, so STAK-01 is a thin step.

## Deviation
- Chain layer is the **Node `casper-js-sdk` sidecar**, NOT `casper-client` v5 CLI as 01-RESEARCH originally recommended: the Rust CLI does not compile on Windows (`casper-types` Unix-only `mode()`) and ships no prebuilt Windows binary. casper-js-sdk v5 is verified working and is shared with the Phase-5 frontend (one chain lib). Recorded in 01-RESEARCH.md (POST-RESEARCH UPDATE) + STATE.md.

## Next (01-02, blocked)
Fund the agent public key via the wallet-gated faucet (`https://testnet.cspr.live/tools/faucet`), then run `agent/probe.py` (balance → self-transfer → confirm → explorer link) and write the REALITY-REPORT (TOOL-04).
