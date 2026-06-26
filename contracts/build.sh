#!/usr/bin/env bash
# Build the Steward Journal contract to a Casper-deployable (MVP) wasm.
#
# Casper's VM rejects post-MVP wasm features (bulk-memory, etc.). Recent Rust
# emits them, so after the Odra compile we lower the wasm to MVP with wasm-opt.
# Prereqs: rust nightly (see ./rust-toolchain), `cargo-odra`, and `wasm-opt`
# (binaryen — e.g. `npm i -g binaryen`).
set -euo pipefail
cd "$(dirname "$0")"

echo "[1/2] cargo odra build (compile contract to wasm/Journal.wasm)..."
# On Windows the JS wasm-opt isn't a spawnable .exe, so cargo-odra's own optimize
# step errors after saving Journal.wasm — that's fine, we lower it ourselves below.
cargo odra build || true
test -f wasm/Journal.wasm || { echo "ERROR: wasm/Journal.wasm not produced"; exit 1; }

echo "[2/2] wasm-opt -> MVP (lower bulk-memory + other post-MVP features)..."
wasm-opt wasm/Journal.wasm -o wasm/Journal.mvp.wasm -Oz \
  --signext-lowering \
  --llvm-memory-copy-fill-lowering \
  --llvm-nontrapping-fptoint-lowering \
  --disable-bulk-memory \
  --disable-sign-ext \
  --disable-nontrapping-float-to-int

echo "Done -> contracts/wasm/Journal.mvp.wasm  (deploy THIS one via the sidecar:"
echo "  node ../agent/sidecar/chain.mjs deploy-wasm contracts/wasm/Journal.mvp.wasm steward_journal_package_hash 300000000000 )"
