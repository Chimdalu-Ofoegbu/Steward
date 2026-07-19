# Steward — a verifiable autonomous treasury agent on Casper

> An AI agent that manages a staked-CSPR treasury **natively on the Casper Network** and **proves every decision it makes on-chain**. Built for the Casper Agentic Buildathon 2026 (Innovation Track).

Steward perceives live on-chain state, decides a treasury action under a fixed strategy mandate using an LLM, **pins its full reasoning to IPFS and writes a hash of that reasoning to an on-chain "Journal" smart contract** — *before* it acts — and then executes a real native-auction staking move within risk limits enforced in code. The result is an agentic process that is **publicly auditable and independently verifiable**: anyone can fetch the agent's reasoning, hash it, and confirm it matches the attestation recorded on-chain.

**The whole loop is live on Casper testnet today.** Not a mock.

**Vision, mainnet roadmap & business model:** [`docs/LAUNCH.md`](docs/LAUNCH.md) · **Test / verify it yourself:** [`TESTING.md`](TESTING.md)

---

## The three pillars (this track's ask), all real

- **Agentic AI** — a real perceive → decide → act loop (not a chatbot). The agent reads chain state, asks `claude-opus-4-8` for a structured, schema-validated decision under a versioned mandate, and acts on its own.
- **DeFi** — real native Proof-of-Stake delegation via Casper's auction system. The agent delegated **1700 CSPR** to a validator from its own decision.
- **RWA pattern** — the verifiable-attestation pattern extends directly to compliant tokenized real-world assets on Casper; the decision schema already carries an `rwusd_target_pct` allocation field (CEP-18 mock is the documented stretch).

## The differentiator: a verifiable agent decision journal

Every on-chain action is **preceded by an on-chain attestation of *why*.** Each cycle:
1. the full reasoning + observed-state snapshot is pinned to IPFS (canonical bytes) → a CID;
2. `sha256` of **those exact bytes** is written to the Journal contract via an agent-only `record(decision_hash, ipfs_cid, action_kind, epoch)`;
3. anyone can verify: fetch the **raw** bytes for the CID, `sha256` them, and confirm it equals the on-chain hash.

**Proven end-to-end:** on-chain hash `dd6391262a5b73ad78c444ef63a15f48d704b6b07532f6f2834e3c678cffd20a` == `sha256(raw IPFS bytes)`. The frontend Verifier does exactly this check, live, in the browser.

### Honest framing (please read)
Steward proves a logged decision is **authentic, unaltered, and was made at time X by the agent's key** — *integrity + provenance*. It does **not** claim that re-running the prompt reproduces a byte-identical answer (modern LLMs use adaptive sampling). The Verifier UI and this README state this plainly: that's the honest, defensible claim, and it's the one that matters for auditability.

---

## Architecture

```
        Steward agent (Python brain)                 Casper testnet
        loop every cycle:                            ┌─────────────────────────┐
        1. PERCEIVE  balance + auction (validators)  │  Native auction system  │
        2. DECIDE    LLM(strategy + state) → Decision│  (delegate/redelegate)  │
        3. RISK      code enforces limits (clamp/veto)│  Journal contract       │
        4. ATTEST    pin reasoning→IPFS, Journal.record│  (Odra/Rust, agent-only)│
        5. ACT       native delegate/redelegate       └─────────────────────────┘
                │  via a Node casper-js-sdk sidecar              ▲ live reads
                ▼                                                │
        IPFS (Pinata V3)                          Frontend (Next.js 15)
                                                  dashboard · feed · VERIFIER
```

- **Chain layer** — `agent/sidecar/chain.mjs`, a Node **casper-js-sdk v5** sidecar (keygen / balance / transfer / delegate / confirm / deploy-wasm / journal-record / auction-info), driven from Python (`agent/src/steward/chain.py`). The **same library** powers the frontend's live reads.
- **Agent brain** — `agent/src/steward/` (`perceive`, `decide` forced-tool→validated `Decision`, `risk` guardrails, `act`, `attest`, `loop`, `state` SQLite). Mandate in `agent/strategy.md`.
- **Contract** — `contracts/` Odra 2.8 Journal (`record` + `count`/`get_record` reads + `Recorded` event; the deployer becomes the sole authorized recorder). Unit-tested.
- **Frontend** — `frontend/` Next.js 15 + Tailwind + casper-js-sdk reads; the Verifier is the centerpiece.
- **Agentic surface** — `agent/mcp_server.py`, an **MCP server** (Casper AI Toolkit pattern) exposing Steward's state to any LLM; skill manifest in `agent/SKILL.md`.

## Agentic surface — MCP (Casper AI Toolkit)

Steward exposes its live treasury and its **verifiable decision journal** as a read-only **MCP server** any LLM agent can call — the toolkit's "expose Casper state to an LLM" pattern, pointed at Steward's own state:

