// Friendly labels + a stable color palette for validators. The agent reads the
// live auction set; we don't fabricate validator names, so unknown keys fall back
// to a truncated key label. Known testnet keys can be named here over time.

import { trunc } from "./format";

const KNOWN: Record<string, string> = {
  // The agent's current delegation target (top-weight active validator on testnet).
  "0106ca7c39cd272dbf21a86eeb3b36b7c26e2e9b94af64292419f7862936bca2ca": "Top-weight validator",
};

export const PALETTE = [
  "#22D3EE",
  "#34D399",
  "#818CF8",
  "#FBBF24",
  "#F472B6",
  "#60A5FA",
  "#FB923C",
];

export function validatorName(key: string): string {
  return KNOWN[key.toLowerCase()] || `Validator ${trunc(key, 6, 4)}`;
}

export function validatorColor(i: number): string {
  return PALETTE[i % PALETTE.length];
}
