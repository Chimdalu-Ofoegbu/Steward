# Steward — DoraHacks BUIDL submission (copy-paste ready)

> Paste these fields into the DoraHacks BUIDL for the **Casper Agentic Buildathon 2026**.
> Replace the two placeholders: **[DEMO_VIDEO_URL]** (task #5) and **[TEAM_HANDLES]**.
> Confirm the exact video-length cap + judging criteria on the BUIDL page before final submit.

---

## Name
**Steward — a verifiable autonomous treasury agent on Casper**

## Tagline (one line)
An AI agent that manages a staked-CSPR treasury natively on Casper and **proves every decision it makes on-chain** — publicly auditable, live on testnet.

## Track
Innovation — **Agentic AI · DeFi · RWA**

## Tags / tech
Agentic AI · Claude (Opus 4.8, forced-tool structured output) · Casper 2.0 "Condor" · native auction PoS delegation · Odra/Rust smart contract (WASM) · casper-js-sdk v5 · IPFS (Pinata) · Next.js 14 · TypeScript

---

## Description

**Steward is an autonomous AI agent that manages a real staked-CSPR treasury on the Casper Network and attests the *reasoning* behind every move on-chain — before it acts — so the entire agentic process is independently verifiable.**

Most "AI + crypto" demos ask you to trust a black box. Steward is the opposite: every cycle, the agent

1. **PERCEIVES** live on-chain state (treasury balance, validators, its own delegations) read straight from Casper testnet;
2. **DECIDES** a single treasury action by prompting `claude-opus-4-8` with a versioned strategy mandate, returning a **schema-validated** decision (forced-tool call — malformed output is rejected, no action taken);
3. **RISK-CHECKS** that decision in deterministic code *after* the model (max move size, ≤40% per validator, min validators, amount ≤ treasury) — the model proposes, code disposes;
4. **ATTESTS** by pinning the full reasoning + observed-state snapshot to IPFS, then writing `sha256(those exact bytes)` to an on-chain **Journal** smart contract (agent-key-only `record`) — *this always precedes the action*;
5. **ACTS** with a real native-auction delegation/redelegation on Casper.

**The differentiator — a verifiable agent decision journal.** Anyone can fetch the raw reasoning bytes for a decision's IPFS CID, `sha256` them, and confirm the digest equals the hash recorded on-chain, attested by the agent's key at a specific block. The frontend **Verifier** does exactly this, live, in the browser. Proven end-to-end: on-chain hash `dd639126…cffd20a` == `sha256(raw IPFS bytes)`.

**Honest framing (a feature, not a footnote).** Steward proves a logged decision is **authentic, unaltered, and was made at time X by the agent's key** — *integrity + provenance*. It does **not** claim re-running the prompt yields byte-identical output (LLMs use adaptive sampling). That's the honest, defensible, auditability-relevant claim — stated plainly in the UI and README.

**The three pillars, all real:**
- **Agentic AI** — a true perceive→decide→act loop on its own cadence, not a chatbot.
- **DeFi** — real native Proof-of-Stake delegation (the agent delegated **1,700 CSPR** from its own decision), with code-enforced risk limits.
- **RWA** — the same attestation pattern extends directly to compliant tokenized assets; the decision schema already carries an `rwusd_target_pct` allocation field (CEP-18 mock is the documented stretch).

**The web tier is read-only by design** — no wallet, keys, or spend authority in the browser. Spend authority lives only with the agent's server-side key. The dashboard only *reads and verifies* what already happened on-chain.

---

## Verify it yourself (live on Casper testnet)

| Thing | On-chain proof |
|---|---|
| Network / RPC | `casper-test` · `node.testnet.casper.network/rpc` |
| Agent account | `01c85dcb…87539e` — testnet.cspr.live/account/01c85dcb19012ff343ef214d34ad00c9fe38ee3b3abbffdfff276de121cc87539e |
| **Journal contract** (Odra/Rust) | package `506497e9…3aa2` — testnet.cspr.live/contract-package/506497e9dc4607460891120b7bccc8b182686ab2207a629cbb57204d5bab3aa2 |
| Attestation (decide → IPFS → chain) | txn `71d9efcb…0d65` — hash == sha256(IPFS) ✅ |
| Real delegation (from a decision) | txn `992fa9f6…12ea` — 1,700 CSPR, attestation-first |
| Integrity check | on-chain hash == `sha256(raw IPFS bytes)` == `dd6391262a5b73ad78c444ef63a15f48d704b6b07532f6f2834e3c678cffd20a` |

Machine-readable record: `deployments/testnet.json`.

**Freshly minted live (epoch 4 — a prudent `hold`):** the agent perceived live state, reasoned explicitly about its 40%/validator cap and ≥3-validator floor, chose to **hold** rather than force an unsafe move, and still attested its full reasoning on-chain. The Verifier confirms **MATCH** (all four steps green, live).
- attestation txn `dd031758…50eb1` · CID `bafkrei…cigpa` · hash `93a0cf86…0678`
- integrity: `sha256(raw IPFS bytes)` == on-chain hash ✅

---

## Links
- **Source (GitHub):** https://github.com/Chimdalu-Ofoegbu/Steward
- **Demo video:** [DEMO_VIDEO_URL]
- **Run it:** `frontend/` → `npm run dev` (read-only, no secrets); agent → `agent/run_cycle.py` (needs `agent/.env` + funded key). Full steps in `README.md`.

## Team
[TEAM_HANDLES]