| Tool | Returns |
|---|---|
| `get_treasury` | live liquid + delegated CSPR, per-validator delegations |
| `get_validators` | top active validators by weight |
| `list_decisions` | recent attested decisions (proposed vs. executed, hash, txn, verify URL) |
| `get_decision(hash)` | one decision in full + links to verify it on-chain |

Register it (Claude Desktop / Claude Code):

```json
{ "mcpServers": { "steward": { "command": "python", "args": ["<abs-path>/agent/mcp_server.py"] } } }
```

Every decision the tools return carries a `verify_url` that recomputes `sha256(IPFS reasoning) == on-chain hash` — so an agent querying Steward can **verify, not trust**. *(An x402-metered variant — other agents pay to read the journal — is on the roadmap; see [`docs/LAUNCH.md`](docs/LAUNCH.md).)*

## Live on testnet (verify it yourself)

| Thing | Value |
|---|---|
| Network / RPC | `casper-test` · `https://node.testnet.casper.network/rpc` |
| Agent account | [`01c85dcb…87539e`](https://testnet.cspr.live/account/01c85dcb19012ff343ef214d34ad00c9fe38ee3b3abbffdfff276de121cc87539e) |
| **Journal contract** | package [`506497e9…3aa2`](https://testnet.cspr.live/contract-package/506497e9dc4607460891120b7bccc8b182686ab2207a629cbb57204d5bab3aa2) |
| Attestation (decide→IPFS→chain) | txn [`71d9efcb…0d65`](https://testnet.cspr.live/transaction/71d9efcb21c886c65c470e07878420cc19b7a045d604fcd90932ddb444dd0d65) — hash == sha256(IPFS) ✅ |
| Real delegation (from a decision) | txn [`992fa9f6…12ea`](https://testnet.cspr.live/transaction/992fa9f63e5c5378483ac17929e068e0d38d5c2172ef7f98dbc9ac266f1b12ea) — 1700 CSPR, attestation-first |

Full machine-readable record: [`deployments/testnet.json`](deployments/testnet.json).

## How it uses Casper specifically

- **Casper 2.0 "Condor" transactions** (not legacy deploys) for transfers, native auction delegation, and the contract install session — built/signed/submitted via casper-js-sdk v5.
- **Native auction** (the system contract) for real PoS delegation — `NativeDelegateBuilder`/`NativeRedelegateBuilder`.
- A **Casper smart contract** (Odra 2.8 → WASM) for the on-chain Journal, deployed via a `SessionBuilder` install with Odra's install ABI.
- **casper-js-sdk v5** for all reads (balance, auction info, transactions) and writes.

## Run it

**Frontend (read-only, no secrets):**
```bash
cd frontend && cp .env.example .env.local && npm install && npm run dev
# → http://localhost:3000  (dashboard + decision feed + Verifier, all live)
```

**Agent (one cycle):** needs `agent/.env` (copy `agent/.env.example`, add `ANTHROPIC_API_KEY` + `PINATA_JWT`) and a funded agent key.
```bash
agent/.venv/Scripts/python.exe agent/run_cycle.py
# perceive → decide → risk → attest (IPFS + Journal) → act (delegate) → confirm
```

**Contract (rebuild + redeploy):** see [`contracts/build.sh`](contracts/build.sh) (note: Casper rejects post-MVP wasm, so the build lowers it to MVP with `wasm-opt`), then `agent/sidecar/chain.mjs deploy-wasm`.

## Repo layout
```
contracts/   Odra Journal contract (Rust→WASM) + build.sh
agent/       Python brain + the casper-js-sdk Node sidecar + strategy.md
frontend/    Next.js 15 dashboard · decision feed · Verifier
deployments/testnet.json   live contract hash + agent key + proofs
docs/DEMO-SCRIPT.md         the video walkthrough
.planning/   the GSD build trail (research, plans, summaries per phase)
```

## Engineering notes (hard-won, honest)
- **pycspr can't do Casper 2.0** (Deploy-only) and the **casper-client Rust CLI won't compile on Windows** — so the chain layer is a casper-js-sdk Node sidecar, which is also shared with the frontend. One chain library, cross-platform.
- **Casper's VM rejects post-MVP wasm features** (bulk-memory, etc.); contract builds are lowered to MVP with `wasm-opt`.
- The LLM is **never the only guardrail** — `agent/src/steward/risk.py` enforces every limit (max move, ≤40%/validator, amount ≤ treasury, allowed actions) in deterministic code *after* the model responds (it clamped a proposed 4000 CSPR move to 1725).
- Secrets discipline from commit #1: `.env`, `secrets/`, `*.pem`, `*.db` gitignored; testnet only, never mainnet.
