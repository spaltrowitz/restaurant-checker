# Team Decisions Log — EatDiscounted

## 2026-04-30: Ship-Readiness Evaluation Session

### Participants
- **Keaton** (Lead) — Architecture & ship-readiness
- **Hockney** (Frontend Dev) — Frontend/UI quality & UX
- **Fenster** (Backend Dev) — Backend reliability & API
- **McManus** (Tester) — Test coverage & error handling

---

## Key Findings

### Executive Summary
EatDiscounted is a well-architected, clean Next.js app with solid fundamentals. It compiles cleanly, has thoughtful UX with SSE streaming, and good TypeScript discipline. **It is not ready to ship broadly**, primarily due to:
1. Google CSE free tier quota (100 queries/day = ~14 user searches before exhaustion)
2. Zero rate limiting — a bot could burn the entire daily quota in minutes
3. Zero automated tests — every code path depends on manual verification
4. Zero server-side error UI — users cannot distinguish failures from "not found" results

### Architecture: 🟢 Ship-ready
- Clean separation of concerns (lib/, components/, app/api/, app/)
- SSE streaming for progressive results is a smart pattern
- Strong TypeScript typing throughout
- Community reporting layer with SQLite is clever
- Card conflict detection is well-modeled
- Minor: SearchResults.tsx is ~200 lines; consider extracting SSE logic into custom hook

### Dependencies: 🟢 Ship-ready
- Only 3 runtime deps (next, react, better-sqlite3) — excellent
- All actively maintained
- No bloat, minimal attack surface

### Security: 🔴 Must fix before shipping
**Critical issue: No rate limiting on `/api/check` endpoint.**
- Each user search fires 7 parallel Google CSE queries (for non-Blackbird platforms)
- 100 free queries/day ÷ 7 calls/search ≈ 14 user searches before quota death
- A single bot or viral moment exhausts the daily limit in minutes
- After quota exhaustion, entire app returns "Search unavailable" with no user explanation

**Secondary issues:**
- Google API key is stored in `.env.local` (not tracked by git, but risky for broad deployment)
- No CORS configuration on API routes
- Query string sent to Google CSE has no sanitization (special chars could cause unexpected behavior)
- IP hashing salt is hardcoded; should be in `.env`

### Build & Deploy Readiness: 🟡 Ship with caveats
**Build: ✅ Passes cleanly** (2.7s, static pages pre-render correctly)

**Lint: ⚠️ 6 errors**
- All in `SearchResults.tsx:112` — React's `react-hooks/set-state-in-effect` rule
- Issue: `startSearch(query)` inside `useEffect` triggers linter
- Requires refactoring (ref-based approach or `useSyncExternalStore`)

**Deployment config: ❌ None**
- No Dockerfile, vercel.json, fly.toml, or CI/CD pipeline for the app
- `better-sqlite3` requires native binary — Vercel/serverless needs external packages config
- SQLite file writes to `process.cwd()` — won't persist on serverless platforms
- **Decision required:** Vercel (with complex external packages + persistent store) vs. VPS (simpler, SQLite works natively)

### Error Handling: 🟡 Ship with caveats
**What's good:**
- Blackbird sitemap fetch has try/catch + 15s timeout ✅
- Google CSE search has try/catch + 10s timeout ✅
- SSE stream consumer handles network errors ✅
- Community reports fail silently (acceptable — supplementary) ✅
- Report POST endpoint catches JSON errors ✅
- API routes return proper HTTP status codes ✅

**Critical gaps:**
- **No global error boundary** — if SearchResults throws, entire page crashes
- **Frontend has `catch {}` empty blocks** — errors are silently swallowed, users see stale partial results
- **No user-visible error state** — when search fails, user sees "found on 0 platforms" (indistinguishable from real "not found")
- **SSE route has NO try/catch around stream body** — if Promise.all throws, stream aborts with no done signal; client hangs showing spinners
- **No logging anywhere** — zero `console.error()` in any route; production failures are invisible
- **Non-null assertion on Blackbird lookup** — if Blackbird is removed from platforms array, crashes silently

### External Dependency Risk: 🟡 Ship with caveats
**README/Documentation mismatch:**
- README references DuckDuckGo + `site:` operators
- Actual code uses Google CSE
- Needs immediate update

**Google CSE constraints:**
- 100 free queries/day (hard limit)
- Paid tier: $5/1000 queries (~143 searches per $5)
- Rate limit errors (HTTP 429) not explicitly handled differently from other errors

