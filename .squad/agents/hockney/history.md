# Hockney — History

## Key Patterns & Corrections

### Ship-Readiness Fixes
- **Accessibility was 🔴 critical gap:** Zero ARIA attributes across entire codebase at audit time.
- **SSE consumer bug:** No AbortController meant concurrent searches leaked connections.
- **Error handling broken:** `catch {}` empty blocks silently swallowed errors.

### SSE Streaming
- Uses ReadableStream reader (not EventSource) — AbortController on the fetch is the correct cleanup mechanism.
- Abort-on-new-search, 30s timeout, cleanup on unmount, graceful AbortError handling in `SearchResults.tsx`.

### Accessibility Pass
- `aria-label` on search input + visually-hidden `<label>`
- `aria-live="polite"` + `role="status"` + `aria-busy` on results region
- `aria-label` + `role="img"` on status emoji
- `role="status"` + `sr-only` text on loading spinners
- `aria-label="Main navigation"` on `<nav>`, `aria-current="page"` on active link
- `aria-label="Search for {name}"` on popular search buttons
- Skip-to-content link + `id="main-content"`

### Error State UX
- Added `error` state with red warning card + retry button
- 429 gets rate-limit-specific message
- Errors vs "found on 0" are now distinct states

### Sort & Collapse (Verbal's UX)
- **Sort by signal:** Found (green) first, manual-check (amber) second, not-found last. `.slice().sort()` preserves React keys.
- **Celebration summary card:** Green gradient with platform names if deals found, gray with fallback if zero. Conflict warning merged inline.
- **Post-stream collapse:** After streaming done, not-found collapse into single line with expandable "Show details." During streaming, full cards shown for real-time feedback.

### Premium Design Polish
- Border thickness 2px vs 1px makes huge perceptual difference in premium feel
- Shadows on hover + scale(1.02-1.03) create tactile, responsive feel
- Not-found results: 60% opacity + subtle border makes them recede while staying accessible
- Enhanced search bar: 2px border, stronger focus ring (4px), shadow, larger padding
- Hero: visual separator (gold gradient divider), increased spacing
- Found cards: stronger green border (2px + 40% opacity), hover shadow, "View deal →" link
- Richer colors: success-dim #0a3d2e, gold-glow 30% opacity

### React 19 Lint
- Strict rules flag any function called from useEffect that can transitively call setState — even async.
- **Fix:** `Promise.resolve().then()` microtask pattern satisfies the rule correctly.
- Also used "set state during render" pattern for query-change resets.

### Other
- Tailwind v4 includes `sr-only` utility out of the box — no plugin needed.
- Next.js 16 Turbopack compiles fast; build verification is cheap.
- Added OG/Twitter meta tags, viewport export, `robots.txt`.
- Created `app/error.tsx` (client error boundary) and `app/not-found.tsx` (friendly 404).

## Cross-Project Frontend Knowledge (injected 2026-05-02)

### From MyDailyWin (Mipha — User Dev)
- **XSS prevention:** `escapeHtml()` for HTML text, `data-*` + `addEventListener()` for onclick. Always audit innerHTML.
- **Three divergent codebases** caused drift bugs. Consolidation to single source eliminated bug classes.
- **Modal accessibility:** `<span>` → `<button>` with `aria-label`, `role="dialog"` + `aria-modal="true"`.
- **localStorage hardening:** All JSON.parse in try/catch with defaults.
- **Dark mode:** CSS variables with `data-theme` toggle. shared.css as single source.
- **Responsive:** 375px/768px/1024px. 44px touch targets. CSS only.
- **Gamification:** Celebration modals, transient `_lastLevelName`, streak milestones, confetti with `prefers-reduced-motion`.
- **PWA install:** `beforeinstallprompt` with dismissible banner.
- **Font:** Nunito via Google Fonts, `display=swap`.

### From MyDailyWin (Urbosa — Admin Dev)
- **Storage key mismatch critical:** Dual-write in every path. Canonical suffix pattern.
- **innerHTML loop perf:** `innerHTML +=` O(n²) → array.push() + join('') O(n).
- **ARIA tabs:** tablist/tab/tabpanel with aria-selected management.
- **Helper extraction:** getProfileSuffix (10 sites), formatDollar (7 sites).
- **Responsive admin:** Scrollable tab strip, `overflow-x: auto` tables.

### From Slotted (Katara)
- **Security:** Hardcoded email, credential logs, Firebase SW → build-time substitution.
- **npm overrides** for deep transitive deps. TypeScript: type catch as `AxiosError` or `Error`.
- **Accessibility gaps:** StarRating, modals (no focus trap), checkboxes (no labels).

### From Slotted (Alumni: CJ, Keeley)
- **Public routes** before `<ProtectedRoute />`. Empty state cards with emoji + heading + CTA. Soft social language.
- **Notification type system:** type union, typeConfig, tab filters, action buttons.

