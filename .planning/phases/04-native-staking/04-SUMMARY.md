# Phase 4 Summary — Act On-chain: Native Staking ✅

**Status:** Complete. The agent executes real native-auction staking from its own decisions, with risk limits enforced in code and the attestation always preceding the action.
**Requirements:** STAK-01..04 all met.

## The proof (live testnet, epoch 2)
One full cycle: perceive → decide → **risk** → **attest first** → act → confirm.
- Decision: delegate 1700 CSPR (LLM proposed compliant; risk approved unchanged).
- **Attestation first** (STAK-04): Journal txn `cdc4c7f2f2aa114c949cdec8cacd9d9704da4f0731ebac7450ee1d78387fb1bf` (CID `bafkreigyi2n7ry4djtdh3zntlfnql7zuehkht25xddgxayixb75sy75l34`).
- **Real delegation** (STAK-01/03): `992fa9f63e5c5378483ac17929e068e0d38d5c2172ef7f98dbc9ac266f1b12ea` — 1700 CSPR delegated to validator `0106ca7c39cd…bca2ca`. Both confirmed Success.
- `get_auction()` before/after: **delegation_count 0 → 1**. The stake is real and reflected in the next perceive.

## The guardrail (STAK-02 — the #1 pitfall, handled)
`agent/src/steward/risk.py` runs AFTER the LLM, on LIVE state. Limits are code constants (MAX_MOVE_CSPR=10000, MAX_CONCENTRATION_PCT=40, MIN_VALIDATORS=3, FEE_BUFFER_CSPR=10). Unit-verified verdicts:
- delegate 4000 on 4314 treasury → **CLAMP → 1725.6 CSPR** (40% cap).
- disallowed action / amount > treasury / non-positive → **REJECT**.
- `hold` → OK. delegate 1000 → OK unchanged.
The verdict (approved/clamped/rejected + reason) is pinned into the attestation, so the journal tells the model-proposes-code-disposes story.

## What was built
- `agent/src/steward/risk.py` (guardrails) + `agent/tests/test_risk.py` (pure unit tests).
- `agent/src/steward/act.py` — maps an approved verdict → `chain.delegate/undelegate/redelegate` (resolves the validator; CSPR→motes; one in-flight deploy).
- `loop.py` — attest-first sequencing, confirm-before-return, restart-safe (resolves any in-flight deploy first, epoch from SQLite). `state.py` `cycle_status()`. `strategy.md` compliant-sizing guidance.

## Acceptance
- STAK-01 ✓ Decision → native auction deploy. STAK-02 ✓ risk limits enforced in code (clamp/reject, unit + live). STAK-03 ✓ real delegation from the agent's own decision, on the explorer, reflected next cycle. STAK-04 ✓ attestation precedes action; one in-flight; confirmed.

## MVP status
**The full MVP chain now works end-to-end on testnet:** agent perceives → decides under mandate → attests on-chain (hash == sha256 of IPFS reasoning, VERIFIED) → executes a real stake within code-enforced limits. Phases 5 (frontend) + 6 (demo) remain.
