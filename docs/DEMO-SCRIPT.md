# Steward — Demo Video Script (~2–3 min)

Goal: show a real autonomous agent making a treasury decision on Casper and proving it on-chain. Record a screen capture with the frontend (`cd frontend && npm run dev` → http://localhost:3000) and a terminal ready.

Pre-roll setup (off-camera): frontend running; `agent/.env` has the keys; agent key funded. Have these tabs ready: the dashboard, the Verifier page, and [testnet.cspr.live](https://testnet.cspr.live).

---

### 1. Hook (15s)
> "This track is about Agentic AI, DeFi, and RWA. Meet **Steward** — an AI agent that manages a live treasury on Casper and **proves every decision it makes on-chain**, so the whole agentic process is publicly auditable."

Show the **dashboard** (Overview): treasury total, the allocation across validators, the agent's identity, the latest verified decision. Emphasize: this is reading Casper testnet **live**.

### 2. The agent loop, live (45s)
Switch to the terminal. Run one cycle:
```bash
agent/.venv/Scripts/python.exe agent/run_cycle.py
```
Narrate as the output appears:
> "It **perceives** live treasury + validator state… asks the model for a decision under its strategy mandate… the **risk code** checks the move against the limits — model proposes, code disposes… it **pins the full reasoning to IPFS**, and writes a hash of that reasoning to the on-chain **Journal contract** — the attestation comes *before* the action… then it **executes a real native-auction delegation**."

Point out the printed **IPFS CID**, the **on-chain hash**, the **Journal attestation txn**, and the **staking txn**. Open the staking txn on [testnet.cspr.live](https://testnet.cspr.live) to show it's real.

### 3. The Verifier — the centerpiece (30s)
Go to the **Verifier** page in the dashboard. Pick the decision that was just made (or epoch 1/2).
> "Anyone can audit the agent. The Verifier fetches the **raw bytes** of the reasoning from IPFS, hashes them, and confirms it **matches the hash recorded on-chain**, attested by the agent's key."

Show the green **✅ match**: `sha256(raw IPFS bytes) == on-chain hash == dd639126…`. Read the honesty line on screen:
> "This proves the decision is **authentic, unaltered, and provably made by the agent** — integrity and provenance. We don't claim re-running the prompt is byte-identical; that's the honest claim, and it's the one that matters."

### 4. DeFi + (stretch) RWA (30s)
Back to **Treasury**: show the live allocation — 1700 CSPR delegated to a validator, the risk gauges (≤40% per validator, etc.) enforced by code.
> "This is real Casper DeFi — native Proof-of-Stake delegation, driven by the agent's own decisions, kept safe by code-enforced limits. The same verifiable-attestation pattern extends directly to compliant **RWA** tokens on Casper — the decision schema already carries an allocation field."

### 5. Casper + close (20s)
> "It's fully on Casper — Casper 2.0 transactions, the native auction system, a Casper smart contract for the journal, and the Casper JS SDK throughout. Steward is a credible, **verifiable** autonomous agent for treasury management — and the pattern is ready for RWAs as Casper's RWA infrastructure matures."

End on the dashboard with the live feed of attested decisions.

---

### Quick reference (paste into the video description)
- Journal contract: `https://testnet.cspr.live/contract-package/506497e9dc4607460891120b7bccc8b182686ab2207a629cbb57204d5bab3aa2`
- Agent account: `https://testnet.cspr.live/account/01c85dcb19012ff343ef214d34ad00c9fe38ee3b3abbffdfff276de121cc87539e`
- Attestation txn: `71d9efcb21c886c65c470e07878420cc19b7a045d604fcd90932ddb444dd0d65`
- Real delegation txn: `992fa9f63e5c5378483ac17929e068e0d38d5c2172ef7f98dbc9ac266f1b12ea`
- Integrity check: on-chain hash == `sha256(raw IPFS bytes)` == `dd6391262a5b73ad78c444ef63a15f48d704b6b07532f6f2834e3c678cffd20a`
