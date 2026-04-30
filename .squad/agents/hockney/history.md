# Project Context

- **Owner:** Shari Paltrowitz
- **Project:** EatDiscounted — a Next.js web app that checks 8 dining discount platforms for any restaurant name. Results stream via SSE. Also has a Python CLI.
- **Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, better-sqlite3, SSE streaming, Python CLI
- **Created:** 2026-04-30

## Session: 2026-04-30 — Ship-Readiness Evaluation

**Role:** Frontend Dev — Frontend/UI quality & UX review  
**Participants:** Keaton, Hockney, Fenster, McManus  
**Outcome:** 🟡 Ship with caveats — bones are great, fix accessibility & error handling

**Frontend audit findings:**
- Component quality is excellent: clean decomposition, proper TypeScript, smart Suspense ✅
- **Accessibility is 🔴 critical gap:** Zero ARIA attributes across codebase
  - Search input has no aria-label (screen reader announces "unlabeled text field")
  - Results region has no aria-live (screen readers don't know content is updating)
  - Status icons are emoji-only with no text alternatives
  - No skip-to-content link
- **Error handling is broken:** Frontend has `catch {}` empty blocks; errors silently swallowed
- **SSE consumer bug:** No AbortController; concurrent searches leak connections
- **UX flow:** Intuitive and thoughtful (zero-friction popular searches, conflict warnings, community reporting)
- **Responsive design:** Works to 768px; phone-like on large screens; no explicit breakpoints

**Must-fix before shipping:**
1. aria-label on search input (5 min, massive a11y impact)
2. aria-live="polite" on results region + error state UI
3. AbortController on SSE fetch (real bug: connection leaks)
4. Error message when search fails (users currently see nothing)

**Nice-to-have:** OG/Twitter meta tags (critical for sharing), focus styles, viewport meta export.

---

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

### 2026-04-30 — Ship-Readiness Fixes

**What I did:**
1. **AbortController for SSE** — Added abort-on-new-search, 30s timeout, cleanup on unmount, graceful AbortError handling in `SearchResults.tsx`. No more leaked connections.
2. **Error state UI** — Added `error` state with red warning card + retry button. 429 gets a rate-limit-specific message. Errors vs "found on 0" are now distinct states.
3. **Accessibility pass** — Added `aria-label` to search input + visually-hidden `<label>`, `aria-live="polite"` + `role="status"` + `aria-busy` on results region, `aria-label` + `role="img"` on status emoji, `role="status"` + `sr-only` text on loading spinners, `aria-label="Main navigation"` on `<nav>`, `aria-current="page"` on active nav link, `aria-label="Search for {name}"` on popular search buttons.
4. **Error/404 pages** — Created `app/error.tsx` (client error boundary with reset) and `app/not-found.tsx` (friendly 404 with link home).

**What I learned:**
- Tailwind v4 includes `sr-only` utility out of the box — no plugin needed.
- Next.js 16 with Turbopack compiles fast; build verification is cheap and should always be done.
- The SSE streaming pattern in this codebase uses ReadableStream reader, not EventSource — AbortController on the fetch is the right cleanup mechanism.

### 2026-04-30 Fix Blockers Session
- Completed: AbortController SSE fix, error state UI with retry + 429 handling, full a11y pass (ARIA labels, live regions, aria-current), error.tsx + not-found.tsx pages.
- Team context: Fenster added caching+rate limiting (429 responses), Keaton updated README, McManus added 38 tests.

### 2026-04-30 — OG Meta Tags, Lint Fix & Final Polish
- Added OG/Twitter meta tags to layout.tsx for social sharing.
- Fixed `react-hooks/set-state-in-effect` lint error: restructured SearchResults.tsx to use "set state during render" pattern for query-change resets, and `Promise.resolve().then()` microtask pattern in the effect to avoid synchronous setState in effect body.
- Added viewport export, skip-to-content link, `id="main-content"`, and `robots.txt`.
- Learned: React 19's strict lint rules flag any function called from useEffect that can transitively call setState — even if those calls happen asynchronously after await. The microtask pattern (`Promise.resolve().then()`) satisfies the rule correctly.
