# Squad Decisions

> Inbox merged on 2026-05-06. Older decisions archived to decisions-archive.md on 2026-05-03

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

---

# Decision: Brave Search Improvements — Query Tuning, New Platforms, Deal Extraction

**Author:** Fenster (Backend Dev)  
**Date:** 2026-05-06  
**Status:** Implemented

---

## Context

Three areas of Brave Search needed improvement:
1. inKind had 0% hit rate due to poor site indexing with `site:` restriction
2. Rakuten Dining returned French shopping false positives
3. Web search results showed only page titles with no earning/deal information

---

## Decisions

### 1. skipSiteOperator flag for poorly-indexed platforms
Added `skipSiteOperator?: boolean` to Platform interface. When true, `batchSearch()` omits the `site:` operator from the Brave query but still uses `domainFilter` for result URL validation. Only inKind uses this currently. Query changes from `"Carbone" site:inkind.com` to `"Carbone" inkind dining`.

### 2. Path-based domainFilter for Rakuten
Changed Rakuten Dining's `domainFilter` from `rakuten.com` to `rakuten.com/dining`. This filters out non-dining Rakuten pages (shopping, French content) at the URL validation level.

### 3. "deals" rewardType for editorial platforms
Added `"deals"` to the `rewardType` union type. Infatuation and Eater are editorial platforms that cover dining deals/events — they don't offer direct discounts. This distinguishes them from discount/cashback platforms in the UI.

### 4. extractDealDetails() for snippet enrichment
New function extracts earning patterns (cashback %, points, dollar/percent off, miles) from search result title+snippet via regex. `evaluateSearchResults()` uses it to enrich the `details` field: `"Carbone Deal — 30% off"` instead of just `"Carbone Deal"`.

### 5. 4 new platforms
- Groupon Dining (`groupon.com/dining`) — cashback platform
- LivingSocial (`livingsocial.com/deals`) — flash deal platform
- Infatuation (`theinfatuation.com`) — editorial/deals platform
- Eater (`eater.com`) — editorial/deals platform

---

## Trade-offs

- **inKind broader search:** May return more noise (non-inKind results mentioning "inkind"), but `domainFilter` catches those. Better than 0% hit rate.
- **Rakuten path filter:** `site:rakuten.com/dining` may be too restrictive if Rakuten changes URL structure. But it eliminates the false positive class completely.
- **Deal extraction regex:** Pattern-based — won't catch every deal format. Designed to be additive (enriches when found, harmless fallback when not).
- **4 new platforms:** More Brave API calls per search (10 → 14 batch queries). Mitigated by prefetch cache and 1-hour in-memory cache.

---

## Files Modified
- `lib/platforms.ts` — 4 new platforms, `skipSiteOperator` field, `"deals"` rewardType, Rakuten domainFilter
- `lib/checkers.ts` — `extractDealDetails()`, `skipSiteOperator` logic in `batchSearch()`, enriched details in `evaluateSearchResults()`
- `lib/__tests__/checkers.test.ts` — 45 new tests (80 → 125, all passing)

---

# Decision: Data Enrichment — Cross-Reference Coverage Analysis

**Author:** Redfoot (Platform SME)  
**Date:** 2026-05-06  
**Status:** Implemented

---

## Coverage Summary

| Platform | Unique Restaurants | Dump Date |
|----------|-------------------|-----------|
| Bilt Rewards | 1,787 | 2026-05-06 |
| Rewards Network | 1,705 | 2026-05-06 |
| Upside | 170 | 2026-05-06 |
| Blackbird | 50 (Denver-only) | 2026-05-06 |
| **True Unique Total** | **2,370** | — |
| Raw (with dupes) | 4,041 | — |

The 4,041 headline includes ~1,671 duplicates across platforms. **True unique NYC coverage is 2,370 distinct restaurants**.

---

## Key Findings

### Pairwise Overlap
- **Bilt ∩ Rewards Network:** 1,209 restaurants (70.9% of smaller set) — largest overlap
- **Bilt ∩ Upside:** 124 restaurants (72.9% of Upside)
- **Rewards Network ∩ Upside:** 107 restaurants (62.9% of Upside)
- **Bilt/RN/Upside ∩ Blackbird:** 0 overlap (Blackbird is Denver-focused)

### Exclusivity Breakdown
- **Bilt-only:** 552 restaurants
- **RN-only:** 487 restaurants
- **Upside-only:** 37 restaurants
- **On 2+ platforms:** 1,244 restaurants
- **On 3+ platforms (Bilt+RN+Upside):** 98 restaurants

---

## Top-500 List Build

Created `scripts/build-top-500.ts` to cross-reference and score restaurants:
- **Scoring:** Multi-platform presence (10pts/platform), existing list membership (25pts), Bilt+RN agreement (5pts), triple-platform bonus (15pts)
- **Composition:** 483 newly added multi-platform matches + 17 existing curated restaurants = 500 total
- **Note:** Only 17 of original 150 curated appear in API dumps; 133 are high-end venues (Carbone, Le Bernardin, Per Se) without cashback platforms

---

## Recommendations

### 1. Two-Tier Popular Lists
- **Showcase tier:** 150 well-known names (marketing, breadth, demo searches)
- **Pre-cache tier:** 500 deal-confirmed restaurants (instant results for high-probability queries)

### 2. Refresh Cadence
Weekly API dumps + top-500 rebuild via `dump-api-data.ts` and `build-top-500.ts`.

### 3. Accurate Counts
Don't claim "4,041 restaurants" — true unique is ~2,370 (even less for NYC-focused: ~2,200 excluding Blackbird).

### 4. Upside Value
Only 37 unique restaurants, but 72.9% Bilt overlap means these are mainstream venues where users stack discounts.

---

## Files Created/Modified
- `scripts/build-top-500.ts` — Cross-reference scoring script
- `data/popular-restaurants.ts` — Expanded to 500 restaurants
- `data/cross-ref-analysis.json` — Raw analysis data

---

# Decision: Neighborhood Browse API — Data Source & Caching Strategy

**Author:** Fenster (Backend Dev)  
**Date:** 2026-05-07  
**Status:** Implemented

---

## Context

Built GET `/api/browse` endpoint to serve restaurant-by-neighborhood data for the P0 Browse feature (commit 3864cb4).

---

## Decisions Made

### 1. Read from Dump JSONs, Not Live APIs
- Browse endpoint reads `bilt-nyc-restaurants.json`, `rewards-network-nyc-restaurants.json`, and `upside-nyc-restaurants.json` at startup
- **Trade-off:** Data freshness = last dump run; **Benefit:** Zero API load, instant responses

### 2. In-Memory Cache with 5-Min TTL
- Index rebuilt from disk every 5 minutes
- **Trade-off:** Stale window during dump updates; **Benefit:** Balances freshness + performance

### 3. Zip-Based Neighborhood Mapping
- Static zip → neighborhood map (80+ entries: Manhattan, Brooklyn, Queens, Bronx, Staten Island)
- **Trade-off:** NYC-only, manual maintenance when expanding; **Benefit:** Deterministic, no geocoding API dependency

### 4. Best Deal Ranking: Tiered, Not Scored
- Replaced `api=100 + web_search=50 + details.length` with explicit tiers
- Tier order: API+rates > API > web+deals > web
- **Benefit:** More predictable, easier to reason about

---

## Impact

- **Frontend:** `BestDeal` interface updated with optional `savingsEstimate` field — non-breaking change
- **Browse endpoint:** Ready for frontend consumption at `/api/browse` with `?neighborhood=slug` filter

---

## Implementation Files

- `app/api/browse/route.ts` — 441 lines, handles neighborhood mapping + filtering

---

# Decision: Best Deal Scoring & Browse Page Layout

**Author:** Hockney (Frontend Dev)  
**Date:** 2026-05-07  
**Status:** Implemented

---

## Context

Shipped P0 features: Best Deal Summary Card + Neighborhood Browse page (commit 4ebbbc6).

---

## Decisions Made

### 1. Best Deal Scoring (Client-Side Placeholder)
- Scoring: `API method = 100 points`, `web_search = 50`, `+ details string length (capped 80)`
- Status: Placeholder until Fenster's server-side `findBestDeal()` fully replaces this
- **Benefit:** Interface designed to be forward-compatible — no breaking changes when upgraded

### 2. Browse Page Uses Wider Max-Width
- Uses `max-w-4xl` instead of site's standard `max-w-2xl`
- Reason: 3-column grid needs room
- **Rationale:** Search is narrow/focused; Browse is exploratory/wide

### 3. Platform Color Mapping Is Client-Side
- `PLATFORM_COLORS` hardcoded in browse page
- Maps platform name → badge color
- **Trade-off:** If platforms added/renamed, map must update manually; **Benefit:** No schema extension needed

---

## UX Details

- Best Deal card animates in with spring scale-up animation (`best-deal-in` keyframe)
- Responsive grid: 3 columns (desktop) → 2 (tablet) → 1 (mobile)
- Expandable neighborhood cards reduce clutter on initial load
- Full error/loading/empty states

---

## Implementation Files

- `components/BestDealCard.tsx` — 61 lines
- `app/browse/page.tsx` — 258 lines
- `lib/best-deal.ts` — 83 lines
- Updates: `app/globals.css`, `components/Nav.tsx`, `components/SearchResults.tsx`

---

### 2026-05-01T23:51Z: User directive — Nea manual data collection
**By:** Shari Paltrowitz (via Copilot)
**What:** Shari will manually collect Nea restaurant names from the iOS app and provide them for a static `checkNea()` integration. This is a manual action item — not automated.
**Why:** Nea has no API or web directory. User-reported restaurant names are the only path to integration. No TOS concerns with sharing what you see in the app.

**Action:** Shari to paste Nea restaurant list when ready → Fenster builds static `checkNea()` checker with "Last verified by user" timestamp.
### 2026-05-03T19:35Z: User directive — NYC only for pilot
**By:** Shari Paltrowitz (via Copilot)
**What:** Focus on NYC only for this pilot. No national expansion yet.
**Why:** User request — keeps scope tight for launch. Platforms like Nea (NYC-only) and Upside (NYC bounding box) already align. Bilt and Rewards Network have national data but we'll filter/present NYC results only.
### 2026-05-06T18:18Z: User directive — Skip Nea, pursue partnership
**By:** Shari Paltrowitz (via Copilot)
**What:** Skip Nea integration for now. Focus on shipping with what we have. To get Nea integrated, Shari will reach out directly through her Nea account to propose a partnership/API access. Needs a pitch explaining the value to Nea.
**Why:** No technical path to Nea data without partnership. Shari wants to approach as a user proposing mutual benefit.
### 2026-05-06T19:27:00Z: User directive
**By:** Shari Paltrowitz (via Copilot)
**What:** NYC Restaurant Week (happens 2x/year) is a P2/P3 platform opportunity. Restaurants are posted at https://www.nyctourism.com/eat-and-drink/#browse — we can scrape that and add a specific Restaurant Week search with lunch/dinner/both options, plus weekday-only vs weekday+weekend filters.
**Why:** User request — captured for team memory and product backlog
# Decision: Search Quality Improvements

**Author:** Fenster (Backend Dev)
**Date:** 2025-07-14

## Context
Audit of search quality across all platforms revealed several bugs and improvement opportunities affecting result accuracy.

## Changes

### 1. Word-boundary matching for short names
Short restaurant names (≤3 chars) now require word-boundary matches instead of substring inclusion. Prevents "Bo" matching "robot" and "Odo" matching "odometer".

### 2. "The" prefix handling
`matchesRestaurant()` now strips "The" prefix before matching, so "The Smith" matches text containing just "Smith". Previously missed these restaurants entirely.

### 3. Empty/Unicode name guard
Names that normalize to empty string (pure Unicode, empty input) no longer match everything. Returns `false` immediately.

### 4. Bilt API NYC filtering
All 2,262 national Bilt restaurants are now filtered server-side to NYC-area only (state=NY, NYC cities/boroughs, NYC zip prefixes). Prevents false positives from same-name restaurants in other cities.

### 5. Rewards Network per-query caching
Fixed critical bug: cache was global (single entry) instead of per-query. Searching "Carbone" then "Tatiana" would return Carbone's results for both. Now uses a Map keyed by normalized query string.

### 6. Rewards Network special char handling
API queries now strip apostrophes and diacritics before sending (e.g., "L'Artusi" → "LArtusi") to improve match rates.

### 7. Title separator logic fix
`titleMatchesRestaurant()` separator splitting now operates on pre-normalized text. Previously, `norm()` stripped separator characters before the split, making the separator logic dead code.

## Trade-offs
- Stricter matching may miss rare edge cases where a restaurant name appears only as a substring (acceptable — false negatives are much less harmful than false positives)
- Bilt NYC filter uses address heuristics — may miss restaurants with unusual address formats (fallback: include if no geo data)
- Rewards Network Map cache uses slightly more memory than single-entry cache (negligible for expected query volume)
# EatDiscounted Strategic Product Roadmap
**By:** Kobayashi, PM | **Date:** 2026-04-30 | **Status:** Strategic Recommendation

