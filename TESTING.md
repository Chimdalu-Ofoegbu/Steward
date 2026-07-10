# Testing Steward — step-by-step

There are two ways to test Steward: **verify** what the agent recorded on-chain (no install), or **run** the agent yourself (full reproduction). Both are below.

---

## A. Verify it yourself — no install, ~2 minutes

1. Open the live app: **https://aisteward.xyz**
2. **Dashboard** — the treasury total and per-validator allocation are read live from Casper testnet.
3. **Decisions** — open a decision (e.g. the epoch-5 *"delegate 1,720 CSPR"*). Read the agent's rationale.
4. **Verifier** — select that decision and run it. The Verifier:
   - fetches the **raw reasoning bytes** for the decision's CID from IPFS,
   - computes `sha256` of those exact bytes,
   - compares it to the hash recorded **on-chain** by the agent's key.

   Expected result: **MATCH** — all steps green.
5. **Cross-check on the Casper explorer** — open the transactions on https://testnet.cspr.live and confirm they were signed by the agent account. Note that the **attestation block precedes the staking block**: the agent recorded *why* before it acted.

Reference transactions (epoch 5 — a live diversification into a second validator):

| Item | Link |
|---|---|
| Attestation (the "why") | https://testnet.cspr.live/transaction/4ebe2680a7c65d2f2332564c5d3545a3c2f9ab178eb3e131ef2e01147e445d04 |
| Delegation (1,720 CSPR) | https://testnet.cspr.live/transaction/b5e0a14a3512ee14beae48ff4dc6a82ccc58416cf588be21122478f04de83745 |
| Journal contract | https://testnet.cspr.live/contract-package/506497e9dc4607460891120b7bccc8b182686ab2207a629cbb57204d5bab3aa2 |
| Agent account | https://testnet.cspr.live/account/01c85dcb19012ff343ef214d34ad00c9fe38ee3b3abbffdfff276de121cc87539e |

The Verifier accepts **any** attestation transaction hash — including cycles you run yourself (section B).

---

## B. Run the agent yourself — full reproduction

**Prerequisites:** Node 18+, Python 3.11+, a Casper testnet key, an Anthropic API key, a Pinata JWT.

1. Clone and install:
   ```bash
   git clone https://github.com/Chimdalu-Ofoegbu/Steward
   cd Steward/agent
   python -m venv .venv
   # Windows: .venv/Scripts/pip   |   macOS/Linux: .venv/bin/pip
   .venv/Scripts/pip install anthropic httpx pydantic python-dotenv
   cd sidecar && npm install && cd ..
   ```
2. Configure `agent/.env` (copy from `agent/.env.example`): set `ANTHROPIC_API_KEY`, `PINATA_JWT`, `CASPER_NODE_RPC`, and `AGENT_SECRET_KEY_PATH`.
3. Fund your agent key from the **Casper testnet faucet**.
4. Run one cycle:
   ```bash
   # Windows: .venv/Scripts/python   |   macOS/Linux: .venv/bin/python
   .venv/Scripts/python run_cycle.py
   ```
   It prints the IPFS CID, the on-chain decision hash, the attestation txn, and — if it acts — the staking txn.
5. Verify your own cycle: paste your attestation txn hash into the Verifier at https://aisteward.xyz → expect **MATCH**.

---

## Frontend (read-only) locally

```bash
cd frontend && cp .env.example .env.local && npm install && npm run dev
# http://localhost:3000
```

---

## Expected results (acceptance criteria)

- A full cycle produces an on-chain attestation whose recorded hash equals `sha256` of the exact IPFS-pinned reasoning bytes.
- The attestation is always written **before** any staking transaction.
- A malformed / refused model response is skipped with **no on-chain write** (fail-safe).
- Every risk limit is enforced in deterministic code **after** the model responds: max 40% per validator, minimum validator count, max 10,000 CSPR per move, and amount not exceeding the treasury.
