# Phase 5: Frontend — Live Dashboard, Decision Feed, Verifier - Context

**Gathered:** 2026-06-26
**Status:** Ready for build
**Source:** PRD Express Path (BUILD-PROMPT §6 Phase 4 + UI-DESIGN-PROMPT.md + the Claude Design handoff)

<domain>
## Phase Boundary
A live Next.js dashboard that reads Casper testnet LIVE (no fixtures): treasury + allocation + yield, a decision feed from the agent's on-chain attestations, and a Verifier that proves integrity+provenance of any record. Covers **FRNT-01..06**. Backend (agent + contracts) is done and live; this phase is read-only UI over it.
</domain>

<decisions>
## Implementation Decisions
- **D-01 (design):** Recreate the Claude Design handoff `steward-dashboard-design-build/project/Steward.dc.html` (read it in full + follow its imports/`support.js`) in **Next.js 14 App Router + Tailwind + shadcn/ui + TypeScript**, per `UI-DESIGN-PROMPT.md`. Match the visual output; don't copy the prototype's internal structure. Mobile nav MUST be reachable (hamburger → drawer) — FRNT-05 / §8 pitfall.
- **D-02 (live reads — NO fixtures, FRNT-01):** Use **casper-js-sdk v5** server-side (Next route handlers / server components) to read live:
  - Treasury: `queryLatestBalance(PurseIdentifier.fromPublicKey(agent))` → liquid CSPR.
  - Delegations + validators: `getLatestAuctionInfo()` → the agent's stake per validator + the validator set (mirror the sidecar `auction-info` logic). Yield: estimate from delegations (simple) or label "n/a (testnet)".
  - Agent key + Journal package hash from `deployments/testnet.json`.
  - Import casper-js-sdk the same way the sidecar does (CJS default-import) — see `agent/sidecar/chain.mjs` / `SIDECAR-API.md`.
- **D-03 (decision feed, FRNT-02):** The agent writes each attestation to a feed file the agent loop maintains — add a small export so the loop appends to `deployments/journal_feed.json`: `[{epoch, timestamp, action, amount_cspr, validator, confidence, rationale, cid, decision_hash, attestation_txn, staking_txn}]`. The feed page reads it via `/api/journal` (server reads the file). Each row links to the attestation txn on the explorer + the IPFS payload. (This is the agent's REAL output, not a fixture; every row is independently verifiable on-chain by D-04.)
- **D-04 (verifier — the centerpiece, FRNT-03/04):** Given a record's `cid` + `decision_hash` + `attestation_txn`: (a) fetch the on-chain txn via casper-js-sdk and extract the `decision_hash` + `ipfs_cid` that were recorded on-chain; (b) fetch the **RAW bytes** for the cid from the gateway and `sha256` THOSE bytes (NOT re-parsed JSON — the A.4 rule); (c) assert on-chain hash == sha256(raw bytes) == record hash. Show ✅ with the honest framing (integrity + provenance: "authentic, unaltered, attested by the agent key at block X" — NOT reproducibility, §A.5). Clearly-labeled empty state when no records.
- **D-05:** Env: `frontend/.env.local` with CASPER_NODE_RPC, the agent pubkey, Journal package hash, PINATA_GATEWAY (committed `.env.example`). No secrets needed (read-only).
</decisions>

<specifics>
## Specific Ideas
- The honesty note (determinism framing) must appear in the Verifier UI + README: Steward proves the logged decision is authentic/unaltered/attested at time X — it does NOT claim re-running the prompt reproduces byte-identical output.
- Real data to show now: treasury ~2600 CSPR liquid + 1700 CSPR delegated to 1 validator; 3 attestations in the Journal (epochs 1–2 + the Phase-2 smoke test). Explorer: testnet.cspr.live.
- Don't render the design HTML / screenshot it — read the source for dimensions/colors/layout (per the handoff README).
</specifics>

<canonical_refs>
## Canonical References
- `steward-dashboard-design-build/project/Steward.dc.html` (+ `support.js`, `README.md`) — the pixel spec. READ IN FULL.
- `UI-DESIGN-PROMPT.md` — the design contract (layout, mobile nav, components).
- `BUILD-PROMPT.md` §2 (what a user sees), §6 Phase 4, §8 (live reads, mobile nav, stale-cache), Appendix A.4/A.5 (raw-bytes hashing + honesty framing).
- `.planning/REQUIREMENTS.md` — FRNT-01..06.
- `agent/sidecar/chain.mjs` + `.planning/phases/01-toolchain-reality-check/SIDECAR-API.md` — casper-js-sdk v5 read patterns (queryLatestBalance, getLatestAuctionInfo, getTransaction).
- `deployments/testnet.json` — agent key, Journal package hash, proof txns.
</canonical_refs>

<code_context>
## Existing Code Insights
- The chain reads are already solved in `agent/sidecar/chain.mjs` (balance, auction-info, confirm/getTransaction) — mirror them in the frontend's casper-js-sdk calls.
- The agent loop (`agent/src/steward/loop.py`) produces each attestation {cid, hash, txn, decision} — add the `deployments/journal_feed.json` append there.
- casper-js-sdk is CommonJS: `import pkg from "casper-js-sdk"; const {...} = pkg;` (or the web build for client bundles — verify).
</code_context>

<deferred>
## Deferred Ideas
- Casper Wallet connect (show "connected") — nice-to-have; only if time (FRNT doesn't require user actions).
- RWA allocation panel → Phase 6 stretch.
- Reading the Journal Mapping storage directly (vs the agent feed + live per-row verification) — the verifier already proves each row on-chain; direct storage read is a stretch.
</deferred>

---
*Phase: 05-frontend*
*Context gathered: 2026-06-26*