---

## Executive Summary

EatDiscounted has reached a critical inflection point: we've gone from 3 platforms to 4 direct API integrations + web search coverage of 12+ total programs (including Rewards Network's 8 airline/hotel partnerships). **The next phase isn't more integrations—it's converting a single-use lookup tool into a sticky discovery and monitoring product.**

Single largest blocker to retention: users search once, get results, leave. No reason to return.

**Recommendation: Ship permalinks immediately (P0), then attack the retention problem with saved restaurants + alerts (P1). Launch "Deals Near Me" in Q3.**

---

## Part 1: SHIP NOW (Next Sprint)

### 1.1 Drop Seated (Non-Negotiable)
- **Status:** Defunct. Pivoted to concert notifications.
- **Action:** Remove from platform list, API configuration, UI. Today.
- **Code impact:** Small. `platforms.ts`, search logic, results display.

### 1.2 Launch Restaurant Permalinks: `/r/{restaurant-slug}`
- **Why now:** SEO + shareability unlock growth. Results are currently ephemeral and unshareable.
- **Implementation:** 
  - Add `id` to restaurants table (if not present)
  - Implement slug generation (URL-safe version of name, dedupe by neighborhood)
  - Create `/r/[slug]` page that re-runs the search and renders results persistently
  - Results include platform links + timestamp
- **Effort:** 2 sessions (1 backend, 1 frontend + deployment)
- **Value:** Enables food Twitter/Reddit sharing. "Just found Carbone on Upside—check it out" becomes a single shareable link, not a screenshot.
- **SEO bonus:** Organic search traffic. "Carbone Upside" queries will land on our `/r/carbone` page with structured data.

### 1.3 Upgrade Results UI with Rewards Network Data
**Current state:** We pull earning rates + airline programs from Rewards Network. UI doesn't expose them well.

**Changes:**
- Show earning rate prominently on each Rewards Network result (e.g., "50 Hilton Honors pts/$")
- Add airline/hotel icon badges so users instantly see which program they care about
- Display cuisine + designations if available (fine dining, casual, etc.)
- Highlight when a restaurant appears on multiple programs (cross-sell opportunity)

**Effort:** 1 session (UI component refactor)
**Value:** Makes Rewards Network data explorable. Reveals that users can earn 3x across different programs at the same restaurant.

### 1.4 UX Polish: Mobile Optimization + Performance
- Collapse "not found" cards on mobile post-stream (already implemented per decisions log, verify deployed)
- Ensure sidebar doesn't obstruct results on small screens
- Test on iPhone 14/Android common devices

**Effort:** 0.5 sessions
**Blocker check:** Does current design work on mobile? If not, this is P0.

---

## Part 2: MEDIUM-TERM (Next 2–4 Sessions)

### 2.1 Restaurant Permalinks Enhancement: "My Stack"
**Problem:** User searches "Carbone," sees it's on Upside + Bilt + Rewards Network. Doesn't know which program they use at which restaurant.

**Solution:** 
- Add "Save to My Stack" button (requires user account)
- Track: restaurant + platforms user uses there
- Displays on `/r/carbone` for logged-in users: "You've saved Carbone for Upside & Rewards Network"

**Effort:** 2–3 sessions (auth, DB schema, UI)
**Why this matters:** Converts single-use lookup to recurring asset. User returns to check if their favorite spots got new deals.

### 2.2 Email/Push Alerts (Enable Monitoring)
**Trigger:** New platform found for saved restaurant. E.g., "Carbone just appeared on inKind!"

**Implementation:**
- Async job that re-checks saved restaurants daily
- Emit alerts only if platform changed (not duplicates)
- Let users choose: email, in-app, off

**Effort:** 2–3 sessions (job queue, notification service, user preferences)
**Why:** Converts "single lookup" → "monitoring tool." Major retention lever.

### 2.3 Restaurant.com Integration
**Data:** 551+ NYC restaurants. Discount certificates (25–50% off typically).

**Why this matters:** Different deal type than cashback platforms. Complements Blackbird/Upside/Bilt.

**Implementation:** 
- Scrape `restaurant.com/nyc` listings + links
- Async job to verify listings still active (simple HTTP check)
- Add to results with "Discount certificate: $50 off $100" callout

**Effort:** 1–2 sessions (parser + verification job)
**Timeline:** After "My Stack" is live (need user account infrastructure)
**Risk:** Lower confidence than API integrations (scraping), but deterministic + low crawl load.

### 2.4 inKind Account-Based Discovery
**Current:** Web search, medium reliability.
**Opportunity:** Free inKind account could expose their full NYC catalog via login + reverse-engineering API endpoints.

**Action:** 
- Create inKind account
- Audit their web app for REST endpoints
- If exposed, build full-catalog scraper
- Compare results to Brave Search coverage

**Effort:** 0.5 sessions (research) + 1 session (if API found)
**Alternative:** Add to partnership outreach (see Part 3) with formal API request.

### 2.5 Rakuten Deeper Integration
**Current:** App-only platform, Brave Search coverage is "unreliable."

**Action:** 
- Verify app-only status (no public web directory?)
- If web directory exists, set up recurring scraper
- If app-only, add to partnership outreach

**Effort:** 0.5 sessions research
**Why:** Rakuten is nationally recognized brand. Even partial NYC coverage is valuable.

---

## Part 3: PRODUCT POSITIONING & MARKETING

### 3.1 Value Proposition Reframe
**Current:** "Search dining discounts across platforms."
**Reality:** You can now earn 3x more points/cashback by knowing which programs cover each restaurant.

**New positioning:**
> **EatDiscounted: Your dining rewards multiplier.** Find all programs a restaurant's on. Earn 3x more points.

**Sub-message for each cohort:**
- **Rewards enthusiasts:** "Carbone's on Upside AND Bilt AND United dining program? We'll show you which earns more."
- **Budget diners:** "Too Good To Go surprise bags + Restaurant.com certificates + cashback stacking."
- **Casual users:** "Quick lookup. Never overspend on dining again."

### 3.2 Target User Profile
**Primary:** NYC power users active on 3+ platforms.
- Monthly dining budget: $300–800
- Actively optimize rewards (check multiple apps before dining)
- Share recs on food Twitter/Reddit

**Secondary:** Budget-conscious value seekers.
- Use TGTG for surprise bags
- Apply Restaurant.com certificates
- Look for 2–3 discount layers per meal

**Tertiary:** Frequent travelers.
- Loyalty card holders (AA, United, Hilton, Marriott, Hyatt, JetBlue, Choice)
- Want to maximize airline miles at dining
- EatDiscounted tells them: "Your airline dining program covers this restaurant"

### 3.3 Distribution Strategy (No Paid Ads)
1. **Food Twitter/Reddit seeding:**
   - Share posts: "Just discovered Carbone's on 5 programs. Here's how to earn 3x points."
   - Target: r/FoodNYC, r/AskNYC, food Twitter lists
   - Partner food blogs/influencers with referral links

2. **Rewards communities:**
   - PointsHacks, FlyerTalk, airline Discord groups
   - "United card holders: your dining program covers these 500 NYC restaurants"

3. **Restaurant permalinks for SEO:**
   - "Carbone cashback" → lands on `/r/carbone` with all platforms
   - Organic search traffic

4. **Grassroots expansion:**
   - Ask users to share `/r/{restaurant}` links in reviews, Reddit posts
   - Each link is a backlink + SEO signal

---

## Part 4: PARTNERSHIP OUTREACH (Priority Order)

### 4.1 Outreach Sequence
**Tier 1 (START HERE):**
1. **Nea** (hello@neaapp.ai) — Highest ROI. 200+ NYC restaurants, auto-cashback, iOS-only pain point. Partnership fills gap for them + us.
2. **inKind** — Mid-size, API feasibility unknown. Formal request: "Can we access your NYC directory as partners?"

**Tier 2 (PARALLEL):**
3. **Rakuten Dining** — Check web directory status first; if app-only, formal API request.
4. **Too Good To Go** — Confirm web directory is scrapeable without ToS violations (likely OK).

**Tier 3 (ONCE TIER 1 CLOSES):**
5. **Blackbird** — Already integrated, but formalize partnership (affiliate revenue sharing, co-marketing)

### 4.2 Pitch Template
**Subject line:** "EatDiscounted: Free user acquisition for [Platform]"

**Body:**
- EatDiscounted is a NYC dining discovery app. We aggregate 4+ cashback platforms + search 12+ programs.
- We found [N] of your restaurants through [method: sitemap/manual search/inferred].
- Proposition: Full directory access (API or feed) → 1000s of users will discover and use your platform.
- We're not competitors; we're free distribution. Users click through to earn with you.
- Timeline: API integration = 2–3 weeks.

**For Nea specifically:**
- "Auto-cashback via Venmo is exactly what busy diners want. We have 500+ power users who'd use this. Let's talk partnership."

---

## Part 5: FEATURES TO DROP/DEPRIORITIZE

### 5.1 Drop: Seated
- **Status:** Defunct (confirmed).
- **Action:** Remove from codebase today.

### 5.2 Deprioritize: OpenTable/Resy APIs
- **Why:** Reservation platforms, not cashback. Out of scope. Explicitly decided to skip.

### 5.3 Monitor: Brave Search Reliability
- **Current state:** Fallback for platforms without APIs (inKind, TGTG, Rakuten).
- **Issue:** Inconsistent. Some platforms require account login to display full results.
- **Action:** If web search reliability drops, move faster on partnership outreach (Tier 2).

---

## Part 6: TECHNICAL DEBT & Foundation

### 6.1 Keep Doing
- In-memory caching (1hr search results) works. Migrate to Redis only if multi-instance serverless.
- Rate limiting (5/min search, 10/min report) prevents abuse. Current setup fine for single-machine deployment.
- SQLite + Fly.io is production-ready. No migration pressure.

### 6.2 Before Multi-Instance Scaling
If revenue justifies auto-scaling:
- Migrate in-memory cache → Upstash Redis
- Persistent DB → Turso (SQLite serverless) or Supabase
- Current single-machine Fly.io saves $0–50/mo. Not a blocker until 10K+ daily queries.

---

## Timeline & Commitment

| Phase | What | When | Owner | Effort |
|-------|------|------|-------|--------|
| **NOW** | Drop Seated | Today | Dev | 0.5h |
| **P0** | Permalinks `/r/{slug}` | Sprint 1 (2 sessions) | Frontend + Backend | 2 sessions |
| **P1** | Rewards Network UI polish | Sprint 1 (parallel) | Frontend | 1 session |
| **P1** | My Stack (saved restaurants) | Sprint 2 (3 sessions) | Full team | 3 sessions |
| **P2** | Email alerts | Sprint 3 (2–3 sessions) | Backend | 2 sessions |
| **P2** | Restaurant.com scraper | Sprint 3 (1–2 sessions) | Backend | 1 session |
| **P3** | inKind API audit | Async (0.5h) | Dev | 0.5 session |
| **P3** | Deals Near Me (browse by neighborhood) | Sprint 4–5 | Full team | 4+ sessions |
| **ASYNC** | Nea partnership outreach | Immediately (parallel) | PM | Ongoing |

---

## Key Assumptions & Constraints

1. **Retention is the #1 problem.** Single-use lookup tool has ceiling on growth. Permalinks + My Stack + alerts convert to monitoring tool.
2. **NYC-focused for now.** All integrations + expansion prioritize NYC first. National expansion = separate decision.
3. **No paid acquisition.** Bootstrap distribution via organic (SEO, food Twitter, Reddit). Organic cost-of-growth is $0.
4. **Affiliate revenue model.** Monetization via Blackbird/Bilt/inKind referral links. Passive, $0 UX cost. Revisit if CAC > LTV.
5. **Partnership outreach is parallel track.** Doesn't block product development. Shari or designated BD lead should start Nea/inKind contact this week.

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Scraping reliability (Restaurant.com, inKind) | Medium | Medium | Have fallback to Brave Search; monitor via alerts. |
| Nea partnership rejection | Medium | Low | inKind + Rakuten are Plan B. Scraping covers MVP. |
| Retention still low despite permalinks | Low | High | Move faster to My Stack + alerts. Consider UX tweak (reminder notifications). |
| Competitor (e.g., Amex, Chase) launches similar | Low | Medium | Our differentiator: app-only platforms (Nea) + real-time integration. Keep shipping fast. |
| Google CSE API disabled mid-sprint | Low | Medium | DDG scraping fallback already in place. Works (slower). |

---

## Success Metrics

**Short-term (8 weeks):**
- ✅ Seated removed
- ✅ Permalinks live + 100+ NYC restaurants have persistent URLs
- ✅ Rewards Network data exposed in UI
- ✅ Nea outreach initiated (response rate = success)

**Medium-term (4 months):**
- 🎯 My Stack adoption: 10%+ of users save ≥1 restaurant
- 🎯 Email alerts: 5% daily open rate
- 🎯 Return rate: 20% of week-1 users search again within 2 weeks
- 🎯 Average session value: +30% revenue/user via affiliate clicks

