# Phase 2: Journal Contract - Context

**Gathered:** 2026-06-25
**Status:** Ready for research → planning
**Source:** PRD Express Path (BUILD-PROMPT.md §3) + Phase 1 outcome

<domain>
## Phase Boundary

Build and deploy the **Journal contract** to Casper testnet — the on-chain attestation store that is the verifiable-agent centerpiece. It records the agent's decision attestations and lets the frontend read them back. Agent-only writes; public reads.

Covers **JRNL-01..05**. NOT in scope: the agent loop / IPFS pinning (Phase 3), staking (Phase 4), the vault (stretch).

The contract interface (BUILD-PROMPT §3): `record(decision_hash: [u8;32], ipfs_cid: String, action_kind: String, epoch: u64)` callable ONLY by the agent key; emits an event; exposes paginated reads of recent records. "Even if every other contract slips, this + the agent loop + real staking = a complete demo."
</domain>

<decisions>
## Implementation Decisions

### Framework (RESOLVE in research, then LOCK)
- **D-01:** **Odra 2.8.1** preferred (Rust framework, friendlier). FALLBACK: raw `casper-contract`/`casper-types` built with `cargo build --target wasm32-unknown-unknown --release` if `cargo-odra` fails on Windows. (Phase 1 showed Casper Rust *native* tooling can break on Windows; building TO wasm32 is different and likely OK — verify empirically. `cargo install cargo-odra` is running now.)

### Storage / data model (LOCKED shape, refine in research)
- **D-02:** Append-only records. A `count` (u64) + a mapping/dictionary `index -> Record`. `Record = { decision_hash: [u8;32], ipfs_cid: String, action_kind: String, epoch: u64, recorder: account, timestamp }`. The frontend reads `count` + records by index (paginate recent N) via the SDK's global-state query.

### Access control (LOCKED)
- **D-03:** Only the AGENT key may `record`. Install the contract with the agent account as the authorized recorder; `record` checks `caller == authorized_recorder` and reverts otherwise. The agent account hash is `932e021dc802796c446103994abe74e27d4791d445892ffc29e2c50982d290b6` (pubkey `01c85dcb…87539e`). A non-agent caller must be rejected (proven by test — JRNL-03).

### Events (LOCKED)
- **D-04:** `record` emits an event (decision_hash, ipfs_cid, action_kind, epoch, index) so the attestation is observable.

### Deployment (RESOLVE in research)
- **D-05:** Deploy the compiled WASM to testnet using the funded agent key (`secrets/secret_key.pem`). Two candidate paths: (a) Odra **livenet** backend; (b) the **casper-js-sdk `SessionBuilder`** via our existing sidecar (add a `deploy-wasm` verb) — keeps one chain layer. Pick the one that works on Windows. Record the deployed contract/package hash into `deployments/testnet.json` (`contracts.journal`).

### Claude's Discretion
- Exact module/entry-point names, pagination signature, event schema details, test layout.

</decisions>

<specifics>
## Specific Ideas
- Keep the contract SMALL and safe — it's the MVP centerpiece; correctness + agent-only writes matter more than features.
- The recorded `decision_hash` is the sha256 of the EXACT bytes pinned to IPFS (Phase 3 produces it); the contract just stores the 32 bytes + CID. Don't re-hash anything on-chain.
- Reads must be frontend-friendly: the Phase-5 verifier fetches a record's CID + hash from chain, then compares to the raw IPFS bytes.
</specifics>

<canonical_refs>
## Canonical References
- `BUILD-PROMPT.md` §3 (Journal contract spec, priority #1 MUST-HAVE), §6 Phase 1 acceptance, §9 (only agent may record), §10 (repo layout: `contracts/`).
- `.planning/REQUIREMENTS.md` — JRNL-01..05.
- `.planning/ROADMAP.md` — Phase 2 goal + success criteria.
- `.planning/phases/01-toolchain-reality-check/SIDECAR-API.md` — casper-js-sdk v5 API (for the deploy-via-sidecar option + frontend reads).
- `deployments/testnet.json` — agent key + account hash; `contracts.journal` to be filled on deploy.
- Odra docs `https://odra.dev/docs/` — current 2.8 API + Casper backend + livenet deploy.
</canonical_refs>

<code_context>
## Existing Code Insights
- Chain layer: `agent/sidecar/chain.mjs` (casper-js-sdk v5) + `agent/src/steward/chain.py`. The SDK exposes `SessionBuilder().wasm(bytes).installOrUpgrade().runtimeArgs(args)` — a candidate deploy path. Phase 3 will call the Journal via a contract-call (the SDK has `ContractCallBuilder`).
- Funded agent key (5000 CSPR) deploys + later records.
- Repo layout target: contract lives under `contracts/` (BUILD-PROMPT §10).
</code_context>

<deferred>
## Deferred Ideas
- Agent loop / IPFS pinning that produces the hash+CID — Phase 3.
- Calling `record` from the agent each cycle — Phase 3 (this phase just proves the agent key CAN record, e.g. one smoke-test record).
- Vault + CEP-18 — stretch (Phase 6).
</deferred>

---
*Phase: 02-journal-contract*
*Context gathered: 2026-06-25*
