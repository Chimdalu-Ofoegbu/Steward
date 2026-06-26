# Phase 2 Summary — Journal Contract ✅

**Status:** Complete. The on-chain attestation contract — the verifiable-agent centerpiece — is deployed to Casper testnet and the agent has written a real attestation through it.
**Requirements:** JRNL-01..05 all met.

## Live on testnet (verifiable)
- **Journal package hash:** `506497e9dc4607460891120b7bccc8b182686ab2207a629cbb57204d5bab3aa2` ([explorer](https://testnet.cspr.live/contract-package/506497e9dc4607460891120b7bccc8b182686ab2207a629cbb57204d5bab3aa2))
- **Deploy txn:** `7a9deaa0acb21b985ed812acb1b912fc74f3b82a93721f2c7a559c429d1d968c` (executed Success, ~137 CSPR install gas)
- **First agent `record()` txn:** `e16d7867f2bba9fadc9edd85eada5fe83eb10514686ab8171d0e1e01d26a5255` (executed Success, ~0.77 CSPR) — proves the agent key can write attestations on-chain.

## What was built
- **`contracts/src/journal.rs`** — Odra 2.8 contract: `record(decision_hash, ipfs_cid, action_kind, epoch)` (agent-only, emits `Recorded`), append-only `Mapping<u64, Record>` + `count`, reads `count()` / `get_record(i)` / `agent()`. `init()` sets the agent to the **deployer** (provably the Steward key) — no external arg.
- **2 passing unit tests** (Odra VM): `records_and_reads` and `non_agent_cannot_record` (JRNL-03 access control).
- **Sidecar deploy/call verbs** (`agent/sidecar/chain.mjs`): `deploy-wasm` (casper-js-sdk `SessionBuilder` + Odra install ABI), `named-key` (recover the package hash), `journal-record` (agent calls `record()` — reused by Phase 3).
- **`contracts/build.sh`** — reproducible build incl. the MVP-lowering step. **`deployments/journal.wasm`** — the deployed wasm. `deployments/testnet.json` records the package hash + txns.

## Findings / deltas (empirical — the research agent was lost mid-run, so this captures it)
1. **Odra 2.8.1 builds to wasm on Windows** (cargo build to wasm32 is fine — unlike casper-client's host build). BUT `cargo odra init`/`build` file-lock on Windows (os error 32) and its wasm-opt step can't spawn the JS wasm-opt — worked around by hand-authoring `Cargo.toml` + lowering with wasm-opt directly.
2. **Casper's VM rejects post-MVP wasm features** ("Bulk memory operations are not supported"). Fix: `wasm-opt` lowers bulk-memory + sign-ext + nontrapping-fptoint to MVP (see `build.sh`). The first deploy failed on this (cost 500 CSPR — Casper charges the full payment limit on preprocessing failure; size payments tighter).
3. **Deploy path = the casper-js-sdk sidecar, NOT Odra livenet.** Odra livenet needs `casper-client` (Rust), which won't compile on Windows. Instead the sidecar deploys the wasm as a Casper 2.0 install session with Odra's install args: `odra_cfg_package_hash_key_name` (String), `odra_cfg_allow_key_override` / `odra_cfg_is_upgradable` / `odra_cfg_is_upgrade` (bools). init takes no args.
4. **Casper 2.0 entity model:** account named keys live under `entity.Account.named_keys` in the `state_get_entity` RPC; the deployed package hash is recovered there.

## Acceptance
- JRNL-01 ✓ deployed to testnet. JRNL-02 ✓ agent `record()` live (no error, agent authorized). JRNL-03 ✓ non-agent reverts (unit test). JRNL-04 ✓ `count`/`get_record` reads (unit test; frontend wiring in Phase 5). JRNL-05 ✓ unit tests pass.

## For Phase 3
The agent loop calls `chain` → sidecar `journal-record <package_hash> <hash> <cid> <kind> <epoch>` to attest each decision. Package hash is in `deployments/testnet.json` (`contracts.journal`).