**Long-term (6–12 months):**
- 🎯 Organic traffic: 40% of daily users from SEO/social
- 🎯 Partnership signed: Nea or equivalent (gives us 200+ app-only restaurants)
- 🎯 NYC food Twitter mentions: 50+ per month
- 🎯 Break-even on operational costs (Fly.io + API costs)

---

## Decision Points for Shari

1. **Approve Seated removal?** YES / NO
2. **Approve Permalinks as P0 (vs. other ideas)?** YES / NO
3. **Who owns partnership outreach?** Shari / Delegated to [NAME]
4. **Proceed with Nea contact this week?** YES / NO / WAITING FOR [REASON]
5. **Budget for Restaurant.com scraper (Risk: ToS, Maintenance)?** PROCEED / WAIT / SKIP

---

## Appendix: Why This Matters

EatDiscounted has unique strengths:
- **4 direct API integrations** (Blackbird, Upside, Bilt, Rewards Network) = real-time, high-confidence data
- **12+ programs covered** (including 8 airline/hotel dining programs via Rewards Network)
- **NYC-focused** = defensible niche vs. national competitors
- **No competitors in this exact space** = first-mover advantage in dining rewards aggregation

The gap: **we're a lookup tool, not a discovery tool.** Users don't return because there's no reason to.

Fixing this (permalinks → My Stack → alerts → Deals Near Me) turns us into a **recurring asset** that users check before dining.

This is the foundation for a defensible product, network effects (saved restaurants feed social sharing), and affiliate revenue that scales with engagement, not ads.

Ship fast. Keep shipping. The next 3 sprints will determine if this becomes a $100K/year side business or a $1M+ platform.

---

**Roadmap Owner:** Kobayashi, PM  
**Last Updated:** 2026-04-30  
**Next Review:** After Sprint 1 (Seated removal + Permalinks MVP)
# Site Redesign: From Search Results to Deal Intelligence
**Author:** Verbal (Designer) | **Date:** 2026-05-01 | **Status:** Proposal

---

## VISION

**EatDiscounted is no longer a search tool.** It's a deal intelligence engine that checks 12+ programs (4 with rich API data, 8 via Rewards Network) and shows users *exactly what they'll earn at any restaurant*.

The current UI treats all platforms the same—whether we have "15% cashback" (Upside) or just a "found it via web search" (TGTG). This is a massive UX miss. The redesign reorganizes results into **tiers of confidence** and creates **earning power comparisons** so users can actually decide where to eat based on rewards.

---

## CORE REDESIGN PRINCIPLES

1. **Data → Hierarchy:** API results with earnings data get premium real estate. Web search "found it" results are secondary. Unknown results collapsed.

2. **Earning transparency:** Show exact earning rates (5x miles, 15% cashback, 3x points) upfront. No "view deal" clicks needed to understand value.

3. **Comparison without friction:** Stack rewards naturally ("Use Bilt card + AA miles = double dip"). Show best deal at glance. Help users pick their app.

4. **Confidence signals:** Distinguish between verified API data and web search guesses. Make it clear when we don't know the exact terms.

5. **Mobile-first UI:** Results should scan in <3 seconds on phone. Earnings rates should be legible at thumb-height.

---

## 1. INFORMATION ARCHITECTURE

### Current Problem
- All 8 platforms get individual cards, whether they return rich data or just a binary found/not-found.
- Rewards Network (8 programs!) shown as one card. Users don't see the scope.
- No visual distinction between "we have exact earning rates" vs. "web search found it mentioned once."
- "Best deal" requires mental math across 8 cards.

### Proposed Structure: Three-Tier Results

#### **TIER 1: PREMIUM API RESULTS** (Rich earning data, direct integration)
Shows when we have structured data from our 4 integrations:
- **Upside** (cashback %)
- **Bilt Rewards** (points multiplier, exclusive status)
- **Blackbird** (tiered $FLY points, personalized link)
- **Rewards Network** (airline/hotel multipliers across 8 programs)

**Each gets its own card.** Shows:
- Platform name + logo
- Primary earning metric (e.g. "15% cash back" or "5x United miles")
- Secondary details (cuisine, designation, daily rates if available)
- Direct link to deal
- "Verified API data" badge

**Card design:**
```
╔════════════════════════════════════════════════╗
║ ✅ Upside                  💵 Verified API data  ║
║ 15% cash back                                    ║
║ Restaurant: Carbone | Italian | NYC             ║
║ [View offer →]                                   ║
╚════════════════════════════════════════════════╝

╔════════════════════════════════════════════════╗
║ ✅ Bilt Rewards            ⭐ Verified API data  ║
║ 5x points / $                                    ║
║ Exclusive to Carbone  | Fine dining             ║
║ (or 11x on Rent Day w/ Bilt card)               ║
║ Transfers to: AA • United • Hilton • 4 others   ║
║ [View on Bilt →]                                ║
╚════════════════════════════════════════════════╝

╔════════════════════════════════════════════════╗
║ ✅ Rewards Network         ⭐ Verified API data  ║
║ Up to 5x miles/$  (varies by program)           ║
║ Powers: American Airlines • United • Hilton     ║
║         Marriott • Delta • Southwest • TWA • JetBlue
║ [View all rates →]                              ║
╚════════════════════════════════════════════════╝
```

#### **TIER 2: WEB SEARCH RESULTS** (Unverified, secondary confidence)
Shows when web search found a mention but we have no API data:
- **inKind, TGTG, Rakuten** (basic found/not-found)
- **Seated** (deprecated, marked as such)

**Collapsed into one compact row during stream.** After stream complete, shows single-line pills:
```
🔗 Found via web search: inKind • TGTG • Rakuten
   ⓘ We checked these platforms but don't have real-time offers.
   [Check each app →]
```

**If clicked, expands to:**
```
╔════════════════════════════════════════════════╗
║ 🔍 inKind                  Web search (unverified) ║
║ Restaurant listed on platform.                   ║
║ Actual credit amount depends on current offers.  ║
║ [Open app →]  [Report accurate info →]          ║
╚════════════════════════════════════════════════╝
```

#### **TIER 3: NOT FOUND**
After streaming complete, collapse into single line at bottom:
```
❌ Not found: Seated • Blackbird • [+2 more]
```

### Rewards Network: Special Treatment

**We have 8 programs through Rewards Network—this is a *feature*, not a bug.**

Show as **one premium card that expands to reveal depth:**

```
╔════════════════════════════════════════════════╗
║ ✅ Rewards Network         ⭐ Verified API data  ║
║ Up to 5x miles/$  (airline/hotel programs)      ║
║                                                  ║
║ Earning rates vary by program:                  ║
║ ┌────────────────────────────────────────────┐ ║
║ │ 🛫 American Airlines    5x miles/$         │ ║
║ │ 🛫 United Airlines       4x miles/$         │ ║
║ │ 🏨 Hilton Hotels         5x points/$        │ ║
║ │ 🏨 Marriott Bonvoy       3x points/$        │ ║
║ │ 🛫 Delta Airlines        3x miles/$         │ ║
║ │ 🛫 Southwest Airlines    5x points/$        │ ║
║ │ 🛫 TWA (JetBlue)         5x miles/$         │ ║
║ │ 🛫 JetBlue                4x TrueBlue/$     │ ║
║ └────────────────────────────────────────────┘ ║
║ [View all programs →]                           ║
╚════════════════════════════════════════════════╝
```

**On mobile:** Show top 3 programs by earning rate + expandable button.

---

## 2. RESULT CARD REDESIGN

### Premium API Results (Tier 1)

**Goal:** Show earning potential in one glance. No click needed to see value.

**Layout:**
```
LEFT: Status icon (✅ found) + platform name
MIDDLE: Primary earning metric (large, bold)
RIGHT: Secondary context (cuisine, exclusivity, link)
```

**Details to show per platform:**

#### **Upside**
```
Icon: 💵
Primary: "15% cash back" (exact rate from API)
Secondary: "Personalized by user" (gray subtext)
Link: Direct to deal or Upside profile
```

#### **Bilt Rewards**
```
Icon: ⭐
Primary: "5x points/$" (base rate)
Secondary: "Exclusive to Carbone | Fine Dining"
Tertiary: "(11x on Rent Day w/ Bilt card)"
Programs: "Transfers to AA, United, Hilton, Marriott, Delta, Southwest, TWA, JetBlue"
Link: Direct to Bilt deal page
```

#### **Blackbird**
```
Icon: ⭐
Primary: "$FLY points (tiered)"
Secondary: "Scales with visit frequency" (if available)
Link: Direct to Blackbird profile
```

#### **Rewards Network**
```
Icon: ⭐
Primary: "Up to 5x miles/$"
Secondary: "Program rates vary" + expandable table
Tertiary: All 8 airline/hotel logos with their rates
Link: To program-specific earning page
```

#### **Web Search Results (Tier 2)**
```
Icon: 🔗
Status: "Found via web search"
Subtext: "Real-time offers may differ"
Link: "Check app →"
```

---

### Visual Hierarchy & Color

**Tier 1 (API results):**
- Border: Subtle green/gold (success color, not aggressive)
- Background: Slightly raised (white/surface-raised)
- Badge: "✅ Verified API data" in smaller font
- Hover: Lift shadow, brighten border

**Tier 2 (Web search):**
- Border: Gray, thin
- Background: Light gray surface
- Badge: "🔗 Web search (unverified)" 
- Smaller padding/font size than Tier 1

**Tier 3 (Not found):**
- Single collapsed row at bottom
- Gray pill style, very low visual weight
- Expandable if user clicks

---

## 3. DEAL COMPARISON VIEW (NEW FEATURE)

### Problem
User sees 4-5 premium results but has no way to compare. Should they use Bilt or the Rewards Network? What if they have both cards?

### Solution: "Best Deal Breakdown" Card

**Appears after stream completes IF 2+ Tier 1 results found.**

```
╔════════════════════════════════════════════════╗
║ 💡 YOUR BEST DEALS AT CARBONE                  ║
├────────────────────────────────────────────────┤
║ Option 1: Bilt Card (Recommended)              ║
║   ⭐ 5x points = ~$5 value per $100 spent      ║
║   Transfer to your airline                      ║
║                                                 ║
║ Option 2: Stack rewards (Best ROI)             ║
║   💵 15% Upside cashback                       ║
║   ⭐ PLUS 5x Bilt points                       ║
║   = ~$20 value per $100 spent                  ║
║   ⚠️ Requires both apps + both cards           ║
║                                                 ║
║ Option 3: Rewards Network (AA member)          ║
║   🛫 5x United miles                           ║
║   = ~$4 value per $100 spent                   ║
║                                                 ║
║ → Share this restaurant with friends            ║
╚════════════════════════════════════════════════╝
```

**How it works:**
1. For each Tier 1 result, calculate earning value (using standard conversions: 1 point = $0.01, 1 mile = $0.01, etc.)
2. Sort by ROI descending
3. Show stack combinations (Upside + Bilt, etc.)
4. Flag which combinations have card conflicts (via existing conflict logic)

**Copy strategy:**
- Lead with simplest option (single card)
- Show "stack rewards" if synergy exists
- Recommend best ROI but acknowledge it requires two cards
- Make card conflicts transparent ("Bilt + Upside both need same physical card? Link different cards.")

---

## 4. HOMEPAGE REDESIGN

### Current Problems
- Hero says "Never miss a deal where you're already eating" (old positioning)
- No indication we cover 12+ programs
- No city selector (NYC-focused but Rewards Network national)
- "Popular searches" are random and don't showcase value

### New Homepage

#### **Hero Section**
```
╔════════════════════════════════════════════════╗
║                                                 ║
║  EatDiscounted                                  ║
║                                                 ║
║  See exactly what you'll earn at any restaurant║
║  across 12 platforms + 8 airline programs.     ║
║                                                 ║
║  [Search]                                      ║
║                                                 ║
╚════════════════════════════════════════════════╝
```

**Copy change rationale:**
- "Eat cheaper" → "Earn more points/miles/cash"
- Emphasize breadth (12+ platforms, 8 airlines)
- Speak to actual UX: exact earning rates, comparisons

#### **City Selector** (Optional, phase 2)
- NYC selected by default (our focus)
- Checkbox for national platforms (Rewards Network, Rakuten, inKind)
- "Viewing: NYC + national platforms"
- Cookie/localStorage persists choice

#### **Featured Deals / Trending Restaurants** (Phase 2)
If we have enough transaction data, show:
- "Top rewards restaurants this week"
- Example: "Carbone: avg 5x miles via Rewards Network"
- Link to restaurant permalink

#### **Educational Section**
```
How It Works:
┌─────────────────┐
│ 1. Search       │ → 2. We check 12 platforms → 3. See earning rates → 4. Pick your app
└─────────────────┘

Why we're different:
• Real API data (not web search) for 4 major platforms
• Shows exact earning rates — no hidden surprises
• Compares rewards across airlines + hotels
• Works on all devices, no signups needed
```

---

## 5. MOBILE CONSIDERATIONS

