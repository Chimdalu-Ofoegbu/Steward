# Steward — Launch Plan & Mainnet Roadmap

**One line:** Steward is an autonomous AI agent that manages an on‑chain CSPR treasury and **proves its reasoning on‑chain before it moves a single token** — so the entire agentic process is publicly auditable. *Don't trust it — verify it.*

**Status today:** Live on **Casper testnet** at **[aisteward.xyz](https://aisteward.xyz)** — a real funded agent, real native‑auction delegations, and every decision attested on‑chain with a public, one‑click Verifier.

> **Positioning calls made here are defaults — flag any you want changed.** Marked inline with 🔧. Nothing in this document claims traction, users, partnerships, or metrics that don't exist; everything under "Where we are" is verifiable on‑chain today.

---

## 1. The problem

Autonomous agents are starting to move real money on‑chain — rebalancing treasuries, managing DeFi positions, executing strategies. But they are **black boxes**: when an agent moves your funds, you get an outcome, not an accountable reason. "Trust the agent" is not a governance model a DAO, a fund, or a regulator can accept.

Existing "AI + treasury" projects lean on off‑chain trust ("the agent is a good steward"). The missing primitive is **verifiable honesty**: a tamper‑evident, on‑chain record of *why* an agent acted, provably committed *before* it acted.

## 2. The wedge

Steward makes the agentic process itself auditable:

1. **Perceive** live chain state (balance, validator set, delegations).
2. **Decide** with an LLM (Claude Opus 4.8, forced tool‑call) under a versioned mandate.
3. **Dispose in code** — deterministic risk gates clamp/​reject the model's proposal (the *code*, not the prompt, is the guardrail).
4. **Attest first** — pin the full reasoning + observed state to IPFS, and record its `sha256` to a Casper "Journal" smart contract **before any funds move**.
5. **Act** — a real native‑auction delegation, confirmed on‑chain.

Anyone can later verify that `sha256(the exact IPFS bytes) == the hash recorded on‑chain`, that the attestation was **signed by the agent key**, and that the **attestation block precedes the staking block**. That's integrity + provenance + ordering — the honest, pragmatic trust primitive that's shippable *today* (no zkML hand‑waving).

## 3. Who it's for (target users)

🔧 *Primary and secondary targets — reprioritize as you see fit.*

| Segment | Pain | Why Steward |
|---|---|---|
| **DAO & foundation treasuries** (primary) | Idle native tokens; members can't audit why the treasury moved | Auditable, policy‑bounded staking with an on‑chain paper trail every member can verify |
| **Validator operators & staking services** | Need transparent, rules‑based delegation they can show clients | Code‑enforced mandate + public attestations = a trust artifact for their customers |
| **RWA / tokenized‑fund managers** (roadmap) | Regulated capital demands provable, compliant decision records | Attestation‑before‑action maps directly onto audit/compliance requirements (see §6) |

## 4. Where we are (verifiable today, not claims)

- **Live agent** on Casper testnet; agent key `01c85dcb…87539e`, funded, actively delegating.
- **On‑chain Journal contract** (Odra/Rust → WASM), package `506497e9…5bab3aa2`, agent‑only `record()` (deployer‑bound provenance).
- **Real delegations:** ~3,420 CSPR delegated across 2 validators, ~882 CSPR liquid buffer (~4,302 CSPR total) — all readable on [cspr.live](https://testnet.cspr.live).
- **Attested decision journal:** every cycle's reasoning pinned to IPFS + hashed on‑chain; the public **Verifier** recomputes the hash and confirms integrity, provenance, and block‑ordering in ~2 seconds, with zero setup.
- **Security posture:** read‑only web tier (no keys, no spend authority in the browser); code‑enforced risk caps; testnet‑only secrets.

## 5. Testnet → Mainnet: what changes

Steward is deliberately **testnet‑only** today. Moving real value to mainnet raises the bar in five concrete places:

| Area | Testnet today | Mainnet requirement |
|---|---|---|
| **Key custody** | Single funded hot key (local, never in the web tier) | Threshold/MPC signing or HSM‑backed keys; no single point of compromise 🔧 |
| **Policy enforcement** | Risk caps in agent code (40%/validator, 10k/cycle) | Caps + circuit‑breakers committed **on‑chain** (policy hash in the Journal) so the agent *provably cannot* exceed them; human‑in‑the‑loop above a threshold |
| **Audit** | Unit‑tested contract + risk gate | Third‑party smart‑contract + action‑path audit (Casper's ecosystem audit partner is Halborn) |
| **Monitoring** | Manual cycle runs | Continuous monitoring, anomaly/balance‑drift alerting, public status page |
| **Onboarding** | Single self‑managed treasury | Multi‑tenant treasury isolation; gasless / account‑abstraction deposits (casper‑eip‑712) for non‑technical owners |

## 6. Roadmap

*Dates are targets, not commitments.*

- **Phase 0 — Verifiable agent (DONE, testnet).** Perceive→decide→risk→attest→act loop; on‑chain Journal; public Verifier; live at aisteward.xyz.
- **Phase 1 — Casper‑native agent surface (in progress, final round).** Expose Steward's chain reads as an **MCP server** an LLM can call; settle at least one real **x402** machine payment (agent pays for its inputs / sells metered journal reads); commit the risk policy hash on‑chain.
- **Phase 2 — Mainnet pilot (Q4 2026).** Deploy to mainnet with a **capped** pilot treasury; threshold signing; contract audit; monitoring + status page. Design partner: 1 DAO treasury. 🔧
- **Phase 3 — Treasury‑as‑a‑Service (H1 2027).** Multi‑tenant; policy templates; owner dashboard; onboarding via account abstraction; SLA tier.
- **Phase 4 — RWA & compliance (H2 2027).** Allocation into tokenized/RWA assets (CEP‑18 today → ERC‑3643‑style compliant tokens); auditor‑verifiable records; enterprise deployments — aligned with the Casper Manifest's RWA + machine‑economy direction.

## 7. Business model

🔧 *Default model — adjust freely.*

1. **Management fee** — basis points on assets under management for the Treasury‑as‑a‑Service tier (Phase 3+).
2. **x402‑metered audit access** — other agents/auditors pay per machine‑to‑machine read of the verified decision journal (an on‑chain, pay‑per‑query trust feed). Dogfoods Casper x402.
3. **Enterprise / compliance tier** — private deployment, custody options, SLAs, compliance reporting for regulated treasuries.

## 8. Why Casper

Steward is built on the primitives Casper is betting on, and slots into the **Casper Manifest** (frictionless for users, trusted by institutions, native for machines):

- **x402** — machine‑native payments so the agent can transact as a real economic actor.
- **MCP + Agent Skills** — the standard interface for LLM agents to read/act on Casper.
- **Odra + native auction** — the contract + staking rails Steward already uses on‑chain today.
- **RWA + compliance + verifiable/auditable transactions** — Steward's attestation‑before‑action is the trust layer these enterprise use‑cases need.

## 9. Team

Built by **Bensage** and **Chimdalu Ofoegbu** for the Casper Agentic Buildathon 2026 (Innovation Track). Repo: [github.com/Chimdalu-Ofoegbu/Steward](https://github.com/Chimdalu-Ofoegbu/Steward).

## 10. Links & socials

- **App:** https://aisteward.xyz
- **Repo:** https://github.com/Chimdalu-Ofoegbu/Steward
- **Explorer (agent account):** https://testnet.cspr.live/account/01c85dcb19012ff343ef214d34ad00c9fe38ee3b3abbffdfff276de121cc87539e
- **X / socials:** 🔧 *to be created — see `docs/SOCIALS.md` for drafted handle, bio, and launch posts.*

---

*Honesty note: this is a plan. Phase 0 is live and independently verifiable on‑chain now; Phases 1–4 are the intended path, not shipped features.*
