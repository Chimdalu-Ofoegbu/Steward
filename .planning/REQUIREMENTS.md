# Requirements: Steward

**Defined:** 2026-06-25
**Core Value:** Every on-chain action the agent takes is preceded by an on-chain attestation of *why* — a verifiable, replayable "agent decision journal" on Casper.

## v1 Requirements

Requirements for the buildathon MVP. Each maps to exactly one roadmap phase. Ordered to match the BUILD-PROMPT MVP chain (do them in order; don't move on until each works).

### Toolchain & Reality Check (Casper 2.0 "Condor")

- [ ] **TOOL-01**: Casper 2.0 testnet toolchain verified against LIVE docs + a live call — transaction model (Deploys→Transactions), native auction (delegate/undelegate/redelegate) interface, current testnet RPC endpoint, and faucet URL all confirmed (not trusted from memory)
- [ ] **TOOL-02**: Agent chain layer proven — a Python script reads the agent account's CSPR balance from testnet AND submits + confirms a tiny self-transfer (via pycspr, or a documented fallback: casper-client CLI / Node casper-js-sdk sidecar)
- [ ] **TOOL-03**: Agent testnet keypair generated, funded from the faucet, and confirmed on the explorer
- [ ] **TOOL-04**: Decision recorded on which chain-layer library is used and any deltas from the BUILD-PROMPT's assumptions are flagged

### Journal — On-chain Attestation Contract

- [ ] **JRNL-01**: Journal smart contract (Rust/Odra; raw casper-contract fallback) deployed to Casper testnet
- [ ] **JRNL-02**: Agent key can call `record(decision_hash: [u8;32], ipfs_cid: String, action_kind: String, epoch: u64)` and the call emits an event
- [ ] **JRNL-03**: A non-agent key calling `record` is rejected (agent-only access control), proven by test
- [ ] **JRNL-04**: Contract exposes reads to list/paginate recent records for the frontend
- [ ] **JRNL-05**: Contract has passing unit tests (Odra/Rust)

### Agent Loop — Perceive → Decide → Attest

- [ ] **AGNT-01**: Each cycle the agent perceives live on-chain treasury state, validator performance, and balances
- [ ] **AGNT-02**: The LLM emits a strict pydantic-validated `Decision` (forced-tool JSON schema: action, validators, amount, rationale, confidence, optional rwusd_target_pct); malformed/refusal output skips the cycle with NO on-chain action (fail-safe)
- [ ] **AGNT-03**: The full reasoning + observed-state snapshot is pinned to IPFS (Pinata V3) as canonical bytes, returning a CID
- [ ] **AGNT-04**: An attestation is written on-chain where the recorded hash equals `sha256` of the EXACT pinned bytes
- [ ] **AGNT-05**: Loop state is persisted (SQLite) for restart-safety (last processed epoch, pending deploys); a crash/restart does not double-act or replay
- [ ] **AGNT-06**: The strategy mandate lives in a versioned `strategy.md` (objective, risk limits, allowed action set) used as the system prompt

### Staking — Act On-chain via Native Auction

- [ ] **STAK-01**: A validated Decision maps to a native auction deploy (`delegate` / `undelegate` / `redelegate`) with amount + validator public key(s)
- [ ] **STAK-02**: Every risk limit is enforced in deterministic code AFTER the model responds (max single-move size, max % to one validator, min validator count, `amount_cspr` ≥ 0 and ≤ treasury, allowed actions only) — the model proposes, code disposes
- [ ] **STAK-03**: From its own decision, the agent redelegates CSPR between two testnet validators; the move is visible on the explorer and reflected in the next perceive cycle
- [ ] **STAK-04**: The attestation for an action precedes the action on-chain; deploys are sequenced (one in-flight at a time) and confirmed before the next cycle acts on state

### Frontend — Live Dashboard, Decision Feed, Verifier

- [ ] **FRNT-01**: Live dashboard shows the treasury (total CSPR, split across validators, staking yield, optional RWA allocation), reading Casper testnet LIVE (no baked-in fixtures; clearly-labeled empty state)
- [ ] **FRNT-02**: Decision feed renders live from Journal contract reads + linked IPFS payloads, with a link to the on-chain attestation
- [ ] **FRNT-03**: Verifier fetches the RAW pinned bytes for a record's CID and `sha256`s those bytes (NOT re-serialized JSON), confirming they match the on-chain hash
- [ ] **FRNT-04**: Verifier is framed honestly as integrity + provenance ("authentic, unaltered, attested by the agent key at time/block X"), not reproducibility
- [ ] **FRNT-05**: Mobile navigation works — sidebar nav is reachable on a phone via a hamburger → drawer
- [ ] **FRNT-06**: The dashboard implements the Claude Design handoff (`steward-dashboard-design-build/project/Steward.dc.html`) per `UI-DESIGN-PROMPT.md`, recreated in Next.js 14 + Tailwind + shadcn/ui

### Submission Deliverables

- [ ] **SUBM-01**: Demo video (~2–3 min) recorded showing one full live agent cycle (perceive → decide → IPFS → Journal record → native staking deploy) plus a verification
- [ ] **SUBM-02**: README covers the problem, the agentic design, how it uses Casper (native staking + on-chain journal + CEP-18), how to run it, and the honest Verifier framing
- [ ] **SUBM-03**: `deployments/testnet.json` lists live contract hashes + the agent public key + the validator set so judges can independently verify on the explorer

## v2 Requirements

Stretch — only attempt after the v1 MVP chain is green end-to-end. Tracked but not blocking.

### Treasury Vault (Trust-minimization)

- **VALT-01**: A custom Rust/Odra vault contract custodies pooled CSPR and exposes agent-only `delegate`/`rebalance` entry points
- **VALT-02**: The vault hard-codes that the operator/agent key CANNOT withdraw custodied principal to itself — only stake/rebalance

### RWA Booster (touches all three track pillars)

- **RWA-01**: A CEP-18 token `rwUSD` (mock tokenized real-world asset) is minted and the treasury is seeded with some
- **RWA-02**: The agent allocates between staked CSPR and `rwUSD` (drives `rwusd_target_pct`), with the move attested + shown in the UI

### Multi-agent & Analytics

- **RISK-01**: A second "Risk Officer" agent can veto the Strategist's proposal before any on-chain action (multi-agent council)
- **ORAC-01**: CSPR price oracle integration and richer validator analytics

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Anything multi-chain | Casper-native only; out of track scope |
| Perps DEX / AMM | Do not exist on Casper testnet today; design must not depend on them |
| Custom consensus | Not relevant; use native PoS auction |
| Casper EVM / Solidity | Not live (targeted ~H2 2026); everything on-chain is Casper-native Rust→WASM |
| Byte-perfect LLM replay | Verifier proves integrity/provenance, NOT reproducibility (adaptive sampling) |
| Auth / accounts / multi-user | Single managed treasury; no user accounts for the demo |
| Native mobile app | Responsive web only |
| Mainnet / real funds | Testnet only, always |

## Traceability

Which phase covers which requirement. Populated/confirmed during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TOOL-01..04 | Phase 1 | Pending |
| JRNL-01..05 | Phase 2 | Pending |
| AGNT-01..06 | Phase 3 | Pending |
| STAK-01..04 | Phase 4 | Pending |
| FRNT-01..06 | Phase 5 | Pending |
| SUBM-01..03 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 28 total (TOOL 4, JRNL 5, AGNT 6, STAK 4, FRNT 6, SUBM 3)
- Mapped to phases: 28
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-25*
*Last updated: 2026-06-25 after initial definition*
