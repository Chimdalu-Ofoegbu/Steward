# Chain Layer — verified casper-js-sdk v5 API (Phase 1)

The single source of truth for how Steward talks to Casper 2.0 "Condor". Verified
live on testnet 2026-06-25 with `casper-js-sdk@5.0.12`, Node v24.15, Windows.
Phases 3-4 (agent) and Phase 5 (frontend) reuse these exact shapes.

## Import (CRITICAL — it's a CommonJS package)
casper-js-sdk's node build is CJS, so ESM named imports FAIL. Use a default import + destructure:
```js
import pkg from "casper-js-sdk";
const { PrivateKey, PublicKey, KeyAlgorithm, HttpHandler, RpcClient, PurseIdentifier,
        NativeTransferBuilder, NativeDelegateBuilder, NativeUndelegateBuilder, NativeRedelegateBuilder } = pkg;
```
(Frontend Next.js uses the web build and can import named — confirm in Phase 5.)

## RPC client
```js
const rpc = new RpcClient(new HttpHandler("https://node.testnet.casper.network/rpc"));
```

## Keys (ed25519)
```js
const priv = PrivateKey.generate(KeyAlgorithm.ED25519);   // sync
const pub  = priv.publicKey;                               // PublicKey
pub.toHex();           // -> "01…"  (01 = ed25519 tag, 02 = secp256k1)
priv.toPem();          // secret key PEM (gitignored)
pub.toPem();           // public key PEM
pub.accountHash();     // AccountHash; .toHex() -> raw hex (no "account-hash-" prefix here)
PrivateKey.fromPem(pemString, KeyAlgorithm.ED25519);       // load for signing
PublicKey.fromHex("01…");                                  // PublicKey from hex
```
Verified agent key this build: pub `01c85dcb…87539e`, account-hash `932e021d…90b6`.

## Balance (read)
```js
const res = await rpc.queryLatestBalance(PurseIdentifier.fromPublicKey(pub));
res.balance;   // motes (stringify with BigInt)
```
An UNFUNDED account's main purse does not exist yet → the RPC throws
`Code: -32026, err: Purse not found`. The sidecar catches this and reports `motes: 0`.

## Transfer (Casper 2.0 native Transaction)
```js
const tx = new NativeTransferBuilder()
  .from(senderPub).target(targetPub).amount(String(motes)).id(Date.now())
  .chainName("casper-test").payment(100_000_000).build();   // 0.1 CSPR gas
tx.sign(priv);                                               // sync; mutates tx
const res = await rpc.putTransaction(tx);
res.transactionHash;   // TransactionHash — stringify via toHex()
```

## Delegate / Undelegate / Redelegate (Phase 4)
```js
new NativeDelegateBuilder().from(delegatorPub).validator(validatorPub)
  .amount(String(motes)).chainName("casper-test").payment(2_500_000_000).build();
// Undelegate: same shape, NativeUndelegateBuilder.
// Redelegate: add .newValidator(newValidatorPub).
```

## Confirm
```js
const res = await rpc.getTransactionByTransactionHash(txHashHex);
// res.executionInfo.executionResult -> errorMessage===null means Success.
```

## Open items to validate post-funding (01-02)
- Exact pricing: `.payment(n)` uses PaymentLimited (classic). If testnet rejects, switch to fixed pricing mode.
- `putTransaction` result `transactionHash` exact serialization (sidecar `hashHex()` is defensive).
- `getTransactionByTransactionHash` execution-result field path for Success/failure.

## Verbs exposed by agent/sidecar/chain.mjs (Python calls these)
`keygen <dir>` · `account-hash <pubhex>` · `balance <pubhex>` · `transfer <target> <motes>` ·
`delegate <validator> <motes>` · `undelegate <validator> <motes>` · `redelegate <old> <new> <motes>` · `confirm <txhash>`
