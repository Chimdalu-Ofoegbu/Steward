# Roadmap: Steward

## Overview

Steward is an autonomous AI agent that manages a CSPR treasury natively on the Casper testnet and proves every on-chain action with a preceding on-chain attestation of *why* — a verifiable, replayable agent decision journal. The journey starts with a non-negotiable toolchain gate (verify Casper 2.0 "Condor" against live docs and a live testnet call before any product logic), then builds the on-chain Journal attestation contract, the perceive→decide→attest agent loop, real native-auction staking actions driven by the agent's own decisions, a live frontend (dashboard + decision feed + verifier reading live chain state), and finally submission polish plus explicitly-optional v2 stretch. The MVP safety net — agent decides → attests on-chain → stakes on-chain → frontend shows it verifiably — is protected at every step; stretch is cut first if any phase slips. Testnet only, never mainnet; Casper is Rust→WASM (Odra preferred), not EVM.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Toolchain & Reality Check** - Verify Casper 2.0 "Condor" toolchain against live docs + a live testnet call before any product logic (non-negotiable gate)
- [x] **Phase 2: Journal Contract** - Deploy the agent-only on-chain attestation contract (Rust/Odra) — the verifiable-agent centerpiece
- [x] **Phase 3: Agent Loop — Perceive → Decide → Attest** - The agent perceives live state, emits a validated decision, pins reasoning to IPFS, and writes a matching on-chain attestation
- [x] **Phase 4: Act On-chain — Native Staking** - The agent executes real native-auction staking from its own decisions, with risk limits enforced in code and attestation-before-action
- [x] **Phase 5: Frontend — Live Dashboard, Decision Feed, Verifier** - Live dashboard + decision feed + honest integrity/provenance verifier, reading testnet live, built to the Claude Design handoff
- [ ] **Phase 6: Stretch, Polish & Demo** - Submission deliverables (demo video, README, deployments manifest); optional v2 stretch attempted only if the MVP is green

## Phase Details

### Phase 1: Toolchain & Reality Check
**Goal**: Prove the Casper 2.0 "Condor" toolchain and the agent's chain layer actually work against live testnet before any product logic is written — this is a non-negotiable gate, not a research note.
**Depends on**: Nothing (first phase)
**Requirements**: TOOL-01, TOOL-02, TOOL-03, TOOL-04
**Success Criteria** (what must be TRUE):
  1. The Casper 2.0 transaction model (Deploys→Transactions), the native auction (delegate/undelegate/redelegate) interface, the current testnet RPC endpoint, and the faucet URL are all confirmed against LIVE docs + a live call — not trusted from memory
  2. A Python script reads the agent account's CSPR balance from testnet AND submits + confirms a tiny self-transfer (via pycspr, or a documented fallback: casper-client CLI / Node casper-js-sdk sidecar)
  3. The agent's testnet keypair is generated, funded from the faucet, and confirmed on the explorer (testnet only — never mainnet)
  4. A written decision records which chain-layer library is used, and any deltas from the BUILD-PROMPT's assumptions are explicitly flagged before proceeding
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — chain layer (casper-js-sdk v5 sidecar) + agent keypair (TOOL-01/02/03)
- [x] 01-02-PLAN.md — faucet funding + probe.py write-path proof + reality report (TOOL-02/03/04)

### Phase 2: Journal Contract
**Goal**: Deploy the on-chain attestation contract — agent-only `record(...)` with frontend-readable history — so every later decision can be journaled verifiably. This small, safe contract is the verifiable-agent centerpiece; even if every other contract slips, this plus the loop plus real staking is a complete demo.
**Depends on**: Phase 1
**Requirements**: JRNL-01, JRNL-02, JRNL-03, JRNL-04, JRNL-05
**Success Criteria** (what must be TRUE):
  1. The Journal smart contract (Rust/Odra; raw casper-contract fallback) is deployed to Casper testnet
  2. The agent key can call `record(decision_hash: [u8;32], ipfs_cid: String, action_kind: String, epoch: u64)` and the call emits an event
  3. A non-agent key calling `record` is rejected (agent-only access control), proven by a test
  4. The contract exposes reads that list/paginate recent records, and a frontend stub can fetch and print the latest records
  5. The contract has passing Odra/Rust unit tests
**Plans**: TBD

Plans:
- [ ] 02-01: TBD

### Phase 3: Agent Loop — Perceive → Decide → Attest
**Goal**: Run the agent's perceive→decide→attest brain so each cycle reads live state, produces a strictly-validated decision under a versioned mandate, pins its reasoning to IPFS, and writes an on-chain attestation whose hash equals the exact pinned bytes — fail-safe when the model misbehaves.
**Depends on**: Phase 1, Phase 2
**Requirements**: AGNT-01, AGNT-02, AGNT-03, AGNT-04, AGNT-05, AGNT-06
**Success Criteria** (what must be TRUE):
  1. Each cycle the agent perceives live on-chain treasury state, validator performance, and balances
  2. The LLM emits a strict pydantic-validated `Decision` via a forced-tool JSON schema (action, validators, amount, rationale, confidence, optional rwusd_target_pct); malformed/refusal output skips the cycle with NO on-chain action (fail-safe)
  3. A full cycle produces an on-chain attestation whose recorded `sha256` equals the hash of the EXACT canonical bytes pinned to IPFS (Pinata V3), and a deliberately corrupted LLM response is rejected with no on-chain write
  4. Loop state is persisted in SQLite (last processed epoch, pending deploys) so a crash/restart does not double-act or replay
  5. The strategy mandate (objective, risk limits, allowed action set) lives in a versioned `strategy.md` used as the system prompt
