# Steward — Frontend (Phase 5)

A live, read-only dashboard over the Steward agent: treasury, the on-chain
decision feed, and an independent **Verifier**. The backend (agent + Journal
contract) is already live on Casper testnet; this app reads it — no fixtures.

## Stack

- **Next.js 14 (App Router) · TypeScript · Tailwind CSS 3 · React 18**
- **casper-js-sdk v5** for live chain reads, server-side only (route handlers).
- Dark-by-default theme with a working light toggle; mobile hamburger drawer.

## What it shows

| Page         | Source                                                                 |
| ------------ | ---------------------------------------------------------------------- |
| Overview `/` | KPIs, agent identity, latest verified decision, allocation, mini feed  |
| Decisions    | The agent's on-chain attestations (newest first); row → reasoning      |
| Treasury     | Live allocation per validator + mandate risk limits                    |
| Verifier     | Integrity + provenance proof for any attestation                       |
| About        | The perceive→decide→attest→act loop, Casper details, honesty note      |

## Live data paths (server route handlers)

- `GET /api/treasury` — liquid CSPR via `queryLatestBalance(PurseIdentifier.fromPublicKey(agent))`
  + delegations/validators via `getLatestAuctionInfo()`. Total = liquid + delegated.
- `GET /api/journal` — reads `../deployments/journal_feed.json` (the agent's real output).
- `GET /api/verify?txn=…&cid=…&hash=…` — the centerpiece (below).
- `GET /api/payload?cid=…` — fetches a pinned payload for display.

## The Verifier — integrity + provenance, the honest way

Given a record's `{cid, decision_hash, attestation_txn}` the verifier:

1. Fetches the on-chain Journal `record(...)` transaction and reads the
   `decision_hash` + `ipfs_cid` that were committed **on-chain**, plus the
   initiator (the agent key) and the block.
2. Fetches the **raw bytes** for the CID from the IPFS gateway and computes
   `sha256` of **those exact bytes** — never a re-parsed/re-stringified JSON.
   (Re-serializing would change key order/whitespace and break the match; see
   BUILD-PROMPT Appendix A.4.)
3. Asserts `sha256(raw bytes) == on-chain decision_hash == recorded hash`.

### Honesty note (also shown in the UI)

Steward proves a logged decision is **authentic, unaltered, and was made at the
recorded time by the agent's key** — integrity and provenance. It does **not**
claim the language model reproduces a byte-identical answer if re-run; modern
models use adaptive sampling. The on-chain record is the canonical, tamper-evident
account of what the agent actually decided.

## Run

```bash
cd frontend
cp .env.example .env.local   # read-only config; no secrets needed
npm install
npm run dev                  # http://localhost:3000
```

`npm run build` must pass with no type/build errors. If the dev server reports
phantom syntax errors on valid files, stop it, delete `.next/`, and restart.

## Env

All values are public (read-only app). See `.env.example`:
`CASPER_NODE_RPC`, `AGENT_PUBLIC_KEY_HEX`, `JOURNAL_PACKAGE_HASH`,
`PINATA_GATEWAY`, `EXPLORER`.

## Note on casper-js-sdk import

The SDK's node build is CommonJS and exports members directly on the module
object (no `.default`). Webpack's ESM interop resolves a bare default import to
`undefined`, so `src/lib/casper.ts` loads it via `createRequire(import.meta.url)`
and keeps it in `serverComponentsExternalPackages` (unbundled). This mirrors the
agent sidecar's CJS destructure pattern.
