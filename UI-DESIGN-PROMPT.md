# Steward — UI / Design Build Prompt (Casper Agentic Buildathon 2026)

> **Use this as the design contract for the `frontend/` of the Steward project.** It stands alone — you can hand it to a design/frontend session by itself. It pairs with `BUILD-PROMPT.md` (the engineering spec); where they overlap, the engineering spec wins on data/contracts and this file wins on look, layout, and interaction.

---

## 0. What you're designing & building

Two connected surfaces for **Steward** — an autonomous AI agent that manages a treasury on the Casper Network and **attests every decision on-chain**:

1. **A no-scroll, awwwards-worthy landing page** (`/`) — a single-viewport, terminal-feel, trading-inspired hero with an ASCII art background that has an overall creative mix of Bauhaus and Tenebrism design style and sells Steward in one breathtaking screen and routes the visitor into the app. This is the showpiece and the opening shot of the demo video.
2. **The dashboard / cockpit** (`/dashboard` + sub-pages) — where the agent's behavior is made **legible and trustworthy at a glance**, with the *verifiable on-chain decision journal* as the star.

**Two registers, one brand:**
- **Landing = cinematic.** Modern, awwwards-worthy, "terminal-feel trading interface" — expressive motion, a cursor-reactive 3D backdrop, a live data pulse. Make a judge stop and lean in.
- **App = credible.** A calm, serious, institutional-grade cockpit you can actually audit — trading terminal meets transparency report: confident, data-dense but legible, never flashy where the data lives. Premium polish, but motion never fights the numbers.

The same typography, palette, and accent unify both. The landing dazzles; the cockpit earns trust. Both must look pristine on a 1080p screen recording.

---

## Step 0 — Synthesize the inspiration set (do this FIRST, before designing)

Before proposing any design, synthesize the reference set the product owner provides.

