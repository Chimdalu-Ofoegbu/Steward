# Phase 3 Summary — Agent Loop (Perceive → Decide → Attest) ✅

**Status:** Complete. The full agentic loop runs live on testnet and the verifiable-decision-journal property is **proven end-to-end**.
**Requirements:** AGNT-01..06 all met.

## The proof (live, 2026-06-26)
One full cycle (`agent/run_cycle.py`):
- **Perceived:** treasury 4314.66 CSPR, validator set + 0 delegations, block 8301822.
- **Decided** (claude-opus-4-8, forced-tool → validated `Decision`): `delegate 4000 CSPR`, confidence 0.62, with a mandate-aware rationale (under the 10k/cycle cap, anchoring an initial position).
- **Attested:** reasoning + observed-state pinned to IPFS — CID `bafkreig5moismks3oowxrrce55r2cx2i24clnmdvgl3pfa2ohrtyz76sbi`; Journal `record()` txn `71d9efcb21c886c65c470e07878420cc19b7a045d604fcd90932ddb444dd0d65` (confirmed Success).
- **INTEGRITY VERIFIED:** `sha256(raw gateway bytes) == on-chain hash == dd6391262a5b73ad78c444ef63a15f48d704b6b07532f6f2834e3c678cffd20a`. Anyone can fetch the IPFS payload, hash the raw bytes, and confirm it matches the on-chain attestation. **This is Steward's whole point.**

## What was built (`agent/src/steward/`)
- `schema.py` — `Decision` pydantic + `DECISION_TOOL` forced-tool schema (Appendix A.3).
- `decide.py` — forced-tool `decide()`; malformed/refusal → None (fail-safe, AGNT-02).
- `attest.py` — Pinata V3 `pin_json` (canonical sort_keys bytes), `decision_hash` (sha256 of EXACT pinned bytes), SSRF-guarded `fetch_pinned` (Appendix A.2).
- `perceive.py` — live observed-state snapshot (balance + top-N validators by weight + delegations + block).
- `state.py` — SQLite (`agent/steward.db`, gitignored): monotonic epoch, processed-attestation replay guard, pending deploys (restart-safe, AGNT-05).
- `loop.py` + `run_cycle.py` — one cycle: perceive → decide → pin → Journal record → persist.
- `strategy.md` — versioned mandate (AGNT-06): objective, risk limits (≤40%/validator, ≥3 validators, ≤10k CSPR/move, amount ≤ treasury), allowed actions, honesty framing.
- Extended `chain.py` (`record_decision`, `get_auction`, manifest helpers) + sidecar `auction-info` verb.

## Acceptance
- AGNT-01 ✓ perceive live. AGNT-02 ✓ validated Decision + fail-safe. AGNT-03 ✓ IPFS pin. AGNT-04 ✓ on-chain hash == sha256(pinned bytes) (VERIFIED). AGNT-05 ✓ SQLite restart-safety. AGNT-06 ✓ strategy.md mandate.

## For Phase 4
The decision currently produces an attested intent (e.g. `delegate 4000 CSPR to <validator>`) but does NOT yet execute the stake. Phase 4 maps the validated Decision → `chain.delegate/redelegate`, enforces the risk limits in code BEFORE acting, sequences one in-flight deploy, and ensures the attestation precedes the action.
