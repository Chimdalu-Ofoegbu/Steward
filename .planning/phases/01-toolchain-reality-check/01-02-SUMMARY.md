# Plan 01-02 Summary — Funding + write-path proof

**Status:** ✅ Complete. **Requirements:** TOOL-02, TOOL-03 (part b), TOOL-04.

## What happened
- **Funded** the agent key from the wallet-gated faucet: 5,000 CSPR (operator manual step — no faucet API).
- **`agent/probe.py`** ran green against live testnet: read balance → transfer 2.5 CSPR to a fresh distinct target → **confirmed Success** (txn `70b234fb60f5a3817ed7e69cfd32a7d99c3a4ee1f068009d70f8c9e72acd03df`) → target received exactly 2,500,000,000 motes.
- **`REALITY-REPORT.md`** written (TOOL-04): chain-layer decision + deltas + live evidence.

## Fixes made during execution
- Chain layer was switched casper-client → **casper-js-sdk sidecar** (casper-client won't build on Windows) — see 01-01.
- `casper-js-sdk` is CommonJS → sidecar uses a default import + destructure.
- **Self-transfer is invalid on Casper** (`Invalid purse`, source==target) → probe transfers to a fresh ephemeral target instead.
- `chain.py` now loads `agent/.env` (not repo-root) — the canonical secrets location.

## Phase 1 acceptance — all met
- TOOL-01 ✓ live Casper 2.0 toolchain verified (RPC api 2.0.0, casper-test).
- TOOL-02 ✓ Python reads balance AND submits + confirms a transfer (write path proven).
- TOOL-03 ✓ ed25519 keypair generated, funded (5,000 CSPR), confirmed on the explorer.
- TOOL-04 ✓ chain-layer decision + deltas recorded.

**Verification:** empirical — the probe's on-chain Success txn IS the proof (no separate verifier agent needed for this gate phase).
