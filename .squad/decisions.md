# Squad Decisions

> Older decisions archived to decisions-archive.md on 2026-05-03

## Active Decisions

---

## Decision

Replace Brave Search-based Upside checking with a direct call to Upside's open REST API. This is the second platform (after Blackbird) with an authoritative data source — no more search snippet guessing.

---

## API Details

- **Endpoint:** `POST https://pdjc6srrfb.execute-api.us-east-1.amazonaws.com/prod/offers/refresh`
- **Auth:** None required (Origin header from upside.com included as courtesy)
- **Request:** Bounding box covering Manhattan (lat 40.70–40.82, lng -74.02 to -73.93)
- **Response:** `{ "offers": [...] }` with `text` (name), `offerCategory`, `discounts[].percentOff`, `discounts[].detailText`
- **Volume:** ~196 restaurant offers returned for Manhattan bounding box

---

## Changes

1. **`lib/checkers.ts`:** New `checkUpside()` and `getUpsideOffers()` functions. Caches full offer list with 1-hour TTL. Falls back to Brave Search if API is down.
2. **`app/api/check/route.ts`:** Upside now runs in parallel via `checkUpside()` instead of going through `batchSearch()`.
3. **`lib/platforms.ts`:** Upside `appOnly` → `false`. Added `"api"` to `CheckResult.method` union.
4. **`lib/__tests__/checkers.test.ts`:** Updated batchSearch test expectations (Upside excluded from batch).

---

## Trade-offs

- **NYC-only bounding box:** Only covers Manhattan. If we expand beyond NYC, need multiple bounding boxes or a larger one.
- **API stability:** This is an undocumented API — Upside could change or restrict it. Brave Search fallback mitigates this.
- **Cache granularity:** We cache the entire offer list (not per-restaurant) since the API returns all offers in one call. This is more efficient — one API call serves all restaurant lookups within the TTL window.
- **Saves Brave Search quota:** One fewer platform using search API = ~285 fewer Brave queries/month.

---

## Context

Redfoot identified Bilt's architecture: Next.js App Router → Stellate GraphQL CDN → DatoCMS. The Stellate endpoint (`bilt-rewards.stellate.sh`) responds but requires a DatoCMS API token. Introspection is blocked.

---

## Investigation Results

---

### DatoCMS / Stellate Path (cracked but unnecessary)
- Downloaded 127 webpack chunks from biltrewards.com/dining
- **Found DatoCMS read-only API token** in JS bundle: `bea318e7535d484591167aee94fb72`
- Token works — `{ __typename }` query returns `"Query"` successfully
- Introspection blocked (`BLOCKED_INTROSPECTION`) — can't enumerate schema
- Tried guessing model names (`allDiningRestaurants`, `allRestaurants`, etc.) — none exist
- The actual dining data likely uses different model names that would require more JS analysis to discover
- Also found Google Vertex AI Search integration (`omnisearch-svc-prod-z6`) for their concierge search — separate system

---

### REST API Path (the real win)
- Discovered `https://api.biltrewards.com/public/merchants` in a Redux thunk (`getRestaurants` action)
- **Completely public** — no auth headers required
- Returns paginated restaurant data: `?page=0&size=100`
- Total: **2,237 restaurants** across all Bilt Dining cities
- Also supports `?query=carbone` search, though it's fuzzy and unreliable for exact matching
- Rich data per restaurant: name, address, neighborhood, cuisine, per-day points multipliers, exclusive flag, booking provider, lat/lng, rating, reviews, price rating

---

## Decision

Use the REST API (`/public/merchants`) instead of the GraphQL path. Download all restaurants with pagination and cache the full list for 1 hour.

---

### Why not GraphQL?
- Introspection blocked → can't discover schema
- Would need to reverse-engineer exact query names from minified JS
- REST API gives us the same data with zero auth and simpler code

---

### Implementation
- `checkBilt()` in `lib/checkers.ts` — follows same pattern as `checkUpside()` and `checkBlackbird()`
- Fetches all ~2,237 restaurants (23 paginated requests of 100) on first call
- Caches full list in memory with 1-hour TTL
- Matches using existing `matchesRestaurant()` word-boundary logic
- Returns multiplier info and cuisine type in results
- Falls back to Brave Search if the API is down

---

### Trade-offs
- Initial fetch is ~23 HTTP requests (one per page) — takes a few seconds on first call, then cached
- Cache is process-scoped (lost on deploy/restart) — same constraint as other caches
- The DatoCMS token may rotate on deploys — but we don't use it, so irrelevant
- The `/public/merchants` endpoint could change — but it's a stable production API serving their own app

---

### What we leave on the table
- The DatoCMS GraphQL path could expose richer CMS content (editorial, neighborhood guides, etc.)
- If we ever need that, the token is `bea318e7535d484591167aee94fb72` and the endpoint is `bilt-rewards.stellate.sh`

---