### Challenges
- 8 platform cards = vertical scroll hell on phone
- Earning rates need to be skimmable at thumb height
- "Expand" actions must be obvious

### Solutions

#### **Responsive Card Layout**
- On mobile (<768px): Stack Tier 1 cards vertically, keep text/earning rate legible
- On desktop: Option to grid 2-3 cards side-by-side (explore later)

#### **Card Simplification on Mobile**
- Remove secondary context (cuisine, exclusivity) if space tight
- Show earning rate in large font always
- Defer detailed breakdowns to tap/expand
- "Rewards Network" card shows top 3 programs by default, "View all 8 →" to expand

#### **Tier 2 Collapsed by Default**
- Web search results start collapsed to single line
- Tap to expand individual cards
- Reduces scroll on mobile by ~60%

#### **Best Deal Breakdown**
- On mobile: Show as sticky card that slides up from bottom
- Dismissible ("Got it")
- Tap to expand full comparison

#### **Search Input**
- Keep simple, large touch target
- Auto-focus on landing
- Instant results streaming (existing good UX)

---

## 6. WHAT TO REMOVE

### **Seated (Defunct Platform)**
- **Action:** Remove from PLATFORMS array entirely
- **Reasoning:** Platform is defunct. Card conflict warning references it but no current integration.
- **Impact:** Reduces noise on `/platforms` page, removes confusion
- **Code:** Delete Seated entry from `lib/platforms.ts`, remove from conflict detection

### **Card Conflict Warnings (Simplify)**
- **Current:** Separate conflict warning card in results
- **New:** Merge into individual result cards ("⚠️ Requires different card than Upside")
- **Reasoning:** Users see warning in context of decision, not separately
- **Impact:** Fewer visual elements, clearer cause-and-effect

### **"Unverified" Badge on Web Search** (If confusing)
- Keep it but make subtle (smaller font, gray)
- Reasoning: Users need to know "inKind found it" ≠ "verified API check"
- Don't remove—just deprioritize visually

---

## 7. INFORMATION ARCHITECTURE SUMMARY TABLE

| Scenario | UI Treatment | Confidence |
|----------|--------------|-----------|
| **Found on Upside/Bilt/Blackbird/Rewards Net** | Premium card (Tier 1), full earning rates | ✅ High (API verified) |
| **Found via web search (inKind, TGTG)** | Secondary card (Tier 2), "web search (unverified)" | ⚠️ Medium |
| **Not found on any platform** | Collapsed single line | ❌ None |
| **Conflict possible (Upside + Bilt)** | Inline warning within each card | ⚠️ User's decision |
| **Rewards Network (8 programs)** | One expandable card showing all 8 with rates | ✅ High (API verified) |

---

## 8. NEW FEATURES UNLOCKED BY REDESIGN

Once this architecture is in place:

### **Phase 1 (Small effort, high impact)**
- Restaurant permalinks (`/r/carbone`) with pre-filled results
- Shareable deal links ("Check out the 5x miles at Carbone")
- Email signature: "Best places to earn miles near me"

### **Phase 2 (Medium effort)**
- "My rewards programs" selector (AA member, Bilt cardholder) → personalized view
- Save restaurants + earning rates
- Browser extension: hover any restaurant, see deals

### **Phase 3 (Ambitious)**
- "Deals near me" neighborhood browse
- Community ratings ("I used Bilt here, got 5x confirmed")
- Integration with OpenTable to auto-fill restaurant name

---

## 9. WIREFRAME: SEARCH RESULTS PAGE (NEW DESIGN)

```
╔════════════════════════════════════════════════════════╗
║ EatDiscounted          [NY ▼]    [@]  [?]               ║
╠════════════════════════════════════════════════════════╣
║                                                         ║
║ [Search restaurants...        ] [Search]                ║
║                                                         ║
║ ┌───────────────────────────────────────────────────┐  ║
║ │ Results for "Carbone" — Found on 4 platforms     │  ║
║ └───────────────────────────────────────────────────┘  ║
║                                                         ║
║ ┌───────────────────────────────────────────────────┐  ║
║ │ ✅ Upside                                           │  ║
║ │    💵 15% cash back                                │  ║
║ │    Personalized by user • View on Upside →       │  ║
║ └───────────────────────────────────────────────────┘  ║
║                                                         ║
║ ┌───────────────────────────────────────────────────┐  ║
║ │ ✅ Bilt Rewards                                    │  ║
║ │    ⭐ 5x points/$                                  │  ║
║ │    Fine dining exclusive • 11x on Rent Day        │  ║
║ │    Transfers to 8 programs (AA, United, etc)    │  ║
║ │    View on Bilt →                                │  ║
║ └───────────────────────────────────────────────────┘  ║
║                                                         ║
║ ┌───────────────────────────────────────────────────┐  ║
║ │ ✅ Rewards Network       🛫 5x United miles/$     │  ║
║ │    (expandable to show all 8 programs)           │  ║
║ │    [View all rates →]                            │  ║
║ └───────────────────────────────────────────────────┘  ║
║                                                         ║
║ ┌───────────────────────────────────────────────────┐  ║
║ │ ✅ Blackbird                                       │  ║
║ │    ⭐ $FLY points (tiered)                        │  ║
║ │    View profile →                                │  ║
║ └───────────────────────────────────────────────────┘  ║
║                                                         ║
║ ┌───────────────────────────────────────────────────┐  ║
║ │ 💡 Best Deal: Use Upside + Bilt for ~$20 value  │  ║
║ │    (See breakdown →)                             │  ║
║ └───────────────────────────────────────────────────┘  ║
║                                                         ║
║ 🔗 Found via web search: inKind • TGTG              ║
║    [Check these apps →]                              ║
║                                                         ║
║ ❌ Not found: Rakuten • Seated • Nea                 ║
║                                                         ║
╚════════════════════════════════════════════════════════╝
```

---

## 10. PHASED ROLLOUT

### **Phase 0 (This sprint)**
- [x] Write this redesign proposal
- [ ] Create Figma mockups (high-fidelity)
- [ ] Review with Shari (get buy-in on information architecture)

### **Phase 1 (Implementation sprint)**
- [ ] Refactor SearchResults.tsx to organize by Tier 1/2/3
- [ ] Redesign ResultCard.tsx with earning rate prominence
- [ ] Add "Best Deal Breakdown" component
- [ ] Update homepage hero copy
- [ ] Remove Seated from PLATFORMS
- [ ] Test on mobile (iOS + Android)

### **Phase 2 (Post-launch)**
- [ ] Add city selector (hardcoded NY for now)
- [ ] Restaurant permalinks (`/r/carbone`)
- [ ] Share links + social preview
- [ ] Email/social growth campaign highlighting breadth (12+ platforms)

### **Phase 3 (Q2+)**
- [ ] "My rewards programs" personalization
- [ ] Saved restaurants + monitoring
- [ ] Deals near me (neighborhood browse)

---

## 11. SUCCESS METRICS

**This redesign is successful if:**

1. **Clarity:** New users understand the difference between API results (exact rates) and web search results (unverified) in <5 seconds.

2. **Engagement:** Users who find 2+ Tier 1 results spend time reading "Best Deal Breakdown" card (not bounce immediately).

3. **Conversion:** Users tap "View deal →" links for Tier 1 results at >40% rate (vs. current web search cards).

4. **Mobile:** Mobile scroll length reduced by ~40% (via Tier 2/3 collapse).

5. **Shareability:** Restaurant permalinks shared >100 times in first month (social validation).

---

## 12. DESIGN SYSTEM NOTES

### Colors & Typography

**Already in CSS custom properties (preserve existing):**
- `--color-success` (green) for "found" state
- `--color-warning` (amber) for "manual check"
- `--color-error` (red) for errors
- `--color-gold` for reward amounts
- `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`

**New additions (minimal):**
- `--color-tier1-border`: Subtle gold/success for API results
- `--color-tier2-text`: Gray for web search (unverified)
- Earning rates use `--color-gold` at larger font weight

### Spacing & Grid

- Keep existing gap-3 cards grid
- Increase padding on Tier 1 cards slightly (5→6 units) for visual separation
- Tier 2 cards same spacing, lighter styling
- Tier 3 collapsed row: padding 4, smaller font

### Responsive

- Desktop: 2-3 columns optional (explore later)
- Tablet (768px): 1 column, full width cards
- Mobile: 1 column, full width, compact text

---

## 13. TRADEOFFS & DECISIONS

