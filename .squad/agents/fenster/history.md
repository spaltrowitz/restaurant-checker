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
