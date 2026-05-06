# Project Context

- **Owner:** Shari Paltrowitz
- **Project:** EatDiscounted — a Next.js web app that checks 8 dining discount platforms for any restaurant name. Results stream via SSE. Also has a Python CLI.
- **Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, better-sqlite3, SSE streaming, Python CLI
- **Created:** 2026-04-30

## Session: 2026-04-30 — Ship-Readiness Evaluation

**Role:** Tester — Test coverage & error handling audit  
**Participants:** Keaton, Hockney, Fenster, McManus  
**Outcome:** 🔴 Not ship-ready — zero tests + quota exhaustion + no error UI = broken day one

**Test & quality audit findings:**
- **🔴 Zero tests exist:** No test framework, no test files, no test script in package.json
- **🔴 Critical logic untested:**
  - matchesRestaurant() — core algorithm for "found" decision (CRITICAL)
  - norm() & slugVariants() — strips non-ASCII; Unicode restaurant names mangled (CRITICAL)
  - evaluateSearchResults() — complex branching logic (HIGH)
  - checkBlackbird() XML parsing — regex-based, fragile (HIGH)
  - SSE stream construction — no test that client can parse server output (HIGH)
- **🔴 Unicode normalization bug:** "Café" → "caf", "L'Artusi" → "lartusi", CJK/Cyrillic → ""
  - Produces false positives (all-Unicode names) and false negatives (accented names)
- **🔴 Frontend error handling is broken:** `catch {}` with empty blocks; errors silently swallowed
- **🔴 No user-visible error state:** When search fails, user sees "found on 0 platforms" (looks like real result)