**Plans**: TBD

Plans:
- [ ] 03-01: TBD

### Phase 4: Act On-chain — Native Staking
**Goal**: Close the loop with real money-moves: a validated decision becomes a native-auction staking deploy, every risk limit is enforced in deterministic code after the model responds (model proposes, code disposes), and the attestation always precedes the action on-chain.
**Depends on**: Phase 1, Phase 2, Phase 3
**Requirements**: STAK-01, STAK-02, STAK-03, STAK-04
**Success Criteria** (what must be TRUE):
  1. A validated Decision maps to a native auction deploy (`delegate` / `undelegate` / `redelegate`) with the amount and validator public key(s)
  2. Every risk limit (max single-move size, max % to one validator, min validator count, `amount_cspr` ≥ 0 and ≤ treasury, allowed actions only) is enforced in deterministic code AFTER the model responds — never the prompt as the only guardrail
  3. From its own decision, the agent redelegates CSPR between two testnet validators; the move is visible on the explorer and reflected in the next perceive cycle
  4. The attestation for an action precedes the action on-chain, deploys are sequenced (one in-flight at a time) and confirmed before the next cycle acts on state
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

### Phase 5: Frontend — Live Dashboard, Decision Feed, Verifier
**Goal**: Give judges a live, honest window into the agent: a dashboard, decision feed, and verifier that read Casper testnet and the Journal LIVE (no fixtures), with the verifier proving integrity + provenance (not reproducibility), built to the Claude Design handoff.
**Depends on**: Phase 2, Phase 3, Phase 4
**Requirements**: FRNT-01, FRNT-02, FRNT-03, FRNT-04, FRNT-05, FRNT-06
**Success Criteria** (what must be TRUE):
  1. The live dashboard shows the treasury (total CSPR, split across validators, staking yield, optional RWA allocation) reading Casper testnet LIVE — no baked-in fixtures, with a clearly-labeled empty state
  2. The decision feed renders live from Journal contract reads + linked IPFS payloads, with a link to the on-chain attestation
  3. The verifier fetches the RAW pinned bytes for a record's CID and `sha256`s those bytes (NOT re-serialized JSON), confirming they match the on-chain hash, and is framed honestly as integrity + provenance ("authentic, unaltered, attested by the agent key at time/block X"), not reproducibility
  4. Mobile navigation works — the sidebar nav is reachable on a phone via a hamburger → drawer
  5. The dashboard implements the Claude Design handoff (`steward-dashboard-design-build/project/Steward.dc.html`) per `UI-DESIGN-PROMPT.md`, recreated in Next.js 14 + Tailwind + shadcn/ui
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 05-01: TBD

### Phase 6: Stretch, Polish & Demo
**Goal**: Ship the submission — a demo video of one full live cycle plus a verification, an honest README, and a `deployments/testnet.json` judges can verify independently — then attempt optional v2 stretch (vault, RWA, risk officer, oracle) ONLY if the MVP chain is green end-to-end. Cut stretch first, never the MVP.
**Depends on**: Phase 5
**Requirements**: SUBM-01, SUBM-02, SUBM-03
**Success Criteria** (what must be TRUE):
  1. A ~2–3 min demo video is recorded showing one full live agent cycle (perceive → decide → IPFS → Journal record → native staking deploy) plus a verification
  2. The README covers the problem, the agentic design, how it uses Casper (native staking + on-chain journal + CEP-18), how to run it, and the honest Verifier framing (integrity/provenance, not reproducibility)
  3. `deployments/testnet.json` lists the live contract hashes + the agent public key + the validator set so judges can independently verify on the explorer
  4. (Optional, only if MVP is green) The highest-value v2 stretch is attempted — best bang-for-buck first: CEP-18 `rwUSD` mock + agent allocates between staked CSPR and RWA (RWA-01/RWA-02); then vault operator-cannot-withdraw guarantee (VALT-01/VALT-02); then Risk Officer veto agent + price oracle (RISK-01/ORAC-01)
**Plans**: TBD

Plans:
- [ ] 06-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Toolchain & Reality Check | 2/2 | Complete | 2026-06-25 |
| 2. Journal Contract | 1/1 | Complete | 2026-06-26 |
| 3. Agent Loop — Perceive → Decide → Attest | 1/1 | Complete | 2026-06-26 |
| 4. Act On-chain — Native Staking | 1/1 | Complete | 2026-06-26 |
| 5. Frontend — Live Dashboard, Decision Feed, Verifier | 1/1 | Complete | 2026-06-26 |
| 6. Stretch, Polish & Demo | 0/TBD | Not started | - |
