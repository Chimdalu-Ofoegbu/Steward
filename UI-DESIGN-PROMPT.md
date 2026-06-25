# Steward — UI / Design Build Prompt (Casper Agentic Buildathon 2026)

> **Use this as the design contract for the `frontend/` of the Steward project.** It stands alone — you can hand it to a design/frontend session by itself. It pairs with `BUILD-PROMPT.md` (the engineering spec); where they overlap, the engineering spec wins on data/contracts and this file wins on look, layout, and interaction.

---

## 0. What you're designing & building

A single, polished **web dashboard** for **Steward** — an autonomous AI agent that manages a treasury on the Casper Network and **attests every decision on-chain**. The UI's job is to make the agent's behavior **legible and trustworthy at a glance**, and to make the *verifiable on-chain decision journal* feel like the star of the show. This screen is also the demo video — it has to look credible and read clearly on camera.

**Emotional target:** "a calm, serious, institutional-grade cockpit for an AI that you can actually audit." Think trading terminal meets transparency report — confident, data-dense but legible, not flashy/web3-garish.

---

## 1. Tech & constraints

- **Next.js 14 App Router**, **TypeScript**, **Tailwind CSS 3.4**, **shadcn/ui** (Tailwind v3 / React 18 install path — do not let the CLI pull v4/React 19).
- **Reads Casper live.** All chain data via **`casper-js-sdk`** against Casper testnet. **Wallet connect via Casper Wallet** (browser extension) for the "Connected" chip and any user-facing action. No mock/fixture data in the shipped UI — use real reads with proper loading/empty/error states.
- **Data sources the UI renders:**
  - The **Journal contract** (our deployed Casper contract): list of attestations — each has `decision_hash`, `ipfs_cid`, `action_kind`, `epoch`, tx hash, timestamp.
  - **IPFS (Pinata gateway):** the full reasoning + observed-state payload for each attestation (fetch by CID).
  - **Native auction / account state:** treasury balance, delegations per validator, staking rewards/yield.
  - *(Stretch)* CEP-18 `rwUSD` balance for the RWA allocation slice.
- **No backend dependency required** for reads — read chain + IPFS directly from the client. Keep it deployable to Vercel as a static-ish Next app.
- **Performance:** poll/refresh on a sane interval (e.g. 15–30s) or on-demand refresh buttons; never hammer the RPC. Cache IPFS payloads by CID.

---

## 2. Brand & visual language

- **Name treatment:** "Steward" — clean, confident wordmark. (If you want a stylized accent, emphasize a substring subtly; keep it tasteful.)
- **Mode:** ship **dark by default**, with a working light toggle. Dark reads best for a "terminal/cockpit" demo.
- **Palette (suggested, dark):**
  - Background: near-black, layered surfaces (`#0B0D10` base → `#14171C` panel → `#1B1F26` inset).
  - Ink: high-contrast off-white primary, two muted grays for secondary/tertiary text.
  - **One confident accent** (pick a Casper-adjacent cool tone — a refined cyan/teal or electric blue) for primary actions, active nav, and "live" indicators. Use it sparingly.
  - Semantic: green = healthy/profit/verified; amber = caution/pending; red = error/risk-breach. Never rely on color alone (add icon/text).
- **Typography:** a clean grotesk/sans for UI (e.g. Inter); a **monospace** for all on-chain primitives — hashes, CIDs, public keys, CSPR amounts, epochs. Monospace + truncation-with-copy for every hash/key/CID.
- **Density:** institutional, not sparse — but with clear hierarchy and generous line-height. Cards/panels with subtle 1px borders (`rgba(255,255,255,0.06)`), small radii (8–12px), restrained shadows. No neon gradients, no glassmorphism overload.
- **Motion:** subtle and fast (120–180ms). A gentle "new attestation" highlight when a record lands. Nothing that fights the data.

---

## 3. Information architecture (screens)

A persistent **left sidebar** (nav + wallet/connection status + theme toggle) and a scrolling **main** with a sticky top bar per page.

