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

## Cross-Project Lead Knowledge (injected 2026-05-02)

The following learnings come from Lead agents across Shari's other personal projects.
These patterns and corrections are relevant to any project you work on.

### From MyDailyWin (Revali, alumni: Hopper, Edna)
- **Stack:** Vanilla HTML/CSS/JS, Firebase (Hosting + Auth + Firestore), EmailJS, PWA
- **Massive code duplication problem:** 65+ functions were copy-pasted across 3 HTML files (app.html, index.html, habitrewards.html). 12,703 lines across 9 files. Consolidation (Option C) eliminated ~4,400 duplicated lines by merging into app.html as single source of truth.
- **Security issues found by multiple Lead generations:** Firestore rules were overly permissive (`allow read/write: if request.auth != null`), EmailJS credentials hardcoded, no CSP headers, innerHTML used 73 times with user-controlled data, unguarded JSON.parse calls.
- **localStorage key inconsistency** between admin and user pages caused data contract bugs. Pattern: always verify storage key contracts between app surfaces that share state.
- **Consolidation strategy:** When 3+ codebases diverge with 67%+ overlap, merge into one canonical source rather than maintaining parallel files. Phased approach: delete zero-unique-feature files first, migrate unique features second, update routing third, verify fourth.
- **Service worker versioning:** CACHE_NAME that never changes = stale cache forever. Always version service worker caches.
- **Cross-tab communication:** localStorage doesn't auto-sync between tabs — need storage event listeners if admin and user views must stay in sync.

### From Slotted (Toph, alumni: Beard, Leo)
- **Stack:** React 19 + TS + Tailwind v4 + Vite, Firebase Functions + Express, Supabase PostgreSQL, Firebase Auth
- **Backend monolith anti-pattern:** `index.ts` grew to 8,371 lines with 87+ endpoints. Single biggest velocity bottleneck. Split before scaling team.
- **Security audit (5 critical findings):** Plaintext OAuth tokens in DB (must encrypt AES-256-GCM), Social Battery data leaking to friends, hardcoded developer email in AuthContext (PII in prod), protobufjs RCE vulnerability, RLS enabled on all 18 tables but zero policies defined — service-role bypass risk.
- **RLS without policies = false security:** Enabling RLS but never writing policies means service-role bypass is the only path, and any architectural change exposes everything. Defense-in-depth requires actual policies even if service role bypasses them.
- **OAuth token encryption decision:** Supabase Vault (pgsodium) with separate `oauth_tokens` table. Vault handles key rotation natively.
- **Race condition pattern:** Meetup auto-confirm had race condition on concurrent acceptances. Fix: AFTER UPDATE trigger with FOR UPDATE lock — serializes state transitions atomically in DB, keeps notification logic in application code.
- **Calendar sync architecture:** Watch channels were 80% wired but never activated. Feedback loop prevention critical when syncing bidirectionally — track `rsvp_source` to avoid infinite push-back loops. Rule: external system = source of truth for individual actions; your app = source of truth for multi-party state.
- **Product design principles:** Privacy-first (never expose personal data to other users), soft social language ("not this time" not "decline"), AI as invisible infrastructure (no "AI recommended" badges), reduce friction at happy moments (auto-add to calendar on acceptance).
- **Progressive disclosure:** Mai (Product Strategist) identified that showing all features to new users is a "Week 4 feature designed for Day 1" problem. Solution: state-aware progressive disclosure — unlock features by milestones.
- **CORS in production:** `CORS allows all origins` on line 55 was flagged. Always tighten CORS for production deployments.
- **Share codes:** 3-char codes are brute-forceable. Use longer codes for invite/share features.

### From Scrunch (Sandy)
- **Stack:** React 19, TypeScript, Vite, Tailwind CSS 4, Supabase, React Query, React Router, Vitest. Deployed to GitHub Pages.
- **TypeScript 6 + Supabase type issue:** Supabase-js v2.104+ with TS6 returns `never` for `.select('*')` unless Database type includes Views, Functions, and Relationships fields. Pragmatic fix: cast with `(data as unknown as Product[])`.
- **PR conflict resolution principle:** When PRs conflict with architectural migrations (e.g., React Query migration), resolve by adapting incoming code to the new architecture rather than reverting the migration. Drop features that can't be cleanly adapted and flag for re-implementation.
- **Performance audit findings:** Static imports defeat lazy-load optimizations — a `placeholderData` construction that imports seed data statically pulled 74KB into every page's chunk despite a dynamic `import()` existing for the query fallback. Auth loading gate (`if (loading) return null`) creates blank screen on cold start (1-3s on Supabase free tier).
- **Supabase cold-start:** Free tier managed functions have startup latency. First load after inactivity = 1-3s blank. Mitigation: offline-first with seed data, or upgrade to Pro ($25/mo).
- **Legal framework for content integration:** When integrating influencer/creator content (TikTok routines), product names are factual data (safe), routine descriptions paraphrased in own words (safe), attribution is essential, but video/images are copyrighted (never embed without permission). "As featured in" not "endorsed by."
- **Toast convention:** All mutations must include success/error toast feedback. Established as team convention after code review.
- **Image sourcing policy:** Only use brand websites or open-license sources. Retailer CDNs (Target, Walmart, Amazon, Ulta) prohibit hotlinking — never use their image URLs.

### From HealthStitch (Mal)
- **Stack:** Node.js/Express backend, React/Vite frontend, Swift/SwiftUI iOS companion, SQLite database
- **Project status:** Early stage (created 2026-04-27). Minimal history recorded so far. Health data aggregation platform stitching together wearable data from Apple Watch, WHOOP, and other devices.
- **Cross-platform consideration:** Project spans web (React/Vite) and native iOS (Swift/SwiftUI) — any architectural decisions must account for both surfaces sharing the same backend.

### Inherited from Kobayashi (Strategist)

**Joined/Active:** 2026-04-30 — Product Strategist / Critical Reviewer

**Key contributions:**
- Completed product-market fit, retention, growth, and monetization analysis
- Biggest risk identified: Single-use retention problem — users search once and leave
- P0: Restaurant permalink pages for SEO + shareability
- P1: Saved restaurants + alerts (converts lookup tool to monitoring tool)
- Bold bet: Deals-Near-Me location-based discovery (10x product potential)
- Monetization recommendation: Affiliate links first (Blackbird, inKind, Bilt referral programs)
- Audience sizing: ~30-50K NYC power users on 3+ platforms; growth via food Twitter/Reddit
- Partnership outreach strategy for app-only platforms (Nea, Seated, Upside) — B2B pitch positioning EatDiscounted as distribution channel, not competitor
- Cross-project learning: fastest aha moment = primary CTA; state-aware progressive UI; empty states cascade

**Strategist principles now merged into Lead:**
- Scope discipline, "default is NO", "who+why before how"
- MVP scoping, Day 1 vs Day 30 UX, progressive disclosure
- Complexity-is-cost mindset
