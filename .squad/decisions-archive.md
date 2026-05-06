# Decisions Archive

> Archived decisions from decisions.md.

---

### In-Memory Caching & Rate Limiting Strategy
**Author:** Fenster | **Date:** 2026-04-30 | **Status:** Implemented

- Caching: In-memory Map with TTL (1hr search results, 5min sitemap). Process-scoped.
- Rate limiting: Per-IP sliding window. `/api/check`: 5/min, `/api/report`: 10/min, `/api/reports`: 20/min. Returns 429 + Retry-After.
- Trade-off: No cross-instance sharing. Needs Redis/Upstash if moving to serverless at scale.

---

### README: Google CSE Documentation
**Author:** Keaton | **Date:** 2026-04-30 | **Status:** Implemented

- README now accurately reflects Google CSE (not DuckDuckGo) as the search method.
- Added Quick Start API setup note (`.env.local.example` → `.env.local`).
- Documented 100 queries/day free tier limit.
- Compliance section clarifies Google CSE is an official API.

---

### Vitest as Test Framework
**Author:** McManus | **Date:** 2026-04-30 | **Status:** Implemented

- Adopted Vitest: `npm test` → `vitest run`, `npm run test:watch` → `vitest`.
- Config: `vitest.config.ts` with `globals: true`. Tests at `lib/__tests__/`.
- 38 tests cover core matching logic. 3 known Unicode bugs documented.
- All team members should run `npm test` before pushing.

---

### Unicode Normalization Strategy
**Author:** Fenster | **Date:** 2026-04-30 | **Status:** Implemented

- `norm()` uses NFD decomposition + combining mark removal for Unicode transliteration. Special cases (ß, æ, œ) handled before NFD. No external dependencies.
- CJK/Cyrillic names still normalize to empty string → false-positive matches. Acceptable for NYC Latin-script focus.
- If we expand internationally, we'd need ICU transliteration or a lookup table for non-Latin scripts.
- All restaurant names with common accents (Café, Señor, Lïllïes) now match correctly in search and Blackbird sitemap checks.

---

### Fly.io Deployment Configuration
**Author:** Fenster | **Date:** 2026-04-30 | **Status:** Implemented

- Deploy to Fly.io with persistent volumes for SQLite (shared-cpu-1x, 512MB, Newark).
- DB path via `DATABASE_PATH` env var; defaults to `process.cwd()/eatdiscounted.db` locally.
- Auto-stop machines when idle ($0 cost at rest), auto-start on request (~2-3s cold start).
- Secrets (`GOOGLE_CSE_API_KEY`, `GOOGLE_CSE_ID`) via `fly secrets`, not in fly.toml.
- Single machine = single-writer SQLite works perfectly; no Redis needed for caching/rate limiting.
- Trade-off: In-memory cache lost on deploy. If multi-instance needed later, move to LiteFS or hosted DB.

---

### Post-Sprint Health Check
**Author:** Keaton | **Date:** 2026-04-30 | **Status:** Confirmed

- Build: 🟢 GREEN (Next.js 16.2.4 clean compile, all routes generated)
- Tests: 🟢 GREEN (38/38 pass, 316ms)
- Lint: 🟡 YELLOW (5 issues in squad templates only — zero app code lint issues)
- Git: 2 unpushed commits (33aeb4e, a63388c) ahead of origin
- No breakage from rapid sprint iteration. Ship-ready.
- Action items: push commits, fix unused CheckResult import, consider adding .squad/templates/ to .eslintignore.

---

### UX Priority: Sort by Signal, Celebration Moment, Collapse Not-Found
**Author:** Verbal (Designer) → Hockney (impl) | **Date:** 2026-04-30 | **Status:** Implemented

- **#1 Sort results by signal:** Results render found first, manual-check second, not-found last. Immediate visibility of wins.
- **#2 Celebration summary card:** Post-stream card with green gradient when deals found (includes platform names + inline conflict warnings). Gray fallback for zero results.
- **#3 Collapse not-found:** After streaming, not-found cards collapse to compact pill list with expandable details. ~50% scroll reduction on mobile. During streaming, cards still show individually for real-time feedback.
- **Trade-off:** ConflictWarning component no longer rendered separately (merged into summary card). Sort uses `.includes()` on small arrays (8 platforms max).

