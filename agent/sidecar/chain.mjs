#!/usr/bin/env node
// Steward chain sidecar — the ONE Casper 2.0 "Condor" chain layer.
// The Python brain (agent/src/steward/chain.py) shells out to this via subprocess;
// the Phase 5 frontend shares the same casper-js-sdk v5 library.
//
// Usage:  node chain.mjs <verb> [args...]
//   keygen <dir>                       -> {public_key_hex, account_hash, account_hash_hex}
//   account-hash <public_key_hex>      -> {account_hash, account_hash_hex}
//   balance <public_key_hex>           -> {motes, cspr}
//   transfer <target_hex> <motes>      -> {transaction_hash}     (signs with AGENT_SECRET_KEY_PATH)
//   delegate <validator_hex> <motes>   -> {transaction_hash}
//   redelegate <old_hex> <new_hex> <motes> -> {transaction_hash}
//   undelegate <validator_hex> <motes> -> {transaction_hash}
//   confirm <transaction_hash>         -> {found, success, error?}
//   auction-info [agent_public_key_hex] -> {validators:[{public_key,weight}], delegations:[{validator,amount}], ...}
//
// Env: CASPER_NODE_RPC, CASPER_NETWORK_NAME, AGENT_SECRET_KEY_PATH
// Output: a single JSON object on stdout. Errors -> JSON {error} on stderr, exit 1.

import fs from "node:fs";
import path from "node:path";
// casper-js-sdk's node build is CommonJS — import the default and destructure
// (named ESM imports are not supported by the CJS module).
import pkg from "casper-js-sdk";
const {
  PrivateKey,
  PublicKey,
  KeyAlgorithm,
  HttpHandler,
  RpcClient,
  PurseIdentifier,
  NativeTransferBuilder,
  NativeDelegateBuilder,
  NativeUndelegateBuilder,
  NativeRedelegateBuilder,
  SessionBuilder,
  ContractCallBuilder,
  Args,
  CLValue,
  EntityIdentifier,
} = pkg;

const RPC = process.env.CASPER_NODE_RPC || "https://node.testnet.casper.network/rpc";
const NETWORK = process.env.CASPER_NETWORK_NAME || "casper-test";
const SK_PATH = process.env.AGENT_SECRET_KEY_PATH || "./secrets/secret_key.pem";

// Native-transaction gas budgets (motes). Casper 2.0 testnet; tune if the node rejects.
const PAY_TRANSFER = 100_000_000;       // 0.1 CSPR
const PAY_AUCTION = 2_500_000_000;      // 2.5 CSPR (delegate/undelegate/redelegate)
const MOTES_PER_CSPR = 1_000_000_000n;

function rpc() {
  return new RpcClient(new HttpHandler(RPC));
}

function loadSigner() {
  const pem = fs.readFileSync(SK_PATH, "utf8");
  return PrivateKey.fromPem(pem, KeyAlgorithm.ED25519);
}

// Robustly stringify SDK hash/identifier objects that vary in accessor across builds.
function hashHex(h) {
  if (h == null) return null;
  if (typeof h === "string") return h;
  for (const m of ["toHex", "toPrefixedString", "toString"]) {
    if (typeof h[m] === "function") {
      try {
        const v = h[m]();
        if (typeof v === "string" && v.length) return v;
      } catch { /* try next */ }
    }
  }
  // dig common nested shapes (TransactionHash wraps a v1 Hash)
  for (const k of ["hash", "transactionV1", "v1", "deploy"]) {
    if (h[k]) {
      const inner = hashHex(h[k]);
      if (inner) return inner;
    }
  }
  return JSON.stringify(h);
}

async function submit(tx) {
  const signer = loadSigner();
  tx.sign(signer);
  const res = await rpc().putTransaction(tx);
  return { transaction_hash: hashHex(res.transactionHash) };
}

