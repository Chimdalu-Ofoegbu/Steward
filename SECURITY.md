# Security Policy

## Scope & network

Steward runs on **Casper testnet only** — no mainnet, no real funds. The web tier (https://aisteward.xyz) is **read-only**: it holds no keys and has no spend authority. Spend authority belongs solely to the agent's operator key, which runs server-side / locally and is never committed to the repository.

## Supported versions

The `main` branch is the actively maintained version during the Casper Agentic Buildathon 2026.

## Reporting a vulnerability

Please report security issues **privately**:

1. Preferred: GitHub → **Security** tab → **Report a vulnerability** (private advisory).
2. Alternatively, open a minimal issue that does **not** disclose exploit details and ask for a private channel.

We aim to acknowledge reports within a few days. Please give us a reasonable window to remediate before any public disclosure.

## Secrets discipline

- `.env`, `secrets/`, `*.pem`, and local databases are gitignored; only `.env.example` (placeholders) is committed.
- A leaked funded testnet key is drained by bots within minutes — never paste keys into issues, PRs, logs, or screenshots.
- Off-chain URLs the agent fetches (validator APIs, IPFS gateways) are host-allowlisted and fail closed on bad/oversized responses.

## Dependencies

Dependabot alerts and CodeQL code scanning are enabled on this repository. High-severity (or greater) advisories are patched promptly.