**Nav items:**
1. **Overview** (`/`) — the cockpit. Default landing.
2. **Decisions** (`/decisions`) — the live agent decision feed (the star).
3. **Treasury** (`/treasury`) — allocation, validators, yield.
4. **Verifier** (`/verifier`) — independently verify any attestation.
5. **About / Docs** (`/about`) — what Steward is, how it works, the honesty note on determinism, Casper details.

---

## 4. Screen-by-screen spec

### 4.1 Overview (`/`) — the cockpit
The single screen that tells the whole story; this is the demo's home base.
- **Hero strip / KPI row:** Treasury value (CSPR + ~USD), current staking yield/APR, # validators delegated, # decisions attested, "agent status" (Live / Idle / next cycle in mm:ss).
- **Agent identity card:** model in use (e.g. "Claude Opus 4.8"), the strategy mandate name/version, and the agent's public key (mono, copyable, links to explorer).
- **Latest decision card (prominent):** the most recent attestation — action summary, one-line rationale, "verified ✓" badge (hash↔IPFS match), timestamp, links to tx + IPFS.
- **Allocation donut/bar:** CSPR across validators (+ rwUSD slice if built).
- **Mini live feed:** last 5 decisions, each row click → Decisions detail.
- Empty state (no attestations yet): a clear "Agent has not posted a decision yet — first cycle runs at …", never fake rows.

### 4.2 Decisions (`/decisions`) — live agent decision feed ★
The differentiator. Make it feel alive and trustworthy.
- **Reverse-chronological list** of attestations. Each row: timestamp, `action_kind` (Delegate / Undelegate / Redelegate / Rebalance / Hold), a human summary ("Redelegated 5,000 CSPR: Validator A → B"), confidence, and a **Verified ✓ / Unverified** chip.
- **Row → detail panel/modal** showing:
  - The full **reasoning** (from the IPFS payload): what the agent observed, its reasoning, the decision, risk-limit checks it applied.
  - The **on-chain facts**: tx hash, block/epoch, `decision_hash`, `ipfs_cid` — all mono, copyable, with explorer/IPFS-gateway links.
  - A **"Verify" button** that recomputes `sha256(payload)` client-side and shows it matches the on-chain `decision_hash`.
- **New-record affordance:** when a fresh attestation lands during the demo, surface it (subtle highlight + optional toast). This "watch the agent think, then act, on-chain, live" moment is the wow.
- **Column hygiene (learned the hard way):** for any table/grid of on-chain values, give each column enough width and `min-width:0` + truncation so long hashes/amounts under one header never overlap the next. Test with real long values.

### 4.3 Treasury (`/treasury`)
- **Allocation breakdown:** each validator — name/pubkey, amount delegated, share %, recent performance/uptime, rewards earned. (+ rwUSD row if built.)
- **Yield over time:** a simple line/area chart of cumulative rewards or APR.
- **Risk panel:** show the agent's mandate limits (max % to one validator, min validator count, max single-move size) and whether current state is within them — green/amber.
- Read live from auction/account state.

### 4.4 Verifier (`/verifier`) — trust, made tangible
- Input: select a recent attestation or paste a `decision_hash` / tx hash / CID.
- Output, step-by-step with clear ✓/✗:
  1. **Attestation found on-chain** (Journal contract record, at block/epoch X, by agent key Y).
  2. **IPFS payload fetched** for the CID.
  3. **Integrity:** `sha256(payload) == on-chain decision_hash` → **MATCH**.
  4. **Provenance:** attested by the agent's key at time/block X.
