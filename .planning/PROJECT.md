# Steward

## What This Is

Steward is an autonomous AI agent that manages a treasury position natively on the Casper Network — delegating/rebalancing staked CSPR across validators (plus an optional tokenized RWA allocation) — and records every decision on-chain (decision + reasoning, hashed and pinned to IPFS, written to a Casper smart contract) so the entire agentic process is publicly verifiable and replayable. Built for the Casper Agentic Buildathon 2026 (Innovation Track, $150k pool, submit by July 1 2026).

## Core Value

Every on-chain action the agent takes is preceded by an on-chain attestation of *why* — a verifiable "agent decision journal." If everything else is cut, the agent making a real on-chain staking decision and attesting it on-chain must work end-to-end.

## Business Context

- **Customer**: Buildathon judges (Casper Innovation Track); pattern targets treasury/DAO managers.
- **Success metric**: Live, verifiable agent loop on Casper testnet shown end-to-end in the demo video.

## Requirements

### Active (MVP — must demo end-to-end, in order)

- [ ] Phase 0: toolchain verified against live Casper 2.0 (Condor) testnet (SDK, tx model, auction interface, RPC, faucet)
- [ ] Journal contract (Rust/Odra) deployed to testnet; agent-only `record(hash,cid,kind,epoch)`; frontend reads records
- [ ] Agent loop: perceive on-chain+market state → LLM decision (strict pydantic JSON) → pin reasoning to IPFS → write attestation
- [ ] Real staking action: agent delegates/undelegates/redelegates CSPR via native auction, from its own decision
- [ ] Frontend: live dashboard + decision feed + verifier (hash↔IPFS payload), reading testnet live
- [ ] Demo video recorded

### Out of Scope

- Anything multi-chain — Casper-native only
- Perps/AMM/custom consensus — do not exist on Casper testnet today
- Casper EVM/Solidity — not live (targeted ~H2 2026)
- Byte-perfect LLM replay — verifier proves integrity/provenance, not reproducibility
- Auth/accounts/multi-user; native mobile app

### Stretch (only after MVP green)

- Treasury vault contract (operator-cannot-withdraw guarantee)
- CEP-18 `rwUSD` mock + agent allocates between staked CSPR and RWA
- Second "Risk Officer" agent (veto power); CSPR price oracle

## Context

- Casper is NOT EVM: smart contracts are Rust→WASM (Odra preferred, raw casper-contract fallback).
- Casper 2.0 "Condor" changed the tx model (Deploys → Transactions); SDK/tooling compatibility is the #1 risk — verify against live docs + a live testnet call before building logic.
- Agent brain: Python 3.11+, anthropic SDK, model claude-opus-4-8 (sonnet-4-6 for dev loops). Chain layer: pycspr, fallback casper-client CLI or Node casper-js-sdk sidecar.
- Frontend: Next.js 14 App Router, Tailwind, shadcn/ui, TS; reads via casper-js-sdk; Casper Wallet connect. IPFS via Pinata V3. Agent state in SQLite (restart-safe).

## Constraints

- Testnet only, never mainnet. No real funds.
- Secrets discipline from commit #1: .env/secrets/*.pem gitignored; pre-commit secret scan; agent key only signs stake/rebalance.
- Code (not just the prompt) enforces every risk limit after the model responds.
- Verifier hashes RAW pinned bytes, not re-serialized JSON.
- Hard stop ~June 30; honest dated commit history during the event window.
