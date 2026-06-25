# Steward — Build Prompt (Casper Agentic Buildathon 2026)

> **Paste this entire file as the opening message of a fresh Claude Code session, in an empty project folder.** It is self-contained — it assumes no prior context. Read it top to bottom before writing any code.

---

## 0. Mission (one sentence)

Build **Steward**: an autonomous AI agent that manages a treasury position **natively on the Casper Network** — delegating/rebalancing staked CSPR across validators (plus an optional tokenized real-world-asset allocation) — and **records every decision on-chain** (decision + reasoning, hashed and pinned to IPFS, written to a Casper smart contract) so the entire agentic process is publicly verifiable and replayable.

The single most important property: **every action the agent takes on-chain is preceded by an on-chain attestation of *why*.** That verifiable "agent decision journal" is the centerpiece of the demo and the differentiator. If everything else is cut, the agent making a real on-chain staking decision and attesting it on-chain must work end-to-end.

*(Working name "Steward" — rename freely. It evokes responsible management + accountability, which is the pitch.)*

---

## 1. Why we're building exactly this (read before scoping)

**The competition:** Casper Agentic Buildathon 2026 (DoraHacks), **Casper Innovation Track**.
- **Prize pool:** $150,000 USD.
- **Submission window:** June 1 – **July 1, 2026** (00:00). Plan for a hard stop a day early.
- **Required deliverables:** public Git repo (commit history matters — it's proof of work built during the event) + a demo video.
- **Track ask, verbatim:** *"build applications that leverage Casper's infrastructure to unlock new financial use cases by combining Artificial Intelligence (with strong emphasis on Agentic AI), Decentralized Finance (DeFi), and Real-World Assets (RWA)."* Agentic AI is explicitly the emphasis.

**What judges will reward** (optimize for these, in order):
1. **Agentic AI that does something real** — an agent that perceives state, decides, and *acts on-chain* on its own loop. Not a chatbot.
2. **Genuine use of Casper's infrastructure** — native staking/auction, Casper smart contracts (Rust/WASM or Odra), Casper SDKs, Casper Wallet. An app that doesn't touch Casper loses by default.
3. **DeFi substance** — managing yield/risk on a real position.
4. **Completeness + a clean demo** — it runs live, end-to-end, on Casper testnet.
5. **RWA angle** — a plus, not required. We address it with an optional tokenized-asset allocation and a clear "this pattern extends to compliant RWA tokens on Casper" narrative.

**Hard constraint that shaped this design:** Casper is **not EVM**. Its smart contracts are **Rust compiled to WASM** (Solidity/EVM execution is on Casper's roadmap, targeted ~H2 2026, *not live now*). So there is no reusing EVM/Solidity code — everything on-chain is Casper-native. This build is scoped to what genuinely exists on Casper testnet today: native PoS staking/delegation (the auction system contract) and Casper fungible tokens (CEP-18). We do **not** depend on a perps DEX or AMM existing on Casper.

**Originality note:** build it fresh, in this repo, with honest commit history during the event window. Do not import a prior project's code wholesale — judges (and DoraHacks rules) penalize "recycled" submissions.

---

## 2. The product (what a user sees)

A live web dashboard showing:
- **The Steward agent's current strategy** and the treasury it manages (total CSPR, how it's split across validators, current staking yield, optional RWA-token allocation).
- **A live decision feed** — each agent cycle posts: timestamp, observed state, the decision (e.g. "redelegate 5,000 CSPR from Validator A → Validator B; A's performance dropped"), the model's reasoning, and a link to the **on-chain attestation** + IPFS payload.
- **A Verifier view** — paste/select any past decision and confirm: (a) the reasoning payload pinned to IPFS matches the hash recorded on-chain, and (b) it was attested at block/time X by the agent's key. (Be precise in the framing — see §8 on determinism.)
- **Live validator/treasury stats** read directly from Casper.

Behind it: an **off-chain Python agent loop** (the "brain") that, every cycle, reads on-chain + market state, asks an LLM for a decision under a fixed strategy mandate, then (1) pins the reasoning to IPFS, (2) writes the attestation to the on-chain **Journal** contract, and (3) executes the staking/treasury action on Casper.

---

## 3. Architecture

```
                ┌──────────────────────────────────────────────┐
                │              Steward Agent (Python)          │
                │  loop every N minutes:                       │
                │   1. PERCEIVE  read on-chain treasury state, │
                │       validator performance, balances        │
                │   2. DECIDE    LLM(strategy mandate + state) │
                │                → structured Decision (JSON)   │
                │   3. ATTEST    pin reasoning→IPFS (CID),      │
                │                Journal.record(hash, CID,...)  │
                │   4. ACT       delegate/undelegate/redelegate │
                │                (native auction) or move RWA   │
                └───────┬───────────────────────┬──────────────┘
                        │ deploys/txns          │ reads
                        ▼                        ▼
        ┌─────────────────────────┐   ┌──────────────────────────┐
        │   Casper testnet        │   │  Off-chain data sources  │
        │  • Auction system       │   │  • validator stats API   │
        │    (native staking)     │   │  • CSPR price (optional) │
        │  • Journal contract     │   │  • IPFS (Pinata)         │
        │    (our Rust/Odra)      │   └──────────────────────────┘
        │  • Treasury vault       │
        │    contract (our Rust)  │              ▲
        │  • CEP-18 RWA mock      │              │ live reads
        │    (optional)           │   ┌──────────┴──────────────┐
        └─────────────────────────┘   │  Frontend (Next.js)     │
                                       │  reads Casper live,      │
                                       │  shows feed + verifier   │
                                       └──────────────────────────┘
```

**Three on-chain pieces, in priority order:**

1. **Journal contract (MUST-HAVE, build first).** Stores agent attestations: `record(decision_hash: [u8;32], ipfs_cid: String, action_kind: String, epoch: u64)` callable only by the agent key; emits an event; exposes reads for the frontend (list/paginate recent records). This is small, safe, and is the verifiable-agent centerpiece. **Even if every other contract slips, this + the agent loop + real staking deploys = a complete demo.**
2. **Native staking actions (MUST-HAVE).** The agent's treasury account delegates/undelegates/redelegates CSPR via Casper's **native auction system contract**. For the MVP the agent account holds the funds and signs these deploys directly — no custom vault contract needed. This is real Casper DeFi with zero new contract risk.
3. **Treasury vault contract (STRETCH).** A custom Rust/Odra contract that custodies pooled CSPR and exposes agent-only `delegate/rebalance` entry points + a hard rule that the operator key cannot withdraw user funds (trust-minimization, like a good vault). Only attempt after 1 & 2 are solid.

**Optional RWA booster (STRETCH, high narrative value):** mint a simple **CEP-18** token `rwUSD` representing a tokenized yield-bearing real-world asset (mock), seed the treasury with some, and let the agent allocate between *staked CSPR* and *rwUSD*. This makes the demo literally touch all three pillars (AI + DeFi + RWA). Keep it mock and clearly labeled.

---

## 4. Tech stack — **VERIFY EVERYTHING IN PHASE 0 BEFORE CODING**

Casper shipped **2.0 ("Condor")**, which changed the transaction model (Deploys → Transactions) and VM details. SDK/tooling compatibility is the #1 risk. **Do not trust any version/interface from memory — confirm against live docs and a live testnet call first.**

| Layer | Primary choice | Notes / fallback |
|---|---|---|
| Smart contracts | **Odra** (Rust framework for Casper) for the Journal + vault | Friendlier than raw `casper-contract`. Fallback: raw Rust `casper-contract`/`casper-types` if Odra lags Casper 2.0. Confirm Odra's Casper-2.0 support first. |
| Token standard | **CEP-18** for the optional RWA mock | Casper's fungible-token standard (ERC-20 analog). |
| Agent brain | **Python 3.11+**, `anthropic` SDK | Reuse trAIder-style orchestration. |
| LLM model | **`claude-opus-4-8`** (latest, best judgment) for decisions; **`claude-sonnet-4-6`** for fast/cheap loop iterations during dev | Confirm model IDs are current at build time. Keep temperature low/0 where supported for stability. |
| Casper client (agent) | **`pycspr`** (Python) to build/sign/send deploys + read state | **Verify pycspr supports Casper 2.0 transactions.** If it lags, fall back to driving **`casper-client`** CLI from Python, or write the agent's chain layer in Node with **`casper-js-sdk`**. |
| Frontend | **Next.js 14 App Router**, **Tailwind 3.4**, **shadcn/ui**, **TypeScript** | See the separate `UI-DESIGN-PROMPT.md` for the full design contract. |
| Frontend ↔ Casper | **`casper-js-sdk`** for reads; **Casper Wallet** browser extension for connect | Frontend reads live chain state; wallet connect is for showing "connected" + any user-facing action. |
| IPFS | **Pinata** (pin JSON reasoning payloads) | Reliable, free tier fine for <1MB JSON. Store the returned CID on-chain. |
| State (agent) | **SQLite** (or Postgres if already handy) | Restart-safety: persist last cycle, pending deploys, processed records. |
| Network | **Casper testnet** only | Never mainnet. Get current **testnet RPC endpoint + faucet URL** from docs in Phase 0; fund the agent key from the faucet. |

**Authoritative sources to verify against in Phase 0 (read these first, prefer them over memory):**
- Casper docs (2.0 / Condor): `https://docs.casper.network/` — transaction model, native auction (delegate/undelegate/redelegate) interface, testnet RPC, faucet.
- Odra: `https://odra.dev/` and its repo — current version, Casper-2.0 target, examples.
- `pycspr` repo (Python SDK) and `casper-js-sdk` repo — Casper-2.0 transaction support status.
- CEP-18 standard reference (Casper fungible token).
- Casper Wallet developer docs — dapp connect API.
- Casper testnet faucet + a public testnet node RPC.

> **Your Anthropic + Pinata keys are already set up from a prior build — reuse them.** Ready-to-paste env vars + working `pin`/`decide` code are in **Appendix A** at the bottom of this file. The actual key *values* go only in a local `.env` (gitignored) — never in this file or the committed repo.

---

## 5. Scope guardrails (the most important section)

You have ~6 days and a non-technical product owner. **Ruthlessly protect the MVP.**

**MVP — must demo end-to-end (do these in order, don't move on until each works):**
1. Toolchain verified against live Casper 2.0 testnet (Phase 0 gate).
2. **Journal contract** deployed to testnet; agent key can `record`; frontend can read records.
3. **Agent loop** runs: perceives state → LLM decision (validated JSON) → pins reasoning to IPFS → writes attestation on-chain.
4. **Real staking action**: agent delegates/redelegates CSPR via native auction, on testnet, triggered by its own decision.
5. **Frontend**: live dashboard + decision feed + verifier, reading testnet live.
6. **Demo video** recorded.

**Stretch — only after MVP is green:**
- Custom **treasury vault contract** with operator-can't-withdraw guarantee.
- **CEP-18 `rwUSD`** mock + agent allocates between staking and RWA (the RWA-pillar booster).
- **Second "Risk Officer" agent** that can veto the Strategist's proposal (multi-agent council — strong agentic story, but only if time allows).
- CSPR price oracle integration; richer validator analytics.

**Cut without hesitation:** anything multi-chain, any perps/AMM, any custom consensus, anything needing Casper's not-yet-live EVM, byte-perfect LLM replay, auth/accounts/multi-user, mobile-app-anything beyond a responsive web page.

---

## 6. Build phases & acceptance criteria

**Phase 0 — Toolchain & reality check (half day, non-negotiable).**
- Install Rust + Casper contract toolchain (or Odra) + `casper-client`. Get a testnet account, fund it from the faucet, send one trivial transfer, confirm it on the explorer.
- From Python, read chain state (account balance, auction info) and submit one signed deploy. *Prove the agent's chain layer works before building logic on it.*
- **Gate:** a Python script that (a) reads the agent account's CSPR balance from testnet and (b) submits + confirms a tiny self-transfer. If `pycspr` can't do Casper-2.0 transactions, switch to the `casper-client`/Node fallback **now**, not later.

**Phase 1 — Journal contract (1 day).**
- Write + test (Odra/Rust unit tests) the Journal contract. Deploy to testnet.
- **Acceptance:** agent key calls `record(hash, cid, kind, epoch)`; a non-agent key is rejected; reads return the list; an event fires. Frontend stub can fetch and print the latest 10 records.

**Phase 2 — Agent loop: perceive → decide → attest (1.5 days).**
- Implement the loop. Decision is a **strict pydantic-validated JSON schema** (e.g. `{action, validator_from?, validator_to?, amount_cspr, rwUSD_target_pct?, rationale, confidence}`). Malformed LLM output → skip the cycle, log it, no on-chain action (fail-safe).
- Strategy mandate lives in a single versioned `strategy.md` (the system prompt): the agent's objective, risk limits (max % to one validator, min validators, max single-move size), and the allowed action set. Document it — it's part of the pitch.
- Attest: pin the full reasoning + observed-state snapshot to IPFS (Pinata) → get CID → `Journal.record(sha256(payload), cid, action_kind, epoch)`.
- **Acceptance:** a full cycle produces an on-chain attestation whose recorded hash equals `sha256` of the IPFS-pinned payload; the decision JSON validates; a deliberately corrupted LLM response is rejected with no on-chain write.

**Phase 3 — Act on-chain: native staking (1 day).**
- Map the validated decision to a native auction deploy: `delegate` / `undelegate` / `redelegate` with amount + validator public key(s). Respect the strategy risk limits (enforce them in code too, not just in the prompt — never trust the model with the only guardrail).
- Persist pending deploys; confirm execution before the next cycle acts on stale state.
- **Acceptance:** the agent, from its own decision, redelegates CSPR between two testnet validators; the move is visible on the explorer and reflected in the next perceive cycle; the attestation for that action precedes it on-chain.

**Phase 4 — Frontend live integration (1 day).** Build to `UI-DESIGN-PROMPT.md`.
- Dashboard (treasury + allocation + yield), decision feed (live from Journal contract reads + IPFS payloads), verifier (hash-match check), validator stats.
- **Acceptance:** with the agent running, the frontend updates within one cycle; the verifier confirms a real record's hash matches its IPFS payload; mobile nav works (hamburger drawer — see UI prompt).

**Phase 5 — Stretch + polish + demo (1 day).**
- Add the highest-value stretch you have time for (RWA mock allocation is the best bang-for-buck for the track). Then freeze features and record the demo.

---

## 7. Suggested 6-day plan (adjust to reality)

- **Day 1:** Phase 0 (toolchain proven on testnet) + start Phase 1 (Journal contract).
- **Day 2:** Finish + deploy Journal contract; frontend scaffold reads records.
- **Day 3:** Phase 2 agent loop (perceive/decide/attest) fully working.
- **Day 4:** Phase 3 real staking actions, with code-enforced risk limits.
- **Day 5:** Phase 4 frontend live integration to the design spec.
- **Day 6 (half):** one stretch (RWA mock), freeze, record demo video, write README. **Submit a day before the July 1 cutoff.**

If any day slips, **cut a stretch, never the MVP chain.** The MVP safety net is: agent decides → attests on-chain → stakes on-chain → frontend shows it verifiably. That alone is a credible, complete agentic-DeFi-on-Casper submission.

---

## 8. Hard-won pitfalls (from a prior EVM build of this idea — avoid these)

- **Frontend must read LIVE on-chain state, not a baked-in snapshot.** A "journal" that shows stale fixture data instead of the latest attestation is the most embarrassing demo bug. Wire the feed + verifier to live contract reads; have a clearly-labeled empty state, not fake data.
- **Don't trust the LLM as the only guardrail.** Enforce every risk limit (max move size, max concentration, allowed actions, amount ≥ 0 and ≤ treasury) in deterministic code *after* the model responds. The model proposes; code disposes.
- **LLM determinism is limited — frame the verifier honestly.** You generally cannot prove "re-running the prompt reproduces byte-identical output" (Claude in particular uses adaptive sampling). What you *can* and *should* prove: "the reasoning payload pinned to IPFS matches the hash recorded on-chain, and it was attested by the agent key at time/block X." Frame the Verifier as **integrity + provenance of the logged decision**, not reproducibility. Say this plainly in the UI and README.
- **Nonce/sequencing:** confirm each deploy executes before the next cycle reads state and acts, or the agent will decide on stale balances. Persist pending deploys; one in-flight action at a time for the MVP.
- **Restart-safety:** persist loop state (last processed epoch, pending deploys) so a crash/restart doesn't double-act or replay. Judges may restart it.
- **Secrets discipline (see §9).** Never commit keys. A leaked agent key on a funded testnet account gets drained by bots within minutes.
- **Mobile navigation:** if the layout uses a sidebar for nav, it MUST be reachable on a phone (hamburger → drawer). A sidebar that slides off-screen with no opener = no navigation on mobile. (Detailed in the UI prompt.)
- **Stale frontend build cache:** if the dev server reports phantom syntax errors on valid files, stop it, delete `.next`, restart.

---

## 9. Security & secrets (do this from commit #1)

- **`.gitignore` first:** `.env`, `*.pem`, any `*secret*`, key files, `__pycache__`, `.next`, `node_modules`, local DBs. Commit a `.env.example` with **placeholder** values only.
- Agent signing key, Pinata JWT, RPC URLs → environment variables, never source.
- Add a **pre-commit secret scan** (e.g. gitleaks) early. (On Windows, line-ending warnings can make the hook exit non-zero with no real leak — `git add --renormalize <files>` clears that; it is not a real finding.)
- The Journal contract: only the agent key may `record`. The (stretch) vault contract: hard-code that the operator/agent key **cannot withdraw** custodied principal to itself — only stake/rebalance. This trust-minimization is part of the pitch.
- Validate and host-allowlist any off-chain URL the agent fetches (validator API, IPFS gateway). Fail closed on a bad/oversized response.
- Testnet only. No real funds anywhere in this build.

---

## 10. Repo layout (suggested)

```
steward/
├── contracts/            # Rust/Odra: Journal (MVP), Vault (stretch), rwUSD CEP-18 (stretch)
│   ├── src/ tests/ Odra.toml | Cargo.toml
├── agent/                # Python: the Steward brain
│   ├── src/steward/ perceive.py decide.py attest.py act.py loop.py schema.py
│   ├── strategy.md       # the agent's mandate + risk limits (versioned, part of the pitch)
│   ├── .env.example  pyproject.toml  tests/
├── frontend/             # Next.js 14 — build to UI-DESIGN-PROMPT.md
├── deployments/
│   └── testnet.json      # deployed contract hashes + agent public key + validator set
├── README.md             # what it is, how to run, the verifier explanation, the honesty note on determinism
└── docs/DEMO-SCRIPT.md    # the video walkthrough
```

---

## 11. Submission deliverables

1. **Public Git repo** with honest, dated commit history across the event window.
2. **README** covering: the problem, the agentic design, how it uses Casper (native staking + on-chain journal + CEP-18), how to run it, and the honest framing of the Verifier (integrity/provenance, not reproducibility).
3. **Demo video (≈2–3 min)** — see script below.
4. **`deployments/testnet.json`** with live contract hashes + the agent key so judges can independently verify attestations on the explorer.

**Demo video script (outline):**
1. *Hook (15s):* "Three pillars of this track are Agentic AI, DeFi, and RWA — meet Steward, an AI agent that manages a live treasury on Casper and proves every decision it makes on-chain."
2. *Show the agent loop run once, live (45s):* it reads validator state → an LLM decides a redelegation → pins reasoning to IPFS → writes the attestation to the Journal contract → submits the native staking deploy. Show each on the explorer.
3. *Verifier (30s):* open the dashboard, pick that decision, click verify — the on-chain hash matches the IPFS reasoning payload, attested by the agent key at block X. "Anyone can audit the agent."
4. *DeFi + (stretch) RWA (30s):* show the treasury allocation, staking yield, and (if built) the agent moving between staked CSPR and the tokenized-asset mock.
5. *Casper + close (20s):* native auction staking, Casper smart contracts, CEP-18 — "fully on Casper. The verifiable-agent pattern extends directly to compliant RWA tokens as Casper's RWA infrastructure matures."

---

## 12. Definition of done

The agent runs unattended for several cycles on Casper testnet and, each cycle: perceives live state, produces a schema-valid decision under its mandate, pins the reasoning to IPFS, records a matching attestation in the on-chain Journal contract, and executes the corresponding native staking action — all visible and independently verifiable on the Casper testnet explorer and in the live frontend. The Verifier confirms hash↔payload integrity for any real record. Secrets are clean. The demo video shows one full live cycle plus a verification.

**First action in the new session:** do Phase 0. Verify the toolchain against live Casper 2.0 testnet before writing a line of product logic. Report what you confirmed (SDK version, transaction model, auction interface, testnet RPC, faucet) and flag any deltas from this prompt before proceeding.

---

## Appendix A — Provider setup (Anthropic + Pinata), ready to fill

> **The product owner already has working `ANTHROPIC_API_KEY` and `PINATA_JWT` from a prior build — reuse those exact values.** They go **only** into a local `.env` (gitignored). This appendix contains **placeholders and code, never real secrets.** The code below is the proven Pinata-V3 + Anthropic-forced-tool pattern from that prior build, adapted to Steward — it works as-is once the real keys are in `.env`.

### A.1 `.env.example` (commit this; real values live only in `.env`)

```bash
# ── LLM: Anthropic (reuse your existing key) ────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-REPLACE_ME           # real value ONLY in .env, never committed
STEWARD_MODEL=claude-opus-4-8                  # latest/best judgment; claude-sonnet-4-6 for fast dev loops

# ── IPFS: Pinata V3 (reuse your existing JWT) ───────────────────────────────
PINATA_JWT=REPLACE_ME                          # Pinata V3 API JWT (Bearer token)
PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs

# ── Casper (Phase 0 / Phase 1 produce these) ────────────────────────────────
CASPER_NODE_RPC=https://REPLACE_ME/rpc         # current testnet RPC (confirm in Phase 0)
CASPER_NETWORK_NAME=casper-test
AGENT_SECRET_KEY_PATH=./secrets/agent_secret_key.pem   # gitignored; fund its public key from the faucet
JOURNAL_CONTRACT_HASH=hash-REPLACE_ME          # fill after Phase 1 deploy

# ── Loop config ─────────────────────────────────────────────────────────────
CYCLE_SECONDS=900                              # one agent cycle every 15 min (tune for demo)
```

`.gitignore` must include: `.env`, `secrets/`, `*.pem`. Commit only `.env.example`.

Python deps: `pip install anthropic httpx pydantic python-dotenv pycspr` *(swap `pycspr` for the `casper-client` CLI or a Node `casper-js-sdk` sidecar if Phase 0 shows the Python SDK lags Casper 2.0)*.

### A.2 Attestation — pin to IPFS (Pinata V3) + the on-chain hash  (`agent/src/steward/attest.py`)

```python
import hashlib, json
from urllib.parse import urlparse
import httpx

PINATA_UPLOAD_URL = "https://uploads.pinata.cloud/v3/files"
ALLOWED_GATEWAY_HOSTS = {"gateway.pinata.cloud"}   # SSRF guard: only pin-reads to known IPFS hosts

async def pin_json(payload: dict, jwt: str) -> tuple[str, bytes]:
    """Pin a JSON payload to IPFS via Pinata V3. Returns (cid, exact_pinned_bytes).
    Canonical bytes (sort_keys) so the same logical payload always yields the same CID/hash."""
    content = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            PINATA_UPLOAD_URL,
            headers={"Authorization": f"Bearer {jwt}"},
            files={"file": ("decision.json", content, "application/json")},
            data={"network": "public"},
            timeout=30,
        )
    resp.raise_for_status()
    return resp.json()["data"]["cid"], content

def decision_hash(pinned_bytes: bytes) -> bytes:
    """sha256 of the EXACT pinned bytes — this 32-byte digest is what you record on-chain.
    Record the hash of the bytes, NOT a re-serialization, so any client can verify by
    hashing the raw gateway bytes (see A.4)."""
    return hashlib.sha256(pinned_bytes).digest()

async def fetch_pinned(cid: str, gateway: str) -> bytes:
    """Fetch raw pinned bytes by CID, host-allowlisted, no redirects (SSRF-safe)."""
    parsed = urlparse(gateway)
    if parsed.scheme != "https" or parsed.hostname not in ALLOWED_GATEWAY_HOSTS:
        raise ValueError(f"gateway not allowed: {gateway!r}")
    async with httpx.AsyncClient(follow_redirects=False) as client:
        r = await client.get(f"{gateway}/{cid}", timeout=30)
    r.raise_for_status()
    return r.content
```

Flow per cycle: `cid, raw = await pin_json(payload, jwt)` → `h = decision_hash(raw)` → `Journal.record(h, cid, action_kind, epoch)`.

### A.3 Decision — Anthropic forced-tool call → guaranteed schema-valid JSON  (`agent/src/steward/decide.py`)

```python
import anthropic
from pydantic import BaseModel, Field
from typing import Literal, Optional

# 1) Strict schema the model MUST fill (mirrors the pydantic model below).
DECISION_TOOL = {
    "name": "submit_decision",
    "description": "Submit the treasury action for this cycle.",
    "input_schema": {
        "type": "object",
        "additionalProperties": False,
        "required": ["action", "amount_cspr", "rationale", "confidence"],
        "properties": {
            "action": {"type": "string", "enum": ["delegate","undelegate","redelegate","rebalance","hold"]},
            "validator_from": {"type": "string"},
            "validator_to":   {"type": "string"},
            "amount_cspr":    {"type": "number", "minimum": 0},
            "rwusd_target_pct":{"type": "number", "minimum": 0, "maximum": 100},
            "rationale":      {"type": "string"},
            "confidence":     {"type": "number", "minimum": 0, "maximum": 1},
        },
    },
}

class Decision(BaseModel):
    action: Literal["delegate","undelegate","redelegate","rebalance","hold"]
    validator_from: Optional[str] = None
    validator_to: Optional[str] = None
    amount_cspr: float = Field(ge=0)
    rwusd_target_pct: Optional[float] = Field(default=None, ge=0, le=100)
    rationale: str
    confidence: float = Field(ge=0, le=1)

async def decide(prompt: str, model: str, client=None) -> Optional[Decision]:
    """Forced-tool call: the model is REQUIRED to emit submit_decision → valid JSON.
    Returns a validated Decision, or None (malformed → skip the cycle, NO on-chain action)."""
    client = client or anthropic.AsyncAnthropic()   # reads ANTHROPIC_API_KEY from env
    resp = await client.messages.create(
        model=model,
        max_tokens=1024,
        tools=[DECISION_TOOL],
        tool_choice={"type": "tool", "name": "submit_decision"},
        messages=[{"role": "user", "content": prompt}],
        # NOTE: omit temperature — Opus historically rejects it (HTTP 400) and the forced
        # tool-call needs no sampling knob. If you want determinism, verify support per model first.
    )
    block = resp.content[0] if resp.content else None
    raw = getattr(block, "input", None)
    if not isinstance(raw, dict):
        return None                  # refusal / non-tool output → malformed → skip cycle
    try:
        return Decision(**raw)       # strict validation — second gate
    except Exception:
        return None
```

### A.4 Two rules that keep the demo honest (don't skip)

1. **Code enforces every risk limit AFTER the model responds.** Before turning a `Decision` into a Casper deploy, check it in plain Python against the mandate in `strategy.md` (max single-move size, max % to one validator, min validator count, `amount_cspr ≤ treasury`, allowed actions). The model proposes; code disposes. Never let the prompt be the only guardrail.
2. **Verifier hashes raw bytes, not re-serialized JSON.** The on-chain `decision_hash` is `sha256` of the *exact pinned bytes*. The frontend verifier must fetch the **raw bytes** for the CID from the gateway and `sha256` **those** — it must NOT re-parse + re-stringify the JSON in JS (key order / whitespace would differ and break the match). This is the single most common cross-language verification bug; design for it from day one.

### A.5 Determinism framing (put this in the README + the Verifier UI)

Steward proves a logged decision is **authentic, unaltered, and was made at time X by the agent's key** (integrity + provenance). It does **not** claim re-running the prompt reproduces a byte-identical answer — modern LLMs use adaptive sampling. State this plainly; honest framing reads as credibility, not weakness.
