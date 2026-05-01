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

📌 Team update (2026-04-30T18:34): UX priority — Verbal proposes sort results by signal (found→manual→not-found), celebration moment above results grid, collapse not-found cards. Affects SearchResults.tsx and ResultCard.tsx.
📌 Team update (2026-04-30T18:34): Product roadmap — Kobayashi proposes permalinks (/r/carbone). Will need new page route + shareable OG tags per restaurant.

### 2026-04-30 — Verbal's UX Improvements (Sort, Celebrate, Collapse)

**What I did:**
1. **Sort by signal:** Results now render found (green) first, manual-check (amber) second, not-found last. Uses a sort on the PLATFORMS array based on categorized result status.
2. **Celebration summary card:** When streaming finishes, a prominent summary card appears at top — green gradient with platform names if deals found, gray with helpful fallback if zero. Card conflict warning is merged inline into this card (no longer separate).
3. **Collapse not-found:** After streaming completes, not-found platforms collapse into a single compact line ("Not found on: X, Y, Z") with an expandable "Show details" toggle. During streaming, cards still show individually for real-time feedback.

**What I learned:**
- Keeping streaming UX intact while adding post-stream collapse requires conditional rendering per `isDone` state — show full cards while streaming, collapse only after.
- The ConflictWarning component import became unused after merging conflict info into the summary card — removed to keep lint clean.
- Sorting a rendered list by dynamic state while preserving React keys works fine with `.slice().sort()` on the platform array.

### 2026-04-30 — Design Overhaul: Food-Forward Premium Polish

**What I did:**
1. **Collapsed not-found results (#1 priority):** After streaming completes, all not-found platforms collapse into a single subtle line ("Not available on: X, Y, Z") instead of individual cards. Reduces scroll by ~50% on mobile. During streaming, full cards still show for real-time feedback.
2. **Enhanced search bar:** Increased border to 2px, stronger focus ring (4px vs 2px), added shadow, larger padding (6px vs 5px), bigger button with shadow on hover. Makes search feel more premium and prominent.
3. **Improved hero section:** Added visual separator line under title (gold gradient divider), increased spacing (py-24 vs py-20), better typography hierarchy with larger tagline (text-xl vs text-lg).
4. **Elevated found cards:** Stronger green border (2px + 40% opacity vs 1px + 30%), shadow on hover, bolder platform names, larger reward badges, "View deal →" link instead of raw URL.
5. **Enhanced manual-check cards:** Stronger amber border (2px + 30% opacity), shadow on hover, bolder labels, button uses 15% opacity bg (vs 10%).
6. **Better popular searches:** More spacing (mt-16 vs mt-12), semibold label, larger buttons (px-5 vs px-4), hover scale effect.
7. **Adjusted color theme:** Slightly richer success-dim background (#0a3d2e vs #064e3b), stronger gold-glow (30% vs 20% opacity).
8. **Celebration summary card improvements:** Larger emoji (text-2xl), better spacing, platform list inline after "Available at:", conflict warnings integrated inline with visual separator.

**What I learned:**
- Drawing inspiration from Blackbird/Seated/inKind apps means: strong hierarchy, generous spacing, subtle animations, food-forward colors (gold accents work better than cold blues).
- Border thickness (2px vs 1px) makes a huge perceptual difference in premium feel without looking heavy.
- Shadows on hover + scale transforms (1.02-1.03) create tactile, responsive feel that modern dining apps use.
- Not-found results should truly recede — 60% opacity + subtle border makes them disappear visually while remaining accessible.
- The celebration moment (summary card) needs to feel like a real win — green gradient + platform names + inline conflict warning is more cohesive than separate components.

### 2026-05-01 Team Delivery: Premium Design Overhaul
- Collapsed not-found results into single line (50% scroll reduction mobile)
- Enhanced search bar, hero, cards with premium styling (borders, shadows, spacing)
- Inspired by Blackbird/Seated/inKind/Nea design patterns
- Build passes, all tests passing
- Collaborating with Fenster on API integration and McManus on test coverage
