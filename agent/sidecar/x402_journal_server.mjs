// Steward x402 seller — serves the on-chain-attested decision journal behind an
// x402 paywall. Another agent pays a small WCSPR micropayment (settled GAS-FREE by
// the hosted CSPR.cloud facilitator) to read a decision entry. This makes Steward a
// SELLER in the machine economy: agents pay Steward for its verifiable decision data,
// so even Steward's *outputs* are transacted on-chain and auditable.
//
// Server-side only. This does NOT touch Steward's staking key — the paywall merely
// receives WCSPR to PAYEE_ADDRESS; the read-only web tier is unaffected.
//
// Casper x402 facts (see docs/X402.md):
//   - scheme "exact" on network casper:casper-test
//   - payment asset is a CEP-18 token (WCSPR), NOT native CSPR
//   - the hosted facilitator pays the CSPR gas for settlement (gas-sponsored)
//
// Env:
//   FACILITATOR_API_KEY  CSPR.cloud API key (console.cspr.build) — required to settle
//   PAYEE_ADDRESS        account-hash (00…) that receives the WCSPR (e.g. Steward's agent account)
//   PRICE_WCSPR          price in base units (9 decimals); default 1000000 = 0.001 WCSPR
//   X402_PORT            default 4021
//
// Run:  node agent/sidecar/x402_journal_server.mjs
import express from "express";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactCasperScheme } from "@make-software/casper-x402/exact/server";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..", ".."); // .../Steward
const FEED = path.resolve(REPO, "deployments", "journal_feed.json");

const CHAIN_ID = "casper:casper-test";
// Pre-deployed testnet Wrapped CSPR (WCSPR), 9 decimals — no need to deploy our own CEP-18.
const WCSPR_TESTNET = "3d80df21ba4ee4d66a2a1f60c32570dd5685e4b279f6538162a5fd1314847c1e";
const PRICE = process.env.PRICE_WCSPR || "1000000"; // 0.001 WCSPR
const PORT = Number(process.env.X402_PORT || 4021);
const FACILITATOR = "https://x402-facilitator.cspr.cloud";

function loadJournal() {
  try {
    return JSON.parse(readFileSync(FEED, "utf-8"));
  } catch {
    return [];
  }
}

const facilitator = new HTTPFacilitatorClient({
  url: FACILITATOR,
  // Hosted facilitator auth — the CSPR.cloud key is sent server-side only.
  createAuthHeaders: async () => {
    const a = { Authorization: process.env.FACILITATOR_API_KEY };
    return { verify: a, settle: a, supported: a, bazaar: a };
  },
});

const scheme = new ExactCasperScheme()
  .registerAsset(CHAIN_ID, WCSPR_TESTNET, 9)
  .registerMoneyParser(() =>
    Promise.resolve({
      asset: WCSPR_TESTNET,
      amount: PRICE, // base units set the real on-chain WCSPR amount
      extra: { name: "Wrapped CSPR", symbol: "WCSPR", version: "1", decimals: "9" },
    }),
  );

const app = express();
// The x402 resource server loads "supported kinds" from the facilitator at startup, which
// requires FACILITATOR_API_KEY. When it's absent we still run (free discovery works), but the
// paid route returns 503 rather than leaking the entry for free.
const PAYWALLED = !!process.env.FACILITATOR_API_KEY;

// Free discovery: agents can see WHAT they'd be paying for before paying.
app.get("/journal", (_req, res) => {
  res.json(
    loadJournal().map((e) => ({ epoch: e.epoch, action: e.action, decision_hash: e.decision_hash })),
  );
});

// Paid: the full attested decision (rationale + on-chain proofs) behind the x402 paywall.
if (PAYWALLED) {
  app.use(
    paymentMiddleware(
      {
        "GET /journal/:hash": {
          accepts: [{ scheme: "exact", price: "$0.001", network: CHAIN_ID, payTo: process.env.PAYEE_ADDRESS }],
          description: "Steward on-chain-attested decision journal entry (rationale + proofs)",
          mimeType: "application/json",
        },
      },
      new x402ResourceServer(facilitator).register(CHAIN_ID, scheme),
    ),
  );
}

app.get("/journal/:hash", (req, res) => {
  if (!PAYWALLED)
    return res.status(503).json({ error: "paywall not configured — set FACILITATOR_API_KEY (see docs/X402.md)" });
  const entry = loadJournal().find((e) => e.decision_hash === req.params.hash);
  if (!entry) return res.status(404).json({ error: "no attested decision with that hash" });
  res.json({ ...entry, verify_url: `https://aisteward.xyz/api/verify?hash=${entry.decision_hash}` });
});

app.listen(PORT, () => {
  console.log(
    `[steward-x402] journal paywall on :${PORT}  (asset WCSPR ${WCSPR_TESTNET.slice(0, 10)}…, price ${PRICE} base units)`,
  );
  if (!process.env.FACILITATOR_API_KEY)
    console.log("[steward-x402] WARN: FACILITATOR_API_KEY not set — 402 challenges work, but settlement fails until it's set.");
  if (!process.env.PAYEE_ADDRESS)
    console.log("[steward-x402] WARN: PAYEE_ADDRESS not set — set the account-hash (00…) that should receive WCSPR.");
});
