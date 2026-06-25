# Phase 1: Toolchain & Reality Check - Research

**Researched:** 2026-06-25
**Domain:** Casper 2.0 "Condor" testnet chain layer — SDK/CLI selection, transaction model, native auction, keypair/funding
**Confidence:** HIGH (chain layer + RPC live-verified) / MEDIUM (faucet automation, exact delegate flag spelling)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Casper **testnet only** (`casper-test`), never mainnet, no real funds. Ever.
- **D-02:** Primary candidate is **pycspr** (Python) so brain + chain layer share one runtime — CONDITIONAL on pycspr supporting the Casper 2.0 Transaction model for native-auction delegation on testnet today. (RESEARCH RESOLVES THIS → see recommendation.)
- **D-03:** Fallback order if pycspr lags: (1) drive **`casper-client` CLI** from Python (subprocess), (2) **Node `casper-js-sdk` sidecar**. Decide AT THIS GATE.
- **D-04:** Whatever is chosen, the Phase-1 proof must use the SAME mechanism the agent later uses to delegate — exercise the real submission path, not a dead-end API.
- **D-05:** Rust present (`cargo 1.95`). `casper-client` to be installed (cargo install or prebuilt) — verify Windows install path + Casper 2.0 support.
- **D-06:** Python invoked via **`py`** launcher (Python **3.14** on this machine). BUILD-PROMPT assumed 3.11+. Flag any pycspr/dep incompatibility with 3.14; if pycspr needs <3.13, plan a pinned venv.
- **D-07:** Secrets only in gitignored `.env`; agent secret key in `./secrets/*.pem` (gitignored). `.env.example` committed.
- **D-08:** Attempt **programmatic** faucet funding first; if captcha/manual, surface public key + faucet URL for the user to fund, then continue.

### Claude's Discretion
- Exact script structure/layout under `agent/` for the Phase-1 probe; shape of the chain-layer abstraction (so later phases reuse it); choice of test validators (pick from the live auction set).

### Deferred Ideas (OUT OF SCOPE)
- Journal contract (Rust/Odra) — Phase 2.
- Agent perceive→decide→attest loop, IPFS pinning — Phase 3.
- Mapping decisions to native-auction delegate deploys (real staking) — Phase 4. (Phase 1 only proves the submission path with a trivial self-transfer.)
- CEP-18 `rwUSD`, vault, RWA — Phase 6 stretch.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TOOL-01 | Casper 2.0 testnet toolchain verified vs LIVE docs + a live call — tx model, native auction interface, testnet RPC, faucet | Live RPC verified (`info_get_status` → api 2.0.0, protocol 2.2.2, chainspec `casper-test`, block 8,297,460 @ 2026-06-25). `account_put_transaction`, `account_put_deploy`, `query_balance` all live. Native auction `put-txn delegate/undelegate/redelegate` confirmed in casper-client v5 source. |
| TOOL-02 | Python script reads agent CSPR balance + submits/confirms a tiny self-transfer (pycspr OR documented fallback) | Recommendation = casper-client v5 CLI driven from Python (subprocess). Copy-paste recipe below. pycspr 1.2.0 is Deploy-only and CANNOT do Casper 2.0 Transactions. |
| TOOL-03 | Agent testnet keypair generated, funded from faucet, confirmed on explorer | `casper-client keygen` recipe + `account-address` derivation + faucet flow (likely browser/Casper-Wallet, surface pubkey to user per D-08) + explorer `https://testnet.cspr.live`. |
| TOOL-04 | Decision recorded on chain-layer library + deltas flagged | CHAIN-LAYER RECOMMENDATION + "Deltas vs BUILD-PROMPT" sections below. |
</phase_requirements>

<architectural_responsibility_map>
## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Read account CSPR balance from testnet | API/Backend (agent Python) | — | Chain read via JSON-RPC `query_balance`; the Python brain owns it for the perceive loop (Phase 3). |
| Build/sign/submit native Transaction (transfer now; delegate later) | API/Backend (agent Python → casper-client v5 CLI subprocess) | — | Casper-2.0 Transaction construction lives in casper-client v5 (Rust); Python orchestrates it. Same path reused for delegation in Phase 4 (D-04). |
| Keypair generation + account-hash derivation | API/Backend (one-time CLI) | — | `casper-client keygen` / `account-address`; secret key gitignored under `./secrets/` (D-07). |
| Faucet funding | External (browser / Casper Wallet) | API/Backend (attempt programmatic per D-08) | Faucet is gated behind Casper Wallet login on cspr.live; no documented public HTTP funding API → surface pubkey to user. |
| Frontend live reads (Phase 5) | Browser/Client | — | `casper-js-sdk` v5 in Next.js — NOT this phase, but version captured. |

</architectural_responsibility_map>

<research_summary>
## Summary

