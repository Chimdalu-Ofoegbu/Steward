# Phase 4: Act On-chain — Native Staking - Context

**Gathered:** 2026-06-26
**Status:** Ready for build
**Source:** PRD Express Path (BUILD-PROMPT.md §6 Phase 3 + §8)

<domain>
## Phase Boundary
Close the loop: a validated Decision becomes a REAL native-auction staking action on testnet, with every risk limit enforced in deterministic code AFTER the model responds, and the attestation always preceding the action. Covers **STAK-01..04**. The agent loop already perceives/decides/attests (Phase 3); this phase adds the ACT step + the code guardrails.
</domain>

<decisions>
## Implementation Decisions
- **D-01 (LOCKED — the #1 pitfall):** Code, not the prompt, is the guardrail. A new `agent/src/steward/risk.py` validates a `Decision` against the mandate AFTER `decide()` returns, using the live observed state: allowed action only; `amount_cspr` ≥ 0 and ≤ (treasury − fee buffer); single move ≤ `MAX_MOVE_CSPR` (10000); post-move concentration ≤ 40% to any one validator; ≥ MIN_VALIDATORS target enforced by the 40% cap over cycles. Returns `(ok, reason, clamped_amount)`. If a move would exceed the 40%/validator cap, CLAMP it down to the compliant amount (so the agent still acts safely) rather than hard-failing; HARD-REJECT only on disallowed action / amount > treasury / non-positive.
- **D-02:** `act.py` maps a risk-approved Decision → `chain.delegate/undelegate/redelegate` (resolve validator public keys from the decision's `validator_to`/`validator_from`; if the LLM didn't pick a concrete validator, choose the lowest-concentration top validator). Convert CSPR → motes.
- **D-03 (sequencing, §8):** The attestation is written to the Journal BEFORE the staking deploy. One in-flight deploy at a time; `chain.confirm` the deploy before the cycle returns; persist the pending/confirmed deploy in SQLite so a restart doesn't double-act. The next perceive must reflect the new delegation.
- **D-04:** Extend `loop.run_cycle()`: perceive → decide → risk-check → attest (record the decision + the risk verdict in the pinned payload) → if approved staking action: execute via act → confirm → persist. `hold` / rejected → attest only, no deploy.
- **D-05:** Update `agent/strategy.md` to guide the LLM toward compliant sizing (≤40%/validator, ≤10k/move) so it usually proposes a directly-executable move; the code remains the backstop.
</decisions>

<specifics>
## Specific Ideas
- Live proof for STAK-03: one full cycle where the agent decides a delegation, attests it, and EXECUTES a real `delegate` on testnet — visible on the explorer and reflected in the next `perceive()` (delegations count goes up). Keep the staked amount modest (compliant, e.g. ~1000–1700 CSPR given ~4300 treasury and the 40% cap).
- The risk verdict (approved / clamped / rejected + reason) is part of the attested payload, so the journal shows the model-proposes-code-disposes story.
- Gas: delegate uses the sidecar `PAY_AUCTION` (2.5 CSPR); min delegation on Casper testnet may apply — surface the node's error if the amount is below the minimum.
</specifics>

<canonical_refs>
## Canonical References
- `BUILD-PROMPT.md` §6 Phase 3 (acceptance: agent redelegates between two validators from its own decision, visible on explorer, attestation precedes action), §8 (don't trust the LLM as the only guardrail; nonce/sequencing; restart-safety).
- `.planning/REQUIREMENTS.md` — STAK-01..04.
- `agent/src/steward/chain.py` (`delegate/undelegate/redelegate/confirm/get_auction`), `agent/sidecar/chain.mjs` (native auction builders already wired), `agent/src/steward/loop.py`, `agent/strategy.md`, `agent/src/steward/state.py`.
- `deployments/testnet.json` — agent key; record the chosen validator set under `validators`.
</canonical_refs>

<code_context>
## Existing Code Insights
- `chain.delegate(validator_hex, amount_motes)` / `redelegate(old,new,amount)` already submit native-auction txns (Phase 1 wired the builders). `get_auction()` returns validators by weight + the agent's delegations — use it for concentration math.
- `state.py` already has pending-deploy lifecycle helpers for one-in-flight sequencing.
- The agent currently has ~4300 CSPR, 0 delegations (bootstrapping).
</code_context>

<deferred>
## Deferred Ideas
- Continuous unattended multi-cycle running / scheduler → Phase 6.
- RWA allocation (rwusd_target_pct) execution → Phase 6 stretch.
- Frontend showing the live delegation/yield → Phase 5.
</deferred>

---
*Phase: 04-native-staking*
*Context gathered: 2026-06-26*
