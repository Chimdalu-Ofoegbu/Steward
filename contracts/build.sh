#!/usr/bin/env bash
# Build the Steward contracts (Journal + RwaToken) to Casper-deployable (MVP) wasm.
#
# Casper's VM rejects post-MVP wasm features (bulk-memory, etc.). Recent Rust emits
# them, so after the Odra compile we lower each wasm to MVP with wasm-opt.
# Prereqs: rust nightly (see ./rust-toolchain), `cargo-odra`, and `wasm-opt`
# (binaryen — e.g. `npm i -g binaryen`).
set -euo pipefail
cd "$(dirname "$0")"

echo "[1/2] cargo odra build (compile contracts -> wasm/*.wasm)..."
# On Windows the JS wasm-opt isn't a spawnable .exe, so cargo-odra's own optimize step
# errors after saving the .wasm files — that's fine, we lower them ourselves below.
cargo odra build || true

lower() { # $1 = contract name (e.g. Journal, RwaToken)
  local w="wasm/$1.wasm"
  test -f "$w" || { echo "ERROR: $w not produced"; exit 1; }
  echo "  wasm-opt $1 -> MVP..."
  wasm-opt "$w" -o "wasm/$1.mvp.wasm" -Oz \
    --signext-lowering \
    --llvm-memory-copy-fill-lowering \
    --llvm-nontrapping-fptoint-lowering \
    --disable-bulk-memory \
    --disable-sign-ext \
    --disable-nontrapping-float-to-int
}

echo "[2/2] wasm-opt -> MVP (lower post-MVP features)..."
lower Journal
lower RwaToken

echo "Done -> contracts/wasm/{Journal,RwaToken}.mvp.wasm  (deploy via the sidecar, e.g.:"
echo "  node ../agent/sidecar/chain.mjs deploy-wasm contracts/wasm/RwaToken.mvp.wasm steward_rwa_package_hash 300000000000 )"
