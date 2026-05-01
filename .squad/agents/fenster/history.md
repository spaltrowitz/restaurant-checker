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
