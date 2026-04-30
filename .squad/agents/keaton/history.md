# Project Context

- **Owner:** Shari Paltrowitz
- **Project:** EatDiscounted — a Next.js web app that checks 8 dining discount platforms for any restaurant name. Results stream via SSE. Also has a Python CLI.
- **Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, better-sqlite3, SSE streaming, Python CLI
- **Created:** 2026-04-30

## Session: 2026-04-30 — Ship-Readiness Evaluation

**Role:** Lead — Architecture & ship-readiness assessment  
**Participants:** Keaton, Hockney, Fenster, McManus  
**Outcome:** 🟡 Ship with caveats — not ready for broad shipping, ready in 2-3 sprint days

**Key findings:**
- Architecture is clean, well-typed, good separation of concerns ✅
- Dependencies are minimal (3 runtime), current, no bloat ✅
- **Security gap:** No rate limiting on `/api/check` endpoint (critical blocker)
- **Build:** Compiles cleanly but has 6 lint errors; no deployment config exists
- **Must-fix:** Rate limiting, Google CSE quota strategy, lint errors
- **Deployment decision required:** Vercel (complex) vs. VPS (simpler)

**Cross-team observations:**
- Frontend needs accessibility fixes (no ARIA attributes found)
- Backend needs response caching (multiplies capacity 10-50x)
- No tests exist; critical logic verified only by manual clicking
- Unicode normalization bug produces false positives/negatives
- Google CSE quota (100/day = ~14 searches) is hard ceiling

**Estimated ship timeline:** 2-3 focused days after critical fixes.

---

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

### 2026-04-30 Fix Blockers Session
- Completed README update: Google CSE refs, `.env.local` setup instructions, 100 queries/day quota note, compliance section rewrite.
- Team context: Fenster added caching+rate limiting, Hockney fixed SSE+a11y, McManus added 38 Vitest tests.

### 2026-04-30 Commit & Deployment Session
- Moved Python CLI to `cli/` directory, updated README paths accordingly.
- Committed full sprint work (43cadba), pushed to `spaltrowitz/add-nextjs-web-ui`.
- Team context: Fenster verified Fly.io deployment config already in place.

### 2026-04-30 Post-Sprint Health Check
- Build/test/lint all green. 2 unpushed commits ahead of origin. No breakage.
- Action items: push commits, fix unused CheckResult import in matching.test.ts.

📌 Team update (2026-04-30T18:34): UX priority — sort results by signal, add celebration moment, collapse not-found cards — proposed by Verbal
📌 Team update (2026-04-30T18:34): Product roadmap — permalinks (P0), saved restaurants + alerts (P1), deals-near-me (P2) — proposed by Kobayashi
📌 Team update (2026-04-30T18:34): Platform accuracy — add site: to CSE, word-boundary matching, 3 data corrections, slugVariants dead code — proposed by Redfoot
