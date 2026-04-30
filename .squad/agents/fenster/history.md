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

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

### 2026-04-30 — Backend hardening (caching, rate limiting, secrets)

- **Response caching:** Google CSE results are now cached in-memory by normalized `restaurant::platform` key with 1-hour TTL. Blackbird sitemap is cached with 5-minute TTL. This should multiply effective Google CSE capacity 10-50x for repeated queries. Cache is a simple Map with timestamp expiry — no external deps.
- **Rate limiting:** In-memory per-IP rate limiter added to all three API routes (`/api/check`: 5/min, `/api/report`: 10/min, `/api/reports`: 20/min). Returns 429 with `Retry-After` header. Expired entries cleaned every 60s to prevent memory leaks. No external deps.
- **Secrets:** `.env.local` was already covered by `.env*` in `.gitignore` and was not tracked by git. No action needed — the original `.gitignore` was set up correctly.
- **Dead code:** Removed `RATE_LIMIT_DELAY` constant from `platforms.ts` — it was unused in the TypeScript codebase (only referenced in Python CLI and squad docs, which don't import from there).
- **Key constraint:** All caching is in-memory (process-scoped). Cache is lost on deploy/restart. This is fine for the current single-process model but won't survive serverless cold starts. If we move to Vercel serverless, we'd need Redis or similar.

### 2026-04-30 Fix Blockers Session
- Completed: In-memory caching (1hr CSE, 5min sitemap) + per-IP rate limiting (5/10/20 rpm) + removed dead RATE_LIMIT_DELAY.
- Team context: Keaton updated README, Hockney added error UI + a11y, McManus added 38 tests.

### 2026-04-30 Commit & Deployment Session
- Verified Fly.io deployment config: Dockerfile, .dockerignore, fly.toml, db.ts `DATABASE_PATH` env var, README deployment section all present.
- Authored Fly.io Deployment Configuration decision (persistent volume SQLite, auto-stop, secrets via `fly secrets`).
- Team context: Keaton committed full sprint (43cadba) and pushed to spaltrowitz/add-nextjs-web-ui.

📌 Team update (2026-04-30T18:34): Platform accuracy — Redfoot proposes site: operator in CSE queries, word-boundary matching, data corrections (Rakuten appOnly→false, Seated domain→seatedapp.io). Affects search.ts and platforms.ts.
📌 Team update (2026-04-30T18:34): Product roadmap — Kobayashi proposes restaurant permalinks (P0). May need new API route + caching strategy.

### 2026-04-30 Unicode Transliteration & Structured Logging
- **Unicode fix:** `norm()` now uses NFD decomposition + combining-mark stripping before ASCII filter. Handles ß→ss, æ→ae, œ→oe as special cases. "Café Boulud" → "cafe boulud" instead of "caf boulud".
- **Structured logging:** Added `console.error`/`console.warn` with bracketed prefixes (`[blackbird]`, `[google-cse]`, `[api/check]`, `[rate-limit]`) to all catch blocks and error paths. Grep-friendly, no deps.
- **API route hardening:** Wrapped SSE stream body in try/catch so unhandled errors don't crash without logging.
- **Tests:** All 38 tests pass. Updated 2 test expectations from "documents broken behavior" to "verifies correct behavior".
- **Key constraint:** CJK/Cyrillic still normalize to empty string — acceptable for NYC Latin-script focus.

### 2026-04-30 Google CSE Search Broken — Diagnosis & Fix
- **Root cause:** NOT the `site:` operator or quota exhaustion. The Google Cloud project does not have the "Custom Search JSON API" enabled. Every request returns 403 PERMISSION_DENIED regardless of query format.
- **Fix applied:** (1) Structured error parsing — distinguishes permission denied (403), quota exhausted (403 with "quota" reason), and rate limited (429). (2) Fallback strategy — if `site:`-scoped query fails, retries without `site:` before giving up. (3) Actionable log messages with query context.
- **Action required (Shari):** Go to Google Cloud Console → APIs & Services → Enable "Custom Search JSON API" for the project associated with key `AIzaSyCa...`. The code is ready; it will work as soon as the API is enabled.
- **Tests:** 38/38 pass, TypeScript compiles clean.

### 2026-04-30 Platform Accuracy Improvements (Redfoot's Review)
- **Word-boundary matching:** `matchesRestaurant` now uses `\b` regex instead of bare `includes()`. Prevents "robot" matching "Bo" and "blacksmith" matching "The Smith". Full-name check also uses boundaries. Regex special chars escaped.
- **site: operator in CSE:** Search queries now include `site:{domainFilter}` when a platform has a domain filter. Eliminates blog/review noise from results. Example: `"Carbone" site:inkind.com`.
- **slugVariants wired in:** `slugVariants()` is now used in `checkBlackbird` to match URL slugs directly (e.g. "the-smith-nomad" matching "The Smith Nomad"). No longer dead code.
- **Data corrections:** Rakuten Dining `appOnly` → false (has web UI). Seated `domainFilter` → "seatedapp.io" (was too loose at "seated"). Blackbird `cardLink` annotated as NFC/QR.
- **Tests:** All 38 pass. Updated 1 test expectation for word-boundary behavior ("Bo" no longer matches "robot").