I verified the live Casper 2.0 "Condor" testnet toolchain against official docs and **live testnet RPC calls** (not memory). The public testnet RPC `https://node.testnet.casper.network/rpc` is up and producing blocks: `info_get_status` returns `api_version 2.0.0`, `protocol_version 2.2.2`, `chainspec_name "casper-test"`, last block height **8,297,460** at **2026-06-25T14:56:02Z**. The Casper 2.0 Transaction model is live: `account_put_transaction` exists on testnet, and legacy `account_put_deploy` is still accepted (deprecated). `query_balance` is available for reads.

**The CRUX resolves against pycspr.** The official Python SDK **pycspr is 1.2.0 (released 2024-04-04)** and its released code is **Deploy-only** — the entire `main` branch contains zero `transaction` modules (only `deploy` factories, verifiers, and how-tos). The official Python SDK docs page still describes only `create_native_transfer()` / `create_validator_auction_bid()` (Deploy model). Transaction support exists only on the **unreleased `dev` branch** (`pycspr/api/node/bin/client/transaction.py`, `tests/fixtures/transactions/v1.py`,`v2.py`) — not on PyPI, not stable. pycspr 1.2.0 also pins `requires_python = >=3.12,<4.0`, so it would install on 3.14, but that doesn't matter because it can't do Condor Transactions regardless.

**By contrast, casper-client (Rust CLI) v5.0.1 (2026-03-16) is fully Casper-2.0-native.** Its source exposes `put-txn` (a.k.a. `put-transaction`) subcommands for `transfer`, `delegate`, `undelegate`, `redelegate`, `add-bid`, etc., plus `v2_0_0` RPC modules (`put_transaction.rs`). casper-js-sdk v5.0.12 (2026-04-29, `condor` tag at 5.0.16-beta2) is the Casper-2.0 JS line, reserved for the frontend.

**Primary recommendation:** Use **`casper-client` v5 CLI driven from Python via `subprocess`** as the agent's chain layer. It is the only path that (a) speaks the real Casper 2.0 Transaction model today, (b) natively supports `delegate/undelegate/redelegate` (the exact mechanism Phase 4 needs, satisfying D-04), and (c) keeps the agent brain in Python (satisfying the spirit of D-02 without depending on the lagging Python SDK). Wrap it in one `chain.py` module so Phases 3–4 reuse it. Keep `casper-js-sdk` v5 for frontend reads only.
</research_summary>

<chain_layer_recommendation>
## CHAIN-LAYER RECOMMENDATION (the D-02/D-03 gate decision)

**DECISION: Drive `casper-client` v5 CLI from Python via `subprocess` (Fallback option 1 in D-03).**

**One-line rationale:** pycspr's released version (1.2.0) is Deploy-only and cannot submit Casper 2.0 native-auction delegations; casper-client v5 is the only tool that is verified Casper-2.0-native today AND natively supports `delegate/undelegate/redelegate`, while still letting the agent brain stay in Python.

### Evidence

| Candidate | Casper 2.0 Transaction? | Native delegate? | Python-native? | Verdict |
|-----------|------------------------|------------------|----------------|---------|
| **pycspr 1.2.0** (PyPI, 2024-04-04) | ❌ Deploy-only on `main`; no `transaction` module anywhere in released code | ❌ only legacy `create_validator_auction_bid()` (Deploy) | ✅ (pins `>=3.12,<4.0`, installs on 3.14) | **REJECT** — fails the hard requirement |
| pycspr `dev` branch (unreleased) | ⚠️ partial (`transaction.py`, `transactions/v1.py`,`v2.py` exist) | ⚠️ unproven, no release, no docs | ✅ | **DEFER** — not stable enough to bet a buildathon on |
| **casper-client v5.0.1** (crates.io, 2026-03-16) | ✅ `put-txn`, `v2_0_0/put_transaction.rs` | ✅ `put-txn delegate/undelegate/redelegate` in source | ➖ via subprocess | **CHOSEN** |
| casper-js-sdk v5.0.12 (npm, 2026-04-29) | ✅ Casper-2.0 line (`condor` tag 5.0.16-beta2) | ✅ | ❌ Node sidecar (second runtime) | **Frontend only** (Phase 5); avoid as agent chain layer to keep one runtime |

**Why not the Node sidecar (D-03 option 2)?** It works and is Casper-2.0-native, but it introduces a second runtime/process into the agent and contradicts the "one runtime" goal of D-02 more than a thin CLI subprocess does. Keep casper-js-sdk v5 scoped to the frontend, where it's already the right tool.

**Reuse contract for Phases 3–4 (D-04):** The Phase-1 self-transfer goes through `casper-client put-txn transfer`. Phase 4's real staking goes through `casper-client put-txn delegate/redelegate` — **same binary, same subprocess wrapper, same secret key, same RPC.** Build the abstraction as `agent/src/steward/chain.py` exposing `get_balance(public_key_hex) -> motes`, `transfer(target, amount) -> txn_hash`, `confirm(txn_hash) -> success`, and (Phase 4) `delegate(validator, amount)`, all backed by `casper-client`.
</chain_layer_recommendation>