**Blackbird sitemap dependency:**
- Single point of dependency — if format changes, checker silently returns "not found"
- Regex-based XML parsing is fragile; doesn't support sitemap indices

**Fundamental design limitation:**
- Web search cannot find app-only platforms (Upside, Seated, Nea, Rakuten)
- App honestly communicates this to users ✅

### Frontend Quality: 🟡 Ship with caveats
**What's good:**
- Clean component decomposition with clear concerns ✅
- Proper TypeScript throughout ✅
- Smart Suspense boundaries ✅
- All 4 result states handled (loading, found, not-found, unavailable) ✅
- Community reporting is self-contained ✅
- SSE parsing with buffer management is correct ✅
- Performance is solid (React 19, minimal deps) ✅

**Accessibility: 🔴 MUST FIX**
- Search input has no `<label>` or `aria-label` — unlabeled for screen readers
- No `aria-live="polite"` region for streaming results
- Status icons are emoji-only with no text alternatives
- Loading spinner has no accessible text
- Nav links have no `aria-current="page"`
- `<nav>` has no `aria-label`
- Popular search buttons lack context for screen readers
- No skip-to-content link
- `autoFocus` on search input is anti-pattern (disorienting for screen readers)
- No visible focus indicators beyond browser defaults
- Color contrast on gray-400 elements likely below WCAG AA

**Responsive Design: 🟡 SHIP WITH CAVEATS**
- Works OK up to 768px but feels phone-like on large screens
- No explicit breakpoints — could use two-column layout for desktop
- Touch target sizes may be below 44×44px minimum
- Popular search pills could overflow on narrow screens

**Loading/Error States: 🟡 SHIP WITH CAVEATS**
- Per-card spinners during SSE ✅
- Summary text updates progressively ✅
- **CRITICAL: No error state when search fails** — user sees nothing, results appear empty (looks like "not found")
- No network error handling — if user loses WiFi mid-search, partial results with no indication of failure
- No empty state message for "not found on any platform"
- No retry mechanism
- No `error.tsx` boundary
- No `not-found.tsx` for bad routes
- No `loading.tsx` for page transitions

**SSE Consumer Bugs:**
- **🔴 No AbortController** — concurrent searches leak connections; first stream overwritten but reader never aborted
- No timeout — server hang causes infinite client wait
- No reconnection logic
- Server never explicitly handles the `done` event
- `useEffect` dependency chain is fragile

**UX Flow: 🟢 SHIP-READY**
- Intuitive search → results streaming → per-platform status ✅
- Popular searches enable zero-friction onboarding ✅
- Platform info page well-organized ✅
- Community reporting is clever for app-only platforms ✅
- Conflict warnings surface card-linking gotchas ✅
- Copy is clear, friendly, informative ✅

**UX Issues (minor):**
- No search-on-type (Enter key works, but consider debounced auto-search)
- No "clear search" button
- Minimum query length (2 chars) has no validation feedback
- Footer disclaimer could be clearer

**Polish: 🟡 SHIP WITH CAVEATS**
- Metadata/title/description set properly ✅
- Favicon exists ✅
- `html lang="en"` set ✅
- Consistent color palette & typography ✅
- **Missing:** Open Graph / Twitter meta tags (critical for social sharing)
- **Missing:** `manifest.json` / PWA metadata
- **Missing:** `robots.txt`
- **Missing:** Custom `404` page
- **Missing:** Custom `error.tsx` page
- **Missing:** `public/` directory for static assets
- **Missing:** `viewport` export (using Next.js defaults)
- **Missing:** Branded favicon (using default vercel icon)

