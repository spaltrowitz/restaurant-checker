# Squad Decisions

## Active Decisions

### In-Memory Caching & Rate Limiting Strategy
**Author:** Fenster | **Date:** 2026-04-30 | **Status:** Implemented

- Caching: In-memory Map with TTL (1hr search results, 5min sitemap). Process-scoped.
- Rate limiting: Per-IP sliding window. `/api/check`: 5/min, `/api/report`: 10/min, `/api/reports`: 20/min. Returns 429 + Retry-After.
- Trade-off: No cross-instance sharing. Needs Redis/Upstash if moving to serverless at scale.

### README: Google CSE Documentation
**Author:** Keaton | **Date:** 2026-04-30 | **Status:** Implemented

- README now accurately reflects Google CSE (not DuckDuckGo) as the search method.
- Added Quick Start API setup note (`.env.local.example` → `.env.local`).
- Documented 100 queries/day free tier limit.
- Compliance section clarifies Google CSE is an official API.

### Vitest as Test Framework
**Author:** McManus | **Date:** 2026-04-30 | **Status:** Implemented

- Adopted Vitest: `npm test` → `vitest run`, `npm run test:watch` → `vitest`.
- Config: `vitest.config.ts` with `globals: true`. Tests at `lib/__tests__/`.
- 38 tests cover core matching logic. 3 known Unicode bugs documented.
- All team members should run `npm test` before pushing.

### Unicode Normalization Strategy
**Author:** Fenster | **Date:** 2026-04-30 | **Status:** Implemented

- `norm()` uses NFD decomposition + combining mark removal for Unicode transliteration. Special cases (ß, æ, œ) handled before NFD. No external dependencies.
- CJK/Cyrillic names still normalize to empty string → false-positive matches. Acceptable for NYC Latin-script focus.
- If we expand internationally, we'd need ICU transliteration or a lookup table for non-Latin scripts.
- All restaurant names with common accents (Café, Señor, Lïllïes) now match correctly in search and Blackbird sitemap checks.

### Fly.io Deployment Configuration
**Author:** Fenster | **Date:** 2026-04-30 | **Status:** Implemented

- Deploy to Fly.io with persistent volumes for SQLite (shared-cpu-1x, 512MB, Newark).
- DB path via `DATABASE_PATH` env var; defaults to `process.cwd()/eatdiscounted.db` locally.
- Auto-stop machines when idle ($0 cost at rest), auto-start on request (~2-3s cold start).
- Secrets (`GOOGLE_CSE_API_KEY`, `GOOGLE_CSE_ID`) via `fly secrets`, not in fly.toml.
- Single machine = single-writer SQLite works perfectly; no Redis needed for caching/rate limiting.
- Trade-off: In-memory cache lost on deploy. If multi-instance needed later, move to LiteFS or hosted DB.

### Post-Sprint Health Check
**Author:** Keaton | **Date:** 2026-04-30 | **Status:** Confirmed

- Build: 🟢 GREEN (Next.js 16.2.4 clean compile, all routes generated)
- Tests: 🟢 GREEN (38/38 pass, 316ms)
- Lint: 🟡 YELLOW (5 issues in squad templates only — zero app code lint issues)
- Git: 2 unpushed commits (33aeb4e, a63388c) ahead of origin
- No breakage from rapid sprint iteration. Ship-ready.
- Action items: push commits, fix unused CheckResult import, consider adding .squad/templates/ to .eslintignore.

### UX Priority: Sort by Signal, Celebration Moment, Collapse Not-Found
**Author:** Verbal (Designer) | **Date:** 2026-04-30 | **Status:** Proposed

- **#1 Sort results by signal:** Reorder results so ✅ found appears first, 🔗 manual-check second, ❌ not-found last. Add `transition-all` for smooth reordering.
- **#2 Celebration moment:** When results finish, show summary card: "🎉 Found on 3 platforms — you could save with Blackbird, inKind, and Bilt!" with action links. For zero results: "No platforms found yet. Be the first to report one!"
- **#3 Collapse not-found:** After streaming completes, collapse ❌ cards into compact row: "Not found on: Upside, Nea, Rakuten Dining" — expandable for details. Reduces scroll depth ~50% on mobile.
- Rationale: "Finding deals should feel like winning, not reading a status report." Transforms utility into something people enjoy using at the dinner table.

### Product Roadmap: Permalinks → Saved Restaurants → Deals-Near-Me
**Author:** Kobayashi (PM) | **Date:** 2026-04-30 | **Status:** Proposed

- **Retention problem:** Currently a single-use lookup tool. No reason to return unless dining at a different restaurant tomorrow.
- **P0 — Restaurant permalinks** (`/r/carbone`): SEO, shareability, bookmarkability. Results are currently ephemeral. Low effort, high impact.
- **P1 — Saved restaurants + "my stack":** Track which platforms user uses at which spots. Creates personal asset and monitoring behavior.
- **P1 — Email/push alerts:** "Carbone just appeared on Seated." Converts single-use to monitoring tool.
- **P2 — Neighborhood browse mode (Deals Near Me):** Show all discounted restaurants within walking distance. Changes product from reactive search to proactive discovery. 10x potential.
- **Growth strategy:** NYC food Twitter/Instagram, Reddit (r/FoodNYC, r/AskNYC), platform Discord groups. No paid ads.
- **Monetization:** Start with affiliate links (Blackbird, inKind, Bilt referral programs). Passive, $0 UX cost.

### Platform Accuracy: site: Operator, Word-Boundary Matching, Data Corrections
**Author:** Redfoot (Platform SME) | **Date:** 2026-04-30 | **Status:** Proposed

- **#1 Use `site:` operator in CSE queries:** Change from broad search + domain filtering to `"Carbone" site:inkind.com`. Eliminates most false positives, improves accuracy from ~70% to ~90%+. Alternatively, create separate CSE engines per platform (100 queries/day each for free).
- **#2 Word-boundary matching:** Replace `t.includes(n)` with `\b`-based regex in `matchesRestaurant`. Prevents "robot" matching "Bo" and "blacksmith" matching "The Smith". For names ≤4 chars, require exact word-boundary match only.
- **#3 Data corrections:**
  - `Rakuten Dining.appOnly` → `false` (can be registered/managed via web at rakuten.com/dining)
  - `Seated.domainFilter` → `"seatedapp.io"` (current "seated" is too loose, matches unrelated URLs)
  - `Blackbird.cardLink` → add comment that it's NFC/QR, not traditional card-linking
- **Dead code:** `slugVariants()` is defined and tested but never called in checker logic. Either use it in `checkBlackbird` or remove it.

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
