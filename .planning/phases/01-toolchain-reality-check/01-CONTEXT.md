# Phase 1: Toolchain & Reality Check - Context

**Gathered:** 2026-06-25
**Status:** Ready for planning
**Source:** PRD Express Path (BUILD-PROMPT.md)

<domain>
## Phase Boundary

Prove the Casper 2.0 "Condor" toolchain and the agent's chain layer actually work against the LIVE Casper testnet **before any product logic is written**. This is a non-negotiable reality-check gate, not a research note. Deliverables: (a) confirmation of the live Casper 2.0 transaction model, native-auction (delegate/undelegate/redelegate) interface, current testnet RPC endpoint, and faucet; (b) a working Python script that reads the agent account's CSPR balance from testnet AND submits + confirms a tiny self-transfer; (c) a funded testnet keypair confirmed on the explorer; (d) a written, evidence-backed decision on which chain-layer library is used, with every delta from the BUILD-PROMPT's assumptions explicitly flagged.

Covers requirements **TOOL-01, TOOL-02, TOOL-03, TOOL-04**. No contracts, no agent loop, no frontend in this phase.

</domain>

<decisions>
## Implementation Decisions

### Network (LOCKED)
- **D-01:** Casper **testnet only** (`casper-test`), never mainnet, no real funds. Ever.

### Chain layer — the crux decision (RESOLVE IN RESEARCH, then LOCK)
- **D-02:** Primary candidate is **pycspr** (Python) so the agent brain and chain layer share one runtime. BUT this is conditional: the researcher MUST determine whether the current pycspr release supports the **Casper 2.0 "Condor" Transaction model** (not just legacy Deploys) for native-auction delegation on testnet today.
- **D-03:** Fallback order if pycspr lags Casper 2.0: (1) drive the **`casper-client` CLI** from Python (subprocess), (2) a **Node `casper-js-sdk` sidecar**. Decide at THIS gate — do not defer the decision into later phases.
- **D-04:** Whatever is chosen, the Phase-1 proof must use the SAME mechanism the agent will later use to delegate — so the self-transfer/ balance-read script exercises the real submission path, not a dead-end API.

### Toolchain (LOCKED where known; verify versions live)
- **D-05:** Rust is present (`cargo 1.95`). `casper-client` to be installed (cargo install or prebuilt) — verify the install path on Windows and its Casper 2.0 support.
- **D-06:** Python is invoked via the **`py`** launcher (Python **3.14** on this machine). BUILD-PROMPT assumed 3.11+; 3.14 is newer — researcher must flag any pycspr/dependency incompatibility with 3.14 (this is a real risk; if pycspr needs <3.13, plan a pinned venv).
- **D-07:** Secrets live only in a gitignored `.env`; the agent secret key in `./secrets/*.pem` (gitignored). `.env.example` is committed. (Already enforced: `.gitignore` covers `.env`, `secrets/`, `*.pem`.)

### Faucet funding (per user)
- **D-08:** Attempt **programmatic** faucet funding first; if it requires captcha/manual steps, surface the public key + faucet URL for the user to fund, then continue. (User chose "you try to automate funding too.")

### Claude's Discretion
- Exact script structure/layout under `agent/` for the Phase-1 probe; how the chain-layer abstraction is shaped (so later phases can reuse it); choice of test validators (pick from the live auction set).

</decisions>

<specifics>
## Specific Ideas

- The BUILD-PROMPT is emphatic: "Do not trust any version/interface from memory — confirm against live docs and a live testnet call first." Treat every SDK version, RPC URL, and auction interface as unverified until a live source confirms it.
- The acceptance bar (BUILD-PROMPT §6 Phase 0) is concrete: a Python script that (a) reads the agent account balance from testnet and (b) submits + confirms a tiny self-transfer. If pycspr can't do Casper 2.0 transactions, switch to the CLI/Node fallback NOW.
- Output of this phase should include a short written "reality report" (deltas vs the BUILD-PROMPT) — this is an explicit deliverable the product owner wants before proceeding.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Spec / requirements
- `BUILD-PROMPT.md` §4 (tech stack table + "VERIFY EVERYTHING IN PHASE 0"), §6 Phase 0 (acceptance), §0 & §12 (Phase 0 mandate + report deltas), §9 (secrets), Appendix A (env vars, keys) — the authoritative spec.
- `.planning/REQUIREMENTS.md` — TOOL-01..04 (exact acceptance wording).
- `.planning/ROADMAP.md` — Phase 1 goal + success criteria.
- `.planning/PROJECT.md` — stack + constraints.

### Live sources the researcher must consult (not memory)
- Casper docs (2.0 / Condor): `https://docs.casper.network/` — transaction model, native auction delegate/undelegate/redelegate interface, testnet RPC, faucet.
- `pycspr` repo/PyPI — current version + Casper 2.0 Transaction support status (+ Python 3.14 compat).
- `casper-js-sdk` repo — Casper 2.0 support (frontend reads + possible sidecar).
- Odra `https://odra.dev/` + repo — current version + Casper 2.0 target (informs Phase 2, capture now).
- CEP-18 standard reference (capture for stretch).
- A live public testnet node RPC + the testnet faucet URL/flow.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None yet — this is the first build phase. The chain-layer abstraction created here (balance read + transaction submit/confirm) becomes the foundation reused by Phase 3 (perceive) and Phase 4 (staking actions). Design it for reuse.

### Established Patterns
- Repo layout target (BUILD-PROMPT §10): `agent/` for the Python brain, `contracts/` for Rust/Odra, `frontend/` for Next.js, `deployments/testnet.json` for live hashes/keys.

### Integration Points
- The Phase-1 probe must use the exact submission path the agent will reuse to delegate (D-04), so it is a vertical slice of the chain layer, not throwaway.

</code_context>

<deferred>
## Deferred Ideas

- Journal contract (Rust/Odra) — Phase 2.
- Agent perceive→decide→attest loop, IPFS pinning, the `decide`/`attest` code in Appendix A — Phase 3.
- Mapping decisions to native-auction delegate deploys (real staking) — Phase 4. (Phase 1 only proves the submission path with a trivial self-transfer.)
- CEP-18 `rwUSD`, vault, RWA allocation — Phase 6 stretch.

</deferred>

---

*Phase: 01-toolchain-reality-check*
*Context gathered: 2026-06-25*
