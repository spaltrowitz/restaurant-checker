# Project Context

- **Owner:** Shari Paltrowitz
- **Project:** EatDiscounted — a Next.js web app that checks 8 dining discount platforms for any restaurant name. Results stream via SSE. Also has a Python CLI.
- **Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, better-sqlite3, SSE streaming, Python CLI
- **Created:** 2026-04-30

## Session: 2026-04-30 — Ship-Readiness Evaluation

**Role:** Backend Dev — Backend reliability & API review  
**Participants:** Keaton, Hockney, Fenster, McManus  
**Outcome:** 🔴 Not ship-ready — three critical fixes required before launch

**Backend audit findings:**
- API design (SSE) is clean but not actually streaming: all results in burst despite SSE complexity
- **Google CSE dependency:** 100 free queries/day = ~14 user searches before quota exhaustion (hard ceiling)
- **Rate limiting:** 🔴 Zero actual rate limiting; RATE_LIMIT_DELAY constant is dead code
- **Error handling:** Backend is solid with timeouts and graceful failures; good input validation
- **Database:** WAL mode, UNIQUE constraints, parameterized queries ✅; but hot-reload fragility + SQLite on serverless blocker
- **Scalability:** No caching, no CDN, single-writer SQLite limitation; memory issue with large Blackbird sitemap
- **Secrets:** 🔴 `.env.local` NOT in `.gitignore` (credential leak risk); hardcoded salt in db.ts

**Three highest-leverage fixes:**
1. **Response caching** — cache Google CSE results by query for 1 hour (multiplies effective capacity 10-50x)
2. **Rate limiting** — 5 req/IP/min on `/api/check` (prevents quota death to first bot)
3. **Fix `.env.local` in `.gitignore` & rotate API key** — check git history for exposure

**Post-launch:** Blackbird sitemap caching, structured logging, proper XML parser, deployment platform decision.

---

## Learnings Summary

### Sprint Completion Log — Major Milestones (2026-04-30 to 2026-05-01)

#### 2026-04-30 Backend Hardening Sprint
1. **In-memory Caching:** Google CSE results (1hr TTL), Blackbird sitemap (5min TTL). Key: `restaurant::platform`. ~10-50x capacity multiplier.
2. **Rate Limiting:** Per-IP sliding window. `/api/check`: 5/min, `/api/report`: 10/min, `/api/reports`: 20/min. Returns 429 + `Retry-After`.
3. **Secrets audit:** `.env.local` already in `.gitignore`. Removed dead `RATE_LIMIT_DELAY` constant from `platforms.ts`.
4. **Key constraint:** In-memory cache lost on deploy. Fine for current single-process model; needs Redis if moving to serverless.

#### 2026-04-30 Google CSE Diagnosis & Fix
- **Root cause:** Google Cloud project missing "Custom Search JSON API" enablement. Every CSE request = 403 PERMISSION_DENIED.
- **Temporary fix:** DuckDuckGo HTML scraping fallback (sequential, ~14s for 7 platforms). Cached identically to CSE.
- **Action required:** Enable Custom Search JSON API in Google Cloud Console (Shari).

