// Server-side Casper reads via casper-js-sdk v5 — mirrors agent/sidecar/chain.mjs.
// casper-js-sdk's node build is CommonJS, so we default-import + destructure
// (named ESM imports fail). This module must only run on the server.
import "server-only";

import { createRequire } from "node:module";
import { CONFIG } from "./config";

// casper-js-sdk's node build is CommonJS and exports its members directly on the
// module object with NO `.default`. Webpack's ESM interop therefore resolves a
// bare `import pkg from "casper-js-sdk"` to `undefined`. Load it via a runtime
// require (the package is in serverComponentsExternalPackages so it stays
// external and unbundled) — this mirrors the sidecar's CJS destructure.
const require = createRequire(import.meta.url);
const pkg = require("casper-js-sdk");

const {
  PublicKey,
  HttpHandler,
  RpcClient,
  PurseIdentifier,
} = pkg as any;

const MOTES_PER_CSPR = 1_000_000_000n;

function rpc() {
  return new RpcClient(new HttpHandler(CONFIG.rpc));
}

/** Reject if `p` doesn't settle within `ms`. Caps a slow/huge read so the route can fall back fast. */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`rpc timeout after ${ms}ms`)), ms)),
  ]);
}

/** Retry transient RPC flakes (the public testnet node is intermittently unavailable / slow). */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3, baseMs = 300): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, baseMs * (i + 1)));
    }
  }
  throw lastErr;
}

// Last good liquid-balance read (CSPR). On a transient node failure we serve this real,
// recently-observed value instead of a misleading 0 — it's a true prior on-chain read,
// never a fabricated number. Refreshed on every successful read.
let lastGoodLiquidCspr: number | null = null;

export function motesToCspr(motes: bigint | string | number): number {
  const m = typeof motes === "bigint" ? motes : BigInt(String(motes ?? "0"));
  // Keep 6 dp of precision without floating BigInt division.
  const whole = m / MOTES_PER_CSPR;
  const frac = m % MOTES_PER_CSPR;
  return Number(whole) + Number(frac) / 1e9;
}

/** Liquid CSPR on the agent's main purse. Unfunded purse → 0 (not an error). */
export async function liquidBalanceCspr(agentHex: string): Promise<number> {
  const pub = PublicKey.fromHex(agentHex);
  try {
    // Retry transient flakes (each shot capped) so a momentary node hiccup doesn't read as 0.
    const res = await withRetry(() => withTimeout(rpc().queryLatestBalance(PurseIdentifier.fromPublicKey(pub)), 3500));
    const cspr = motesToCspr(BigInt(String(res.balance ?? "0")));
    lastGoodLiquidCspr = cspr; // authoritative live read — remember it
    return cspr;
  } catch {
    // Node flaked. Prefer the last real balance we saw over a misleading 0; only fall back
    // to 0 if we've never had a successful read (genuinely unknown / unfunded purse).
    return lastGoodLiquidCspr ?? 0;
  }
}

interface AuctionRead {
  validators: { public_key: string; weight_cspr: number }[];
  delegations: { validator: string; amount_cspr: number }[];
  validator_count: number;
  state_root_hash: string | null;
  block_height: number | null;
}

/**
 * Read the native auction: top validators by weight + the agent's own
 * delegations. Defensive about SDK/RPC shape variance — dig rawJSON's
 * auction_state (same logic as the sidecar `auction-info` verb).
 */
export async function auctionInfo(agentHex: string): Promise<AuctionRead> {
  // Cap this read: the full auction set is huge — the public node either 413s (fast reject)
  // or can take ~15s to stream. Either way, time out at 4s so the route falls back to the
  // agent's attested journal delegations without hanging the dashboard.
  const res: any = await withTimeout(rpc().getLatestAuctionInfo(), 4000);
  const raw = res?.rawJSON ?? res?.raw_json ?? res ?? {};
  const state = raw.auction_state ?? raw.auctionState ?? raw.AuctionState ?? {};
  const eraValidators = Array.isArray(state.era_validators)
    ? state.era_validators
    : Array.isArray(state.eraValidators)
      ? state.eraValidators
      : [];
  const bids = Array.isArray(state.bids) ? state.bids : [];

  // Top validators by weight: prefer the highest-era era_validators set.
  let weights: { public_key: string; weight: string }[] = [];
  if (eraValidators.length) {
    let chosen = eraValidators[0];
    for (const ev of eraValidators) {
      const a = Number(ev?.era_id ?? ev?.eraId ?? 0);
      const b = Number(chosen?.era_id ?? chosen?.eraId ?? 0);
      if (a > b) chosen = ev;
    }
    const vw = chosen?.validator_weights ?? chosen?.validatorWeights ?? [];
    weights = (Array.isArray(vw) ? vw : []).map((w: any) => ({
      public_key: w.public_key ?? w.publicKey ?? "",
      weight: String(w.weight ?? "0"),
    }));
  }
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
  const validators = weights.slice(0, 20).map((w) => ({
    public_key: w.public_key,
    weight_cspr: motesToCspr(w.weight),
  }));

  // The agent's current delegations (Delegator bids keyed to the agent).
  const delegations: { validator: string; amount_cspr: number }[] = [];
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
        validator: d.validator_public_key ?? d.validatorPublicKey ?? "",
        amount_cspr: motesToCspr(String(d.staked_amount ?? "0")),
      });
    }
  }

  return {
    validators,
    delegations,
    validator_count: validators.length,
    state_root_hash: state.state_root_hash ?? state.stateRootHash ?? null,
    block_height: state.block_height ?? state.blockHeight ?? null,
  };
}