<standard_stack>
## Standard Stack

### Core
| Library / Tool | Version | Purpose | Why Standard |
|----------------|---------|---------|--------------|
| **casper-client** (Rust CLI) | **5.0.1** (crates.io 2026-03-16) [VERIFIED: crates.io API] | Build/sign/submit Casper 2.0 Transactions; keygen; queries | Only verified Casper-2.0-native client with `put-txn delegate`; maintained by casper-ecosystem |
| **Python** | **3.14.2** (this machine, `py` launcher) [VERIFIED: `py --version`] | Agent brain + subprocess orchestration of casper-client | Locked by D-06 |
| **subprocess + json** (stdlib) | 3.14 stdlib | Invoke casper-client, parse `--json`/`-v` output | No extra dep; the CLI is the chain layer |

### Supporting
| Library / Tool | Version | Purpose | When to Use |
|----------------|---------|---------|-------------|
| **httpx** | latest [ASSUMED — pin in venv] | Direct JSON-RPC reads if you prefer not to shell out for `query_balance` | Optional: balance reads can be a raw RPC POST instead of CLI |
| **casper-js-sdk** | **5.0.12** (npm 2026-04-29; `condor` tag 5.0.16-beta2) [VERIFIED: npm registry dist-tags] | Frontend live reads (Phase 5) | NOT the agent chain layer — frontend only |
| **Odra** | **2.8.1** (crates.io 2026-06-11) [VERIFIED: crates.io API] | Journal/vault contracts | Phase 2, captured here — actively maintained, Casper-2.0 line |
| **cargo-casper** | **3.0.0** (crates.io 2025-07-28) [VERIFIED: crates.io API] | Scaffold raw Casper contracts (Odra fallback) | Phase 2 fallback |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| casper-client CLI subprocess | pycspr 1.2.0 | REJECTED — Deploy-only, no Condor Transactions |
| casper-client CLI subprocess | pycspr `dev` branch (git install) | Unreleased, undocumented, risky for a 6-day build |
| casper-client CLI subprocess | Node casper-js-sdk v5 sidecar | Works but adds a second runtime; keep JS for frontend |
| Shelling out for balance reads | Raw `query_balance` JSON-RPC via httpx | Either is fine; CLI is uniform, raw RPC is one less subprocess |

**Installation (Windows):**
```bash
# Rust present per D-05 (cargo 1.95). Windows prereqs: C++ build tools + OpenSSL dev libs.
cargo install casper-client --locked        # installs casper-client 5.0.1 binary on PATH
casper-client --version                      # verify -> 5.0.1
# Python deps (pinned venv via py launcher, 3.14):
py -m venv .venv && .venv\Scripts\activate
py -m pip install httpx python-dotenv        # NOTE: do NOT install pycspr (Deploy-only, unused)
```
> **Windows note:** `cargo install casper-client` may need the Visual C++ build tools and OpenSSL. If the cargo build fails on Windows, fall back to a prebuilt binary from the casper-client-rs GitHub releases. Verify the install path resolves on PATH for `subprocess` calls.

**Version verification performed (live, 2026-06-25):**
- `casper-client` 5.0.1 — crates.io API `/api/v1/crates/casper-client` (newest 5.0.1, 2026-03-16) [VERIFIED]
- `casper-js-sdk` 5.0.12 — npm registry dist-tags `{legacy:1.4.3, condor:5.0.16-beta2, latest:5.0.12}` (2026-04-29) [VERIFIED]
- `pycspr` 1.2.0 — PyPI `info.version=1.2.0`, `requires_python=<4.0,>=3.12`, released 2024-04-04 [VERIFIED]
- `odra` 2.8.1 — crates.io (2026-06-11) [VERIFIED]
- `cargo-casper` 3.0.0 — crates.io (2025-07-28) [VERIFIED]
</standard_stack>

<package_legitimacy_audit>
## Package Legitimacy Audit

| Package | Registry | Age | Source Repo | Verdict | Disposition |
|---------|----------|-----|-------------|---------|-------------|
| casper-client | crates.io | v5.0.1 2026-03-16 (crate since 2020) | github.com/casper-ecosystem/casper-client-rs | OK | Approved (chosen chain layer) |
| casper-js-sdk | npm | v5.0.12 2026-04-29 (pkg since 2020) | github.com/casper-ecosystem/casper-js-sdk | OK | Approved (frontend only) |
| odra | crates.io | v2.8.1 2026-06-11 | github.com/odradev/odra | OK | Approved (Phase 2) |
| cargo-casper | crates.io | v3.0.0 2025-07-28 | github.com/casper-network/casper-node | OK | Approved (Phase 2 fallback) |
| pycspr | PyPI | v1.2.0 2024-04-04 | github.com/casper-network/casper-python-sdk | OK (legit) but **UNFIT** | NOT INSTALLED — Deploy-only, cannot do Condor |
| httpx | PyPI | mature | github.com/encode/httpx | OK [ASSUMED — verify on install] | Approved (optional reads) |