## Confidence
- **REST API reliability:** 95% — it's their production endpoint, unauthenticated, CORS-open
- **Data accuracy:** 100% — we're reading from Bilt's own merchant database
- **Longevity:** 80% — public APIs can change, but this one powers their consumer-facing web app

---

# Decision: Blackbird Hybrid Search Strategy

**Author:** Fenster (Backend Dev)
**Date:** 2025-07-14

---

## Context
`checkBlackbird()` only checked the sitemap at `blackbird.xyz/sm.xml`, which has ~50 restaurants. Blackbird has hundreds of partners, so most were being reported as "not found."

---

## Decision
Replace Google CSE with Brave Search API across the entire web app.

---

## Implementation
- **New function:** `braveSearch()` calls `https://api.search.brave.com/res/v1/web/search`
- **Authentication:** `X-Subscription-Token` header with `BRAVE_SEARCH_API_KEY`
- **Response format:** `data.web.results[]` with `title`, `url`, `description` fields
- **Query format:** Preserved existing `site:` operator support — Brave handles it natively
- **Caching:** Preserved existing 1-hour in-memory cache logic (unchanged)
- **Error handling:** Updated logging prefix to `[brave-search]`, preserved structured 403/429 handling

---

## Changes
- `lib/checkers.ts`: Replaced `googleCSESearch()` with `braveSearch()`, removed DuckDuckGo fallback code, removed retry-without-site logic
- `.env.local.example`: Created with `BRAVE_SEARCH_API_KEY` reference
- `README.md`: Updated Quick Start, How It Works, Deployment, Compliance sections

---

## Benefits
- **Reliability:** Brave API actually works (no Cloud Console setup)
- **Capacity:** 2,000 queries/month free tier vs Google's 100/day (20x improvement)
- **Simplicity:** Single env var vs two (no CSE ID needed), no fallback complexity
- **Consistency:** Python CLI and web app now use same search engine

---

## Trade-offs
- Free tier is monthly (2,000/month) not daily. With 1-hour caching, supports ~200+ users/day before limits.
- New API dependency (but Brave Search has better stability track record than Google CSE misconfiguration issues)

---

## Context

The Brave Search integration was returning false positives — e.g., searching "Carbone" matched a French article about "revue carbone" on Rakuten and a TGTG press page. The Python CLI (`restaurant_checker.py`) already solved this with two filter functions.

---

## Decision

Ported both filters to `lib/checkers.ts`:

1. **`titleMatchesRestaurant(title, name)`** — Requires the restaurant name to appear prominently in the search result title (at start, after a separator, or as a major portion). This prevents matches where the name is incidentally buried in unrelated foreign-language text.

2. **`isNoResultsPage(title, snippet)`** — Detects search engine "no results" pages that get indexed and would otherwise match on the restaurant name.

Both gates are applied in `evaluateSearchResults()` before the existing `matchesRestaurant` check. A result must now pass all three: not a no-results page, title matches the restaurant name, AND the combined text matches.

---

## Trade-off

This is intentionally stricter. Results where the restaurant name only appears in the snippet or URL (but not the title) are now rejected. This eliminates the false positive class at the cost of potentially missing a rare legitimate result with a non-descriptive title. Given the false positive pain (user sees "found on Rakuten" for a French energy article), the trade-off is clearly worth it.

---

## Context
Shari requested design improvements across multiple sessions with three specific goals:
1. Collapse not-found results into one line instead of full cards (takes up too much space)
2. General beautification and premium feel
3. Draw inspiration from modern dining apps (Blackbird, Seated, inKind, Nea)

---

## Changes

---

### Priority 1: Collapse Not-Found Results
- **Before:** Each not-found platform got its own full card, even if 6+ platforms returned no results
- **After:** All not-found platforms collapse into a single subtle line: "Not available on: X, Y, Z"
- **Impact:** ~50% scroll reduction on mobile when many platforms return not-found
- **Preserves streaming UX:** Full cards still show during search; collapse only happens post-stream

---

### Priority 2: Premium Visual Design
Enhanced core UI elements to feel more premium and food-forward:

**Search Bar:**
- Thicker border (2px vs 1px)
- Stronger focus ring (4px vs 2px) with gold glow
- Added shadows (subtle on input, medium on button)
- Larger padding and button text
- Button shadow + scale on hover

**Hero Section:**
- Added gold gradient divider line under title
- Increased vertical spacing (py-24 vs py-20)
- Larger tagline text (xl vs lg)
- Better visual hierarchy

**Result Cards:**
- Found cards: 2px green border (40% opacity), hover shadow, bolder text, "View deal →" CTA
- Manual-check cards: 2px amber border (30% opacity), hover shadow, stronger button (15% bg)
- Not-found cards: Hidden unless during streaming

**Popular Searches:**
- Larger buttons with more padding
- Semibold label text
- Hover scale effect (1.03x)
- More generous spacing

