# Phase 3: Agent Loop (Perceive → Decide → Attest) - Context

**Gathered:** 2026-06-26
**Status:** Ready for build
**Source:** PRD Express Path (BUILD-PROMPT.md §6 Phase 2 + Appendix A)

<domain>
## Phase Boundary
Build the agent brain: each cycle PERCEIVE live on-chain state → DECIDE via the LLM under a strategy mandate (strict validated JSON) → ATTEST (pin reasoning to IPFS, write the matching hash to the deployed Journal contract). Covers **AGNT-01..06**. NOT in scope: executing the staking action (Phase 4 — decisions are produced + attested but not yet executed on-chain beyond the Journal record).
</domain>

<decisions>
## Implementation Decisions
- **D-01 (LOCKED):** Use the proven Appendix A code verbatim where given: `attest.py` (pin_json/decision_hash/fetch_pinned, Pinata V3, SSRF-guarded), `decide.py` + the `Decision` pydantic + `DECISION_TOOL` forced-tool schema. Model from `STEWARD_MODEL` env (claude-opus-4-8). Keep the two rules from A.4/A.5: hash the EXACT pinned bytes; code enforces limits (Phase 4).
- **D-02:** Reuse the existing chain layer `agent/src/steward/chain.py` (get_balance, delegate stub, confirm). Add a `record_decision(...)` that pins + computes sha256(pinned bytes) + calls the Journal via the sidecar `journal-record <package_hash> <hex_hash> <cid> <action_kind> <epoch>`. Journal package hash is in `deployments/testnet.json` → `contracts.journal.package_hash_hex` (`506497e9…3aa2`).
- **D-03:** PERCEIVE reads: the agent CSPR balance (chain.get_balance), and the validator set + the agent's current delegations from auction info. Add a sidecar `auction-info` verb (casper-js-sdk `getAuctionInfo` → validators[] with weights + the agent's delegations) and a `chain.get_auction()` wrapper. Keep it simple — top-N validators by weight is enough for the MVP.
- **D-04:** State persisted in SQLite (`agent/steward.db`, gitignored via *.db) — last processed epoch/cycle, pending deploys, processed attestations. Restart-safe: don't double-act/replay.
- **D-05:** Fail-safe: malformed/refusal LLM output → `decide()` returns None → skip the cycle, log it, NO on-chain write.
- **D-06:** `agent/strategy.md` (versioned) is the system prompt: objective, risk limits (max % to one validator, min validators, max single-move size, amount ≤ treasury), allowed actions {delegate, undelegate, redelegate, rebalance, hold}.
</decisions>

<specifics>
## Specific Ideas
- One runnable single cycle: `python -m steward.loop --once` (or `agent/run_cycle.py`) → perceive, decide, attest, print the CID + Journal record txn + the on-chain hash == sha256(pinned bytes).
- The attestation payload pinned to IPFS = the full reasoning + the observed-state snapshot (so the verifier can replay integrity).
- Epoch = a monotonically increasing cycle counter persisted in SQLite (the Journal `epoch: u64` field).
</specifics>

<canonical_refs>
## Canonical References
- `BUILD-PROMPT.md` Appendix A (A.2 attest.py, A.3 decide.py, A.4/A.5 the two honesty rules) — USE THIS CODE. §6 Phase 2 acceptance. §2/§8 (live state, fail-safe, restart-safety, nonce/sequencing).
- `.planning/REQUIREMENTS.md` — AGNT-01..06.
- `.planning/phases/02-journal-contract/02-SUMMARY.md` — the Journal package hash + the `journal-record` sidecar verb.
- `agent/src/steward/chain.py` + `agent/sidecar/chain.mjs` — the chain layer (balance/confirm/journal-record; add auction-info).
- `agent/.env` — ANTHROPIC_API_KEY, STEWARD_MODEL, PINATA_JWT, PINATA_GATEWAY (all present).
</canonical_refs>

<code_context>
## Existing Code Insights
- `chain.py` resolves paths against repo root, loads `agent/.env`, shells to the Node sidecar. Add `record_decision`/`get_auction` here.
- The Journal `record(decision_hash: String, ipfs_cid: String, action_kind: String, epoch: u64)` — decision_hash is the hex(sha256(pinned bytes)).
- `anthropic`, `httpx`, `pydantic`, `python-dotenv` needed (httpx+dotenv installed; add anthropic + pydantic to the venv + pyproject).
</code_context>

<deferred>
## Deferred Ideas
- Executing the staking deploy from the decision (delegate/redelegate) + code-enforced risk limits → Phase 4.
- The continuous loop scheduler / unattended multi-cycle running → Phase 4/6 (Phase 3 proves one full cycle).
- Frontend reading the feed → Phase 5.
</deferred>

---
*Phase: 03-agent-loop*
*Context gathered: 2026-06-26*