**Packages removed due to SLOP verdict:** none.
**Packages flagged suspicious:** none. (pycspr is legitimate but technically unfit for Casper 2.0 Transactions — excluded on capability grounds, not legitimacy.)
*All four core Casper packages are first-party (casper-ecosystem / casper-network / odradev orgs) with multi-year history and active 2026 releases.*
</package_legitimacy_audit>

<architecture_patterns>
## Architecture Patterns

### System Architecture Diagram (Phase-1 probe data flow)

```
  agent/probe.py (Python 3.14, py launcher)
        │
        │ 1. READ balance
        ▼
  subprocess → casper-client query-balance / get-account-info
        │            (or raw JSON-RPC POST: query_balance)
        ▼
  https://node.testnet.casper.network/rpc  ──► motes ──► print balance
        │
        │ 2. SUBMIT self-transfer
        ▼
  subprocess → casper-client put-txn transfer
        --target <own public_key_hex>  --transfer-amount <motes>
        --chain-name casper-test  --secret-key ./secrets/secret_key.pem
        --gas-price-tolerance 1  --pricing-mode fixed
        -n https://node.testnet.casper.network/rpc
        │
        ▼  returns transaction_hash
  3. CONFIRM: poll casper-client get-transaction <hash>  (or info_get_transaction)
        │            until execution_result present + Success
        ▼
  4. VERIFY on explorer: https://testnet.cspr.live/transaction/<hash>
```

### Recommended Project Structure
```
agent/
├── src/steward/
│   ├── chain.py         # THE reusable chain layer: get_balance / transfer / confirm / (Phase4) delegate
│   └── __init__.py
├── probe.py             # Phase-1 acceptance script: read balance + self-transfer + confirm
├── secrets/             # gitignored: secret_key.pem, public_key.pem, public_key_hex
├── .env.example         # committed: CASPER_NODE_RPC, CASPER_NETWORK_NAME, AGENT_SECRET_KEY_PATH
└── pyproject.toml
deployments/
└── testnet.json         # agent public key (+ account hash); validator set filled in Phase 4
```

### Pattern 1: CLI-subprocess chain layer (the reusable abstraction)
**What:** A single `chain.py` that shells out to `casper-client`, parses JSON, and exposes typed Python functions. Phases 3–4 import it; nothing else touches the CLI.
**When to use:** Every chain interaction (read + write) in this project.
**Example:**
```python
# agent/src/steward/chain.py  (Source: casper-client v5 put-txn subcommands, verified in casper-client-rs/src/transaction.rs)
import subprocess, json, os

RPC = os.environ["CASPER_NODE_RPC"]          # https://node.testnet.casper.network/rpc
NETWORK = os.environ["CASPER_NETWORK_NAME"]  # casper-test
SK = os.environ["AGENT_SECRET_KEY_PATH"]     # ./secrets/secret_key.pem
CLIENT = "casper-client"                      # on PATH after cargo install

def _run(args: list[str]) -> dict:
    out = subprocess.run([CLIENT, *args], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)

def transfer(target_public_key_hex: str, amount_motes: int) -> str:
    res = _run([
        "put-txn", "transfer",
        "--target", target_public_key_hex,
        "--transfer-amount", str(amount_motes),
        "--chain-name", NETWORK,
        "--secret-key", SK,
        "--gas-price-tolerance", "1",
        "--pricing-mode", "fixed",
        "-n", RPC,
    ])
    return res["result"]["transaction_hash"]   # confirm exact JSON key against your installed v5 output
```
> ⚠️ Exact flag spellings (`--transfer-amount` vs `--amount`, `--pricing-mode`/`--payment-amount`, and the JSON result key for the hash) **must be confirmed with `casper-client put-txn transfer --help` on the installed v5 binary** before locking the wrapper — docs across pages are inconsistent (see Open Risks).

### Pattern 2: Read balance without a subprocess (optional)
**What:** Raw JSON-RPC `query_balance` POST (verified live on testnet).
**Example:**
```python
# Source: live testnet RPC — query_balance method confirmed present (returned -32602 on empty params, i.e. exists)
import httpx
def get_balance_motes(purse_identifier: dict) -> int:
    r = httpx.post(os.environ["CASPER_NODE_RPC"], json={
        "jsonrpc":"2.0","id":1,"method":"query_balance",
        "params":{"purse_identifier": purse_identifier}  # e.g. {"main_purse_under_public_key": "<hex>"}
    }, timeout=30)
    r.raise_for_status()
    return int(r.json()["result"]["balance"])
```

