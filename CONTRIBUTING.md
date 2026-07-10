# Contributing to Steward

Thanks for your interest. Steward is a verifiable autonomous treasury agent on the Casper Network. This guide covers local setup and the conventions we follow.

## Ground rules

- **Testnet only.** Never point the agent at mainnet, and never commit a funded key. Secrets live only in local `.env` files (gitignored); commit only `.env.example` with placeholders.
- **The web tier is read-only.** No wallet, keys, or spend authority in the browser. Spend authority belongs solely to the agent's operator key.
- **Keep the Verifier honest.** Its claim is *integrity + provenance* (the pinned reasoning matches the on-chain hash, attested by the agent's key) — not prompt reproducibility. Don't overstate it.

## Project layout

- `contracts/` — Odra/Rust Journal contract (compiled to WASM)
- `agent/` — Python brain + the Node `casper-js-sdk` sidecar + `strategy.md` (the mandate)
- `frontend/` — Next.js 14 dashboard, decision feed, and Verifier
- `deployments/testnet.json` — live contract hash, agent public key, and proofs

## Local setup

**Frontend (read-only, no secrets):**

```bash
cd frontend && cp .env.example .env.local && npm install && npm run dev
# http://localhost:3000
```

**Agent (one cycle):** copy `agent/.env.example` to `agent/.env`, add `ANTHROPIC_API_KEY` + `PINATA_JWT`, fund a testnet key, then:

```bash
# Windows: agent/.venv/Scripts/python.exe   |   macOS/Linux: agent/.venv/bin/python
agent/.venv/Scripts/python.exe agent/run_cycle.py
```

## Commits & pull requests

- Use conventional commits: `feat(...)`, `fix(...)`, `docs(...)`, `chore(...)`.
- Branch off `main`; open a PR with a clear description of what changed and why.
- Run `cd frontend && npm run build` before pushing frontend changes — CI runs the same build on every PR.
- Never commit secrets. A pre-commit secret scan (e.g. gitleaks) is recommended.

## Reporting issues

Open a GitHub issue with clear reproduction steps. For anything security-sensitive, follow `SECURITY.md` instead of filing a public issue.