### From Scrunch (Frenchy)
- **Component decomposition:** Extract, `React.memo`, stable props. "Show More" pagination.
- **Toast system:** `ToastProvider` + `useToast()`. Wire all mutations.
- **setState-in-effect → render-time sync.** `useMemo` for dependency stability.
- **React Query placeholderData** for instant navigation. Auth loading gate: never return null.
- **Mobile:** 44px targets, grid-based rating buttons, `flex-wrap` footer links.
- **Legal TikTok:** No embeds/images — text-only with links.

### From HealthStitch (Kaylee)
- **CSS design system:** Custom properties, skeleton loaders, sync freshness indicator.
- **VITE_API_URL:** Single client module for all API calls.

## Session Archive Summary

Hockney completed 5 sessions: ship-readiness evaluation (audit findings), critical fixes (AbortController SSE, error state UI, full accessibility pass, error/404 pages), OG meta tags + lint fix, Verbal's UX improvements (sort by signal, celebration card, post-stream collapse), and premium design overhaul (borders, shadows, spacing inspired by Blackbird/Seated/inKind). All changes build-verified with tests passing.

## Learnings

### Site Beautification Pass (2026-07)
- **About & Platforms pages were broken in dark mode:** Used `text-gray-700`, `bg-white`, `border-gray-200` — all light-mode Tailwind defaults that are invisible on `#0a0a0b` background. Converted to CSS variable system (`var(--color-*)`) matching the rest of the site.
- **Staggered animations:** CSS-only approach with `.stagger-N` classes + `animation-delay` is simpler than JS-based sequential rendering. Capped at 8 to avoid excessive delays.
- **Progress bar > text status:** Replaced "Checking platforms... (3/8)" text with a visual progress bar during streaming. Much cleaner UX — users can see progress at a glance.
- **Gradient backgrounds on cards:** `bg-gradient-to-br from-[dim-color] to-[surface-raised]` creates subtle depth without being garish. API results get green gradient, web search gets blue — visual hierarchy without reading badges.
- **Skeleton loaders:** Two bars with staggered animation delay look more realistic than one. Added `skeleton-card` utility class.
- **Hero radial gradient:** `radial-gradient(ellipse at 50% 0%, gold-glow, transparent 60%)` creates a subtle spotlight effect behind the title without being distracting.
- **Footer:** Simple flex layout with `sm:flex-row` responsive. Links to About/Platforms. Brand name + tagline.
- **Platform emoji mapping:** Hardcoded emoji map in Platforms page component — good enough, doesn't need to be in data model.
- **Platforms grouped by integration type:** API vs Web Search grouping makes the page scannable and communicates data quality at a glance.

### P0 UI Features — Best Deal + Browse (2026-07)
- **Best Deal Card:** Placed above celebration summary in SearchResults. Uses `findBestDeal()` from `lib/best-deal.ts` — scores by method (API=100, web=50) + details length. Spring animation (`cubic-bezier(0.34, 1.56, 0.64, 1)`) for the scale-up gives it a satisfying pop.
- **Amber/gold theming:** `border-amber-500/40`, `bg-gradient-to-br from-amber-900/20` — warm without clashing with the existing green (found) and blue (web search) card tiers.
- **Browse page:** `/browse` with `max-w-4xl` (wider than search's `max-w-2xl`) since it's a grid layout. Responsive 3/2/1 columns. Expanded neighborhood spans full width via `col-span-*`.
- **Platform color badges:** Hardcoded color map per platform — Bilt=blue, RN=sky, Upside=green, Blackbird=purple, etc. Falls back to neutral surface colors for unknown platforms.
- **Nav pattern:** Followed exact existing pattern — `aria-current="page"`, gold active text, secondary hover. Added Browse between Platforms and About.

### P0/P1 Features — Explainer Modals + Filter Bar (2026-07)
- **PlatformExplainer:** Hardcoded educational copy per platform in a `Record<string, PlatformInfo>`. Mobile = fixed bottom modal with backdrop blur. Desktop = absolute-positioned popover below the ℹ️ button.
- **Focus trap pattern:** Query focusable elements inside modal ref, wrap Tab key at boundaries. ESC to close via keydown listener.
- **Click-outside dismiss:** `mousedown` listener checking `contains()` on both modal and anchor refs to avoid closing on the button itself.
- **Card conflict warning:** Shown conditionally only for card-linked platforms (Upside, Nea, Rewards Network, Bilt).
- **FilterBar:** `useFilterState` hook encapsulates localStorage persistence with SSR-safe `useEffect` hydration. Avoids hydration mismatch by defaulting to neutral state on initial render.
- **Reward type mapping:** `app-rewards` filter uses `appOnly` platform field instead of `rewardType` — cleaner semantic mapping.
- **Filter integration:** Filters apply before sorting in SearchResults. `filteredPlatforms` feeds into `sortedPlatforms` chain. FilterBar only renders post-stream (`isDone`) to avoid confusing mid-search state.