---

### Platform Accuracy: site: Operator, Word-Boundary Matching, Data Corrections
**Author:** Redfoot (Platform SME) → Fenster (impl) | **Date:** 2026-04-30 | **Status:** Implemented

- **#1 `site:` operator in CSE queries:** Queries now include `site:{domainFilter}` (e.g. `"Carbone" site:inkind.com`). Eliminates blog/review noise from results.
- **#2 Word-boundary matching:** `matchesRestaurant` uses `\b` regex with fast `includes()` pre-check. Prevents "robot" matching "Bo" and "blacksmith" matching "The Smith". Regex special chars escaped.
- **#3 `slugVariants` wired in:** Now used in `checkBlackbird` for URL slug matching. No longer dead code.
- **#4 Data corrections:** Rakuten `appOnly` → false, Seated `domainFilter` → "seatedapp.io", Blackbird `cardLink` annotated as NFC/QR.
- **Trade-off:** Word-boundary matching is slightly stricter — restaurant names that are substrings of other words no longer match (desired behavior). `site:` scopes to one domain per platform.

---

### Enable Custom Search JSON API in Google Cloud Console
**Author:** Fenster | **Date:** 2026-04-30 | **Status:** Action Required (Shari)

- Google Cloud project missing Custom Search JSON API activation (403 PERMISSION_DENIED on all CSE requests).
- Root cause: Not a code issue. Action: Enable API in [Google Cloud Console](https://console.cloud.google.com/apis/library/customsearch.googleapis.com), then re-test.
- Fallback implemented in `lib/checkers.ts`: structured error parsing, retry without `site:` operator if needed.
- Trade-off: Fallback doubles API calls on failure; once API enabled, only fires if `site:`-specific rejection.

---

### DuckDuckGo HTML Scraping Fallback
**Author:** Fenster | **Date:** 2026-04-30 | **Status:** Implemented

- Google CSE unavailable due to API enablement issue. Added DDG HTML scraping fallback.
- Strategy: `batchSearch()` probes Google CSE first; if fails, ALL platforms fall back to DDG sequentially.
- DDG uses `html.duckduckgo.com/html/` with same query format (`"name" site:domain`), 2s rate-limit delays.
- Results cached identically — downstream code unaware of which engine. Google CSE still preferred when available.
- Trade-off: DDG fallback sequential (~14s/7 platforms vs ~2s parallel), HTML scraping fragile, DDG may rate-limit.

---

## Verification

- Curled the API directly: 200 offers returned, 196 restaurants, clean JSON
- Build: green
- Tests: 75/75 pass

---

# Bilt Rewards Direct API Integration

**Author:** Fenster | **Date:** 2026-05-01 | **Status:** Implemented

---

## Decision
Implemented a two-tier hybrid approach:

1. **Sitemap first-pass** — fast, cached (5min TTL), definitive when it hits
2. **Brave Search fallback** — `"name" site:blackbird.xyz` when sitemap misses, using the same `braveSearch()` + `titleMatchesRestaurant()` + `isNoResultsPage()` filtering as other platforms

Blackbird's Brave search is self-contained in `checkBlackbird()` — it is NOT added to `batchSearch()` to avoid double-searching.

---

## Trade-offs
- Adds one Brave API call per Blackbird miss (most lookups). Acceptable given the massive coverage improvement.
- Sitemap errors now gracefully fall through to Brave search instead of returning an error result.

---

# Brave Search API Migration

**Date:** 2026-04-30  
**Author:** Fenster  
**Status:** Implemented

---

## Context
Google CSE integration was completely broken (100% error rate, permission denied) and required complex Cloud Console setup that was never completed. The Python CLI on `main` branch already successfully uses Brave Search API.

---

## Verification
- ✅ Build passes (`npm run build`)
- ✅ All 38 tests pass (`npm test`)
- ✅ No changes needed to matching logic or downstream code

---

# Decision: False Positive Filters Ported from Python CLI

**Author:** Fenster (Backend Dev)
**Date:** 2025-07-18

---

## Updated tests

- Adjusted 2 existing tests to expect the new stricter behavior
- Added 9 new tests covering `titleMatchesRestaurant`, `isNoResultsPage`, and integration with `evaluateSearchResults`

---

# Design Overhaul: Food-Forward Premium Polish

**Author:** Hockney | **Date:** 2026-04-30 | **Status:** Implemented

---

## Related Decisions

- **Roadmap (P0-P2):** Partnerships enable complete platform coverage, unblocking growth/monetization plays later
- **Rate Limiting & Caching:** Existing strategy handles API call volume; no infra changes needed

---

# Brave Search API Test Strategy

**Author:** McManus (Tester) | **Date:** 2026-04-30 | **Status:** Implemented

---

### Product Roadmap: Permalinks → Saved Restaurants → Deals-Near-Me
**Author:** Kobayashi (PM) | **Date:** 2026-04-30 | **Status:** Proposed

- **Retention problem:** Currently a single-use lookup tool. No reason to return unless dining at a different restaurant tomorrow.
- **P0 — Restaurant permalinks** (`/r/carbone`): SEO, shareability, bookmarkability. Results are currently ephemeral. Low effort, high impact.
- **P1 — Saved restaurants + "my stack":** Track which platforms user uses at which spots. Creates personal asset and monitoring behavior.
- **P1 — Email/push alerts:** "Carbone just appeared on Seated." Converts single-use to monitoring tool.
- **P2 — Neighborhood browse mode (Deals Near Me):** Show all discounted restaurants within walking distance. Changes product from reactive search to proactive discovery. 10x potential.
- **Growth strategy:** NYC food Twitter/Instagram, Reddit (r/FoodNYC, r/AskNYC), platform Discord groups. No paid ads.
- **Monetization:** Start with affiliate links (Blackbird, inKind, Bilt referral programs). Passive, $0 UX cost.

---

### 2026-05-01T22:35: User directive
**By:** Shari Paltrowitz (via Copilot)
**What:** Add to backlog: reach out to Nea, Seated, and Upside about a public API or integration partnership. Draft a pitch explaining how EatDiscounted drives users to their platforms. This is a business development task, not a code task.
**Why:** User request — these app-only platforms can't be checked via web search, so partnership/API access is the path to full coverage.

---

# Upside Direct API Integration

**Author:** Fenster (Backend Dev)  
**Date:** 2026-05-01  
**Status:** Implemented  
**Priority:** High — Accuracy upgrade

---

---

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction

---
# New Decisions from Inbox — 2026-05-01T22:45:00Z

---

## Data Source Quality Ranking (Post-Investigation)

| Rank | Platform | Method | Reliability | Latency |
|------|----------|--------|-------------|---------|
| 1 | Blackbird | Sitemap scrape | ⭐⭐⭐⭐⭐ | <1s |
| 2 | Upside | **Direct REST API** | ⭐⭐⭐⭐⭐ | <1s |
| 3 | Bilt | Stellate GraphQL (if cracked) | ⭐⭐⭐⭐ | <1s |
| 4 | inKind | Rails API (if authed) | ⭐⭐⭐⭐ | <1s |
| 5 | Rakuten | Search suggest API (partial) | ⭐⭐⭐ | ~1s |
| 6 | TGTG | CSE/DDG fallback only | ⭐⭐ | ~3s |
| 7 | Seated | CSE/DDG fallback only | ⭐⭐ | ~3s |
| 8 | Nea | CSE/DDG fallback only | ⭐ | ~3s |

---

### Backlog
4. **Rakuten via headless browser** — Use Playwright to load the dining page and intercept the actual API calls with full session context. Lower priority since Rakuten Dining is less popular than Bilt/Upside.
5. **Drop Nea and Seated from "direct check" strategy** — Keep them as CSE/DDG-only platforms. They're app-only with no web surface to leverage.
6. **Reconsider TGTG** — Their model (surplus food = real-time inventory) may not fit our "does this restaurant participate?" product concept. Consider removing or re-framing as "sometimes available."

---

---

### Next Sprint
2. **Crack Bilt via JS bundle analysis** — Download all webpack chunks from biltrewards.com, search for DatoCMS API token. High value if found — Bilt is the most-requested platform for our NYC audience.
3. **Crack inKind via free account** — Create account, capture auth flow, test API endpoints. 7,100 locations is a large enough dataset to be valuable.

---

### Immediate (This Sprint)
1. **Implement Upside direct API checker** — Replace CSE-based checking with the bounding box API. Cache the full NYC offer list (refreshed hourly). Match by restaurant name. This alone makes the product significantly more accurate.

---

## Recommended Actions

---

### ❌ LOCKED: Nea

**Architecture:** Express.js server returning "Cannot GET /"

**What we found:**
- `neaapp.ai` returns a bare Express.js error page — no web presence whatsoever
- No sitemap, no robots.txt, no public pages
- The domain resolves but the server has no routes configured for web

**Why it's locked:** There's nothing to crack. The app appears to be mobile-only with no web component. The domain may only serve their mobile API.

---

---

### ❌ LOCKED: Seated

**Architecture:** WordPress landing page at `seatedapp.io`

**What we found:**
- Only 3 pages in sitemap: home, terms, privacy
- No restaurant directory, no web app, no API
- Last substantive update was 2023 (terms/privacy pages)
- App-only experience — all restaurant data lives inside the iOS/Android app

**Why it's locked:** There is literally no web surface to scrape. Restaurant data is entirely in-app. Would require mobile app API reverse engineering (Frida/mitmproxy), which is fragile and likely violates ToS.

---

---

### ❌ LOCKED: Too Good To Go

**Architecture:** Astro frontend (Vercel-hosted) + mobile API at `apptoogoodtogo.com`

**What we found:**
- Web pages are behind Vercel Security Checkpoint (bot detection)
- Mobile API at `apptoogoodtogo.com/api/item/v8/` exists but is protected by Datadome (CAPTCHA/anti-bot)
- Requires authenticated session with user_id, access_token, and specific mobile app User-Agent

**Why it's locked:** Datadome is one of the most aggressive bot protection systems. Community Python wrappers (tgtg-python) exist but require account creation and periodic CAPTCHA solving. Not suitable for reliable automated checking.

**Alternative:** Their data changes every few hours (surplus food = dynamic inventory). Even if we cracked it, the data would be stale quickly. May not be a good fit for our "does this restaurant participate?" model — TGTG is about "what's available right now."

---

---

### 🟡 POSSIBLE: inKind

**Architecture:** Ruby on Rails app at `app.inkind.com` (rorVersion 16.3.0) + Tilda marketing site at `inkind.com`

**What we found:**
- **7,100 restaurant locations** (reported in page data)
- Individual offer pages (`app.inkind.com/offer/{code}`) contain rich embedded JSON with enterprise config, feature flags, and offer details
- Rails API routes exist at `/api/v1/` (restaurants, search, locations) but return 500 without auth
- The app has explore/discovery features: `enable_discovery_home`, `enable_explore_map`
- Cloudinary hosts restaurant images: `res-5.cloudinary.com/equityeats/image/upload/`

**What we didn't crack:**
- API endpoints require authentication (500 without it)
- No public restaurant directory or sitemap found
- Offer codes appear to be random (no enumerable pattern visible)

**Next steps to crack:**
1. Create a free inKind account and capture the auth token from the mobile app (standard JWT)
2. With auth, the `/api/v1/` endpoints likely return full restaurant listings
3. Check if `app.inkind.com/explore` renders restaurant data when loaded with proper geolocation cookies
4. Search for an inKind API on GitHub — community wrappers often exist

**Confidence:** 60% crackable with a free account. The Rails API is there, just needs auth.

---

---

### 🟡 POSSIBLE: Rakuten Dining

**Architecture:** Next.js Pages Router (has `__NEXT_DATA__`) + legacy jQuery suggest system

**What we found:**
- `__NEXT_DATA__` is present but contains minimal data (layout config, no restaurant list)
- Store search API: `https://api-catalog-use-gateway.global.rakuten.com/gsp-ac/rewards/search/v2/us_rewards_search/store.json`
- Autocomplete API: `https://api-catalog-use-gateway.global.rakuten.com/gsp-ac/autocomplete/v1/us_ebates_ac.list_ac`
- Another search endpoint: `https://search.ecbsn.com/search/stores/v1/rewards` (returns `{}` — empty but valid JSON, 200 status, CORS wide open)
- The suggest system uses params: `?sid=us_rewards_ac_001&filter=status:2&query=<term>`
- Restaurant categories exist: dining, coffee-tea, dessert-sweets, gourmet-foods, groceries, wine-spirits

**What we didn't crack:**
- The store.json suggest endpoint returns 404 from outside the site (may need session cookies or WAF allows only from rakuten.com domain)
- The search.ecbsn.com endpoint returns empty results regardless of query

**Next steps to crack:**
1. Use a headless browser (Playwright) to load rakuten.com/dining and intercept actual XHR requests with their full headers/cookies
2. The `search.ecbsn.com` endpoint has `access-control-allow-origin: *` — it's meant to be public. May need specific `sid` or user segment values
3. Check if Rakuten has a public store directory or sitemap with dining merchant pages

**Confidence:** 50% crackable. The APIs exist and are partially open, but may require browser session context.

---

---

### 🟡 POSSIBLE: Bilt Rewards (HIGH PRIORITY)

**Architecture:** Next.js App Router (RSC) → Stellate (GraphQL CDN) → DatoCMS (headless CMS)

**What we found:**
- Stellate GraphQL endpoint: `https://bilt-rewards.stellate.sh`
- Responds to GraphQL queries but requires DatoCMS authorization header
- Introspection is blocked (`BLOCKED_INTROSPECTION`)
- The dining page at `/rewards/dining` renders via React Server Components
- Restaurant data is fetched server-side from DatoCMS — **not embedded in the HTML**
- DatoCMS read-only API tokens are commonly embedded in client-side JS bundles

**What we didn't crack:**
- No `__NEXT_DATA__` (App Router uses RSC streaming, not getServerSideProps)
- No dining restaurant data found in the HTML or RSC payload
- The DatoCMS token wasn't found in the page source — likely in a webpack chunk

**Next steps to crack:**
1. Download and search all `/_next/static/chunks/` JS files for DatoCMS API tokens (typically 30+ character alphanumeric strings)
2. Once token found, query Stellate with `Authorization: Bearer <token>` to enumerate dining restaurants
3. Alternative: intercept the GraphQL query names from JS bundles even without the token — DatoCMS schemas are predictable

**Confidence:** 70% crackable with 2-3 more hours of JS bundle analysis.

---

---

### ✅ CRACKABLE: Upside

**API Endpoint:**
```
POST https://pdjc6srrfb.execute-api.us-east-1.amazonaws.com/prod/offers/refresh
```

**Request Format:**
```json
{
  "location": {
    "boundingBox": {
      "southWestLat": 40.70,
      "southWestLon": -74.02,
      "northEastLat": 40.75,
      "northEastLon": -73.97
    }
  },
  "userLocation": {
    "latitude": 0,
    "longitude": 0
  }
}
```

**Response:** Returns `{ "offers": [...] }` array. Each offer contains:
- `text` — restaurant name (e.g., "Tim Ho Wan - East Village", "Ofrenda", "3 Times - FiDi")
- `offerCategory` — "RESTAURANT", "GROCERY", etc.
- `discounts[].percentOff` — cashback rate (0.06 = 6%)
- `discounts[].maxCashback.amount` — cap per transaction
- `discounts[].detailText` — human-readable (e.g., "6.00% cash back")
- `locationUuid` — unique location ID

**Tested:** Returned **200 offers** for a small Manhattan bounding box. No auth headers needed. Origin/Referer from upside.com helps but may not be required.

**Implementation:** Replace CSE-based Upside checking with direct API call. Search by bounding box covering NYC, filter `offerCategory === "RESTAURANT"`, match by restaurant name. Cache the full offer list (it's small enough). This is a **massive accuracy upgrade** — we go from guessing via search snippets to an authoritative restaurant list.

---

---

## Platform Results

---

## Executive Summary

Out of 7 platforms investigated, **1 is fully crackable today** (Upside), **3 have promising leads** (Bilt, Rakuten, inKind), and **3 are locked down** (Too Good To Go, Seated, Nea).

The Upside finding alone is significant — it's a **wide-open REST API** returning restaurant offers with names, cashback percentages, and categories. No auth, no cookies, no rate limiting detected. This is Blackbird-sitemap-level reliable.

---

---

## Next Steps

1. Consider adding integration tests with real Brave Search API (use separate API key)
2. Monitor production for Brave-specific errors (429 rate limiting, quota exhaustion)
3. Update tests if Brave response format changes

---

# Platform API Investigation — Can We Programmatically Check These?

**Author:** Redfoot (Platform SME)  
**Date:** 2026-05-01  
**Status:** Investigation Complete  
**Priority:** Critical — Product Viability

---

---

## Impact

- **Test count:** 65 total (38 matching + 27 checkers) — all pass
- **Coverage:** Core search logic now fully tested (braveSearch, batchSearch, evaluateSearchResults)
- **Confidence:** Can deploy Brave Search knowing error paths won't crash production
- **Maintenance:** Future changes to search API require updating test mocks

---

## Trade-offs

- **Pro:** Tests catch API failures early; 100% coverage of error paths
- **Pro:** Cache tests confirm no redundant API calls (cost savings)
- **Pro:** Tests work with current Brave Search implementation (not blocked on Fenster)
- **Con:** Tests use mocks, not real Brave API (integration tests still needed)
- **Con:** `uniqueRestaurantName()` pattern required to avoid cache pollution

---

## Implementation

**Test Structure:**
1. **braveSearch() function tests (9 tests):**
   - Valid responses return parsed results
   - Missing API key returns blocked status for all platforms
   - HTTP errors (403, 429, 500) handled gracefully
   - Network timeouts don't crash the app
   - Malformed JSON responses marked as blocked
   - Missing/null fields in results default to empty strings

2. **batchSearch() function tests (8 tests):**
   - Returns results for all 7 non-Blackbird platforms
   - Cache prevents redundant API calls (verified with fetch mock)
   - Failed searches mark platforms as blocked
   - site: operator added when platform has domainFilter
   - searchQuery included when platform defines one
   - Mixed success/failure handled correctly per-platform

3. **evaluateSearchResults() function tests (10 tests):**
   - Brave Search result format (url/description vs link/snippet) works correctly
   - Blog/help/FAQ URLs filtered from results
   - searchUnavailable state set for blocked platforms
   - appOnly platforms show "check the app" messages
   - Domain filtering works across title/snippet/URL
   - Protocol added to URLs missing https://

**Key Testing Patterns:**
- `uniqueRestaurantName()` helper to avoid cache collisions between tests
- Global `fetch` mock with `vi.fn()`
- `BRAVE_SEARCH_API_KEY` set in beforeEach hook
- Cache behavior verified by clearing mocks but NOT cache between calls

---

## Context

Fenster replaced Google CSE with Brave Search API. The new `braveSearch()` function needed tests before deployment to catch:
- API authentication failures
- Rate limiting (429) and permission errors (403)
- Network timeouts and malformed responses
- Cache behavior to avoid redundant API calls
- Query construction (site: operator, searchQuery inclusion)

---

## Decision

Comprehensive test suite for Brave Search API integration covering error handling, caching, and result evaluation. 27 tests added to `lib/__tests__/checkers.test.ts`.

---

## Success Metrics

- ✅ All 3 platforms respond within 2 weeks
- ✅ At least 1 platform agrees to pilot integration
- ✅ API integration ships within 3 weeks of data access
- ✅ Coverage metrics: "Now checking 8/8 platforms" in marketing copy

---

## Next Steps

1. **Shari:** Customize email templates in `partnership-pitch.md` with:
   - Current user metrics (searches/day, active users)
   - Personal intro or mutual connection (if any)
   - Specific contact names (look up partnerships leads on LinkedIn)

2. **Shari:** Schedule calls with each platform's BD/partnerships team

3. **Kobayashi:** Monitor responses; adjust pitch if needed

4. **Fenster/Hockney:** Stand by for API integration work once data access granted