#### 2026-04-30 Brave Search Migration
- **Replacement:** DuckDuckGo fallback → Brave Search API (`https://api.search.brave.com/res/v1/web/search`).
- **Why:** Google CSE broken beyond quick fix. Brave: 2,000 free queries/month (20x CSE's 100/day). Same `site:` operator support.
- **Result:** Removed `GOOGLE_CSE_*` env vars, replaced with `BRAVE_SEARCH_API_KEY`. All 38 tests pass.

#### 2026-04-30 Unicode Transliteration
- **Problem:** `norm()` deleted accents instead of transliterating: "Café" → "caf" (wrong). 
- **Fix:** NFD decomposition + combining-mark stripping + special cases (ß→ss, æ→ae, œ→oe).
- **Trade-off:** CJK/Cyrillic still normalize to empty string (acceptable for NYC focus).

#### 2026-04-30 Platform Accuracy (Redfoot's Review)
- **Word-boundary matching:** `\b` regex prevents "robot" matching "Bo". Regex special chars escaped.
- **`site:` operator:** CSE queries now include `site:{domainFilter}`. Eliminates blog noise.
- **`slugVariants` wired in:** Now used in `checkBlackbird` for slug matching. No longer dead code.
- **Data corrections:** Rakuten `appOnly: false`, Seated `domainFilter: "seatedapp.io"`.

#### 2026-05-01 Direct API Integrations (Upside + Bilt)

**Upside Direct API:**
- **Endpoint:** `POST https://pdjc6srrfb.execute-api.us-east-1.amazonaws.com/prod/offers/refresh` (no auth)
- **Data:** 196 NYC restaurant offers (Manhattan bounding box). Returns: name, category, cashback %, description.
- **Implementation:** New `checkUpside()` function, 1-hour cache, Brave fallback.
- **Commit:** 5421369

**Bilt Rewards API:**
- **Endpoint:** `https://api.biltrewards.com/public/merchants` (REST, public, no auth)
- **Data:** 2,237 restaurants. Fields: name, neighborhood, cuisine, points multiplier, exclusive flag, lat/lng, rating.
- **Investigation:** Found DatoCMS token in JS bundles; REST API simpler than GraphQL.
- **Implementation:** New `checkBilt()` function, 1-hour cache, Brave fallback.
- **Commit:** 9fedd3b

**Result:** Third platform (after Blackbird + Upside) with authoritative data. No more search-snippet guessing.
- `lib/checkers.ts`: Added `checkUpside()`, `getUpsideOffers()`, `checkBilt()`
- `app/api/check/route.ts`: Both APIs run in parallel with Blackbird
- `lib/platforms.ts`: Upside `appOnly: false`, added `"api"` method type
- Tests: All 75 pass. Build green.

---

## Current Status

- **Ship-readiness:** 🟡 On track. Core APIs solid (Brave, Blackbird, Upside, Bilt). Caching + rate limiting deployed. All tests green.
- **Highest-impact work remaining:** Partnership outreach (inKind, TGTG, Rakuten). Product roadmap (permalinks, saved restaurants).
- **Technical debt:** Blackbird regex parser fragile (no XML parser). Next iteration: proper parsing + full sitemap index support.

## Next Steps for Backend
- [ ] Confirm Upside/Bilt scaling at high concurrency
- [ ] Evaluate inKind API auth flow for partnership
- [ ] Rakuten headless browser approach (if needed)
- [ ] Sitemap caching + index support

## Cross-Project Backend Knowledge (injected 2026-05-02)

The following learnings come from Backend agents across Shari's other personal projects.

### From MyDailyWin (Daruk, alumni: Dustin, Frozone)
- **Auth model:** Firebase Auth + Firestore rules with document ownership scoping (`ownerEmail` + `profiles/{id}/admins/{email}` subcollection). Firestore-only authority — never trust localStorage for authorization.
- **Cloud Functions:** Migrated from client-side EmailJS to Cloud Function (v2 `onCall`). Callable Cloud Functions auto-authenticate via Firebase Auth tokens (no CORS headers needed). Cold start ~1-2s acceptable for non-critical paths like invite emails.
- **CSP headers:** Content-Security-Policy enforced in `firebase.json` — script-src 'self' + CDN whitelist, no unsafe-inline for scripts. Update `connect-src` when migrating API dependencies.
- **Security patterns:** PROFILE_ID validated with `/^[a-zA-Z0-9_-]+$/` to prevent localStorage/Firestore path injection. innerHTML XSS risk across 45+ instances — always sanitize user-provided content. Debug `console.log` statements can leak API keys in production.
- **Firestore rules:** Original rules used only `request.auth != null` (too permissive). Needed per-user ownership scoping + field validation (`request.resource.data` checks). `taskProposals` with `create: if true` allowed unauthenticated writes.
- **localStorage reliance:** 20+ distinct key patterns with no Firestore-first strategy. localStorage sync gap means admin changes aren't visible until page reload.

### From Slotted (Zuko, alumni: Roy, Sam)
- **Security (critical patterns):** Never hardcode admin secret fallbacks — use fail-closed pattern (403 if env var unset). Strip sensitive fields (OAuth tokens, email, socialBattery) from all API responses via `stripSensitive()`. Always add new token fields to the sensitive fields list.
- **OAuth token storage:** Supabase Vault encryption (not plaintext DB columns). Pattern: `oauth_tokens` table stores vault secret UUIDs; SQL helper functions (`upsert_oauth_tokens`, `get_oauth_tokens`) are SECURITY DEFINER. Old columns renamed to `_deprecated` (not dropped) for rollback safety.
- **CORS:** Whitelist specific origins in the `cors` callback. The default `callback(null, true)` in the else branch = security hole (any domain can make authenticated requests). No-origin requests (mobile, curl) allowed intentionally via `!origin` check.
- **Google webhooks:** Must always return 200 (even on errors) or Google deactivates the endpoint. For stale sync tokens (410), clear and retry immediately in the same call.
- **Notification dedup:** Cascading dedup strategy — 1hr by relatedUserId → 5min by relatedId → 10min by title. Use unique notification types (e.g., `meetup_counter_proposed`, `meetup_declined`) for filter logic.
- **Race conditions:** Solved meetup confirmation race with AFTER UPDATE trigger + FOR UPDATE lock (atomic DB-level, not application-level). Use `ON CONFLICT` upserts instead of delete-then-insert for calendar sync.
- **API normalization:** Accept both camelCase and snake_case in request bodies for frontend compatibility. Return both `id` and `friendshipId` in responses.
- **Account deletion:** CASCADE from users table + cancel created meetups + notify participants + clear OAuth tokens from Vault + delete blocked_users. Must handle all FK references.
- **RLS policies:** `get_current_user_id()` SECURITY DEFINER helper maps `auth.uid()` → internal UUID. Separate SELECT/INSERT/UPDATE/DELETE policies per table. Service_role bypasses RLS.
- **Duplicate detection:** Before inserting meetups, check for existing proposed/confirmed with overlapping time where participant set is a subset. Return 409 with existing ID.
- **Friendship cooldown:** 30-day cooldown between deletion and re-friendship via `unfriended_at` timestamp.

### From Scrunch (Danny)
- **Supabase query optimization:** Use `select('id', { count: 'exact', head: true })` for count-only queries — transfers zero rows. Pattern: every count-only use case should use this instead of fetching rows and checking `.length`.
- **Dedup performance:** Replace O(n²) `filter+findIndex` with O(n) Map-based dedup. Matters for product catalogs and any list processing.
- **Parallel API calls:** Convert sequential `for` loops over external APIs to `Promise.all()`. Sequential fetches are the #1 latency killer.
- **TypeScript type drift:** When TS types drift from actual DB schema, the app silently degrades. `as unknown as Type` casts mask real errors. Consider using `supabase gen types` to keep types in sync.
- **Reddit/external search:** 4-6 keyword terms work best. Natural language queries return noise. Build domain-aware keyword extraction with a domain vocabulary to separate signal from noise.
- **Fallback UX:** Never disguise navigation/fallback actions as content items. When search fails, show clear status (error vs. no results) with actionable next steps.
- **Image sourcing:** INCIDecoder GCS has highest hit rate, then Ulta CDN (append `?w=400`, check placeholder hash), then Sephora CDN. Amazon (403), Walmart (404), Target (403) all block automated access.

### From HealthStitch (Wash)
- **Sync architecture:** WHOOP = backend-pull model (server fetches from API), Apple Watch = iOS-push model (iOS app pushes to backend). These are fundamentally different and need separate sync strategies.
- **Metric normalization (critical):** WHOOP RMSSD ≠ Apple SDNN for HRV. Must maintain separate baselines per source/metric — never compare cross-source directly. API responses should nest by source (`hrv.whoop`, `hrv.apple_watch`).
- **Dedup strategy:** `INSERT OR IGNORE` with unique indexes on `(user_id, source, external_id)`. Both WHOOP and HealthKit provide stable external IDs.
- **Background sync (iOS):** Anchored queries (not date-based) are more reliable for background delivery — no missed samples. Store anchors per-metric in UserDefaults; JWT in Keychain (not UserDefaults) for background access. Background URLSession requires writing payload to temp file before upload.
- **Sleep date normalization:** Always use start_at date ("night of" = when user went to bed) for consistency across sources.
- **SQLite performance:** Pre-compile prepared statements to module-level constants. WAL mode for concurrent reads. `INSERT OR IGNORE` for idempotent ingestion.
- **PostgreSQL migration gotchas:** Watch for SQLite-isms: `datetime('now')` (8× occurrences), `INSERT OR IGNORE` (3×), `date()` expressions (~20×), PRAGMAs (2×). `ON CONFLICT` upserts are PG-compatible as-is.

## Learnings

### 2025-07-14 Search Quality Audit & Improvements

**Matching logic overhaul:**
- Short restaurant names (≤3 chars like "Odo", "Bo") need word-boundary matching — substring inclusion causes massive false positives ("Bo" matched "robot").
- Empty/Unicode-only names normalized to empty string, which `"".includes("")` matches everything. Added explicit guard.
- "The" prefix is extremely common in NYC restaurants ("The Smith", "The Meatball Shop"). Strip it before matching to catch both forms.
- Word-boundary regex (`\b`) is essential for multi-word fallback matching to prevent "napkin" matching inside "unnapkin".

**titleMatchesRestaurant separator bug:**
- `norm()` strips `|`, `-`, `:` etc. before the separator split logic runs — the separator matching was dead code. Fix: split on the original (pre-normalized) title, then normalize each part. Worked before only by coincidence via the 30% ratio fallback.

**Bilt API national data:**
- The `/public/merchants` endpoint returns all 2,262 restaurants nationally with zero geo filtering. For an NYC-focused app, this means false positives for restaurants in other cities sharing the same name. Implemented server-side filtering by state ("NY") + city/zip prefix matching.

**Rewards Network cache bug:**
- `getRewardsNetworkMerchants()` computed a `cacheKey` per query but used a single global `rewardsNetworkCache` variable — so searching "Carbone" then "Tatiana" returned Carbone's cached results. Switched to a `Map<string, CacheEntry>` keyed by normalized query.
- Their API struggles with special characters: `L'Artusi` may not match while `LArtusi` does. Strip apostrophes and diacritics before sending to the API.

**Test count:** 75 → 80 tests. Build green.

### 2025-07-15 Pulsd NYC Platform Addition

**New platform integration:**
- Added Pulsd (pulsd.com) as 9th platform. Curated prepaid prix-fixe dining deals at 35-69% off in NYC.
- No dedicated API or checker needed — `batchSearch()` picks it up automatically via Brave Search with `site:pulsd.com` filtering.
- Adding a web-search-only platform is zero-effort: just add the entry to `PLATFORMS` array with correct `searchQuery` and `domainFilter`. The existing `batchSearch()` pipeline handles everything.
- Updated platform counts across homepage, about, platforms page, and README (8→9).
- All 80 tests pass, build green. Commit: 6820498.

### 2025-07-15 Restaurant.com Platform Addition

**New platform integration:**
- Added Restaurant.com as 10th platform. Discount dining certificates at 50-80% off face value, 500K+ restaurants nationwide.
- Same zero-effort pattern as Pulsd: add entry to `PLATFORMS` array, `batchSearch()` handles everything via Brave Search with `site:restaurant.com` filtering.
- Updated platform counts across homepage, about, and platforms pages (9→10). Also updated about page web search count (5→6).
- All 80 tests pass, build green. Commit: 3ae9071.

### 2025-07-16 API Coverage Expansion (Upside + Rewards Network)

**Upside: All 5 NYC boroughs**
- Expanded bounding box from Manhattan-only (40.7–40.82 lat, -74.02 to -73.93 lon) to all 5 boroughs (40.49–40.92 lat, -74.26 to -73.68 lon).
- Covers Staten Island, Brooklyn, Queens, Bronx in addition to Manhattan. Should roughly double restaurant count.
- Commit: 1b5d225.

**Rewards Network: Location parameter required**
- Tested API without `location` param: returns `"Invalid location:"` — location is mandatory.
- The existing 10001 (Midtown Manhattan) with 30-mile radius already covers all of NYC and most of the metro area. No change needed.
- A name-only national search would have been ideal but the API doesn't support it.

**All 80 tests pass, build green.**

### 2025-07-15 Pre-fetch Cache for Popular NYC Restaurants

**Problem:** Every search for a popular restaurant triggers 6 live Brave API calls (~2,000/month free tier). Repeat searches for "Carbone" or "Joe's Pizza" waste quota on identical results.

**Solution:** Three-tier cache hierarchy: in-memory (1hr TTL) → pre-fetch disk cache (24hr TTL) → live Brave Search.

**New files:**
- `data/popular-restaurants.ts` — Static list of 150+ popular NYC restaurants (fine dining, pizza, Asian, chains, brunch, etc.)
- `scripts/prefetch-cache.ts` — Standalone script (`npx tsx scripts/prefetch-cache.ts`) that pre-fetches Brave results for all restaurants × all web-search platforms. Rate-limited 1 req/sec. Saves to `data/search-cache.json`. Supports incremental runs (skips entries cached <24h).

**Changes to `lib/checkers.ts`:**
- Added `loadPrefetchCache()` — reads disk cache file, re-reads every 5 min max.
- Added `getPrefetchResults()` — looks up restaurant+platform in disk cache, returns null if stale (>24h) or missing.
- `batchSearch()` now checks: in-memory → prefetch disk → live Brave. Prefetch hits get promoted to in-memory cache.

**Key design decisions:**
- Prefetch cache is opt-in (run script manually or via cron), never blocks requests
- `data/search-cache.json` is gitignored — it's generated data, not source
- `scripts/` excluded from `tsconfig.json` so Next.js build doesn't typecheck standalone tooling
- `dotenv` added as devDependency for the prefetch script's env loading

**Impact:** Popular restaurant searches (the majority of traffic) serve instantly from cache. Unknown restaurants fall through to live Brave Search unchanged. Estimated 60-80% reduction in Brave API usage.

**All 80 tests pass, build green. Commit: 309c6f3.**

### 2025-07-16 Brave Search Improvements — Query Tuning, New Platforms, Deal Extraction

**Track 1 — Query tuning for low-hit platforms:**
- inKind: Removed `site:` restriction (0% hit rate — inKind pages poorly indexed). Now uses broader query `"restaurant name" inkind dining` with `domainFilter` for result validation only. Added `skipSiteOperator` boolean to Platform interface.
- Rakuten Dining: Tightened `domainFilter` from `rakuten.com` to `rakuten.com/dining`. Eliminates French shopping false positives (e.g. "revue carbone" on rakuten.fr) since non-dining URLs won't contain `/dining` in the path.

**Track 2 — 4 new web search platforms (10 → 14 total):**
- Groupon: discount deals, `groupon.com`
- LivingSocial: discount deals, `livingsocial.com`
- The Infatuation: curated deals (editorial), `theinfatuation.com`
- Eater: deal coverage (editorial), `eater.com`
- Added `"deals"` to `rewardType` union for editorial platforms that cover deals/events rather than offering direct discounts.
- All 4 flow through `batchSearch()` automatically — zero additional checker code needed.

**Track 3 — Deal detail extraction from snippets:**
- New `extractDealDetails(title, snippet)` function extracts earning info via regex patterns: cashback %, points multipliers, dollar/percent off, miles per dollar, save amounts, credit bonuses.
- `evaluateSearchResults()` now enriches the `details` field: `${title} — ${extracted}` when patterns found, title-only fallback otherwise.
- This turns opaque "Found on Groupon" results into actionable "Carbone Deal — 30% off" details.

**Key design decisions:**
- `skipSiteOperator` is opt-in per platform, not a global change. Only inKind uses it currently.
- Rakuten's `site:rakuten.com/dining` works because Brave Search treats the path as part of the site restriction.
- Editorial platforms (Infatuation, Eater) use `rewardType: "deals"` to distinguish from direct-discount platforms.

**Tests: 80 → 125 (all pass). Build green. Commit: c549cd4.**