/** Robustly stringify SDK hash objects that vary across builds. */
function hashHex(h: any): string | null {
  if (h == null) return null;
  if (typeof h === "string") return h;
  for (const m of ["toHex", "toPrefixedString", "toString"]) {
    if (typeof h[m] === "function") {
      try {
        const v = h[m]();
        if (typeof v === "string" && v.length) return v;
      } catch {
        /* try next */
      }
    }
  }
  for (const k of ["hash", "transactionV1", "v1", "deploy"]) {
    if (h[k]) {
      const inner = hashHex(h[k]);
      if (inner) return inner;
    }
  }
  return null;
}

export interface OnChainTxn {
  found: boolean;
  success: boolean;
  block_hash: string | null;
  initiator: string | null;
  args: Record<string, string>;
  error?: string | null;
}

/**
 * Fetch a Journal `record(...)` transaction and pull the runtime args it carried
 * on-chain — decision_hash, ipfs_cid, action_kind, epoch — plus the initiator
 * (the agent key) and the block it executed in. This is the provenance anchor:
 * what was committed on-chain, by whom, where.
 */
export async function getJournalTransaction(txnHash: string): Promise<OnChainTxn> {
  try {
    const res: any = await rpc().getTransactionByTransactionHash(txnHash);
    const raw = res?.rawJSON ?? res ?? {};
    const txWrap = raw.transaction ?? raw.Transaction ?? res?.transaction ?? {};
    const info = res.executionInfo ?? res.execution_info ?? raw.execution_info ?? null;
    const exec = info?.executionResult ?? info?.execution_result ?? null;
    const errMsg = exec?.errorMessage ?? exec?.error_message ?? null;
    const blockHashRaw = info?.blockHash ?? info?.block_hash ?? null;
    const blockHash = blockHashRaw != null ? hashHex(blockHashRaw) : null;

    // Extract initiator + runtime args defensively from the raw transaction JSON.
    const v1 = txWrap?.Version1 ?? txWrap?.version1 ?? txWrap;
    const initiator = extractInitiator(v1);
    const args = extractArgs(v1);

    return {
      found: !!info || !!txWrap,
      success: !errMsg,
      block_hash: blockHash ? String(blockHash) : null,
      initiator,
      args,
      error: errMsg ?? null,
    };
  } catch (e: any) {
    return {
      found: false,
      success: false,
      block_hash: null,
      initiator: null,
      args: {},
      error: String(e?.message ?? e).slice(0, 200),
    };
  }
}

function extractInitiator(v1: any): string | null {
  const header = v1?.header ?? v1?.Header ?? {};
  const ia =
    header.initiator_addr ??
    header.initiatorAddr ??
    v1?.payload?.initiator_addr ??
    v1?.initiator_addr ??
    {};
  const pk = ia?.PublicKey ?? ia?.public_key ?? (typeof ia === "string" ? ia : null);
  return pk ? String(pk) : null;
}

function extractArgs(v1: any): Record<string, string> {
  const out: Record<string, string> = {};
  // Casper 2.0 v1 transactions carry runtime args under body.args or payload.fields.args.
  const argsNode =
    v1?.body?.args ??
    v1?.payload?.fields?.args ??
    v1?.args ??
    v1?.payload?.args ??
    null;
  if (!argsNode) return out;

  // Args can be Named [[name, {cl_type, bytes, parsed}], ...] or {Named: [...]}.
  const named = argsNode.Named ?? argsNode.named ?? argsNode;
  if (Array.isArray(named)) {
    for (const item of named) {
      if (Array.isArray(item) && item.length >= 2) {
        const name = String(item[0]);
        const parsed = item[1]?.parsed ?? item[1]?.Parsed ?? item[1];
        out[name] = parsed != null ? String(parsed) : "";
      }
    }
  }
  return out;
}

export function explorerTxn(txn: string): string {
  return `${CONFIG.explorer}/transaction/${txn}`;
}
