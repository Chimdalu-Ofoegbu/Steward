// Friendly labels + a stable color palette for validators. The agent reads the
// live auction set; we don't fabricate validator names, so unknown keys fall back
// to a truncated key label. Known testnet keys can be named here over time.

import { trunc } from "./format";

const KNOWN: Record<string, string> = {
  // The agent's current delegation target (top-weight active validator on testnet).
  "0106ca7c39cd272dbf21a86eeb3b36b7c26e2e9b94af64292419f7862936bca2ca": "Top-weight validator",
};

// Slice palette mirrors the Claude Design allocation donut (mint → teal → cyan →
// violet → gold → slate). Stable per index so colors don't shuffle between reads.
export const PALETTE = [
  "#36F1A0",
  "#2bd4c0",
  "#2fa8e0",
  "#6c7be0",
  "#c9a24b",
  "#4a5560",
  "#f5b544",
];

export function validatorName(key: string): string {
  return KNOWN[key.toLowerCase()] || `Validator ${trunc(key, 6, 4)}`;
}

export function validatorColor(i: number): string {
  return PALETTE[i % PALETTE.length];
}