### Backend Reliability: 🟡 Ship with caveats
**API Design (SSE Endpoint): 🟡 SHIP WITH CAVEATS**
- Clean SSE format with proper headers ✅
- `type: "done"` terminal event ✅
- Typed stream events ✅
- **Issue:** SSE not actually streaming — `Promise.all` runs all external calls first, then enqueues results in burst
- Missing SSE `id:` field (can't resume on reconnect)
- Missing `retry:` field (uses browser default)
- Missing heartbeat/keepalive (long proxy timeouts could kill connection)
- **Recommendation:** Either lean into SSE properly or simplify to JSON response

**Blackbird Sitemap: 🟡 SHIP WITH CAVEATS**
- 15s timeout is appropriate ✅
- Error handling is graceful ✅
- **Issue:** Fetches entire sitemap on every request (no caching)
- Regex-based XML parsing is fragile (no CDATA support, namespace handling, sitemap indices)
- Slug matching assumes kebab-case format
- **Recommendation:** Cache with 5-minute TTL; consider proper XML parser

**Rate Limiting: 🔴 MUST FIX**
- Exported constant `RATE_LIMIT_DELAY = 2000` is **dead code** — never used
- Zero rate limiting on any endpoint
- No per-IP limiting on `/api/check` — each call triggers 7 Google CSE + 1 sitemap fetch
- A bot could exhaust 100 daily Google queries in <15 seconds
- No per-IP limiting on `/api/report` — could spam DB with fake reports
- No global concurrency control

**Database Layer: 🟡 SHIP WITH CAVEATS**
- WAL mode enabled ✅
- Schema created lazily with `CREATE TABLE IF NOT EXISTS` ✅
- IP hashing with SHA-256 ✅
- UNIQUE constraint prevents duplicate reports ✅
- Parameterized queries (no SQL injection) ✅
- **Issue:** Singleton connection may not survive Next.js hot reload
- No connection cleanup (`process.on('exit')` handler)
- Hardcoded salt (`"eatdiscounted-salt"`) should be env var
- No migrations strategy
- **SQLite in production is a blocker for serverless** — won't persist between invocations
- No max-length check on restaurant_name in POST endpoint

**Input Validation: 🟡 SHIP WITH CAVEATS**
- `/api/check`: validates query 2-100 chars ✅
- `/api/report`: validates restaurant/platform present + platform against known list ✅
- `/api/reports`: validates query length ≥ 2 ✅
- `norm()` strips non-alphanumeric (inherent sanitization) ✅
- Parameterized SQL (no injection) ✅
- **Issue:** No XSS sanitization on stored data (React auto-escapes JSX, but risky if dangerouslySetInnerHTML added)
- Search query passed to Google CSE with no sanitization
- **No CSRF protection on POST /api/report**
- `/api/reports` missing max-length check (unlike `/api/check`)

**Scalability: 🔴 MUST FIX**
1. **Google CSE quota (100/day = ~14 unique searches)** — hard ceiling; everything else is academic
2. **Blackbird sitemap fetch every request** — 100 concurrent users = 100 simultaneous downloads from Blackbird
3. **SQLite under concurrency** — WAL mode helps but has single-writer limitation
4. **No CDN/caching layer** — every request does full external API work
5. **Memory** — Blackbird sitemap loaded fully into memory; large sitemaps cause GC pressure
- **Recommendation:** Caching is highest-leverage fix — 1-hour TTL on search results, 5-minute on sitemap = 10-50x capacity multiplier

**Secrets / Config: 🔴 MUST FIX**
- **`.env.local` is NOT in `.gitignore`** — Google CSE key is trackable by git (credential leak risk)
- Hardcoded salt in `db.ts` should be in `.env`
- `.env.local.example` exists with clear setup ✅
- Code checks for placeholder values ✅
- **Missing:** Runtime validation of required env vars at startup
- **Missing:** Documentation of 100 queries/day limit in example

### Test Coverage: 🔴 MUST FIX
**Zero tests exist:**
- No `__tests__/` directory
- No `*.test.ts` or `*.spec.ts` files
- No test framework installed
- No `test` script in `package.json`
- Every code path verified only by manual clicking

**Critical test gaps (by risk):**
1. **matchesRestaurant()** (CRITICAL) — core algorithm for "found" decision; false positives/negatives directly hurt user experience
2. **norm() & slugVariants()** (CRITICAL) — strips all non-ASCII; restaurants with accents/Unicode will be mangled
3. **evaluateSearchResults()** (HIGH) — complex branching logic; one wrong branch = wrong result
4. **checkBlackbird() XML parsing** (HIGH) — regex-based, fragile against format changes
5. **SSE stream construction** (HIGH) — no test that client can parse server's output
6. **DB operations** (MEDIUM) — parameterized queries safe from injection but no test for concurrency/WAL contention
7. **detectCardConflicts()** (MEDIUM) — untested; easy to break when adding platforms

**Unicode/Accent Bug (Critical):**
- `norm()` strips all non-alphanumeric: `"Café"` → `"caf"`, `"L'Artusi"` → `"lartusi"`, Unicode → `""`
- Accent is deleted, not transliterated
- Searching "Café" won't match "Cafe"
- Pure Unicode names (CJK, Cyrillic, Arabic) normalize to empty string
- If restaurant name has only short words, `matchesRestaurant` false-negative (AB, Bo's, etc.)
- If restaurant name is all Unicode, `words.length = 0`, function returns false for "word.length > 0" (correct) OR if all words < 3 chars after filter, returns false for unrelated reasons

**Edge Cases Not Handled:**
- Very long names: API caps at 100 chars but `<input>` has no max-length attribute
- Special characters in queries could break Google CSE searches
- SQL injection: Mitigated by parameterized queries ✅
- XSS via restaurant name: React auto-escapes ✅ but SSE embeds user query in Google search with no sanitization

---

## Critical Path to Ship

### 🔴 Blockers (Must fix before launch)
| Priority | Issue | Effort | Impact |
|---|---|---|---|
| 1 | **Add rate limiting** to `/api/check` — 5 req/IP/minute prevents quota death | Half day | Without this, first viral moment = total service failure |
| 2 | **Implement response caching** — cache Google CSE results by query for 1 hour | Half day | Multiplies effective capacity by 10-50x |
| 3 | **Add visible error state UI** — when fetch fails or all platforms unavailable, tell user | 1 hour | Critical UX: users currently see failure as "not found" |
| 4 | **Fix lint errors** in `SearchResults.tsx` — `useEffect` + setState pattern | 1-2 hours | Required for clean build |
| 5 | **Add `.env.local` to `.gitignore` & rotate API key** — check git history for exposure | 30 min | Security: credential leak risk |
| 6 | **Add AbortController to SSE consumer** — prevent connection leaks | 15 min | Real bug with concurrent searches |
| 7 | **Write tests for core matching logic** — `matchesRestaurant()`, `norm()`, `slugVariants()` | 2 hours | Zero confidence in deployments; Unicode bug undetected |
| 8 | **Fix Unicode normalization** — transliterate accents before stripping | 1 hour | Breaks searches for accented restaurant names |

### 🟡 Should-fix (High value, schedule immediately)
| # | Issue | Effort |
|---|---|---|
| 9 | Update README — remove DuckDuckGo refs, document Google CSE setup | 1 hour |
| 10 | Add global error boundary (`app/error.tsx`) | 30 min |
| 11 | Add basic tests for `evaluateSearchResults()` & SSE round-trip | 2 hours |
| 12 | Add OG/Twitter meta tags for social sharing | 30 min |
| 13 | Add structured logging to all API routes | Half day |
| 14 | Add custom `not-found.tsx` and `loading.tsx` pages | 1 hour |
| 15 | Add accessibility fixes (aria-label, aria-live, skip link, focus styles) | Half day |
| 16 | Decide deployment platform (Vercel + external packages vs. VPS) | 1 hour |
| 17 | Add deployment config (Dockerfile or vercel.json) | Half day |

### 🟢 Nice-to-have (Post-launch)
| # | Issue | Effort |
|---|---|---|
| 18 | Implement Blackbird sitemap caching | 1 hour |
| 19 | Extract shared types (CommunityReportInfo, StreamEvent) | 30 min |
| 20 | Add React.memo to ResultCard | 15 min |
| 21 | Add responsive breakpoints for larger screens | 1 hour |
| 22 | Add "clear search" button | 15 min |
| 23 | Clean up legacy Python CLI or move to separate dir | 30 min |
| 24 | Add bundle analysis | 15 min |

---

## Verdicts

| Reviewer | Overall | Recommendation |
|---|---|---|
| **Keaton (Lead)** | 🟡 Ship with caveats | Not ready for broad shipping today. Ready within 2-3 focused sprint days. |
| **Hockney (Frontend)** | 🟡 Ship with caveats | Bones are great; fix accessibility & error handling before shipping. |
| **Fenster (Backend)** | 🔴 Not ship-ready | Three critical fixes: caching, rate limiting, fix .env.local. Then shippable for soft launch. |
| **McManus (Tester)** | 🔴 Not ship-ready | Zero tests + quota exhaustion + no error UI = broken day one. Fix top 7 items. |

---

## Team Consensus

**Bottom line:** This is a **well-built v0.1 personal tool** with clean architecture, good TypeScript, and thoughtful UX. The gap to "ship broadly" is mostly **operational**: rate limiting, response caching, error UI, tests, accessibility, and deployment strategy. The codebase itself is solid.

**Estimated effort to ship:** 2-3 focused days.

**Highest-leverage fixes (in order):**
1. Rate limiting (prevents quota death)
2. Response caching (multiplies capacity)
3. Error UI (fixes worst UX gap)
4. Tests for core logic (restores confidence)
5. Accessibility (enables all users)
