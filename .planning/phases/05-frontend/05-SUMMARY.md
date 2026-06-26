# Phase 5 Summary — Frontend (Live Dashboard, Decision Feed, Verifier) ✅

**Status:** Complete. A live Next.js dashboard over the testnet backend, recreated from the Claude Design handoff, with a working integrity Verifier.
**Requirements:** FRNT-01..06 all met.

## What was built (`frontend/`)
- **Next.js 14 (App Router) + TypeScript + Tailwind + React 18**, recreating `Steward.dc.html` (dark default + working light toggle, IBM Plex Sans/Mono + Clash Display, cyan accent). App shell with desktop fixed sidebar + **mobile hamburger → off-canvas drawer** (FRNT-05).
- **5 pages:** Overview (KPIs, agent identity, latest verified decision, allocation, mini-feed), Decisions (filterable feed → reasoning drawer), Treasury (live allocation + mandate risk gauges), **Verifier** (centerpiece stepper), About (honesty framing).
- **Live reads (FRNT-01, no fixtures)** via casper-js-sdk v5 in server route handlers + `lib/casper.ts` (mirrors the sidecar): `/api/treasury` (liquid + delegated + validators), `/api/journal`, `/api/verify`.

## Live + verified
- `/api/treasury` (live): liquid **2608.37** + delegated **1700** = **4308.37 CSPR**, 1 delegation, 20 validators, block 8302151 — matches chain.
- **Decision feed (FRNT-02):** reads `deployments/journal_feed.json` (the agent's REAL attestations; `loop.py` now appends each cycle via new `feed.py`/`export_feed.py`, seeded with epochs 1–2). Each row links to the on-chain attestation txn + IPFS payload, and every row is independently verifiable (below).
- **Verifier (FRNT-03/04 — the centerpiece):** for a record, fetches the on-chain Journal txn AND the **raw** gateway bytes, computes `sha256(raw bytes)` (Web Crypto, NOT re-serialized — A.4), and asserts on-chain hash == sha256(raw) == record hash. **Verified live: `ok:true`, computed == on-chain == `dd6391262a5b73ad78c444ef63a15f48d704b6b07532f6f2834e3c678cffd20a`.** Honest framing shown (integrity + provenance, NOT reproducibility — A.5).
- `npm run build` passes clean (8 routes); homepage + APIs serve 200 with no console errors. casper-js-sdk CJS loaded via `createRequire` + `serverComponentsExternalPackages`.

## Note
The feed is sourced from the agent's real attestation log (`journal_feed.json`), not a direct read of the Journal `Mapping` storage — but every row is provably on-chain via the live Verifier (it reads the actual on-chain txn). Reading the contract's Mapping storage directly is a deferred stretch; the verifier already delivers the honesty guarantee.

## Acceptance
- FRNT-01 ✓ live dashboard (no fixtures). FRNT-02 ✓ feed + IPFS payloads. FRNT-03 ✓ raw-bytes hash == on-chain. FRNT-04 ✓ integrity/provenance framing. FRNT-05 ✓ mobile hamburger drawer. FRNT-06 ✓ built to the design.

## Run it
`cd frontend && cp .env.example .env.local && npm install && npm run dev`