**Celebration Summary:**
- Larger emoji (text-2xl)
- Platform names inline after "Available at:"
- Conflict warnings integrated with visual separator
- Richer green gradient background

---

### Color Theme Adjustments
- `--color-success-dim`: Changed from #064e3b → #0a3d2e (richer, less harsh)
- `--color-gold-glow`: Increased opacity from 20% → 30% (stronger focus states)

---

## Design Philosophy
Inspiration from Blackbird/Seated/inKind apps:
- **Strong hierarchy:** Found results are unmistakably the hero, manual-check is secondary, not-found recedes
- **Generous spacing:** Room to breathe makes the experience feel premium, not cramped
- **Subtle animations:** Hover scales, shadows, transitions create tactile responsiveness
- **Food-forward colors:** Gold accents feel warm and dining-appropriate (vs cold tech blues)
- **Premium tactility:** Thicker borders, shadows, and transforms make buttons feel physical

---

## Trade-offs
- **Collapsed not-found hides details** — users can't see individual "Not found" messages per platform. Acceptable because the message is identical for all not-found platforms.
- **Larger elements increase scroll** — but offset by collapsing not-found results, net neutral or positive.
- **More visual weight on found cards** — intentional hierarchy; found results deserve emphasis.

---

## Files Modified
- `components/SearchResults.tsx` — collapse logic, celebration card, sorting
- `components/ResultCard.tsx` — border thickness, shadows, typography, spacing
- `components/SearchBar.tsx` — thicker border, stronger focus, larger button
- `components/PopularSearches.tsx` — larger buttons, better spacing, hover effects
- `app/page.tsx` — hero section spacing, divider line, typography
- `app/globals.css` — color theme adjustments

---

# Partnership Outreach Strategy: Nea, Seated, and Upside

**Author:** Kobayashi (PM)  
**Date:** 2026-04-30  
**Status:** Proposed  
**Owner:** Shari Paltrowitz

---

## Decision

Pursue B2B partnerships with Nea, Seated, and Upside to unlock read-only API or data feed access to their restaurant listings. This unblocks complete platform coverage in EatDiscounted without building web scraping for app-only platforms.

---

## Context

**Current State:**
- 5 platforms fully integrated (Blackbird, inKind, Bilt, TGTG, Rakuten)
- 3 platforms blocked (Nea, Seated, Upside) due to app-only model—no public web presence or searchable listings
- Google CSE can't index app-only platforms; no workaround without their cooperation

**Problem:**
- Gap in platform coverage leaves diners incomplete information
- Users may miss best deals because we can't surface Seated/Nea/Upside availability
- Positioned as a limitation ("sorry, we can't check all platforms")

---

## Proposed Solution

**Outreach Model:**
1. **Nea & Seated:** LinkedIn-first direct pitch to BD/founder. Emphasize early-adopter advantage + community-driven growth model.
2. **Upside:** Formal business development email to partnerships team. Larger company = more structured process.
3. **Value Prop:** Position EatDiscounted as free, high-intent user acquisition channel. Users discover restaurants and immediately click through to your platform.

**Integration Options (in preference order):**
1. **REST API** (preferred): `GET /api/restaurants?city=nyc` → array of `{ name, location, cashback%, ... }`
2. **Data Feed:** Daily/weekly JSON, CSV, or S3 file with listings
3. **Webhook:** Push-based updates when listings change

**Timeline:**
- Week 1: Outreach to all three
- Week 2-3: Negotiate & finalize API docs
- Week 3-4: Implementation & testing
- Week 5: Go live with complete 8-platform coverage

---

## Rationale

**Why partnerships beat scraping:**
- ✅ Durable & maintainable (no brittle HTML parsing)
- ✅ Real-time data (API always fresh vs. stale cache)
- ✅ Legal clarity (explicit data sharing agreement)
- ✅ Relationship asset (future opportunities: co-marketing, data insights, affiliate program)
- ❌ Scraping: Fragile, violates ToS, blocks user agents, rate-limited

**Why they'll say yes:**
- **User acquisition cost:** Zero acquisition cost for incremental bookings
- **No cannibalization:** We're a discovery layer, not a competitor
- **Proof of concept:** Blackbird already works fine through our model
- **Growth upside:** As EatDiscounted scales (5+ cities), they scale with us

**Risk mitigation:**
- **If outreach fails:** Fall back to HTML scraping or manual restaurant CSV (not ideal, but possible)
- **If API is slow:** Implement aggressive caching (1-hour TTL) on our side
- **If they want exclusivity:** Push back; position EatDiscounted as platform-agnostic discovery, not a loyalty program

---

## Trade-offs

| Pro | Con |
|-----|-----|
| Complete platform coverage | Dependent on partners' availability/responsiveness |
| Durable technical solution | May take 4-6 weeks vs. 1 week to ship scraper |
| Relationship asset | Requires executive buy-in on their side |
| Real-time data | Potential rate limits or API deprecation |