async function main() {
  const [verb, ...a] = process.argv.slice(2);

  if (!verb || verb === "--help" || verb === "-h") {
    process.stdout.write(
      "verbs: keygen | account-hash | balance | transfer | delegate | redelegate | undelegate | confirm | auction-info | deploy-wasm | named-key | journal-record\n"
    );
    return;
  }

  if (verb === "keygen") {
    const dir = a[0] || "secrets";
    fs.mkdirSync(dir, { recursive: true });
    const priv = PrivateKey.generate(KeyAlgorithm.ED25519);
    const pub = priv.publicKey;
    fs.writeFileSync(path.join(dir, "secret_key.pem"), priv.toPem());
    fs.writeFileSync(path.join(dir, "public_key.pem"), pub.toPem());
    const pubHex = pub.toHex();
    fs.writeFileSync(path.join(dir, "public_key_hex"), pubHex);
    const ah = pub.accountHash();
    return out({ public_key_hex: pubHex, account_hash: hashHex(ah), account_hash_hex: stripPrefix(hashHex(ah)) });
  }

  if (verb === "account-hash") {
    const pub = PublicKey.fromHex(req(a[0], "public_key_hex"));
    const ah = pub.accountHash();
    return out({ account_hash: hashHex(ah), account_hash_hex: stripPrefix(hashHex(ah)) });
  }

  if (verb === "balance") {
    const pub = PublicKey.fromHex(req(a[0], "public_key_hex"));
    try {
      const res = await rpc().queryLatestBalance(PurseIdentifier.fromPublicKey(pub));
      const motes = BigInt(String(res.balance ?? "0"));
      return out({ motes: motes.toString(), cspr: csprStr(motes) });
    } catch (e) {
      // An unfunded account's main purse may not exist yet — report 0, not a hard error.
      return out({ motes: "0", cspr: "0", note: "purse not found (likely unfunded): " + short(e) });
    }
  }

  if (verb === "transfer") {
    const target = PublicKey.fromHex(req(a[0], "target_public_key_hex"));
    const motes = req(a[1], "amount_motes");
    const signer = loadSigner();
    const tx = new NativeTransferBuilder()
      .from(signer.publicKey)
      .target(target)
      .amount(String(motes))
      .id(Date.now())
      .chainName(NETWORK)
      .payment(PAY_TRANSFER)
      .build();
    return out(await submitSigned(tx, signer));
  }

  if (verb === "delegate" || verb === "undelegate") {
    const validator = PublicKey.fromHex(req(a[0], "validator_public_key_hex"));
    const motes = req(a[1], "amount_motes");
    const signer = loadSigner();
    const B = verb === "delegate" ? NativeDelegateBuilder : NativeUndelegateBuilder;
    const tx = new B()
      .from(signer.publicKey)
      .validator(validator)
      .amount(String(motes))
      .chainName(NETWORK)
      .payment(PAY_AUCTION)
      .build();
    return out(await submitSigned(tx, signer));
  }

  if (verb === "redelegate") {
    const oldV = PublicKey.fromHex(req(a[0], "old_validator_hex"));
    const newV = PublicKey.fromHex(req(a[1], "new_validator_hex"));
    const motes = req(a[2], "amount_motes");
    const signer = loadSigner();
    const tx = new NativeRedelegateBuilder()
      .from(signer.publicKey)
      .validator(oldV)
      .newValidator(newV)
      .amount(String(motes))
      .chainName(NETWORK)
      .payment(PAY_AUCTION)
      .build();
    return out(await submitSigned(tx, signer));
  }

  if (verb === "confirm") {
    const txHash = req(a[0], "transaction_hash");
    try {
      const res = await rpc().getTransactionByTransactionHash(txHash);
      const info = res.executionInfo || res.execution_info || null;
      const exec = info?.executionResult || info?.execution_result || null;
      const errMsg = exec?.errorMessage ?? exec?.error_message ?? null;
      const found = !!info;
      const success = found && !errMsg && exec != null;
      return out({ found, success, error: errMsg });
    } catch (e) {
      return out({ found: false, success: false, error: short(e) });
    }
  }

  if (verb === "auction-info") {
    // Read the native auction: active validators by weight + (optionally) the
    // agent's own delegations. Defensive about SDK/RPC shape variance — dig the
    // rawJSON auction_state for bids + era_validators.
    const agentHex = a[0] || null;
    const res = await rpc().getLatestAuctionInfo();
    const raw = res?.rawJSON ?? res?.raw_json ?? res ?? {};
    const state = raw.auction_state ?? raw.auctionState ?? raw.AuctionState ?? {};
    const eraValidators = Array.isArray(state.era_validators)
      ? state.era_validators
      : Array.isArray(state.eraValidators)
        ? state.eraValidators
        : [];
    const bids = Array.isArray(state.bids) ? state.bids : [];

    // Top validators by weight: prefer era_validators[*].validator_weights (the
    // active set). Use the highest era_id present, else flatten what we have.
    let weights = [];
    if (eraValidators.length) {
      let chosen = eraValidators[0];
      for (const ev of eraValidators) {
        const a = Number(ev?.era_id ?? ev?.eraId ?? 0);
        const b = Number(chosen?.era_id ?? chosen?.eraId ?? 0);
        if (a > b) chosen = ev;
      }
      const vw = chosen?.validator_weights ?? chosen?.validatorWeights ?? [];
      weights = (Array.isArray(vw) ? vw : []).map((w) => ({
        public_key: w.public_key ?? w.publicKey ?? null,
        weight: String(w.weight ?? "0"),
      }));
    }
    // Fallback to validator bids' staked_amount if era weights are absent.
    if (!weights.length && bids.length) {
      for (const b of bids) {
        const v = b?.bid?.Validator;
        if (v && (b.public_key || v.validator_public_key)) {
          weights.push({
            public_key: b.public_key ?? v.validator_public_key,
            weight: String(v.staked_amount ?? "0"),
          });
        }
      }
    }
    weights.sort((x, y) => {
      const dx = BigInt(x.weight || "0");
      const dy = BigInt(y.weight || "0");
      return dx < dy ? 1 : dx > dy ? -1 : 0;
    });
    const validators = weights.slice(0, 20);

    // The agent's current delegations: Delegator bids whose delegator_kind == agent.
    let delegations = [];
    if (agentHex) {
      const want = agentHex.toLowerCase();
      for (const b of bids) {
        const d = b?.bid?.Delegator;
        if (!d) continue;
        const kind = d.delegator_kind ?? d.delegatorKind ?? {};
        const who = (kind.PublicKey ?? kind.public_key ?? d.delegator_public_key ?? "")
          .toString()
          .toLowerCase();
        if (who === want) {
          delegations.push({
            validator: d.validator_public_key ?? d.validatorPublicKey ?? null,
            amount_motes: String(d.staked_amount ?? "0"),
          });
        }
      }
    }

    return out({
      validators,
      delegations,
      validator_count: validators.length,
      state_root_hash: state.state_root_hash ?? state.stateRootHash ?? null,
      block_height: state.block_height ?? state.blockHeight ?? null,
    });
  }

  if (verb === "deploy-wasm") {
    // Deploy an Odra contract WASM as a Casper 2.0 install session.
    // Odra's installer reads these odra_cfg_* args; init() takes no args (agent = deployer).
    const wasmPath = req(a[0], "wasm_path");
    const pkgKeyName = a[1] || "steward_journal_package_hash";
    const paymentMotes = a[2] ? Number(a[2]) : 500_000_000_000; // 500 CSPR default
    const wasm = new Uint8Array(fs.readFileSync(wasmPath));
    const signer = loadSigner();
    const args = Args.fromMap({
      odra_cfg_package_hash_key_name: CLValue.newCLString(pkgKeyName),
      odra_cfg_allow_key_override: CLValue.newCLValueBool(true),
      odra_cfg_is_upgradable: CLValue.newCLValueBool(false),
      odra_cfg_is_upgrade: CLValue.newCLValueBool(false),
    });
    const tx = new SessionBuilder()
      .from(signer.publicKey)
      .wasm(wasm)
      .installOrUpgrade()
      .runtimeArgs(args)
      .chainName(NETWORK)
      .payment(paymentMotes)
      .build();
    tx.sign(signer);
    const res = await rpc().putTransaction(tx);
    return out({ transaction_hash: hashHex(res.transactionHash), package_key_name: pkgKeyName });
  }

  if (verb === "named-key") {
    // Read a named key off the agent's account entity (e.g. the deployed package hash).
    const name = req(a[0], "named_key");
    const signer = loadSigner();
    const res = await rpc().getLatestEntity(EntityIdentifier.fromPublicKey(signer.publicKey));
    const ent = res?.rawJSON?.entity ?? {};
    const acct = ent.Account ?? ent.AddressableEntity ?? ent;
    const list = Array.isArray(acct.named_keys) ? acct.named_keys : ent.named_keys ?? [];
    const found = (Array.isArray(list) ? list : []).find((k) => k.name === name);
    return out({
      name,
      key: found ? found.key : null,
      available: (Array.isArray(list) ? list : []).map((k) => k.name),
    });
  }

  if (verb === "journal-record") {
    // Call the deployed Journal's record() entry point (agent-only). For Phase 2 smoke
    // test + reused by the Phase 3 agent loop.
    // journal-record <package_hash> <decision_hash> <ipfs_cid> <action_kind> <epoch> [payment]
    const pkgHash = req(a[0], "package_hash").replace(/^(hash-|package-)/, "");
    const decisionHash = req(a[1], "decision_hash");
    const ipfsCid = req(a[2], "ipfs_cid");
    const actionKind = req(a[3], "action_kind");
    const epoch = req(a[4], "epoch");
    const paymentMotes = a[5] ? Number(a[5]) : 5_000_000_000; // 5 CSPR default
    const signer = loadSigner();
    const args = Args.fromMap({
      decision_hash: CLValue.newCLString(decisionHash),
      ipfs_cid: CLValue.newCLString(ipfsCid),
      action_kind: CLValue.newCLString(actionKind),
      epoch: CLValue.newCLUint64(epoch),
    });
    const tx = new ContractCallBuilder()
      .from(signer.publicKey)
      .byPackageHash(pkgHash)
      .entryPoint("record")
      .runtimeArgs(args)
      .chainName(NETWORK)
      .payment(paymentMotes)
      .build();
    return out(await submitSigned(tx, signer));
  }

  throw new Error("unknown verb: " + verb);
}

function submitSigned(tx, signer) {
  tx.sign(signer);
  return rpc().putTransaction(tx).then((res) => ({ transaction_hash: hashHex(res.transactionHash) }));
}

function req(v, name) {
  if (v == null || v === "") throw new Error("missing argument: " + name);
  return v;
}
function stripPrefix(s) {
  return typeof s === "string" ? s.replace(/^account-hash-/, "") : s;
}
function csprStr(motes) {
  const whole = motes / MOTES_PER_CSPR;
  const frac = (motes % MOTES_PER_CSPR).toString().padStart(9, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}
function short(e) {
  return String(e && e.message ? e.message : e).slice(0, 200);
}
function out(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

main().catch((e) => {
  process.stderr.write(JSON.stringify({ error: short(e) }) + "\n");
  process.exit(1);
});