### Anti-Patterns to Avoid
- **Installing pycspr and building on `create_native_transfer()`:** that's the Deploy model — a dead-end vs D-04. The agent would have to be rewritten for Phase 4 delegation.
- **Hard-coding flag strings from memory/docs:** docs pages disagree on `put-txn` vs `put-transaction` and on amount flags. Always confirm against `--help` on the installed binary.
- **Acting on stale balance:** confirm each transaction's execution_result before the next read (BUILD-PROMPT §8 nonce/sequencing) — relevant from Phase 3 on.
</architecture_patterns>

<phase1_acceptance_recipe>
## Phase-1 Acceptance Recipe (copy-pasteable)

### Step 0 — Install + verify casper-client v5 (Windows)
```bash
cargo install casper-client --locked
casper-client --version            # expect: casper-client 5.0.1
casper-client put-txn --help       # CONFIRM subcommands incl. transfer, delegate, redelegate
casper-client put-txn transfer --help   # CONFIRM exact amount/pricing flag names
```

### Step 1 — Generate the agent keypair (ed25519 default)
```bash
mkdir -p secrets
casper-client keygen secrets/        # writes secret_key.pem, public_key.pem, public_key_hex
cat secrets/public_key_hex           # ed25519 -> starts "01..."  (secp256k1 -> "02...")
casper-client account-address --public-key secrets/public_key_hex   # derive account hash
```
- ed25519 is the default and is testnet-compatible. `public_key_hex` = 1-byte algorithm tag (`01` ed25519 / `02` secp256k1) + 32-byte (ed25519) public key, hex-encoded. The **account hash** = blake2b256 of `"<algo>00<pubkey_bytes>"` — derive it with `account-address`, don't hand-roll. [CITED: docs.casper.network/concepts/accounts-and-keys]

### Step 2 — Fund from the faucet (D-08)
- Faucet URL: **`https://testnet.cspr.live/tools/faucet`** — gated behind Casper Wallet login; **once per account**. No documented public HTTP funding API.
- Per D-08: attempt programmatic funding (none documented → expect it to require the browser). **Surface `public_key_hex` + the faucet URL to the user**, have them fund it, then continue.

### Step 3 — Read balance (acceptance part a)
```bash
# Option A: raw RPC (verified live)
curl -s -X POST https://node.testnet.casper.network/rpc -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"query_balance","params":{"purse_identifier":{"main_purse_under_public_key":"<PUBKEY_HEX>"}}}'
# Option B: via the chain.py wrapper -> get_balance_motes(...)
```

### Step 4 — Submit + confirm a tiny self-transfer (acceptance part b)
```bash
casper-client put-txn transfer \
  --target <PUBKEY_HEX_OF_SELF> \
  --transfer-amount 2500000000 \
  --chain-name casper-test \
  --secret-key secrets/secret_key.pem \
  --gas-price-tolerance 1 \
  --pricing-mode fixed \
  -n https://node.testnet.casper.network/rpc
# -> returns a transaction_hash. Then poll:
casper-client get-transaction <TXN_HASH> -n https://node.testnet.casper.network/rpc
# until execution_result shows Success.
```
> Flag names taken from the docs `put-transaction transfer` example (which used `--transfer-amount`, `--gas-price-tolerance`, `--secret-key`, `--standard-payment`/`--payment-amount`). The installed v5 binary's `--help` is the source of truth — reconcile before locking. 2,500,000,000 motes = 2.5 CSPR (1 CSPR = 1e9 motes).

### Step 5 — Confirm on the explorer
- Open **`https://testnet.cspr.live/transaction/<TXN_HASH>`** (or the account page `https://testnet.cspr.live/account/<PUBKEY_HEX>`) and confirm the transfer executed. This satisfies TOOL-03 "confirmed on the explorer."
</phase1_acceptance_recipe>

<deltas_vs_build_prompt>
## Deltas vs BUILD-PROMPT (flag these to the product owner)