| Decision | Why | Tradeoff |
|----------|-----|----------|
| Seated removed entirely | Defunct platform, confuses users | Some existing SEO/links break (minor) |
| Rewards Network as 1 expandable card | Breadth is feature, not clutter | Single card harder to scan than 8 separate ones (acceptable, adds "wow") |
| "Best Deal Breakdown" post-stream only | Requires full result set before comparing | Delay before showing comparison (3-5s wait, worth it) |
| Web search results collapsed by default | Reduces scroll fatigue | Less discoverability for inKind/TGTG (they're web search anyway) |
| No city selector in Phase 1 | NYC focus, Rewards Network already national | Users outside NYC see full result set (acceptable for beta) |
| Inline conflict warnings (not separate card) | Clearer cause-and-effect | Slightly more complex card component (acceptable) |

---

## 14. IMPLEMENTATION CHECKLIST

- [ ] Update `lib/platforms.ts`: Remove Seated entry, add `tier` field (1, 2, 3) to Platform interface
- [ ] Update `SearchResults.tsx`: Sort results into `tier1Found`, `tier2Found`, `tier3NotFound` arrays
- [ ] Update `ResultCard.tsx`: New props `tier`, `earning_rate`, `secondary_details`, `is_expanded`
- [ ] Create `BestDealBreakdown.tsx` component (calculate earning ROI, show stacks)
- [ ] Create `RewardsNetworkCard.tsx` sub-component (expandable table of 8 programs)
- [ ] Update `app/page.tsx` hero copy
- [ ] Remove conflict card component (logic moves inline to ResultCard)
- [ ] Test responsive design on mobile
- [ ] Update `/platforms` page (remove Seated)
- [ ] Update `/api/check` endpoint documentation (if needed)

---

## 15. COMMUNICATION PLAN

**Announce redesign to:**
- Team squad (this proposal)
- Shari for buy-in on IA (before design phase)
- Community (social posts) when live: *"We now show exact earning rates for 12+ platforms. See your rewards before you click."*

---

**NEXT STEP:** Shari reviews this proposal. If approved, proceed to high-fidelity Figma mockups before implementation.
# Claim App — Integration Investigation

**Date:** 2025-07-17
**Investigator:** Redfoot (Platform SME)
**Requested by:** Shari Paltrowitz
**Status:** Complete

---

## Executive Summary

Claim (claim.co) is a card-linked cashback app that was **recently acquired by Wonder Group** and is now operating inside **Grubhub/Seamless**. It's a legitimate, well-funded platform with known NYC restaurant partners. However, integration is effectively **blocked** — there is no public API, no web-based restaurant directory, and the product model (weekly curated "Drops") doesn't map well to our lookup-a-restaurant use case.

**Bottom line: Not feasible to integrate as a scrape/API source. Consider it informational-only or revisit if Grubhub exposes Claim data publicly.**

---

## 1. What Is Claim?

- **Website:** [claim.co](https://claim.co)
- **Type:** Card-linked cashback / rewards app
- **Mechanic:** Users link a credit card. Every Thursday, they receive "The Drop" — a curated set of personalized cashback offers for restaurants they haven't visited. They pay with their linked card and get cash back automatically (via Venmo).
- **Social features:** "Drop Buddies" (coordinate with friends), reward trading, gifting
- **Target audience:** Originally Gen Z / college students; now expanding to general consumers via Grubhub
- **Reward structure:** Cash back on first visits to new-to-you restaurants. Amount varies per offer. Designed to drive trial, not ongoing discounts.

### Key difference from other platforms we track:
Claim is **not** a "search for a restaurant and get a deal" platform. It's a **push-based discovery** system — the app tells you where to go, you don't search. Offers are personalized and change weekly. There's no browsable restaurant directory.

---

## 2. Coverage & Geography

- **Cities:** 10 major US markets including **New York**, Boston, Chicago, LA, DC, Philadelphia, Atlanta, Austin, Dallas-FW, Houston
- **NYC is a core market** ✅
- **Scale post-acquisition:** Grubhub's network is 415,000+ merchants across 4,000+ US cities. Claim is being scaled within this network.
- **Known brand partners visible on site:** Basta Grill, Wonder, Blank Street Coffee, Bluestone Lane, Just Salad, Joe & The Juice, Chip City, Avo, Yasubee, Something Green, Spirals, Milu, Sweetgreen, Shake Shack (mentioned in blog)

---

## 3. Company & Funding

| Detail | Info |
|--------|------|
| **Founded** | 2021 |
| **Co-founders** | Sam Obletz (CEO), Tap Stephenson (CTO) |
| **Funding** | $20M total ($2M pre-seed from Susa/BoxGroup, $4M seed led by Sequoia Capital, $12M Series A led by VMG Technology) |
| **Key investors** | Sequoia Capital, Susa Ventures, BoxGroup, VMG Technology, Lightbank, Metalab Ventures, The Kraft Group |
| **Acquisition** | Acquired by **Wonder Group** (parent of Grubhub/Seamless) — announced 2025 |
| **Team** | ~12+ people visible on about page (6 engineers, CEO, CTO, Head of Marketplace, Head of Biz Ops) |
| **App Store rating** | 4.8 stars (iOS, per blog post) |

---

## 4. Technical Assessment — Integration Paths

### 4a. Website Infrastructure
- **Platform:** Webflow (static marketing site, hosted on `cdn.prod.website-files.com`)
- **Not** a Next.js app — no `__NEXT_DATA__`, no server-rendered JSON to extract
- **Sitemap:** Exists but contains only marketing pages (home, merchants, careers, blog, legal). No restaurant listing pages.
- **No `/restaurants` route** — returns 404

### 4b. Public API
- **None found.** No developer docs, no API documentation, no `/api/` endpoints visible.
- No Swagger/OpenAPI spec discoverable.

### 4c. Restaurant Directory
- **Does not exist on the web.** Claim is entirely app-driven. Restaurant offers are:
  - Personalized per user (based on card transaction history)
  - Time-limited (weekly Drops, expire in 7 days)
  - Not browsable or searchable publicly
- The merchants page on claim.co is a B2B pitch page, not a consumer-facing directory. It shows ~12 partner brand logos but no searchable list.

### 4d. Data Extraction Options
| Method | Feasibility | Notes |
|--------|-------------|-------|
| Web scraping | ❌ Not possible | No restaurant listings on the web |
| Public API | ❌ None exists | No developer program |
| App reverse-engineering | ⚠️ Technically possible but risky | Would need to intercept app API calls; likely violates ToS; they'd detect and block |
| Grubhub integration | 🔄 Future possibility | If Claim offers surface in Grubhub's web/API, we could potentially detect them there |
| Manual curation | ✅ Possible but low value | We could manually list known Claim partners, but offers change weekly and are personalized |
| Partnership/outreach | 🔄 Possible | Contact hello@claim.co to discuss data sharing |

### 4e. Fundamental Model Mismatch
Our product answers: **"Does Restaurant X have a deal on Platform Y?"**
Claim answers: **"Here's a deal for you this week at a place you haven't tried."**

These are fundamentally different. Even if we could access Claim's data:
- We can't tell a user "Restaurant X has a Claim deal" because deals are personalized — the user might not be eligible
- Deals are ephemeral (weekly), not persistent
- The value prop requires linking a card and receiving The Drop, not searching

---

## 5. Recommendation

### Don't integrate Claim as a data source.

Instead, consider these options:

1. **Informational mention only:** On our results page, add a note like "This restaurant may also appear on Claim (claim.co) — a weekly cashback app by Grubhub. Download the app to see personalized offers."

2. **Watch for Grubhub integration:** Now that Claim is inside Grubhub, watch for Claim-branded offers to appear on Grubhub's web platform or API. If they surface there, we may be able to detect them via our existing Grubhub/Seamless scraping (if we have any).

3. **Revisit in 6 months:** The Wonder/Grubhub acquisition is very recent. The product may evolve to have a web-based component as it scales beyond the app-only experience.

---

## 6. Known Partner Restaurants (for reference)

Extracted from brand logos and blog mentions. These are confirmed Claim partners:

- Basta Grill
- Blank Street Coffee
- Bluestone Lane
- Chip City
- Joe & The Juice
- Just Salad
- Milu
- Shake Shack
- Something Green
- Spirals
- Sweetgreen
- Wonder
- Yasubee
- Avo
- [solidcore] (fitness, not restaurant)
- Life Alive (Boston)

---

*Report by Redfoot. Sources: claim.co website, blog posts, sitemap.xml, /about, /merchants, /claim-grubhub pages. Investigated 2025-07-17.*

# Costco Restaurant Gift Card Integration — Investigation Report

**Author:** Redfoot (Platform SME)
**Date:** 2025-05-06
**Requested by:** Shari Paltrowitz
**Verdict:** ❌ Not worth integrating

---

## 1. What Costco Sells

Costco sells discounted restaurant gift cards online at costco.com/restaurant-gift-cards.html and in-warehouse. The confirmed restaurant list (as of late 2024 sources) is:

- Black Angus
- Blaze Pizza
- Bob Evans
- California Pizza Kitchen
- Chuck E. Cheese
- Dickey's BBQ
- Domino's Pizza
- Famous Dave's
- Honey Baked Ham
- IHOP
- Krispy Kreme
- Macaroni Grill
- Morton's Steakhouse (via Landry's)
- Outback Steakhouse
- P.F. Chang's
- Panda Express
- Papa John's
- Peet's Coffee
- Ruby Tuesday
- Smashburger
- Subway
- Sullivan's Steakhouse (via Landry's)
- Texas de Brazil
- TGI Friday's

Plus: Landry's multi-brand card ($80 for $100) covers 400+ locations including Bubba Gump, Chart House, Del Frisco's, Joe's Crab Shack, Rainforest Cafe, Mitchell's Fish Market, Morton's.

**Every single one is a national chain.** Zero independent NYC restaurants.

## 2. Deal Model

