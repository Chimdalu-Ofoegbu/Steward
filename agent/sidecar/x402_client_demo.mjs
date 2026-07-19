// Steward x402 BUYER demo — proves the journal paywall end-to-end by paying for a
// decision entry as "another agent". It signs an EIP-712 payment authorization with a
// PEM key (SERVER-SIDE ONLY, never a browser) via casper-js-sdk; the hosted CSPR.cloud
// facilitator settles the WCSPR transfer on testnet and pays the CSPR gas.
//
// Prereqs (see docs/X402.md):
//   - the seller (x402_journal_server.mjs) is running with a FACILITATOR_API_KEY set
//   - the BUYER_PEM key holds testnet WCSPR (wrap CSPR -> WCSPR first)
//
// Env:
//   BUYER_PEM     path to the buyer's PEM key (default ./secrets/buyer_key.pem)
//   BUYER_ALGO    ED25519 (Casper default) | SECP256K1
//   SELLER_URL    default http://localhost:4021
//   TARGET_HASH   the decision_hash to buy (defaults to the epoch-5 attestation)
//
// Run:  node agent/sidecar/x402_client_demo.mjs
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { createClientCasperSigner } from "@make-software/casper-x402";
import { ExactCasperScheme } from "@make-software/casper-x402/exact/client";
import casperSdk from "casper-js-sdk";

const SELLER = process.env.SELLER_URL || "http://localhost:4021";
const PEM = process.env.BUYER_PEM || "./secrets/buyer_key.pem";
const HASH = process.env.TARGET_HASH || "f55f2e15439e8495397922758b17cdfc6c48115dac7bf0dd96cddf4c9c744db1";
const ALGO = (process.env.BUYER_ALGO || "ED25519").toUpperCase();

const keyAlgo = casperSdk.KeyAlgorithm?.[ALGO] ?? casperSdk.KeyAlgorithm?.ED25519;

// The signer reads the PEM off disk and signs the EIP-712 digest — fully server-side.
const signer = await createClientCasperSigner(PEM, keyAlgo);

// Register the Casper "exact" scheme for any casper:* network the seller asks for.
// (Pass a requirements selector to x402Client(...) if a seller offers multiple options.)
const client = new x402Client().register("casper:*", new ExactCasperScheme(signer));
const fetchWithPayment = wrapFetchWithPayment(fetch, client);

console.log(`[buyer] GET ${SELLER}/journal/${HASH} — will pay WCSPR on the 402 challenge…`);
const resp = await fetchWithPayment(`${SELLER}/journal/${HASH}`, { method: "GET" });
console.log("[buyer] status:", resp.status);
console.log("[buyer] body:", JSON.stringify(await resp.json(), null, 2));

const settle = resp.headers.get("PAYMENT-RESPONSE") || resp.headers.get("payment-response");
if (settle) {
  console.log("[buyer] PAYMENT-RESPONSE present — the WCSPR transfer settled on testnet ✓");
  console.log("[buyer] verify the settlement transaction on https://testnet.cspr.live");
} else {
  console.log("[buyer] no settlement header — check the seller has a valid FACILITATOR_API_KEY.");
}