| # | BUILD-PROMPT assumption | Reality (2026-06-25, verified) | Impact |
|---|-------------------------|-------------------------------|--------|
| **Δ1** | "**`pycspr`** to build/sign/send deploys… verify it supports Casper 2.0 transactions" (§4) | pycspr **1.2.0 is Deploy-only** (no `transaction` module in released code; docs still show Deploy `create_native_transfer`). Transaction code exists only on the unreleased `dev` branch. **It does NOT support Casper 2.0 native-auction delegation.** | **CHAIN LAYER SWITCHED to casper-client v5 CLI (D-03 fallback #1).** This is the single biggest delta and the whole point of the gate. |
| **Δ2** | Transaction model "Deploys → Transactions" (§4) — implied you'd use Transactions | **Both** live on testnet: `account_put_transaction` AND legacy `account_put_deploy` both respond. Deploys deprecated but still execute. | Use Transactions (`put-txn`) for forward-compat; legacy Deploys remain a safety net. |
| **Δ3** | Python "**3.11+**" (§4); D-06 flags 3.14 risk | Machine is **Python 3.14.2**. pycspr 1.2.0 pins `>=3.12,<4.0` (would install on 3.14) — but moot since pycspr is excluded. casper-client is a Rust binary, runtime-independent. | **3.14 is a non-issue** for the chosen path. No pinned-down-version venv needed for the chain layer (only for httpx/dotenv, which support 3.14). |
| **Δ4** | `CASPER_NODE_RPC=https://REPLACE_ME/rpc` (Appendix A) | Confirmed live RPC: **`https://node.testnet.casper.network/rpc`** (api 2.0.0, protocol 2.2.2, chainspec `casper-test`, block 8,297,460 @ 2026-06-25). | Fill `.env`. RPC verified responsive. |
| **Δ5** | "fund the agent key from the faucet" — implies easy/automatable; D-08 wants programmatic-first | Faucet **`https://testnet.cspr.live/tools/faucet`** is **gated behind Casper Wallet login, once per account; no documented public HTTP funding API.** | **Programmatic auto-funding likely NOT possible.** Per D-08, surface pubkey + URL to the user for manual funding. Plan a manual checkpoint in Phase 1. |
| **Δ6** | Odra "confirm Casper-2.0 support" (§4) | **Odra 2.8.1 (2026-06-11)** is current and actively maintained on the Casper-2.0 line. | Phase 2 green-lit on Odra; cargo-casper 3.0.0 as fallback. |
| **Δ7** | casper-js-sdk for frontend reads (§4) | **casper-js-sdk 5.0.12** is the Casper-2.0 (`condor`) line; v1.x is `legacy`. | Phase 5 must use v5 (NOT a v1/v2 tutorial). Beware stale v2 docs. |

**Net:** The BUILD-PROMPT's #1 named risk (pycspr lagging Condor) is REAL and triggered. The architecture survives intact by switching to casper-client v5 — exactly the contingency D-02/D-03 planned for.
</deltas_vs_build_prompt>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Casper 2.0 Transaction serialization/signing | Custom CL-value/transaction bytes in Python | `casper-client put-txn` | Transaction byte format + signing is intricate and version-specific; the v5 CLI is the reference impl |
| Account hash derivation | blake2b of "algo+00+pubkey" by hand | `casper-client account-address` | Easy to get the tag/separator wrong; one command does it correctly |
| Native delegate/undelegate args | Hand-encode auction entry-point args | `casper-client put-txn delegate/undelegate/redelegate` | Native subcommands encode `--delegator/--validator/--amount` correctly (Phase 4) |
| Keypair generation | OpenSSL ed25519 + manual hex prefix | `casper-client keygen` | Produces the exact `secret_key.pem`/`public_key.pem`/`public_key_hex` triple Casper expects |

**Key insight:** On Casper 2.0 the Rust `casper-client` IS the canonical, version-tracking implementation of the Transaction model. Re-implementing any of it in Python is the dead-end the BUILD-PROMPT warns against — and it's why pycspr (a hand-rolled Python re-impl that fell behind) is unfit here.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Building on pycspr's Deploy API
**What goes wrong:** You wire the agent to `pycspr.create_native_transfer()` / `create_validator_auction_bid()`, it "works" for a transfer, then Phase 4 delegation can't be expressed as a Casper 2.0 Transaction and you rewrite the chain layer mid-buildathon.
**Why it happens:** pycspr installs cleanly and its Deploy examples run; the gap is invisible until you need Condor Transactions.
**How to avoid:** Don't install pycspr. Use casper-client v5 from day one. Phase-1 transfer and Phase-4 delegate share the same binary.
**Warning signs:** Code references `Deploy`, `account_put_deploy`, `create_*` factory functions.

### Pitfall 2: Wrong/guessed CLI flag names
**What goes wrong:** `put-txn transfer` rejects `--amount` (wants `--transfer-amount`) or errors on missing `--pricing-mode`/`--payment-amount`; or you use `put-transaction` where the binary wants `put-txn`.
**Why it happens:** Docs pages are inconsistent across versions; some show v1.x flags.
**How to avoid:** Run `casper-client put-txn transfer --help` (and `delegate --help`) on the INSTALLED v5 binary and copy flags from there before locking `chain.py`.
**Warning signs:** "unexpected argument" / "required argument not provided" errors.

### Pitfall 3: Expecting an automatable faucet
**What goes wrong:** D-08's "programmatic funding first" stalls because the faucet needs Casper Wallet login in a browser.
**Why it happens:** No public HTTP funding API is documented.
**How to avoid:** Plan a manual funding checkpoint: print `public_key_hex` + faucet URL, pause for the user, then verify balance via `query_balance` before proceeding.
**Warning signs:** Looking for a faucet REST endpoint that doesn't exist.

### Pitfall 4: Acting on unconfirmed transactions
**What goes wrong:** Submitting then immediately reading balance shows stale state (txn not yet executed).
**Why it happens:** Async execution; transaction_hash returns before inclusion.
**How to avoid:** Poll `get-transaction`/`info_get_transaction` until `execution_result` = Success before the next read. (Critical from Phase 3; good habit in the Phase-1 confirm step.)
**Warning signs:** Balance unchanged right after a transfer.
</common_pitfalls>

<code_examples>
## Code Examples

### Live RPC status (what I actually ran)
```bash
# Source: live call 2026-06-25 -> api_version 2.0.0, protocol 2.2.2, chainspec casper-test, height 8297460
curl -s -X POST https://node.testnet.casper.network/rpc -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"info_get_status","params":[]}'
```

### Native delegate (Phase 4 preview — same binary as Phase-1 transfer)
```bash
# Source: casper-client-rs/src/transaction.rs (put-txn subcommands: delegate, undelegate, redelegate)
casper-client put-txn delegate \
  --delegator <AGENT_PUBKEY_HEX> \
  --validator <VALIDATOR_PUBKEY_HEX> \
  --transaction-amount <MOTES> \
  --chain-name casper-test \
  --secret-key secrets/secret_key.pem \
  --gas-price-tolerance 1 \
  --pricing-mode fixed \
  -n https://node.testnet.casper.network/rpc
# redelegate adds --new-validator <PUBKEY_HEX>. Confirm exact flags via `--help` on the installed binary.
```

### Keygen + account hash
```bash
# Source: docs.casper.network/concepts/accounts-and-keys
casper-client keygen secrets/
casper-client account-address --public-key secrets/public_key_hex
```
</code_examples>

<sota_updates>
## State of the Art (2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Deploys (`account_put_deploy`) | **Transactions** (`account_put_transaction`, `put-txn`) | Casper 2.0 "Condor" (now live on testnet, protocol 2.2.2) | Deploys deprecated but still execute; build on Transactions |
| pycspr for Python chain layer | **casper-client v5 CLI** (Python orchestrates via subprocess) | pycspr stalled at 1.2.0 (Deploy-only) | Python SDK no longer the right tool for Casper-2.0 writes |
| casper-js-sdk v2.x | **casper-js-sdk v5.x** (`condor`/`latest`) | v5 line for Casper 2.0 | Frontend must use v5; v1.x is `legacy` |
| Odra 0.x/1.x | **Odra 2.8.x** | 2026 | Phase-2 contracts on Odra 2.8.1 |

**Deprecated/outdated:**
- **pycspr Deploy factories** for new Casper-2.0 work — superseded by the Transaction model the released SDK doesn't yet ship.
- **casper-js-sdk v1.x/v2.x tutorials** — `legacy` tag; do not follow for the v5 frontend.
</sota_updates>

<open_questions>
## Open Risks / Unverified

1. **Exact `put-txn transfer`/`delegate` flag spelling on the installed v5 binary.**
   - Known: subcommands `transfer/delegate/undelegate/redelegate` exist (verified in source); docs example used `--transfer-amount`, `--gas-price-tolerance`, `--pricing-mode`, `--secret-key`, `-n`.
   - Unclear: whether v5 uses `--transaction-amount` vs `--transfer-amount`, requires `--payment-amount`/`--standard-payment`, and the exact JSON key holding the returned `transaction_hash`.
   - Recommendation: **first task in Phase-1 execution is `casper-client put-txn transfer --help` and `delegate --help`** on the installed binary; lock `chain.py` flags from that output.

2. **Programmatic faucet funding (D-08).**
   - Known: faucet is `https://testnet.cspr.live/tools/faucet`, Casper-Wallet-gated, once-per-account; no documented public HTTP API.
   - Unclear: whether any undocumented endpoint exists.
   - Recommendation: treat as manual — surface pubkey + URL to the user; don't block the phase on automation.

3. **pycspr `dev` branch viability** (not chosen, but for the record).
   - Known: `dev` has `transaction.py` + `transactions/v1.py`,`v2.py`.
   - Unclear: completeness, native-auction delegate support, stability; no release, no docs.
   - Recommendation: ignore for this build; revisit only if a stable pycspr 2.x ships.

4. **`query_balance` purse identifier shape.**
   - Known: method is live (verified). Identifier likely `{"main_purse_under_public_key": "<hex>"}` or `{"main_purse_under_account_hash": "<hash>"}`.
   - Recommendation: confirm the exact param key against the v5 RPC schema / a real call during execution.

5. **Casper Wallet dapp-connect API** (Phase 5) — not researched here; capture for the frontend phase.
</open_questions>

<environment_availability>
## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python (`py` launcher) | Agent brain + subprocess | ✓ | 3.14.2 [VERIFIED] | — |
| Rust / cargo | Install casper-client (D-05) | ✓ (per D-05) | cargo 1.95 (verify) | Prebuilt casper-client binary |
| casper-client | Chain layer | ✗ (to install) | target 5.0.1 | Prebuilt binary from GitHub releases |
| Testnet RPC | Reads + submits | ✓ [VERIFIED live] | api 2.0.0 / protocol 2.2.2 | Tatum gateway `casper-testnet.gateway.tatum.io` |
| Testnet faucet | Fund agent key | ⚠ browser/wallet-gated | — | Manual funding by user (D-08) |
| Explorer | Confirm txns | ✓ | testnet.cspr.live | — |
| curl | Live RPC probes | ✓ [VERIFIED] | — | httpx |

**Missing dependencies with no fallback:** none blocking.
**Missing with fallback:** casper-client (install via cargo, fallback prebuilt binary); faucet automation (fallback manual funding).
</environment_availability>

<sources>
## Sources

### Primary (HIGH confidence — live tool/registry verification this session)
- **Live testnet RPC** `https://node.testnet.casper.network/rpc` — `info_get_status` (api 2.0.0, protocol 2.2.2, chainspec `casper-test`, block 8,297,460 @ 2026-06-25T14:56:02Z); `account_put_transaction`, `account_put_deploy`, `query_balance` all return `-32602` (method exists). [VERIFIED via curl]
- **crates.io API** — casper-client 5.0.1 (2026-03-16), odra 2.8.1 (2026-06-11), cargo-casper 3.0.0 (2025-07-28). [VERIFIED]
- **npm registry** — casper-js-sdk dist-tags `{legacy:1.4.3, condor:5.0.16-beta2, latest:5.0.12}` (2026-04-29). [VERIFIED]
- **PyPI API** — pycspr 1.2.0, `requires_python <4.0,>=3.12`, released 2024-04-04. [VERIFIED]
- **GitHub API** — casper-network/casper-python-sdk tree (branches `main`/`dev`; `main` has only `deploy*`, no `transaction`; `dev` has `transaction.py`,`transactions/v1.py`,`v2.py`); casper-ecosystem/casper-client-rs tree+source (`src/transaction.rs` subcommands: transfer, delegate, undelegate, redelegate, add-bid…; `lib/rpcs/v2_0_0/put_transaction.rs`). [VERIFIED]
- `py --version` → 3.14.2 [VERIFIED locally]

### Secondary (MEDIUM confidence — official docs)
- https://docs.casper.network/condor/index — Casper 2.0 release notes (Deploys→Transactions; Deploys still accepted, deprecated). [CITED]
- https://docs.casper.network/concepts/transactions — transaction model, legacy-Deploy acceptance, delegate CLI params (`--delegator/--validator/--transaction-amount/--new-validator`). [CITED]
- https://docs.casper.network/condor/transactions — `put-transaction transfer` example (`--transfer-amount`,`--gas-price-tolerance`,`--secret-key`,`-n`), `putTransaction()` submission. [CITED]
- https://docs.casper.network/concepts/accounts-and-keys — keygen triple, ed25519 `01`/secp256k1 `02` prefix, `account-address`. [CITED]
- https://docs.casper.network/users/testnet-faucet — faucet `testnet.cspr.live/tools/faucet`, wallet-gated, once-per-account. [CITED]
- https://docs.casper.network/operators/setup/node-endpoints — testnet RPC endpoint. [CITED]
- https://odra.dev/docs/backends/casper/ — Odra Casper-2.0 backend. [CITED]
- https://testnet.cspr.live/tools/faucet — faucet UI. [CITED]

### Tertiary (LOW confidence — needs validation at execution)
- Exact v5 CLI flag names + JSON output keys — confirm via `--help` on installed binary.
- `query_balance` purse-identifier param shape — confirm via v5 RPC schema.
- Tatum RPC gateway as RPC fallback — not independently tested this session.
</sources>

<metadata>
## Metadata

**Research scope:**
- Core: Casper 2.0 testnet transaction model + chain-layer client selection
- Ecosystem: pycspr, casper-client (Rust), casper-js-sdk, Odra, cargo-casper
- Patterns: CLI-subprocess chain layer, keygen/account-hash, faucet flow
- Pitfalls: pycspr Deploy dead-end, CLI flag drift, faucet automation, tx confirmation

**Confidence breakdown:**
- Standard stack / versions: HIGH — verified against crates.io/npm/PyPI/GitHub APIs live
- Transaction model + RPC liveness: HIGH — live testnet calls
- Native auction subcommands: HIGH — read from casper-client v5 source
- Exact CLI flags / faucet automation: MEDIUM — docs inconsistent / no public faucet API
- Chain-layer recommendation: HIGH — pycspr unfitness is structurally confirmed (no transaction module in released code)

**Research date:** 2026-06-25
**Valid until:** 2026-07-09 (~14 days — Casper 2.0 tooling is moving; re-verify casper-client flags + any pycspr 2.x release before relying on stale specifics)
```

---

*Phase: 01-toolchain-reality-check*
*Research completed: 2026-06-25*
*Ready for planning: yes*
