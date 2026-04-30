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