- **Honesty note, shown in the UI (don't hide it):** Steward proves *the logged decision is authentic, unaltered, and was made at time X by the agent* — integrity + provenance. It does **not** claim the LLM will reproduce a byte-identical answer if re-run (modern models use adaptive sampling). State this plainly; it's a credibility win, not a weakness. Keep wording calm and factual.

### 4.5 About / Docs (`/about`)
- Plain-language: what Steward is, the perceive→decide→attest→act loop (a small diagram), how it uses Casper (native auction staking, our Journal contract, CEP-18), and the determinism honesty note.
- Links: repo, demo video, deployed contract hashes, agent public key.

---

## 5. Components to build (shadcn-based)
- App shell: `Sidebar`, `Topbar`, `WalletChip` (Connected/Not connected + short key), `ThemeToggle`.
- `KpiCard`, `StatPill`, `AgentIdentityCard`.
- `DecisionRow`, `DecisionDetail` (modal/drawer), `VerifiedBadge`.
- `AllocationChart` (donut + legend), `YieldChart` (line/area), `RiskLimitGauge`.
- `VerifierStepper`.
- Primitives: `HashChip`/`CopyMono` (truncate + copy + explorer link), `EmptyState`, `LoadingSkeleton`, `ErrorState`, `Toast`.

---

## 6. Responsive & mobile (explicit — do not skip)
- **Breakpoints:** comfortable on desktop (cockpit), usable on tablet, and **navigable on a phone**.
- **Mobile nav is a hard requirement.** If the sidebar holds all navigation, on small screens it must collapse to an off-canvas drawer opened by a **fixed hamburger button** (top-left), with a tap-to-close backdrop and close-on-route-change. A sidebar that simply slides off-screen with no opener means **navigation is impossible on mobile** — that exact bug shipped in a prior build; do not repeat it. Verify on a real ~380px viewport that every nav item is reachable.
- Tables/feeds: collapse multi-column rows into stacked cards on narrow screens; never let on-chain values overflow or overlap.
- Tap targets ≥ 40px; sticky headers don't eat the viewport.

## 7. States, accessibility, polish
- **Every async view** has explicit **loading / empty / error** states. Never show stale or fabricated data while loading — skeletons or honest empty copy.
- **Accessibility:** semantic landmarks; `aria-current` on active nav; `aria-expanded` on the hamburger; visible focus rings; color-contrast AA; never encode meaning in color alone.
- **Copy tone:** precise, calm, institutional. No hype. Numbers formatted consistently (thousands separators; fixed decimals for CSPR; relative + absolute timestamps).
- **Demo readiness:** looks correct on a 1080p screen recording; the "new attestation lands → verify it" flow is smooth and obvious.

## 8. Build pitfalls to avoid (from a prior build)
- **Live, not snapshot.** The decisions feed and verifier must read the chain/IPFS live. A journal showing yesterday's fixture data instead of the latest real attestation is the worst-look demo bug — wire it to live reads with honest empty states.
- **Column overlap.** Wrap on-chain values in mono chips with `min-width:0` + ellipsis inside grid/table cells; test with real long hashes/CIDs/amounts so figures under one header never bleed into the next.
- **Mobile nav unreachable** — see §6. Build and verify the hamburger drawer.
- **Stale `.next` cache** can produce phantom syntax errors on valid files — stop server, delete `.next`, restart.
- Don't over-animate; in some preview/headless renderers CSS transitions get throttled and look "stuck" — keep transitions short and verify true layout state, not just the mid-transition frame.

## 9. Design acceptance checklist
- [ ] Dark default + working light toggle; one disciplined accent color.
- [ ] Overview tells the whole story in one screen (KPIs, agent identity, latest verified decision, allocation, mini feed).
- [ ] Decisions feed reads live; row → full reasoning + on-chain facts + client-side hash-match verify; new records surface live.
- [ ] Treasury shows allocation, yield, and mandate/risk limits, live.
- [ ] Verifier walks integrity + provenance with clear ✓/✗ and the honest determinism note visible.
- [ ] All hashes/keys/CIDs are mono, truncated, copyable, explorer-linked; no column overlap with real data.
- [ ] Loading/empty/error states everywhere; zero fabricated data.
- [ ] **Mobile nav works** (hamburger drawer, all items reachable at ~380px); responsive down to phone.
- [ ] Accessible (landmarks, focus, contrast, aria) and clean on a 1080p screen recording.