> **PRODUCT OWNER fills this in:** paste your reference sites below, one per line, each with a note **in parentheses** describing exactly what you like about it (a section, a scroll behavior, a menu/modal interaction, a loading sequence, a piece of motion, a layout, etc.).
>
> - https://www.sui.io/developers   (I love the animation hovers, icons and hero typography structure and background style. I also want both their primary and secondary font usage to be replicated on Steward, exactly as is)
> - https://telemetry.io/   (the hover on the header components, there's glitchy text scramble effect when one hovers on it, I love it for both the header of Steward's landing page and side-menu components. I also love the green terminal color)
> - <url>   (what I love about it — be specific)
> ```

Then, for **each** site:
- **Open it with Chrome DevTools** and study it directly — don't guess from a screenshot.
- Identify its **single strongest design idea** (typography system, motion language, layout grid, color use, interaction pattern, narrative structure, etc.).
- Extract **what makes it distinctive**, anchored to the note written in parentheses beside it — that note is the priority signal; borrow *that* part especially.

Then **propose a merged design direction** — *not* a Frankenstein of all of them, but a single coherent point of view that resolves the best ideas into one unified system that fits Steward's terminal/trading identity. Present that synthesis (the POV, the borrowed moves, how they cohere) before building.

**Implement the feel with a premium motion stack** (used tastefully — see the motion rules in §2):
- **GSAP + ScrollTrigger** — each scrolling section animates in as a cinematic scene.
- **Three.js** (via `@react-three/fiber` + `drei`) — a painted-texture background that reacts to the cursor (the hero of the landing; a restrained accent elsewhere).
- **Lenis** — buttery-smooth scroll, the kind premium/award-winning sites have, on every scrolling surface.

> The **landing is intentionally no-scroll** (single viewport), so there the cinematic effect comes from the GSAP **intro timeline** + the Three.js cursor-reactive backdrop — *not* from scroll. Lenis + ScrollTrigger govern the *scrolling* surfaces (About / how-it-works, and gentle in-app reveals).

---

## 1. Tech & constraints

- **Next.js 14 App Router**, **TypeScript**, **Tailwind CSS 3.4**, **shadcn/ui** (Tailwind v3 / React 18 install path — do not let the CLI pull v4/React 19).
- **Premium motion stack (client-only):** **GSAP** + **ScrollTrigger** (cinematic section reveals), **Lenis** (smooth scroll), **Three.js** via **`@react-three/fiber`** + **`@react-three/drei`** (cursor-reactive painted-texture background). This is the engine behind the landing's awwwards-worthy feel.
  - **Next 14 caveat:** all of the above are browser-only. Mark their components `"use client"` and load the WebGL canvas with `next/dynamic` `{ ssr: false }` to avoid hydration / `window is not defined` errors. Wrap the app in a **single** Lenis provider and drive GSAP ScrollTrigger off Lenis's scroll (sync them — never run two scrollers).
  - **Performance + a11y:** keep the WebGL scene lightweight (low-poly/shader, capped DPR, pause when the tab is hidden/off-screen); gate heavy motion behind `prefers-reduced-motion` with a calm static fallback; dispose GSAP/ScrollTrigger/Three instances on unmount (no leaks). The landing's CTA into the dashboard must work even if WebGL fails to initialize.
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
- **Density:** institutional, not sparse — but with clear hierarchy and generous line-height. Cards/panels with subtle 1px borders (`rgba(255,255,255,0.06)`), small radii (8–12px), restrained shadows. **In the data views**, no neon gradients, no glassmorphism overload — legibility first.
- **Motion system — two registers:**
  - **Landing (cinematic):** a GSAP intro timeline (staged reveal: wordmark → tagline → live ticker → CTA), the Three.js cursor-reactive backdrop, magnetic/hover micro-interactions. This is where you reach for the awwwards-worthy "wow" — big, deliberate, premium, but ≤ ~1.5s to interactive and skippable.
  - **App (restrained):** subtle and fast (120–180ms). A gentle "new attestation" highlight when a record lands; smooth Lenis page/section transitions; ScrollTrigger reveals only on narrative surfaces (About). **Never** scroll-jack or animate the live data tables — nothing that fights the numbers.

---

## 3. Information architecture (screens)

Two route groups (Next App Router):

- **`(marketing)` — the landing, no app shell.**
  - **Landing** (`/`) — the no-scroll, awwwards-worthy hero. Its only job: dazzle, then route into the app via a clear CTA ("Enter the terminal" / "Launch dashboard"). See §4.0.

- **`(app)` — the cockpit, with a persistent left sidebar** (nav + wallet/connection status + theme toggle) and a scrolling **main** with a sticky top bar per page. The sidebar wordmark links to `/dashboard`.
  1. **Dashboard** (`/dashboard`) — the cockpit / overview. App home. (See §4.1.)
  2. **Decisions** (`/decisions`) — the live agent decision feed (the star).
  3. **Treasury** (`/treasury`) — allocation, validators, yield.
  4. **Verifier** (`/verifier`) — independently verify any attestation.
  5. **About / Docs** (`/about`) — what Steward is, how it works, the honesty note on determinism, Casper details.

---

## 4. Screen-by-screen spec

### 4.0 Landing page (`/`) — the awwwards-worthy front door ★
**Brief:** *design & build a modern, awwwards-worthy, winning, terminal-feel, trading-inspired interface for Steward.* One screen, **no scroll**, full viewport. It must make a hackathon judge stop and lean in, then send them into the dashboard.
- **Single viewport, no vertical scroll.** Everything composes within `100dvh`; it fits a screen recording with no scrollbar. (Any "learn more" is a smooth in-page anchor or a route — not a long scroll on the hero.)
- **Three.js cursor-reactive backdrop:** a painted-texture / shader field that subtly responds to cursor position (parallax, flow, or displacement). Premium and alive, *not* noisy — it sits behind the content and never hurts legibility.
- **Terminal / trading-floor language:** mono type; a live **ticker-tape** strip (treasury NAV, staking APR, "decisions attested: N", "agent: LIVE"); a blinking cursor / command-line motif; hairline grid; a tasteful scanline or glow. Bloomberg terminal reimagined by an awwwards studio.
- **GSAP intro timeline:** staged reveal — wordmark → tagline → ticker → primary CTA — under ~1.5s, skippable, buttery.
- **Copy:** a tight, confident headline (the one-line pitch — an AI agent that manages a Casper treasury and proves every decision on-chain) + a one-sentence subhead. No walls of text.
- **Primary CTA → `/dashboard`** ("Enter the terminal" / "Launch dashboard"); a secondary link can point to the demo video or repo. **The CTA must always work — even if WebGL fails, render a static gradient/canvas fallback and keep the button live.**
- **Live, not faked:** the ticker numbers read the same live on-chain sources the dashboard uses (treasury, APR, attestation count). If data isn't ready, show a tasteful loading shimmer in the ticker — never invented figures.
- **Wallet/connection + theme** can sit as small top-right controls; keep the hero clean.
- **Mobile:** the hero recomposes into a single phone viewport (stacked), the CTA is thumb-reachable, and the WebGL backdrop degrades to a lightweight gradient. No horizontal scroll, no clipped CTA.

### 4.1 Dashboard (`/dashboard`) — the cockpit
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
- **Landing:** `LandingHero`, `CanvasBackground` (R3F/Three cursor-reactive field, loaded `dynamic` `ssr:false`), `TickerTape` (live on-chain stats), `EnterCTA`, optional `Preloader`/intro.
- **Motion providers:** `SmoothScrollProvider` (Lenis, wraps the app), GSAP + ScrollTrigger registered once and synced to Lenis, a `useReducedMotion` guard.
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
- **WebGL + motion degrade gracefully:** on mobile/low-power and under `prefers-reduced-motion`, swap the Three.js backdrop for a lightweight static gradient and reduce/disable the GSAP/Lenis flourishes. The landing must still render in one phone viewport with a thumb-reachable CTA; never block the dashboard CTA on WebGL.

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
- **WebGL/SSR hydration:** Three.js/R3F + Lenis + GSAP are client-only. Load the canvas via `next/dynamic` `{ ssr:false }` and mark providers `"use client"`, or Next 14 throws hydration / `window is not defined` errors.
- **One scroller only:** if you run Lenis, drive GSAP ScrollTrigger from Lenis's scroll events — don't let native scroll and Lenis fight (janky, doubled scrolling).
- **Clean up animations:** kill GSAP tweens/ScrollTriggers and dispose Three.js geometries/materials/renderer on unmount, or you'll leak memory across route changes and the demo degrades.
- **Don't let flair beat the deadline or the data.** The landing is a showpiece, but the MVP is the live verifiable agent (per `BUILD-PROMPT.md`). Time-box the WebGL; if it's eating days, ship the static-fallback landing and move on.

## 9. Design acceptance checklist
- [ ] Dark default + working light toggle; one disciplined accent color.
- [ ] **Inspiration set synthesized first** (each reference opened in DevTools; single strongest idea extracted; a *merged* coherent POV proposed — not a Frankenstein) before any build.
- [ ] **Landing (`/`)** is a no-scroll, single-viewport, awwwards-worthy terminal/trading hero with a Three.js cursor-reactive backdrop + GSAP intro, a live (not faked) ticker, and a CTA into `/dashboard` that works even if WebGL fails.
- [ ] **Premium motion stack** wired correctly: Lenis smooth scroll + GSAP ScrollTrigger reveals on narrative surfaces, synced to one scroller; no hydration errors.
- [ ] **`prefers-reduced-motion` + mobile fallbacks** present (static backdrop, reduced motion); data views are never scroll-jacked.
- [ ] Dashboard (`/dashboard`) tells the whole story in one screen (KPIs, agent identity, latest verified decision, allocation, mini feed).
- [ ] Decisions feed reads live; row → full reasoning + on-chain facts + client-side hash-match verify; new records surface live.
- [ ] Treasury shows allocation, yield, and mandate/risk limits, live.
- [ ] Verifier walks integrity + provenance with clear ✓/✗ and the honest determinism note visible.
- [ ] All hashes/keys/CIDs are mono, truncated, copyable, explorer-linked; no column overlap with real data.
- [ ] Loading/empty/error states everywhere; zero fabricated data.
- [ ] **Mobile nav works** (hamburger drawer, all items reachable at ~380px); responsive down to phone.
- [ ] Accessible (landmarks, focus, contrast, aria) and clean on a 1080p screen recording.
