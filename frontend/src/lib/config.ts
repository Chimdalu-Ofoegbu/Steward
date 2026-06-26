// Server-side env config (read-only). Imported only by route handlers / server code.
// Falls back to the known testnet values from deployments/testnet.json so the app
// still reads live even if .env.local is missing.

export const CONFIG = {
  rpc: process.env.CASPER_NODE_RPC || "https://node.testnet.casper.network/rpc",
  network: process.env.CASPER_NETWORK_NAME || "casper-test",
  agentPublicKeyHex:
    process.env.AGENT_PUBLIC_KEY_HEX ||
    "01c85dcb19012ff343ef214d34ad00c9fe38ee3b3abbffdfff276de121cc87539e",
  journalPackageHash:
    process.env.JOURNAL_PACKAGE_HASH ||
    "506497e9dc4607460891120b7bccc8b182686ab2207a629cbb57204d5bab3aa2",
  pinataGateway: (process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs").replace(/\/+$/, ""),
  explorer: (process.env.EXPLORER || "https://testnet.cspr.live").replace(/\/+$/, ""),
};

// Public values safe to expose to the client (no secrets exist anyway — read-only app).
export const PUBLIC_CONFIG = {
  agentPublicKeyHex: CONFIG.agentPublicKeyHex,
  journalPackageHash: CONFIG.journalPackageHash,
  explorer: CONFIG.explorer,
};