- **Typical discount:** 20% off face value ($100 of cards for $79.99–$80)
- **Best discount:** 25% off (Chuck E. Cheese, Macaroni Grill — $100 for $75)
- **Format:** E-gift cards (digital), shipped free
- **Availability:** Online at costco.com + physical cards in-warehouse
- **Membership:** Required (non-members pay 5% surcharge, negating most of the discount)
- **Refund policy:** Non-refundable (one of the few Costco items you can't return)

## 3. NYC Relevance Assessment

### Does it cover NYC indie restaurants?
**No.** This is 100% national chain territory. The "upscale" end is Morton's and Sullivan's Steakhouse (both Landry's brands) and Texas de Brazil — all chains.

### Would NYC power diners care?
**Unlikely.** Our target user is someone hunting for deals at places like Lilia, Don Angie, Via Carota, Tatiana — independent NYC restaurants with waitlists. These users are not buying Chuck E. Cheese gift cards at Costco.

The Landry's multi-brand card is the only mildly interesting one (Morton's has a NYC presence), but it's still a known chain steakhouse, not the indie dining scene we're targeting.

### Recent issue: Costco recalled Landry's gift cards
MSN reported Costco recalled gift cards covering "hundreds of restaurants" (the Landry's multi-brand cards), adding reliability concerns to this channel.

## 4. Integration Feasibility

### Is there a searchable API?
**No.** Costco's gift card page is a static product listing, not a searchable directory. There's no API, no restaurant search, no way to query "does Costco sell a gift card for [restaurant X]?"

### Could we scrape it?
Costco.com aggressively blocks automated access (403 on all attempts with multiple user agents and URL patterns). Their bot protection (Akamai) is serious. Scraping would be fragile and likely violate their ToS.

### What integration would look like
Even if we could scrape it, we'd be matching against ~20-30 chain restaurant brands. A hardcoded lookup table would be more reliable than scraping — but it would only match chains our users don't care about.

## 5. Recommendation

**Do not integrate Costco gift cards into EatDiscounted.**

Reasons:
1. **Wrong restaurants** — 100% national chains, zero NYC independents
2. **Wrong audience** — NYC power diners don't need us to find Domino's gift cards
3. **No API** — static product listing with aggressive bot protection
4. **Volatile inventory** — gift card selection changes, cards get recalled
5. **Low value-add** — anyone who wants these can Google "Costco gift cards" in 5 seconds

### If we ever reconsider
The only scenario where this becomes relevant is if Costco launches a "local restaurant" gift card program (they haven't, and there's no indication they will). If a user asks "does Costco have gift cards for [chain X]?", that's a Google search, not a platform feature.

**Bottom line:** Shari's instinct was correct. It's chains, not indie NYC restaurants. Not our lane.

# Crave NYC — API/Integration Feasibility Report

**Author:** Redfoot (Platform SME)
**Date:** 2025-07-16
**Status:** ❌ CANNOT INTEGRATE — App Not Found

---

## Summary

**Crave does not appear to exist as a live dining discount platform.** After exhaustive searching across the App Store, dozens of domain variations, and the Wayback Machine, I could not locate the NYC restaurant discount app described in our prior research (redfoot-missing-platforms.md).

**Recommendation: Remove Crave from the integration roadmap.** The prior research entry appears to have been based on unreliable or outdated information.

---

## What Was Searched

### App Store (iTunes Search API)
- Searched 8+ query variations: "crave NYC," "crave dining discount," "crave restaurant deals NYC," "crave pass," "crave live deals," "crave dining NYC," etc.
- Examined 100+ results across all searches
- **No app matching "Crave - NYC Restaurant Deals" was found**
- Found unrelated apps: Crave Rewards (restaurant chain loyalty), Crave Cookies, Crave Media (AI content), Crave: Discover Eat Share (food videos), getcrave.app (recipe generator)

### Domain Probing (20+ domains tested)
| Domain | Result |
|---|---|
| getcrave.com | Connection failed |
| crave.com | Connection failed |
| trycrave.com | Creatine supplement company |
| craveapp.com | "Crave Editor" — unrelated SaaS tool |
| cravenyc.com | Connection failed |
| choosecrave.com | Connection failed |
| joincrave.com | 404 |
| eatwithcrave.com | Connection failed |
| craveit.com | Domain for sale |
| cravepass.com | Domain for sale ($1,388) |
| usecrave.com | 404 |
| crave.deals | Generic food delivery template site (Lorem Ipsum placeholder text) |
| crave.food | Recipe creator link-in-bio platform |
| getcrave.app | AI recipe/dinner picker app |
| cravedeals.com | Connection failed |
| getcrave.co | 403 Forbidden |
| joincrave.co | 404 |
| savewithcrave.com | DNS failure |
| cravenyc.app | DNS failure |

### Wayback Machine
- Checked archived versions of getcrave.co — returned 403 Forbidden
- No archived content found for any Crave dining discount site

### Direct App Store URL Guessing
- `apps.apple.com/us/app/crave-save-on-dining/id1531580092` → 404
- `apps.apple.com/us/app/crave-dining/id6443637498` → 404
- `apps.apple.com/us/app/crave-nyc-restaurant-deals/id1577291675` → 404

---

## Assessment

### Most Likely Explanations
1. **App was removed from the App Store.** Small NYC-only apps frequently shut down. If Crave existed, it's gone now — no web presence, no App Store listing, no archived site.
2. **Prior research was inaccurate.** The "100K+ daily users, 300+ restaurants, 70% off" claims cannot be verified against any live source.
3. **Possible confusion with similar apps.** Several active NYC dining discount apps exist (Claim, Seated, Offline Restaurant Club) that match parts of the Crave description.

### Integration Verdict: ❌ NOT FEASIBLE
- No website to scrape
- No App Store listing to reference
- No API to call
- No Brave Search results would exist for a dead platform
- Equivalent to the Nea situation (app-only, no web data) — except worse, because the app itself is gone

---

## Action Items

1. **Remove Crave from the integration roadmap** in redfoot-missing-platforms.md
2. **Verify Fluz is still live** before investing in that integration (same risk of small NYC app disappearing)
3. **Consider Claim (claim.co) as Crave's replacement** — active NYC dining cashback app, 500K users, has a web presence at claim.co, 2,391 App Store reviews

# Fluz API & Integration Feasibility Report

**Author:** Redfoot (Platform SME)  
**Date:** 2025-07-06  
**Status:** Research Complete

---

## Executive Summary

Fluz does NOT have a public API for searching restaurants. However, they have **public store pages** that can be probed programmatically, and their virtual card product (1.5% cashback everywhere) doesn't require per-restaurant lookup at all. A hybrid approach is recommended.

---

## What Fluz Actually Is (Two Separate Products)

This is the critical insight that changes everything about integration:

### 1. Gift Cards (Specific Brand Partners)
- ~700+ brands offer digital gift cards with **up to 25% cashback**
- These are specific chain partnerships (Sweetgreen, Chipotle, Dunkin', etc.)
- Browseable publicly at `fluz.app/stores` and `fluz.app/store/{slug}`
- Categories include **"Food & Beverage"** and **"Neighborhood Eats"**
- Restaurant chains found: Sweetgreen, Chipotle, Burger King, Domino's, Five Guys, Dunkin', Arby's, Baskin-Robbins, Cinnabon, Cold Stone Creamery, Carvel, Cousins Subs, Dutch Bros Coffee, El Pollo Loco, Auntie Anne's

### 2. Virtual Cards (Universal Mastercard)
- **1.5% cashback everywhere Mastercard is accepted**
- Works at ANY restaurant — no partnership needed
- Added to Apple Pay / Google Pay for tap-to-pay
- This is likely what the "1,400+ NYC restaurants" claim refers to

**The "1,400+ NYC restaurants" number is misleading** — it's not 1,400 restaurant partnerships. It's that a Mastercard works at ~1,400+ restaurants in NYC. Any restaurant that accepts Mastercard gives you 1.5% back via Fluz virtual card.

---

## Site Architecture

| Layer | URL | Tech | Auth Required |
|-------|-----|------|--------------|
| Marketing site | fluz.app/us/* | WordPress (test.fluz.app) | No |
| Store pages | fluz.app/store/{slug} | Remix SSR | No |
| Store directory | fluz.app/stores | Remix SSR | No (but limited) |
| Category browsing | fluz.app/stores/categories | Remix SSR | No |
| Web app | fluz.app/virtual-cards, etc. | Remix SPA | Yes |
| Auth portal | go.fluzapp.com | Remix | Yes |
| Unified app | uni.fluzapp.com | Remix | Yes |

---

## Public Endpoints Found

### ✅ Works Without Auth

1. **Individual store pages:** `GET fluz.app/store/{slug}`
   - Returns 200 + full page data for valid merchants
   - Returns 404 for non-existent merchants
   - Example: `fluz.app/store/sweetgreen` → 200, `fluz.app/store/joes-pizza-nyc` → 404

2. **Store data (turbo-stream):** `GET fluz.app/store/{slug}.data`
   - Returns Remix turbo-stream format with merchant details
   - Contains: name, description, category, cashback rates, redemption info

3. **Category listing:** `GET fluz.app/stores/categories`
   - Lists all 24 gift card categories with images
   - Includes "Food & Beverage" and "Neighborhood Eats"

4. **Recommended merchants API:** `GET fluz.app/api/recommended-merchants`
   - Returns JSON, but empty array without auth: `{"recommendedMerchants":[]}`

### ❌ Requires Auth / Broken

- `fluz.app/api/gc-merchant-data` → 500 without params
- `fluz.app/merchants/*` → requires auth
- No public GraphQL endpoint
- No public search/autocomplete endpoint
- BrandSearch component exists in JS bundles but requires authenticated session

---

## Data Available Per Gift Card Merchant

From the public store page (e.g., `/store/sweetgreen`):

- Merchant name ("Sweetgreen")
- Description / tagline
- Category ("Food & Beverage")
- Merchant type (gift card vs. virtual card)
- Cashback rate info
- Redemption URL
- Help center URL
- Related/similar merchants
- Whether it works in-store, online, or both
- Gift card expiration policy

---

## Integration Assessment

### Option A: Direct Store Page Probe (checkFluz)

```
GET https://fluz.app/store/{slug} → 200 = on Fluz, 404 = not on Fluz
```

**Pros:**
- Simple HTTP HEAD/GET check
- Public, no auth needed
- Returns rich data via .data endpoint

**Cons:**
- Must know the slug format (e.g., "sweetgreen" not "Sweetgreen Salad")
- Only covers gift card partners (~700 brands), not the universal virtual card
- No search/fuzzy matching — must guess exact slug
- Only covers chains, not independent NYC restaurants
- Slug format isn't always predictable (hyphenated? lowercase?)

### Option B: Brave Search (current approach)

```
site:fluz.app/store "{restaurant name}"
```

**Pros:**
- Handles fuzzy name matching
- Finds the correct slug automatically
- No need to guess URL format

**Cons:**
- Search latency
- May return false positives from blog posts
- Limited to indexed pages

### Option C: Hybrid (Recommended)

1. **Universal baseline:** Always show "Fluz Virtual Card: 1.5% cashback" for every restaurant. This is always true if they accept Mastercard (virtually all do).

2. **Gift card bonus check:** For chain restaurants, probe `fluz.app/store/{slug}` to see if a higher cashback gift card exists. Use a slug lookup table for known chains.

3. **Fallback:** For unknown restaurants, use Brave Search `site:fluz.app "{name}"` to check for gift card availability.

---

## Recommended Implementation

### For EatDiscounted's checkFluz():

```typescript
async function checkFluz(restaurantName: string): Promise<FluzResult> {
  // Step 1: Universal virtual card (always applies)
  const result: FluzResult = {
    platform: 'fluz',
    hasVirtualCard: true,
    virtualCardCashback: 1.5,  // Always 1.5% via Mastercard
    hasGiftCard: false,
    giftCardCashback: null,
  };

  // Step 2: Check gift card (for chain restaurants)
  const slug = toFluzSlug(restaurantName); // e.g., "Sweetgreen" → "sweetgreen"
  try {
    const resp = await fetch(`https://fluz.app/store/${slug}`, { method: 'HEAD' });
    if (resp.ok) {
      result.hasGiftCard = true;
      // Optionally fetch .data for cashback rate
    }
  } catch {}

  return result;
}
```

### Key Decision: Fluz Is NOT a Per-Restaurant Lookup Platform

Unlike Seated/TheInfatuation (specific restaurant partnerships with specific discounts), Fluz is primarily a **payment method** that gives cashback everywhere. The gift card component adds bonus cashback at chains, but the core value proposition for EatDiscounted users is:

> "Pay with Fluz virtual card → get 1.5% cashback at any restaurant"

This means:
- **No need for a restaurant-specific API** for the virtual card
- **Gift card check is a nice-to-have bonus** for chains
- **Brave Search is sufficient** for the gift card check fallback
- **No need to scrape or maintain a merchant database**

---

## Services Discovered (for reference)

| Service | URL | Purpose |
|---------|-----|---------|
| Identity | identity-service-694223719049.us-central1.run.app | User auth |
| OAuth | oauth-service.fluzapp.com | OAuth flows |
| Realtime | realtime-service.fluzapp.com | WebSocket |
| VGS Payments | vgs-funding-service.fluzapp.com | Payment processing |
| VGS Payouts | vgs-payouts-service.fluzapp.com | Payouts |
| User Engagement | user-engagement-service.fluzapp.com | UES |
| Transactional Graph | transactional-graph-service-*.run.app | Transaction data |
| Static Assets | static.fluz.app | CDN |
| CMS Files | storage.googleapis.com/cms-file-upload-production/ | Images |

---

## Bottom Line

**Don't overthink this.** Fluz virtual card = 1.5% at every restaurant. Always show it. For the gift card bonus, a simple slug probe or Brave Search is enough. No API integration needed or possible.

# Missing Dining Platforms — Research Report

**Author:** Redfoot (Platform SME)
**Date:** 2025-07-14
**Scope:** NYC-available dining reward/discount/cashback platforms not yet integrated into EatDiscounted

---

## Search Methodology

Searched via DuckDuckGo HTML and direct site fetches across 6 query categories:
1. "best dining cashback apps NYC 2025/2026"
2. "restaurant rewards apps New York"
3. "dining discount platforms alternatives 2025"
4. "credit card dining rewards programs restaurant"
5. "Crave Pass dining app NYC restaurant deals"
6. "Fluz dining cashback app NYC"
7. Platform-specific verification (Dosh, Restaurant.com, EatStreet, Spotluck, Hooch)

Cross-referenced against our 9 already-integrated platforms and 4 investigated-and-rejected platforms.

---

## RECOMMENDED — Worth Integrating

### 1. Fluz ⭐ HIGH PRIORITY

- **What it does:** Cashback (up to 6%) when paying at restaurants via Fluz Virtual Card. No gift card purchase needed — you load a virtual card, pay at the restaurant, and get cashback automatically.
- **NYC presence:** Explicitly NYC-focused. Has a dedicated "Earn cashback eating out in New York City" page with 1,400+ participating local restaurants.
- **Restaurant-specific?** Yes — dining is a core vertical. Also covers chains (Chipotle, etc.) but strong local restaurant coverage.
- **Web presence:** fluz.app — has a restaurant search page at fluz.app/us/earn-cashback-eating-out-nyc/. Could be scraped or searched via Brave Search.
- **Scale:** Growing startup, ~1,400 restaurants in NYC alone. Cashback rates vary by merchant.
- **Integration approach:** Brave Search for "site:fluz.app [restaurant name]" or scrape their NYC restaurant directory.
- **Verdict:** INTEGRATE. Unique value — auto cashback via virtual card at 1,400 NYC restaurants is a strong signal for users. Doesn't overlap with our existing platforms.

### 2. Crave (NYC) ⭐ HIGH PRIORITY

- **What it does:** Live map of restaurants with discounts up to 70% off total check (including drinks). Users claim deals in-app and dine in.
- **NYC presence:** NYC-only app (originally "Crave - NYC Restaurant Deals"). 300+ restaurants.
- **Restaurant-specific?** 100% restaurant/bar focused.
- **Web presence:** iOS App Store listing. The domain crave.deals appears to be a separate/generic food delivery site, NOT the NYC app. The actual NYC Crave app data would need to come from App Store or Brave Search.
- **Scale:** 100,000+ daily users per their App Store listing. 300+ NYC restaurants.
- **Integration approach:** Brave Search for "Crave app [restaurant name] NYC" or scrape App Store listing.
- **Verdict:** INTEGRATE. Very high value — 70% off deals at 300 NYC restaurants is exactly our target use case. NYC-only like us.

### 3. Restaurant.com — MEDIUM PRIORITY

- **What it does:** Sells dining certificates/discount passes. You buy a $25 certificate for $10, use it at participating restaurants (minimum spend applies). Also offers a "Dining Discount Pass" subscription.
- **NYC presence:** Yes, has NYC restaurants. Long-established platform (20+ years).
- **Restaurant-specific?** Primarily dining, though the "Dining Discount Pass" also includes some attractions/shopping.
- **Web presence:** restaurant.com — searchable by location and restaurant name. Well-structured web presence.
- **Scale:** 500,000+ restaurants nationwide (their claim). Significant NYC coverage.
- **Integration approach:** Brave Search for "site:restaurant.com [restaurant name]" or their search API.
- **Verdict:** INTEGRATE, but lower priority. The certificates model is less "automatic" than cashback — user has to pre-purchase. Still, the discount is real and the coverage is massive.

---

## INVESTIGATED — Not Worth Integrating

### 4. Dosh — DEFUNCT ❌

- **Status:** Shut down February 28, 2025 (confirmed via Doctor of Credit). Was a card-linked cashback app with restaurant partners.
- **Verdict:** SKIP — no longer operating.

### 5. Groupon (Dining) — SKIP ⚠️

- **What it does:** Restaurant deals (prepaid vouchers) in NYC, up to 70% off.
- **Why skip:** Generic deal platform, not dining-specific. Deals are one-off vouchers, not searchable by restaurant name in a meaningful way (a restaurant either has a Groupon or doesn't, and they're time-limited). Also, Groupon deals overlap conceptually with Pulsd which we already cover.
- **Verdict:** SKIP — too generic, ephemeral deals, poor search UX for our use case.

### 6. Ibotta — SKIP ⚠️

- **What it does:** Cashback on grocery/retail purchases. Has some restaurant/takeout deals but primarily grocery-focused.
- **Why skip:** Not restaurant-specific. Their dining coverage is thin — mostly chains and delivery services, not local NYC restaurants.
- **Verdict:** SKIP — grocery-first platform, minimal dining value.

### 7. Fetch Rewards — SKIP ⚠️

- **What it does:** Receipt scanning for points. Primarily grocery/retail.
- **Why skip:** Not restaurant-specific. You scan receipts from any store, earn generic points. No restaurant search capability.
- **Verdict:** SKIP — grocery/retail, not dining.

### 8. BeFrugal — SKIP ⚠️

- **What it does:** Online cashback portal (like Rakuten). Has some restaurant gift card cashback.
- **Why skip:** Generic online shopping cashback. Not dining-specific. Overlaps with Rakuten Dining which we already cover, and Rakuten has better restaurant coverage.
- **Verdict:** SKIP — Rakuten clone, already covered by our Rakuten integration.

### 9. Shopkick — SKIP ⚠️

- **What it does:** Points for walking into stores, scanning items.
- **Why skip:** Retail-focused. No meaningful restaurant coverage.
- **Verdict:** SKIP — retail, not dining.

### 10. Swagbucks — SKIP ⚠️

- **What it does:** Points for surveys, shopping, some dining partners.
- **Why skip:** Generic rewards platform. Dining is a minor feature. Can't search by restaurant.
- **Verdict:** SKIP — too generic, dining is incidental.

### 11. Honey (PayPal) — SKIP ⚠️

- **What it does:** Browser extension for online coupons/cashback.
- **Why skip:** Online shopping focus. No in-person dining rewards.
- **Verdict:** SKIP — online shopping only.

### 12. EatStreet — SKIP ⚠️

- **What it does:** Food delivery/ordering platform.
- **Why skip:** Delivery platform, not a rewards/discount platform. Similar to DoorDash/UberEats.
- **Verdict:** SKIP — delivery service, not rewards.

### 13. Spotluck — LIKELY DEFUNCT ❌

- **What it does:** Was a DC-based dining discount app with gamification (random discounts at nearby restaurants).
- **Status:** No recent activity found. Was primarily DC/Baltimore, not NYC.
- **Verdict:** SKIP — likely defunct, never had NYC coverage.

### 14. Hooch — LIKELY DEFUNCT ❌

- **What it does:** Was a membership drinks app ($9.99/mo for one free drink per day at partner bars).
- **Status:** No recent results. Appears to have shut down or pivoted.
- **Verdict:** SKIP — likely defunct.

---

## Summary

| Platform | Type | NYC? | Status | Priority |
|---|---|---|---|---|
| **Fluz** | Auto cashback via virtual card | ✅ 1,400 restaurants | Active | 🟢 HIGH |
| **Crave** | Live discount map, up to 70% off | ✅ 300+ restaurants | Active | 🟢 HIGH |
| **Restaurant.com** | Discount certificates | ✅ Large coverage | Active | 🟡 MEDIUM |
| Dosh | Card-linked cashback | N/A | Shut down Feb 2025 | ❌ |
| Groupon Dining | Vouchers | ✅ | Active but generic | ⚪ SKIP |
| Ibotta | Grocery cashback | ✅ | Active but grocery-focused | ⚪ SKIP |
| Others (Fetch, BeFrugal, Shopkick, Swagbucks, Honey, EatStreet) | Various | Varies | Various | ⚪ SKIP |

**Net new integrations recommended: 3** (Fluz, Crave, Restaurant.com)

This would bring our total from 9 platforms to 12.

---

## Credit Card Dining Programs Note

The search for "credit card dining rewards programs" surfaced cards like Amex Gold (4x dining), Chase Sapphire (3x dining), Capital One Savor (4% dining). These are **credit card category bonuses**, not searchable dining platforms. They don't have restaurant directories or searchable databases — they just give bonus points/cashback on any dining MCC code transaction. This is outside our scope (we search for restaurant-specific deals, not credit card optimization). Rewards Network (already integrated) is the only credit card-linked dining rewards program with a searchable restaurant directory.

# Nea App — Platform Investigation

**Date:** 2025-07-17
**Investigator:** Redfoot (Platform SME)
**Source:** [App Store](https://apps.apple.com/us/app/nea-app/id6499201316) | [Website](https://neaapp.ai)

---

## 1. What Is Nea?

Nea is a **curated restaurant discovery + automatic cashback** app focused on health-conscious dining. It's built by **Nea Inc.**, an Italian-founded team based in New York.

**Core proposition:** A filtered map of partner restaurants that match your dietary preferences (dairy-free, gluten-free, vegan, seed-oil-free, etc.). You link a debit/credit card via Plaid, dine at any partner restaurant, pay normally, and receive **real cash back to your Venmo** — no codes, no scanning, no points.

**Reward mechanics:**
- Automatic cashback on every verified visit (Plaid detects the transaction)
- Referral program: $5 when someone you refer makes their first order, then 6% on every order they place — forever
- Cashback hits Venmo within 48 hours
- No points, no minimums, no expiration — real money

**Scale (from their website):**
- 200+ restaurant partners live in NYC
- 200K meals purchased through the ecosystem in 2026
- Average partner ROI: 5.6x
- App Store rating: 4.8 (154 ratings)
- Currently **NYC only**

**Named partner restaurants** (from testimonials): Honeybrains, Avo, Tziki, Mezeh (50+ locations nationwide), Matter Formula, Impact Kitchen, OM Juice, Soma Salad, SOPO.

---

## 2. Technical Infrastructure

| Aspect | Finding |
|--------|---------|
| **Website** | neaapp.ai — built with **Webflow** (static marketing site) |
| **App** | iOS native (React Native likely, given OTA update mentions), requires iOS 15.1+ |
| **Card linking** | Plaid integration for transaction detection |
| **Payment** | Rewards paid via Venmo |
| **Verification** | Bank-verified transactions + POS verification + GPS for intent |
| **Alt domain** | getnea.com exists but is a **completely different company** — a Mexican fintech/fleet payment platform (Softr-built). Not related. |
| **nea.app** | Domain does not resolve |

---

## 3. Web Presence & API Assessment

### What exists on the web:
- **neaapp.ai** — Marketing site only (Webflow). Pages: `/`, `/partners`, `/terms-condition`, `/privacy-policy`
- No sitemap.xml (404)
- robots.txt exists — notably **blocks all AI crawlers** (ClaudeBot, GPTBot, etc.)
- No `__NEXT_DATA__` — it's not a Next.js app, it's a static Webflow site

### What does NOT exist:
- ❌ No `/restaurants` page or public restaurant directory
- ❌ No `/api/restaurants` or any public API endpoints
- ❌ No web-based search or restaurant lookup
- ❌ No structured data / JSON-LD for restaurants
- ❌ No restaurant listing anywhere on the marketing site (only testimonial names)

---

## 4. Integration Feasibility

### Verdict: **Not integrable from a web app — app-only, closed ecosystem**

**Why:**
1. **No public restaurant directory.** Their restaurant data lives entirely within the mobile app. The website is purely marketing with zero restaurant data.
2. **No API.** No public or discoverable API endpoints for searching restaurants or checking partner status.
3. **Plaid-based model.** The entire reward mechanism requires linking your bank card through Plaid in their app — there's no web checkout or web-based participation.
4. **GPS + POS verification.** Rewards require physical presence verification, making web-only integration meaningless for the cashback component.
5. **AI crawling blocked.** Their robots.txt explicitly blocks all AI/scraping bots, signaling they don't want external data access.

### Possible workarounds (all limited):
- **Manual partner list:** We could hardcode the ~10 restaurant names visible from their testimonials (Honeybrains, Avo, Tziki, Mezeh, etc.), but this would be incomplete (they have 200+ partners) and stale immediately.
- **Deep link to App Store:** We could detect when a user searches for a known Nea partner and show "This restaurant may offer cashback on Nea" with an App Store link.
- **Partnership inquiry:** Contact hello@neaapp.ai to ask about API access or a partner directory feed. Given their scale (200+ partners, 200K meals) they might be open to referral partnerships.

---

## 5. Comparison to Other Platforms

| Feature | Nea | Seated | Blackbird | Upside |
|---------|-----|--------|-----------|--------|
| Web directory | ❌ | ✅ | ❌ | ✅ |
| Public API | ❌ | ❌ | ❌ | ❌ |
| Searchable from web | ❌ | ✅ | ❌ | ✅ |
| Reward type | Cash (Venmo) | Gift cards | Points | Cash |
| Coverage | NYC only | Multi-city | NYC only | National |

Nea falls into the same "app-only, no web presence" category as Blackbird — fundamentally designed as a mobile-first experience with no web-facing restaurant data.

---

## 6. Recommendation

**For EatDiscounted integration: Skip for now, revisit later.**

- Nea has no web-searchable data we can query
- Their value prop (automatic cashback via Plaid) requires the native app — we can't replicate or surface this from a web search
- If we want to acknowledge Nea's existence, we could add it as a **static platform reference** ("Also check Nea app for NYC dining cashback") rather than a searchable integration
- **Worth emailing hello@neaapp.ai** to ask if they have or plan to have a public partner directory or API — they're growing fast and may eventually build one

---

*Filed by Redfoot — Platform SME*

# Pulsd NYC — Integration Feasibility Investigation

**Investigator:** Redfoot (Platform SME)
**Date:** 2025-07-18
**Requested by:** Shari Paltrowitz
**Contact provided:** thepulse@pulsd.com

---

## 1. What Is Pulsd?

Pulsd is a **curated restaurant/experience deals marketplace** focused on NYC. Think Groupon but upscale, editorial, and NYC-native. They hand-pick restaurants, negotiate exclusive fixed-price packages, and sell them to their member base.

**Legal entity:** Pulsd Inc
**Founders:** Mareza Larizadeh, Vikram Joshi, Daniel Gliner
**Support email:** support@pulsd.com
**Social:** [@pulsdnyc](https://facebook.com/pulsdnyc) (FB), [@pulsdNYC](https://twitter.com/pulsdNYC) (Twitter), [@pulsd](https://instagram.com/pulsd) (IG), [LinkedIn](https://linkedin.com/company/pulsd)
**Credibility:** Endorsed by *The New York Times*. Claims "hundreds of thousands of New Yorkers" visit monthly.
**App:** Yes, they have a mobile app (mentioned on gift card page).
**Cities:** NYC (primary), Brooklyn (separate section), San Francisco, East Bay. NYC is the core market.

---

## 2. How Restaurant Deals Work

Pulsd deals are **pre-negotiated, restaurant-specific packages** sold at a discount. They are NOT cashback, NOT promo codes, NOT affiliate links. They are **prepaid dining vouchers** purchased through Pulsd.

### Deal Structure (Real Examples)

| Restaurant | Pulsd Price | Retail Value | Discount | What You Get |
|---|---|---|---|---|
| Nar Restaurant | $99 | $185 | 46% off | 3-course dinner for 2 + cocktails/wine |
| Radio Restaurant | $29 | $94 | 69% off | 2-hour bottomless brunch for 2 |
| Osteria 57 | $85 | $131 | 35% off | 3-course dinner for 2 + bottle of wine |

### How Redemption Works
1. User buys a "pulse" (deal) on pulsd.com via `pulsd.com/orders/new?pulse_id={id}`
2. User receives a voucher/confirmation
3. User visits the restaurant and redeems the deal
4. Selections are made from the restaurant's full menu (not a limited "deal menu")

### Deal Characteristics
- **Restaurant-specific:** Each deal names a specific restaurant with address
- **Fixed packages:** "3 courses for 2 + drinks" style bundles, not percentage discounts
- **Curated editorial tone:** Each deal has a long, polished write-up with Google review scores
- **Not time-limited daily deals:** Deals appear to persist for weeks/months (not flash sales)
- **Categories:** Dinners, brunches, bottomless brunches, afternoon teas, food festivals

---

## 3. Site Structure & Technical Assessment

### URL Architecture
```
pulsd.com/new-york/                     → City hub (login-gated)
pulsd.com/new-york/restaurants          → Category page (login-gated)
pulsd.com/new-york/eats                 → Category page (partial content)
pulsd.com/new-york/deals               → Category page (partial content)
pulsd.com/new-york/promotions           → All promotions (login-gated)
pulsd.com/new-york/promotions/{slug}    → Individual deal page (PUBLIC!)
pulsd.com/search?query={term}           → Search results (PUBLIC!)
pulsd.com/orders/new?pulse_id={id}      → Purchase page
```

### Key Technical Findings
- **Not a Next.js app.** No `__NEXT_DATA__`, no React hydration. Server-rendered (likely Ruby on Rails based on URL patterns and conventions).
- **No public API.** No documented API, no developer program, no partner endpoints.
- **Search endpoint is public and returns structured results.** This is the most promising integration path.
- **Individual deal pages are publicly accessible** with full deal details, pricing, and restaurant info.
- **Images served from CloudFront CDN:** `d3tv8y14ogpztx.cloudfront.net/pulses/images/...`
- **Tech stack:** New Relic APM, Google Analytics (UA + GA4), Google Tag Manager, Optimizely, VWO (A/B testing)
- **Sitemap:** Available at `/sitemap.xml`, lists category pages but NOT individual deal pages
- **robots.txt:** Only blocks 2 specific deal pages (Osteria 57 asked to be excluded from Google)

### What's Behind the Login Wall
- Category listing pages (`/restaurants`, `/promotions`, etc.)
- Full deal browsing/filtering
- User accounts required via Facebook or Google OAuth

### What's Publicly Accessible
- Individual deal pages (if you know the URL slug)
- Search results at `/search?query={term}`
- The `/eats` and `/deals` category descriptions

---

## 4. Integration Paths

### Path A: Search Endpoint Scraping (Most Viable)
**How:** Hit `pulsd.com/search?query={restaurant_name}` and parse results.
**Pros:**
- Public, no auth needed
- Returns restaurant names, descriptions, images, and deal page URLs
- Could match restaurant names from our search against Pulsd results
- Each result links to a full deal page with pricing details

**Cons:**
- No structured data in search results (HTML parsing required)
- Search may not return exact matches (fuzzy/editorial matching)
- Scraping at scale may get rate-limited or blocked
- Terms of service likely prohibit scraping

### Path B: Deal Page Scraping
**How:** Scrape individual deal pages at `/new-york/promotions/{slug}` for pricing and details.
**Pros:**
- Pages are public and contain structured deal info (price, value, inclusions)
- Purchase links contain `pulse_id` which could be used for tracking

**Cons:**
- No index of all deal slugs (sitemap doesn't include them)
- Would need to discover slugs via search first
- Same scraping/TOS concerns

### Path C: Partnership/API Request
**How:** Contact thepulse@pulsd.com or support@pulsd.com to discuss integration.
**Pros:**
- Could get structured deal data, real-time availability
- Could potentially become an affiliate and earn commission on referred purchases
- They have an established business with real deal flow

**Cons:**
- No existing partner/API program visible
- May not be interested in sharing data with a third-party aggregator
- Unknown timeline to establish partnership

### Path D: Link-Out Only
**How:** Simply link to `pulsd.com/search?query={restaurant_name}` when a user searches.
**Pros:**
- Zero integration effort
- No scraping, no TOS risk
- Always up-to-date

**Cons:**
- We can't tell the user IF a deal exists before they click
- No deal details in our UI
- Poor user experience (sends them away)

---

## 5. Can We Check If a Specific Restaurant Has a Pulsd Deal?

**Yes, via the search endpoint.** The search at `pulsd.com/search?query={restaurant_name}` returns matching deals. In testing, searching "restaurant" returned 24+ results with named restaurants like Nar, Radio, Charm, CZEN, Rebel, Inti, Kaia, Amarone, Josephs, etc.

**However, this is a "browse deals" model, not a "lookup restaurant" model.** Pulsd curates ~50-100 active restaurant deals at any time. If a restaurant doesn't have a Pulsd deal, there's nothing to show. Most NYC restaurants will NOT have a Pulsd deal — only restaurants that have partnered with Pulsd for a specific package.

---

## 6. Integration Recommendation

### Verdict: **MEDIUM-VALUE, MODERATE-EFFORT integration candidate**

### Why It's Interesting
- Pulsd offers **real, substantial discounts** (35-69% off) on named NYC restaurants
- Deals are restaurant-specific, which maps well to EatDiscounted's "search by restaurant" model
- The search endpoint provides a viable technical path without authentication
- They're an established NYC business with editorial credibility

### Why It's Limited
- **Small catalog:** Only ~50-100 restaurants have active deals at any time (vs. thousands of NYC restaurants)
- **No API:** Would require HTML scraping, which is fragile and potentially against TOS
- **Prepaid voucher model:** This is different from cashback/discount platforms — user has to buy a package upfront
- **Not real-time inventory:** We can't know deal availability without scraping
- **Match rate will be low:** Most restaurants a user searches for won't have a Pulsd deal

### Recommended Approach
1. **Short-term:** Add Pulsd as a "link-out" source. When showing results for a restaurant, include a "Check Pulsd for deals" link pointing to `pulsd.com/search?query={restaurant_name}`. Zero integration cost.
2. **Medium-term:** Build a lightweight scraper that hits the search endpoint for the searched restaurant name, checks if any results are a close name match, and if so, extracts the deal summary and price from the deal page. Cache results daily.
3. **Long-term:** Reach out to thepulse@pulsd.com about a partnership. Pitch: "We send you qualified traffic for free. Can we get a deal feed or affiliate arrangement?" This is the only sustainable path.

### Technical Implementation Sketch (Medium-term)
```
1. User searches "Nar Restaurant" on EatDiscounted
2. Backend hits: pulsd.com/search?query=Nar+Restaurant
3. Parse HTML response for deal cards
4. Fuzzy-match restaurant names against search query
5. If match found: extract deal page URL, fetch deal page
6. Parse deal page for: price, retail value, discount %, what's included
7. Display: "Pulsd Deal: $99 dinner for 2 (normally $185) — 46% off"
8. Link to deal page for purchase
```

### Priority Relative to Other Platforms
Pulsd is a **nice-to-have supplement**, not a core integration. Platforms like Restaurant.com, The Restaurant Store, or cashback apps (Seated, Resy) that cover thousands of restaurants should be prioritized first. Pulsd adds value when a user happens to search for one of their ~50-100 partnered restaurants.

---

## 7. Open Questions
- Does Pulsd have a mobile app API we could reverse-engineer? (They mention an app)
- What's their deal refresh cadence? (How often do new restaurants get added?)
- Would they be open to an affiliate/partner arrangement?
- Are deals limited in quantity or available indefinitely?

---

*Investigation complete. All findings based on publicly accessible information from pulsd.com as of July 2025.*

# Rewards Network Investigation — Platform Analysis

**Date:** 2025-05-01
**Author:** Redfoot (Platform SME)
**Status:** ✅ Complete — API is open and rich

---

## Executive Summary

Rewards Network operates a **single white-label SPA platform** powering 8+ branded dining portals. The restaurant search API is **unauthenticated, JSON-based, and fully paginated**. One integration covers all portals.

**Bottom line: This is the single highest-leverage dining data source available.** ~1,800+ restaurants in NYC alone, with day-by-day cashback rates, full addresses, hours, cuisines, photos, ratings, and menu links — all from one API call.

---

## 1. Architecture: One Platform, Many Brands

All portals are **identical Vite/React SPAs** with brand-specific CSS theming. They share:
- Same GTM tag (`GTM-WRPRJ9N`)
- Same JS structure (`/psfe_environment.js`, `/assets/index-*.js`)
- Same backend at the portal domain (proxied to Rewards Network infra)
- Same API endpoints: `/api/v2/Merchants/Search`, `/api/feature-flags`, `/api/CSRF`, `/api/DefaultUserLocation`
- ButterCMS for content, Cloudinary/`media.rewardsnetwork.com` for images, OpenTable for reservations, Stripe for payments

### Portals Confirmed Sharing Platform

| Portal | Domain | Currency | Client Code |
|--------|--------|----------|-------------|
| AAdvantage Dining | aadvantagedining.com | Mile | DAAA |
| MileagePlus Dining | dining.mileageplus.com | Mile | (same platform) |
| Rapid Rewards Dining | rapidrewardsdining.com | Point | (same platform) |
| Hilton Honors Dining | hiltonhonorsdining.com | Point | (same platform) |

Minor differences per brand:
- `currencyType`: "Mile" (AA, United) vs "Point" (Hilton, Southwest)
- `enrollmentType`: "sso" (AA, United) vs "direct" (Hilton, Southwest)
- `hasVIP`: true/false varies
- Restaurant counts differ slightly per portal (~5-10% variance), suggesting some brand-specific restaurant enrollment

---

## 2. The API: `/api/v2/Merchants/Search`

### Endpoint
```
GET https://{any-portal-domain}/api/v2/Merchants/Search
```

### Required Parameters
| Param | Description | Example |
|-------|-------------|---------|
| `campaignCode` | Brand identifier | `aa-dining` |
| `location` | ZIP code or `lat,lon` | `10001` or `40.7128,-74.0060` |

### Optional Parameters (from JS bundle analysis)
| Param | Description | Example |
|-------|-------------|---------|
| `pageSize` | Results per page (default 15) | `15` |
| `pageNo` | Page number | `2` |
| `sortBy` | Sort order | `recommended`, `distance` |
| `restaurantOrCuisine` | Text search | `pizza` |
| `radius` | Search radius | `30` |
| `acclaimed` | Filter acclaimed restaurants | `true` |
| `localGem` | Filter local gems | `true` |
| `benefitsFor` | Filter by benefit type | — |
| `features` | Feature filters | — |
| `isNew` | New restaurants only | `true` |
| `mealsServed` | Meal type filter | — |
| `priceRange` | Price filter | — |
| `reservations` | Reservation-enabled only | `true` |

### Auth Requirements
**None.** No API key, no cookies, no CSRF token needed for search. The CSRF endpoint exists (`/api/CSRF`) but is only used for write operations (login, card linking).

### Response Format (JSON)
```json
{
  "totalPages": 1860,
  "currentPage": 1,
  "totalResultSize": 1860,
  "searchArea": "10001",
  "sortBy": "recommended",
  "filters": {
    "campaignCd": "AAT2",
    "clientCode": "DAAA",
    "location": { "zip": "10001", "radius": 30 }
  },
  "searchOriginCoordinates": { "latitude": 40.75205, "longitude": -73.994517 },
  "merchants": [
    {
      "id": "149849",
      "name": "Tavola",
      "type": "restaurant",
      "designation": "Acclaimed",
      "distance": 0.2,
      "benefits": [
        { "value": "3", "dayOfWeek": "Mon", "monthDay": "5/4/2026" },
        { "value": "0", "dayOfWeek": "Fri", "monthDay": "5/1/2026" }
      ],
      "benefitAvailability": {
        "campaignCodes": ["AAT0", "AAT2", "AAT3"]
      },
      "location": {
        "neighborhood": "West Side 14-44th Streets",
        "timezone": "America/New_York",
        "latitude": 40.755511,
        "longitude": -73.994757,
        "address": {
          "address1": "488 9th Ave",
          "city": "New York",
          "state": "NY",
          "zip": "10018"
        }
      },
      "details": {
        "acceptedCards": ["American Express", "Discover", "MasterCard", "Visa"],
        "cuisines": ["Italian", "Pizza"],
        "features": [
          { "category": "Dinner", "types": ["Under $30"] },
          { "category": "Establishment Type", "types": ["Casual", "Restaurant"] },
          { "category": "Features", "types": ["Delivery", "Take Out", "Happy Hour"] }
        ],
        "hours": [
          { "dayOfWeek": "Mon", "dayHours": [{"open": "11:30AM", "close": "11:00PM"}], "openForBusiness": true }
        ],
        "menu": { "externalUrl": "https://tavolahellskitchen.com/menu" },
        "phone": "2122731181",
        "priceRange": 3,
        "rating": { "overallRating": 4.8, "numberOfRatings": 145, "numberOfReviews": 83 },
        "hasDelivery": true,
        "hasTakeOut": true
      },
      "images": {
        "imageBaseUrl": "https://media.rewardsnetwork.com",
        "logoImage": "v1714932140/149849/logo",
        "photos": ["v1714932140/149849/logo", "v1714932263/149849/promo"]
      }
    }
  ]
}
```

### Data Richness Per Restaurant
- ✅ Unique ID, name, type
- ✅ Full address + lat/lon + neighborhood
- ✅ Day-by-day cashback rates (miles/points per $1) for next 14 days
- ✅ Cuisines, price range, features, establishment type
- ✅ Full operating hours
- ✅ Phone number
- ✅ Menu URL (external link)
- ✅ Ratings (overall, count, review count)
- ✅ Delivery/takeout flags
- ✅ Photos (Cloudinary URLs via `media.rewardsnetwork.com`)
- ✅ Accepted card types
- ✅ Designation (Acclaimed, Local Gem)
- ✅ Campaign code availability per tier

---

## 3. Restaurant Density

| Metro (ZIP) | Count |
|-------------|-------|
| New York (10001) | 1,860 |
| Los Angeles (90001) | 1,005 |
| Chicago (60601) | 801 |
| Phoenix (85001) | 484 |
| Houston (77001) | 341 |

Default search radius appears to be 30 miles.

---

## 4. Scraping Strategy

### Recommended Approach
1. **Use `aadvantagedining.com` as primary portal** — AA is the largest program, likely has most restaurants
2. **Hit `/api/v2/Merchants/Search`** with `campaignCode=aa-dining`
3. **Sweep by ZIP code** — use major metro ZIPs, paginate with `pageSize=15&pageNo=N`
4. **Deduplicate by merchant `id`** — same restaurant appears in multiple ZIP searches
5. **No browser/headless needed** — plain HTTP GET returns JSON

### Rate Limiting
Not tested aggressively, but the API has no visible rate-limit headers. Be respectful — space requests by 1-2 seconds.

### Pagination Math
- NYC: 1,860 restaurants ÷ 15/page = 124 pages
- Full national sweep (est. ~15,000-20,000 unique restaurants): feasible in a few thousand requests across ~100 major ZIPs

---

## 5. Other Useful Endpoints

| Endpoint | Auth | Returns |
|----------|------|---------|
| `/api/DefaultUserLocation` | None | Default geo: `{cityState, zip, lat, lon}` |
| `/api/feature-flags` | None | Brand config: currency type, enrollment, features |
| `/api/CSRF` | None | CSRF token (for write ops only) |
| `/api/cms` | None | CMS content pages (ButterCMS) |
| `/api/Member` | Auth required | Member profile (not needed for scraping) |
| `/api/Member/Cards` | Auth required | Linked cards (not needed) |

---

## 6. Key Insight: Benefits Vary by Day

The `benefits` array shows earning rates per day for the next 14 days. This means:
- Restaurants change their cashback rates by day of week
- Some days show `"value": "0"` (no bonus)
- Others show `"value": "3"` or `"value": "5"` (3x or 5x miles/$)
- **This is the actual deal data** — it tells users which days to dine for maximum rewards

For our use case, we'd surface the best available rate and note which days it applies.

---

## 7. Risks & Considerations

1. **No explicit public API docs** — this is an internal API powering the SPA, not a partner API
2. **Could change without notice** — Vite bundle hashes change on deploy, but API contract appears stable
3. **Terms of Service** — should review each portal's ToS before large-scale scraping
4. **Campaign code required** — `aa-dining` works; other brand codes unknown but same restaurants accessible from any portal
5. **Rate limiting** — untested at scale; implement backoff

---

## 8. Recommendation

**Priority: HIGH — Implement immediately.**

This single API endpoint replaces the need to individually scrape 8+ branded dining portals. The data quality is exceptional — richer than most restaurant APIs (full hours, day-by-day rates, photos, ratings, delivery flags).

### Integration plan:
1. Build a simple HTTP client that hits `/api/v2/Merchants/Search`
2. Sweep ~100 major US ZIP codes with pagination
3. Deduplicate by merchant ID
4. Store the canonical restaurant data + daily benefit rates
5. Map to all 8 loyalty programs (same restaurants, different currency labels)