**Top 5 production risks:**
1. Google CSE quota exhaustion (14 searches/day before wall)
2. No error UI (users can't distinguish failures from "not found")
3. Zero tests (zero confidence in deployments)
4. Unicode bug (false positives/negatives on accented names)
5. No server logging (zero visibility into production failures)

**Priority fixes (in order):**
1. Add visible error state when search fails (1 hour, biggest UX impact)
2. Implement server-side request caching (critical for launch)
3. Write tests for core matching logic (2 hours)
4. Fix Unicode normalization (transliterate accents, 1 hour)
5. Add basic logging to all API routes (30 min)

---

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

### 2026-04-30 — Test Framework Setup & First Test Suite

- **Vitest installed** as the test runner (`vitest run` / `vitest` watch mode). Config at `vitest.config.ts`.
- **38 tests written** covering `norm()`, `slugVariants()`, `matchesRestaurant()`, and `evaluateSearchResults()`. All 38 pass.
- **Known bugs documented in tests:**
  - `norm()` strips accented chars instead of transliterating ("Café" → "caf", "résumé" → "rsum")
  - `norm()` destroys CJK/Cyrillic entirely (→ ""), causing `matchesRestaurant()` to false-positive on any text
  - `matchesRestaurant("any text", "寿司")` returns true because `"".includes("")` is true in JS
- **Edge cases confirmed:**
  - Words ≤2 chars filtered from word-match; short names like "Bo" only match as substrings
  - `evaluateSearchResults` correctly skips /blog/, /help/, /faq/, /hc/en-us/, /retailer-blog/ URLs
  - appOnly platforms get distinct "check the app" fallback messages
- **Test file location:** `lib/__tests__/matching.test.ts`

### 2026-04-30 Fix Blockers Session
- Completed: Vitest framework setup, 38 tests for matching.ts + evaluateSearchResults, 3 Unicode bugs documented as known issues.
- Team context: Fenster added caching+rate limiting, Hockney fixed SSE+a11y+error pages, Keaton updated README.

📌 Team update (2026-04-30T18:34): Platform accuracy — Redfoot identified slugVariants() as dead code (defined+tested, never called). Also proposes word-boundary matching which would change matchesRestaurant() behavior — tests will need updating.

### 2026-04-30 — Brave Search API Test Suite

- **27 tests written** for Brave Search API integration in `lib/__tests__/checkers.test.ts`. All 27 pass.
- **Test coverage:**
  - `braveSearch()` function: API responses, error handling (403/429/500), timeouts, malformed JSON, missing API key
  - `batchSearch()` function: parallel execution, caching behavior, site: operator usage, searchQuery inclusion, mixed success/failure
  - `evaluateSearchResults()` function: verified compatibility with Brave Search result format, domain filtering, blog/help URL filtering, appOnly platform handling
- **Testing patterns established:**
  - Use `uniqueRestaurantName()` helper to avoid cache collisions between tests
  - Mock `fetch` globally with `vi.fn()` and set `BRAVE_SEARCH_API_KEY` in beforeEach
  - Test both success and failure paths for all external API calls
  - Verify cache prevents redundant API calls (second identical search = 0 fetch calls)
- **Test file location:** `lib/__tests__/checkers.test.ts`
- **Current state:** Brave Search implementation already completed by Fenster. Tests confirm it works correctly.
- **Total test count:** 65 tests (38 matching + 27 checkers) — all pass

## Cross-Project Tester Knowledge (injected 2026-05-02)

The following learnings come from Tester agents across Shari's other personal projects.

### From MyDailyWin (Purah — Tester)
- **localStorage sync is a minefield:** Admin writes to `hr_admin_{profile}`, user reads `hr_state_{profile}`. Legacy "stu" profile uses unsuffixed keys, causing silent data splits. Dual-write strategies must be consistent across ALL write paths (e.g., `savePayment` didn't dual-write while `resetUserBalance` did).
- **Undefined function bugs hide in multi-page apps:** `saveState` called but never defined in admin.html; `IS_LEGACY_PROFILE` referenced but never declared in app.html. When code is split across files without a build step, these only surface at runtime.
- **Profile-aware testing is essential:** URL param `?profile=X` drove key suffixing. Download functions used unsuffixed keys — worked for legacy profile, broke for all others. Always test with non-default profiles.
- **Code consolidation verification pattern:** When migrating features between files, verify: no duplicate definitions, no orphaned references, storage keys are profile-suffixed, and HTML sanitization (escapeHtml) is applied to user-facing content.
- **Parallel agent commits break structural integrity:** After 4 agents committed to shared files simultaneously, found missing closing HTML tags, CSP `connect-src` gaps blocking Cloud Functions, and FOUC from missing script loads. Parallel commits on shared files need a mandatory structural integrity pass.
- **CSP is fragile across agents:** Each agent only understands their own domain's CSP needs. One agent's CSP changes can break another agent's functionality (e.g., missing `*.cloudfunctions.net` after EmailJS migration).

### From MyDailyWin (Helen — Alumni Tester)
- **Same critical bugs independently confirmed:** `saveState` undefined, `IS_LEGACY_PROFILE` undefined, storage key mismatches — validates that these are real blockers, not edge cases.
- **Architecture insight:** 4 user-facing pages sharing state via localStorage creates a combinatorial testing surface. Each page may have divergent implementations of the same logic.

### From MyDailyWin (Robin — Alumni Tester)
- **Consistent findings across tester rotations:** Three independent testers (Purah, Helen, Robin) all found the same core bugs — proof that systematic code review catches real issues regardless of who does it.

### From MyDailyWin (Riju — Security)
- **CSP `unsafe-inline` elimination pattern:** Extracted 57+ inline onclick handlers to `data-action` attribute + delegated `document.addEventListener('click', ...)`. Works without build tools. Key insight: CSP meta tag placement order matters — must be in `<head>` before external resource declarations.
- **Open redirect vulnerability:** `login.html?redirect=` param allowed arbitrary redirects. Always validate redirect targets against an allowlist.
- **innerHTML XSS vectors:** Profile names from localStorage rendered as innerHTML without escaping in admin reports and task names. Any user-controlled data rendered via innerHTML needs escaping.
- **Firestore rules gaps:** 4 collections had auth-only access (no ownership scoping) — any authenticated user could read/write other users' payment data. Auth ≠ authorization.
- **Service worker cache versioning:** When adding external CSS/JS files, bump the SW cache version or old caches will 404 on the new assets.

### From Slotted-AI (Sokka — Tester)
- **Payload key mismatches are a top failure cause:** Backend used camelCase for some endpoints (`friendIds`, `startTime`) and snake_case for others (`start_time`, `end_time`). No consistency — must inspect each endpoint's `req.body` destructuring. This caused ~10 of 16 test failures.
- **Polling helper for async assertions:** Created `waitFor<T>(fn, predicate, maxAttempts, delayMs)` to handle notification arrival timing. Default: 5 attempts × 1s. Essential for any test involving async backend operations.
- **Response mapping mismatches:** Backend returned `{ friendshipId, status, friend: {...} }` but tests assumed `{ id, user_a_id, user_b_id, status }`. `pendingFriendship.id` was always `undefined` → accept went to `/friends/undefined` → 500. Always verify response shape matches client expectations.
- **Notification type overloading:** `meetup_request` type used for 4+ semantic events (invite, decline, counter-propose, RSVP) — caused false dedup suppression. Watch for type enum reuse.
- **Account deletion leaves orphaned data:** Deleting meetup_participants + friendships but NOT meetups created by user → FK violations. Deletion flows need comprehensive cascade testing.
- **Security audit found 4 critical issues:** Outlook tokens leaked to client (not in SENSITIVE_FIELDS), no account deletion endpoint (GDPR violation), hardcoded admin secret fallback, friend list exposed email addresses.
- **Calendar sync is destructive:** DELETE all → INSERT new creates a brief window with zero availability data. Test for race conditions during sync.
- **Test coverage analysis pattern:** Map untested critical paths systematically — calendar sync (200+ lines, zero tests), OAuth token refresh, webhook handlers, admin endpoints.

### From Slotted-AI (Josh — Alumni Tester)
- **Webhook testing rules:** Always return HTTP 200 from webhook endpoint, even for errors — Google deactivates endpoints that return non-200. Webhooks are "something changed" signals, not payloads — must call `events.list` with sync token.
- **Critical edge cases for calendar sync:** Multi-calendar moves generate delete + create with NEW eventId (looks like false decline). Webhook storms need queue-based debouncing (Cloud Tasks). Stale sync token (410 Gone) requires full re-sync that must NOT create meetups from non-Slotted events.
- **Soft social dynamics in test language:** Never use "declined," "rejected," "cancelled" — use "can't make it," "stepped out," "updated their RSVP." Test assertions should match the product's UX language.

### From Slotted-AI (Nate — Alumni Tester)
- **Schema details for sync testing:** `meetup_participants.google_event_id` is the primary join key for two-way sync. `users.calendar_sync_token` enables incremental sync. Apple CalDAV uses deterministic UIDs: `slotted-{meetupId}-{userId}@slotted-ai.web.app`.
- **OAuth token handling:** Must handle expired AND revoked tokens differently (retry vs. disconnect). Time comparisons must use absolute UTC timestamps, never display-local times.

### From Scrunch (Rizzo — Tester)
- No testing learnings recorded yet (project in early stage). Stack: React 19, TypeScript, Vite, Tailwind CSS 4, Supabase, Vitest.

### From HealthStitch (Zoe — Tester)
- No testing learnings recorded yet (project in early stage). Stack: Node.js/Express backend, React/Vite frontend, Swift/SwiftUI iOS, SQLite.

### 2026-07-14 — Brave Search Improvements Test Suite (New Platforms)

- **28 new tests written** in `lib/__tests__/checkers.test.ts` for Fenster's Brave Search improvements. All 28 pass. Total suite now 125 tests (82 checkers + 43 matching).
- **Test coverage added:**
  - `extractDealDetails()`: cashback %, points multiplier, $-off, %-off, miles/dollar, null for no-deal text, multiple deals extraction, "up to" phrasing — 8 tests
  - New platform evaluation (Groupon, LivingSocial, The Infatuation, Eater): found/not-found/wrong-domain for each — 8 tests
  - Query tuning: inKind skipSiteOperator + domainFilter combo, Rakuten Dining /dining path filtering (rejects non-dining, allows dining) — 3 tests
  - NYC location filter integration with new platforms: each new platform tested for non-NYC rejection and NYC-indicator allowance — 9 tests
- **Test data lesson:** When writing NYC filter tests, avoid mentioning "NYC" in snippets for non-NYC test cases (e.g., "brings its NYC magic to Las Vegas" triggers the NYC indicator and passes). Keep test fixture text clean of cross-contamination.
- **Pattern confirmed:** `evaluateSearchResults()` applies `isNonNYCResult` uniformly to all platforms — new platforms get location filtering automatically with no extra code.
